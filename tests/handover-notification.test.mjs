import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { fileURLToPath } from 'node:url';
import { load, hookRuntime, clock, events, service, deferred, plain, nullComponent, icons, Link, html } from './helpers/notification-runtime.mjs';

const TYPES = ['MOVE_IN_HANDOVER_PROPOSED', 'MOVE_IN_HANDOVER_CONFIRMED', 'MOVE_IN_HANDOVER_COMPLETED', 'MOVE_IN_HANDOVER_DISPUTED'];
const CONTRACT = 'contract-1';
const ACTION_PATH = `/dashboard/invoices/${CONTRACT}?section=deposit&workflow=move-in`;
const flatten = node => node == null || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(flatten)];
const text = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join('')
  : typeof node === 'object' ? text(node.props?.children) : String(node);

// ---------------------------------------------------------------- service: tags, typeguard, signal
test('four handover subtypes get distinct tags only for CONTRACT; unknown, prototype and foreign names keep the category tag', () => {
  const api = service();
  const tags = TYPES.map(type => {
    assert.equal(api.isMoveInHandoverNotificationType(type), true, type);
    assert.equal(api.isInvoiceNotificationType(type), false); assert.equal(api.isRoutedPaymentType(type), false);
    const tag = api.getNotificationTag({ category: 'CONTRACT', type, metadata: { contractId: CONTRACT } });
    assert.notEqual(tag, 'Hợp đồng', type);
    assert.doesNotMatch(tag, /tiền|thanh toán|chuyển khoản|ký/i, 'neutral record copy: no money or signature claim');
    return tag;
  });
  assert.equal(new Set(tags).size, TYPES.length);
  for (const type of ['MOVE_IN_HANDOVER_CANCELLED', 'MOVE_IN_HANDOVER', 'constructor', '__proto__', 'toString', '', null, undefined, 4]) {
    assert.equal(api.isMoveInHandoverNotificationType(type), false, String(type));
    assert.equal(api.getNotificationTag({ category: 'CONTRACT', type }), 'Hợp đồng', String(type));
  }
  assert.equal(api.getNotificationTag({ category: 'PAYMENT', type: TYPES[0] }), 'Thanh toán');
  assert.equal(api.getNotificationTag({ category: 'SYSTEM', type: TYPES[0] }), 'Hệ thống');
});

test('notifyHandoverChanged emits only the scoped typed signal and stops after unsubscribe', () => {
  const api = service(), seen = [];
  const stop = api.notificationService.subscribe(event => seen.push(event));
  api.notificationService.notifyHandoverChanged(CONTRACT); api.notificationService.notifyHandoverChanged();
  stop(); api.notificationService.notifyHandoverChanged('late');
  assert.deepEqual(plain(seen), [{ type: 'handover-changed', contractId: CONTRACT }, { type: 'handover-changed' }]);
});

// ---------------------------------------------------------------- transport
function transport() {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), handlers = new Map();
  const auth = { initialized: true, authenticated: true, userId: 'owner' };
  const document = events({ title: 'HomeSpace', visibilityState: 'visible' });
  const window = events({ dispatchEvent() {} });
  let pushCallback;
  const socket = { connected: true, on(name, callback) { handlers.set(name, callback); }, connect() { return socket; }, disconnect() { return socket; } };
  const Component = load('components/notification/NotificationTransport.tsx', {
    react: runtime.hooks, 'next/link': Link, 'next/navigation': { usePathname: () => `/dashboard/invoices/${CONTRACT}` },
    'lucide-react': icons, 'socket.io-client': { io: () => socket }, '@/features/auth/useAuth': { useAuth: () => auth },
    '@/lib/keycloak': { token: 'test-token', updateToken: async () => {} }, '@/services/notification.service': notifications,
    '@/services/notification-push.service': { startPush: callback => { pushCallback = callback; return Promise.resolve(() => {}); } },
  }, { ...timers.globals, document, window, navigator: { serviceWorker: events() },
    process: { env: { NEXT_PUBLIC_NOTIFICATION_SOCKET_URL: 'http://socket.test' } }, CustomEvent: class {} }).default;
  runtime.mount(Component);
  const signals = [];
  const unsubscribe = notifications.notificationService.subscribe(event => signals.push(event));
  return { runtime, timers, notifications, document, window, signals, fire: (name, value) => handlers.get(name)?.(value),
    push: () => pushCallback(), cleanup() { runtime.unmount(); unsubscribe(); } };
}
const notice = (type, extra = {}) => ({ id: `n-${type}`, category: 'CONTRACT', type, title: 'Biên bản nhận nhà', body: 'Mở hồ sơ để xem nội dung hiện tại',
  priority: 'NORMAL', metadata: { contractId: CONTRACT }, actionPath: ACTION_PATH, ...extra });

