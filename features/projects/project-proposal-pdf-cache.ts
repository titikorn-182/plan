import "server-only";

import { createHash } from "node:crypto";
import { createProjectProposalPdf } from "./project-proposal-pdf";
import type { ProjectProposalPdfData } from "./project-proposal-pdf-data";

type Entry = {
  promise: Promise<Uint8Array>;
  expiresAt: number;
  bytes: number;
};

/** Only the expensive rendering is reused, never authentication or RLS queries.
 * Keys include the viewer, project and entire freshly authorized PDF snapshot.
 * This is a bounded, short-lived warm-instance optimization, not a shared CDN cache.
 */
export function createProjectProposalPdfCache(
  render = createProjectProposalPdf,
  { ttlMs = 120_000, maxEntries = 8, maxBytes = 8 * 1024 * 1024 } = {},
) {
  const entries = new Map<string, Entry>();
  let retainedBytes = 0;

  function remove(key: string) {
    const entry = entries.get(key);
    if (!entry) return;
    retainedBytes -= entry.bytes;
    entries.delete(key);
  }

  function removeOldest() {
    const key = entries.keys().next().value;
    if (key !== undefined) remove(key);
  }

  return async (viewerId: string, projectId: string, data: ProjectProposalPdfData) => {
    if (ttlMs <= 0 || maxEntries <= 0 || maxBytes <= 0) return render(data);
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) remove(key);
    }
    const key = createHash("sha256")
      .update(JSON.stringify([viewerId, projectId, data]))
      .digest("hex");
    const existing = entries.get(key);
    if (existing) {
      // LRU without extending the lifetime of private document bytes.
      entries.delete(key);
      entries.set(key, existing);
      return (await existing.promise).slice();
    }
    while (entries.size >= maxEntries) removeOldest();

    const entry: Entry = {
      expiresAt: now + ttlMs,
      bytes: 0,
      promise: Promise.resolve().then(() => render(data)),
    };
    entries.set(key, entry);
    try {
      const pdf = await entry.promise;
      // A concurrent request may already have evicted this entry.
      if (entries.get(key) === entry) {
        if (pdf.byteLength > maxBytes || entry.expiresAt <= Date.now()) {
          remove(key);
        } else {
          entry.bytes = pdf.byteLength;
          retainedBytes += entry.bytes;
          while (retainedBytes > maxBytes) removeOldest();
        }
      }
      return pdf.slice();
    } catch (error) {
      // Never retain a failed rendering or remove a newer retry of the same key.
      if (entries.get(key) === entry) remove(key);
      throw error;
    }
  };
}

export const getCachedProjectProposalPdf = createProjectProposalPdfCache();
