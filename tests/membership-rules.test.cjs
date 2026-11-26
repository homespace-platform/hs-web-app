/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TS loader for logic tests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTs = require("./helpers/load-ts.cjs");
const lib = loadTs("lib/membership.ts");

const view = (raw) => lib.normalizeMembershipView(raw);

test("same tier is blocked until plan uses reach zero; upgrades stay open, downgrades stay closed", () => {
  const pro = view({ tier: "PRO", remainingUses: 1, addonRemaining: 5 });
  assert.match(lib.getPlanBlockReason("PRO", pro), /hết lượt gói/);
  assert.match(lib.getPlanBlockReason("STARTER", pro), /gói cao hơn/);
  assert.equal(lib.getPlanBlockReason("BUSINESS", pro), undefined);
  // Extra uses do not block a rebuy: only the plan balance counts.
  assert.equal(lib.getPlanBlockReason("PRO", view({ tier: "PRO", remainingUses: 0, addonRemaining: 5 })), undefined);
  assert.equal(lib.getPlanBlockReason("PRO", view({ tier: "FREE", remainingUses: 3 })), undefined);
});

test("FREE refill time is shown in Vietnam time and tolerates a missing or bad value", () => {
  const free = view({ tier: "FREE", quotaResetsAt: "2026-12-25T18:30:00Z" });
  assert.match(lib.getQuotaResetLabel(free), /^Hồi lượt vào .*01:30.*26\/12\/2026|^Hồi lượt vào 26\/12\/2026.*01:30/);
  assert.equal(lib.getQuotaResetLabel(view({ tier: "FREE" })), null);
  assert.equal(lib.getQuotaResetLabel(view({ tier: "FREE", quotaResetsAt: "x" })), null);
  assert.equal(lib.getQuotaResetLabel(view({ tier: "PRO", quotaResetsAt: "2026-12-25T18:30:00Z" })), null);
  assert.equal(lib.getTierLabel("FREE"), "Free (3 lượt / 30 ngày)");
  assert.equal(lib.DEFAULT_MEMBERSHIP_PLANS[0].durationDays, 30);
  assert.doesNotMatch(JSON.stringify(lib.DEFAULT_MEMBERSHIP_PLANS), /một lần/);
});

test("publishable uses add extra uses to plan uses, and absent add-on fields degrade to zero", () => {
  const legacy = view({ tier: "FREE", remainingUses: 2 });
  assert.equal(lib.getPublishableUses(legacy), 2);
  assert.equal(lib.getAddonBalanceLabel(legacy), null);
  const extra = view({ tier: "FREE", remainingUses: 0, addonRemaining: 4, addonExpiresAt: "2027-02-01T03:00:00Z" });
  assert.equal(lib.getPublishableUses(extra), 4);
  assert.match(lib.getAddonBalanceLabel(extra), /^Lượt mua thêm: 4 \(hạn gần nhất .*01\/02\/2027/);
});

test("ADDON orders never read as a plan, and the offer has no client fallback price", () => {
  const order = lib.normalizeOrderView({ id: "o1", kind: "ADDON", quantity: 3, tier: null, status: "PAID" });
  assert.equal(order.tier, null);
  assert.equal(lib.getOrderProductLabel(order), "Mua thêm 3 lượt đăng tin");
  assert.match(lib.resolveCancelOrderOutcome(order).noticeMessage, /Lượt mua thêm/);
  assert.equal(lib.normalizeOrderView({ id: "o2", tier: "PRO", status: "PAID" }).kind, "PLAN");
  assert.equal(lib.normalizeAddonOffer({}), null);
  assert.deepEqual({ ...lib.normalizeAddonOffer({ unitPriceVnd: 8000, validDays: 90, maxQuantity: 10 }) },
    { unitPriceVnd: 8000, validDays: 90, maxQuantity: 10 });
});

test("extra uses check out with the chosen provider and ETH needs no SePay form", async () => {
  const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../services/membership.service.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const posts = [], mod = { exports: {} };
  const client = { post: async (url, body) => {
    posts.push([url, body.quantity, body.provider]);
    return { data: { result: { orderId: "o1", amountVnd: 24000, provider: body.provider } } };
  } };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(
    (name) => (name === "@/lib/axios-client" ? { __esModule: true, default: client } : lib), mod, mod.exports);
  const checkout = await mod.exports.default.checkoutAddon(3, "ETH");
  assert.equal(JSON.stringify(posts), JSON.stringify([["/api/v1/membership/addons/checkout", 3, "ETH"]]));
  assert.equal(lib.validateCheckoutResponse(checkout, "ETH").valid, true);
  assert.equal(lib.validateCheckoutResponse(checkout, "SEPAY").valid, false);
  assert.equal(lib.MEMBERSHIP_PAYMENT_PROVIDERS.map((p) => p.code).join(), "SEPAY,ETH");
});