test('every handover notice signals its contract even in a hidden tab; no unread/title request loop', async () => {
  const f = transport(); await f.runtime.settle(); const unreadBefore = f.notifications.calls.length;
  f.document.visibilityState = 'hidden';
  for (const type of TYPES) f.fire('notification:new', notice(type));
  await f.runtime.settle();
  assert.deepEqual(plain(f.signals.filter(e => e.type === 'handover-changed')), TYPES.map(() => ({ type: 'handover-changed', contractId: CONTRACT })));
  assert.equal(f.signals.filter(e => /invoice|payment|membership|rental-request/.test(e.type)).length, 0, 'other domains are untouched');
  assert.equal(f.runtime.tree, null, 'hidden tab shows no popup');
  // The signal itself never re-reads unread count; only the one coalesced refresh from the notice does.
  const before = f.notifications.calls.length; f.notifications.notificationService.notifyHandoverChanged(CONTRACT); await f.runtime.settle();
  assert.equal(f.notifications.calls.length, before);
  await f.timers.advance(150); await f.runtime.settle();
  assert.equal(f.notifications.calls.length - unreadBefore, 1);
  await f.timers.advance(10000); assert.equal(f.notifications.calls.length - unreadBefore, 1);
  f.cleanup(); assert.equal(f.document.title, 'HomeSpace'); assert.equal(f.timers.size, 0);
});

test('amendment root notices signal only the matching contract and keep the subtype tag', async () => {
  const f = transport(); await f.runtime.settle();
  f.document.visibilityState = 'hidden';
  f.fire('notification:new', notice('AMENDMENT_RESPONSE_NEEDED', {
    id: 'amendment-1', title: 'Yêu cầu điều chỉnh', actionPath: `/dashboard/contracts/${CONTRACT}`,
  }));
  assert.deepEqual(plain(f.signals.filter(e => e.type === 'agreement-changed')),
    [{ type: 'agreement-changed', agreementId: CONTRACT }]);
  assert.equal(f.runtime.tree, null);
  f.cleanup();
});

test('renewal decisions signal the root lifecycle panel in a hidden tab', async () => {
  const f = transport(); await f.runtime.settle();
  f.document.visibilityState = 'hidden';
  f.fire('notification:new', notice('RENEWAL_REQUESTED', {
    id: 'renewal-1', title: 'Yêu cầu gia hạn', actionPath: `/dashboard/contracts/${CONTRACT}`,
  }));
  assert.deepEqual(plain(f.signals.filter(e => e.type === 'agreement-changed')),
    [{ type: 'agreement-changed', agreementId: CONTRACT }]);
  assert.equal(f.runtime.tree, null);
  f.cleanup();
});

test('termination decisions signal the root contract in a hidden tab', async () => {
  const f = transport(); await f.runtime.settle();
  f.document.visibilityState = 'hidden';
  f.fire('notification:new', notice('TERMINATION_NOTICE_ISSUED', {
    id: 'termination-1', title: 'Quyết định chấm dứt', actionPath: `/dashboard/contracts/${CONTRACT}`,
  }));
  assert.deepEqual(plain(f.signals.filter(e => e.type === 'agreement-changed')),
    [{ type: 'agreement-changed', agreementId: CONTRACT }]);
  assert.equal(f.runtime.tree, null);
  f.cleanup();
});

test('visible notice pops with subtype tag and exact route; bad metadata, wrong category and unknown types do not target a contract', async () => {
  const f = transport(); await f.runtime.settle();
  f.fire('notification:new', notice('MOVE_IN_HANDOVER_PROPOSED')); await f.runtime.settle();
  const output = html(f.runtime);
  assert.match(output, /Biên bản bàn giao/);
  assert.match(output, /href="\/dashboard\/invoices\/contract-1\?section=deposit&amp;workflow=move-in"/);
  f.signals.length = 0;
  f.fire('notification:new', notice('MOVE_IN_HANDOVER_COMPLETED', { id: 'bad', metadata: { contractId: 5 } }));
  f.fire('notification:new', notice('MOVE_IN_HANDOVER_COMPLETED', { id: 'null', metadata: null }));
  f.fire('notification:new', notice('MOVE_IN_HANDOVER_COMPLETED', { id: 'wrong-category', category: 'PAYMENT' }));
  f.fire('notification:new', notice('CONTRACT_SIGNED', { id: 'unknown' }));
  f.fire('notification:new', notice('constructor', { id: 'proto' }));
  assert.deepEqual(plain(f.signals.filter(e => e.type === 'handover-changed')), [{ type: 'handover-changed' }, { type: 'handover-changed' }]);
  f.cleanup();
});

test('connect, focus, visible and push recovery each emit one generic handover signal', async () => {
  const f = transport(); await f.runtime.settle();
  f.signals.length = 0; f.fire('connect'); f.window.fire('focus'); f.document.fire('visibilitychange'); f.push();
  assert.equal(f.signals.filter(e => e.type === 'handover-changed' && !e.contractId).length, 4); f.cleanup();
});

