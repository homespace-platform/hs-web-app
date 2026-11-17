import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lib = 'lib';
const gateFile = 'components/system/BackendHealthGate.tsx';
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL("../" + file, import.meta.url), "utf8")
    .replaceAll("import.meta.env", "env"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    console, ...globals,
  })(name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
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
function fixture(probe = async () => true) {
  let now = 0, id = 0, calls = 0;
  const timers = new Map();
  const document = events({ hidden: false }), window = events(), navigator = { onLine: true };
  const api = load(lib + "/backend-health-monitor.ts", {}, {
    document, window, navigator, Date: { now: () => now },
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; },
    clearTimeout(key) { timers.delete(key); },
  });
  const monitor = api.createBackendHealthMonitor(() => { calls++; return probe(); }, 60000, 10000);
  return { api, monitor, document, window, navigator, timers, get calls() { return calls; },
    async advance(ms) {
      const end = now + ms;
      while (true) {
        const entry = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        const [key, timer] = entry; timers.delete(key); now = timer.at; timer.fn(); await settle();
      }
      now = end; await settle();
    },
  };
}

test("health starts in parallel; all subscribers share one probe and one healthy timer", async () => {
  const f = fixture();
  assert.equal(f.monitor.getSnapshot(), "checking");
  assert.equal(f.calls, 0);
  const stop1 = f.monitor.subscribe(() => {}), stop2 = f.monitor.subscribe(() => {});
  await settle();
  assert.equal(f.calls, 1);
  assert.equal(f.monitor.getSnapshot(), "ready");
  assert.equal(f.timers.size, 1);
  await f.advance(59999); assert.equal(f.calls, 1);
  await f.advance(1); assert.equal(f.calls, 2);
  stop1(); assert.equal(f.timers.size, 1);
  stop2(); assert.equal(f.timers.size, 0);
  assert.equal(f.window.count() + f.document.count(), 0);
});

test("failed checks close the gate and retry at the configured interval until recovery", async () => {
  let ready = false;
  const f = fixture(async () => { if (!ready) throw Error("Core offline"); return true; });
  const stop = f.monitor.subscribe(() => {});
  await settle(); assert.equal(f.monitor.getSnapshot(), "unavailable");
  await f.advance(9999); assert.equal(f.calls, 1);
  ready = true; await f.advance(1);
  assert.equal(f.calls, 2); assert.equal(f.monitor.getSnapshot(), "ready");
  stop();
});

test("StrictMode remount and repeated retry clicks never duplicate an in-flight probe", async () => {
  let resolve;
  const f = fixture(() => new Promise(yes => { resolve = yes; }));
  const stop1 = f.monitor.subscribe(() => {});
  await settle(); stop1();
  const stop2 = f.monitor.subscribe(() => {});
  for (let i = 0; i < 20; i++) f.monitor.recheck();
  await f.advance(10000); assert.equal(f.calls, 1);
  resolve(true); await settle();
  assert.equal(f.monitor.getSnapshot(), "ready"); assert.equal(f.timers.size, 1);
  stop2();
});

test("hidden tabs stop polling and revalidate stale success in the background on return", async () => {
  const f = fixture();
  const stop = f.monitor.subscribe(() => {}); await settle();
  f.document.hidden = true; f.document.fire("visibilitychange");
  await f.advance(120000); assert.equal(f.calls, 1);
  f.document.hidden = false; f.document.fire("visibilitychange");
  assert.equal(f.monitor.getSnapshot(), "ready");
  await settle(); assert.equal(f.calls, 2); assert.equal(f.monitor.getSnapshot(), "ready");
  stop();
});

test("bursts of API failures and retries trigger at most one probe per retry interval", async () => {
  const f = fixture(); const stop = f.monitor.subscribe(() => {}); await settle();
  await f.advance(1000);
  for (let i = 0; i < 50; i++) f.window.fire("hs:backend-health-check");
  await settle(); assert.equal(f.calls, 1); assert.equal(f.timers.size, 1);
  await f.advance(9000); assert.equal(f.calls, 2);
  stop();
});

