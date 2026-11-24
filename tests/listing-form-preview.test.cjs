/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness with isolated TS module loading. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const cache = new Map();
const noComponent = { __esModule: true, default: () => null };
const REAL = ["lib/listing-form-preview", "lib/listing-to-rent-property", "lib/format-time-ago", "lib/video-stream-url",
  "lib/rent-detail-sections", "lib/contract-property-feature-labels", "types/listing-policy.type",
  "app/dashboard/properties/new/utils/buildListingPayload", "app/dashboard/properties/new/constants"];
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const resolve = (name) => {
    if (name === "next/navigation") return { useRouter: () => ({ push() {} }) };
    if (name === "next/link") return { __esModule: true, default: ({ children, href, ...rest }) => React.createElement("a", { href, ...rest }, children) };
    if (name === "@/features/auth/useAuth") return { useAuth: () => ({ profile: null, authenticated: false, login() {} }) };
    if (name === "@/components/chat/ChatDemoProvider") return { useChatDemo: () => ({}) };
    if (name === "@/hooks/usePermission") return { useFeatureGate: () => ({ guard: () => true }) };
    if (name === "@/hooks/useStickyTop") return { useStickyTop: () => [() => {}, 16] };
    if (name === "@/lib/permissions") return { PERMISSIONS: {} };
    const real = REAL.find((r) => name === "@/" + r);
    if (real) return load(real + ".ts");
    if (name === "@/components/common/MediaGallery") return { __esModule: true, default: (p) => React.createElement("div", { "data-media": p.mediaItems.map((m) => m.type + ":" + m.url).join("|") }) };
    if (name === "@/components/listing/ListingPoliciesCard") return { __esModule: true, default: (p) => React.createElement("div", null, (p.rows || []).map((r) => r.label + "=" + r.displayValue).join(";")) };
    if (name === "@/components/nearby/NearbyPlacesPanel") return { __esModule: true, default: () => React.createElement("div", null, "NEARBY") };
    if (name.startsWith("@/components/")) return noComponent;
    if (name.startsWith("@/")) return {};
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(resolve, mod, mod.exports);
  cache.set(file, mod.exports);
  return mod.exports;
}
const { buildListingPreview } = load("lib/listing-form-preview.ts");
const View = load("components/rent/RentDetailView.tsx").default;

const expenses = { electricityType: "KWH", electricityPrice: 3500, waterType: "INCLUDED", managementFeeType: "NONE",
  internetType: "SELF_PAY", garbageFeeType: "NONE", motorbikeParkingType: "NONE", carParkingType: "NONE", customFees: [] };
const base = (over = {}) => ({
  submissionAction: "SAVE_DRAFT", addressMode: "new", uploadedMediaList: [],
  basicInfo: { title: "Phòng đẹp", description: "", images: [], videos: [], category: "room", availableDate: "2026-01-01" },
  apartmentDetails: { projectName: "Vinhomes", furnishing: "FULL", bedrooms: 2, areaM2: 70, floor: 5 },
  houseDetails: { furnishing: "FULL", totalUsableAreaM2: 80, bedrooms: 3, totalFloors: 2 },
  roomDetails: { toiletType: "PRIVATE", furnishing: "BASIC", areaM2: 22, maxOccupants: 2 },
  furnishingAssets: [], selectedAmenities: [], monthlyExpenses: expenses,
  pricing: { priceMonthly: 3000000, priceUnit: "VND_MONTH", isNegotiable: true, depositType: "MONTHS", depositMonths: 2, paymentCycle: "MONTHLY", minimumLeaseMonths: 6 },
  ...over,
});

test("room basics, price and deposit", () => {
  const p = buildListingPreview(base());
  assert.equal(p.category, "room");
  assert.equal(p.categoryLabel, "Phòng trọ");
  assert.equal(p.areaM2, 22);
  assert.equal(p.priceMillion, 3);
  assert.equal(p.depositMonths, 2);
  assert.equal(p.depositType, "MONTH_COUNT");
  assert.equal(p.isVerified, false);
});

test("apartment and house map their own details", () => {
  const apt = buildListingPreview(base({ basicInfo: { ...base().basicInfo, category: "apartment" } }));
  assert.equal(apt.categoryLabel, "Căn hộ chung cư");
  assert.equal(apt.beds, 2);
  assert.equal(apt.details.projectName, "Vinhomes");
  const house = buildListingPreview(base({ basicInfo: { ...base().basicInfo, category: "house" } }));
  assert.equal(house.categoryLabel, "Nhà nguyên căn");
  assert.equal(house.areaM2, 80);
  assert.equal(house.beds, 3);
});

test("amenities use catalog labels, custom ones kept, furnishings and policies mapped", () => {
  const p = buildListingPreview(base({
    selectedAmenities: ["WIFI", "Ban công xanh"], catalogAmenityCodes: ["WIFI"],
    furnishingAssets: [{ itemCode: null, assetName: "Tủ lạnh", quantity: 2, handoverCondition: "GOOD" }],
    policies: [{ code: "PETS", value: "ALLOWED" }],
    selectedViewingDays: ["MONDAY"], selectedViewingSlots: ["MORNING"],
  }), { amenityLabels: { WIFI: "WiFi" } });
  assert.deepEqual(p.details.amenities, ["WiFi"]);
  assert.deepEqual(p.details.customAmenities, ["Ban công xanh"]);
  assert.equal(p.details.furnishingList[0].conditionText, "Còn tốt");
  assert.equal(p.details.policies[0].displayValue, "Cho phép");
  assert.deepEqual(p.details.viewingDays, ["MONDAY"]);
});

test("images/videos: urls used, local files via fileToUrl, blob video bypasses proxy", () => {
  const file = {};
  const p = buildListingPreview(base({ basicInfo: { ...base().basicInfo,
    images: [{ name: "a", dataUrl: "https://x/a.jpg" }, { name: "b", dataUrl: "", file }],
    videos: [{ name: "v", file }] } }), { fileToUrl: () => "blob:local" });
  assert.deepEqual(p.images, ["https://x/a.jpg", "blob:local"]);
  const vid = p.mediaItems.find((m) => m.type === "video");
  assert.equal(vid.streamUrl, "blob:local");
  assert.equal(p.hasVideo, true);
});

test("empty optional fields render without undefined and in preview mode hide CTAs/nearby", () => {
  const p = buildListingPreview(base({ basicInfo: { title: "", description: "", images: [], videos: [], category: "room", availableDate: "" } }));
  const html = renderToStaticMarkup(React.createElement(View, { property: p, previewMode: true, showLandlordContact: false }));
  assert.doesNotMatch(html, /undefined|NaN|\[object/);
  assert.match(html, /Bản xem trước/);
  assert.match(html, /Chưa chọn địa chỉ/);
  for (const hidden of ["Yêu cầu thuê nhà", "Đặt lịch xem", "Nhắn tin với chủ nhà", "NEARBY", "Chỉnh sửa bài đăng"]) assert.ok(!html.includes(hidden), hidden);
});

test("non-preview mode still shows NEARBY and visitor CTA", () => {
  const p = buildListingPreview(base());
  const html = renderToStaticMarkup(React.createElement(View, { property: p }));
  assert.match(html, /NEARBY/);
  assert.match(html, /Nhắn tin với chủ nhà/);
});
