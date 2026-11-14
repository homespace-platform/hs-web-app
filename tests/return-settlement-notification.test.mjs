import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, clock, events, service, deferred, plain, nullComponent, icons, Link, html } from './helpers/notification-runtime.mjs';

const ROOT = 'root-1';
const TYPES = ['LEASE_RETURN_CONFIRMED', 'LEASE_RETURN_COMPLETED', 'SETTLEMENT_RESPONSE_NEEDED', 'SETTLEMENT_DISPUTED',
  'SETTLEMENT_PROPOSAL_INVALIDATED', 'SETTLEMENT_AGREED', 'SETTLEMENT_RESPONSE_OVERDUE', 'SETTLEMENT_PAYMENT_OVERDUE', 'LEASE_CLOSED'];
const flatten = node => node == null || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(flatten)];
const text = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join('')
  : typeof node === 'object' ? text(node.props?.children) : String(node);
const route = type => type.startsWith('LEASE_RETURN_') ? `/dashboard/contracts/${ROOT}` : `/dashboard/invoices/${ROOT}?section=deposit`;
const payment = (over = {}) => ({ id: 'refund-1', contractId: ROOT, rentalRequestId: 'rental-1', type: 'INITIAL_PAYMENT_REFUND',
  payerId: 'owner', payeeId: 'tenant', direction: 'LANDLORD_TO_TENANT', totalAmount: 1000000, lineItems: [], evidences: [],
  transferReference: 'REFUND', status: 'AWAITING_TRANSFER', ...over });

function environment() {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), document = events({ title: 'HomeSpace', visibilityState: 'visible' });
  const window = events({ ...timers.globals, confirm: () => true, location: { pathname: '/dashboard/payments', search: '' } });
  const globals = { ...timers.globals, document, window };
  const hooks = load('hooks/useAgreementChangeSync.ts', { react: runtime.hooks, '@/services/notification.service': notifications }, globals);
  return { runtime, timers, notifications, document, window, globals, hooks,
    async signal(method, ...args) { notifications.notificationService[method](...args); await timers.advance(250); await runtime.settle(); } };
}

test('nine root tags and the overdue payment subtype are closed, category-specific sets with safe prototype fallback', () => {
  const api = service();
  const tags = TYPES.map(type => {
    assert.equal(api.isReturnSettlementNotificationType(type), true);
    assert.equal(api.isRoutedPaymentType(type), false);
    assert.equal(api.isAgreementNotificationType(type), false);
    assert.equal(api.getNotificationTag({ category: 'PAYMENT', type }), 'Thanh toán');
    return api.getNotificationTag({ category: 'CONTRACT', type });
  });
  assert.equal(new Set(tags).size, 9); assert.ok(tags.every(tag => tag !== 'Hợp đồng'));
  for (const type of ['constructor', '__proto__', 'toString', 'SETTLEMENT_UNKNOWN', '', null, undefined, 5]) {
    assert.equal(api.isReturnSettlementNotificationType(type), false);
    assert.equal(api.getNotificationTag({ category: 'CONTRACT', type }), 'Hợp đồng');
  }
  assert.equal(api.isRoutedPaymentType('PAYMENT_OBLIGATION_OVERDUE'), true);
  assert.notEqual(api.getNotificationTag({ category: 'PAYMENT', type: 'PAYMENT_OBLIGATION_OVERDUE' }), 'Thanh toán');
  assert.equal(api.getNotificationTag({ category: 'CONTRACT', type: 'PAYMENT_OBLIGATION_OVERDUE' }), 'Hợp đồng');
});

