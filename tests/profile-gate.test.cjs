/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript helper test. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const moduleRef = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)((name) => mocks[name] ?? require(name), moduleRef, moduleRef.exports);
  return moduleRef.exports;
}

const permissions = load("lib/permissions.ts");
const gate = load("lib/profile-gate.ts", { "@/lib/permissions": permissions });
const { PERMISSIONS, FEATURE_LOCKED_MESSAGE } = permissions;
const { normalizeOnboardingStatus, getGateLock, missingItems, isProfileIncomplete, profileGateHref, isKycChangeType } = gate;

const ALL_STEPS = ["PROFILE", "ADDRESS", "PASSWORD", "BANK_ACCOUNT"];

test("new backend fields are used as sent, in canonical order, unknown values dropped", () => {
  const state = normalizeOnboardingStatus({ passwordSet: false, missingRequirements: ["KYC", "ADDRESS", "BOGUS"], serviceReady: false, completedSteps: ["PASSWORD"] });
  assert.deepEqual(state, { passwordSet: false, missing: ["ADDRESS", "KYC"], serviceReady: false });
  assert.equal(normalizeOnboardingStatus({ passwordSet: true, missingRequirements: [], serviceReady: true }).serviceReady, true);
});

test("old backend fallback derives password and missing steps and never blocks on KYC", () => {
  const legacy = normalizeOnboardingStatus({ requiredSteps: ALL_STEPS, completedSteps: ["PROFILE", "PASSWORD"] });
  assert.deepEqual(legacy, { passwordSet: true, missing: ["ADDRESS", "BANK_ACCOUNT"], serviceReady: false });
  const noPassword = normalizeOnboardingStatus({ requiredSteps: ALL_STEPS, completedSteps: ALL_STEPS.filter((s) => s !== "PASSWORD") });
  assert.deepEqual(noPassword, { passwordSet: false, missing: [], serviceReady: true });
  assert.deepEqual(normalizeOnboardingStatus({ requiredSteps: [...ALL_STEPS, "KYC"], completedSteps: [] }).missing, ["PROFILE", "ADDRESS", "BANK_ACCOUNT"]);
});

test("banner items map each requirement to its label and settings section", () => {
  assert.deepEqual(missingItems(["KYC", "PROFILE", "BANK_ACCOUNT", "ADDRESS"]).map(({ label, href }) => [label, href]), [
    ["Thông tin cá nhân", "/settings/profile"],
    ["Địa chỉ", "/settings/profile#address"],
    ["Tài khoản ngân hàng", "/settings/bank-accounts"],
    ["Xác minh danh tính (KYC)", "/kyc"],
  ]);
  assert.deepEqual(missingItems([]), []);
});

test("gate lock: permission message wins, profile lock lists missing items, nothing locks when ready", () => {
  const incomplete = { ready: false, missing: ["PROFILE", "KYC"] };
  const ready = { ready: true, missing: [] };
  assert.equal(getGateLock(PERMISSIONS.LISTING_POST, true, ready), undefined);
  assert.equal(getGateLock(PERMISSIONS.LISTING_POST, true, incomplete), "Cần cập nhật: Thông tin cá nhân, Xác minh danh tính (KYC)");
  assert.equal(getGateLock(PERMISSIONS.LISTING_POST, false, incomplete), FEATURE_LOCKED_MESSAGE);
  assert.equal(getGateLock(PERMISSIONS.LISTING_POST, false, ready), FEATURE_LOCKED_MESSAGE);
  assert.equal(getGateLock(PERMISSIONS.LISTING_POST, true, { ready: false, missing: [] }), "Cần cập nhật: hồ sơ");
});

test("favorites and eKYC start stay usable on an incomplete profile but still honor the permission lock", () => {
  const incomplete = { ready: false, missing: ["PROFILE"] };
  for (const code of [PERMISSIONS.FAVORITE_USE, PERMISSIONS.KYC_SUBMIT]) {
    assert.equal(getGateLock(code, true, incomplete), undefined);
    assert.equal(getGateLock(code, false, incomplete), FEATURE_LOCKED_MESSAGE);
  }
  for (const code of Object.values(PERMISSIONS).filter((c) => c !== "FAVORITE_USE" && c !== "KYC_SUBMIT"))
    assert.match(getGateLock(code, true, incomplete), /^Cần cập nhật: /, code);
});

test("1010 detection and settings link", () => {
  assert.equal(isProfileIncomplete({ status: 403, data: { code: 1010 } }), true);
  assert.equal(isProfileIncomplete({ status: 403, data: { code: 1009 } }), false);
  assert.equal(isProfileIncomplete({ status: 400, data: { code: 1010 } }), false);
  assert.equal(isProfileIncomplete(undefined), false);
  assert.equal(profileGateHref({ data: { result: { missing: ["BANK_ACCOUNT", "KYC"] } } }), "/settings/bank-accounts");
  assert.equal(profileGateHref({ data: {} }), "/settings/profile");
});

test("KYC change notification types", () => {
  for (const type of ["KYC_VERIFIED", "KYC_REJECTED", "KYC_RETRY_REQUIRED"]) assert.equal(isKycChangeType(type), true);
  assert.equal(isKycChangeType("ACCOUNT_DISABLED"), false);
});
