/* eslint-disable @typescript-eslint/no-require-imports -- Node test loads TS modules via require. */
const { test } = require("node:test"), assert = require("node:assert/strict");
const loadTs = require("./helpers/load-ts.cjs");
const { PAGE_SIZE, pageCount, clampPage, parsePage } = loadTs("lib/pagination.ts");

test("page size is 10 and page count rounds up, never below 1", () => {
  assert.equal(PAGE_SIZE, 10);
  assert.equal(pageCount(0), 1); assert.equal(pageCount(10), 1); assert.equal(pageCount(11), 2); assert.equal(pageCount(95), 10);
});
test("clampPage keeps first/last in range and fixes junk", () => {
  assert.equal(clampPage(1, 5), 1); assert.equal(clampPage(5, 5), 5);
  assert.equal(clampPage(99, 5), 5); assert.equal(clampPage(0, 5), 1); assert.equal(clampPage(-3, 5), 1); assert.equal(clampPage(NaN, 5), 1);
  assert.equal(clampPage(3, 0), 1);
});
test("parsePage reads ?page= safely", () => {
  assert.equal(parsePage("3"), 3); assert.equal(parsePage(null), 1); assert.equal(parsePage("abc"), 1); assert.equal(parsePage("-2"), 1); assert.equal(parsePage("2.7"), 2);
});