function transport() {
  const f = environment(), handlers = new Map(), signals = [];
  let push;
  const socket = { on(name, fn) { handlers.set(name, fn); }, connect() {}, disconnect() {} };
  const Component = load('components/notification/NotificationTransport.tsx', {
    react: f.runtime.hooks, 'next/link': Link, 'next/navigation': { usePathname: () => '/dashboard/payments' }, 'lucide-react': icons,
    'socket.io-client': { io: () => socket }, '@/features/auth/useAuth': { useAuth: () => ({ initialized: true, authenticated: true, userId: 'owner' }) },
    '@/lib/keycloak': { updateToken: async () => {} }, '@/services/notification.service': f.notifications,
    '@/services/notification-push.service': { startPush: callback => { push = callback; return Promise.resolve(() => {}); } },
  }, { ...f.globals, navigator: { serviceWorker: events() }, CustomEvent: class {}, process: { env: { NEXT_PUBLIC_NOTIFICATION_SOCKET_URL: 'http://socket.test' } } }).default;
  f.runtime.mount(Component);
  const stop = f.notifications.notificationService.subscribe(event => signals.push(event));
  return { ...f, signals, push: () => push(), fire: value => handlers.get('notification:new')(value), cleanup() { f.runtime.unmount(); stop(); } };
}
const notice = (type, over = {}) => ({ id: type, category: 'CONTRACT', type, title: 'Hồ sơ thuê', body: 'Kiểm tra hồ sơ hiện tại', priority: 'NORMAL',
  metadata: { contractId: ROOT }, actionPath: route(type), ...over });

test('all ten frozen types emit the correct signal before the hidden gate and never feed an unread/title loop', async () => {
  const f = transport(); await f.runtime.settle(); f.document.visibilityState = 'hidden';
  const before = f.notifications.calls.length; f.signals.length = 0;
  for (const type of TYPES) f.fire(notice(type));
  f.fire(notice('PAYMENT_OBLIGATION_OVERDUE', { category: 'PAYMENT', metadata: { paymentId: 'refund-1' }, actionPath: '/dashboard/payments?paymentId=refund-1' }));
  assert.deepEqual(plain(f.signals), [...TYPES.map(() => ({ type: 'agreement-changed', agreementId: ROOT })), { type: 'payment-changed', paymentId: 'refund-1' }]);
  assert.equal(f.runtime.tree, null);
  await f.runtime.settle(); assert.equal(f.notifications.calls.length, before);
  await f.timers.advance(150); await f.runtime.settle(); assert.equal(f.notifications.calls.length, before + 1);
  await f.timers.advance(10000); assert.equal(f.notifications.calls.length, before + 1);
  f.cleanup(); assert.equal(f.timers.size, 0); assert.equal(f.document.title, 'HomeSpace');
});

test('visible return/settlement notices retain their exact route; malformed metadata, prototypes and wrong categories never target a root', async () => {
  const f = transport();
  for (const type of TYPES) {
    f.fire(notice(type)); await f.runtime.settle();
    assert.ok(flatten(f.runtime.tree).some(n => n.props?.href === route(type)), type);
  }
  f.signals.length = 0;
  for (const type of ['constructor', '__proto__', 'toString', 'SETTLEMENT_UNKNOWN']) f.fire(notice(type));
  f.fire(notice(TYPES[0], { category: 'PAYMENT' }));
  f.fire(notice('PAYMENT_OBLIGATION_OVERDUE'));
  assert.equal(f.signals.length, 0);
  for (const metadata of [null, {}, { contractId: 3 }]) f.fire(notice(TYPES[0], { metadata }));
  assert.ok(f.signals.every(event => event.type === 'agreement-changed' && !event.agreementId));
  f.cleanup();
});

test('push and focus recovery emit generic root/payment/invoice signals once without a title loop', async () => {
  const f = transport(); await f.runtime.settle();
  f.push(); f.window.fire('focus');
  assert.equal(f.signals.filter(e => e.type === 'agreement-changed' && !e.agreementId).length, 2);
  assert.equal(f.signals.filter(e => e.type === 'payment-changed' && !e.paymentId).length, 2);
  assert.equal(f.signals.filter(e => e.type === 'invoice-changed' && !e.contractId).length, 2);
  await f.timers.advance(150); await f.runtime.settle();
  const count = f.notifications.calls.length; await f.timers.advance(5000); assert.equal(f.notifications.calls.length, count);
  f.cleanup();
});

