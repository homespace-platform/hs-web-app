import { test } from 'node:test';
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
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const REQUEST = '17c9137d-12bd-4903-9a21-865bc46de07a';
const OTHER = '989a2715-26ee-4e4f-9546-545a9d1501ba';
function syncFixture(options = {}) {
  const runtime = hookRuntime(), timers = clock(), notifications = service();
  const document = events({ visibilityState: 'visible' });
  const hook = load('components/rental-request/useRentalRequestSync.ts', {
    react: runtime.hooks, '@/services/notification.service': notifications.notificationService,
  }, { ...timers.globals, document }).useRentalRequestSync;
  let calls = 0;
  const props = { refresh: () => { calls++; }, options };
  runtime.mount(p => { hook(p.refresh, p.options); return null; }, props);
  return { runtime, timers, document, props, notifications: notifications.notificationService, get calls() { return calls; } };
}

test('rental refresh filters ids/types, debounces bursts, handles recovery and cleans up', async () => {
  const f = syncFixture({ requestId: REQUEST });
  f.notifications.notifyRentalRequestChanged(OTHER); f.notifications.notifyListingChanged(REQUEST);
  f.notifications.notifyAppointmentChanged(REQUEST); f.notifications.notifyRemoteChanged();
  await f.timers.advance(500); assert.equal(f.calls, 0);
  for (let i = 0; i < 20; i++) f.notifications.notifyRentalRequestChanged(REQUEST);
  await f.timers.advance(249); assert.equal(f.calls, 0);
  await f.timers.advance(1); assert.equal(f.calls, 1);
  f.notifications.notifyRentalRequestChanged(); await f.timers.advance(250); assert.equal(f.calls, 2);
  f.notifications.notifyRentalRequestChanged(); f.runtime.unmount(); await f.timers.advance(500);
  assert.equal(f.calls, 2); assert.equal(f.document.listenerCount + f.timers.size, 0);
});

test('hidden notifications and poll defer until visible, including a tab hidden during debounce', async () => {
  const f = syncFixture({ pollMs: 1000 });
  f.notifications.notifyRentalRequestChanged(REQUEST);
  f.document.visibilityState = 'hidden'; await f.timers.advance(2000); assert.equal(f.calls, 0);
  for (let i = 0; i < 5; i++) f.notifications.notifyRentalRequestChanged();
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange');
  await f.timers.advance(250); assert.equal(f.calls, 1);
  f.runtime.unmount();
});

