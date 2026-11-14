import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const nodeRequire = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const compiled = new Map();
const plain = value => JSON.parse(JSON.stringify(value));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function load(file, mocks = {}, globals = {}, expose = '', transform = source => source) {
  const filename = path.join(repoRoot, file);
  const key = filename + expose + transform.toString();
  if (!compiled.has(key)) compiled.set(key, ts.transpileModule(transform(fs.readFileSync(filename, 'utf8')) + expose, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText);
  const moduleRef = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled.get(key)}\n})`, {
    console, URL, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, ...globals,
  }, { filename })(name => Object.hasOwn(mocks, name) ? mocks[name] : nodeRequire(name), moduleRef, moduleRef.exports);
  return moduleRef.exports;
}

// Execute real hook callbacks with explicit render/effect phases and deterministic time.
function hookRuntime() {
  const slots = [];
  let cursor = 0, dirty = false, pending = [], Component, props = {}, tree;
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, next => {
        const value = typeof next === 'function' ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useMemo(create, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) slots[index] = { value: create(), deps };
      return slots[index].value;
    },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useEffect(create, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) pending.push(() => {
        slots[index]?.cleanup?.();
        slots[index] = { deps, cleanup: create() };
      });
    },
  };
  function render(commit = true) {
    cursor = 0; pending = []; dirty = false;
    tree = Component(props);
    if (commit) for (const effect of pending) effect();
    return tree;
  }
  function flush() {
    let count = 0;
    do { render(); assert.ok(++count < 30, 'render/effect loop'); } while (dirty);
    return tree;
  }
  return {
    hooks, get tree() { return tree; },
    mount(component, values = {}) { Component = component; props = values; return flush(); },
    update(values = {}, commit = true) { props = values; return commit ? flush() : render(false); },
    async settle() { for (let i = 0; i < 8; i++) { await Promise.resolve(); if (dirty) flush(); } return tree; },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
function clock() {
  let now = 0, next = 0;
  const jobs = new Map();
  const add = (callback, delay, interval = false) => { const id = ++next; jobs.set(id, { callback, at: now + delay, delay, interval }); return id; };
  return {
    globals: { setTimeout: (callback, delay) => add(callback, delay), clearTimeout: id => jobs.delete(id),
      setInterval: (callback, delay) => add(callback, delay, true), clearInterval: id => jobs.delete(id) },
    get size() { return jobs.size; },
    async advance(ms) {
      const end = now + ms;
      while (true) {
        const found = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!found) break;
        const [id, job] = found; now = job.at; jobs.delete(id);
        if (job.interval) jobs.set(id, { ...job, at: now + job.delay });
        job.callback();
        for (let i = 0; i < 5; i++) await Promise.resolve();
      }
      now = end;
    },
  };
}
function events(extra = {}) {
  const listeners = new Map();
  return { ...extra, addEventListener(name, callback) { const entries = listeners.get(name) ?? new Set(); entries.add(callback); listeners.set(name, entries); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    fire(name, value) { for (const callback of listeners.get(name) ?? []) callback(value); },
    get listenerCount() { return [...listeners.values()].reduce((n, callbacks) => n + callbacks.size, 0); } };
}
function service() {
  const calls = [];
  const api = { get: async url => { calls.push(url); return { data: { result: { count: 2 } } }; } };
  const exports = load('services/notification.service.ts', {
    '@/lib/axios-client': api, '@/types/notification.type': { NOTIFICATION_CATEGORIES: ['LISTING', 'APPOINTMENT', 'RENTAL_REQUEST'] },
  });
  return { __esModule: true, ...exports, calls };
}
const nullComponent = () => null;
const icons = new Proxy({}, { get: () => nullComponent });
const Link = ({ children, ...props }) => React.createElement('a', props, children);
const html = runtime => renderToStaticMarkup(runtime.tree);


export { load, hookRuntime, clock, events, service, deferred, plain, nullComponent, icons, Link, html };
