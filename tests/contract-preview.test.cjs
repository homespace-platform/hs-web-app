const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/contract-preview.ts"), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(require, mod, mod.exports);
const { generateContractPreview, isUncertainPreviewError } = mod.exports;
const ready = { id: "pdf", revisionId: "rev", status: "READY", storageObjectId: "storage", documentType: "PDF" };
const wait = async () => {};

test("confirmed success never polls or repeats export", async () => {
  let posts = 0;
  const doc = await generateContractPreview({ trigger: async () => { posts++; return ready; }, status: async () => assert.fail("unexpected poll") },
    "rev", new AbortController().signal, () => assert.fail("unexpected reconciliation"));
  assert.equal(doc, ready); assert.equal(posts, 1);
});
test("gateway timeout reconciles committed PDF with GET only", async () => {
  let posts = 0, reads = 0, notices = 0;
  const result = await generateContractPreview({ trigger: async () => { posts++; throw { response: { status: 503 } }; },
    status: async () => ++reads < 3 ? null : ready }, "rev", new AbortController().signal, () => notices++, { wait });
  assert.equal(result, ready); assert.equal(posts, 1); assert.equal(reads, 3); assert.equal(notices, 1);
});
test("definite validation or render failures surface without polling", async () => {
  for (const status of [400, 403, 409, 422, 500]) {
    const error = { response: { status } };
    await assert.rejects(generateContractPreview({ trigger: async () => { throw error; }, status: async () => assert.fail("must not poll") },
      "rev", new AbortController().signal, () => {}, { wait }), (err) => err === error);
  }
});
test("wrong revision, stale and incomplete files cannot announce success", async () => {
  for (const result of [{ ...ready, revisionId: "old" }, { ...ready, status: "STALE" }, { ...ready, storageObjectId: null }]) {
    let posts = 0;
    assert.equal(await generateContractPreview({ trigger: async () => { posts++; throw { code: "ERR_NETWORK" }; },
      status: async () => result }, "rev", new AbortController().signal, () => {}, { attempts: 2, wait }), null);
    assert.equal(posts, 1);
  }
});
test("an unconfirmed POST body is reconciled instead of falsely announcing success", async () => {
  let reads = 0;
  const result = await generateContractPreview({ trigger: async () => ({ ...ready, revisionId: "old" }),
    status: async () => { reads++; return ready; } }, "rev", new AbortController().signal, () => {}, { wait });
  assert.equal(result, ready); assert.equal(reads, 1);
});
test("transient polling failure can recover, exhausted budget stays unknown", async () => {
  let reads = 0;
  const transport = { trigger: async () => { throw { code: "ECONNABORTED" }; }, status: async () => {
    if (++reads === 1) throw { response: { status: 504 } }; return ready;
  } };
  assert.equal(await generateContractPreview(transport, "rev", new AbortController().signal, () => {}, { wait }), ready);
  assert.equal(await generateContractPreview({ ...transport, status: async () => null }, "rev", new AbortController().signal,
    () => {}, { attempts: 2, wait }), null);
});
test("navigation cancels polling and never sends another POST", async () => {
  const abort = new AbortController(); let posts = 0;
  await assert.rejects(generateContractPreview({ trigger: async () => { posts++; throw { response: { status: 503 } }; },
    status: async () => null }, "rev", abort.signal, () => {}, { wait: async () => { abort.abort(); } }));
  assert.equal(posts, 1);
});
test("network errors are uncertain, arbitrary exceptions are not", () => {
  assert.equal(isUncertainPreviewError(new Error("bug")), false);
  assert.equal(isUncertainPreviewError(null), false);
  assert.equal(isUncertainPreviewError({ code: "ERR_NETWORK" }), true);
});
