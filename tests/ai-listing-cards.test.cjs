const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Compile isolated repository modules in memory; no package install or production mocks.
function load(relativePath, mocks = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const { cardListingIds, createListingCardLoader, splitCardsAndLinks } = load("lib/ai-listing-cards.ts");

test("a listing gets a card once; later reuse becomes a link, new ones still get cards", () => {
  const a = "00000000-0000-0000-0000-00000000000a", b = "00000000-0000-0000-0000-00000000000b";
  const c = "00000000-0000-0000-0000-00000000000c";
  const split = splitCardsAndLinks([
    { id: "u1", sender: "me" },
    { id: "m1", sender: "ai", listingIds: [a, b] },
    { id: "m2", sender: "ai", listingIds: [b, a] },
    { id: "m3", sender: "ai", listingIds: [a, c] },
  ]);
  assert.deepEqual(split.get("m1"), { cards: [a, b], links: [] });
  assert.deepEqual(split.get("m2"), { cards: [], links: [b, a] });
  assert.deepEqual(split.get("m3"), { cards: [c], links: [a] });
});
const ids = Array.from({ length: 7 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`);
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("validated IDs preserve a requested page larger than five, with an absolute safety ceiling", () => {
  assert.deepEqual(cardListingIds([ids[0], "javascript:alert(1)", ids[0], ...ids.slice(1)]), ids);
  const many = Array.from({length: 100}, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`);
  assert.deepEqual(cardListingIds(many.slice(0, 10)), many.slice(0, 10));
  assert.equal(cardListingIds(many).length, 50);
  assert.deepEqual(cardListingIds(undefined), []);
});

test("concurrent duplicate cards share one request, not cached facts across reopens", async () => {
  let calls = 0;
  const loader = createListingCardLoader(async () => ({ price: ++calls }));
  const a = loader(ids[0]);
  const b = loader(ids[0]);
  assert.equal(a, b);
  assert.equal((await a).price, 1);
  await tick();
  assert.equal((await loader(ids[0])).price, 2);
});

test("card API reads are bounded and order is preserved", async () => {
  let active = 0, peak = 0;
  const loader = createListingCardLoader(async (id) => {
    peak = Math.max(peak, ++active);
    await tick();
    active--;
    return id;
  });
  assert.deepEqual(await Promise.all(ids.map(loader)), ids);
  assert.equal(peak, 3);
});

test("network failure can retry and invalid references never fetch", async () => {
  let calls = 0;
  const loader = createListingCardLoader(async () => {
    if (++calls === 1) throw new Error("network");
    return "recovered";
  });
  await assert.rejects(loader("bad"));
  assert.equal(calls, 0);
  await assert.rejects(loader(ids[0]));
  await tick();
  assert.equal(await loader(ids[0]), "recovered");
});

const mocks = {
  "next/link": ({ children, prefetch, ...props }) => React.createElement("a", props, children),
  "next/image": ({ fill, unoptimized, ...props }) => React.createElement("img", props),
  "next/navigation": { useRouter: () => ({ push: () => { throw new Error("unexpected redirect"); } }) },
  "@/features/auth/useAuth": { useAuth: () => ({ authenticated: true, login: () => {} }) },
  "@/store/hooks": { useAppDispatch: () => () => {}, useAppSelector: (select) => select({ favorite: { ids: [], status: "succeeded" } }) },
  "@/features/favorite/favoriteSlice": { toggleFavoriteItem: () => {} },
  "@/components/common/UserAvatar": () => null,
  "@/lib/format-currency": load("lib/format-currency.ts"),
};
const Card = load("components/rent/RentCollageCard.tsx", mocks).default;
const property = { id: ids[0], title: "Phòng trọ có ban công", images: [], category: "room", categoryLabel: "Phòng trọ",
  location: "Phường Phú Lợi, Hồ Chí Minh", priceMillion: 2, areaM2: 25, photosCount: 0,
  landlord: { name: "Chủ nhà" }, details: { pricing: { amount: 2200000, unit: "PERSON_MONTH", currency: "VND" } } };

test("both listing card layouts open a safe new tab, keep true price unit and omit redirect chat action", () => {
  for (const viewMode of ["grid", "collage"]) {
    const html = renderToStaticMarkup(React.createElement(Card, { property, viewMode, openInNewTab: true }));
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.ok(html.includes(`/rent/${ids[0]}`));
    assert.ok(html.includes("2.200.000 đ/người/tháng"));
    assert.ok(!html.includes("Nhắn tin cho chủ nhà"));
  }
});

test("normal rent-page cards retain their existing navigation by default", () => {
  const html = renderToStaticMarkup(React.createElement(Card, { property }));
  assert.ok(!html.includes('target="_blank"'));
  assert.ok(html.includes("Nhắn tin cho chủ nhà"));
});

