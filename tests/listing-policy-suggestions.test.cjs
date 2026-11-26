/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness with isolated TS module loading. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const data = require("../data/listing-policy-suggestions.json");

function load(file) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const resolve = (name) => {
    if (name === "@/data/listing-policy-suggestions.json") return data;
    if (name === "@/lib/listing-policy-suggestions") return lib;
    if (name === "@/types/listing-policy.type") return load("types/listing-policy.type.ts");
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(resolve, mod, mod.exports);
  return mod.exports;
}
const lib = load("lib/listing-policy-suggestions.ts");
const { canReplacePolicyText, selectPermission, swapPolicySuggestions } = lib;
const Fields = load("components/listing/ListingPolicyFields.tsx").default;

// Mirrors ListingPolicyCatalog.java in hs-listing-service.
const ALL = ["HOUSE", "APARTMENT", "ROOM"];
const CATALOG = {
  petPolicy: ["PERMISSION", ALL],
  smokingPolicy: ["PERMISSION", ALL],
  subleasePolicy: ["PERMISSION", ALL],
  overnightGuestPolicy: ["PERMISSION", ALL],
  alterationsPolicy: ["PERMISSION", ["HOUSE"]],
  propertyInspectionNotice: ["INTEGER", ALL],
  noticeDaysBeforeTermination: ["INTEGER", ALL],
  depositRefundDays: ["INTEGER", ALL],
  buildingRulesPolicy: ["TEXT", ["APARTMENT"]],
  sharedAmenitiesPolicy: ["TEXT", ["APARTMENT", "ROOM"]],
  quietHoursPolicy: ["TEXT", ["ROOM"]],
};
const KEYS = { PERMISSION: ["ALLOWED", "NOT_ALLOWED", "APPROVAL_REQUIRED"], INTEGER: ["note"], TEXT: ["value"] };

test("JSON covers exactly the category x code matrix within limits", () => {
  assert.deepEqual(Object.keys(data).sort(), [...ALL].sort());
  for (const category of ALL) {
    const codes = Object.keys(CATALOG).filter((code) => CATALOG[code][1].includes(category));
    assert.deepEqual(Object.keys(data[category]).sort(), codes.sort(), category);
    for (const code of codes) {
      const type = CATALOG[code][0];
      assert.deepEqual(Object.keys(data[category][code]), KEYS[type], `${category}.${code}`);
      for (const text of Object.values(data[category][code])) {
        assert.ok(text && text === text.trim() && text.length <= (type === "TEXT" ? 450 : 250), `${category}.${code}: ${text.length}`);
        if (type === "INTEGER") assert.doesNotMatch(text, /\d/);
      }
    }
  }
});

test("permission selection fills, replaces and clears suggestions but keeps custom text", () => {
  const pick = (note, value, category = "HOUSE") => selectPermission({ code: "petPolicy", value: "", note }, value, category).note;
  assert.equal(pick("", "ALLOWED"), data.HOUSE.petPolicy.ALLOWED);
  assert.equal(pick("  \n", "ALLOWED"), data.HOUSE.petPolicy.ALLOWED);
  assert.equal(pick(data.ROOM.petPolicy.ALLOWED, "NOT_ALLOWED"), data.HOUSE.petPolicy.NOT_ALLOWED);
  assert.equal(pick(data.HOUSE.petPolicy.ALLOWED, ""), "");
  assert.equal(pick(data.HOUSE.petPolicy.ALLOWED, "UNKNOWN"), "");
  assert.equal(pick("", "ALLOWED", "VILLA"), "");
  assert.equal(pick("Chỉ nuôi mèo", "NOT_ALLOWED"), "Chỉ nuôi mèo");
  assert.equal(pick("Chỉ nuôi mèo", ""), "Chỉ nuôi mèo");
  assert.equal(canReplacePolicyText("petPolicy", data.HOUSE.petPolicy.ALLOWED + " Thêm."), false);
  assert.equal(canReplacePolicyText("smokingPolicy", data.HOUSE.petPolicy.ALLOWED), false);
});

test("category change swaps only untouched suggestions", () => {
  const rows = [
    { code: "petPolicy", value: "ALLOWED", note: data.HOUSE.petPolicy.ALLOWED },
    { code: "smokingPolicy", value: "ALLOWED", note: "Tự viết" },
    { code: "subleasePolicy", value: "ALLOWED", note: "" },
    { code: "depositRefundDays", value: "7", note: data.HOUSE.depositRefundDays.note },
    { code: "sharedAmenitiesPolicy", value: data.APARTMENT.sharedAmenitiesPolicy.value, note: "" },
    { code: "alterationsPolicy", value: "ALLOWED", note: data.HOUSE.alterationsPolicy.ALLOWED },
    { code: "unknown", value: "x", note: "y" },
  ];
  assert.deepEqual(swapPolicySuggestions(rows, "ROOM"), [
    { ...rows[0], note: data.ROOM.petPolicy.ALLOWED },
    rows[1],
    rows[2],
    { ...rows[3], note: data.ROOM.depositRefundDays.note },
    { ...rows[4], value: data.ROOM.sharedAmenitiesPolicy.value },
    rows[5],
    rows[6],
  ]);
});

