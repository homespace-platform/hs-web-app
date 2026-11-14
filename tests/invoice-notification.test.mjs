import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, clock, events, service, deferred, plain, nullComponent, icons, Link, html } from './helpers/notification-runtime.mjs';

const TYPES = ['INVOICE_DRAFT_READY', 'INVOICE_ISSUED', 'INVOICE_OVERDUE', 'INVOICE_AMOUNT_UPDATED', 'INVOICE_EXTENSION_REQUESTED',
  'INVOICE_EXTENSION_APPROVED', 'INVOICE_EXTENSION_REJECTED', 'INVOICE_EXTENSION_EXPIRED', 'INVOICE_OVERDUE_ACTION_RECORDED',
  'INVOICE_OVERDUE_ACTION_ACKNOWLEDGED', 'INVOICE_DEFERRED', 'INVOICE_ROLLED_OVER', 'INVOICE_OVERDUE_ACTION_REQUIRED'];
const CONTRACT = 'contract-1';
const flatten = node => node == null || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(flatten)];

// ---------------------------------------------------------------- service: tags, predicate, signal
test('all 13 invoice tags are distinct; legacy, prototype and foreign-category names keep their fallback', () => {
  const api = service();
  const tags = TYPES.map(type => {
    assert.equal(api.isInvoiceNotificationType(type), true, type);
    assert.equal(api.isRoutedPaymentType(type), false, `${type} must not feed payment recovery`);
    const tag = api.getNotificationTag({ category: 'PAYMENT', type, metadata: { contractId: 'c', invoiceId: 'i' } });
    assert.notEqual(tag, 'Thanh toán', type);
    return tag;
  });
  assert.equal(new Set(tags).size, TYPES.length);
  for (const type of ['INVOICE_UNKNOWN', 'PAYMENT_SUCCESSFUL', 'constructor', '__proto__', 'toString', '', null, undefined, 7]) {
    assert.equal(api.isInvoiceNotificationType(type), false, String(type));
  }
  assert.equal(api.getNotificationTag({ category: 'PAYMENT', type: '__proto__' }), 'Thanh toán');
  assert.equal(api.getNotificationTag({ category: 'PAYMENT', type: 'INVOICE_UNKNOWN' }), 'Thanh toán');
  assert.equal(api.getNotificationTag({ category: 'APPOINTMENT', type: 'INVOICE_ISSUED' }), 'Lịch hẹn');
  assert.equal(api.getNotificationTag({ category: 'PAYMENT', type: 'PAYMENT_REQUEST_CREATED' }), 'Yêu cầu chuyển khoản');
});