test("offline state blocks without network polling; online resumes and late success cannot reopen offline", async () => {
  let resolve;
  const f = fixture(() => new Promise(yes => { resolve = yes; }));
  f.navigator.onLine = false;
  const stop = f.monitor.subscribe(() => {}); await settle();
  assert.equal(f.calls, 0); assert.equal(f.monitor.getSnapshot(), "unavailable");
  f.navigator.onLine = true; f.window.fire("online"); await settle(); assert.equal(f.calls, 1);
  f.navigator.onLine = false; f.window.fire("offline"); resolve(true); await settle();
  assert.equal(f.monitor.getSnapshot(), "unavailable"); assert.equal(f.timers.size, 0);
  stop();
});

test("gate allows initial rendering in parallel and blocks only a confirmed outage", () => {
  let status = "checking";
  const Component = load(gateFile, {
    react: { ...React, useSyncExternalStore: () => status },
    "@/lib/backend-health": { backendHealth: {} },
  }).default;
  for (status of ["checking", "unavailable", "ready"]) {
    const html = renderToStaticMarkup(React.createElement(Component, null, React.createElement("div", null, "PRIVATE_APP")));
    assert.equal(html.includes("PRIVATE_APP"), status !== "unavailable");
    if (status === "unavailable") assert.ok(html.includes('role="status"'));
  }
});

test("probe uses Gateway, bounded timeout and accepts only HTTP 200 with UP status", async () => {
  let response = { status: 200, data: { status: "UP" } }, request;
  const { api } = fixture();
  const { backendHealth } = load(lib + "/backend-health.ts", {
    "@/lib/axios-client": { get: async (...args) => { request = args; return response; } },
    "@/lib/backend-health-monitor": { ...api, createBackendHealthMonitor: (probe, poll, retry) => { assert.equal(poll, 60000); assert.equal(retry, 10000); return { probe }; } },
  }, { process: { env: {} }, env: {} });
  assert.equal(await backendHealth.probe(), true);
  assert.equal(request[0], "/api/v1/actuator/health");
  assert.equal(request[1].backendHealthProbe, true); assert.equal(request[1].timeout, 5000);
  for (response of [{ status: 200, data: { status: "DOWN" } }, { status: 503, data: { status: "UP" } },
    { status: 200, data: {} }, { status: 200, data: "<html>login</html>" }]) {
    assert.equal(await backendHealth.probe(), false);
  }
});

test("health probes bypass token refresh and never emit session-expired or recursive health events", async () => {
  let request, responseError, refreshes = 0;
  const fired = [];
  const keycloak = { authenticated: true, updateToken: async () => { refreshes++; }, token: "session-token" };
  const axios = { create: () => ({ interceptors: {
    request: { use: fn => { request = fn; } }, response: { use: (_success, fn) => { responseError = fn; } },
  } }), isCancel: () => false };
  load(lib + "/axios-client.ts", {
    axios, "@/lib/keycloak": keycloak, "@/features/auth/authStore": { clearAuth() { throw Error("unexpected logout"); } },
  }, { process: { env: {} }, env: {}, window: { dispatchEvent: event => fired.push(event.type) }, Event });
  let removed;
  await request({ backendHealthProbe: true, headers: { delete: key => { removed = key; } } });
  assert.equal(removed, "Authorization"); assert.equal(refreshes, 0);
  const error = { config: { backendHealthProbe: true }, response: { status: 401 } };
  await assert.rejects(responseError(error)); assert.deepEqual(fired, []);
  await request({ headers: {} }); assert.equal(refreshes, 1);
  await assert.rejects(responseError({ config: {}, response: { status: 503 } }));
  assert.deepEqual(fired, ["hs:backend-health-check"]);
});
