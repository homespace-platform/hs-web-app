/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixture loads TypeScript modules. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file = require.resolve("../app/dashboard/properties/new/utils/mapListingDetailToFormState.ts");
const fixture = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, {
  module: fixture, exports: fixture.exports,
  require: () => ({ furnishingStatusToFormValue: () => "NONE" }),
});
const { mapListingDetailToFormState } = fixture.exports;
const payloadModule = { exports: {} };
const payloadFile = require.resolve("../app/dashboard/properties/new/utils/buildListingPayload.ts");
vm.runInNewContext(ts.transpileModule(fs.readFileSync(payloadFile, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { module: payloadModule, exports: payloadModule.exports, require });
const { buildCreateListingPayload } = payloadModule.exports;

test("editing a branch-linked listing restores its own approved monthly fees", () => {
  const detail = {
    id: "listing", branchId: "branch", category: "ROOM", title: "Room", areaM2: 30,
    pricing: { amount: 5000000, unit: "ROOM_MONTH", depositType: "NONE", minimumLeaseMonths: 6 },
    charges: [
      { chargeType: "ELECTRICITY", billingMethod: "PER_KWH", amount: 4000, includedInRent: false },
      { chargeType: "WATER", billingMethod: "PER_M3", amount: 30000, includedInRent: false },
      { chargeType: "OTHER", billingMethod: "PER_MONTH", customName: "Thang máy", amount: 90000, unit: "tháng", includedInRent: false },
    ],
  };
  const branches = [{ id: "branch", name: "Branch", isComplete: false, missingCharges: ["water"],
    defaultCharges: [{ chargeType: "ELECTRICITY", billingMethod: "PER_KWH", amount: 2925 },
      { chargeType: "WATER", billingMethod: "PER_M3", amount: 18750 }] }];
  const form = mapListingDetailToFormState(detail, "edit", branches, "2026-11-09");
  assert.equal(form.monthlyExpenses.electricityPrice, "4000");
  assert.equal(form.monthlyExpenses.waterPrice, "30000");
  assert.equal(form.monthlyExpenses.customFees[0].amount, "90000");
  assert.equal(form.monthlyExpenses.customFees[0].unit, "tháng");
  assert.equal(form.notice, undefined);
});

test("editing only electricity and water retains every other approved fee and vehicle limit", () => {
  const originalCharges = [
    { chargeType: "ELECTRICITY", billingMethod: "PER_KWH", amount: 2925, includedInRent: false, description: "Điện theo công tơ", sortOrder: 1 },
    { chargeType: "WATER", billingMethod: "PER_M3", amount: 18750, includedInRent: false, description: "Nước theo đồng hồ", sortOrder: 2 },
    { chargeType: "INTERNET", billingMethod: "PER_MONTH", amount: null, includedInRent: true, description: "Đã gồm trong giá", sortOrder: 4 },
    { chargeType: "SERVICE_OR_GARBAGE", billingMethod: "PER_PERSON_MONTH", amount: 25000, includedInRent: false, description: "25.000đ/người", sortOrder: 5 },
    { chargeType: "MOTORBIKE_PARKING", billingMethod: "PER_VEHICLE_MONTH", amount: 90000, includedInRent: false, description: "Theo số xe thực tế", sortOrder: 6 },
  ];
  const detail = {
    id: "listing", category: "ROOM", title: "Room", description: "Mô tả", availableFrom: "2026-11-09", areaM2: 30,
    maxMotorbikeCount: 1, maxCarCount: 0, charges: originalCharges,
    pricing: { amount: 5000000, unit: "ROOM_MONTH", depositType: "NONE", minimumLeaseMonths: 6 },
  };
  const form = mapListingDetailToFormState(detail, "edit", [], "2026-11-09");
  assert.equal(form.monthlyExpenses.garbageFeeType, "PER_PERSON");
  const expenses = { ...form.monthlyExpenses, electricityPrice: "4000", waterPrice: "30000" };
  const params = {
    id: detail.id, submissionAction: "SUBMIT_FOR_REVIEW", basicInfo: form.basicInfo,
    apartmentDetails: form.apartmentDetails, houseDetails: form.houseDetails, roomDetails: form.roomDetails,
    furnishingAssets: form.furnishingAssets, selectedAmenities: form.selectedAmenities,
    uploadedMediaList: [], addressMode: "new", pricing: form.pricing,
    monthlyExpenses: expenses, originalMonthlyExpenses: form.monthlyExpenses, originalCharges,
    vehicleLimits: { maxMotorbikeCount: detail.maxMotorbikeCount, maxCarCount: detail.maxCarCount },
  };
  const payload = buildCreateListingPayload(params);
  assert.equal(payload.maxMotorbikeCount, 1);
  assert.equal(payload.maxCarCount, 0);
  assert.deepEqual(Array.from(payload.charges, charge => charge.chargeType),
    originalCharges.map(charge => charge.chargeType));
  assert.equal(payload.charges[0].amount, 4000);
  assert.equal(payload.charges[0].description, "Điện theo công tơ");
  assert.equal(payload.charges[1].amount, 30000);
  assert.equal(payload.charges[1].description, "Nước theo đồng hồ");
  for (let i = 2; i < originalCharges.length; i++)
    assert.deepEqual(JSON.parse(JSON.stringify(payload.charges[i])), originalCharges[i]);
  const newGarbage = buildCreateListingPayload({ ...params, monthlyExpenses: { ...expenses, garbageFeeType: "MONTHLY" } });
  assert.equal(newGarbage.charges.find(charge => charge.chargeType === "SERVICE_OR_GARBAGE").billingMethod, "PER_MONTH");
  const noEdit = buildCreateListingPayload({ ...params, monthlyExpenses: form.monthlyExpenses });
  assert.deepEqual(JSON.parse(JSON.stringify(noEdit.charges)), originalCharges);
  const carAdded = buildCreateListingPayload({ ...params, monthlyExpenses: { ...form.monthlyExpenses, carParkingType: "PER_VEHICLE", carParkingFee: "120000" } });
  assert.equal(carAdded.charges.filter(charge => charge.chargeType === "CAR_PARKING").length, 1);
  assert.equal(carAdded.charges.find(charge => charge.chargeType === "CAR_PARKING").amount, 120000);
});

test("multiple custom fees are retained once and replaced together when edited", () => {
  const originals = [
    { chargeType: "OTHER", billingMethod: "PER_MONTH", amount: 30000, customName: "Thang máy", includedInRent: false, sortOrder: 9 },
    { chargeType: "OTHER", billingMethod: "PER_MONTH", amount: 20000, customName: "Bảo vệ", includedInRent: false, sortOrder: 10 },
  ];
  const detail = { id: "custom-listing", category: "ROOM", title: "Room", areaM2: 20,
    pricing: { amount: 3000000, unit: "ROOM_MONTH", depositType: "NONE", minimumLeaseMonths: 6 }, charges: originals };
  const form = mapListingDetailToFormState(detail, "edit", [], "2026-11-09");
  const params = { id: detail.id, submissionAction: "SAVE_DRAFT", basicInfo: form.basicInfo,
    apartmentDetails: form.apartmentDetails, houseDetails: form.houseDetails, roomDetails: form.roomDetails,
    furnishingAssets: [], selectedAmenities: [], uploadedMediaList: [], addressMode: "new", pricing: form.pricing,
    monthlyExpenses: form.monthlyExpenses, originalMonthlyExpenses: form.monthlyExpenses, originalCharges: originals };
  const unchanged = buildCreateListingPayload(params);
  assert.deepEqual(JSON.parse(JSON.stringify(unchanged.charges)), originals);
  const changed = buildCreateListingPayload({ ...params, monthlyExpenses: { ...form.monthlyExpenses,
    customFees: form.monthlyExpenses.customFees.map((fee, i) => i === 0 ? { ...fee, amount: "35000" } : fee) } });
  assert.equal(changed.charges.filter(charge => charge.chargeType === "OTHER").length, 2);
  assert.deepEqual(Array.from(changed.charges, charge => charge.amount), [35000, 20000]);
});