test('notifyInvoiceChanged emits the typed signal and never an unread-count/refresh event', () => {
  const api = service(), seen = [];
  const stop = api.notificationService.subscribe(event => seen.push(event));
  api.notificationService.notifyInvoiceChanged('c', 'i'); api.notificationService.notifyInvoiceChanged();
  stop(); api.notificationService.notifyInvoiceChanged('late', 'late');
  assert.deepEqual(plain(seen), [{ type: 'invoice-changed', contractId: 'c', invoiceId: 'i' }, { type: 'invoice-changed' }]);
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
    react: runtime.hooks, 'next/link': Link, 'next/navigation': { usePathname: () => '/dashboard/invoices/contract-1' },
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
const notice = (type, extra = {}) => ({ id: `n-${type}`, category: 'PAYMENT', type, title: 'Hóa đơn', body: 'Mở hóa đơn để xem', priority: 'NORMAL',
  metadata: { contractId: CONTRACT, invoiceId: 'inv-1' }, actionPath: `/dashboard/invoices/${CONTRACT}?section=monthly&invoice=inv-1`, ...extra });

test('each of the 13 socket notices signals the invoice page even in a hidden tab, with no title/unread request loop', async () => {
  const f = transport(); await f.runtime.settle(); const unreadBefore = f.notifications.calls.length;
  f.document.visibilityState = 'hidden';
  for (const type of TYPES) f.fire('notification:new', notice(type));
  await f.runtime.settle();
  const invoice = f.signals.filter(e => e.type === 'invoice-changed');
  assert.deepEqual(plain(invoice), TYPES.map(() => ({ type: 'invoice-changed', contractId: CONTRACT, invoiceId: 'inv-1' })));
  assert.equal(f.signals.filter(e => e.type === 'payment-changed' || e.type === 'membership-changed').length, 0);
  assert.equal(f.runtime.tree, null, 'hidden tab shows no popup');
  // invoice-changed itself must not re-query unread count (only the coalesced "refresh" from the notice does)
  const before = f.notifications.calls.length; f.notifications.notificationService.notifyInvoiceChanged(CONTRACT, 'inv-1'); await f.runtime.settle();
  assert.equal(f.notifications.calls.length, before);
  await f.timers.advance(150); await f.runtime.settle();
  assert.equal(f.notifications.calls.length - unreadBefore, 1, 'one coalesced unread read for the whole burst');
  await f.timers.advance(10000); assert.equal(f.notifications.calls.length - unreadBefore, 1);
  f.cleanup(); assert.equal(f.document.title, 'HomeSpace'); assert.equal(f.timers.size, 0);
});

test('visible invoice notice pops with its subtype tag; non-string metadata, non-invoice and foreign types do not target a contract', async () => {
  const f = transport(); await f.runtime.settle();
  f.fire('notification:new', notice('INVOICE_ISSUED')); await f.runtime.settle();
  assert.match(html(f.runtime), /Đã phát hành/);
  assert.match(html(f.runtime), /href="\/dashboard\/invoices\/contract-1\?section=monthly&amp;invoice=inv-1"/);
  f.signals.length = 0;
  f.fire('notification:new', notice('INVOICE_OVERDUE', { id: 'bad', metadata: { contractId: 5, invoiceId: { x: 1 } } }));
  f.fire('notification:new', notice('PAYMENT_REQUEST_CREATED', { id: 'p', metadata: { paymentId: 'pay' } }));
  f.fire('notification:new', notice('INVOICE_ISSUED', { id: 'wrong-category', category: 'CONTRACT' }));
  f.fire('notification:new', notice('INVOICE_ISSUED', { id: 'null-metadata', metadata: null }));
  const invoice = f.signals.filter(e => e.type === 'invoice-changed');
  assert.deepEqual(plain(invoice), [{ type: 'invoice-changed' }, { type: 'invoice-changed' }]);
  assert.equal(f.signals.filter(e => e.type === 'payment-changed').length, 1);
  f.cleanup();
});

test('connect, focus, visible and push recovery all emit one generic invoice signal', async () => {
  const f = transport(); await f.runtime.settle();
  f.signals.length = 0; f.fire('connect'); f.window.fire('focus'); f.document.fire('visibilitychange'); f.push();
  const generic = f.signals.filter(e => e.type === 'invoice-changed' && !e.contractId && !e.invoiceId);
  assert.equal(generic.length, 4); f.cleanup();
});

// ---------------------------------------------------------------- shared helpers for the page / section
const bill =(id, status = 'DRAFT', over = {}) => ({ id, contractId: CONTRACT, periodIndex: 0, status,
  workflowState: { DRAFT: 'METER_REQUIRED', UNPAID: 'UNPAID', OVERDUE: 'OVERDUE', PAID: 'PAID', ROLLED_OVER: 'ROLLED_OVER', CANCELLED: 'CANCELLED' }[status],
  lines: [], totalAmount: 1000, lateFeeAmount: 0, serverNow: '2027-02-01T00:00:00Z', periodStart: '2027-01-01', periodEndExclusive: '2027-02-01',
  meterDeadlineAt: '2027-02-02T00:00:00Z', draftExtraCharges: [], overdueActions: [], paymentExtensions: [], activeResolution: 'NONE',
  ...over });
const Panel = () => null, ExtensionPanel = () => null, OverduePanel = () => null, MeterInput = () => null, Money = () => null;

function section(initial = {}) {
  const runtime = hookRuntime(), timers = clock(), notifications = service();
  const lists = [], paymentCalls = [], prepared = [], uploads = [], reports = [];
  const state = { payments: [] };
  const document = events({ visibilityState: 'visible', getElementById: () => null });
  const replaced = [];
  const window = { location: { hash: '' }, history: { replaceState: (...args) => replaced.push(args) }, confirm: () => true, open: () => null, ...timers.globals };
  const invoiceApi = { list() { const call = deferred(); lists.push(call); return call.promise; },
    async prepare(id, data) { prepared.push([id, data]); }, async issue() {} };
  const paymentApi = { async getContractPayments() { paymentCalls.push(1); return state.payments; },
    async getPaymentRequest() { return { totalAmount: 1000 }; }, async reportTransfer(id, data) { reports.push([id, data]); },
    async confirmReceipt() {}, async rejectReceipt() {} };
  const invoiceList = load('lib/invoice-list.ts', { '@/lib/contract-routes': load('lib/contract-routes.ts'), '@/lib/invoice-status': load('lib/invoice-status.ts') });
  const mocks = { react: runtime.hooks, 'next/image': nullComponent, sonner: { toast: { success() {}, error() {} } }, 'lucide-react': icons,
    '@/components/ui/vnd-money-input': Money, '@/services/monthly-invoice.service': { monthlyInvoiceService: invoiceApi },
    '@/services/notification.service': notifications, '@/services/payment-request.service': { __esModule: true, default: paymentApi },
    '@/services/storage.service': { __esModule: true, default: { async uploadPaymentProof(file) { uploads.push(file); return 'stored'; } } },
    '@/utils/apiError': { getApiErrorMessage: () => 'Lỗi tải' }, '@/lib/invoice-status': load('lib/invoice-status.ts'), '@/lib/invoice-list': invoiceList,
    '@/lib/payment-module': load('lib/payment-module.ts', { '@/lib/invoice-list': invoiceList, '@/lib/contract-routes': load('lib/contract-routes.ts') }),
    './OverdueActionsPanel': OverduePanel, './PaymentExtensionPanel': ExtensionPanel, './MeterReading': { MeterReadingInput: MeterInput, MeterReadingSummary: nullComponent },
    './InvoiceLineCalculation': nullComponent, '@/components/payment/PaymentDisputePanel': Panel, '@/components/payment/PaymentReceiptActions': Panel,
    '@/components/complaint/ComplaintPanel': Panel };
  const Component = load('components/contract/detail/MonthlyInvoicesSection.tsx', mocks, { ...timers.globals, document, window }).default;
  const props = (over = {}) => ({ contractId: CONTRACT, rentalRequestId: '', contractActive: true, isLandlord: true, isTenant: false,
    electricityRequired: true, waterRequired: true, unsupportedWaterRate: false, initialElectricity: '0', initialWater: '0',
    requestedInvoiceId: null, onUpdated: async () => {}, ...initial, ...over });
  const f = { runtime, timers, document, window, lists, paymentCalls, prepared, uploads, reports, replaced, state, notifications: notifications.notificationService,
    props, nodes: () => flatten(runtime.tree),
    mount(over) { runtime.mount(Component, props(over)); }, update(over) { runtime.update(props(over)); },
    async resolve(index, bills) { await runtime.settle(); lists[index].resolve(bills); await runtime.settle(); },
    meter: name => f.nodes().find(n => n.type === MeterInput && n.props.name === name),
    selectedValue: () => f.nodes().find(n => n.type === 'select')?.props.value,
    extraRows: () => f.nodes().filter(n => n.type === 'input' && n.props['aria-label'] === 'Tên khoản phát sinh').map(n => n.props.value),
    extraAmounts: () => f.nodes().filter(n => n.type === Money).map(n => n.props.value),
    button: label => f.nodes().find(n => n.type === 'button' && n.props.children === label),
    // React.Children.toArray escapes "=" and ":" inside keys.
    nav: id => f.navButtons().find(n => String(n.key).endsWith(`$${id.replace(/=/g, '=0').replace(/:/g, '=2')}`)),
    navButtons: () => f.nodes().filter(n => n.type === 'button' && 'aria-pressed' in n.props) };
  return f;
}
const selectedId = f => f.selectedValue();

// ---------------------------------------------------------------- MonthlyInvoicesSection: selection
test('requested terminal, rolled and cancelled invoices are selected from the authorized list without another read', async () => {
  const f = section(); const list = [bill('open', 'UNPAID', { periodIndex: 3 }), bill('paid', 'PAID', { periodIndex: 0 }),
    bill('rolled', 'ROLLED_OVER', { periodIndex: 1 }), bill('cancelled', 'CANCELLED', { periodIndex: 2 })];
  f.mount({ requestedInvoiceId: 'cancelled' }); await f.resolve(0, list);
  assert.equal(selectedId(f), 'cancelled');
  for (const id of ['paid', 'rolled', 'open']) { f.update({ requestedInvoiceId: id }); assert.equal(selectedId(f), id); }
  assert.equal(f.lists.length, 1, 'selecting from the query never refetches or looks an invoice up by id');
  f.update({ requestedInvoiceId: null }); assert.equal(selectedId(f), 'open', 'no query keeps the action-first default');
  f.runtime.unmount();
});

test('unknown, synthetic and tenant-visible draft ids show a neutral state, never another invoice or draft details', async () => {
  const draft = bill('draft', 'DRAFT', { periodIndex: 6, totalAmount: 7777777 });
  const list = [bill('open', 'UNPAID', { periodIndex: 0 }), draft];
  const landlord = section(); landlord.mount({ requestedInvoiceId: 'first-rent-synthetic' }); await landlord.resolve(0, list);
  assert.match(html(landlord.runtime), /Không tìm thấy hóa đơn được yêu cầu/); assert.equal(selectedId(landlord), '');
  assert.equal(landlord.nodes().filter(n => n.type === 'article').length, 0);
  landlord.update({ requestedInvoiceId: 'draft' }); assert.equal(selectedId(landlord), 'draft'); assert.doesNotMatch(html(landlord.runtime), /Không tìm thấy/);
  landlord.runtime.unmount();
  const tenant = section({ isLandlord: false, isTenant: true }); tenant.mount({ requestedInvoiceId: 'draft' }); await tenant.resolve(0, list);
  const output = html(tenant.runtime);
  assert.match(output, /Không tìm thấy hóa đơn được yêu cầu/); assert.doesNotMatch(output, /7\.777\.777/);
  assert.equal(tenant.navButtons().length, 1, 'draft is not even listed for the tenant');
  tenant.update({ requestedInvoiceId: 'open' }); assert.equal(selectedId(tenant), 'open');
  tenant.runtime.unmount();
  const onlyDraft = section({ isLandlord: false, isTenant: true }); onlyDraft.mount(); await onlyDraft.resolve(0, [draft]);
  assert.match(html(onlyDraft.runtime), /Chưa có hóa đơn được phát hành/); assert.doesNotMatch(html(onlyDraft.runtime), /7\.777\.777/);
  onlyDraft.runtime.unmount();
});

test('a later external query replaces a manual choice, an unchanged query keeps it, and unrelated drafts are not wiped', async () => {
  const f = section(); f.mount({ requestedInvoiceId: 'a' });
  await f.resolve(0, [bill('a', 'DRAFT', { periodIndex: 0, electricityEnd: 10 }), bill('b', 'UNPAID', { periodIndex: 1 }), bill('c', 'PAID', { periodIndex: 2 })]);
  f.meter('điện').props.onChange('15'); await f.runtime.settle();
  f.nav('b').props.onClick(); await f.runtime.settle();
  assert.equal(selectedId(f), 'b'); assert.match(f.replaced.at(-1)[2], /invoice=b/);
  f.update({ requestedInvoiceId: 'b' }); assert.equal(selectedId(f), 'b', 'router syncs the replaced URL');
  f.update({ requestedInvoiceId: 'a' }); assert.equal(selectedId(f), 'a', 'new external query beats the earlier local choice');
  assert.equal(f.meter('điện').props.end, '15', 'draft input survives the selection change');
  f.nav('c').props.onClick(); await f.runtime.settle(); assert.equal(selectedId(f), 'c');
  f.update({ requestedInvoiceId: 'a' }); assert.equal(selectedId(f), 'c', 'same query re-render keeps the user choice');
  f.update({ requestedInvoiceId: 'b' }); assert.equal(selectedId(f), 'b');
  f.update({ requestedInvoiceId: 'a' }); assert.equal(f.meter('điện').props.end, '15');
  assert.equal(f.lists.length, 1); f.runtime.unmount();
});

// ---------------------------------------------------------------- MonthlyInvoicesSection: drafts and refresh
test('silent refresh keeps dirty meters and extras, seeds untouched fields and other drafts from the server', async () => {
  const f = section();
  const server = (electricityEnd, waterEnd, extras) => [bill('d1', 'DRAFT', { electricityEnd, waterEnd, draftExtraCharges: extras, periodIndex: 0 }),
    bill('d2', 'DRAFT', { electricityEnd: electricityEnd + 100, periodIndex: 1 })];
  f.mount({ requestedInvoiceId: 'd1' }); await f.resolve(0, server(10, 5, [{ description: 'Rác', amount: 5 }]));
  assert.equal(f.meter('điện').props.end, '10'); assert.equal(f.meter('nước').props.end, '5'); assert.deepEqual(f.extraRows(), ['Rác']);
  f.meter('điện').props.onChange('15'); await f.runtime.settle();
  f.notifications.notifyInvoiceChanged(CONTRACT, 'd1'); await f.timers.advance(250); await f.resolve(1, server(12, 8, [{ description: 'Rác mới', amount: 9 }]));
  assert.equal(f.meter('điện').props.end, '15', 'dirty electricity kept'); assert.equal(f.meter('nước').props.end, '8', 'untouched water follows server');
  assert.deepEqual(f.extraRows(), ['Rác mới'], 'untouched extras follow server');
  f.nodes().find(n => n.type === 'input' && n.props['aria-label'] === 'Tên khoản phát sinh').props.onChange({ target: { value: 'Đang gõ' } }); await f.runtime.settle();
  f.nodes().find(n => n.type === Money).props.onValueChange('777'); await f.runtime.settle();
  f.notifications.notifyInvoiceChanged(CONTRACT); await f.timers.advance(250); await f.resolve(2, server(20, 9, [{ description: 'Server', amount: 1 }]));
  assert.deepEqual(f.extraRows(), ['Đang gõ']); assert.deepEqual(f.extraAmounts(), ['777']); assert.equal(f.meter('điện').props.end, '15');
  assert.equal(f.meter('nước').props.end, '9');
  f.update({ requestedInvoiceId: 'd2' }); assert.equal(f.meter('điện').props.end, '120', 'other draft was seeded from the first refresh and again by the server');
  f.runtime.unmount();
});

test('after a successful save the server value is adopted again, and a failed save keeps local input', async () => {
  const f = section(); f.mount({ requestedInvoiceId: 'd1' });
  const server = value => [bill('d1', 'DRAFT', { electricityEnd: value, waterEnd: 3, draftExtraCharges: [] })];
  await f.resolve(0, server(10));
  f.meter('điện').props.onChange('15'); await f.runtime.settle();
  void f.button('Lưu bản nháp').props.onClick(); await f.runtime.settle();
  assert.deepEqual(plain(f.prepared), [['d1', { electricityEnd: 15, waterEnd: 3, extraCharges: [] }]]);
  await f.resolve(1, server(16)); assert.equal(f.meter('điện').props.end, '16', 'saved draft re-seeds from the server');
  f.meter('điện').props.onChange('30'); await f.runtime.settle(); f.notifications.notifyInvoiceChanged(); await f.timers.advance(250);
  f.lists[2].reject(new Error('offline')); await f.runtime.settle();
  assert.equal(f.meter('điện').props.end, '30'); assert.match(html(f.runtime), /Chưa cập nhật được dữ liệu/);
  f.runtime.unmount();
});

test('a backend invoice that is no longer DRAFT stops the editor and keeps its real status without resurrecting stale input', async () => {
  const f = section(); f.mount({ requestedInvoiceId: 'd1' }); await f.resolve(0, [bill('d1', 'DRAFT', { electricityEnd: 10, waterEnd: 1 })]);
  f.meter('điện').props.onChange('99'); await f.runtime.settle(); assert.ok(f.button('Lưu bản nháp'));
  f.notifications.notifyInvoiceChanged(CONTRACT, 'd1'); await f.timers.advance(250);
  await f.resolve(1, [bill('d1', 'UNPAID', { electricityEnd: 10, waterEnd: 1, totalAmount: 5000 })]);
  assert.equal(f.meter('điện'), undefined); assert.equal(f.button('Lưu bản nháp'), undefined); assert.equal(f.button('Chốt và phát hành ngay'), undefined);
  assert.match(html(f.runtime), /Hóa đơn đã phát hành, đang chờ người thuê thanh toán/);
  assert.equal(f.prepared.length, 0);
  f.notifications.notifyInvoiceChanged(CONTRACT); await f.timers.advance(250); await f.resolve(2, [bill('d1', 'DRAFT', { electricityEnd: 10 })]);
  assert.equal(f.meter('điện').props.end, '10', 'stale local value is not resurrected after the draft went away');
  f.runtime.unmount();
});

test('same-status extension/overdue updates render the current backend through the same mounted panels while inputs survive', async () => {
  const f = section({ isLandlord: false, isTenant: true });
  const open = (extensions, over = {}) => bill('open', 'UNPAID', { paymentExtensions: extensions, ...over });
  f.state.payments = [{ id: 'pay', invoiceId: 'open', status: 'AWAITING_TRANSFER', totalAmount: 1000, transferReference: 'REF', evidences: [], qrImageUrl: 'qr' }];
  f.mount({ requestedInvoiceId: 'open' }); await f.resolve(0, [open([])]);
  const firstKeys = f.nodes().filter(n => n.type === ExtensionPanel || n.type === OverduePanel).map(n => [n.type, n.key]);
  const file = { name: 'proof.png', size: 10 };
  f.nodes().find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [file] } }); await f.runtime.settle();
  f.notifications.notifyInvoiceChanged(CONTRACT, 'open'); await f.timers.advance(250);
  await f.resolve(1, [open([{ id: 'x', status: 'PENDING', days: 3 }], { activeResolution: 'EXTENSION_REQUEST' })]);
  const extension = f.nodes().find(n => n.type === ExtensionPanel);
  assert.equal(extension.props.invoice.paymentExtensions.length, 1); assert.equal(extension.props.invoice.activeResolution, 'EXTENSION_REQUEST');
  assert.deepEqual(f.nodes().filter(n => n.type === ExtensionPanel || n.type === OverduePanel).map(n => [n.type, n.key]), firstKeys, 'same element type and key: no remount');
  void f.button('Tôi đã chuyển khoản').props.onClick(); await f.runtime.settle(); await f.runtime.settle();
  assert.equal(f.uploads[0], file, 'proof file survived the refresh'); assert.equal(f.reports[0][0], 'pay');
  assert.equal(f.nodes().filter(n => n.type === ExtensionPanel || n.type === OverduePanel).length, 2); f.runtime.unmount();
});