test('only one refresh runs at once; a hidden queued refresh waits and a failed call recovers', async () => {
  const f = syncFixture(), first = deferred(); let count = 0;
  f.runtime.update({ ...f.props, refresh: () => { count++; return count === 1 ? first.promise : Promise.reject(new Error('network')); } });
  f.notifications.notifyRentalRequestChanged(); await f.timers.advance(250); assert.equal(count, 1);
  for (let i = 0; i < 10; i++) f.notifications.notifyRentalRequestChanged();
  await f.timers.advance(250); assert.equal(count, 1);
  f.document.visibilityState = 'hidden'; first.resolve(); await f.runtime.settle(); assert.equal(count, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(count, 2);
  f.notifications.notifyRentalRequestChanged(); await f.timers.advance(250); assert.equal(count, 3);
  f.runtime.unmount();
});

function deepFixture(initial = {}) {
  const runtime = hookRuntime(), requests = [], opened = [], logins = [], notices = [];
  let url = new URL(`http://localhost:3000/dashboard/rental-requests?requestId=${REQUEST}&from=notice#review`);
  const location = {};
  for (const field of ['href', 'pathname', 'search', 'hash']) Object.defineProperty(location, field, { get: () => url[field] });
  const window = { location, history: { replaceState(_state, _title, path) { url = new URL(path, url); } } };
  const hook = load('components/rental-request/useRentalRequestDeepLink.ts', {
    react: runtime.hooks, 'next/navigation': { useSearchParams: () => url.searchParams },
    sonner: { toast: { info: message => notices.push(message), error: message => notices.push(message) } },
    '@/services/rental-request.service': { getRequestById(id) { const call = { ...deferred(), id }; requests.push(call); return call.promise; } },
  }, { window }).useRentalRequestDeepLink;
  const props = { initialized: true, authenticated: true, userId: 'owner', mode: 'RECEIVED',
    login: path => logins.push(path), onOpen: value => opened.push(value), ...initial };
  runtime.mount(p => hook(p), props);
  return { runtime, props, requests, opened, notices, logins, get url() { return url; },
    setUrl(path) { url = new URL(path, url); runtime.update(props); },
    detail(overrides = {}) { return { id: REQUEST, ownerId: 'owner', renterId: 'renter', status: 'CANCELLED_BY_OWNER', ...overrides }; } };
}

test('deep link waits for auth then logs in once with full path; anonymous users do no detail fetch', () => {
  const f = deepFixture({ initialized: false, authenticated: false, userId: null });
  assert.equal(f.logins.length + f.requests.length, 0);
  f.props.initialized = true; f.runtime.update(f.props); f.runtime.update(f.props);
  assert.deepEqual(f.logins, [`/dashboard/rental-requests?requestId=${REQUEST}&from=notice#review`]);
  assert.equal(f.requests.length, 0); f.runtime.unmount();
});

test('deep link opens terminal requests by id on both authorized sides and clears only its param', async () => {
  for (const [mode, userId] of [['RECEIVED', 'owner'], ['SENT', 'renter']]) {
    const f = deepFixture({ mode, userId }); assert.equal(f.requests[0].id, REQUEST);
    f.requests[0].resolve(f.detail()); await f.runtime.settle();
    assert.equal(f.opened.at(-1).status, 'CANCELLED_BY_OWNER');
    f.runtime.tree(); assert.equal(f.url.search, '?from=notice'); assert.equal(f.url.hash, '#review');
    f.runtime.update(f.props); f.setUrl(`?requestId=${REQUEST}&from=notice#review`);
    assert.equal(f.requests.length, 2, 'same notification can be reopened'); f.runtime.unmount();
  }
});

test('invalid, inaccessible and wrong-side links never open detail; stale id/account responses ignored', async () => {
  const invalid = deepFixture({ initialized: false }); invalid.setUrl('?requestId=bad&from=notice');
  invalid.props.initialized = true; invalid.runtime.update(invalid.props);
  assert.equal(invalid.requests.length, 0); assert.equal(invalid.url.search, '?from=notice'); invalid.runtime.unmount();
  for (const outcome of [{ ownerId: 'stranger' }, { id: OTHER }, { response: { status: 403 } }, { response: { status: 404 } }, { response: { status: 500 } }]) {
    const f = deepFixture();
    if (outcome.response) f.requests[0].reject(outcome); else f.requests[0].resolve(f.detail(outcome));
    await f.runtime.settle(); assert.equal(f.opened.filter(Boolean).length, 0); assert.equal(f.notices.length, 1);
    assert.equal(f.url.search, '?from=notice'); f.runtime.unmount();
  }
  const f = deepFixture(); const stale = f.requests[0];
  f.setUrl(`?requestId=${OTHER}`); stale.resolve(f.detail()); await f.runtime.settle();
  assert.equal(f.opened.filter(Boolean).length, 0);
  f.props.userId = 'new-owner'; f.runtime.update(f.props);
  f.requests[1].resolve(f.detail({ id: OTHER })); await f.runtime.settle(); assert.equal(f.opened.filter(Boolean).length, 0);
  f.runtime.unmount();
});

test('all 26 rental type tags and recipient labels exist, unknown/prototype names safely fall back', () => {
  const api = service();
  const contract = [
    'RENTAL_REQUEST_SUBMITTED', 'RENTAL_REQUEST_ACCEPTED', 'RENTAL_REQUEST_REJECTED', 'RENTAL_REQUEST_AUTO_REJECTED',
    'RENTAL_REQUEST_CANCELLED', 'RENTAL_REQUEST_EXPIRED', 'RENTAL_HOLD_EXPIRED',
    'RENTAL_CANCELLATION_REQUESTED', 'RENTAL_CANCELLATION_REFUND_PENDING', 'RENTAL_CANCELLATION_REJECTED',
    'RENTAL_CANCELLATION_WITHDRAWN', 'RENTAL_CANCELLATION_DISPUTED',
    'RENTAL_START_CHANGE_REQUESTED', 'RENTAL_START_CHANGE_APPROVED', 'RENTAL_START_CHANGE_REJECTED',
    'RENTAL_START_CHANGE_WITHDRAWN', 'RENTAL_START_CHANGE_EXPIRED',
    'RENTAL_SIGNING_WINDOW_REOPENED', 'RENTAL_HOLD_EXTENDED', 'RENTAL_DEFAULT_NOTICE_ISSUED',
    'RENTAL_DEFAULT_DISPUTED', 'RENTAL_REQUEST_CANCELLED_BY_SYSTEM', 'RENTAL_RESUME_REQUESTED',
    'RENTAL_RESUMED', 'RENTAL_RESUME_REJECTED', 'RENTAL_RESUME_WITHDRAWN',
  ];
  assert.equal(contract.length, 26);
  for (const type of contract) assert.notEqual(api.getNotificationTag({ category: 'RENTAL_REQUEST', type }), 'Yêu cầu thuê', type);
  for (const type of ['unknown', '__proto__', 'constructor']) assert.equal(api.getNotificationTag({ category: 'RENTAL_REQUEST', type }), 'Yêu cầu thuê');
  assert.equal(api.getNotificationRecipientSideLabel({ category: 'RENTAL_REQUEST', metadata: { recipientSide: 'OWNER' } }), 'Vai trò chủ nhà');
  assert.equal(api.getNotificationRecipientSideLabel({ category: 'RENTAL_REQUEST', metadata: { recipientSide: 'RENTER' } }), 'Vai trò người thuê');
  assert.equal(api.withDefaultPreferences([]).find(item => item.category === 'RENTAL_REQUEST').push, true);
});


function transport({ socketEnabled = true, pushFails = false } = {}) {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), handlers = new Map(), auth = { initialized: true, authenticated: true, userId: 'owner' };
  const document = events({ title: 'HomeSpace', visibilityState: 'visible' });
  const window = events({ dispatchEvent() {} });
  const worker = events();
  let pushCallback, stopped = 0, disconnected = 0, connected = 0;
  const socket = { connected: true, on(name, callback) { handlers.set(name, callback); },
    connect() { connected++; return socket; }, disconnect() { disconnected++; return socket; } };
  const Component = load('components/notification/NotificationTransport.tsx', {
    react: runtime.hooks, 'next/link': Link, 'next/navigation': { usePathname: () => '/dashboard/properties' },
    'lucide-react': icons, 'socket.io-client': { io: () => socket }, '@/features/auth/useAuth': { useAuth: () => auth },
    '@/lib/keycloak': { token: 'test-token', updateToken: async () => {} }, '@/services/notification.service': notifications,
    '@/services/notification-push.service': { startPush: callback => { pushCallback = callback; return pushFails ? Promise.reject(new Error('unsupported')) : Promise.resolve(() => { stopped++; }); } },
  }, { ...timers.globals, document, window, navigator: { serviceWorker: worker },
    process: { env: { NEXT_PUBLIC_NOTIFICATION_SOCKET_URL: socketEnabled ? 'http://socket.test' : '' } }, CustomEvent: class {} }).default;
  runtime.mount(Component);
  const signals = [];
  const unsubscribe = notifications.notificationService.subscribe(event => signals.push(event));
  return { runtime, timers, notifications, auth, document, window, worker, signals,
    fire: (name, value) => handlers.get(name)?.(value), push: () => pushCallback(),
    get stopped() { return stopped; }, get disconnected() { return disconnected; }, get connected() { return connected; },
    cleanup() { runtime.unmount(); unsubscribe(); } };
}

