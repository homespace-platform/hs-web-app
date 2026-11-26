/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixture loads a TypeScript module. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file = require.resolve("../app/dashboard/properties/new/utils/buildListingPayload.ts");
const moduleRef = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: moduleRef, exports: moduleRef.exports, require });

test("a custom monthly fee remains monthly even when stale form data contains another unit", () => {
  const payload = moduleRef.exports.buildCreateListingPayload({
    submissionAction: "SAVE_DRAFT",
    basicInfo: { category: "room", title: "Phòng cho thuê", description: "Mô tả", availableDate: "2026-11-09" },
    apartmentDetails: {}, houseDetails: {},
    roomDetails: { areaM2: 20, maxOccupants: 2 },
    furnishingAssets: [], selectedAmenities: [], uploadedMediaList: [],
    addressMode: "new", pricing: { priceMonthly: 3000000, priceUnit: "VND_MONTH", depositType: "NONE", paymentCycle: "MONTHLY", minimumLeaseMonths: 6 },
    monthlyExpenses: {
      electricityType: "KWH", electricityPrice: 3500, waterType: "M3", waterPrice: 25000,
      managementFeeType: "NONE", internetType: "SELF_PAY", garbageFeeType: "INCLUDED",
      motorbikeParkingType: "NONE", carParkingType: "NONE",
      customFees: [{ id: "fee-1", name: "Phí thang máy", amount: "30000", unit: "lần" }],
    },
  });
  const fee = payload.charges.find(row => row.chargeType === "OTHER");
  assert.equal(fee.billingMethod, "PER_MONTH");
  assert.equal(fee.unit, "tháng");
  assert.equal(fee.amount, 30000);
  assert.equal(fee.customName, "Phí thang máy");
});

test("a house payload sends the loaded rental scope back", () => {
  const payload = moduleRef.exports.buildCreateListingPayload({
    submissionAction: "SAVE_DRAFT",
    basicInfo: { category: "house", title: "Nhà cho thuê", description: "Mô tả", availableDate: "2026-11-09" },
    apartmentDetails: {}, roomDetails: {},
    houseDetails: { totalUsableAreaM2: 90, rentalScopeDescription: "Tầng 2-3", rentedFloorFrom: 2, rentedFloorTo: 3 },
    furnishingAssets: [], selectedAmenities: [], uploadedMediaList: [],
    addressMode: "new", pricing: { priceMonthly: 3000000, priceUnit: "VND_MONTH", depositType: "NONE", paymentCycle: "MONTHLY", minimumLeaseMonths: 6 },
    monthlyExpenses: {
      electricityType: "INCLUDED", waterType: "INCLUDED", managementFeeType: "NONE", internetType: "SELF_PAY",
      garbageFeeType: "INCLUDED", motorbikeParkingType: "NONE", carParkingType: "NONE", customFees: [],
    },
  });
  assert.equal(payload.houseDetail.rentalScopeDescription, "Tầng 2-3");
  assert.equal(payload.houseDetail.rentedFloorFrom, 2);
  assert.equal(payload.houseDetail.rentedFloorTo, 3);
});