const PaymentPanel = () => null;
const Money = () => null;
function lifecycle(isLandlord = false) {
  const f = environment(), reads = [], parents = [], accepts = [], disputes = [], uploads = [];
  const Component = load('components/contract/detail/ContractLifecyclePanel.tsx', {
    react: f.runtime.hooks, 'next/link': Link, 'lucide-react': icons, sonner: { toast: { success() {}, error() {} } },
    '@/components/ui/vnd-money-input': Money, '@/hooks/useAgreementChangeSync': f.hooks,
    '@/services/contract-lifecycle.service': { contractLifecycleService: { get(id) { const call = deferred(); reads.push({ id, ...call }); return call.promise; }, accept(...args) { accepts.push(args); return Promise.resolve(); },
      dispute(...args) { disputes.push(args); return Promise.resolve(); } } },
    '@/services/storage.service': { uploadClosureEvidence(file, id) { uploads.push({ file, id }); return Promise.resolve('draft-evidence'); } }, '@/utils/apiError': { getApiErrorMessage: () => 'Offline' },
    '@/lib/contract-routes': load('lib/contract-routes.ts'), '@/lib/invoice-status': { invoicePeriodLabel: () => 'Hóa đơn cuối' },
    './SettlementPaymentPanel': PaymentPanel, './MeterReading': { MeterReadingInput: nullComponent },
    '@/components/payment/DepositLedgerSummary': nullComponent, '@/components/complaint/ComplaintPanel': nullComponent,
    '@/components/rental-request/RentalWorkflowPanel': nullComponent,
  }, f.globals).default;
  f.runtime.mount(Component, { contractId: ROOT, isLandlord, mode: 'settlement', onUpdated: async () => { parents.push('updated'); } });
  return { ...f, reads, parents, accepts, disputes, uploads, nodes: () => flatten(f.runtime.tree),
    button: label => flatten(f.runtime.tree).find(n => n.type === 'button' && text(n) === label),
    async answer(i, over = {}) {
      reads[i].resolve({ serverNow: '2026-11-14T00:00:00Z', endExclusive: '2026-11-01', heldDeposit: 1000000,
        canRequestRenewal: false, canProposeClosure: isLandlord, renewals: [], billing: { allPaid: true, bills: [], canIssueSupplement: isLandlord },
        closure: { status: 'PROPOSED', proposalVersion: 1, refundAmount: 1000000, balanceAmount: 0 }, ...over }); await f.runtime.settle();
    } };
}

test('mounted settlement coalesces root/payment/invoice signals, ignores foreign roots, preserves notes/files and binds consent to proposal version', async () => {
  const f = lifecycle(); await f.answer(0);
  const reason = () => f.nodes().find(n => n.props?.['aria-label'] === 'Lý do khiếu nại quyết toán');
  const consent = () => f.nodes().find(n => n.type === 'input' && n.props.type === 'checkbox');
  const file = { name: 'draft.pdf', size: 100 };
  reason().props.onChange({ target: { value: 'Bản nháp lý do cần đối soát' } });
  f.nodes().find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [file] } });
  consent().props.onChange({ target: { checked: true } }); await f.runtime.settle();
  assert.equal(f.button('Đồng ý quyết toán').props.disabled, false);
  await f.signal('notifyAgreementChanged', 'foreign-root'); await f.signal('notifyInvoiceChanged', 'foreign-root'); assert.equal(f.reads.length, 1);
  const notify = f.notifications.notificationService;
  notify.notifyAgreementChanged(ROOT); notify.notifyPaymentChanged('refund-1'); notify.notifyInvoiceChanged(ROOT, 'final-cost');
  await f.timers.advance(250); assert.equal(f.reads.length, 2);
  await f.answer(1, { closure: { status: 'PROPOSED', proposalVersion: 2 } });
  assert.equal(consent().props.checked, false); assert.equal(f.button('Đồng ý quyết toán').props.disabled, true);
  assert.equal(reason().props.value, 'Bản nháp lý do cần đối soát');
  // Both root invalidation and the existing invoice consequence can arrive in either order.
  await f.signal('notifyInvoiceChanged', ROOT, 'final-cost');
  await f.answer(2, { closure: { status: 'WAITING_HANDOVER', proposalVersion: 3 }, billing: { allPaid: false, bills: [] } });
  assert.equal(f.button('Đồng ý quyết toán'), undefined); assert.equal(f.accepts.length, 0);
  assert.match(html(f.runtime), /Chờ bàn giao và lập đề xuất/);
  await f.signal('notifyAgreementChanged', ROOT); await f.answer(3);
  assert.equal(reason().props.value, 'Bản nháp lý do cần đối soát');
  assert.equal(consent().props.checked, false, 'old consent is never resurrected after a proposal changed');
  const before = f.reads.length; await f.timers.advance(10000); assert.equal(f.reads.length, before); assert.equal(f.parents.length, 4);
  f.button('Gửi yêu cầu đối soát').props.onClick(); await f.runtime.settle();
  assert.equal(f.uploads[0].file, file); assert.equal(f.uploads[0].id, ROOT);
  assert.deepEqual(plain(f.disputes[0]), [ROOT, 1, 'Bản nháp lý do cần đối soát', ['draft-evidence']]);
  await f.answer(4);
  f.runtime.unmount(); assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
});