test('rental transport signals hidden notices, shows bounded popups and never loops unread/title', async () => {
  const f = transport(); await f.runtime.settle();
  const before = f.notifications.calls.length;
  f.notifications.notificationService.notifyRentalRequestChanged(REQUEST);
  await f.runtime.settle(); assert.equal(f.notifications.calls.length, before);
  const notice = { id: 'rental-1', category: 'RENTAL_REQUEST', type: 'RENTAL_CANCELLATION_REFUND_PENDING',
    title: 'Chờ hoàn tiền', body: 'Mở yêu cầu để xem', priority: 'NORMAL',
    metadata: { requestId: REQUEST, recipientSide: 'RENTER' }, actionPath: `/dashboard/rental-requests/my-requests?requestId=${REQUEST}` };
  f.document.visibilityState = 'hidden'; f.fire('notification:new', notice); await f.runtime.settle();
  assert.equal(f.runtime.tree, null); assert.equal(f.signals.find(e => e.type === 'rental-request-changed' && e.requestId).requestId, REQUEST);
  f.document.visibilityState = 'visible';
  for (let i = 2; i <= 5; i++) f.fire('notification:new', { ...notice, id: `rental-${i}` });
  await f.runtime.settle(); const output = html(f.runtime);
  assert.equal((output.match(/Chờ hoàn tiền/g) || []).length, 6, 'three popups each contain the type tag and title');
  assert.match(output, /fixed bottom-\[.*?\] left-4/); assert.match(output, /my-requests\?requestId=/);
  f.fire('connect'); f.window.fire('focus'); f.push(); f.worker.fire('message', { data: { event: 'notifications.changed' } });
  assert.equal(f.signals.filter(e => e.type === 'rental-request-changed' && !e.requestId).length, 4);
  f.cleanup(); assert.equal(f.document.title, 'HomeSpace'); assert.equal(f.timers.size, 0);
});