// ---------------------------------------------------------------- invoice page landing
const OWNER = 'owner-id', RENTER = 'tenant-id';
function page({ search = 'section=deposit&workflow=move-in', contractId = CONTRACT } = {}) {
  const runtime = hookRuntime(), contracts = [];
  const auth = { initialized: true, authenticated: true, userId: OWNER, login() {} };
  const state = { search, contractId };
  const Section = () => null, Onboarding = () => null, Workflow = () => null, Lifecycle = () => null, Deposit = () => null;
  const routes = load('lib/contract-routes.ts');
  const exports = load('app/dashboard/invoices/[contractId]/page.tsx', { react: runtime.hooks, 'next/link': Link, 'lucide-react': icons,
    'next/navigation': { useParams: () => ({ contractId: state.contractId }), useSearchParams: () => new URLSearchParams(state.search) },
    '@/components/contract/detail/MonthlyInvoicesSection': Section, '@/components/rental-request/RentalOnboardingPanel': Onboarding,
    '@/components/rental-request/RentalWorkflowPanel': Workflow,
    '@/components/contract/detail/ContractLifecyclePanel': Lifecycle, '@/components/contract/detail/SettlementPaymentPanel': { DepositAdjustmentPayments: Deposit },
    '@/features/auth/useAuth': { useAuth: () => auth }, '@/utils/apiError': { getApiErrorMessage: () => 'Không mở được' },
    '@/hooks/useAgreementChangeSync': { useAgreementChangeSync() {} },
    '@/services/contract.service': { contractService: { getContract(id) { const call = deferred(); contracts.push({ kind: 'contract', id, ...call }); return call.promise; },
      getRevision(id) { const call = deferred(); contracts.push({ kind: 'revision', id, ...call }); return call.promise; } } },
    '@/lib/contract-routes': routes,
    '@/lib/payment-module': load('lib/payment-module.ts', { '@/lib/invoice-list': load('lib/invoice-list.ts', { '@/lib/contract-routes': routes, '@/lib/invoice-status': load('lib/invoice-status.ts') }), '@/lib/contract-routes': routes }) },
  {}, '\nexports.Gate=ContractInvoicesPage;exports.Body=InvoicesBody;');
  const contract = (over = {}) => ({ id: CONTRACT, contractNumber: 'HD-1', status: 'ACTIVE', landlordId: OWNER, tenantId: RENTER, rentalRequestId: 'rr-persisted', ...over });
  return { runtime, auth, state, Workflow, Lifecycle, exports, contract,
    mountBody(actorId = OWNER, over = {}) { runtime.mount(exports.Body, { actorId, contractId: CONTRACT, section: 'deposit', moveIn: true, requestedInvoiceId: null, ...over }); },
    mountGate() { runtime.mount(exports.Gate); },
    async answer(over = {}) {
      await runtime.settle(); for (const c of contracts.filter(c => !c.done)) { c.done = true; c.resolve(c.kind === 'contract' ? contract(over) : { charges: [] }); }
      await runtime.settle(); },
    panels: () => flatten(runtime.tree).filter(n => n.type === Workflow), lifecycle: () => flatten(runtime.tree).find(n => n.type === Lifecycle) };
}

test('only the exact allowlisted workflow=move-in reaches the body; unknown, repeated or lookalike values stay neutral', () => {
  const moveIn = search => { const p = page({ search }); p.mountGate(); return p.runtime.tree.props.moveIn; };
  assert.equal(moveIn('section=deposit&workflow=move-in'), true);
  for (const bad of ['', 'section=deposit', 'section=deposit&workflow=', 'section=deposit&workflow=early-exit', 'section=deposit&workflow=Move-In',
    'section=deposit&workflow=move-in%20', 'section=deposit&workflow=move-in/..', 'section=deposit&workflow=%3Cscript%3E', 'section=deposit&workflow=constructor']) {
    assert.equal(moveIn(bad), false, bad);
  }
  const p = page(); p.mountGate(); assert.equal(p.runtime.tree.key, `${OWNER}:${CONTRACT}`, 'still keyed by verified account and contract');
  p.auth.userId = 'someone-else'; p.runtime.update(); assert.equal(p.runtime.tree.key, `someone-else:${CONTRACT}`);
  p.state.contractId = 'a/../b'; p.runtime.update(); assert.match(html(p.runtime), /Không tìm thấy hồ sơ thanh toán/);
});

test('landing opens the move-in panel from the authorized contract only: persisted rental id, root contract id, no query-supplied ids', async () => {
  const p = page(); p.mountBody(); await p.answer(); const [panel, ...extra] = p.panels();
  assert.equal(extra.length, 0, 'exactly one move-in panel on the page');
  assert.deepEqual(plain({ rentalRequestId: panel.props.rentalRequestId, kind: panel.props.kind, contractId: panel.props.contractId, focusRequest: panel.props.focusRequest }),
    { rentalRequestId: 'rr-persisted', kind: 'move-in', contractId: CONTRACT, focusRequest: true });
  assert.equal(typeof panel.props.onUpdated, 'function');
  assert.equal(p.lifecycle().props.hideMoveIn, true, 'the lifecycle panel does not mount a second, competing move-in panel');
  const tenant = page(); tenant.mountBody(RENTER); await tenant.answer(); assert.equal(tenant.panels().length, 1);
  // A request-supplied rental id in the URL is never read.
  const hostile = page({ search: 'section=deposit&workflow=move-in&rentalRequestId=evil&rental=evil' }); hostile.mountGate();
  assert.deepEqual(Object.keys(plain(hostile.runtime.tree.props)).sort(), ['actorId', 'agreementId', 'contractId', 'invalidInvoiceRequest', 'moveIn', 'requestedInvoiceId', 'section']);
  assert.equal(hostile.runtime.tree.props.agreementId, null, 'a query-supplied rental id cannot select a signing document');
});

