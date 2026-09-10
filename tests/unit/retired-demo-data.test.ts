import { describe, expect, it } from "vitest";
import {
  RETIRED_DEMO_ENTITY_IDS,
  RETIRED_DEMO_FILTERS,
  RETIRED_DEMO_IDS,
} from "@/features/shared/retired-demo-data";

describe("retired demonstration data", () => {
  it("keeps every retired id unique across operational entity types", () => {
    expect(new Set(RETIRED_DEMO_ENTITY_IDS).size).toBe(RETIRED_DEMO_ENTITY_IDS.length);
  });

  it("creates valid PostgREST in filters for every retired data group", () => {
    for (const filter of Object.values(RETIRED_DEMO_FILTERS)) {
      expect(filter).toMatch(/^\([0-9a-f,-]+\)$/);
    }
  });

  it("does not retire the fiscal-year record reused by the live 2570 configuration", () => {
    const retiredIds = Object.values(RETIRED_DEMO_IDS).flat();
    expect(retiredIds).not.toContain("20000000-0000-0000-0000-000000000001");
  });
});
