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
function load(file, mocks = {}, globals = {}, expose = '') {
  const filename = path.join(repoRoot, file);
  const key = filename + expose;
  if (!compiled.has(key)) compiled.set(key, ts.transpileModule(fs.readFileSync(filename, 'utf8') + expose, {
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
    '@/lib/axios-client': api, '@/types/notification.type': { NOTIFICATION_CATEGORIES: ['LISTING', 'APPOINTMENT'] },
  });
  return { __esModule: true, ...exports, calls };
}
const nullComponent = () => null;
const icons = new Proxy({}, { get: () => nullComponent });
const Link = ({ children, ...props }) => React.createElement('a', props, children);
const html = runtime => renderToStaticMarkup(runtime.tree);

test('listing badges cover every event/status, retain category fallback and reject prototype lookups', () => {
  const { getNotificationTag: tag, getSafeActionPath } = service();
  for (const [type, expected] of Object.entries({ LISTING_CREATED: 'Tạo tin', LISTING_UPDATED: 'Cập nhật',
    LISTING_APPROVED: 'Đã duyệt', LISTING_REJECTED: 'Từ chối', LISTING_EDIT_APPROVED: 'Sửa đã duyệt',
    LISTING_EDIT_REJECTED: 'Sửa bị từ chối', LISTING_EXPIRED: 'Hết hạn' })) {
    assert.equal(tag({ category: 'LISTING', type, metadata: null }), expected);
  }
  for (const [status, expected] of Object.entries({ PENDING_REVIEW: 'Chờ duyệt', HIDDEN: 'Đã ẩn', VIOLATION: 'Vi phạm', RENTED_EXTERNALLY: 'Đã cho thuê' })) {
    assert.equal(tag({ category: 'LISTING', type: 'LISTING_STATUS_CHANGED', metadata: { status } }), expected);
  }
  for (const type of ['UNKNOWN', 'toString', 'constructor', '__proto__']) assert.equal(tag({ category: 'LISTING', type }), 'Tin đăng');
  for (const status of [undefined, null, 1, 'EXPIRED', 'toString', '__proto__']) assert.equal(tag({ category: 'LISTING', type: 'LISTING_STATUS_CHANGED', metadata: { status } }), 'Tin đăng');
  const route = '/dashboard/properties/view?id=listing-1';
  assert.equal(getSafeActionPath(route), route);
  for (const unsafe of ['//evil.test', 'https://evil.test', 'javascript:alert(1)', '/\\evil.test', '/a/../admin', '/a b', null]) assert.equal(getSafeActionPath(unsafe), null);
});

function refreshHook(options = {}) {
  const runtime = hookRuntime(), timers = clock(), notifications = service();
  const hook = load('app/dashboard/properties/components/useListingNotifications.ts', {
    react: runtime.hooks, '@/services/notification.service': notifications.notificationService,
  }, timers.globals).useListingNotifications;
  let calls = 0;
  const props = { enabled: true, refresh: () => { calls++; }, ...options };
  runtime.mount(values => { hook(values); return null; }, props);
  return { runtime, timers, notifications: notifications.notificationService, props, get calls() { return calls; } };
}
test('listing refresh filters detail IDs and unrelated events, coalesces a burst and accepts id-less recovery', async () => {
  const f = refreshHook({ listingId: 'mine' });
  f.notifications.notifyListingChanged('other'); f.notifications.notifyAppointmentChanged('mine'); f.notifications.notifyRemoteChanged();
  await f.timers.advance(500); assert.equal(f.calls, 0);
  for (let i = 0; i < 10; i++) f.notifications.notifyListingChanged('mine');
  await f.timers.advance(249); assert.equal(f.calls, 0);
  await f.timers.advance(1); assert.equal(f.calls, 1);
  f.notifications.notifyListingChanged(); await f.timers.advance(250); assert.equal(f.calls, 2);
  f.runtime.unmount();
});
test('listing refresh permits only one in-flight callback, follows pending changes once and contains errors', async () => {
  const first = deferred(); let calls = 0;
  const f = refreshHook({ refresh: () => ++calls === 1 ? first.promise : Promise.reject(new Error('offline')) });
  f.notifications.notifyListingChanged('a'); await f.timers.advance(250); assert.equal(calls, 1);
  for (let i = 0; i < 5; i++) f.notifications.notifyListingChanged('b');
  await f.timers.advance(1000); assert.equal(calls, 1);
  first.resolve(); await f.runtime.settle(); await f.timers.advance(250); assert.equal(calls, 2);
  f.notifications.notifyListingChanged(); await f.timers.advance(250); assert.equal(calls, 3);
  f.runtime.unmount();
});
test('disabled listing refresh and cleanup cancel subscriptions/timers, including an in-flight follow-up', async () => {
  const first = deferred(); let calls = 0;
  const f = refreshHook({ enabled: false, refresh: () => { calls++; return first.promise; } });
  f.notifications.notifyListingChanged(); await f.timers.advance(500); assert.equal(calls, 0);
  f.runtime.update({ ...f.props, enabled: true });
  f.notifications.notifyListingChanged(); f.runtime.unmount(); await f.timers.advance(500); assert.equal(calls, 0);
  const g = refreshHook({ refresh: () => { calls++; return first.promise; } });
  g.notifications.notifyListingChanged(); await g.timers.advance(250);
  g.notifications.notifyListingChanged(); g.runtime.unmount(); first.resolve(); await g.runtime.settle();
  await g.timers.advance(500); assert.equal(calls, 1); assert.equal(g.timers.size, 0);
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
const listingNotice = (overrides = {}) => ({ id: 'notice-1', category: 'LISTING', type: 'LISTING_EDIT_REJECTED',
  title: 'Nội dung chưa được duyệt', body: 'Mở tin đăng để xem chi tiết', priority: 'NORMAL',
  metadata: { listingId: 'listing-1', editId: 'edit-1' }, actionPath: '/dashboard/properties/view?id=listing-1', ...overrides });
test('visible listing socket events invalidate by ID and render shared type tags with safe links, dedup and a three-popup cap', async () => {
  const f = transport(); await f.runtime.settle();
  f.fire('notification:new', listingNotice()); await f.runtime.settle();
  assert.match(html(f.runtime), /Sửa bị từ chối/); assert.match(html(f.runtime), /href="\/dashboard\/properties\/view\?id=listing-1"/);
  assert.equal(f.signals.filter(e => e.type === 'listing-changed')[0].listingId, 'listing-1');
  f.fire('notification:new', listingNotice()); await f.runtime.settle();
  assert.equal((html(f.runtime).match(/Nội dung chưa được duyệt/g) || []).length, 1);
  for (let i = 2; i <= 4; i++) f.fire('notification:new', listingNotice({ id: `notice-${i}`, title: `notice title ${i}`, actionPath: '//evil.test' }));
  await f.runtime.settle(); const output = html(f.runtime);
  assert.doesNotMatch(output, /Nội dung chưa được duyệt|evil.test/); assert.equal((output.match(/href="\/notifications"/g) || []).length, 3);
  await f.timers.advance(8000); await f.runtime.settle(); assert.equal(f.runtime.tree, null);
  f.cleanup();
});
test('hidden/malformed listing socket events invalidate without popups; unrelated socket events never invalidate listings', async () => {
  const f = transport(); await f.runtime.settle(); f.document.visibilityState = 'hidden';
  f.fire('notification:new', listingNotice()); f.fire('notification:new', { category: 'LISTING', metadata: { listingId: 42 } });
  for (const value of [null, 1, 'bad', {}]) f.fire('notification:new', value);
  for (const name of ['notification:read', 'notification:deleted', 'notification:unread-count']) f.fire(name, {});
  await f.timers.advance(150); await f.runtime.settle();
  assert.deepEqual(plain(f.signals.filter(e => e.type === 'listing-changed')), [{ type: 'listing-changed', listingId: 'listing-1' }, { type: 'listing-changed' }]);
  assert.equal(f.runtime.tree, null); f.cleanup();
});
test('connect/focus/visible/push/worker recovery refresh both domains and listing signals do not loop unread-title requests', async () => {
  const f = transport(); await f.runtime.settle(); const before = f.notifications.calls.length;
  f.notifications.notificationService.notifyListingChanged('listing-1'); f.notifications.notificationService.notifyAppointmentChanged('booking-1');
  await f.runtime.settle(); assert.equal(f.notifications.calls.length, before); assert.equal(f.document.title, '(2) HomeSpace');
  f.fire('connect'); f.window.fire('focus'); f.document.fire('visibilitychange'); f.push(); f.worker.fire('message', { data: { event: 'notifications.changed' } });
  assert.equal(f.signals.filter(e => e.type === 'listing-changed' && !e.listingId).length, 5);
  assert.equal(f.signals.filter(e => e.type === 'appointment-changed' && !e.bookingId).length, 5);
  await f.timers.advance(150); await f.runtime.settle();
  assert.equal(f.notifications.calls.length, before + 1, 'feed recovery coalesces unread-count fetch');
  f.cleanup(); assert.equal(f.document.title, 'HomeSpace'); assert.equal(f.document.listenerCount + f.window.listenerCount + f.worker.listenerCount, 0);
  assert.equal(f.timers.size, 0); assert.equal(f.stopped, 1); assert.equal(f.disconnected, 1);
});
test('appointment socket invalidation remains intact, and push/socket unavailability leaves recovery usable', async () => {
  const f = transport(); await f.runtime.settle();
  f.fire('notification:new', listingNotice({ category: 'APPOINTMENT', type: 'BOOKING_CONFIRMED', metadata: { bookingId: 'booking-1' } }));
  assert.equal(f.signals.find(e => e.type === 'appointment-changed').bookingId, 'booking-1');
  assert.equal(f.signals.filter(e => e.type === 'listing-changed').length, 0); f.cleanup();
  const g = transport({ socketEnabled: false, pushFails: true }); await g.runtime.settle();
  g.window.fire('focus'); assert.equal(g.signals.filter(e => e.type === 'listing-changed').length, 1); g.cleanup();
});

function ownerDetail() {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), requests = [], logins = [];
  const auth = { initialized: true, authenticated: true, userId: 'owner', login: path => logins.push(path) };
  let search = 'id=listing-1';
  const Detail = ({ property, topBar, alertBanner }) => React.createElement('section', null, topBar, alertBanner, property.title);
  const notificationHook = load('app/dashboard/properties/components/useListingNotifications.ts', {
    react: runtime.hooks, '@/services/notification.service': notifications.notificationService,
  }, timers.globals);
  const exports = load('app/dashboard/properties/view/page.tsx', {
    react: runtime.hooks, 'next/link': Link, 'next/navigation': { useSearchParams: () => new URLSearchParams(search) },
    'lucide-react': icons, '@/features/auth/useAuth': { useAuth: () => auth },
    '@/components/rent/RentDetailView': Detail, '../components/ListingStatusActionMenu': nullComponent,
    '../components/useListingNotifications': notificationHook,
    '@/services/listing.service': { getMyListingById(id) { const request = { ...deferred(), id }; requests.push(request); return request.promise; },
      getById() { assert.fail('owner requests must never fall back to public detail'); } },
    '@/lib/listing-to-rent-property': { toRentProperty: detail => detail },
    '@/config/listing-status.config': { getListingStatusConfig: status => ({ label: status }) },
  }, { ...timers.globals, window: { location: { pathname: '/dashboard/properties/view', search: '?id=listing-1&from=notifications', hash: '#review' } } },
  '\nexports.DetailContent = DashboardPropertyViewContent;');
  return { runtime, timers, notifications: notifications.notificationService, requests, logins, auth,
    mount() { runtime.mount(exports.DetailContent); }, setId(id) { search = id ? `id=${id}` : ''; if (runtime.tree !== undefined) runtime.update(); },
    detail(overrides = {}) { return { id: 'listing-1', ownerId: 'owner', title: 'Owner listing', status: 'PUBLISHED', ...overrides }; } };
}
test('owner deep link logs in once with full query/hash after initialization and performs no anonymous fetch', async () => {
  const f = ownerDetail(); f.auth.initialized = false; f.auth.authenticated = false; f.auth.userId = null; f.mount();
  assert.equal(f.logins.length, 0); assert.equal(f.requests.length, 0);
  f.auth.initialized = true; f.runtime.update(); f.runtime.update();
  assert.deepEqual(f.logins, ['/dashboard/properties/view?id=listing-1&from=notifications#review']); assert.equal(f.requests.length, 0);
  f.runtime.unmount();
});
test('owner detail supports all current states and displays rejection reasons with an edit CTA where allowed', async () => {
  for (const status of ['PENDING_REVIEW', 'REJECTED', 'HIDDEN', 'PUBLISHED', 'RESERVED', 'RENTED', 'EXPIRED', 'VIOLATION', 'RENTED_EXTERNALLY']) {
    const f = ownerDetail(); f.mount(); f.requests[0].resolve(f.detail({ status, statusReason: 'Moderation reason', editRejectionReason: 'Edit reason', pendingEditId: 'edit-1' })); await f.runtime.settle();
    const output = html(f.runtime); assert.match(output, /Owner listing/); assert.match(output, /Edit reason|Bản sửa/);
    if (['REJECTED', 'VIOLATION'].includes(status)) assert.match(output, /Moderation reason/);
    assert.equal(output.includes('/dashboard/properties/upsert?id=listing-1'), !['VIOLATION', 'RENTED_EXTERNALLY'].includes(status));
    f.runtime.unmount();
  }
});
test('missing, deleted, non-owned and mismatched listing IDs never render owner controls or call public fallback', async () => {
  const missing = ownerDetail(); missing.setId(null); missing.mount(); await missing.runtime.settle();
  assert.equal(missing.requests.length, 0); assert.match(html(missing.runtime), /Không tìm thấy mã bài đăng/); missing.runtime.unmount();
  for (const outcome of [{ response: { status: 404 } }, { response: { status: 403 } }, { response: { status: 500 } }, { ownerId: 'other' }, { id: 'wrong-id' }]) {
    const f = ownerDetail(); f.mount();
    if (outcome.response) f.requests[0].reject(outcome); else f.requests[0].resolve(f.detail(outcome));
    await f.runtime.settle(); const output = html(f.runtime);
    assert.doesNotMatch(output, /Owner listing|Chỉnh sửa tin đăng/); assert.match(output, /Không thể hiển thị tin đăng/); f.runtime.unmount();
  }
});
test('detail guards account/id changes before effects and ignores stale network responses', async () => {
  const f = ownerDetail(); f.mount(); const stale = f.requests[0];
  f.setId('listing-2'); f.requests[1].resolve(f.detail({ id: 'listing-2', title: 'Second listing' })); await f.runtime.settle();
  stale.resolve(f.detail({ title: 'STALE CONTENT' })); await f.runtime.settle();
  assert.match(html(f.runtime), /Second listing/); assert.doesNotMatch(html(f.runtime), /STALE CONTENT/);
  f.auth.userId = 'next-owner'; f.runtime.update({}, false);
  assert.doesNotMatch(html(f.runtime), /Second listing/, 'previous owner data must be absent before effects');
  f.runtime.update(); f.requests[2].resolve(f.detail({ id: 'listing-2', ownerId: 'next-owner', title: 'Next owner' })); await f.runtime.settle();
  assert.match(html(f.runtime), /Next owner/); f.runtime.unmount();
});
test('detail refresh filters IDs, preserves verified data on transient failure and removes it on denied/deleted response', async () => {
  const f = ownerDetail(); f.mount(); f.requests[0].resolve(f.detail()); await f.runtime.settle();
  f.notifications.notifyListingChanged('other'); await f.timers.advance(250); assert.equal(f.requests.length, 1);
  f.notifications.notifyListingChanged('listing-1'); await f.timers.advance(250);
  f.requests[1].reject({ response: { status: 503 } }); await f.runtime.settle(); assert.match(html(f.runtime), /Owner listing/);
  f.notifications.notifyListingChanged(); await f.timers.advance(250); f.requests[2].reject({ response: { status: 404 } }); await f.runtime.settle();
  assert.doesNotMatch(html(f.runtime), /Owner listing/); assert.match(html(f.runtime), /đã bị xóa/); f.runtime.unmount();
});

test('detail ignores an older load when a newer notification refresh completes first', async () => {
  const f = ownerDetail(); f.mount();
  f.notifications.notifyListingChanged('listing-1'); await f.timers.advance(250);
  f.requests[1].resolve(f.detail({ title: 'Latest decision', status: 'REJECTED' })); await f.runtime.settle();
  f.requests[0].resolve(f.detail({ title: 'Stale published data' })); await f.runtime.settle();
  assert.match(html(f.runtime), /Latest decision/); assert.doesNotMatch(html(f.runtime), /Stale published data/); f.runtime.unmount();
});

function ownerList() {
  const runtime = hookRuntime(), timers = clock(), notifications = service();
  const auth = { initialized: true, authenticated: true, userId: 'owner', profile: {} };
  const requests = [], counts = [], memberships = [];
  const hook = load('app/dashboard/properties/components/useListingNotifications.ts', {
    react: runtime.hooks, '@/services/notification.service': notifications.notificationService,
  }, timers.globals);
  const Card = ({ item }) => React.createElement('article', null, item.title);
  const Membership = ({ membership }) => React.createElement('aside', null, membership?.privateMarker);
  const request = list => { const pending = deferred(); list.push(pending); return pending.promise; };
  const Page = load('app/dashboard/properties/page.tsx', {
    react: runtime.hooks, 'next/link': Link, 'next/image': nullComponent, 'lucide-react': icons,
    'next/navigation': { useRouter: () => ({ push() {} }) }, '@/features/auth/useAuth': { useAuth: () => auth },
    '@/services/listing.service': { getMyListings: () => request(requests), getMyListingCounts: () => request(counts) },
    '@/services/membership.service': { getMyMembership: () => request(memberships) },
    '@/config/listing-status.config': { getListingStatusConfig: status => ({ label: status }) },
    '@/utils/apiError': { getApiErrorMessage: error => error.message },
    '@/components/membership/MembershipStatusCard': Membership, './components/ListingItemCard': Card,
    './components/ListingStatusActionMenu': nullComponent, './components/useListingNotifications': hook,
  }, { ...timers.globals, console: { warn() {}, error() {} } }).default;
  runtime.mount(Page);
  return { runtime, timers, auth, requests, counts, memberships, notifications: notifications.notificationService,
    resolve(index, title = 'Owner list private title') {
      requests[index].resolve({ result: [{ id: 'listing-1', title }], totalPages: 1, totalElements: 53 });
      counts[index].resolve({ ALL: 53, HIDDEN: 53 });
    } };
}
test('listing list refreshes current page/counts without membership calls and ignores other sync events', async () => {
  const f = ownerList(); f.resolve(0); f.memberships[0].resolve({ privateMarker: 'membership' }); await f.runtime.settle();
  f.notifications.notifyAppointmentChanged(); f.notifications.notifyRemoteChanged(); await f.timers.advance(250); await f.runtime.settle();
  assert.equal(f.requests.length, 1); assert.equal(f.counts.length, 1);
  for (let i = 0; i < 5; i++) f.notifications.notifyListingChanged();
  await f.timers.advance(250); await f.runtime.settle();
  assert.equal(f.requests.length, 2); assert.equal(f.counts.length, 2); assert.equal(f.memberships.length, 1);
  f.resolve(1, 'Refreshed title'); await f.runtime.settle(); assert.match(html(f.runtime), /Refreshed title/);
  f.runtime.unmount();
});
test('listing list drops previous-account data before effects and ignores that account pending responses', async () => {
  const f = ownerList(); f.resolve(0); f.memberships[0].resolve({ privateMarker: 'OLD MEMBERSHIP' }); await f.runtime.settle();
  assert.match(html(f.runtime), /Owner list private title/);
  f.notifications.notifyListingChanged(); await f.timers.advance(250); await f.runtime.settle();
  f.auth.userId = 'next-owner'; f.runtime.update({}, false);
  assert.doesNotMatch(html(f.runtime), /Owner list private title|OLD MEMBERSHIP|Quản lý 53/, 'previous-account rows, counts and membership must be hidden in the first new-account render');
  f.runtime.update(); f.resolve(1, 'STALE OLD ACCOUNT'); await f.runtime.settle();
  assert.doesNotMatch(html(f.runtime), /STALE OLD ACCOUNT/); f.runtime.unmount();
});
test('listing list does not launch concurrent network refreshes while a previous notification refresh is unresolved', async () => {
  const f = ownerList(); f.resolve(0); f.memberships[0].resolve(null); await f.runtime.settle();
  f.notifications.notifyListingChanged(); await f.timers.advance(250); await f.runtime.settle();
  assert.equal(f.requests.length, 2);
  f.notifications.notifyListingChanged(); await f.timers.advance(250); await f.runtime.settle();
  assert.equal(f.requests.length, 2, 'one in-flight list request; the second signal should wait for completion');
  f.resolve(1); await f.runtime.settle(); await f.timers.advance(250); await f.runtime.settle();
  assert.equal(f.requests.length, 3, 'one coalesced follow-up after completion'); f.runtime.unmount();
});

test('notification refresh is not installed in the editable form or its upsert wrapper', () => {
  // Source boundary assertion: executing the large form would not prove a hook was absent.
  for (const file of ['app/dashboard/properties/new/page.tsx', 'app/dashboard/properties/upsert/page.tsx']) {
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    assert.doesNotMatch(source, /useListingNotifications|notifyListingChanged|notificationService\.subscribe/);
  }
});