test('hidden settlement recovery waits once, preserves owner cost/proposal drafts, and late unmounted reads never refresh the parent', async () => {
  const f = lifecycle(true); await f.answer(0);
  const input = label => f.nodes().find(n => n.props?.['aria-label'] === label);
  input('Nội dung quyết toán').props.onChange({ target: { value: 'Nội dung quyết toán đang nhập' } });
  input('Mô tả chi phí bổ sung').props.onChange({ target: { value: 'Chi phí chưa gửi' } }); await f.runtime.settle();
  f.document.visibilityState = 'hidden';
  await f.signal('notifyAgreementChanged'); await f.signal('notifyPaymentChanged'); await f.signal('notifyInvoiceChanged'); assert.equal(f.reads.length, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.reads.length, 2);
  await f.answer(1); assert.equal(input('Nội dung quyết toán').props.value, 'Nội dung quyết toán đang nhập');
  assert.equal(input('Mô tả chi phí bổ sung').props.value, 'Chi phí chưa gửi');
  f.document.fire('visibilitychange'); await f.timers.advance(1000); assert.equal(f.reads.length, 2);
  await f.signal('notifyPaymentChanged'); f.runtime.unmount(); await f.answer(2); assert.equal(f.parents.length, 2);
  assert.equal(f.timers.size, 0);
});

test('settlement read failures keep current state, retry on the next signal, and CLOSED describes only deposit settlement', async () => {
  const f = lifecycle(); await f.answer(0);
  await f.signal('notifyPaymentChanged', 'new-obligation'); f.reads[1].reject(new Error('offline')); await f.runtime.settle();
  assert.match(html(f.runtime), /Offline/); assert.ok(f.button('Đồng ý quyết toán'));
  await f.timers.advance(10000); assert.equal(f.reads.length, 2);
  await f.signal('notifyAgreementChanged'); await f.answer(2, { heldDeposit: 0, closure: { status: 'CLOSED', proposalVersion: 2 } });
  assert.match(html(f.runtime), /hoàn tất quyết toán cọc/); assert.doesNotMatch(html(f.runtime), /hoàn tất nghĩa vụ|Đồng ý quyết toán/);
  f.runtime.unmount();
});

function adjustment() {
  const f = environment(), reads = [];
  const Component = load('components/contract/detail/SettlementPaymentPanel.tsx', {
    react: f.runtime.hooks, 'next/image': nullComponent, sonner: { toast: { success() {}, error() {} } },
    '@/components/payment/PaymentReceiptActions': nullComponent, '@/components/payment/PaymentDisputePanel': nullComponent,
    '@/services/payment-request.service': { getContractPayments(id) { const call = deferred(); reads.push({ id, ...call }); return call.promise; } },
    '@/services/storage.service': {}, '@/utils/apiError': { getApiErrorMessage: () => 'Offline' }, '@/hooks/useAgreementChangeSync': f.hooks,
  }, f.globals).DepositAdjustmentPayments;
  f.runtime.mount(Component, { contractId: ROOT, isLandlord: true });
  return { ...f, reads, async answer(i, rows) { reads[i].resolve(rows); await f.runtime.settle(); } };
}

