import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getRentDetailSections } from "./rent-detail-sections.ts";

test("returns category-specific detail fields", () => {
  const apartmentItems = getRentDetailSections({
    category: "apartment",
    details: {
      floorNumber: 5,
      furnishingStatus: "FULLY_FURNISHED",
    },
  }).flatMap((section) => section.items);

  assert.equal(apartmentItems.some((item) => item.label === "Tầng số"), true);
  assert.equal(apartmentItems.some((item) => item.label === "Tầng"), false);

  const roomItems = getRentDetailSections({
    category: "room",
    details: { floorNumber: 2, furnishingStatus: "BASIC" },
  }).flatMap((section) => section.items);

  assert.equal(roomItems.some((item) => item.label === "Tầng"), true);
  assert.equal(roomItems.some((item) => item.label === "Tầng số"), false);
});
