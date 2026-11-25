import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, ...globals })(
    name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
function events(extra = {}) {
  const listeners = new Map();
  return { ...extra,
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    fire(name) { for (const fn of listeners.get(name) ?? []) fn(); },
    count() { return [...listeners.values()].reduce((n, set) => n + set.size, 0); },
  };
}
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const OPTIONS = { activeIntervalMs: 15000, blockedIntervalMs: 2000, minGapMs: 1000,
  slowRttMs: 2500, badToBlock: 2, goodToUnblock: 3 };

// results: mảng { ok, rtt } dùng lần lượt; lượt cuối lặp lại mãi.
function fixture(results = [{ ok: true, rtt: 50 }]) {
  let now = 0, id = 0, calls = 0, running = 0, maxRunning = 0;
  const timers = new Map(), fired = [];
  const document = events({ hidden: false });
  const window = events({ dispatchEvent: e => fired.push(e.type) });
  const navigator = { onLine: true };
  const api = load("lib/network-health-monitor.ts", {}, {
    document, window, navigator, Event, Date: { now: () => now },
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; },
    clearTimeout(key) { timers.delete(key); },
  });
  const f = { document, window, navigator, timers, fired,
    get calls() { return calls; }, get maxRunning() { return maxRunning; },
    async advance(ms) {
      const end = now + ms;
      while (true) {
        const entry = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        const [key, timer] = entry; timers.delete(key); now = timer.at; timer.fn(); await settle();
      }
      now = Math.max(now, end); await settle();
    },
  };
  f.monitor = api.createNetworkHealthMonitor(async () => {
    const r = results[Math.min(calls++, results.length - 1)];
    running++; maxRunning = Math.max(maxRunning, running);
    now += r.rtt; await Promise.resolve(); running--;
    return r.ok;
  }, OPTIONS);
  return f;
}
const G = { ok: true, rtt: 0 }, B = { ok: false, rtt: 0 }, SLOW = { ok: true, rtt: 2501 };
const status = f => f.monitor.getSnapshot().status;

test("starts in checking, SSR snapshot is checking, healthy polling every 15s and cleanup", async () => {
  const f = fixture();
  assert.equal(status(f), "checking"); assert.equal(f.monitor.getServerSnapshot().status, "checking");
  const stop = f.monitor.subscribe(() => {}); await settle();
  assert.equal(status(f), "online"); assert.equal(f.calls, 1);
  await f.advance(14999); assert.equal(f.calls, 1);
  await f.advance(1); assert.equal(f.calls, 2);
  stop(); assert.equal(f.timers.size, 0); assert.equal(f.window.count() + f.document.count(), 0);
});

test("offline event and navigator.onLine=false block immediately", async () => {
  const f = fixture(); const stop = f.monitor.subscribe(() => {}); await settle();
  f.navigator.onLine = false; f.window.fire("offline");
  assert.deepEqual({ ...f.monitor.getSnapshot() }, { status: "offline", reason: "offline", goodStreak: 0 });
  stop();
  const g = fixture(); g.navigator.onLine = false;
  const stop2 = g.monitor.subscribe(() => {}); await settle();
  assert.equal(status(g), "offline"); assert.equal(g.calls, 0); stop2();
});

test("blocks after exactly 2 consecutive BAD probes, not after 1; slow RTT counts as BAD", async () => {
  const f = fixture([G, B, G, B, B]); const stop = f.monitor.subscribe(() => {}); await settle();
  await f.advance(15000); assert.equal(status(f), "online"); // 1 BAD
  await f.advance(15000); assert.equal(status(f), "online"); // GOOD resets
  await f.advance(15000); assert.equal(status(f), "online"); // 1 BAD
  await f.advance(15000); assert.equal(status(f), "offline"); assert.equal(f.monitor.getSnapshot().reason, "offline");
  stop();
  const s = fixture([SLOW, SLOW]); const stop2 = s.monitor.subscribe(() => {}); await settle();
  assert.equal(status(s), "checking");
  await s.advance(15000);
  assert.deepEqual({ ...s.monitor.getSnapshot() }, { status: "offline", reason: "weak", goodStreak: 0 });
  stop2();
  const edge = fixture([{ ok: true, rtt: 2500 }]); const stop3 = edge.monitor.subscribe(() => {}); await settle();
  assert.equal(status(edge), "online"); stop3();
});

test("unblocks after 3 consecutive GOOD at 2s cadence, BAD in between resets streak, emits backend check", async () => {
  const f = fixture([B, B, G, G, B, G, G, G]);
  const stop = f.monitor.subscribe(() => {}); await settle();
  await f.advance(15000); assert.equal(status(f), "offline");
  await f.advance(2000); assert.equal(f.monitor.getSnapshot().goodStreak, 1);
  await f.advance(2000); assert.equal(f.monitor.getSnapshot().goodStreak, 2);
  await f.advance(2000); assert.equal(f.monitor.getSnapshot().goodStreak, 0); assert.equal(status(f), "offline");
  await f.advance(2000); await f.advance(2000);
  assert.equal(status(f), "offline"); assert.deepEqual(f.fired, []);
  await f.advance(2000);
  assert.equal(status(f), "online"); assert.deepEqual(f.fired, ["hs:backend-health-check"]);
  stop();
});

