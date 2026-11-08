/* eslint-disable @typescript-eslint/no-require-imports -- Execute the actual component with isolated hooks and API responses. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../components/contract/detail/SmartCaSignaturePanel.tsx"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const request = status => ({ id: "request", contractId: "contract", revisionId: "revision", signerRole: "LANDLORD", status,
  failureReason: status === "REJECTED" ? "Bạn đã từ chối ký trên ứng dụng VNPT." : status === "EXPIRED" ? "Yêu cầu ký đã hết hạn." : undefined });
const signatureState = active => ({ signatureMode: "SMARTCA", smartCaEnabled: true, activeRequest: active, allRequests: [active] });
const flush = async () => { for (let n = 0; n < 4; n++) await new Promise(resolve => setImmediate(resolve)); };
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  return Array.isArray(node) ? node.map(text).join(" ") : text(node.props?.children);
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.map(item => find(item, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function fixture(refreshSmartCaSignature) {
  const slots = [], timers = new Map();
  let cursor = 0, effects = [], tree;
  let props = { contract: { id: "contract", status: "LANDLORD_SIGNATURE_PENDING" },
    state: signatureState(request("PENDING_USER_CONFIRMATION")), isLandlord: true, isTenant: false,
    hasReadyPdf: true, onUpdated: async () => {} };
  const hooks = { ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback(fn) { return fn; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((item, n) => !Object.is(item, old.deps[n]))) {
      effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    } },
  };
  const imports = name => name === "react" ? hooks
    : name === "@/services/contract.service" ? { contractService: { refreshSmartCaSignature } }
    : name === "sonner" ? { toast: { success() {}, info() {}, warning() {}, error() {} } }
    : name === "@/utils/apiError" ? { getApiErrorMessage: (_, fallback) => fallback } : require(name);
  const window = { setInterval(fn) { const id = Symbol(); timers.set(id, fn); return id; }, clearInterval(id) { timers.delete(id); } };
  const mod = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports,window,document){${code}\n})`)(imports, mod, mod.exports, window, { visibilityState: "visible" });
  return {
    patch(next) { props = { ...props, ...next }; },
    render(next = {}) { props = { ...props, ...next }; cursor = 0; effects = []; tree = mod.exports.default(props); effects.forEach(fn => fn()); return text(tree); },
    button(label) { return find(tree, n => n.type === "button" && text(n).includes(label)); },
    timers,
    tick() { const callback = timers.values().next().value; assert.ok(callback, "a pending request must have a poll timer"); callback(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const outcome of ["REJECTED", "EXPIRED", "CANCELLED"]) {
  test(`poll result ${outcome} reloads the contract, stops waiting and makes landlord signing available again`, async () => {
    let updates = 0;
    const result = { ...request(outcome), failureReason: "Yêu cầu đã từ chối hoặc hết hạn." };
    const f = fixture(async () => result);
    f.render({ onUpdated: async () => { updates++; f.patch({ contract: { id: "contract", status: "DRAFT" }, state: signatureState(result) }); } });
    f.tick(); await flush();
    const html = f.render();
    assert.equal(updates, 1); assert.equal(f.timers.size, 0);
    assert.match(html, /Yêu cầu đã từ chối hoặc hết hạn/);
    assert.doesNotMatch(html, /Đang chờ bạn xác nhận|chờ bên còn lại/);
    assert.ok(f.button("Chọn chứng thư SmartCA")); f.unmount();
  });
}

test("server expiry replaces the previously cached local PENDING result", async () => {
  const f = fixture(async () => request("PENDING_USER_CONFIRMATION"));
  f.render(); f.tick(); await flush(); f.render();
  const html = f.render({ contract: { id: "contract", status: "DRAFT" }, state: signatureState(request("EXPIRED")) });
  assert.match(html, /Yêu cầu ký đã hết hạn/);
  assert.doesNotMatch(html, /Đang chờ bạn xác nhận/); assert.equal(f.timers.size, 0); f.unmount();
});

test("changing contracts cannot reuse the previous contract's local pending request", async () => {
  const f = fixture(async () => request("PENDING_USER_CONFIRMATION"));
  f.render(); f.tick(); await flush(); f.render();
  const html = f.render({ contract: { id: "other-contract", status: "DRAFT" }, state: signatureState(null) });
  assert.doesNotMatch(html, /Đang chờ bạn xác nhận/); assert.ok(f.button("Chọn chứng thư SmartCA")); f.unmount();
});

test("manual refresh and timer cannot overlap the same provider poll", async () => {
  let complete, calls = 0;
  const response = new Promise(resolve => { complete = resolve; });
  const f = fixture(() => { calls++; return response; });
  f.render(); f.tick(); f.tick(); f.button("Kiểm tra ngay").props.onClick();
  assert.equal(calls, 1); complete(request("REJECTED")); await flush();
  assert.doesNotMatch(f.render(), /Đang chờ bạn xác nhận/); f.unmount();
});

test("polling errors stay visible without claiming the user rejected or allowing a new signature", async () => {
  const f = fixture(async () => { throw new Error("provider unavailable"); });
  f.render(); f.tick(); await flush();
  assert.match(f.render(), /Chưa đồng bộ được trạng thái ký số/);
  assert.match(f.render(), /Đang chờ bạn xác nhận/); assert.equal(f.button("Chọn chứng thư SmartCA"), undefined); f.unmount();
});

test("unknown provider outcome blocks tenant signing even while the contract remains tenant-pending", () => {
  const f = fixture(async () => assert.fail("must not poll terminal requests"));
  const html = f.render({ contract: { id: "contract", status: "TENANT_SIGNATURE_PENDING" }, isLandlord: false, isTenant: true,
    state: signatureState({ ...request("FAILED"), failureCode: "PROVIDER_STATE_UNKNOWN", failureReason: "Cần đối soát kết quả ký." }) });
  assert.match(html, /Cần đối soát/); assert.equal(f.button("Chọn chứng thư SmartCA"), undefined);
  assert.equal(f.timers.size, 0); f.unmount();
});

test("terminal result still reports rejection if reloading the parent contract fails", async () => {
  const f = fixture(async () => request("REJECTED"));
  f.render({ onUpdated: async () => { throw new Error("parent reload failed"); } });
  f.tick(); await flush(); const html = f.render();
  assert.match(html, /Bạn đã từ chối ký/); assert.doesNotMatch(html, /Đang chờ bạn xác nhận|chờ bên còn lại/);
  assert.ok(f.button("Tải lại trạng thái hợp đồng")); f.unmount();
});
