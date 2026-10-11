import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { invoiceMatchesPeriodFilter } from "./invoice-period-filter.ts";

const invoice = {
  periodStart: "2026-09-15",
  periodEndExclusive: "2026-10-15",
};

describe("invoice period filter", () => {
  it("matches a date inside the invoice period and excludes its end boundary", () => {
    assert.equal(invoiceMatchesPeriodFilter(invoice, "2026-10-14"), true);
    assert.equal(invoiceMatchesPeriodFilter(invoice, "2026-10-15"), false);
  });

  it("matches every calendar month overlapped by the invoice period", () => {
    assert.equal(invoiceMatchesPeriodFilter(invoice, undefined, "2026-09"), true);
    assert.equal(invoiceMatchesPeriodFilter(invoice, undefined, "2026-10"), true);
    assert.equal(invoiceMatchesPeriodFilter(invoice, undefined, "2026-11"), false);
  });
});
