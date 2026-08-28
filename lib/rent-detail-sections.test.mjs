import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getRentDetailSections } from "./rent-detail-sections.ts";

test("returns category-specific detail fields", () => {
  const apartmentItems = getRentDetailSections({
    category: "apartment",
    details: {
      apartmentFloor: 5,
      roomFloor: 2,
      furnishing: "FULL",
      roomFurnishing: "BASIC",
    },
  }).flatMap((section) => section.items);

  assert.equal(apartmentItems.some((item) => item.label === "Tầng căn hộ"), true);
  assert.equal(apartmentItems.some((item) => item.label === "Tầng phòng"), false);
  assert.equal(apartmentItems.some((item) => item.label === "Nội thất phòng"), false);

  const roomItems = getRentDetailSections({
    category: "room",
    details: { roomFloor: 2, roomFurnishing: "BASIC", apartmentFloor: 5 },
  }).flatMap((section) => section.items);

  assert.equal(roomItems.some((item) => item.label === "Tầng phòng"), true);
  assert.equal(roomItems.some((item) => item.label === "Tầng căn hộ"), false);
});