const CompactCard = load("components/chat/AiListingCompactCard.tsx", { "next/link": mocks["next/link"], "next/image": mocks["next/image"] }).default;
const listing = { id: ids[0], title: "Cho thuê phòng trọ có ban công tại Phường Phú Lợi", category: "ROOM",
  areaM2: 23.5, pricing: { amount: 2200000, unit: "PERSON_MONTH", currency: "VND" },
  roomDetail: { maxOccupants: 3 }, address: { ward: "Phường Phú Lợi", city: "Hồ Chí Minh", streetLine: "48/19 Lê Lợi" },
  owner: { displayName: "PRIVATE OWNER" }, media: [{ mediaType: "IMAGE", url: "https://example.com/huge.jpg" }], viewCount: 123 };
const renderCompact = (data = listing) => renderToStaticMarkup(React.createElement(CompactCard, { listing: data, position: 3 }));

test("chat uses a standalone compact card with only relevant facts and original ordinal", () => {
  const html = renderCompact();
  for (const text of [listing.title, "2.200.000 đ/người/tháng", "23,5 m²", "Tối đa 3 người", "Phường Phú Lợi, Hồ Chí Minh", "Tin 3"]) {
    assert.ok(html.includes(text), text);
  }
  assert.equal((html.match(/<img\b/g) || []).length, 1);
  assert.ok(!html.includes("PRIVATE OWNER"));
  assert.ok(!html.includes("48/19"));
  assert.ok(!html.includes("123 lượt xem"));
  assert.ok(!html.includes("Lưu tin"));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("house and apartment cards distinguish zero bedrooms from missing facts without guessing subtype", () => {
  const house = renderCompact({ ...listing, category: "HOUSE", houseDetail: { bedroomCount: 4, maxOccupants: 6 }, roomDetail: null });
  assert.ok(house.includes("Nhà nguyên căn") && house.includes("4 phòng ngủ") && house.includes("Tối đa 6 người"));
  const studio = renderCompact({ ...listing, category: "APARTMENT", apartmentDetail: { bedroomCount: 0 }, roomDetail: null });
  assert.ok(studio.includes("Chung cư") && studio.includes("Không phòng ngủ riêng"));
  assert.ok(!studio.includes("Studio"));
  const unknown = renderCompact({ ...listing, category: "APARTMENT", apartmentDetail: null, roomDetail: null });
  assert.ok(!unknown.includes("Không phòng ngủ riêng"));
  assert.ok(!unknown.includes("Tối đa"));
});

test("missing facts are not rendered as zero, NaN or invented occupancy", () => {
  const html = renderCompact({ ...listing, areaM2: null, address: null, roomDetail: null, pricing: { amount: null } });
  assert.ok(html.includes("Chưa rõ giá thuê"));
  for (const text of ["NaN", "0 m²", "0 người", "Tối đa", "Phường Phú Lợi, Hồ Chí Minh"]) assert.ok(!html.includes(text));
});

test("all supported pricing units are preserved on compact cards", () => {
  for (const [unit, label] of Object.entries({ MONTH: "tháng", ROOM_MONTH: "phòng/tháng", PERSON_MONTH: "người/tháng", M2_MONTH: "m²/tháng", SEAT_MONTH: "chỗ/tháng" })) {
    assert.ok(renderCompact({ ...listing, pricing: { ...listing.pricing, unit } }).includes(`đ/${label}`));
  }
});

test("only one cover image is shown before text, prioritizing cover flag over media order", () => {
  const html = renderCompact({ ...listing, media: [
    { mediaType: "VIDEO", cover: true, url: "https://example.com/video.mp4", sortOrder: 0 },
    { mediaType: "IMAGE", cover: false, url: "https://example.com/other.jpg", sortOrder: 1 },
    { mediaType: "IMAGE", cover: true, url: "https://example.com/cover.jpg", sortOrder: 5 },
  ] });
  assert.equal((html.match(/<img\b/g) || []).length, 1);
  assert.ok(html.includes('src="https://example.com/cover.jpg"'));
  assert.ok(html.indexOf("<img") < html.indexOf("<h3"));
  assert.ok(!html.includes("video.mp4") && !html.includes("other.jpg"));
  assert.ok(html.includes('loading="lazy"'));
});

test("when no cover is flagged use the first image by sortOrder without mutating API data", () => {
  const media = [{ mediaType: "IMAGE", url: "https://example.com/second.jpg", sortOrder: 2 },
    { mediaType: "IMAGE", url: "https://example.com/first.jpg", sortOrder: 1 }];
  const html = renderCompact({ ...listing, media });
  assert.ok(html.includes('src="https://example.com/first.jpg"'));
  assert.equal(media[0].sortOrder, 2);
});

test("missing image, video-only or invalid image URLs show a compact placeholder", () => {
  for (const media of [[], [{ mediaType: "VIDEO", url: "https://example.com/video.mp4" }],
    [{ mediaType: "IMAGE", url: null }], [{ mediaType: "IMAGE", url: "javascript:alert(1)" }]]) {
    const html = renderCompact({ ...listing, media });
    assert.ok(!html.includes("<img"));
    assert.ok(html.includes("Chưa có ảnh"));
    assert.ok(html.includes(listing.title));
  }
});
