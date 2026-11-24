/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixtures load CommonJS modules. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  vm.runInThisContext(`(function(module,exports){${output}\n})`)(mod, mod.exports);
  return mod.exports;
}
const { deriveNextStep } = load("components/contract/page/nextStep.ts");
const { leaseTimeline } = load("components/contract/page/timeline.ts");

const bill = (status, extra = {}) => ({ id: "b" + status, periodIndex: 2, status, totalAmount: 1000, ...extra });
const lifecycle = (over = {}) => ({ billing: { allPaid: false, bills: [] }, renewals: [], canProposeClosure: false, ...over });
const active = { status: "ACTIVE" };

test("nothing pending on an active contract shows no card", () => {
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: lifecycle() }), null);
});

test("tenant must pay an overdue invoice, landlord only waits for an unpaid one", () => {
  const l = lifecycle({ billing: { bills: [bill("OVERDUE")] } });
  const tenant = deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: l });
  assert.equal(tenant.mine, true); assert.equal(tenant.tone, "danger"); assert.deepEqual(tenant.link, { kind: "invoices", section: "monthly", invoiceId: "bOVERDUE" });
  const unpaid = lifecycle({ billing: { bills: [bill("UNPAID")] } });
  assert.equal(deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: unpaid }).mine, false);
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: unpaid }).mine, true);
});

test("a reported transfer is the landlord's turn, and the tenant waits", () => {
  const l = lifecycle({ billing: { bills: [bill("UNPAID", { paymentStatus: "TRANSFER_REPORTED" })] } });
  assert.equal(deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: l }).mine, true);
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: l }).mine, false);
});

test("expired lease: settlement step links the deposit section and follows the closure state", () => {
  const expired = { status: "EXPIRED" };
  const proposed = lifecycle({ closure: { status: "PROPOSED" } });
  const tenant = deriveNextStep({ role: "TENANT", actorId: "t", contract: expired, lifecycle: proposed });
  assert.equal(tenant.mine, true); assert.deepEqual(tenant.link, { kind: "invoices", section: "deposit" });
  assert.equal(deriveNextStep({ role: "LANDLORD", actorId: "l", contract: expired, lifecycle: proposed }).mine, false);
  const waiting = deriveNextStep({ role: "LANDLORD", actorId: "l", contract: expired, lifecycle: lifecycle({ canProposeClosure: true }) });
  assert.equal(waiting.mine, true);
  assert.equal(deriveNextStep({ role: "LANDLORD", actorId: "l", contract: expired, lifecycle: lifecycle({ closure: { status: "CLOSED" } }) }), null);
});

test("signing of an approved amendment goes to whoever signs next", () => {
  const proposals = [{ id: "p", status: "APPROVED", agreementContractId: "a1", agreementStatus: "TENANT_SIGNATURE_PENDING", recipientId: "t" }];
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: lifecycle(), proposals }).mine, true);
  const landlord = deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: lifecycle(), proposals });
  assert.equal(landlord.mine, false); assert.deepEqual(landlord.link, { kind: "contract", id: "a1" });
});

test("renewal and amendment requests are answered by the recipient in the end tab", () => {
  const renewal = lifecycle({ renewals: [{ status: "REQUESTED" }] });
  assert.deepEqual([deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: renewal }).mine, deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: renewal }).tab], [true, "end"]);
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: renewal }).mine, false);
  const proposals = [{ status: "REQUESTED", recipientId: "t" }];
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: lifecycle(), proposals }).mine, true);
});

test("money in motion outranks pending requests; pre-active contracts get no derived step", () => {
  const l = lifecycle({ billing: { bills: [bill("OVERDUE", { canResolveOverdue: true })] }, renewals: [{ status: "REQUESTED" }] });
  assert.equal(deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: l }).tone, "danger");
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: { status: "DRAFT" }, lifecycle: l }), null);
});

test("an amendment text waiting for a signature points at the sign tab", () => {
  const step = deriveNextStep({ role: "LANDLORD", actorId: "l", contract: { status: "LANDLORD_SIGNATURE_PENDING", parentContractId: "root" } });
  assert.deepEqual([step.mine, step.tab], [true, "sign"]);
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: { status: "LANDLORD_SIGNATURE_PENDING", parentContractId: "root" } }).mine, false);
});

test("timeline marks finished steps and the single current one", () => {
  const steps = leaseTimeline({ status: "DRAFT", createdAt: "2026-01-01", paymentStatus: "UNPAID" }, true);
  assert.deepEqual(steps.map(s => s.done), [true, true, false, false, false, false]);
  assert.deepEqual(steps.filter(s => s.current).map(s => s.label), ["Chủ nhà xác nhận"]);
  const ended = leaseTimeline({ status: "EXPIRED" });
  assert.ok(ended.every(s => s.done) && !ended.some(s => s.current));
});

test("landlord's overdue CTA is hidden only when the server says false (older backends omit it), and targets a single invoice", () => {
  const early = lifecycle({ billing: { bills: [bill("OVERDUE", { canResolveOverdue: false })] } });
  const waiting = deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: early });
  assert.equal(waiting.mine, false); assert.equal(waiting.cta, undefined);
  const ready = lifecycle({ billing: { bills: [bill("OVERDUE", { canResolveOverdue: true })] } });
  const step = deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: ready });
  assert.deepEqual([step.mine, step.cta, step.link.invoiceId], [true, "Xử lý hóa đơn", "bOVERDUE"]);
  const many = lifecycle({ billing: { bills: [bill("OVERDUE", { id: "a", canResolveOverdue: true }), bill("OVERDUE", { id: "b", canResolveOverdue: true })] } });
  assert.equal(deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: many }).link.invoiceId, undefined);
  assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: early }).link.invoiceId, "bOVERDUE");
});

test("an approved renewal whose text is still a draft: landlord prepares it, tenant waits", () => {
  const l = lifecycle({ renewals: [{ status: "APPROVED", agreementContractId: "r1", agreementStatus: "DRAFT" }] });
  const landlord = deriveNextStep({ role: "LANDLORD", actorId: "l", contract: active, lifecycle: l });
  assert.deepEqual([landlord.mine, landlord.title, landlord.tab], [true, "Chuẩn bị văn bản gia hạn để ký", "end"]);
  const tenant = deriveNextStep({ role: "TENANT", actorId: "t", contract: active, lifecycle: l });
  assert.deepEqual([tenant.mine, tenant.tab], [false, "end"]);
});

test("tenant is never told handover is pending: the landlord proposes the deposit refund", () => {
  const expired = { status: "EXPIRED" };
  for (const l of [lifecycle(), lifecycle({ closure: { status: "WAITING_HANDOVER" } })]) {
    const tenant = deriveNextStep({ role: "TENANT", actorId: "t", contract: expired, lifecycle: l });
    assert.deepEqual([tenant.mine, tenant.title], [false, "Chờ chủ nhà lập đề xuất hoàn cọc"]);
    assert.ok(tenant.hint?.includes("hóa đơn chưa hoàn tất"));
    assert.equal(deriveNextStep({ role: "TENANT", actorId: "t", contract: expired, lifecycle: { ...l, billing: { allPaid: true, bills: [] } } }).hint, undefined);
  }
});