test('landlord rejection reason survives a silent refresh', async () => {
  const f = section(); f.state.payments = [{ id: 'pay', invoiceId: 'open', status: 'TRANSFER_REPORTED', totalAmount: 1000, evidences: [] }];
  f.mount({ requestedInvoiceId: 'open' }); await f.resolve(0, [bill('open', 'UNPAID')]);
  const reason = () => f.nodes().find(n => n.type === 'input' && n.props.placeholder === 'Lý do từ chối');
  reason().props.onChange({ target: { value: 'Sai nội dung' } }); await f.runtime.settle();
  f.notifications.notifyInvoiceChanged(); await f.timers.advance(250); await f.resolve(1, [bill('open', 'UNPAID', { totalAmount: 1200 })]);
  assert.equal(reason().props.value, 'Sai nội dung'); f.runtime.unmount();
});

// ---------------------------------------------------------------- MonthlyInvoicesSection: realtime
test('a burst coalesces to one shared GET pair, one follow-up, filters other contracts and ends without polling', async () => {
  const f = section(); f.mount(); for (let i = 0; i < 20; i++) f.notifications.notifyInvoiceChanged(CONTRACT, 'a');
  for (let i = 0; i < 5; i++) f.notifications.notifyInvoiceChanged('other-contract', 'z');
  f.notifications.notifyPaymentChanged('p'); f.notifications.notifyRemoteChanged();
  await f.timers.advance(250); assert.equal(f.lists.length, 1, 'initial GET is shared with the burst');
  await f.resolve(0, [bill('a', 'UNPAID')]); assert.equal(f.lists.length, 2, 'exactly one follow-up'); assert.equal(f.paymentCalls.length, 1);
  await f.resolve(1, [bill('a', 'PAID')]); assert.equal(f.paymentCalls.length, 2); assert.match(html(f.runtime), /Đã xác nhận thanh toán/);
  await f.timers.advance(60000); assert.equal(f.lists.length, 2, 'no polling and no write/sync loop');
  f.notifications.notifyInvoiceChanged(); await f.timers.advance(250); assert.equal(f.lists.length, 3, 'generic recovery invalidates the current contract');
  await f.resolve(2, [bill('a', 'PAID')]); f.runtime.unmount();
  assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
  f.notifications.notifyInvoiceChanged(CONTRACT); await f.timers.advance(1000); assert.equal(f.lists.length, 3, 'unsubscribed on unmount');
});

