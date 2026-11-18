/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript helper test. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../lib/permissions.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleRef = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(require, moduleRef, moduleRef.exports);
const { hasPermission, isPermissionDenied, isPermissionChangeType, createThrottle, PERMISSIONS, FEATURE_LOCKED_MESSAGE } = moduleRef.exports;

test("hasPermission hides nothing until permissions are loaded", () => {
  assert.equal(hasPermission(null, PERMISSIONS.LISTING_POST), true);
  assert.equal(hasPermission(undefined, PERMISSIONS.FAVORITE_USE), true);
});

test("hasPermission checks the loaded list, an empty list locks everything", () => {
  assert.equal(hasPermission(["LISTING_POST"], PERMISSIONS.LISTING_POST), true);
  assert.equal(hasPermission(["LISTING_POST"], PERMISSIONS.CONTRACT_SIGN), false);
  assert.equal(hasPermission([], PERMISSIONS.KYC_SUBMIT), false);
});

test("isPermissionDenied matches only 403 JSON bodies with code 1009", () => {
  assert.equal(isPermissionDenied({ status: 403, data: { code: 1009 } }), true);
  assert.equal(isPermissionDenied({ status: 403, data: { code: "1009" } }), true);
  assert.equal(isPermissionDenied({ status: 403, data: { code: 1003 } }), false);
  assert.equal(isPermissionDenied({ status: 403, data: { code: 1001 } }), false);
  assert.equal(isPermissionDenied({ status: 401, data: { code: 1009 } }), false);
  assert.equal(isPermissionDenied({ status: 403, data: new Uint8Array(1) }), false);
  assert.equal(isPermissionDenied({ status: 403, data: null }), false);
  assert.equal(isPermissionDenied(undefined), false);
  assert.match(FEATURE_LOCKED_MESSAGE, /tạm khóa/);
});

test("isPermissionChangeType matches role and role-permission changes only", () => {
  assert.equal(isPermissionChangeType("ROLE_PERMISSIONS_CHANGED"), true);
  assert.equal(isPermissionChangeType("ACCOUNT_ROLE_CHANGED"), true);
  assert.equal(isPermissionChangeType("PLATFORM_ANNOUNCEMENT"), false);
  assert.equal(isPermissionChangeType(undefined), false);
});

test("createThrottle lets one call through per window", () => {
  let now = 1000;
  const allow = createThrottle(5000, () => now);
  assert.equal(allow(), true);
  now += 4999;
  assert.equal(allow(), false);
  now += 1;
  assert.equal(allow(), true);
});

test("fetchMyPermissions ignores stale and post-logout responses", () => {
  const sliceSource = fs.readFileSync(path.join(__dirname, "../features/user/userSlice.ts"), "utf8");
  const sliceCode = ts.transpileModule(sliceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const sliceModule = { exports: {} };
  const req = (id) => (id.startsWith("@/") ? { default: {} } : require(id));
  vm.runInThisContext(`(function(require,module,exports){${sliceCode}
})`)(req, sliceModule, sliceModule.exports);
  const { default: reducer, fetchMyPermissions, userCleared } = sliceModule.exports;
  let state = reducer(undefined, { type: "init" });
  state = reducer(state, fetchMyPermissions.pending("a"));
  state = reducer(state, fetchMyPermissions.pending("b"));
  state = reducer(state, fetchMyPermissions.fulfilled(["OLD"], "a"));
  assert.equal(state.permissions, null);
  state = reducer(state, fetchMyPermissions.fulfilled(["NEW"], "b"));
  assert.deepEqual(state.permissions, ["NEW"]);
  state = reducer(state, fetchMyPermissions.pending("c"));
  state = reducer(state, userCleared());
  state = reducer(state, fetchMyPermissions.fulfilled(["LEAK"], "c"));
  assert.equal(state.permissions, null);
});
