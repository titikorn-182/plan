import test from "node:test";
import assert from "node:assert/strict";
import { createPagination, getPaginationRange, parsePage } from "../features/shared/pagination.ts";

test("page query values accept only bounded positive integers", () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage("2"), 2);
  assert.equal(parsePage(["3", "4"]), 3);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("2.5"), 1);
  assert.equal(parsePage("not-a-page"), 1);
  assert.equal(parsePage("10001"), 10_000);
});

test("pagination produces inclusive Supabase ranges and stable metadata", () => {
  assert.deepEqual(getPaginationRange(1, 20), [0, 19]);
  assert.deepEqual(getPaginationRange(3, 20), [40, 59]);
  assert.deepEqual(createPagination(41, 3, 20), {
    page: 3,
    pageSize: 20,
    total: 41,
    totalPages: 3,
  });
  assert.equal(createPagination(null, 1, 20).totalPages, 1);
});