test('actions, panels and notices share one in-flight read; older responses never overwrite the fresher follow-up', async () => {
  const f = section(); let updated = 0; f.mount({ onUpdated: async () => { updated++; } }); await f.resolve(0, [bill('a', 'UNPAID', { totalAmount: 1000 })]);
  f.state.payments = [];
  const panelRefresh = f.nodes().find(n => n.type === ExtensionPanel).props.refresh;
  const first = panelRefresh(); const second = panelRefresh(); f.notifications.notifyInvoiceChanged(CONTRACT); await f.timers.advance(250);
  assert.equal(f.lists.length, 2, 'three triggers while one read is pending => still one GET');
  await f.resolve(1, [bill('a', 'UNPAID', { totalAmount: 2000 })]); assert.equal(f.lists.length, 3, 'one dirty follow-up');
  await f.resolve(2, [bill('a', 'PAID', { totalAmount: 3000 })]); await Promise.all([first, second]);
  assert.match(html(f.runtime), /Đã xác nhận thanh toán/); assert.doesNotMatch(html(f.runtime), /2\.000/);
  assert.equal(f.lists.length, 3); assert.equal(updated, 0); f.runtime.unmount();
});

test('hidden tabs defer recovery during debounce and while waiting, then recover once on visible', async () => {
  const f = section(); f.mount(); await f.resolve(0, [bill('a', 'UNPAID')]);
  f.notifications.notifyInvoiceChanged(CONTRACT); f.document.visibilityState = 'hidden'; await f.timers.advance(250); assert.equal(f.lists.length, 1);
  f.notifications.notifyInvoiceChanged(CONTRACT); assert.equal(f.timers.size, 0); await f.timers.advance(5000); assert.equal(f.lists.length, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.lists.length, 2);
  f.notifications.notifyInvoiceChanged(CONTRACT); await f.timers.advance(250); f.document.visibilityState = 'hidden';
  await f.resolve(1, [bill('a', 'UNPAID')]); assert.equal(f.lists.length, 2, 'dirty follow-up waits while hidden');
  f.document.fire('visibilitychange'); await f.timers.advance(1000); assert.equal(f.lists.length, 2, 'still hidden');
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.lists.length, 3);
  f.document.fire('visibilitychange'); await f.timers.advance(5000); assert.equal(f.lists.length, 3, 'recovery flag was consumed');
  await f.resolve(2, [bill('a', 'PAID')]); f.runtime.unmount();
});

