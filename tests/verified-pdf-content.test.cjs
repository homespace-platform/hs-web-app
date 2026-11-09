/* eslint-disable @typescript-eslint/no-require-imports -- Run isolated TS components without starting Next. */
const { test } = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript"), React = require("react");
function load(file, dependencies = {}, globals = {}) {
  const mod = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports,${Object.keys(globals).join(",")}){${source}\n})`)(name => dependencies[name] ?? require(name), mod, mod.exports, ...Object.values(globals));
  return mod.exports;
}
const history = load("lib/contract-document-history.ts");
const finalPdf = { id: "final", contractId: "contract", revisionId: "r1", documentType: "PDF", purpose: "SIGNED_FINAL", status: "READY", fileName: "contract.pdf", viewUrl: "https://unsafe.example/latest" };
const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve)); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function text(node) {
  if (node == null) return "";
  if (typeof node !== "object") return String(node);
  return Array.isArray(node) ? node.map(text).join(" ") : text(node.props?.children);
}
function viewerFixture(service) {
  const slots = [], released = [], created = [];
  let cursor, effects, tree;
  const react = { ...React,
    useRef: () => ({ current: null }), useLayoutEffect() {},
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const Viewer = () => null;
  const Modal = load("components/contract/detail/ContractPdfViewerModal.tsx", {
    react, "react-dom": { createPortal: node => node }, "next/dynamic": { default: () => Viewer },
    "@/lib/contract-document-history": history, "@/services/contract.service": { contractService: service },
  }, { window: { document: { body: {} } }, URL: {
    createObjectURL: bytes => { const url = `blob:verified-${created.length}`; created.push({ bytes, url }); return url; },
    revokeObjectURL: url => released.push(url),
  } }).default;
  return {
    render(doc = finalPdf) {
      cursor = 0; effects = [];
      const outer = Modal({ isOpen: true, onClose() {}, document: doc });
      tree = outer.props.children.type(outer.props.children.props);
      effects.forEach(fn => fn());
      return tree;
    },
    tree: () => tree, text: () => text(tree), created, released,
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test("signed viewer ignores raw URLs and renders only authorized checked PDF bytes", async () => {
  const bytes = new Blob(["%PDF verified"], { type: "application/pdf" }), calls = [];
  const f = viewerFixture({ getDocumentContent: async (id, download, signal) => { calls.push({ id, download, signal }); return bytes; } });
  f.render(); assert.match(f.text(), /Đang kiểm tra/);
  await flush(); const tree = f.render();
  assert.equal(calls.length, 1); assert.equal(calls[0].id, finalPdf.id); assert.equal(calls[0].download, false);
  assert.equal(tree.props.document.viewUrl, "blob:verified-0"); assert.equal(tree.props.document.downloadUrl, "blob:verified-0");
  assert.equal(f.created[0].bytes, bytes);
  f.unmount(); assert.equal(calls[0].signal.aborted, true); assert.deepEqual(f.released, ["blob:verified-0"]);
});

test("viewer blocks errors and stale content; switching PDF aborts old request and releases bytes", async () => {
  const old = deferred(), calls = [], next = { ...finalPdf, id: "new", revisionId: "r2" };
  const f = viewerFixture({ getDocumentContent: async (id, _, signal) => {
    calls.push({ id, signal }); if (id === finalPdf.id) return old.promise;
    throw new Error("Tài liệu không khớp hash đã ghi nhận.");
  } });
  f.render(); f.render(next); await flush(); f.render(next);
  assert.equal(calls[0].signal.aborted, true); assert.match(f.text(), /không khớp/);
  old.resolve(new Blob(["old PDF"])); await flush(); f.render(next);
  assert.equal(f.created.length, 0); assert.match(f.text(), /không khớp/);
  f.unmount();
});

test("verified content routes use auth client, encoded document identity, blob response and cancellation", async () => {
  const calls = [], bytes = new Blob(["PDF"]), signal = new AbortController().signal;
  const { contractService } = load("services/contract.service.ts", {
    "@/lib/axios-client": { default: { get: async (url, options) => { calls.push({ url, options }); return { data: bytes }; } } },
    "@/lib/contract-document-history": history,
  });
  assert.equal(await contractService.getDocumentContent("doc/a", true, signal), bytes);
  assert.equal(calls[0].url, "/api/v1/contracts/documents/doc%2Fa/content");
  assert.deepEqual(calls[0].options.params, { download: true }); assert.equal(calls[0].options.responseType, "blob"); assert.equal(calls[0].options.signal, signal);
});

test("PDF error response surfaces a safe backend reason instead of downloading its JSON body", async () => {
  const { contractService } = load("services/contract.service.ts", {
    "@/lib/axios-client": { default: { get: async () => { throw { response: { data: new Blob([JSON.stringify({ message: "PDF không khớp bản đã ký." })], { type: "application/json" }) } }; } } },
    "@/lib/contract-document-history": history,
  });
  await assert.rejects(contractService.getDocumentContent("doc"), /PDF không khớp bản đã ký/);
});

test("download uses checked bytes and original file name, then releases its object URL", async () => {
  const calls = [], scheduled = [], link = { click() { calls.push(["click", this.href, this.download]); }, remove() { calls.push(["remove"]); } };
  const { contractService } = load("services/contract.service.ts", {
    "@/lib/axios-client": { default: { get: async () => ({ data: new Blob(["verified PDF"]) }) } },
    "@/lib/contract-document-history": history,
  }, { URL: { createObjectURL: () => "blob:checked", revokeObjectURL: value => calls.push(["release", value]) },
    window: { document: { createElement: () => link, body: { appendChild: () => calls.push(["append"]) } } },
    setTimeout: fn => scheduled.push(fn),
  });
  await contractService.downloadDocument(finalPdf);
  assert.deepEqual(calls, [["append"], ["click", "blob:checked", "contract.pdf"], ["remove"]]);
  scheduled[0](); assert.deepEqual(calls.at(-1), ["release", "blob:checked"]);
});