test("never unblocks while navigator.onLine === false", async () => {
  const f = fixture([B, B, G]); const stop = f.monitor.subscribe(() => {}); await settle();
  await f.advance(15000); assert.equal(status(f), "offline");
  f.navigator.onLine = false; await f.advance(20000);
  assert.equal(status(f), "offline"); assert.deepEqual(f.fired, []);
  assert.equal(f.calls, 2); // onLine=false: không gọi mạng
  f.navigator.onLine = true; f.window.fire("online"); await settle();
  assert.equal(f.monitor.getSnapshot().goodStreak, 1);
  stop();
});

test("hidden tab pauses checks; visible again checks immediately; no parallel or <1s-spaced probes", async () => {
  const f = fixture(); const stop = f.monitor.subscribe(() => {}); await settle();
  f.document.hidden = true; f.document.fire("visibilitychange");
  await f.advance(60000); assert.equal(f.calls, 1);
  f.document.hidden = false; f.document.fire("visibilitychange"); await settle();
  assert.equal(f.calls, 2);
  for (let i = 0; i < 30; i++) { f.window.fire("hs:network-check"); f.monitor.recheck(); }
  await settle(); assert.equal(f.calls, 2);
  await f.advance(1000); assert.equal(f.calls, 3); assert.equal(f.maxRunning, 1);
  stop();
});

test("in-flight probe is never doubled, late result cannot reopen after offline event", async () => {
  let resolve; let calls = 0;
  const document = events({ hidden: false }), window = events({ dispatchEvent() {} }), navigator = { onLine: true };
  const api = load("lib/network-health-monitor.ts", {}, { document, window, navigator, Event, Date,
    setTimeout, clearTimeout });
  const monitor = api.createNetworkHealthMonitor(() => { calls++; return new Promise(r => { resolve = r; }); },
    { ...OPTIONS, badToBlock: 1 });
  const stop = monitor.subscribe(() => {}); await settle();
  for (let i = 0; i < 10; i++) monitor.recheck();
  assert.equal(calls, 1);
  navigator.onLine = false; window.fire("offline"); resolve(true); await settle();
  assert.equal(monitor.getSnapshot().status, "offline");
  stop();
});

test("gate renders children unless offline and picks copy by reason", () => {
  let snap = { status: "checking", reason: "offline", goodStreak: 0 };
  const Component = load("components/system/NetworkGate.tsx", {
    react: { ...React, useSyncExternalStore: () => snap },
    "@/lib/network-health": { networkHealth: {} },
  }).default;
  const html = () => renderToStaticMarkup(React.createElement(Component, null, React.createElement("div", null, "PRIVATE_APP")));
  assert.ok(html().includes("PRIVATE_APP"));
  snap = { status: "online", reason: "offline", goodStreak: 0 }; assert.ok(html().includes("PRIVATE_APP"));
  snap = { status: "offline", reason: "offline", goodStreak: 0 };
  assert.ok(!html().includes("PRIVATE_APP") && html().includes("Mất kết nối mạng") && html().includes('role="status"'));
  assert.ok(!html().includes("Đang xác nhận"));
  snap = { status: "offline", reason: "weak", goodStreak: 2 };
  assert.ok(html().includes("Kết nối mạng không ổn định") && html().includes("Đang xác nhận kết nối… 2/3"));
});

test("probe hits both third-party URLs with no-cors and passes if either succeeds", async () => {
  const urls = []; let failFirst = true, init;
  const { networkHealth } = load("lib/network-health.ts", {
    "@/lib/network-health-monitor": { createNetworkHealthMonitor: (probe, o) => { assert.deepEqual({ ...o }, OPTIONS); return { probe }; } },
  }, { Promise, AbortController, setTimeout, clearTimeout,
    fetch: async (url, i) => { urls.push(url); init = i; if (failFirst && urls.length === 1) throw Error("x"); } });
  assert.equal(await networkHealth.probe(), true);
  assert.deepEqual(urls, ["https://www.gstatic.com/generate_204", "https://cp.cloudflare.com/generate_204"]);
  assert.equal(init.mode, "no-cors"); assert.equal(init.cache, "no-store");
  const { networkHealth: bad } = load("lib/network-health.ts", {
    "@/lib/network-health-monitor": { createNetworkHealthMonitor: probe => ({ probe }) },
  }, { Promise, AbortController, setTimeout, clearTimeout, fetch: async () => { throw Error("x"); } });
  assert.equal(await bad.probe(), false);
});

test("axios emits hs:network-check only for responseless non-cancel errors", async () => {
  let responseError; const fired = [];
  const axios = { create: () => ({ interceptors: { request: { use() {} },
    response: { use: (_s, fn) => { responseError = fn; } } } }), isCancel: e => e.cancel === true };
  load("lib/axios-client.ts", { axios, sonner: {}, "@/lib/keycloak": {}, "@/features/auth/authStore": {}, "@/lib/permissions": {}, "@/lib/profile-gate": {} },
    { process: { env: {} }, env: {}, window: { dispatchEvent: e => fired.push(e.type) }, Event });
  await assert.rejects(responseError({ config: {} }));
  assert.deepEqual(fired, ["hs:backend-health-check", "hs:network-check"]);
  fired.length = 0;
  await assert.rejects(responseError({ config: {}, cancel: true })); await assert.rejects(responseError({ config: { backendHealthProbe: true } }));
  await assert.rejects(responseError({ config: {}, response: { status: 503 } }));
  assert.deepEqual(fired, ["hs:backend-health-check"]);
});