test('page -> section: a malformed ?invoice= shows the neutral state instead of an unrelated invoice, and a later valid link replaces it', async () => {
  const p = page({ search: 'section=monthly&invoice=..%2Fsecret' }); p.mountGate();
  const body = p.runtime.tree; assert.equal(body.props.requestedInvoiceId, null); assert.equal(body.props.invalidInvoiceRequest, '../secret');
  const f = section(); f.mount({ requestedInvoiceId: null, invalidInvoiceRequest: '../secret' });
  await f.resolve(0, [bill('open', 'UNPAID', { periodIndex: 1 }), bill('paid', 'PAID', { periodIndex: 0 })]);
  assert.match(html(f.runtime), /Không tìm thấy hóa đơn được yêu cầu/); assert.equal(selectedId(f), ''); assert.equal(f.nodes().filter(n => n.type === 'article').length, 0);
  f.nav('paid').props.onClick(); await f.runtime.settle(); assert.equal(selectedId(f), 'paid', 'the user can still choose from their authorized list');
  f.update({ requestedInvoiceId: null, invalidInvoiceRequest: 'another bad id' }); assert.match(html(f.runtime), /Không tìm thấy hóa đơn được yêu cầu/);
  f.update({ requestedInvoiceId: 'open', invalidInvoiceRequest: null }); assert.equal(selectedId(f), 'open'); assert.doesNotMatch(html(f.runtime), /Không tìm thấy/);
  f.update({ requestedInvoiceId: null, invalidInvoiceRequest: null }); assert.equal(selectedId(f), 'open', 'no query goes back to the action-first default');
  assert.equal(f.lists.length, 1); f.runtime.unmount();
  const parent = page({ search: 'section=monthly&invoice=..%2Fsecret' }); parent.mountBody(OWNER, { requestedInvoiceId: null, invalidInvoiceRequest: '../secret' });
  await parent.answer({ parentContractId: 'root-1' });
  assert.ok(flatten(parent.runtime.tree).some(n => n.props?.href === '/dashboard/invoices/root-1?section=monthly&invoice=..%2Fsecret'), 'parent link keeps the explicit (encoded) request');
});