test('no focus request means no extra panel; other sections never open the move-in panel; strangers get a neutral state', async () => {
  const plainPage = page(); plainPage.mountBody(OWNER, { moveIn: false }); await plainPage.answer();
  assert.equal(plainPage.panels().length, 0); assert.equal(plainPage.lifecycle().props.hideMoveIn, false);
  const monthly = page(); monthly.mountBody(OWNER, { section: 'monthly' }); await monthly.answer(); assert.equal(monthly.panels().length, 0);
  const stranger = page(); stranger.mountBody('outsider'); await stranger.answer();
  assert.equal(stranger.panels().length, 0); assert.match(html(stranger.runtime), /Không tìm thấy hồ sơ thanh toán hoặc bạn không có quyền/);
  assert.doesNotMatch(html(stranger.runtime), /HD-1|rr-persisted/);
});

test('archived/terminated or request-less contracts keep a read-only handover or a neutral unavailable state, never a crash', async () => {
  for (const status of ['TERMINATED', 'CLOSED', 'EXPIRED', 'CANCELLED']) {
    const p = page(); p.mountBody(); await p.answer({ status });
    assert.equal(p.panels().length, 1, `${status} still shows the current handover record (backend decides allowed actions)`);
    assert.equal(p.panels()[0].props.rentalRequestId, 'rr-persisted');
    if (status === 'TERMINATED') { assert.match(html(p.runtime), /đã chấm dứt/); assert.equal(p.lifecycle(), undefined); }
  }
  const missing = page(); missing.mountBody(); await missing.answer({ rentalRequestId: '' });
  assert.equal(missing.panels().length, 0); assert.match(html(missing.runtime), /Chưa có biên bản nhận nhà/);
});

test('every mounted move-in panel (landing, lifecycle, contract detail) is scoped by the root contract id', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files = ['app/dashboard/invoices/[contractId]/page.tsx', 'components/contract/detail/ContractLifecyclePanel.tsx', 'components/contract/ContractDetailView.tsx'];
  let seen = 0;
  for (const file of files) for (const tag of fs.readFileSync(path.join(root, file), 'utf8').match(/<RentalWorkflowPanel[^>]*kind="move-in"[^>]*>/g) ?? []) {
    seen++; assert.match(tag, /contractId=\{/, `${file}: ${tag}`);
  }
  assert.equal(seen, 3);
});

// ---------------------------------------------------------------- the panel itself
const wf = (over = {}) => ({ kind: 'MOVE_IN', status: 'PROPOSED', revision: 7, role: 'TENANT', contractId: CONTRACT, serverNow: '2026-11-03T03:00:00Z',
  proposal: { reason: 'Biên bản ban đầu' }, history: [], allowedActions: ['ACCEPT', 'REJECT'], depositObligation: 'HANDOVER_PENDING', refundPayments: [], ...over });

function panel(props = {}, { visible = true } = {}) {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), gets = [], acts = [], proposes = [], updates = [];
  let result = null;
  const element = { scrolled: 0, focused: 0, scrollIntoView() { element.scrolled++; }, focus() { element.focused++; } };
  const ids = [];
  const document = events({ visibilityState: visible ? 'visible' : 'hidden', getElementById: id => { ids.push(id); return element; } });
  const labels = load('types/rental-workflow.type.ts');
  const mocks = { react: runtime.hooks, sonner: { toast: { success() {}, error() {} } }, '@/features/auth/useAuth': { useAuth: () => ({ profile: { id: 'me' } }) },
    '@/services/rental-workflow.service': { rentalWorkflowService: {
      get(id, kind) { const call = { ...deferred(), id, kind }; gets.push(call); return call.promise; },
      async act(...args) { acts.push(args); return result ?? wf(); }, async propose(...args) { proposes.push(args); return result ?? wf(); }, async calculate() {}, async documents() { return []; } } },
    '@/services/notification.service': notifications, '@/services/storage.service': { __esModule: true, default: {} }, '@/services/payment-request.service': { __esModule: true, default: { getContractPayments: async () => [] } },
    '@/utils/apiError': { getApiErrorMessage: (_e, fallback) => fallback }, '@/types/rental-workflow.type': labels,
    './WorkflowDocumentsPanel': nullComponent, './RentalPaymentModal': nullComponent };
  const exports = load('components/rental-request/RentalWorkflowPanel.tsx', mocks, { ...timers.globals, document }, '\nexports.Scoped=ScopedWorkflowPanel;');
  runtime.mount(exports.Scoped, { rentalRequestId: 'rr', kind: 'move-in', contractId: CONTRACT, onUpdated: async () => { updates.push(1); }, ...props });
  const f = { runtime, timers, document, gets, acts, proposes, updates, returns(value) { result = value; }, element, ids, notifications: notifications.notificationService,
    nodes: () => flatten(runtime.tree),
    button: label => f.nodes().find(n => n.type === 'button' && text(n) === label),
    reason: () => f.nodes().find(n => n.type === 'textarea' && n.props['aria-label'] === 'Nội dung thao tác'),
    ack: () => f.nodes().find(n => n.type === 'input' && n.props.type === 'checkbox'),
    async answer(index, value) { gets[index].resolve(value); await runtime.settle(); },
    async fail(index) { gets[index].reject(new Error('down')); await runtime.settle(); },
    async signal(...args) { f.notifications.notifyHandoverChanged(...(args.length ? args : [CONTRACT])); await timers.advance(250); await runtime.settle(); } };
  return f;
}
const open = (props, options) => { const f = panel({ focusRequest: true, ...props }, options); return f; };

