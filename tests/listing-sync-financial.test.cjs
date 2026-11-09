/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixtures load CommonJS modules. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, dependencies = {}, globals = {}) {
  const fixtureModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve("../" + file), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { module: fixtureModule, exports: fixtureModule.exports,
    require: name => dependencies[name] ?? require(name), structuredClone,
    crypto: { randomUUID: () => "request" }, ...globals });
  return fixtureModule.exports;
}
const charges = (electricity, water) => [
  { chargeType: "ELECTRICITY", name: "Điện", billingMethod: "PER_KWH", unitAmount: electricity, amountAndMethod: `${electricity.toLocaleString("vi-VN")} đ/kWh` },
  { chargeType: "WATER", name: "Nước", billingMethod: "PER_M3", unitAmount: water, amountAndMethod: `${water.toLocaleString("vi-VN")} đ/m³` },
];
const currentTerms = {
  financial: { amountValue: 5000000, amountNumber: "5.000.000 đ", depositAmountValue: 5000000 },
  tenant: { occupantCount: 2 }, landlord: {}, property: { areaText: "40" },
  lease: {}, meters: { electricityInitial: "15", waterInitial: "25" },
  policies: {}, specialTerms: "Điều khoản riêng", charges: charges(2925, 18750), equipments: [], amenities: [],
};
const source = (changes = {}) => ({ sourceVersion: "approved-2", baseRevisionId: "revision", terms: {
  property: { areaText: "45" }, charges: charges(4000, 30000),
  equipments: [], amenities: [], policies: {}, meters: currentTerms.meters,
}, differences: [{ field: "charges.ELECTRICITY", label: "Điện", before: "2.925", after: "4.000" }], financialDifferences: [], ...changes });

function workspace() {
  const states = [], refs = []; let stateIndex = 0, refIndex = 0;
  const fakeReact = { ...React, useState(initial) {
    const index = stateIndex++;
    if (!(index in states)) states[index] = index === 0 ? {
      currentTerms: structuredClone(currentTerms), currentTermsRevisionId: "revision",
      proposals: [], availableDates: ["2026-12-09"],
    } : typeof initial === "function" ? initial() : initial;
    return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
  }, useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
  useEffect() {}, useMemo: fn => fn(), useCallback: fn => fn };
  const Workspace = load("components/contract/detail/ContractAmendmentWorkspace.tsx", {
    react: fakeReact, sonner: { toast: { error() {} } },
    "@/services/contract-amendment.service": { contractAmendmentService: {} },
    "@/services/contract.service": { contractService: {} }, "@/utils/apiError": { getApiErrorMessage: String },
  }, { document: { getElementById: () => null } }).default;
  const render = () => {
    stateIndex = 0; refIndex = 0;
    return Workspace({ contractId: "lease", actorId: "owner", perspective: "landlord", children: null }).props.value;
  };
  render().start();
  return { render };
}

test("listing rate updates classify the amendment as financial without injecting client charge overrides", () => {
  const h = workspace(); h.render().selectListingSync(source());
  const state = h.render(), payload = state.payload(false);
  assert.equal(state.financial, true);
  assert.equal(payload.changes.listingSourceVersion, "approved-2");
  assert.equal(payload.changes.charges, undefined);
  assert.equal(payload.changes.rentAmount, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(state.values.charges)), currentTerms.charges);
  state.selectListingSync(null);
  assert.equal(h.render().financial, false);
  assert.equal(h.render().payload(false).changes.listingSourceVersion, undefined);
});

test("approved rent, deposit, cycle, metering and area changes all select financial effective-date rules", () => {
  for (const field of ["financial.amountValue", "financial.depositAmountValue", "financial.paymentCycle", "meters.waterMeterType", "property.areaText", "charges.WATER"]) {
    const h = workspace();
    h.render().selectListingSync(source({ differences: [{ field }], terms: {} }));
    assert.equal(h.render().financial, true, field);
  }
});

test("nonfinancial updates or protected money warnings do not falsely classify an applied money change", () => {
  const h = workspace();
  h.render().selectListingSync(source({ differences: [{ field: "equipments" }], financialDifferences: [{ field: "financial.amountValue" }] }));
  assert.equal(h.render().financial, false);
});

function chargesMarkup(sync, editing = true) {
  const Component = load("components/contract/detail/ContractChargesSection.tsx", {
    "./ContractAmendmentWorkspace": { useAmendmentWorkspace: () => ({ editing, editingFinancial: false, listingSync: sync, data: { currentTerms } }) },
    "./InlineAmendmentFields": { __esModule: true, default: () => null },
    "./utils": { str: value => String(value ?? "") },
  }).default;
  return renderToStaticMarkup(React.createElement(Component, { charges: currentTerms.charges }));
}
test("the actual amendment fee table displays approved 4000/30000 rather than signed 2925/18750", () => {
  const html = chargesMarkup(source());
  assert.match(html, /4\.000 đ\/kWh/); assert.match(html, /30\.000 đ\/m³/);
  assert.doesNotMatch(html, /2\.925|18\.750/);
  assert.match(chargesMarkup(source(), false), /2\.925 đ\/kWh/);
});
test("zero prices, changed billing methods and removed charges are not replaced by old rows", () => {
  const free = { ...charges(0, 0)[0], billingMethod: "FREE", amountAndMethod: "Miễn phí" };
  assert.match(chargesMarkup(source({ terms: { charges: [free] } })), /Miễn phí/);
  const removed = chargesMarkup(source({ terms: { charges: [] } }));
  assert.doesNotMatch(removed, /2\.925|18\.750|4\.000|30\.000/);
  assert.match(removed, /0 khoản phí/);
});
test("the amendment money summary renders staged approved money while retaining current signed terms outside editing", () => {
  const sync = source({ terms: { financial: { amountNumber: "6.000.000 đ", amountValue: 6000000, depositAmountNumber: "12.000.000 đ", depositAmountValue: 12000000, paymentCycle: "Hàng quý" } } });
  const Component = load("components/contract/detail/ContractFinancialSection.tsx", {
    "./ContractAmendmentWorkspace": { useAmendmentWorkspace: () => ({ editing: true, editingFinancial: false, listingSync: sync, data: { currentTerms } }) },
    "./utils": { isZeroDeposit: value => Number(value) === 0, FieldRow: ({ label, value }) => React.createElement("p", null, label, ": ", String(value ?? "")) },
    "./InlineAmendmentFields": {}, "@/components/ui/vnd-money-input": {}, "./ContractFieldState": {},
  }).default;
  const html = renderToStaticMarkup(React.createElement(Component, { financial: currentTerms.financial }));
  assert.match(html, /6\.000\.000 đ/); assert.match(html, /12\.000\.000 đ/); assert.match(html, /Hàng quý/);
});