test('real month-1 id first-rent:<paymentId> in the authorized list survives page query -> section -> selector click -> history -> reload', async () => {
  const PAY = '3f2c9a4e-1b7d-4c8a-9e21-5d6f0a7b8c90', FIRST = `first-rent:${PAY}`;
  const list = [bill(FIRST, 'PAID', { periodIndex: -1, billingPeriod: { kind: 'INITIAL_RENT', paymentPeriodNumber: 1 } }),
    bill('open', 'UNPAID', { periodIndex: 1 })];
  const query = id => `section=monthly&invoice=${encodeURIComponent(id)}`;
  // Gate: the exact synthetic id is a usable request; only that exact shape is.
  const gate = search => { const p = page({ search }); p.mountGate(); return p.runtime.tree.props; };
  assert.deepEqual(plain(gate(query(FIRST))), { actorId: OWNER, contractId: CONTRACT, section: 'monthly', moveIn: false, agreementId: null, requestedInvoiceId: FIRST, invalidInvoiceRequest: null });
  for (const bad of ['first-rent:', 'first-rent:a/b', 'first-rent:first-rent:x', 'first-rent:../x', 'other:abc', 'first-rent: x y']) {
    const props = gate(query(bad)); assert.equal(props.requestedInvoiceId, null, bad); assert.equal(props.invalidInvoiceRequest, bad, bad);
  }
  // Section: matched against the authorized list, no by-id fetch.
  const f = section(); f.mount({ requestedInvoiceId: FIRST }); await f.resolve(0, list);
  assert.equal(selectedId(f), FIRST); assert.doesNotMatch(html(f.runtime), /Không tìm thấy hóa đơn/); assert.match(html(f.runtime), /Tiền thuê tháng 1/);
  // Click month 1 from another invoice: history gets a Gate-valid query that re-renders to the same selection.
  f.update({ requestedInvoiceId: 'open' }); assert.equal(selectedId(f), 'open');
  f.nav(FIRST).props.onClick(); await f.runtime.settle(); assert.equal(selectedId(f), FIRST);
  const written = f.replaced.at(-1)[2]; assert.equal(written, `/dashboard/invoices/${CONTRACT}?${query(FIRST)}`);
  const rerender = page({ search: written.split('?')[1] }); rerender.mountGate();
  assert.equal(rerender.runtime.tree.props.requestedInvoiceId, FIRST); assert.equal(rerender.runtime.tree.props.invalidInvoiceRequest, null);
  f.update({ requestedInvoiceId: rerender.runtime.tree.props.requestedInvoiceId, invalidInvoiceRequest: rerender.runtime.tree.props.invalidInvoiceRequest });
  assert.equal(selectedId(f), FIRST); assert.doesNotMatch(html(f.runtime), /Không tìm thấy hóa đơn/);
  assert.equal(f.lists.length, 1); f.runtime.unmount();
  // Reload of the saved link: a fresh mount selects the same month-1 row.
  const reloaded = section(); reloaded.mount({ requestedInvoiceId: FIRST }); await reloaded.resolve(0, list);
  assert.equal(selectedId(reloaded), FIRST); reloaded.runtime.unmount();
  // A well-formed synthetic id that the authorized list does not contain stays neutral and never selects another invoice.
  const absent = section(); absent.mount({ requestedInvoiceId: `first-rent:${PAY.replace('3f2c', 'aaaa')}` }); await absent.resolve(0, list);
  assert.match(html(absent.runtime), /Không tìm thấy hóa đơn được yêu cầu/); assert.equal(selectedId(absent), ''); assert.equal(absent.lists.length, 1);
  const tenant = section({ isLandlord: false, isTenant: true }); tenant.mount({ requestedInvoiceId: `first-rent:${PAY}` }); await tenant.resolve(0, [list[1]]);
  assert.match(html(tenant.runtime), /Không tìm thấy hóa đơn được yêu cầu/);
  absent.runtime.unmount(); tenant.runtime.unmount();
});

test('a list that resolves after unmount starts no payments read, and a late proof check after unmount uploads nothing', async () => {
  const f = section(); f.mount(); await f.runtime.settle(); f.runtime.unmount();
  await f.resolve(0, [bill('a', 'UNPAID')]); assert.equal(f.paymentCalls.length, 0); assert.equal(f.lists.length, 1);
  const alive = section({ isLandlord: false, isTenant: true });
  alive.state.payments = [{ id: 'pay', invoiceId: 'open', status: 'AWAITING_TRANSFER', totalAmount: 1000, evidences: [] }];
  alive.mount({ requestedInvoiceId: 'open' }); await alive.resolve(0, [bill('open', 'UNPAID')]);
  const file = { name: 'proof.png', size: 10 };
  alive.nodes().find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [file] } }); await alive.runtime.settle();
  const click = alive.button('Tôi đã chuyển khoản').props.onClick; alive.runtime.unmount();
  void click(); await alive.runtime.settle(); await alive.runtime.settle();
  assert.equal(alive.uploads.length, 0); assert.equal(alive.reports.length, 0); assert.equal(alive.lists.length, 1);
});

test('a rejected old GET still gives the pending notice its follow-up; failures keep data, never loop, and a late read after unmount is ignored', async () => {
  const f = section(); f.mount(); f.notifications.notifyInvoiceChanged(CONTRACT); await f.timers.advance(250);
  f.lists[0].reject(new Error('first load failed')); await f.runtime.settle(); assert.equal(f.lists.length, 2);
  await f.resolve(1, [bill('a', 'UNPAID')]); assert.doesNotMatch(html(f.runtime), /Lỗi tải/);
  f.notifications.notifyInvoiceChanged(CONTRACT); await f.timers.advance(250); f.lists[2].reject(new Error('offline')); await f.runtime.settle();
  assert.equal(f.lists.length, 3); assert.match(html(f.runtime), /Chưa cập nhật được dữ liệu/); assert.equal(f.navButtons().length, 1);
  await f.timers.advance(60000); assert.equal(f.lists.length, 3);
  f.nodes().find(n => n.type === 'button' && n.props.children === 'Tải lại').props.onClick(); await f.runtime.settle();
  assert.equal(f.lists.length, 4); f.runtime.unmount(); await f.resolve(3, [bill('a', 'PAID')]); assert.equal(f.lists.length, 4);
  const empty = section(); empty.mount(); empty.lists[0].reject(new Error('boom')); await empty.runtime.settle();
  assert.match(html(empty.runtime), /Lỗi tải/); empty.runtime.unmount();
});