test('early-exit payment changes refresh pending refunds and hidden generic recovery without losing the reason draft', async () => {
  const f = open({ kind: 'early-exit' });
  await f.answer(0, wf({ kind: 'EARLY_EXIT', refundPayments: [{ id: 'refund-1', status: 'AWAITING_TRANSFER', totalAmount: 1000 }] }));
  f.reason().props.onChange({ target: { value: 'Lý do đang viết để đối soát' } }); await f.runtime.settle();
  f.document.visibilityState = 'hidden';
  f.notifications.notifyPaymentChanged('refund-1'); f.notifications.notifyPaymentChanged();
  await f.timers.advance(1000); assert.equal(f.gets.length, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.gets.length, 2);
  await f.answer(1, wf({ kind: 'EARLY_EXIT', refundPayments: [{ id: 'refund-1', status: 'CONFIRMED', totalAmount: 1000 }] }));
  assert.match(html(f.runtime), /Đã xác nhận thực nhận/); assert.equal(f.reason().props.value, 'Lý do đang viết để đối soát');
  await f.timers.advance(10000); assert.equal(f.gets.length, 2); f.runtime.unmount(); assert.equal(f.timers.size, 0);
});

test('early-exit without a contractId prop refreshes only for its persisted root, coalesces bursts and never polls', async () => {
  const f = open({ kind: 'early-exit', contractId: undefined });
  await f.answer(0, wf({ kind: 'EARLY_EXIT' }));
  for (const id of ['foreign-root', 'signing-child']) f.notifications.notifyAgreementChanged(id);
  await f.timers.advance(250); assert.equal(f.gets.length, 1);
  for (let i = 0; i < 3; i++) f.notifications.notifyAgreementChanged(CONTRACT);
  await f.timers.advance(250); await f.runtime.settle(); assert.equal(f.gets.length, 2);
  assert.deepEqual(f.gets.map(({id, kind}) => [id, kind]), [['rr', 'early-exit'], ['rr', 'early-exit']]);
  await f.answer(1, wf({ kind: 'EARLY_EXIT' }));
  f.notifications.notifyAgreementChanged(); await f.timers.advance(250); assert.equal(f.gets.length, 3);
  await f.answer(2, wf({ kind: 'EARLY_EXIT' }));
  await f.timers.advance(60000); assert.equal(f.gets.length, 3);
  f.runtime.unmount(); assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
  const persisted = open({ kind: 'early-exit', contractId: 'stale-prop' });
  await persisted.answer(0, wf({ kind: 'EARLY_EXIT' }));
  persisted.notifications.notifyAgreementChanged('stale-prop'); await persisted.timers.advance(250); assert.equal(persisted.gets.length, 1);
  persisted.notifications.notifyAgreementChanged(CONTRACT); await persisted.timers.advance(250); assert.equal(persisted.gets.length, 2);
  persisted.runtime.unmount();
});

test('early-exit hidden root notices recover once and retain the proposal draft while requiring review of a changed revision', async () => {
  const f = open({ kind: 'early-exit', contractId: undefined });
  const workflow = revision => wf({ kind: 'EARLY_EXIT', revision, allowedActions: ['PROPOSE'], proposal: { endExclusive: '2026-12-01', handoverTerms: 'Điều khoản đã lưu' } });
  await f.answer(0, workflow(7)); f.button('Lập / đề xuất bản mới').props.onClick(); await f.runtime.settle();
  const terms = () => f.nodes().find(n => n.type === 'textarea' && n.props.minLength === 10 && !n.props['aria-label']);
  terms().props.onChange({ target: { value: 'Bản nháp trả chìa khóa của tôi' } });
  f.reason().props.onChange({ target: { value: 'Lý do chấm dứt do tôi nhập' } }); f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  f.document.visibilityState = 'hidden';
  f.notifications.notifyAgreementChanged(CONTRACT); f.notifications.notifyAgreementChanged(CONTRACT);
  await f.timers.advance(1000); assert.equal(f.gets.length, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.gets.length, 2);
  await f.answer(1, workflow(8));
  assert.equal(terms().props.value, 'Bản nháp trả chìa khóa của tôi'); assert.equal(f.reason().props.value, 'Lý do chấm dứt do tôi nhập');
  assert.equal(f.ack().props.checked, false); assert.ok(f.button('Tôi đã xem nội dung mới'));
  assert.equal(f.button('Gửi đề xuất để hai bên kiểm tra').props.disabled, true);
  f.document.fire('visibilitychange'); await f.timers.advance(1000); assert.equal(f.gets.length, 2);
  f.notifications.notifyAgreementChanged(CONTRACT); f.document.visibilityState = 'hidden'; await f.timers.advance(250); assert.equal(f.gets.length, 2);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.gets.length, 3);
  f.runtime.unmount(); assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
});

