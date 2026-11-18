/* eslint-disable @typescript-eslint/no-require-imports -- Node harness loads TS without a browser. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const filename = path.join(__dirname, "..", "lib/chat-presence.ts");
const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", code)(mod, mod.exports, require);
const { mergePresence, formatLastActive, applyPresence } = mod.exports;

const now = Date.parse("2026-11-18T12:00:00Z");
const ago = (ms) => new Date(now - ms).toISOString();

test("mergePresence adds, updates and keeps identity when unchanged", () => {
  const empty = {};
  const a = mergePresence(empty, [{ userId: "u1", online: true, lastSeenAt: null }]);
  assert.deepEqual(a, { u1: { online: true, lastSeenAt: null } });
  assert.deepEqual(empty, {});
  assert.equal(mergePresence(a, [{ userId: "u1", online: true, lastSeenAt: null }]), a);
  const b = mergePresence(a, [{ userId: "u1", online: false, lastSeenAt: "2026-01-01T00:00:00Z" }]);
  assert.equal(b.u1.online, false);
  assert.equal(mergePresence(a, [{ userId: 5, online: true }, { userId: "x" }]), a);
});

test("formatLastActive builds Vietnamese relative labels", () => {
  assert.equal(formatLastActive(null, now), "Ngoại tuyến");
  assert.equal(formatLastActive("garbage", now), "Ngoại tuyến");
  assert.equal(formatLastActive(ago(10_000), now), "Hoạt động 1 phút trước");
  assert.equal(formatLastActive(ago(5 * 60_000), now), "Hoạt động 5 phút trước");
  assert.equal(formatLastActive(ago(3 * 3_600_000), now), "Hoạt động 3 giờ trước");
  assert.match(formatLastActive(ago(3 * 86_400_000), now), /^Hoạt động \d/);
});

test("applyPresence derives isOnline/lastActive and leaves unknown users untouched", () => {
  const conv = { id: "c", userId: "u1", isOnline: false, lastActive: "" };
  assert.equal(applyPresence(conv, undefined), conv);
  const on = applyPresence(conv, { online: true, lastSeenAt: null });
  assert.equal(on.isOnline, true);
  assert.equal(on.lastActive, "");
  const off = applyPresence(conv, { online: false, lastSeenAt: null });
  assert.equal(off.isOnline, false);
  assert.equal(off.lastActive, "Ngoại tuyến");
});