// ---------------------------------------------------------------- invoice detail page
const OWNER = 'owner-id', RENTER = 'tenant-id';
function page({ search = 'section=monthly&invoice=inv-1', contractId = CONTRACT, hash = '#top' } = {}) {
  const runtime = hookRuntime(), timers = clock(), contracts = [], logins = [], notifications = service();
  const document = events({ visibilityState: 'visible' });
  const { useAgreementChangeSync } = load('hooks/useAgreementChangeSync.ts', {
    react: runtime.hooks, '@/services/notification.service': notifications,
  }, { ...timers.globals, document });
  const auth = { initialized: true, authenticated: true, userId: OWNER, login: path => logins.push(path) };
  const state = { search, contractId };
  const window = { location: { pathname: `/dashboard/invoices/${contractId}`, search: `?${search}`, hash }, ...timers.globals };
  const Section = () => null, Onboarding = () => null, Workflow = () => null, Lifecycle = () => null, Deposit = () => null;
  const exports = load('app/dashboard/invoices/[contractId]/page.tsx', { react: runtime.hooks, 'next/link': Link, 'lucide-react': icons,
    'next/navigation': { useParams: () => ({ contractId: state.contractId }), useSearchParams: () => new URLSearchParams(state.search) },
    '@/components/contract/detail/MonthlyInvoicesSection': Section, '@/components/rental-request/RentalOnboardingPanel': Onboarding, '@/components/rental-request/RentalWorkflowPanel': Workflow,
    '@/components/contract/detail/ContractLifecyclePanel': Lifecycle, '@/components/contract/detail/SettlementPaymentPanel': { DepositAdjustmentPayments: Deposit },
    '@/features/auth/useAuth': { useAuth: () => auth }, '@/utils/apiError': { getApiErrorMessage: () => 'Không mở được' },
    '@/hooks/useAgreementChangeSync': { useAgreementChangeSync },
    '@/services/contract.service': { contractService: { getContract(id) { const call = deferred(); contracts.push({ kind: 'contract', id, ...call }); return call.promise; },
      getRevision(id) { const call = deferred(); contracts.push({ kind: 'revision', id, ...call }); return call.promise; } } },
    '@/lib/contract-routes': load('lib/contract-routes.ts'),
    '@/lib/payment-module': load('lib/payment-module.ts', { '@/lib/invoice-list': load('lib/invoice-list.ts', { '@/lib/contract-routes': load('lib/contract-routes.ts'), '@/lib/invoice-status': load('lib/invoice-status.ts') }), '@/lib/contract-routes': load('lib/contract-routes.ts') }) },
  { ...timers.globals, window }, '\nexports.Gate=ContractInvoicesPage;exports.Body=InvoicesBody;');
  const contract = (over = {}) => ({ id: CONTRACT, contractNumber: 'HD-1', status: 'ACTIVE', landlordId: OWNER, tenantId: RENTER, rentalRequestId: 'rr', ...over });
  return { runtime, auth, contracts, logins, state, Section, Lifecycle, Deposit, exports, contract, timers, document, notifications: notifications.notificationService,
    mountBody(actorId = OWNER, over = {}) { runtime.mount(exports.Body, { actorId, contractId: CONTRACT, section: 'monthly', requestedInvoiceId: 'inv-1', ...over }); },
    mountGate() { runtime.mount(exports.Gate); },
    async answer(over = {}, revision = { charges: [{ chargeType: 'ELECTRICITY', billingMethod: 'PER_KWH' }], meters: { electricityInitial: 4 } }) {
      await runtime.settle(); const pending = contracts.filter(c => !c.done); for (const c of pending) { c.done = true; c.resolve(c.kind === 'contract' ? over.value ?? contract(over) : revision); }
      await runtime.settle(); },
    section: () => flatten(runtime.tree).find(n => n.type === Section) };
}

test('page waits for auth, keeps the full path+query+hash for login and never calls the API signed out or with an unsafe path id', async () => {
  const p = page(); p.auth.initialized = false; p.mountGate(); assert.equal(p.contracts.length, 0);
  p.auth.initialized = true; p.auth.authenticated = false; p.runtime.update(); assert.equal(p.contracts.length, 0);
  flatten(p.runtime.tree).find(n => n.type === 'button').props.onClick();
  assert.deepEqual(p.logins, [`/dashboard/invoices/${CONTRACT}?section=monthly&invoice=inv-1#top`]);
  for (const bad of ['a/../b', '..', 'x y', '', 'a'.repeat(80)]) {
    const q = page({ contractId: bad }); q.state.contractId = bad; q.mountGate(); assert.equal(q.contracts.length, 0, bad);
    assert.match(html(q.runtime), /Không tìm thấy hồ sơ thanh toán/);
  }
});

test('body is keyed by verified account and path contract; ?invoice=/?section= changes only update props (no remount)', () => {
  const p = page(); p.mountGate(); const key = p.runtime.tree.key; assert.equal(key, `${OWNER}:${CONTRACT}`);
  assert.equal(p.runtime.tree.props.requestedInvoiceId, 'inv-1'); assert.equal(p.runtime.tree.props.section, 'monthly');
  p.state.search = 'section=monthly&invoice=inv-2'; p.runtime.update(); assert.equal(p.runtime.tree.key, key); assert.equal(p.runtime.tree.props.requestedInvoiceId, 'inv-2');
  p.state.search = 'section=deposit&invoice=%3Cscript%3E'; p.runtime.update(); assert.equal(p.runtime.tree.key, key);
  assert.equal(p.runtime.tree.props.section, 'deposit'); assert.equal(p.runtime.tree.props.requestedInvoiceId, null, 'unsafe id is never passed on as a usable id');
  assert.equal(p.runtime.tree.props.invalidInvoiceRequest, '<script>', 'but the explicit request stays distinct from no request');
  p.state.search = 'section=monthly&invoice=%20%20'; p.runtime.update(); assert.equal(p.runtime.tree.props.invalidInvoiceRequest, null, 'blank means no request');
  p.state.search = 'section=monthly&invoice=inv-1'; p.runtime.update(); assert.equal(p.runtime.tree.props.invalidInvoiceRequest, null);
  p.state.search = ''; p.runtime.update(); assert.equal(p.runtime.tree.props.section, 'monthly');
  p.auth.userId = 'someone-else'; p.runtime.update(); assert.notEqual(p.runtime.tree.key, key);
  p.state.contractId = 'contract-2'; p.runtime.update(); assert.equal(p.runtime.tree.key, 'someone-else:contract-2');
});