function onboardingFixture() {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), calls = [];
  const document = events({ visibilityState: 'visible' });
  const sync = load('components/rental-request/useRentalRequestSync.ts', { react: runtime.hooks,
    '@/services/notification.service': notifications.notificationService }, { ...timers.globals, document });
  const mocks = { react: runtime.hooks, sonner: { toast: { success() {}, error() {} } },
    '@/services/rental-onboarding.service': { rentalOnboardingService: { refresh(id) { const call = { ...deferred(), id }; calls.push(call); return call.promise; } } },
    '@/services/payment-request.service': {}, '@/services/storage.service': {},
    '@/utils/apiError': { getApiErrorMessage: (_error, fallback) => fallback }, './useRentalRequestSync': sync };
  for (const name of ['./RentalPaymentModal', './DepositAgreementPanel', '@/components/payment/PaymentDisputePanel',
    '@/components/payment/PaymentReceiptActions', '@/components/payment/DepositLedgerSummary',
    '@/components/complaint/ComplaintPanel', './RentalWorkflowPanel']) mocks[name] = nullComponent;
  const Component = load('components/rental-request/RentalOnboardingPanel.tsx', mocks, { ...timers.globals, document }).default;
  runtime.mount(Component, { rentalRequestId: REQUEST, isLandlord: false });
  return { runtime, timers, notifications: notifications.notificationService, calls,
    view: () => ({ rentalRequestId: REQUEST, stage: 'AWAITING_INITIAL_PAYMENT', askerRole: 'TENANT',
      canRequestEarlierStart: true, startsOn: '2026-12-01', endExclusive: '2027-12-01',
      serverNow: '2026-11-13T12:00:00Z', payments: [], startChanges: [] }) };
}
function elements(node) {
  if (node == null || typeof node !== 'object') return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(elements)];
}

test('onboarding shares in-flight POST across polling/realtime and preserves typed form state on silent refresh', async () => {
  const f = onboardingFixture(); assert.equal(f.calls.length, 1);
  f.notifications.notifyRentalRequestChanged(REQUEST); await f.timers.advance(250);
  assert.equal(f.calls.length, 1, 'initial POST is shared');
  f.calls[0].resolve(f.view()); await f.runtime.settle();
  const open = elements(f.runtime.tree).find(n => n.type === 'button' && String(n.props.children).includes('bắt đầu hợp đồng sớm'));
  assert.ok(open, 'earlier-start action available'); open.props.onClick(); await f.runtime.settle();
  const inputs = elements(f.runtime.tree).filter(n => n.type === 'input' || n.type === 'textarea');
  assert.equal(inputs.length, 2);
  inputs[0].props.onChange({ target: { value: '2026-11-25' } });
  inputs[1].props.onChange({ target: { value: 'Đang nhập nội dung chưa gửi' } }); await f.runtime.settle();
  f.notifications.notifyRentalRequestChanged(REQUEST); await f.timers.advance(250); assert.equal(f.calls.length, 2);
  await f.timers.advance(15000); assert.equal(f.calls.length, 2, 'poll shares the pending refresh');
  f.calls[1].resolve({ ...f.view(), stage: 'REQUIRES_REVIEW' }); await f.runtime.settle();
  const preserved = elements(f.runtime.tree).filter(n => n.type === 'input' || n.type === 'textarea');
  assert.equal(preserved[0].props.value, '2026-11-25'); assert.equal(preserved[1].props.value, 'Đang nhập nội dung chưa gửi');
  f.runtime.unmount(); assert.equal(f.timers.size, 0);
});

