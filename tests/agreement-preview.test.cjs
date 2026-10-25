const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`)(name => dependencies[name] ?? require(name), mod, mod.exports);
  return mod.exports;
}
const history = load("lib/contract-document-history.ts");
const { loadAgreementPreview } = load("lib/agreement-preview.ts", { "@/lib/contract-document-history": history });
const lease = { id: "lease", currentRevisionId: "current", status: "DRAFT", depositAgreementContractId: "deposit" };
const deposit = { id: "deposit", agreementKind: "DEPOSIT", currentRevisionId: "deposit-rev", status: "ACTIVE", signedAt: "2026-10-26T01:00:00Z" };
const pdf = (id, revisionId, purpose = "PREVIEW", extra = {}) => ({ id, revisionId, documentType: "PDF", purpose, status: "READY", ...extra });
function api(contracts, files) {
  const calls = [];
  return { calls, async getContract(id) { calls.push(["contract", id]); return contracts[id]; },
    async getDocuments(id) { calls.push(["files", id]); return files[id] ?? []; },
    async getDocument(id) { calls.push(["url", id]); return { id, viewUrl: "https://files.example/fresh" }; } };
}

test("a lease PDF is primary and its fresh URL is requested only on view", async () => {
  const service = api({ lease }, { lease: [pdf("old", "old"), pdf("current-pdf", "current")] });
  const result = await loadAgreementPreview("lease", service);
  assert.equal(result.document.id, "current-pdf"); assert.equal(result.depositFallback, false);
  assert.deepEqual(service.calls, [["contract", "lease"], ["files", "lease"], ["url", "current-pdf"]]);
});
test("before a lease PDF exists the viewer falls back to the signed deposit", async () => {
  const service = api({ lease, deposit }, { deposit: [pdf("signed-deposit", "deposit-rev", "SIGNED_FINAL")] });
  const result = await loadAgreementPreview("lease", service);
  assert.equal(result.document.id, "signed-deposit"); assert.equal(result.depositFallback, true);
});
test("a signed lease never silently shows an unsigned PDF or deposit in place of its final file", async () => {
  const service = api({ lease: { ...lease, status: "ACTIVE" }, deposit }, { lease: [pdf("unsigned", "current")] });
  await assert.rejects(loadAgreementPreview("lease", service), /PDF đã ký chưa sẵn sàng/);
  assert.deepEqual(service.calls, [["contract", "lease"], ["files", "lease"]]);
});
test("an API outage is not mistaken for an absent lease file", async () => {
  const service = api({ lease, deposit }, {}); service.getDocuments = async () => { throw new Error("403 denied"); };
  await assert.rejects(loadAgreementPreview("lease", service), /403 denied/);
  assert.deepEqual(service.calls, [["contract", "lease"]]);
});
test("a partial signature outranks a draft, but another revision or stale file cannot be selected", async () => {
  const service = api({ lease }, { lease: [pdf("stale", "current", "SIGNED_FINAL", { status: "STALE" }),
    pdf("other", "old", "SIGNED_LANDLORD"), pdf("draft", "current"), pdf("landlord", "current", "SIGNED_LANDLORD")] });
  assert.equal((await loadAgreementPreview("lease", service)).document.id, "landlord");
});
test("an ungenerated deposit reports a useful empty state without recursion or rendering writes", async () => {
  const service = api({ deposit: { ...deposit, status: "DRAFT", signedAt: null } }, {});
  await assert.rejects(loadAgreementPreview("deposit", service), /PDF chưa sẵn sàng/);
  assert.deepEqual(service.calls, [["contract", "deposit"], ["files", "deposit"]]);
});

const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const Actions = load("components/contract/AgreementDocumentActions.tsx", {
  "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
  "@/services/contract.service": { contractService: {} }, "@/lib/contract-routes": { contractDetailPath: (role, id) => `/${role}/${id}` },
  "@/lib/agreement-preview": { loadAgreementPreview }, "@/utils/apiError": { getApiErrorMessage: String },
  "./detail/ContractPdfViewerModal": { default: () => null },
}).default;
test("deposit cards expose preview and signing directly to either party", () => {
  for (const perspective of ["landlord", "tenant"]) {
    const html = renderToStaticMarkup(React.createElement(Actions, { contract: { ...deposit, status: "DRAFT" }, perspective }));
    assert.match(html, /Xem HĐ cọc/); assert.match(html, /Ký \/ theo dõi HĐ cọc/); assert.match(html, new RegExp(`/${perspective}/deposit`));
    assert.doesNotMatch(html, /target="_blank"/);
  }
});
test("lease cards retain a separate deposit preview while lease details can show only that action", () => {
  const both = renderToStaticMarkup(React.createElement(Actions, { contract: lease, perspective: "tenant" }));
  assert.match(both, /Xem HĐ thuê/); assert.match(both, /Xem HĐ cọc/);
  const secondary = renderToStaticMarkup(React.createElement(Actions, { contract: lease, perspective: "tenant", showPrimary: false, showDetails: false }));
  assert.match(secondary, /Xem HĐ cọc/); assert.doesNotMatch(secondary, /Xem HĐ thuê|Chi tiết/);
});