test('focus request opens the panel, highlights it and scrolls/focuses exactly once across refreshes', async () => {
  const f = open(); assert.equal(f.gets.length, 1, 'opened without a click');
  const section = f.runtime.tree; assert.equal(section.props.id, 'workflow-move-in'); assert.equal(section.props.tabIndex, -1); assert.match(section.props.className, /ring-2/);
  assert.deepEqual(f.ids, ['workflow-move-in']); assert.equal(f.element.scrolled, 1); assert.equal(f.element.focused, 1);
  await f.answer(0, wf()); await f.signal(); await f.answer(1, wf()); await f.signal(); await f.answer(2, wf());
  f.button('Tải lại nội dung').props.onClick(); await f.runtime.settle();
  assert.equal(f.element.scrolled, 1); assert.equal(f.element.focused, 1, 'refreshes never steal focus or scroll again');
  const plainPanel = panel(); assert.equal(plainPanel.gets.length, 0, 'without the request the panel stays collapsed'); assert.equal(plainPanel.element.scrolled, 0);
  assert.doesNotMatch(plainPanel.runtime.tree.props.className, /ring-2/); f.runtime.unmount();
});

test('only a handover signal for this contract (or the generic recovery) refreshes a move-in panel; other kinds and signals are isolated', async () => {
  const f = open(); await f.answer(0, wf());
  await f.signal('other-contract'); assert.equal(f.gets.length, 1, 'unrelated contract');
  f.notifications.notifyInvoiceChanged(CONTRACT); f.notifications.notifyRentalRequestChanged('rr'); f.notifications.notifyPaymentChanged(); f.notifications.notifyRemoteChanged();
  await f.timers.advance(1000); assert.equal(f.gets.length, 1, 'other domains and the 15s poll style never refresh it');
  await f.signal(CONTRACT); assert.equal(f.gets.length, 2); await f.answer(1, wf());
  await f.signal(undefined); assert.equal(f.gets.length, 3, 'id-less recovery signal'); await f.answer(2, wf());
  await f.timers.advance(120000); assert.equal(f.gets.length, 3, 'no new polling');
  const unscoped = open({ contractId: undefined }); await unscoped.answer(0, wf());
  await unscoped.signal(CONTRACT); assert.equal(unscoped.gets.length, 1, 'a panel without a contract scope ignores contract-scoped signals');
  await unscoped.signal(undefined); assert.equal(unscoped.gets.length, 2);
  const early = open({ kind: 'early-exit' }); await early.answer(0, wf()); await early.signal(); await early.signal(undefined);
  assert.equal(early.gets.length, 1, 'other workflow kinds ignore handover signals');
  for (const panelFixture of [f, unscoped, early]) panelFixture.runtime.unmount();
  assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
});

test('hidden tab only marks dirty and recovers once on return; a timer firing after hide also waits', async () => {
  const f = open(); await f.answer(0, wf()); f.document.visibilityState = 'hidden';
  f.notifications.notifyHandoverChanged(CONTRACT); f.notifications.notifyHandoverChanged(); await f.timers.advance(1000); assert.equal(f.gets.length, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); await f.runtime.settle(); assert.equal(f.gets.length, 2);
  await f.answer(1, wf()); f.document.fire('visibilitychange'); await f.timers.advance(1000); assert.equal(f.gets.length, 2, 'no dirty mark, no refresh');
  f.notifications.notifyHandoverChanged(CONTRACT); f.document.visibilityState = 'hidden'; await f.timers.advance(250); assert.equal(f.gets.length, 2, 'hidden before the timer fired');
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); await f.runtime.settle(); assert.equal(f.gets.length, 3);
  f.runtime.unmount();
});

test('one GET at a time: a burst shares it and gets a single follow-up, even when the older GET failed; failures keep what is shown', async () => {
  const f = open(); await f.answer(0, wf());
  await f.signal(); assert.equal(f.gets.length, 2);
  await f.signal(); await f.signal(); await f.signal(); assert.equal(f.gets.length, 2, 'in-flight GET is shared');
  await f.fail(1); assert.equal(f.gets.length, 3, 'one follow-up after the older failed GET');
  assert.match(html(f.runtime), /Chưa tải được hồ sơ/); assert.match(html(f.runtime), /Chờ phản hồi/, 'the last good record stays visible');
  await f.answer(2, wf({ revision: 8 })); assert.equal(f.gets.length, 3, 'failures never loop');
  assert.doesNotMatch(html(f.runtime), /Chưa tải được hồ sơ/);
  await f.timers.advance(60000); assert.equal(f.gets.length, 3);
  f.runtime.unmount();
});

test('first load failure is a neutral error and a late result after unmount is ignored without timers or listeners left behind', async () => {
  const f = open(); await f.fail(0); assert.match(html(f.runtime), /Chưa tải được hồ sơ/); assert.doesNotMatch(html(f.runtime), /Đang tải…/);
  await f.signal(); assert.equal(f.gets.length, 2, 'a notice retries the failed first load');
  f.notifications.notifyHandoverChanged(CONTRACT); f.runtime.unmount();
  assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
  const html1 = html(f.runtime); f.gets[1].resolve(wf({ revision: 99 })); await f.runtime.settle(); assert.equal(html(f.runtime), html1, 'late data never lands');
  f.notifications.notifyHandoverChanged(CONTRACT); await f.timers.advance(1000); assert.equal(f.gets.length, 2);
});