test('deposit adjustments refresh their authorized collection for new payments, root/generic recovery, both directions and hidden bursts', async () => {
  const f = adjustment();
  const rows = [payment({ type: 'DEPOSIT_ADJUSTMENT' }), payment({ id: 'topup', type: 'DEPOSIT_ADJUSTMENT', direction: 'TENANT_TO_LANDLORD' }),
    payment({ id: 'monthly', type: 'MONTHLY_RENT' }), payment({ id: 'foreign', type: 'DEPOSIT_ADJUSTMENT', contractId: 'foreign-root' })];
  await f.answer(0, rows);
  assert.equal(flatten(f.runtime.tree).filter(n => n.props?.payment).length, 2);
  await f.signal('notifyAgreementChanged', 'foreign-root'); assert.equal(f.reads.length, 1);
  f.document.visibilityState = 'hidden'; await f.signal('notifyAgreementChanged', ROOT); await f.signal('notifyPaymentChanged', 'new-id');
  assert.equal(f.reads.length, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.reads.length, 2);
  await f.answer(1, rows.map(p => ({ ...p, status: 'CONFIRMED' })));
  assert.ok(flatten(f.runtime.tree).filter(n => n.props?.payment).every(n => n.props.payment.status === 'CONFIRMED'));
  await f.signal('notifyPaymentChanged'); assert.equal(f.reads.length, 3);
  f.runtime.unmount(); await f.answer(2, []); assert.equal(flatten(f.runtime.tree).filter(n => n.props?.payment).length, 2);
  assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
});

function modal(actor = 'owner') {
  const f = environment(), auth = { profile: { id: actor } }, reads = [], reports = [], updates = [], toasts = [], sessions = [];
  const Component = load('components/rental-request/RentalPaymentModal.tsx', {
    react: f.runtime.hooks, 'lucide-react': icons, sonner: { toast: { success: message => toasts.push(message), error: message => toasts.push(message) } },
    qrcode: { toDataURL: async () => 'data:qr' }, '@/features/auth/useAuth': { useAuth: () => auth },
    '@/services/payment-request.service': { getPaymentRequest(id) { const call = deferred(); reads.push({ id, ...call }); return call.promise; },
      reportTransfer(...args) { const call = deferred(); reports.push({ args, ...call }); return call.promise; },
      createProofUploadSession(id) { sessions.push(id); return Promise.resolve({ sessionId: 'session-1', uploadPageUrl: 'https://proof.test/session', expiresAt: '2099-01-01T00:00:00Z' }); },
      getProofUploadSessionStatus: async () => ({ status: 'AWAITING_UPLOAD' }) },
    '@/services/storage.service': { uploadPaymentProof: async () => 'proof-id' }, '@/utils/apiError': { getApiErrorMessage: error => error.message },
    '@/components/payment/PaymentDisputePanel': nullComponent, '@/components/complaint/ComplaintPanel': nullComponent,
    '@/lib/payment-transfer-presentation': load('lib/payment-transfer-presentation.ts'), '@/hooks/useAgreementChangeSync': f.hooks,
  }, f.globals, '\nexports.Scoped=ScopedPaymentModal;');
  const props = { request: { id: 'rental-1' }, paymentId: 'refund-1', isOpen: true, onClose() {}, onPaymentSuccess: value => updates.push(value) };
  return { ...f, auth, reads, reports, updates, toasts, sessions, Component, props,
    mount() { f.runtime.mount(Component.Scoped, props); },
    nodes: () => flatten(f.runtime.tree), button: label => flatten(f.runtime.tree).find(n => n.type === 'button' && text(n).includes(label)),
    async answer(i, over = {}) { reads[i].resolve(payment(over)); await f.runtime.settle(); } };
}

