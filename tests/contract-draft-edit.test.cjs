/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixtures load CommonJS modules. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function harness(overrides = {}) {
  const source = fs.readFileSync(require.resolve("../components/contract/ContractDetailView.tsx"), "utf8");
  const ast = ts.createSourceFile("view.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "handleRender") declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration);
  const calls = [], errors = [], saved = [], previews = [], conflicts = [], retries = [];
  const noop = () => {};
  const revision = { id: "reviewed", lease: { durationMonths: 3 }, financial: { depositAmountValue: "4000000" } };
  const context = {
    AbortController, contractId: "contract", revision, reviewDraft: true, reviewLocked: false, draftDirty: true,
    metersDirty: true, termsDirty: true, feeDirty: true,
    electricityInitial: "0", waterInitial: "25", electricityRequired: true, waterRequired: true, isWaterPerPerson: false,
    DRAFT_FORM_ID: "lease-draft-form",
    draftContent: {landlord: {fullName: "Chủ nhà đã sửa"}, tenant: {permanentAddress: "Địa chỉ đã sửa"}},
    listingSyncPreview: null, setListingSyncPreview: noop,
    VIETNAMESE_PHONE_REGEX: /^0(?:3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/,
    draftFields: { additionalTerms: " Nội dung thêm ", feeMode: "FIXED_ONCE", feeAmount: "50000" },
    validateInitialMeterReading: (value, required) => required && !/^\d+(\.\d+)?$/.test(value) ? "Invalid meter" : undefined,
    previewRequest: { current: null },
    setMeterErrors: noop, setFeeError: noop, setSavingDraft: noop, setDraftPolicy: noop,
    setDraftEdits: noop,
    setElectricityInitial: noop, setWaterInitial: noop, setCompleteness: noop, setDocuments: noop,
    setRendering: noop, setReconcilingPreview: noop, setDraftConflict: value => conflicts.push(value),
    setRetryPreview: value => retries.push(value), setRevision: value => saved.push(value),
    setCurrentPreview: value => previews.push(value),
    toast: { success: noop, info: noop, error: value => errors.push(value) },
    getApiErrorMessage: e => e.message,
    window: { scrollTo: noop }, document: { getElementById: () => null },
    generateContractPreview: async (transport, revisionId, signal, _reconciling, options) => {
      calls.push(["match", revisionId, options.requirePdf]);
      return transport.trigger(signal);
    },
  };
  context.contractService = {
    updateRevision: async (id, payload) => {
      calls.push(["save", id, JSON.parse(JSON.stringify(payload))]);
      return { ...revision, id: "saved", meters: payload.meters };
    },
    triggerPreview: async (id, _signal, expected) => {
      calls.push(["preview", id, expected]);
      return { id: "pdf", revisionId: expected };
    },
    getCompleteness: async () => ({ complete: true, revisionId: "saved" }),
    getDocuments: async () => [],
    ...overrides.contractService,
  };
  const {contractService: _ignored, ...settings} = overrides;
  Object.assign(context, settings);
  const compiled = ts.transpileModule(declaration.getText(ast) + ";globalThis.run=handleRender;", {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS},
  }).outputText;
  vm.runInNewContext(compiled, context);
  return { run: context.run, calls, errors, saved, previews, conflicts, retries };
}

test("the single save sends only editable data and then requests a PDF of the saved revision", async () => {
  const h = harness();
  await h.run();
  assert.deepEqual(h.calls, [
    ["save", "contract", {
      baseRevisionId: "reviewed", revisionNote: "Hoàn thiện bản nháp hợp đồng.",
      meters: {electricityInitial: "0", waterInitial: "25"}, additionalTerms: "Nội dung thêm",
      draftContent: {landlord: {fullName: "Chủ nhà đã sửa"}, tenant: {permanentAddress: "Địa chỉ đã sửa"}},
      policies: {latePaymentFeeMode: "FIXED_ONCE", latePaymentFeeAmount: 50000},
    }],
    ["match", "saved", true], ["preview", "contract", "saved"],
  ]);
  assert.equal(h.previews.at(-1).revisionId, "saved");
});

test("saving synchronized data sends only the approved version and then exports the saved revision", async () => {
  const h = harness({ listingSyncPreview: {sourceVersion: "approved-edit"}, draftContent: undefined,
    metersDirty: false, termsDirty: false, feeDirty: false });
  await h.run();
  assert.deepEqual(h.calls, [
    ["save", "contract", {baseRevisionId: "reviewed", revisionNote: "Hoàn thiện bản nháp hợp đồng.",
      listingSourceVersion: "approved-edit"}],
    ["match", "saved", true], ["preview", "contract", "saved"],
  ]);
});

test("the update button saves its explicit source immediately, including when comparison lists are empty", async () => {
  const h = harness({ draftDirty: false, draftContent: undefined, metersDirty: false, termsDirty: false, feeDirty: false });
  await h.run({sourceVersion: "approved-edit", baseRevisionId: "reviewed", differences: [], financialDifferences: []});
  assert.deepEqual(h.calls, [
    ["save", "contract", {baseRevisionId: "reviewed", revisionNote: "Hoàn thiện bản nháp hợp đồng.", listingSourceVersion: "approved-edit"}],
    ["match", "saved", true], ["preview", "contract", "saved"],
  ]);
});

test("one-click sync includes the current unsaved meter, contact and policy inputs", async () => {
  const h = harness(); await h.run({sourceVersion: "approved-edit", baseRevisionId: "reviewed"});
  assert.equal(h.calls[0][2].listingSourceVersion, "approved-edit");
  assert.equal(h.calls[0][2].meters.electricityInitial, "0");
  assert.equal(h.calls[0][2].draftContent.landlord.fullName, "Chủ nhà đã sửa");
  assert.equal(h.calls[0][2].policies.latePaymentFeeAmount, 50000);
});

test("approved utility sync replaces the draft with the saved rates before requesting its exact PDF revision", async () => {
  const requests = [];
  const charges = [{chargeType: "ELECTRICITY", unitAmount: 4000}, {chargeType: "WATER", unitAmount: 30000}];
  const h = harness({draftDirty: false, draftContent: undefined, metersDirty: false, termsDirty: false, feeDirty: false,
    contractService: {updateRevision: async (_id, payload) => {
      requests.push(payload);
      return {id: "approved-rates", charges, meters: {electricityInitial: "0", waterInitial: "25"}};
    }},
  });
  await h.run({sourceVersion: "approved-edit", baseRevisionId: "reviewed", terms: {charges}});
  assert.equal(requests[0].listingSourceVersion, "approved-edit");
  assert.equal(requests[0].charges, undefined);
  assert.deepEqual(h.saved[0].charges, charges);
  assert.deepEqual(h.calls, [["match", "approved-rates", true], ["preview", "contract", "approved-rates"]]);
  assert.equal(h.previews.at(-1).revisionId, "approved-rates");
});

test("an explicit source from another revision cannot save or generate a file", async () => {
  const h = harness(); await h.run({sourceVersion: "approved-edit", baseRevisionId: "stale"});
  assert.deepEqual(h.calls, []); assert.match(h.errors[0], /Phiên bản hợp đồng đã thay đổi/);
});

test("one-click sync still requires complete meter readings before saving the contract", async () => {
  const h = harness({electricityInitial: ""});
  await h.run({sourceVersion: "approved-edit", baseRevisionId: "reviewed"});
  assert.deepEqual(h.calls, []);
});

test("invalid mandatory readings, fees and contact fields stop before save or export", async () => {
  for (const input of [{electricityInitial: "-1"}, {waterInitial: ""}, {draftContent: {tenant: {phone: ""}}},
    {document: {getElementById: () => ({reportValidity: () => false})}}, {
    draftFields: {feeMode: "FIXED_PER_DAY", feeAmount: ""},
  }]) {
    const h = harness(input);
    await h.run();
    assert.deepEqual(h.calls, []);
  }
});

test("water per person does not require or replace a water meter value", async () => {
  const h = harness({ isWaterPerPerson: true, waterInitial: "" });
  await h.run();
  assert.deepEqual(h.calls[0][2].meters, {electricityInitial: "0"});
});

test("failed PDF leaves the saved revision and enables a render-only retry", async () => {
  const h = harness({ contractService: {triggerPreview: async () => { throw new Error("PDF unavailable"); }} });
  await h.run();
  assert.equal(h.saved[0].id, "saved");
  assert.match(h.errors[0], /Đã lưu bản nháp.*PDF unavailable/);
  assert.deepEqual(h.retries, [true]);
  const retry = harness({draftDirty: false, revision: {id: "saved"}});
  await retry.run();
  assert.deepEqual(retry.calls, [["match", "saved", true], ["preview", "contract", "saved"]]);
});

test("a stale save requires reload and cannot export a different tab's revision", async () => {
  const h = harness({contractService: {
    updateRevision: async () => { throw Object.assign(new Error("stale"), {response:{data:{code:6072}}}); },
  }});
  await h.run();
  assert.deepEqual(h.saved, []);
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.conflicts, [true]);
  assert.deepEqual(h.previews, [null]);
});

test("duplicate clicks share the in-flight save and export guard", async () => {
  let release, saves = 0;
  const h = harness({contractService: {
    updateRevision: () => { saves++; return new Promise(resolve => {release = resolve;}); },
  }});
  const first = h.run();
  await h.run();
  assert.equal(saves, 1);
  release({id: "saved"});
  await first;
  assert.deepEqual(h.calls, [["match", "saved", true], ["preview", "contract", "saved"]]);
});