test('same-revision refresh keeps the typed reason, the acknowledgement and an open proposal draft', async () => {
  const f = open(); await f.answer(0, wf());
  f.reason().props.onChange({ target: { value: 'Đã đối chiếu biên bản với phòng thực tế' } }); f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  await f.signal(); await f.answer(1, wf());
  assert.equal(f.reason().props.value, 'Đã đối chiếu biên bản với phòng thực tế'); assert.equal(f.ack().props.checked, true);
  assert.equal(f.button('Tôi đã xem nội dung mới'), undefined, 'no prompt without a change');
  assert.equal(f.button('Đồng ý nội dung đang xem').props.disabled, false);
  const draft = open(); await draft.answer(0, wf({ allowedActions: ['PROPOSE'] }));
  draft.button('Lập / đề xuất bản mới').props.onClick(); await draft.runtime.settle();
  const condition = () => draft.nodes().find(n => n.type === 'textarea' && n.props.minLength === 10 && n.props['aria-label'] === undefined && n.props.maxLength === 1000);
  condition().props.onChange({ target: { value: 'Tường sạch, cửa chính còn chìa khóa' } }); await draft.runtime.settle();
  await draft.signal(); await draft.answer(1, wf({ allowedActions: ['PROPOSE'] }));
  assert.equal(condition().props.value, 'Tường sạch, cửa chính còn chìa khóa', 'proposal draft survives'); assert.ok(draft.reason(), 'still composing');
  f.runtime.unmount(); draft.runtime.unmount();
});

test('a changed revision resets the acknowledgement, keeps the draft and requires an explicit review before any action', async () => {
  const f = open(); await f.answer(0, wf());
  f.reason().props.onChange({ target: { value: 'Đã đối chiếu biên bản với phòng thực tế' } }); f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  const staleClick = f.button('Đồng ý nội dung đang xem').props.onClick; // handler of the render the user was looking at
  await f.signal(); await f.answer(1, wf({ revision: 8, proposal: { reason: 'Chủ nhà đã sửa biên bản' } }));
  assert.ok(f.button('Tôi đã xem nội dung mới'), 'content-changed prompt'); assert.match(html(f.runtime), /Nội dung hồ sơ đã được cập nhật/);
  assert.equal(f.reason().props.value, 'Đã đối chiếu biên bản với phòng thực tế', 'typed draft retained');
  assert.equal(f.ack().props.checked, false, 'acknowledgement reset'); assert.equal(f.ack().props.disabled, true);
  const accept = f.button('Đồng ý nội dung đang xem'); assert.equal(accept.props.disabled, true); accept.props.onClick(); await f.runtime.settle(); assert.equal(f.acts.length, 0);
  const reject = f.button('Không đồng ý'); assert.equal(reject.props.disabled, true, 'actions without acknowledgement are gated too'); reject.props.onClick(); await f.runtime.settle(); assert.equal(f.acts.length, 0);
  f.button('Tôi đã xem nội dung mới').props.onClick(); await f.runtime.settle();
  assert.equal(f.button('Tôi đã xem nội dung mới'), undefined); assert.equal(f.ack().props.checked, false, 'review alone is not acknowledgement');
  assert.equal(f.button('Đồng ý nội dung đang xem').props.disabled, true, 'still needs a fresh acknowledgement');
  assert.equal(f.button('Không đồng ý').props.disabled, false);
  f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  f.button('Đồng ý nội dung đang xem').props.onClick(); await f.runtime.settle();
  assert.deepEqual(plain(f.acts[0].slice(2)), ['ACCEPT', { expectedRevision: 8, reason: 'Đã đối chiếu biên bản với phòng thực tế', acknowledged: true, tenantContacted: false }]);
  // An old handler (bound to the revision and checkbox the user really saw) can only send that revision, never the newly fetched one.
  staleClick(); await f.runtime.settle();
  assert.deepEqual(f.acts.slice(1).map(call => call[3].expectedRevision).filter(r => r !== 7), [], 'only the reviewed revision 7 is ever sent by the stale handler');
  f.runtime.unmount();
});

test('a status change at the same revision also needs a new review; own action results never raise the prompt', async () => {
  const f = open(); await f.answer(0, wf());
  await f.signal(); await f.answer(1, wf({ status: 'DISPUTED', allowedActions: ['ACCEPT'] })); assert.ok(f.button('Tôi đã xem nội dung mới'));
  f.button('Tôi đã xem nội dung mới').props.onClick(); await f.runtime.settle();
  f.reason().props.onChange({ target: { value: 'Đã đối chiếu biên bản với phòng thực tế' } }); f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  f.returns(wf({ revision: 8, status: 'COMPLETED', allowedActions: [] }));
  f.button('Đồng ý nội dung đang xem').props.onClick(); await f.runtime.settle(); assert.equal(f.acts.length, 1);
  await f.runtime.settle(); await f.answer(2, wf({ revision: 8, status: 'COMPLETED', allowedActions: [] })); await f.runtime.settle();
  assert.equal(f.updates.length, 1, 'parent refreshed after the own action');
  assert.equal(f.button('Tôi đã xem nội dung mới'), undefined, 'the result of the user\'s own action is not an unseen change');
  f.runtime.unmount();
});

