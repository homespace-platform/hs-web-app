/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness with isolated TS module loading. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Render the real detail component/mapper; isolate unrelated auth, chat, dialogs and media.
const cache = new Map();
const noComponent = { __esModule: true, default: () => null };
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
    if (name === "next/image") return noComponent;
    if (name === "@/features/auth/useAuth") return { useAuth: () => ({ profile: null, authenticated: false }) };
    if (name === "@/components/chat/ChatDemoProvider") return { useChatDemo: () => ({}) };
    if (name === "./ContractAmendmentWorkspace") return { useAmendmentWorkspace: () => null };
    if (name === "./InlineAmendmentFields") return noComponent;
    if (name === "./utils") return load("components/contract/detail/utils.tsx");
    if (["@/lib/rent-detail-sections", "@/lib/video-stream-url", "@/lib/contract-property-feature-labels", "@/lib/contract-amendment-input", "@/lib/contract-field-state"].includes(name)) return load(name.replace("@/", "") + ".ts");
    if (name.startsWith("@/components/")) return noComponent;
    if (name.startsWith("@/")) return {};
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(resolve, mod, mod.exports);
  cache.set(file, mod.exports);
  return mod.exports;
}
const { toRentProperty } = load("lib/listing-to-rent-property.ts");
const View = load("components/rent/RentDetailView.tsx").default;
const ContractAmenities = load("components/contract/detail/ContractAmenitiesSection.tsx").default;
const ContractProperty = load("components/contract/detail/ContractPropertySection.tsx").default;
const { contractPropertyFeatureValue: featureValue } = load("lib/contract-property-feature-labels.ts");
test("contract UI translates stored enum/uppercase features without altering original snapshots", () => {
  const property = { features: [{ featureName: "Tình trạng nội thất", featureValue: "FULLY_FURNISHED" },
    { featureName: "Loại lối đi", featureValue: "ĐƯỜNG NỘI BỘ" }] };
  const original = JSON.stringify(property);
  const html = renderToStaticMarkup(React.createElement(ContractProperty, { property }));
  assert.match(html, /Đầy đủ nội thất/); assert.match(html, /Đường nội bộ/);
  assert.doesNotMatch(html, /FULLY_FURNISHED|ĐƯỜNG NỘI BỘ/);
  assert.equal(JSON.stringify(property), original);
});
test("property labels are field-specific and preserve hand-entered names and abbreviations", () => {
  const cases = [
    ["Tình trạng nội thất", "BASIC", "Nội thất cơ bản"], ["Tình trạng nội thất", "LUXURY", "Nội thất cao cấp"],
    ["Tình trạng nội thất", "UNFURNISHED", "Không nội thất"], ["Tình trạng nội thất", "PARTIALLY_FURNISHED", "Nội thất một phần"],
    ["Loại lối đi", "HẺM XE HƠI", "Hẻm xe hơi"], ["Lối đi", "PRIVATE", "Riêng biệt"],
    ["Khu vực bếp", "NONE", "Không có"], ["Nhà vệ sinh", "SHARED", "Dùng chung"],
    ["Ban công", "PRIVATE", "Riêng"], ["Đồng hồ điện", "SHARED", "Dùng chung"],
    ["Giờ giấc sinh hoạt", "CURFEW", "Có giờ đóng cửa"], ["Chính sách gửi xe", "PAID", "Có thu phí"],
    ["Hướng ban công", "SOUTH_EAST", "Đông Nam"], ["Tình trạng pháp lý", "PINK_BOOK", "Sổ hồng"],
    ["Tên dự án", "FULLY_FURNISHED", "FULLY_FURNISHED"], ["Lối đi", "Hẻm ABC, gần UBND - PCCC", "Hẻm ABC, gần UBND - PCCC"],
    ["Tình trạng nội thất", "CUSTOM_STATUS", "CUSTOM_STATUS"],
  ];
  for (const [field,raw,expected] of cases) assert.equal(featureValue(field,raw),expected);
});
test("contract amenities show all six stored names and only two columns without invented descriptions", () => {
  const names = ["WiFi", "Máy lạnh", "Máy nước nóng", "Tủ lạnh", "Máy giặt", "Ban công đón gió"];
  const html = renderToStaticMarkup(React.createElement(ContractAmenities, { amenities: names.map(name => ({ name,
    scope: "FAKE_SCOPE", costText: "FAKE_COST", conditionText: "FAKE_RULE" })) }));
  for (const name of names) assert.ok(html.includes(name));
  assert.equal((html.match(/<th /g) || []).length, 2);
  assert.doesNotMatch(html, /FAKE_|Phạm vi|Chi phí|Điều kiện|Nguyên tắc|Chỗ để xe/);
});
function detail(category, status, furnishings) {
  return { id: "listing", title: "Tin kiểm thử", category, status: "PUBLISHED", ownerId: "owner", areaM2: 40,
    pricing: { amount: 2000000 }, amenities: [{ code: "WIFI", name: "WiFi" }], customAmenities: [], furnishings,
    media: [], viewingDays: [], viewingSlots: [], charges: [],
    [category === "HOUSE" ? "houseDetail" : category === "APARTMENT" ? "apartmentDetail" : "roomDetail"]: { furnishingStatus: status },
    address: { fullAddress: "Địa chỉ mẫu", provinceName: "Thành phố Hồ Chí Minh", wardName: "Phường mẫu" } };
}
for (const category of ["HOUSE", "APARTMENT", "ROOM"]) {
  test(`${category}: API furniture reaches the actual listing table with quantity and condition`, () => {
    const furnishings = [{ index: 1, itemCode: "BED", assetName: "Giường", quantity: 2, conditionNote: "Xước nhỏ", conditionText: "Còn tốt — Xước nhỏ" }];
    const property = toRentProperty(detail(category, "BASIC", furnishings));
    assert.deepEqual(property.details.furnishingList, furnishings);
    const html = renderToStaticMarkup(React.createElement(View, { property, showLandlordContact: false }));
    assert.match(html, /Trang thiết bị \/ Nội thất bàn giao/);
    assert.match(html, /Giường/); assert.match(html, />2<\/td>/);
    assert.equal((html.match(/Xước nhỏ/g) || []).length, 1, "Condition note must not repeat");
    assert.doesNotMatch(html, /chưa cung cấp danh sách/);
  });
  test(`${category}: no inventory clearly distinguishes unfurnished from missing owner data`, () => {
    const render = status => renderToStaticMarkup(React.createElement(View, { property: toRentProperty(detail(category, status, [])), showLandlordContact: false }));
    assert.match(render("UNFURNISHED"), /khai báo là không nội thất/);
    assert.match(render("FULLY_FURNISHED"), /Chủ nhà chưa cung cấp danh sách nội thất/);
    assert.doesNotMatch(render("FULLY_FURNISHED"), /khai báo là không nội thất/);
  });
}