function resourceFixture(detail = false, authOverrides = {}) {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), requests = [];
  const auth = { initialized: true, authenticated: true, userId: 'owner', login() {}, ...authOverrides };
  let conflicts = 0;
  const document = events({ visibilityState: 'visible' });
  const sync = load('components/rental-request/useRentalRequestSync.ts', { react: runtime.hooks,
    '@/services/notification.service': notifications.notificationService }, { ...timers.globals, document });
  const request = () => { const call = deferred(); requests.push(call); return call.promise; };
  const mocks = { react: runtime.hooks, 'next/image': nullComponent, 'next/link': Link, 'lucide-react': icons,
    'next/navigation': { useRouter: () => ({ push() {} }) }, sonner: { toast: { error() {} } },
    '@/features/auth/useAuth': { useAuth: () => auth },
    '@/services/rental-request.service': { getOwnerRequests: request, getRequestById: request, getOwnerConflicts: async () => { conflicts++; return []; } },
    './useRentalRequestSync': sync, './useRentalRequestDeepLink': { useRentalRequestDeepLink: () => () => {} },
    '@/services/contract.service': { contractService: {} }, '@/services/rental-onboarding.service': {},
    '@/services/payment-request.service': {}, '@/services/storage.service': {},
    '@/utils/apiError': {}, '@/config/rental-hold.config': {}, '@/lib/contract-routes': {},
    '@/lib/rental-request-actions': {}, '@/lib/listing-detail-access': {}, '@/lib/rental-deposit-quick-view': {},
    '@/lib/rental-contract-fallback': {}, './rental-request.helper': {}, './rental-request-snapshot.helper': {} };
  for (const name of ['./RentalRequestDetailModal', './RentalRequestAiReviewModal', './RentalContractFallbackButton',
    './RentalPaymentModal', './RentalDepositQuickViewModal', './RentalStartChangeQuickModal',
    '@/components/contract/AgreementDocumentActions', './RentalOnboardingPanel', './EndOfPeriodCharges']) mocks[name] = nullComponent;
  // Keep the actual component hooks and network callbacks; replace only the markup/action tail with state observables.
  const transform = detail
    ? source => source.slice(0, source.indexOf('  if (!isOpen) return null;')) + '  return {detail, loading, error};\n}'
    : source => source.slice(0, source.indexOf('  // Handle Accept')) + '  return {requests, loading, totalElements, fetchRequests};\n}\nexports.View = RentalRequestsManagementView;';
  const exports = load(`components/rental-request/${detail ? 'RentalRequestDetailModal' : 'RentalRequestsManagement'}.tsx`, mocks,
    { ...timers.globals, document, window: timers.globals }, '', transform);
  runtime.mount(detail ? exports.default : exports.View, detail ? { requestId: REQUEST, isOpen: true, mode: 'RECEIVED' } : { mode: 'RECEIVED' });
  return { runtime, timers, requests, auth, get conflicts() { return conflicts; }, notifications: notifications.notificationService };
}

test('newer silent list result cannot be overwritten by a slow foreground result and spinner still clears', async () => {
  const f = resourceFixture(); assert.equal(f.requests.length, 1); assert.equal(f.runtime.tree.loading, true);
  f.notifications.notifyRentalRequestChanged(REQUEST); await f.timers.advance(250); assert.equal(f.requests.length, 2);
  f.requests[1].resolve({ result: [], totalElements: 22, totalPages: 3 }); await f.runtime.settle();
  assert.equal(f.runtime.tree.totalElements, 22); assert.equal(f.runtime.tree.loading, true);
  f.requests[0].resolve({ result: [], totalElements: 11, totalPages: 2 }); await f.runtime.settle();
  assert.equal(f.runtime.tree.totalElements, 22); assert.equal(f.runtime.tree.loading, false); f.runtime.unmount();
});

test('newer rental detail survives a slow initial response and silent refresh does not show a skeleton', async () => {
  const f = resourceFixture(true); assert.equal(f.requests.length, 1);
  f.notifications.notifyRentalRequestChanged(REQUEST); await f.timers.advance(250); assert.equal(f.requests.length, 2);
  const row = { id: REQUEST, ownerId: 'owner', renterId: 'renter', status: 'REJECTED' };
  f.requests[1].resolve({ ...row, title: 'fresh' }); await f.runtime.settle();
  f.requests[0].resolve({ ...row, title: 'stale' }); await f.runtime.settle();
  assert.equal(f.runtime.tree.detail.title, 'fresh'); assert.equal(f.runtime.tree.loading, false);
  f.notifications.notifyRentalRequestChanged(REQUEST); await f.timers.advance(250);
  assert.equal(f.runtime.tree.loading, false); assert.equal(f.runtime.tree.detail.title, 'fresh'); f.runtime.unmount();
});

test('rental management does no list/conflict API calls until auth has initialized and a user is verified', async () => {
  const f = resourceFixture(false, { initialized: false, authenticated: false, userId: null });
  await f.runtime.settle(); assert.equal(f.requests.length + f.conflicts, 0);
  f.auth.initialized = true; f.runtime.update({ mode: 'RECEIVED' }); await f.runtime.settle();
  assert.equal(f.requests.length + f.conflicts, 0);
  f.auth.authenticated = true; f.auth.userId = 'owner'; f.runtime.update({ mode: 'RECEIVED' }); await f.runtime.settle();
  assert.equal(f.requests.length, 1); assert.equal(f.conflicts, 1); f.runtime.unmount();
});
