/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixtures load CommonJS modules. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const tick = () => new Promise(setImmediate);

function fixture(options = {}) {
  const busy = [], messages = [], applied = [], requests = []; let cleanup;
  const fixtureModule = { exports: {} };
  const source = { sourceVersion: "approved", baseRevisionId: "base", terms: {}, differences: [], financialDifferences: [] };
  const dependencies = {
    react: { ...React, useState: () => [false, () => {}], useRef: value => ({ current: value }), useEffect: fn => { cleanup = fn(); } },
    sonner: { toast: { error: message => messages.push(message), info: message => messages.push(message) } },
    "@/utils/apiError": { getApiErrorMessage: error => error.message },
    "@/services/contract.service": { contractService: { previewListingSync: async (...args) => {
      requests.push(args); return options.load ? options.load(...args) : { ...source, ...options.source };
    } } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve("../components/contract/detail/ListingSyncControl.tsx"), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { module: fixtureModule, exports: fixtureModule.exports, AbortController, require: name => dependencies[name] ?? require(name) });
  const tree = fixtureModule.exports.default({ contractId: "contract", baseRevisionId: "base", ...options.props,
    onBusyChange: value => busy.push(value), onSelect: async value => { applied.push(value); await options.apply?.(value); } });
  return { tree, busy, messages, requests, applied, cleanup: () => cleanup(), click: async () => { tree.props.onClick(); await tick(); } };
}
test("one click immediately uses approved source without a dialog or any comparison rows", async () => {
  const f = fixture(); assert.equal(f.tree.type, "button"); await f.click();
  assert.equal(f.requests.length, 1); assert.equal(f.applied.length, 1);
  assert.equal(f.applied[0].sourceVersion, "approved"); assert.deepEqual(f.busy, [true, false]);
});
test("duplicate clicks stay locked until both source loading and save/export have completed", async () => {
  let finish; const f = fixture({ apply: () => new Promise(resolve => { finish = resolve; }) });
  await f.click(); await f.click(); assert.equal(f.requests.length, 1); assert.deepEqual(f.busy, [true]);
  finish(); await tick(); assert.deepEqual(f.busy, [true, false]);
});
test("leaving the page aborts the read and prevents a later save or export callback", async () => {
  let finish; const f = fixture({ load: () => new Promise(resolve => { finish = resolve; }) });
  await f.click(); f.cleanup();
  assert.equal(f.requests[0][1].aborted, true);
  finish({ sourceVersion: "approved", baseRevisionId: "base" }); await tick();
  assert.equal(f.applied.length, 0); assert.deepEqual(f.messages, []);
});
test("a stale contract revision never reaches the mutation callback", async () => {
  const f = fixture({ source: { baseRevisionId: "stale" } }); await f.click();
  assert.equal(f.applied.length, 0); assert.match(f.messages[0], /Phiên bản hợp đồng đã thay đổi/);
  assert.deepEqual(f.busy, [true, false]);
});
test("read errors preserve the form and permit an explicit retry", async () => {
  let tries = 0; const f = fixture({ load: async () => {
    if (!tries++) throw new Error("Không tải được dữ liệu"); return { sourceVersion: "approved", baseRevisionId: "base" };
  } });
  await f.click(); assert.equal(f.applied.length, 0); assert.equal(f.messages.length, 1);
  await f.click(); assert.equal(f.applied.length, 1); assert.equal(f.requests.length, 2);
});
test("disabled controls and missing base revisions do not request source data", async () => {
  for (const props of [{ disabled: true }, { baseRevisionId: undefined }]) {
    const f = fixture({ props }); await f.click(); assert.equal(f.requests.length, 0);
  }
});
test("locked accepted money is explicitly reported while approved applicable data still reaches the sync action", async () => {
  const f = fixture({ source: { financialDifferences: [
    { field: "financial.amountValue", label: "Tiền thuê", before: "5.000.000 đ", after: "6.000.000 đ" },
  ], terms: { charges: [{ chargeType: "ELECTRICITY", unitAmount: 4000 }] } } });
  await f.click();
  assert.equal(f.applied.length, 1);
  assert.equal(f.applied[0].terms.charges[0].unitAmount, 4000);
  assert.match(f.messages[0], /Các khoản đã chốt được giữ nguyên.*Tiền thuê: 5\.000\.000 đ → 6\.000\.000 đ/);
});
test("a protected lease minimum is reported rather than silently claiming every field was replaced", async () => {
  const f = fixture({ source: { leaseMessage: "Mức tối thiểu mới cao hơn thời hạn đã chốt. Cần xử lý bằng thỏa thuận riêng." } });
  await f.click();
  assert.equal(f.applied.length, 1);
  assert.match(f.messages[0], /Mức tối thiểu mới cao hơn thời hạn đã chốt/);
});
