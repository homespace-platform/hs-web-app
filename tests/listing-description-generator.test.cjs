/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness with isolated TS module loading. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const delays = [];
// Passed only to the loaded modules: skips the route's thinking delay without any request parameter.
const instantTimeout = (callback, ms) => {
  delays.push(ms);
  callback();
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const resolve = (name) => {
    if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
    if (name.startsWith("./")) return load(`${path.posix.join(path.posix.dirname(file), name)}.ts`);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports,setTimeout){${source}\n})`, { filename: file })(resolve, mod, mod.exports, instantTimeout);
  cache.set(file, mod.exports);
  return mod.exports;
}
const lib = load("lib/server/listing-description/generator.ts");
const { POST } = load("app/api/listing-description/route.ts");
const { toDescriptionRequest } = load("lib/listing-description-request.ts");
const { buildCreateListingPayload } = load("app/dashboard/properties/new/utils/buildListingPayload.ts");

const CATEGORIES = ["ROOM", "APARTMENT", "HOUSE"];
const shared = {
  price: "3500000", priceUnit: "MONTH", depositType: "MONTH_COUNT", depositMonths: 2, minimumLeaseMonths: 6,
  negotiable: true, availableFrom: "2026-12-01", street: "Đường Nguyễn Hữu Cảnh", ward: "Phường Thạnh Mỹ Tây",
  city: "Thành phố Hồ Chí Minh", furnishingStatus: "FULLY_FURNISHED",
  furnishings: [{ name: "Máy lạnh", quantity: 1 }, { name: "Giường", quantity: 2 }, { name: "Tủ quần áo", quantity: 1 }],
  amenities: ["WiFi", "Thang máy", "Camera"],
  charges: [
    { type: "ELECTRICITY", method: "PER_KWH", amount: 3500 },
    { type: "WATER", method: "PER_M3", amount: 25000 },
    { type: "INTERNET", method: "NOT_APPLICABLE" },
    { type: "SERVICE_OR_GARBAGE", method: "PER_MONTH", amount: 50000 },
    { type: "MOTORBIKE_PARKING", method: "PER_VEHICLE_MONTH", amount: 120000 },
    { type: "CAR_PARKING", method: "NOT_APPLICABLE" },
    { type: "OTHER", method: "PER_MONTH", amount: 100000, name: "Phí giặt sấy" },
  ],
  maxOccupants: 3, maxVehicles: 2,
};
const FULL = {
  ROOM: {
    ...shared, category: "ROOM", areaM2: "25.5", roomCode: "P.202", floorNumber: 2, restroomType: "PRIVATE",
    kitchenType: "PRIVATE", hasWindow: true, balconyType: "PRIVATE", hasMezzanine: true, accessType: "PRIVATE",
    accessHoursType: "FLEXIBLE", electricMeterType: "PRIVATE", waterMeterType: "SHARED", parkingPolicy: "PAID",
  },
  APARTMENT: {
    ...shared, category: "APARTMENT", areaM2: 72, price: 14000000, projectName: "Vinhomes Central Park",
    buildingBlock: "Tòa Landmark 2", floorNumber: 12, totalFloors: 35, bedrooms: 2, bathrooms: 2, livingRooms: 1,
    kitchens: 1, doorDirection: "EAST", balconyDirection: "SOUTH_WEST", view: "View sông Sài Gòn",
  },
  HOUSE: {
    ...shared, category: "HOUSE", areaM2: 180, price: 22000000, depositType: "FIXED_AMOUNT", depositAmount: 44000000,
    totalFloors: 3, bedrooms: 4, bathrooms: 3, livingRooms: 1, kitchens: 1, landAreaM2: 64, frontageWidthM: 4.5,
    lengthM: 15, roadWidthM: 6, frontageCount: 2, hasRooftop: true, hasGarage: true, accessType: "PRIVATE",
  },
};
const base = { price: 3000000, priceUnit: "MONTH", depositType: "NONE", minimumLeaseMonths: 6, furnishingStatus: "UNFURNISHED" };
const MINIMAL = {
  ROOM: { ...base, category: "ROOM", areaM2: 20, roomCode: "A3", maxOccupants: 2, restroomType: "SHARED" },
  APARTMENT: { ...base, category: "APARTMENT", areaM2: 45, projectName: "Sunrise City", floorNumber: 0, bedrooms: 0, bathrooms: 1 },
  HOUSE: { ...base, category: "HOUSE", areaM2: 80, totalFloors: 2, bedrooms: 2, bathrooms: 1 },
};

const INVENTED = /gần chợ|gần trường|gần siêu thị|an ninh|thoáng|mới xây|mới tinh|yên tĩnh|trung tâm|hiện đại|sạch sẽ|rộng rãi|sang trọng|ấm cúng|lý tưởng|view đẹp|tiện nghi cao cấp|giao thông|giá rẻ|24\/7/i;
const LEFTOVER = /undefined|null|NaN|\[object|[{}[\]]|\||\b[A-Z]+_[A-Z_]+\b|\b(PRIVATE|SHARED|NONE|MONTH|FULL|EAST|SOUTH)\b/;
const BROKEN = /  | [,.;:!?]|[,;:]\s*[.,;:!?]|\.\.|[?!]\.|\(\s*\)|[,;:]$|^[,.;:]/m;
const words = (text) => text.split(/\s+/).filter(Boolean).length;

function checkText(text, label) {
  assert.doesNotMatch(text, LEFTOVER, label);
  assert.doesNotMatch(text, BROKEN, label);
  assert.doesNotMatch(text, INVENTED, label);
  assert.doesNotMatch(text, /(tòa|block):? (là )?(tòa|block) /i, label);
  assert.doesNotMatch(text, /(^|[^\d.,])0 (phòng|người|xe|tầng|tháng|đ)(?![\p{L}])/u, label);
  assert.doesNotMatch(text, /(người|tầng|xe|phòng) \1(?![\p{L}])/u, label);
  assert.ok(text.length <= lib.MAX_DESCRIPTION_LENGTH, label);
}

test("60 templates: valid text with full and minimal data, every fact stated", () => {
  const expected = {
    ROOM: ["25,5 mét vuông", "3.500.000 đ/tháng", "đặt cọc 2 tháng", "6 tháng", "P.202", "đầy đủ nội thất", "máy lạnh",
      "giường (số lượng 2)", "WiFi", "tiền điện 3.500 đ/kWh", "phí giặt sấy 100.000 đ/phòng/tháng", "nhà vệ sinh riêng",
      "kệ bếp riêng", "có cửa sổ", "giờ giấc tự do", "đồng hồ nước dùng chung", "có thu phí", "tầng 2", "3 người", "2 xe",
      "01/12/2026", "đường Nguyễn Hữu Cảnh"],
    APARTMENT: ["72 mét vuông", "14.000.000 đ/tháng", "Vinhomes Central Park", "Landmark 2", "tầng 12", "35 tầng",
      "2 phòng ngủ", "cửa chính hướng Đông", "ban công hướng Tây Nam", "sông Sài Gòn", "3 người", "01/12/2026",
      "máy lạnh", "WiFi", "tiền nước 25.000 đ/m³"],
    HOUSE: ["180 mét vuông", "22.000.000 đ/tháng", "đặt cọc 44.000.000 đ", "3 tầng", "4 phòng ngủ", "diện tích đất 64",
      "chiều ngang 4,5 m", "2 mặt tiền", "sân thượng và garage", "lối đi riêng", "3 người", "2 xe", "01/12/2026",
      "máy lạnh", "WiFi", "giữ", "phí gửi xe máy 120.000 đ/xe/tháng"].filter((s) => s !== "giữ"),
  };
  const all = new Set();
  for (const category of CATEGORIES) {
    const ids = lib.templateIds(category);
    assert.equal(ids.length, 20);
    for (const [kind, request] of [["full", FULL[category]], ["minimal", MINIMAL[category]]]) {
      assert.equal(lib.validateRequest(request), null);
      for (const id of ids) {
        for (const random of [() => 0, () => 0.999]) {
          const text = lib.renderDescription(request, id, random);
          checkText(text, `${id} ${kind}\n${text}`);
          const paragraphs = text.split("\n\n").length;
          assert.ok(paragraphs >= 3, `${id} ${kind}: ${paragraphs} paragraphs`);
          const [min, max] = kind === "full" ? [180, 320] : [60, 220];
          assert.ok(words(text) >= min && words(text) <= max, `${id} ${kind}: ${words(text)} words`);
          if (kind === "full") {
            for (const fact of expected[category]) {
              assert.ok(text.toLowerCase().includes(fact.toLowerCase()), `${id} misses ${fact}\n${text}`);
            }
            all.add(text);
          } else {
            assert.doesNotMatch(text, /thương lượng|ban công|cửa sổ|gửi xe|chỗ để xe|tiện ích|Địa chỉ/i, `${id}\n${text}`);
          }
        }
      }
    }
  }
  assert.ok(all.size >= 60);
});

test("negative and contradicting values are not turned into positive claims", () => {
  const render = (over) => lib.renderDescription({ ...FULL.ROOM, ...over }, "ROOM-02", () => 0);
  const none = render({ parkingPolicy: "NONE", restroomType: "SHARED", hasWindow: false, balconyType: "NONE",
    kitchenType: "NONE", hasMezzanine: false, amenities: ["WiFi", "Chỗ để xe"] });
  assert.match(none, /không có chỗ để xe/);
  assert.match(none, /nhà vệ sinh chung/);
  assert.match(none, /không có cửa sổ, không có ban công/);
  assert.match(none, /không có bếp/);
  assert.doesNotMatch(none, /khép kín|gác lửng|gửi xe máy|giữ xe|Số xe|Giới hạn xe|Chỗ để xe(,|\.)/);
  // Form defaults of a new room: "free parking space" together with "no motorbike parking".
  const defaults = render({ parkingPolicy: "FREE", amenities: [], charges: [{ type: "MOTORBIKE_PARKING", method: "NOT_APPLICABLE" }] });
  assert.doesNotMatch(defaults, /Gửi xe:|miễn phí|không nhận giữ xe máy/);
  const house = (over) => lib.renderDescription({ ...FULL.HOUSE, charges: [{ type: "MOTORBIKE_PARKING", method: "NOT_APPLICABLE" }], amenities: [], ...over }, "HOUSE-01");
  assert.match(house({ hasGarage: false }), /không nhận giữ xe máy/);
  assert.doesNotMatch(house({ hasGarage: true }), /không nhận giữ/);
});

test("contact data and raw codes are never published; huge input stays within the limit", () => {
  const text = lib.renderDescription({
    ...FULL.APARTMENT, view: "Liên hệ 0901 234 567", amenities: ["PETS_ALLOWED", "Zalo chủ nhà", "a@b.vn", "WiFi."],
    furnishings: [{ name: "Tủ, gọi 090.123.4567" }],
  }, "APARTMENT-01");
  assert.doesNotMatch(text, /090|PETS|zalo|@/i);
  assert.match(text, /WiFi\./);
  checkText(text, text);
  const long = "Rất dài ".repeat(30);
  const huge = lib.renderDescription({
    ...FULL.ROOM, amenities: Array(50).fill(long), furnishings: Array(100).fill({ name: long }),
    charges: Array(40).fill({ type: "OTHER", method: "PER_MONTH", amount: 1000, name: long }),
  }, "ROOM-01");
  assert.ok(huge.length <= lib.MAX_DESCRIPTION_LENGTH);
});

test("the previous template is never picked again", () => {
  for (const category of CATEGORIES) {
    for (const previousTemplateId of lib.templateIds(category)) {
      for (const value of [0, 0.5, 0.999999]) {
        const result = lib.generateDescription({ ...MINIMAL[category], previousTemplateId }, () => value);
        assert.notEqual(result.templateId, previousTemplateId);
        assert.ok(result.templateId.startsWith(category) && result.description);
      }
    }
  }
});

const post = (body) => POST(new Request("http://localhost/api/listing-description", {
  method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
}));

test("route: returns a description after the delay", async () => {
  delays.length = 0;
  const response = await post({ ...FULL.ROOM, previousTemplateId: "ROOM-01" });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.templateId, /^ROOM-\d\d$/);
  assert.notEqual(result.templateId, "ROOM-01");
  checkText(result.description, result.description);
  assert.deepEqual(delays, [5000]);
});

test("route: bad input gets 400 with a short message and no delay", async () => {
  delays.length = 0;
  const bad = ["{", "null", "[]", "x".repeat(50001), {}, { ...FULL.ROOM, category: "VILLA" }, { ...FULL.ROOM, price: "abc" },
    { ...FULL.ROOM, price: 0 }, { ...FULL.ROOM, areaM2: undefined }, { ...FULL.ROOM, roomCode: " " },
    { ...FULL.ROOM, restroomType: "TOILET" }, { ...FULL.ROOM, hasWindow: "YES" }, { ...FULL.ROOM, view: "a".repeat(256) },
    { ...FULL.ROOM, amenities: Array(51).fill("a") }, { ...FULL.ROOM, amenities: [1] }, { ...FULL.ROOM, charges: [null] },
    { ...FULL.ROOM, furnishings: "Giường" }, { ...FULL.HOUSE, depositAmount: null }, { ...FULL.APARTMENT, bathrooms: 0 }];
  for (const body of bad) {
    const response = await post(body);
    assert.equal(response.status, 400, JSON.stringify(body)?.slice(0, 200));
    const { message } = await response.json();
    assert.ok(message && message.length < 100);
  }
  assert.deepEqual(delays, []);
});

test("web adapter: the create-listing payload is accepted and keeps private fields out", () => {
  const payload = buildCreateListingPayload({
    submissionAction: "SAVE_DRAFT", addressMode: "new", uploadedMediaList: [],
    basicInfo: { title: "Tiêu đề riêng của tin", description: "", images: [], videos: [], category: "room", availableDate: "2026-12-01" },
    apartmentDetails: {}, houseDetails: {},
    roomDetails: { roomCode: "P1", areaM2: "20", maxOccupants: "2", toiletType: "PRIVATE", furnishing: "FULL", parkingPolicy: "FREE" },
    furnishingAssets: [{ assetName: "Giường", quantity: "1", handoverCondition: "GOOD" }],
    selectedAmenities: ["ELEVATOR", "Trạm sạc"], catalogAmenityCodes: ["ELEVATOR"],
    monthlyExpenses: { electricityType: "KWH", electricityPrice: "3500", waterType: "INCLUDED", managementFeeType: "NONE",
      internetType: "SELF_PAY", garbageFeeType: "NONE", motorbikeParkingType: "NONE", carParkingType: "NONE", customFees: [] },
    pricing: { priceMonthly: "3000000", priceUnit: "VND_ROOM_MONTH", depositType: "MONTHS", depositMonths: "1", minimumLeaseMonths: "6" },
  });
  const request = toDescriptionRequest(payload, { street: "Lê Lợi", houseNumber: "12", ward: "Phường Bến Thành", city: "TP.HCM", addressNote: "gọi cổng" }, { ELEVATOR: "Thang máy" });
  assert.equal(lib.validateRequest(JSON.parse(JSON.stringify(request))), null);
  assert.deepEqual(request.amenities, ["Thang máy", "Trạm sạc"]);
  assert.doesNotMatch(JSON.stringify(request), /Tiêu đề|gọi cổng|houseNumber|refId/);
  const { description } = lib.generateDescription(request, () => 0);
  assert.match(description, /3\.000\.000 đ\/phòng\/tháng/);
});