test("rendering saved values changes nothing; template button only when safe", () => {
  const def = (code, valueType) => ({ code, label: code, valueType, required: false, sortOrder: 1 });
  const definitions = [def("petPolicy", "PERMISSION"), def("otherNumber", "INTEGER"), def("depositRefundDays", "INTEGER"), def("quietHoursPolicy", "TEXT"), def("unknown", "TEXT")];
  const buttons = (values) => {
    const html = renderToStaticMarkup(React.createElement(Fields, {
      category: "ROOM", definitions, values, onChange: () => assert.fail("onChange on load"),
    }));
    return [...html.matchAll(/aria-label="Dùng mẫu gợi ý cho (\w+)"/g)].map((m) => m[1]);
  };
  assert.deepEqual(buttons([{ code: "petPolicy", value: "ALLOWED", note: "" }]), ["quietHoursPolicy"]);
  assert.deepEqual(buttons([
    { code: "depositRefundDays", value: "7", note: data.ROOM.depositRefundDays.note },
    { code: "quietHoursPolicy", value: "Tự viết", note: "" },
  ]), []);
  assert.deepEqual(buttons([{ code: "depositRefundDays", value: "7", note: data.HOUSE.depositRefundDays.note }]),
    ["quietHoursPolicy"]);
});

test("new listing: unanswered permissions default to ALLOWED; touched rows and non-permission fields stay", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "../lib/listing-policy-suggestions.ts"), "utf8");
  const ts = require("typescript"), vm = require("node:vm");
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: 1, target: 7, esModuleInterop: true } }).outputText,
    { module: mod, exports: mod.exports, require: () => require("../data/listing-policy-suggestions.json") });
  const defs = [{ code: "petPolicy", valueType: "PERMISSION" }, { code: "smokingPolicy", valueType: "PERMISSION" }, { code: "depositRefundDays", valueType: "INTEGER" }];
  const cleared = { code: "smokingPolicy", value: "", note: "" };
  const out = mod.exports.withDefaultSuggestions([cleared], defs, "HOUSE");
  assert.equal(out.length, 2);
  assert.equal(out[0], cleared);
  assert.equal(out[1].value, "ALLOWED");
  assert.equal(out[1].note, require("../data/listing-policy-suggestions.json").HOUSE.petPolicy.ALLOWED);
  assert.equal(mod.exports.withDefaultSuggestions(out, defs, "HOUSE"), out);
});

test("system rules: fixed values override saved ones and render without inputs", () => {
  const defs = ["propertyInspectionNotice", "noticeDaysBeforeTermination", "depositRefundDays"]
    .map((code) => ({ code, label: code, valueType: "INTEGER", unitLabel: "u", required: true, sortOrder: 1 }));
  const saved = [{ code: "depositRefundDays", value: "7", note: "cũ" }, { code: "petPolicy", value: "ALLOWED", note: "giữ" }];
  const out = lib.withSystemRules(saved, defs, "ROOM");
  assert.deepEqual(out.map((r) => [r.code, r.value]), [["petPolicy", "ALLOWED"], ["propertyInspectionNotice", "24"], ["noticeDaysBeforeTermination", "30"], ["depositRefundDays", "15"]]);
  assert.equal(out[3].note, data.ROOM.depositRefundDays.note);
  assert.equal(lib.withSystemRules(saved, [], "ROOM"), saved);
  const html = renderToStaticMarkup(React.createElement(Fields, { category: "ROOM", definitions: defs, values: saved, onChange: () => assert.fail("onChange") }));
  assert.doesNotMatch(html, /<(input|textarea|select|button)/);
  assert.match(html, /15 u/);
  assert.doesNotMatch(html, /cũ/);
});

test("text rules are prefilled and no suggestion names facilities a property may not have", () => {
  const defs = [{ code: "quietHoursPolicy", valueType: "TEXT" }, { code: "unknown", valueType: "TEXT" }];
  assert.deepEqual(lib.withDefaultSuggestions([], defs, "ROOM"), [{ code: "quietHoursPolicy", value: data.ROOM.quietHoursPolicy.value, note: "" }]);
  assert.doesNotMatch(JSON.stringify(data), /gara|sân|ban công|thang máy|hành lang|thẻ ra vào|bãi xe|để xe|gửi xe|máy giặt|bếp|nhà vệ sinh|đóng cổng|chìa khóa/i);
});
