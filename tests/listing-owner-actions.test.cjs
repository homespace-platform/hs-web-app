const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const moduleExports = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve("../config/listing-status.config.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: moduleExports, exports: moduleExports.exports,
  require: name => name === "@/config/rental-hold.config" ? { RENTAL_HOLD_DURATION_LABEL: "60 phút" } : require(name) });
const actions = (status, expiry) => Array.from(moduleExports.exports.getListingOwnerActions(status, expiry), action => action.targetStatus);
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

test("external rental can be shown within the original publication window and requeued after expiry", () => {
  assert.deepEqual(actions("RENTED_EXTERNALLY", future), ["PUBLISHED"]);
  assert.deepEqual(actions("RENTED_EXTERNALLY", past), ["PENDING_REVIEW"]);
  assert.deepEqual(actions("RENTED_EXTERNALLY", null), ["PENDING_REVIEW"]);
});
test("hidden listing retains existing show/requeue rules", () => {
  assert.deepEqual(actions("HIDDEN", future), ["PUBLISHED", "RENTED_EXTERNALLY"]);
  assert.deepEqual(actions("HIDDEN", past), ["RENTED_EXTERNALLY", "PENDING_REVIEW"]);
});
test("rented, reserved and pending listings have no manual publication action", () => {
  for (const status of ["RENTED", "RESERVED", "PENDING_REVIEW", "VIOLATION"]) {
    assert.deepEqual(actions(status, future), []);
    assert.deepEqual(actions(status, past), []);
  }
});
test("rejected and expired listings requeue for review without direct publication", () => {
  for (const status of ["REJECTED", "EXPIRED"]) assert.deepEqual(actions(status, past), ["PENDING_REVIEW"]);
});