test('selected payment modal keys account/request/payment, denies missing or foreign identity and wrong payment/rental responses', async () => {
  const f = modal(); f.runtime.mount(f.Component.default, f.props); const first = f.runtime.tree.key;
  f.auth.profile.id = 'tenant'; f.runtime.update(f.props); assert.notEqual(f.runtime.tree.key, first);
  f.runtime.update({ ...f.props, paymentId: 'refund-2' }); assert.notEqual(f.runtime.tree.key, first);
  f.auth.profile = null; f.runtime.update(f.props); assert.equal(f.runtime.tree, null); assert.equal(f.reads.length, 0);
  f.runtime.unmount();
  for (const [actor, response] of [['outsider', {}], ['owner', { id: 'foreign' }], ['owner', { rentalRequestId: 'foreign' }]]) {
    const denied = modal(actor); denied.mount(); await denied.answer(0, response);
    assert.doesNotMatch(html(denied.runtime), /REFUND|Tôi đã chuyển khoản/); assert.equal(denied.reports.length, 0); denied.runtime.unmount();
  }
});

test('selected payment modal live refresh preserves proof, coalesces hidden recovery, updates counterparty state and ignores late action callbacks', async () => {
  const f = modal(); f.mount(); await f.answer(0);
  f.button('Tôi đã chuyển khoản').props.onClick(); await f.runtime.settle();
  const file = { name: 'proof.pdf', type: 'application/pdf', size: 100 };
  f.nodes().find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [file] } }); await f.runtime.settle();
  await f.signal('notifyPaymentChanged', 'foreign'); assert.equal(f.reads.length, 1);
  f.document.visibilityState = 'hidden'; await f.signal('notifyPaymentChanged', 'refund-1'); await f.signal('notifyPaymentChanged'); assert.equal(f.reads.length, 1);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250); assert.equal(f.reads.length, 2);
  await f.answer(1); assert.match(html(f.runtime), /proof.pdf/);
  void f.nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await f.runtime.settle();
  assert.deepEqual(plain(f.reports[0].args), ['refund-1', { expectedAmount: 1000000, proofStorageId: 'proof-id' }]);
  f.runtime.unmount(); f.reports[0].resolve(payment({ status: 'TRANSFER_REPORTED' })); await f.runtime.settle();
  assert.equal(f.updates.length, 0); assert.equal(f.toasts.length, 0); assert.equal(f.timers.size, 0);
  const live = modal(); live.mount(); await live.answer(0); await live.signal('notifyPaymentChanged', 'refund-1');
  await live.answer(1, { status: 'CONFIRMED' }); assert.equal(live.button('Tôi đã chuyển khoản'), undefined);
  await live.signal('notifyPaymentChanged'); live.runtime.unmount(); await live.answer(2, { status: 'AWAITING_TRANSFER' });
  assert.equal(live.button('Tôi đã chuyển khoản'), undefined); assert.equal(live.timers.size, 0);
});

test('a live payment signal keeps the mobile proof session and does not create another session or notification loop', async () => {
  const f = modal(); f.mount(); await f.answer(0);
  f.button('Tôi đã chuyển khoản').props.onClick(); await f.runtime.settle();
  f.button('Tải chứng từ từ điện thoại').props.onClick(); await f.runtime.settle();
  assert.match(html(f.runtime), /https:\/\/proof.test\/session/); assert.deepEqual(f.sessions, ['refund-1']);
  await f.signal('notifyPaymentChanged'); await f.answer(1);
  assert.match(html(f.runtime), /https:\/\/proof.test\/session/); assert.deepEqual(f.sessions, ['refund-1']);
  await f.timers.advance(5000); await f.runtime.settle(); assert.equal(f.reads.length, 2);
  f.runtime.unmount(); assert.equal(f.timers.size, 0);
});

