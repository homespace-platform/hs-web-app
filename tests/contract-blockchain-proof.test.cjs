/* eslint-disable @typescript-eslint/no-require-imports -- Isolated component tests use the existing TypeScript transpile harness. */
const { test } = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");

function load(file, resolve = require, extra = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports,${Object.keys(extra).join(",")}){${code}\n})`)(resolve, mod, mod.exports, ...Object.values(extra));
  return mod.exports;
}
const helper = load("lib/contract-blockchain-proof.ts");
const history = load("lib/contract-document-history.ts");
const pdf = { id: "pdf", contractId: "contract", revisionId: "revision", status: "READY", documentType: "PDF", purpose: "SIGNED_FINAL" };
const proof = (status, doc = pdf) => ({ documentId: doc.id, contractId: doc.contractId, revisionId: doc.revisionId, status, chainId: 11155111, registryAddress: "0x" + "1".repeat(40), onChainDocumentId: "0x" + "a".repeat(64), documentHash: "0x" + "b".repeat(64), transactionHash: "0x" + "c".repeat(64) });
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  return Array.isArray(node) ? node.map(text).join(" ") : text(node.props?.children);
}
function nodes(node, predicate, rows = []) {
  if (node && typeof node === "object") {
    if (Array.isArray(node)) node.forEach(n => nodes(n, predicate, rows));
    else { if (predicate(node)) rows.push(node); nodes(node.props?.children, predicate, rows); }
  }
  return rows;
}

function fixture(service, visible = true) {
  service = { checkIntegrity: async id => ({ documentId: id, status: "MATCH", checkedAt: "2026-11-09T00:00:00Z" }), ...service };
  let slots = [], cursor = 0, effects = [], tree, currentKey;
  const timers = new Map(), listeners = new Set();
  const document = { visibilityState: visible ? "visible" : "hidden", addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const react = {
    ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, index) => !Object.is(value, old.deps[index]))) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const component = load("components/contract/detail/ContractBlockchainProof.tsx", name => {
    if (name === "react") return react;
    if (name === "@/services/contract-blockchain.service") return { contractBlockchainService: service };
    if (name === "@/lib/contract-blockchain-proof") return helper;
    if (name === "@/lib/contract-document-history") return history;
    return require(name);
  }, { document, setTimeout: fn => { const id = Symbol(); timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id) }).default;
  const unmount = () => { slots.forEach(slot => slot?.cleanup?.()); slots = []; currentKey = null; };
  return {
    render(doc = pdf) {
      const outer = component({ document: doc });
      if (!outer) { unmount(); tree = null; return tree; }
      if (currentKey !== outer.key) { unmount(); currentKey = outer.key; }
      cursor = 0; effects = []; tree = outer.type(outer.props); effects.forEach(fn => fn()); return tree;
    },
    text: () => text(tree),
    button: label => nodes(tree, n => n.type === "button" && text(n).includes(label))[0],
    choose(file) { nodes(tree, n => n.type === "input")[0].props.onChange({ currentTarget: { files: [file], value: "chosen.pdf" } }); },
    timers,
    tick() { const [id, fn] = timers.entries().next().value; timers.delete(id); fn(); },
    visible(value) { document.visibilityState = value ? "visible" : "hidden"; listeners.forEach(fn => fn()); },
    unmount,
  };
}

test("SHA-256 is computed from exact file bytes; empty and oversized files never upload or allocate their bytes", async () => {
  const file = content => { const bytes = new TextEncoder().encode(content); return { size: bytes.length, arrayBuffer: async () => bytes.buffer }; };
  assert.equal(await helper.hashPdfForProof(file("abc")), "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.notEqual(await helper.hashPdfForProof(file("abc\n")), await helper.hashPdfForProof(file("abc")));
  await assert.rejects(helper.hashPdfForProof({ size: 0, arrayBuffer() { assert.fail("empty file"); } }), /trống/);
  await assert.rejects(helper.hashPdfForProof({ size: 20 * 1024 * 1024 + 1, arrayBuffer() { assert.fail("large file"); } }), /20 MB/);
});

test("explorer URLs only allow a Sepolia transaction hash and scope includes only root leases and child amendments", () => {
  assert.equal(helper.blockchainTransactionUrl(11155111, "0x" + "c".repeat(64)), "https://sepolia.etherscan.io/tx/0x" + "c".repeat(64));
  assert.equal(helper.blockchainTransactionUrl(1, "0x" + "c".repeat(64)), undefined);
  assert.equal(helper.blockchainTransactionUrl(11155111, "javascript:alert(1)"), undefined);
  assert.equal(helper.supportsLeaseProof({}), true);
  assert.equal(helper.supportsLeaseProof({ agreementKind: "LEASE" }), true);
  assert.equal(helper.supportsLeaseProof({ agreementKind: "AMENDMENT", parentContractId: "root" }), true);
  for (const kind of ["DEPOSIT", "RENEWAL", "AMENDMENT", "MOVE_IN"]) assert.equal(helper.supportsLeaseProof({ agreementKind: kind }), false);
  assert.equal(helper.supportsLeaseProof({ parentContractId: "root" }), false);
});

test("actual component polls pending and submitted, then stops after confirmed", async () => {
  const queue = ["PENDING", "SUBMITTED", "CONFIRMED"], calls = [];
  const f = fixture({ getProof: async id => { calls.push(id); return proof(queue.shift()); } });
  f.render(); await flush(); f.render(); assert.match(f.text(), /Đang chờ ghi nhận/); assert.equal(f.timers.size, 1);
  f.tick(); await flush(); f.render(); assert.match(f.text(), /Đang chờ xác nhận/); assert.equal(f.timers.size, 1);
  f.tick(); await flush(); f.render(); assert.match(f.text(), /Đã ghi nhận trên blockchain/); assert.equal(f.timers.size, 0);
  f.visible(false); f.visible(true); await flush(); assert.deepEqual(calls, ["pdf", "pdf", "pdf"]);
  f.unmount();
});

test("hidden tabs pause polling and visibility changes never overlap an in-flight read", async () => {
  const pending = deferred(); let calls = 0;
  const f = fixture({ getProof: async () => { calls++; return pending.promise; } }, false);
  f.render(); assert.equal(calls, 0);
  f.visible(true); f.visible(false); f.visible(true); assert.equal(calls, 1);
  pending.resolve(proof("PENDING")); await flush(); f.render(); assert.equal(f.timers.size, 1);
  f.visible(false); assert.equal(f.timers.size, 0);
  f.visible(true); await flush(); assert.equal(calls, 2);
  f.unmount(); assert.equal(f.timers.size, 0);
});

test("switching documents aborts and ignores the previous proof response", async () => {
  const old = deferred(), calls = [];
  const nextDoc = { ...pdf, id: "new-pdf", revisionId: "new-revision" };
  const f = fixture({ getProof: (id, signal) => { calls.push({ id, signal }); return id === "pdf" ? old.promise : Promise.resolve(proof("CONFIRMED", nextDoc)); } });
  f.render(); f.render(nextDoc); await flush(); f.render(nextDoc);
  assert.equal(calls[0].signal.aborted, true);
  old.resolve(proof("PENDING")); await flush(); f.render(nextDoc);
  assert.match(f.text(), /Đã ghi nhận trên blockchain/); assert.doesNotMatch(f.text(), /Đang chờ ghi nhận/); assert.equal(f.timers.size, 0);
  f.unmount();
});

test("proof identity mismatch is a read error, never another document's confirmed proof", async () => {
  const f = fixture({ getProof: async () => proof("CONFIRMED", { ...pdf, revisionId: "wrong" }) });
  f.render(); await flush(); f.render(); assert.match(f.text(), /Chưa tải được bằng chứng/); assert.doesNotMatch(f.text(), /Đã ghi nhận trên blockchain/);
  f.unmount();
});

test("actual PDF verification sends only SHA-256 and distinguishes mismatch, missing proof and RPC failure", { timeout: 2000 }, async () => {
  let mode = "match", verificationCalled; const requests = [];
  const f = fixture({ getProof: async () => proof("CONFIRMED"), verify: async (id, hash) => {
    requests.push({ id, hash });
    verificationCalled.resolve();
    if (mode === "rpc") throw Object.assign(new Error("Unavailable"), { isAxiosError: true });
    return { ...proof("CONFIRMED"), registered: mode !== "missing", matches: mode === "match" };
  } });
  const bytes = new TextEncoder().encode("abc"), file = { name: "signed.pdf", size: 3, arrayBuffer: async () => bytes.buffer };
  async function choose() { verificationCalled = deferred(); f.choose(file); await verificationCalled.promise; await flush(); f.render(); }
  f.render(); await flush(); f.render(); await choose(); assert.match(f.text(), /Tệp khớp với hash/);
  assert.deepEqual(requests[0], { id: "pdf", hash: "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" });
  mode = "mismatch"; await choose(); assert.match(f.text(), /Tệp không khớp/);
  mode = "missing"; await choose(); assert.match(f.text(), /Chưa tìm thấy proof/); assert.doesNotMatch(f.text(), /Tệp không khớp/);
  mode = "rpc"; await choose(); assert.match(f.text(), /Chưa đối chiếu được với blockchain/); assert.doesNotMatch(f.text(), /Tệp không khớp/);
  f.unmount();
});

test("the dossier places proof next to signed root leases and child amendments only", () => {
  const section = load("components/contract/detail/ContractDocumentSection.tsx", name => {
    if (name === "@/lib/contract-blockchain-proof") return helper;
    if (name === "@/lib/contract-document-history") return history;
    if (name === "@/lib/contract-routes") return { contractDetailPath: () => "/contracts" };
    if (name === "./ContractBlockchainProof") return { default: ({ document }) => React.createElement("span", { "data-proof-document": document.id }) };
    if (name === "./ContractPdfViewerModal") return { default: () => null };
    if (name === "./ContractAmendmentWorkspace") return { useAmendmentWorkspace: () => null };
    if (name === "./ContractAmendmentPanel") return { AmendmentComparisonTable: () => null };
    if (name === "@/services/contract.service") return { contractService: {} };
    if (name === "next/link") return { default: "a" };
    return require(name);
  }).default;
  const html = extra => renderToStaticMarkup(React.createElement(section, { documents: [pdf], contract: { id: "contract", signedAt: "2026-11-08T01:00:00Z", currentRevisionId: "revision", status: "ACTIVE", ...extra } }));
  assert.match(html({}), /data-proof-document="pdf"/);
  assert.match(html({ agreementKind: "AMENDMENT", parentContractId: "root" }), /data-proof-document="pdf"/);
  for (const agreementKind of ["AMENDMENT", "RENEWAL", "DEPOSIT"]) assert.doesNotMatch(html({ agreementKind }), /data-proof-document/);
  assert.doesNotMatch(html({ parentContractId: "root" }), /data-proof-document/);
  assert.doesNotMatch(html({ signedAt: null }), /data-proof-document/);
});

test("stored PDF is checked automatically, without re-reading bytes on each pending proof poll", async () => {
  let reads = 0, confirmed = false;
  const f = fixture({ getProof: async () => proof(confirmed ? "CONFIRMED" : "SUBMITTED"), checkIntegrity: async id => {
    reads++; return { documentId: id, status: confirmed ? "MATCH" : "PENDING", checkedAt: "2026-11-09T00:00:00Z" };
  } });
  f.render(); await flush(); f.render(); await flush(); f.render();
  assert.equal(reads, 1); assert.match(f.text(), /khớp bản lúc ký/);
  f.tick(); await flush(); f.render(); await flush(); f.render(); assert.equal(reads, 1);
  confirmed = true;
  f.tick(); await flush(); f.render(); await flush(); f.render();
  assert.equal(reads, 2); assert.match(f.text(), /PDF đang lưu khớp bản đã ghi nhận/);
  f.unmount();
});

test("confirmed registration and current storage mismatch remain separate; check again can recover", async () => {
  let status = "MISMATCH", reads = 0;
  const f = fixture({ getProof: async () => proof("CONFIRMED"), checkIntegrity: async id => {
    reads++; return { documentId: id, status, checkedAt: "2026-11-09T00:00:00Z" };
  } });
  f.render(); await flush(); f.render(); await flush(); f.render();
  assert.match(f.text(), /Đã ghi nhận trên blockchain/); assert.match(f.text(), /PDF đang lưu không khớp/);
  status = "MATCH"; f.button("Kiểm tra lại").props.onClick(); f.render(); await flush(); f.render();
  assert.equal(reads, 2); assert.match(f.text(), /PDF đang lưu khớp/); assert.doesNotMatch(f.text(), /PDF đang lưu không khớp/);
  f.unmount();
});

test("a stale integrity response is aborted on document change and RPC failures are not mismatches", async () => {
  const old = deferred(), calls = [], next = { ...pdf, id: "new-pdf", revisionId: "new-rev" };
  const f = fixture({ getProof: async id => proof("CONFIRMED", id === pdf.id ? pdf : next), checkIntegrity: async (id, signal) => {
    calls.push({ id, signal });
    if (id === pdf.id) return old.promise;
    throw new Error("RPC unavailable");
  } });
  f.render(); await flush(); f.render();
  f.render(next); await flush(); f.render(next); await flush(); f.render(next);
  assert.equal(calls[0].signal.aborted, true);
  old.resolve({ documentId: pdf.id, status: "MISMATCH", checkedAt: "2026-11-09T00:00:00Z" });
  await flush(); f.render(next);
  assert.match(f.text(), /Chưa kiểm tra được PDF đang lưu/); assert.doesNotMatch(f.text(), /PDF đang lưu không khớp/);
  f.unmount();
});
