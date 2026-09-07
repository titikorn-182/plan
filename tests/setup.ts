import { vi } from "vitest";

// The marker is enforced by Next's bundler. Server modules run in Node in tests.
vi.mock("server-only", () => ({}));