function settlementPayment(over = {}, isLandlord = true) {
  const f = environment(), reads = [], uploads = [], reports = [], parents = [], errors = [];
  const Component = load('components/contract/detail/SettlementPaymentPanel.tsx', {
    react: f.runtime.hooks, 'next/image': nullComponent, sonner: { toast: { success() {}, error: error => errors.push(error) } },
    '@/components/payment/PaymentReceiptActions': nullComponent, '@/components/payment/PaymentDisputePanel': nullComponent,
    '@/hooks/useAgreementChangeSync': f.hooks, '@/utils/apiError': { getApiErrorMessage: error => error.message },
    '@/services/storage.service': { uploadPaymentProof(file, id) { uploads.push({ file, id }); return Promise.resolve('proof-id'); } },
    '@/services/payment-request.service': { getPaymentRequest(id) { const call = deferred(); reads.push({ id, ...call }); return call.promise; },
      reportTransfer(...args) { const call = deferred(); reports.push({ args, ...call }); return call.promise; } },
  }, f.globals).default;
  const props = { payment: payment(over), isLandlord, refresh: async () => { parents.push('refreshed'); } };
  f.runtime.mount(Component, props);
  return { ...f, props, reads, uploads, reports, parents, errors, nodes: () => flatten(f.runtime.tree),
    button: label => flatten(f.runtime.tree).find(n => n.type === 'button' && text(n) === label) };
}

test('refund and adjustment actions use stored direction for payer/receipt, retain drafts and recheck the exact amount before proof upload', async () => {
  for (const type of ['INITIAL_PAYMENT_REFUND', 'DEPOSIT_ADJUSTMENT']) for (const refund of [true, false]) {
    const f = settlementPayment({ type, direction: refund ? 'LANDLORD_TO_TENANT' : 'TENANT_TO_LANDLORD', payerId: refund ? 'owner' : 'tenant', payeeId: refund ? 'tenant' : 'owner' }, refund);
    const file = { name: 'draft.pdf', size: 100 };
    f.nodes().find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [file] } }); await f.runtime.settle();
    f.runtime.update({ ...f.props, payment: { ...f.props.payment, status: 'REJECTED' } });
    f.button('Tôi đã chuyển khoản').props.onClick(); await f.runtime.settle();
    f.reads[0].resolve({ ...f.props.payment, status: 'REJECTED' }); await f.runtime.settle();
    assert.equal(f.uploads[0].file, file); assert.equal(f.uploads[0].id, 'refund-1');
    assert.deepEqual(plain(f.reports[0].args), ['refund-1', { proofStorageId: 'proof-id', expectedAmount: 1000000 }]);
    f.runtime.unmount(); f.reports[0].resolve(payment({ status: 'TRANSFER_REPORTED' })); await f.runtime.settle(); assert.equal(f.parents.length, 0);
    const recipient = settlementPayment({ type, direction: refund ? 'LANDLORD_TO_TENANT' : 'TENANT_TO_LANDLORD', status: 'TRANSFER_REPORTED' }, !refund);
    assert.ok(recipient.button('Xác nhận đã nhận tiền')); assert.equal(recipient.button('Tôi đã chuyển khoản'), undefined);
    const reason = () => recipient.nodes().find(n => n.props?.['aria-label'] === 'Lý do từ chối chứng từ');
    reason().props.onChange({ target: { value: 'Nội dung từ chối đang nhập' } }); await recipient.runtime.settle();
    recipient.runtime.update({ ...recipient.props, payment: { ...recipient.props.payment, rejectedReason: 'Thay đổi từ đối tác' } });
    assert.equal(reason().props.value, 'Nội dung từ chối đang nhập');
    recipient.runtime.update({ ...recipient.props, payment: { ...recipient.props.payment, status: 'CONFIRMED' } });
    assert.equal(recipient.button('Xác nhận đã nhận tiền'), undefined); recipient.runtime.unmount();
  }
});

test('changed payment identity/amount or an unmounted proof check uploads nothing and never submits a stale report', async () => {
  for (const changed of [{ totalAmount: 2000000 }, { payerId: 'foreign' }, { id: 'foreign' }, { status: 'CONFIRMED' }, null]) {
    const f = settlementPayment();
    f.nodes().find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [{ name: 'proof.pdf', size: 100 }] } });
    await f.runtime.settle(); f.button('Tôi đã chuyển khoản').props.onClick(); await f.runtime.settle();
    if (!changed) f.runtime.unmount();
    f.reads[0].resolve({ ...f.props.payment, ...changed }); await f.runtime.settle();
    assert.equal(f.uploads.length, 0); assert.equal(f.reports.length, 0); assert.equal(f.parents.length, 0);
    if (changed) { assert.equal(f.errors.length, 1); f.runtime.unmount(); }
  }
});
