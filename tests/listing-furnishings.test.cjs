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
const guestAuth = { profile: null, authenticated: false, initialized: true, userId: null, login() {} };
let auth = guestAuth;
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
    if (name === "@/features/auth/useAuth") return { useAuth: () => auth };
    if (name === "@/components/chat/ChatDemoProvider") return { useChatDemo: () => ({}) };
    if (name === "./ContractAmendmentWorkspace") return { useAmendmentWorkspace: () => null };
    if (name === "./InlineAmendmentFields") return noComponent;
    if (name === "./utils") return load("components/contract/detail/utils.tsx");
    if (["@/lib/rent-detail-sections", "@/lib/video-stream-url", "@/lib/contract-property-feature-labels", "@/lib/contract-amendment-input", "@/lib/contract-field-state", "@/lib/nearby-directions"].includes(name)) return load(name.replace("@/", "") + ".ts");
    if (name === "@/components/address/AddressMapPreview") return load("components/address/AddressMapPreview.tsx");
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
function listingMap(session, address = { latitude: 10.8209195, longitude: 106.6872986 }) {
  const data = detail("ROOM", "BASIC", []);
  data.address = { ...data.address, ...address };
  auth = session;
  try { return renderToStaticMarkup(React.createElement(View, { property: toRentProperty(data) })); }
  finally { auth = guestAuth; }
}
function listingRoute(html) {
  const link = html.match(/<a\b[^>]*href="(https:\/\/www\.google\.com\/maps\/dir\/[^\"]+)"[^>]*>/);
  assert.ok(link, "The listing map must offer directions");
  return new URL(link[1].replaceAll("&amp;", "&"));
}
test("listing directions let Google Maps use current location for guests and signed-in customers", () => {
  const sessions = [guestAuth, { ...guestAuth, initialized: false },
    ...[["customer-a", 10.8337055, 106.6894342], ["customer-b", 16.0625755, 108.2178987]]
      .map(([userId, latitude, longitude]) => ({ ...guestAuth, authenticated: true, userId, profile: { id: userId, address: { latitude, longitude } } }))];
  for (const session of sessions) {
    const html = listingMap(session);
    const route = listingRoute(html);
    assert.equal(route.searchParams.has("origin"), false);
    assert.equal(route.searchParams.get("destination"), "10.8209195,106.6872986");
    assert.equal(route.searchParams.get("api"), "1");
    assert.equal(route.searchParams.get("dir_action"), "navigate");
    assert.match(html, /Chỉ đường từ vị trí hiện tại/);
    assert.doesNotMatch(html, /Đăng nhập để chỉ đường|Cập nhật địa chỉ để chỉ đường/);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /q=10\.8209195%2C106\.6872986/);
  }
});
test("Settings address changes and missing or stale account addresses do not affect current-location directions", () => {
  const session = { ...guestAuth, authenticated: true, userId: "customer", profile: { id: "customer", address: { latitude: 11, longitude: 107 } } };
  const before = listingRoute(listingMap(session));
  session.profile.address = { latitude: 12, longitude: 108 };
  const after = listingRoute(listingMap(session));
  assert.equal(before.href, after.href);
  for (const address of [null, {}, { latitude: null, longitude: 106 }, { latitude: "10.8", longitude: 106 }, { latitude: NaN, longitude: 106 }, { latitude: 91, longitude: 106 }]) {
    const html = listingMap({ ...guestAuth, authenticated: true, userId: "customer", profile: { id: "customer", address } });
    assert.equal(listingRoute(html).href, before.href);
  }
  const switched = listingMap({ ...guestAuth, authenticated: true, userId: "new-customer", profile: { id: "old-customer", address: { latitude: 11, longitude: 107 } } });
  assert.equal(listingRoute(switched).href, before.href);
});
test("invalid listing coordinates never produce a route with a guessed destination", () => {
  for (const address of [{ latitude: null, longitude: null }, {}, { latitude: "10.8", longitude: 106 },
    { latitude: NaN, longitude: 106 }, { latitude: 91, longitude: 106 }, { latitude: 10, longitude: Infinity }]) {
    const html = listingMap(guestAuth, address);
    assert.doesNotMatch(html, /maps\/dir\/|Chỉ đường từ vị trí hiện tại/);
  }
});
test("non-public listing access is read-only for a non-owner, not a new rental offer",()=>{
  for(const status of ["RENTED","HIDDEN","EXPIRED","DRAFT","VIOLATION"]) {
    const data=detail("ROOM","BASIC",[]);data.status=status;
    const html=renderToStaticMarkup(React.createElement(View,{property:toRentProperty(data)}));
    assert.match(html,/Tin hiện không nhận yêu cầu thuê mới/);
    assert.doesNotMatch(html,/title="Gửi yêu cầu thuê nhà trực tiếp tới chủ nhà"/);
    assert.doesNotMatch(html,/Chỉnh sửa bài đăng|Nhân bản bài đăng/);
    assert.match(html,/disabled=""/);
  }
});
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