test('while composing, a changed persisted record is shown read-only beside the retained draft until it is explicitly reviewed', async () => {
  const f = open(); const old = wf({ allowedActions: ['PROPOSE'], proposal: { reason: 'Bản cũ', evidenceIds: ['ev-old'] } });
  await f.answer(0, old); f.button('Lập / đề xuất bản mới').props.onClick(); await f.runtime.settle();
  const condition = () => f.nodes().find(n => n.type === 'textarea' && n.props.minLength === 10 && n.props['aria-label'] === undefined && n.props.maxLength === 1000);
  condition().props.onChange({ target: { value: 'Bản nháp hiện trạng của tôi' } }); f.reason().props.onChange({ target: { value: 'Lý do lập bản đề xuất của tôi' } });
  f.nodes().find(n => n.type === 'input' && n.props['aria-label'] === 'Ngày giờ nhận nhà thực tế').props.onChange({ target: { value: '2026-11-03T10:00' } });
  f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  assert.doesNotMatch(html(f.runtime), /chỉ đọc/, 'nothing extra before a change');
  await f.signal(); await f.answer(1, wf({ revision: 8, allowedActions: ['PROPOSE'], proposal: { reason: 'Bản mới của chủ nhà', handedOverAt: '2026-11-03T03:00:00Z', keys: 3,
    condition: 'Hiện trạng do chủ nhà ghi lại', evidenceIds: ['ev-new-1', 'ev-new-2'] } }));
  const output = html(f.runtime);
  assert.match(output, /Nội dung mới nhất đã lưu \(chỉ đọc\)/); assert.match(output, /Bản mới của chủ nhà/); assert.match(output, /Hiện trạng: Hiện trạng do chủ nhà ghi lại/);
  assert.match(output, /Xem bằng chứng 2/, 'the new evidence is reachable'); assert.doesNotMatch(output, /Bản cũ/);
  assert.equal(condition().props.value, 'Bản nháp hiện trạng của tôi', 'draft is kept separately from the read-only record');
  assert.equal(f.reason().props.value, 'Lý do lập bản đề xuất của tôi'); assert.equal(f.ack().props.checked, false); assert.equal(f.ack().props.disabled, true);
  const submit = f.button('Gửi đề xuất để hai bên kiểm tra'); assert.equal(submit.props.disabled, true); submit.props.onClick(); await f.runtime.settle(); assert.equal(f.proposes.length, 0);
  f.button('Tôi đã xem nội dung mới').props.onClick(); await f.runtime.settle();
  assert.doesNotMatch(html(f.runtime), /chỉ đọc/); assert.equal(condition().props.value, 'Bản nháp hiện trạng của tôi');
  assert.equal(f.button('Gửi đề xuất để hai bên kiểm tra').props.disabled, true, 'still needs a fresh acknowledgement');
  f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  f.button('Gửi đề xuất để hai bên kiểm tra').props.onClick(); await f.runtime.settle(); assert.equal(f.proposes.length, 1);
  assert.equal(plain(f.proposes[0][2]).expectedRevision, 8, 'proposal is based on the revision the user reviewed');
  f.runtime.unmount();
});

test('after an own action only the returned revision/status is reviewed: a newer counterparty transition fetched meanwhile still needs review', async () => {
  const run = async fetched => {
    const f = open(); await f.answer(0, wf());
    f.reason().props.onChange({ target: { value: 'Đã đối chiếu biên bản với phòng thực tế' } }); f.ack().props.onChange({ target: { checked: true } }); await f.runtime.settle();
    f.returns(wf({ revision: 8, status: 'AGREED', allowedActions: ['CONFIRM'] }));
    f.button('Đồng ý nội dung đang xem').props.onClick(); await f.runtime.settle(); assert.equal(f.acts.length, 1); assert.equal(f.gets.length, 2, 'post-action read');
    assert.equal(f.button('Tôi đã xem nội dung mới'), undefined, 'no prompt flashes while the own action is still running');
    await f.answer(1, fetched); await f.runtime.settle();
    assert.equal(f.updates.length, 1); return f;
  };
  const own = await run(wf({ revision: 8, status: 'AGREED', allowedActions: ['CONFIRM'] }));
  assert.equal(own.button('Tôi đã xem nội dung mới'), undefined, 'the fetched record is exactly what the own action returned'); own.runtime.unmount();
  const race = await run(wf({ revision: 9, status: 'DISPUTED', allowedActions: ['CONFIRM'], proposal: { reason: 'Bên kia mở tranh chấp' } }));
  assert.ok(race.button('Tôi đã xem nội dung mới'), 'a newer revision than the returned one is an unseen change');
  assert.equal(race.ack().props.checked, false); assert.equal(race.ack().props.disabled, true); assert.equal(race.button('Xác nhận đã giao / nhận nhà').props.disabled, true, 'actions stay blocked until the new record is reviewed');
  race.runtime.unmount();
  const sameRevisionNewStatus = await run(wf({ revision: 8, status: 'DISPUTED', allowedActions: ['CONFIRM'] }));
  assert.ok(sameRevisionNewStatus.button('Tôi đã xem nội dung mới'), 'status differs from the returned one'); sameRevisionNewStatus.runtime.unmount();
});