test('sides come from the verified actor and persisted parties, not a stored role; strangers get a neutral state with no section', async () => {
  for (const [actor, landlord, tenant] of [[OWNER, true, false], [RENTER, false, true]]) {
    const p = page(); p.mountBody(actor); await p.answer();
    const section = p.section(); assert.equal(section.props.isLandlord, landlord); assert.equal(section.props.isTenant, tenant);
    assert.equal(section.props.requestedInvoiceId, 'inv-1'); assert.equal(section.props.electricityRequired, true); assert.equal(section.props.initialElectricity, '4');
    assert.ok(flatten(p.runtime.tree).some(n => n.props?.href === `/dashboard/${landlord ? 'landlord' : 'tenant'}/contracts/${CONTRACT}`));
    p.runtime.unmount();
  }
  const stranger = page(); stranger.mountBody('outsider'); await stranger.answer();
  assert.equal(stranger.section(), undefined); assert.match(html(stranger.runtime), /Không tìm thấy hồ sơ thanh toán hoặc bạn không có quyền/);
  assert.doesNotMatch(html(stranger.runtime), /HD-1/);
});

test('a child/amendment contract links to the parent preserving the intended section and invoice', async () => {
  for (const [section, invoice, expected] of [['monthly', 'inv-1', '/dashboard/invoices/root-1?section=monthly&invoice=inv-1'],
    ['deposit', null, '/dashboard/invoices/root-1?section=deposit']]) {
    const p = page(); p.mountBody(OWNER, { section, requestedInvoiceId: invoice }); await p.answer({ parentContractId: 'root-1' });
    assert.ok(flatten(p.runtime.tree).some(n => n.props?.href === expected), expected); assert.equal(p.section(), undefined);
  }
});

test('settlement landing rejects a mismatched root response and never mounts actions without the persisted party identity', async () => {
  for (const over of [{ id: 'foreign-root' }, { landlordId: null, tenantId: null }]) {
    const p = page(); p.mountBody(OWNER, { section: 'deposit' }); await p.answer(over);
    assert.match(html(p.runtime), /Không tìm thấy hồ sơ thanh toán hoặc bạn không có quyền/);
    assert.equal(flatten(p.runtime.tree).filter(n => n.props?.contractId || n.props?.rentalRequestId).length, 0);
    assert.doesNotMatch(html(p.runtime), /HD-1/); p.runtime.unmount();
  }
});

test('parent refreshes after actions share one read and one follow-up; failures keep the page and a late read after unmount is ignored', async () => {
  const p = page(); p.mountBody(); await p.answer(); const calls = () => p.contracts.filter(c => c.kind === 'contract').length; assert.equal(calls(), 1);
  const refresh = p.section().props.onUpdated; const all = Promise.all([refresh(), refresh(), refresh()]);
  await p.runtime.settle(); assert.equal(calls(), 2, 'burst shares one in-flight read');
  p.contracts.filter(c => !c.done).forEach(c => { c.done = true; c.resolve(c.kind === 'contract' ? p.contract({ contractNumber: 'OLD' }) : { charges: [] }); }); await p.runtime.settle();
  assert.equal(calls(), 3, 'one follow-up'); await p.answer({ contractNumber: 'NEW' }); await all;
  assert.match(html(p.runtime), /NEW/); assert.doesNotMatch(html(p.runtime), /OLD/); assert.equal(calls(), 3);
  void refresh(); await p.runtime.settle(); p.contracts.filter(c => !c.done).forEach(c => { c.done = true; c.reject(new Error('down')); }); await p.runtime.settle();
  assert.match(html(p.runtime), /Chưa cập nhật được dữ liệu hợp đồng mới nhất/); assert.ok(p.section(), 'current data stays');
  p.runtime.unmount(); void refresh(); await p.runtime.settle(); assert.equal(calls(), 4, 'stale callbacks after unmount issue no read');
});

test('termination root signal refreshes the invoice page contract status, ignores foreign roots and recovers after hiding', async () => {
  const p = page(); p.mountBody(); await p.answer();
  const calls = () => p.contracts.filter(c => c.kind === 'contract').length;
  assert.equal(p.section().props.contractActive, true);
  p.notifications.notifyAgreementChanged('foreign-root'); await p.timers.advance(250); assert.equal(calls(), 1);
  p.notifications.notifyAgreementChanged(CONTRACT); p.notifications.notifyAgreementChanged(CONTRACT);
  await p.timers.advance(250); assert.equal(calls(), 2); await p.answer({ status: 'TERMINATED' });
  assert.equal(p.section().props.contractActive, false, 'termination controls do not retain an ACTIVE parent snapshot');
  p.document.visibilityState = 'hidden'; p.notifications.notifyAgreementChanged();
  await p.timers.advance(1000); assert.equal(calls(), 2);
  p.document.visibilityState = 'visible'; p.document.fire('visibilitychange'); await p.timers.advance(250); assert.equal(calls(), 3);
  await p.answer({ status: 'TERMINATED' }); await p.timers.advance(60000); assert.equal(calls(), 3, 'no fetch/render loop');
  p.runtime.unmount(); assert.equal(p.timers.size, 0); assert.equal(p.document.listenerCount, 0);
});

test('first load failure is blocking with retry; retry loads the page', async () => {
  const p = page(); p.mountBody(); p.contracts[0].reject(new Error('down')); p.contracts[1].reject(new Error('down')); await p.runtime.settle();
  assert.match(html(p.runtime), /Không mở được/);
  flatten(p.runtime.tree).find(n => n.type === 'button').props.onClick(); await p.runtime.settle();
  assert.equal(p.contracts.length, 4); await p.answer(); assert.ok(p.section());
});
