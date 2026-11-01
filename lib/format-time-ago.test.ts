import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatListingTimeAgo, formatTimeAgo } from "./format-time-ago.ts";

const now = Date.parse("2026-10-29T12:00:00.000Z");

describe("formatTimeAgo", () => {
  it("shows vừa xong under one minute", () => {
    assert.equal(formatTimeAgo("2026-10-29T11:59:30.000Z", now), "Vừa xong");
  });

  it("shows minutes under one hour", () => {
    assert.equal(formatTimeAgo("2026-10-29T11:59:00.000Z", now), "1 phút trước");
    assert.equal(formatTimeAgo("2026-10-29T11:50:00.000Z", now), "10 phút trước");
  });

  it("shows hours under one day", () => {
    assert.equal(formatTimeAgo("2026-10-29T08:00:00.000Z", now), "4 giờ trước");
  });
});

describe("formatListingTimeAgo", () => {
  it("prefers updatedAt over publishedAt", () => {
    const updated = "2026-10-29T11:50:00.000Z";
    const published = "2026-10-20T08:00:00.000Z";
    assert.equal(formatListingTimeAgo(updated, published), formatTimeAgo(updated));
  });

  it("falls back when updatedAt is missing", () => {
    const published = "2026-10-29T11:50:00.000Z";
    assert.equal(formatListingTimeAgo(null, published), formatTimeAgo(published));
  });
});
