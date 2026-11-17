/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TSX component regression test. */
const { test } = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript"), React = require("react");

function load(file, resolve = require) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(resolve, mod, mod.exports);
  return mod.exports;
}
const history = load("lib/contract-document-history.ts");
function nodes(node, predicate, found = []) {
  if (Array.isArray(node)) node.forEach(child => nodes(child, predicate, found));
  else if (node && typeof node === "object") {
    if (predicate(node)) found.push(node);
    nodes(node.props?.children, predicate, found);
  }
  return found;
}

function fixture(getEffectiveDocument, agreedEarlyEndExclusive = "2026-12-17") {
  let cursor = 0, slots = [], effects = [], calls = 0;
  const react = { ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useEffect(effect) { effects.push(effect); },
  };
  const section = load("components/contract/detail/ContractDocumentSection.tsx", name => {
    if (name === "react") return react;
    if (name === "@/services/contract.service") return { contractService: { getEffectiveDocument: id => { calls++; return getEffectiveDocument(id); } } };
    if (name === "@/lib/contract-document-history") return history;
    if (name === "@/lib/contract-routes") return { contractDetailPath: () => "/contracts" };
    if (name === "@/lib/contract-blockchain-proof") return { supportsContractProof: () => false };
    if (name === "@/services/deposit-agreement.service") return { depositAgreementService: {} };
    if (name === "./ContractAmendmentWorkspace") return { useAmendmentWorkspace: () => null };
    if (name === "./ContractAmendmentPanel") return { AmendmentComparisonTable: () => null };
    if (name === "./ContractPdfViewerModal") return { default: () => null };
    if (name === "./ContractBlockchainProof") return { default: function BlockchainProof() { return null; } };
    if (name === "next/link") return { default: "a" };
    return require(name);
  }).default;
  const original = { id: "original", contractId: "root", revisionId: "root-rev", purpose: "SIGNED_FINAL", documentType: "PDF", status: "READY", storageObjectId: "root-file" };
  const contract = { id: "root", rentalRequestId: "rental", currentRevisionId: "root-rev", signedAt: "2026-11-17T00:00:00Z", status: "ACTIVE", updatedAt: "2026-11-17T00:00:00Z", agreedEarlyEndExclusive };
  const render = () => { cursor = 0; effects = []; return section({ documents: [original], contract }); };
  return { render, runEffects: () => effects.forEach(effect => effect()), get calls() { return calls; }, original };
}

test("signed early-termination appendix appears beside the preserved original PDF", async () => {
  const appendix = { id: "exit-pdf", contractId: "exit-agreement", revisionId: "exit-rev", purpose: "SIGNED_FINAL", documentType: "PDF", status: "READY", storageObjectId: "exit-file" };
  const f = fixture(async id => { assert.equal(id, "root"); return appendix; });
  f.render(); f.runEffects(); await new Promise(resolve => setImmediate(resolve));
  const tree = f.render();
  const cards = nodes(tree, node => node.type?.name === "DocumentCard");
  assert.deepEqual(cards.map(card => card.props.title), ["Hợp đồng gốc", "Phụ lục chấm dứt sớm"]);
  const files = cards.map(card => nodes(card, node => node.type?.name === "DocumentFiles")[0].props.rows);
  assert.deepEqual(files, [[f.original], [appendix]]);
  assert.deepEqual(nodes(cards[1], node => node.props?.document?.id === appendix.id).map(node => node.props.document), [appendix]);
  assert.equal(f.calls, 1);
});

test("missing appendix PDF shows an error, never substitutes the original PDF", async () => {
  const f = fixture(async () => null);
  f.render(); f.runEffects(); await new Promise(resolve => setImmediate(resolve));
  const card = nodes(f.render(), node => node.type?.name === "DocumentCard" && node.props.title === "Phụ lục chấm dứt sớm")[0];
  assert.ok(card);
  assert.equal(nodes(card, node => node.type?.name === "DocumentFiles").length, 0);
  assert.equal(nodes(card, node => node.props?.document).length, 0);
  assert.equal(nodes(card, node => node.props?.role === "alert").length, 1);
});

test("contracts without an agreed early end do not request or show an appendix", () => {
  const f = fixture(() => assert.fail("unexpected lookup"), null);
  const tree = f.render(); f.runEffects();
  assert.deepEqual(nodes(tree, node => node.type?.name === "DocumentCard").map(card => card.props.title), ["Hợp đồng gốc"]);
  assert.equal(f.calls, 0);
});
