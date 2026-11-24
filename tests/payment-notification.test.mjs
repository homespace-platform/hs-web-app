import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, clock, events, service, deferred, nullComponent, icons, Link, html } from './helpers/notification-runtime.mjs';

const ID = 'cb856b21-5fbf-4d33-b7f7-fd54d5ce7867';
const OTHER = '82a1fb41-2882-4dc3-b6e7-eb5fbb9f9d2e';
const types = ['PAYMENT_REQUEST_CREATED', 'PAYMENT_OBLIGATION_OVERDUE', 'PAYMENT_TRANSFER_REPORTED', 'PAYMENT_RECEIPT_CONFIRMED', 'PAYMENT_RECEIPT_REJECTED',
  'PAYMENT_REFUND_AUTO_CONFIRM_SOON', 'PAYMENT_RECEIPT_AUTO_CONFIRM_SOON', 'PAYMENT_RECEIPT_AUTO_CONFIRMED'];
const flatten = node => node == null || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(flatten)];
const row = (id = ID, status = 'REJECTED') => ({ id, status, type: 'INITIAL_PAYMENT_REFUND', payerId: 'owner', payeeId: 'tenant',
  totalAmount: 3000000, transferReference: 'TESTREF', lineItems: [], direction: 'LANDLORD_TO_TENANT' });
const Panel = () => null;

function fixture() {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), requests = [], logins = [], focused = [];
  const document = events({ visibilityState: 'visible', querySelectorAll: () => [ID, OTHER].map(id => ({ dataset: { paymentId: id },
    scrollIntoView() { focused.push(`scroll:${id}`); }, focus() { focused.push(id); } })) });
  const auth = { initialized: true, authenticated: true, userId: 'owner', login: path => logins.push(path) };
  let search = `paymentId=${ID}`;
  const window = { location: { pathname: '/dashboard/payments', search: `?${search}`, hash: '#detail' }, ...timers.globals };
  const mocks = { react: runtime.hooks, 'next/link': Link, 'next/navigation': { useSearchParams: () => new URLSearchParams(search) },
    'lucide-react': icons, sonner: { toast: { success() {} } }, '@/hooks/usePermission': { useFeatureGate: () => ({ allowed: true, title: undefined, guard: () => true }), usePermission: () => true }, '@/lib/permissions': { PERMISSIONS: new Proxy({}, { get: (_, key) => key }) }, '@/features/auth/useAuth': { useAuth: () => auth },
    '@/services/notification.service': notifications,
    '@/components/contract/detail/SettlementPaymentPanel': Panel,
    '@/lib/contract-routes': load('lib/contract-routes.ts'), '@/lib/payment-transfer-presentation': load('lib/payment-transfer-presentation.ts'),
    '@/services/payment-request.service': { getMyPaymentRequests() { const call = deferred(); requests.push(call); return call.promise; } } };
  const exports = load('app/dashboard/payments/page.tsx', mocks, { ...timers.globals, document, window },
    '\nexports.Gate=PaymentsGate;exports.Body=PaymentsBody;');
  return { runtime, timers, document, requests, logins, auth, focused, notifications: notifications.notificationService,
    mountBody(targetId = ID, invalidTarget = false, actorId = 'owner') { runtime.mount(exports.Body, { targetId, invalidTarget, actorId }); },
    mountGate() { runtime.mount(exports.Gate); },
    setQuery(id) { search = `paymentId=${id}`; runtime.update(); },
    select(id) { runtime.update({ targetId: id, invalidTarget: false, actorId: 'owner' }); },
    resolve(i, rows = [row()]) { requests[i].resolve(rows); } };
}

test('all 5 routed payment tags are distinct, while legacy and prototype names keep fallback', () => {
  const api = service();
  for (const type of types) {
    assert.equal(api.isRoutedPaymentType(type), true);
    assert.notEqual(api.getNotificationTag({ category: 'PAYMENT', type }), 'Thanh toán');
  }
  for (const type of ['PAYMENT_SUCCESSFUL', 'MEMBERSHIP_ACTIVATED', 'constructor', '__proto__', null]) assert.equal(api.isRoutedPaymentType(type), false);
  assert.equal(api.getNotificationTag({ category: 'PAYMENT', type: 'PAYMENT_SUCCESSFUL' }), 'Thanh toán');
});

test('payment gate waits for auth, preserves full login return, keys by account but not selected payment', () => {
  const f = fixture(); f.auth.initialized = false; f.mountGate(); assert.equal(f.requests.length, 0);
  f.auth.initialized = true; f.auth.authenticated = false; f.runtime.update(); assert.equal(f.requests.length, 0);
  flatten(f.runtime.tree).find(n => n.type === 'button').props.onClick();
  assert.deepEqual(f.logins, [`/dashboard/payments?paymentId=${ID}#detail`]);
  f.auth.authenticated = true; f.runtime.update(); const first = f.runtime.tree.key;
  f.setQuery(OTHER); assert.equal(f.runtime.tree.key, first); assert.equal(f.runtime.tree.props.targetId, OTHER);
  f.auth.userId = 'new-owner'; f.runtime.update(); assert.notEqual(f.runtime.tree.key, first); f.runtime.unmount();
});

test('landing selects terminal refund rows from authorized list without another fetch and handles unknown ids neutrally', async () => {
  const f = fixture(); f.mountBody(); f.resolve(0, [row(ID, 'CONFIRMED'), row(OTHER, 'CANCELLED')]); await f.runtime.settle();
  assert.ok(flatten(f.runtime.tree).find(n => n.props?.['data-payment-id'] === ID)?.props['aria-current']);
  assert.ok(f.focused.includes(ID)); f.select(OTHER); assert.equal(f.requests.length, 1); assert.ok(f.focused.includes(OTHER));
  f.select('unknown'); assert.match(html(f.runtime), /Không tìm thấy yêu cầu chuyển khoản/); assert.equal(f.requests.length, 1);
  f.runtime.unmount();
});

test('payment notices coalesce, share the initial GET, and perform one fresh follow-up after an older response', async () => {
  const f = fixture(); f.mountBody();
  for (let i = 0; i < 20; i++) f.notifications.notifyPaymentChanged(ID);
  await f.timers.advance(250); assert.equal(f.requests.length, 1);
  f.resolve(0, [row(ID, 'TRANSFER_REPORTED')]); await f.runtime.settle(); assert.equal(f.requests.length, 2);
  f.resolve(1, [row(ID, 'CONFIRMED')]); await f.runtime.settle();
  assert.match(html(f.runtime), /Đã xác nhận/); await f.timers.advance(10000); assert.equal(f.requests.length, 2);
  f.runtime.unmount(); assert.equal(f.timers.size, 0); assert.equal(f.document.listenerCount, 0);
});

test('hidden-during-debounce and hidden-after-inflight both defer recovery until visible', async () => {
  const f = fixture(); f.mountBody(); f.resolve(0); await f.runtime.settle();
  f.notifications.notifyPaymentChanged(ID); f.document.visibilityState = 'hidden'; await f.timers.advance(250);
  assert.equal(f.requests.length, 1); f.document.visibilityState = 'visible'; f.document.fire('visibilitychange');
  await f.timers.advance(250); assert.equal(f.requests.length, 2);
  f.notifications.notifyPaymentChanged(ID); await f.timers.advance(250); f.document.visibilityState = 'hidden';
  f.resolve(1); await f.runtime.settle(); assert.equal(f.requests.length, 2);
  f.document.visibilityState = 'visible'; f.document.fire('visibilitychange'); await f.timers.advance(250);
  assert.equal(f.requests.length, 3); f.resolve(2); await f.runtime.settle(); f.runtime.unmount();
});

test('a failed old GET still honors a pending notice and later background errors keep existing cards', async () => {
  const f = fixture(); f.mountBody(); f.notifications.notifyPaymentChanged(ID); await f.timers.advance(250);
  f.requests[0].reject(new Error('old read failed')); await f.runtime.settle(); assert.equal(f.requests.length, 2);
  f.resolve(1); await f.runtime.settle();
  f.notifications.notifyPaymentChanged(ID); await f.timers.advance(250); f.requests[2].reject(new Error('offline')); await f.runtime.settle();
  assert.match(html(f.runtime), /Chưa cập nhật được dữ liệu/);
  assert.equal(flatten(f.runtime.tree).filter(n => n.type === Panel).length, 1); f.runtime.unmount();
});

test('silent action refresh keeps stable card keys and panel mounted; late old-account reads stop on cleanup', async () => {
  const f = fixture(); f.mountBody(); f.resolve(0, [row(), row(OTHER)]); await f.runtime.settle();
  const keys = flatten(f.runtime.tree).filter(n => n.props?.['data-payment-id']).map(n => n.key);
  const panel = flatten(f.runtime.tree).find(n => n.type === Panel); void panel.props.onUpdated();
  assert.equal(flatten(f.runtime.tree).filter(n => n.type === Panel).length, 2);
  f.resolve(1, [row(ID, 'CONFIRMED'), row(OTHER)]); await f.runtime.settle();
  assert.deepEqual(flatten(f.runtime.tree).filter(n => n.props?.['data-payment-id']).map(n => n.key), keys);
  f.notifications.notifyPaymentChanged(); await f.timers.advance(250); f.runtime.unmount();
  f.resolve(2); await f.runtime.settle(); assert.equal(f.requests.length, 3); assert.equal(f.timers.size, 0);
});

test('payment landing routes each stored party to its actual rental, invoice or contract action flow including reversed refunds', async () => {
  const cases = [
    [{ ...row(), rentalRequestId: OTHER }, 'owner', `/dashboard/rental-requests?requestId=${OTHER}`],
    [{ ...row(), rentalRequestId: OTHER }, 'tenant', `/dashboard/rental-requests/my-requests?requestId=${OTHER}`],
    [{ ...row(), type: 'INITIAL', direction: 'TENANT_TO_LANDLORD', payerId: 'tenant', payeeId: 'owner', rentalRequestId: OTHER },
      'owner', `/dashboard/rental-requests?requestId=${OTHER}`],
    [{ ...row(), type: 'MONTHLY_RENT', contractId: OTHER }, 'owner', `/dashboard/invoices/${OTHER}`],
    [{ ...row(), type: 'OTHER_CHARGE', contractId: OTHER, invoiceId: 'monthly-invoice' }, 'owner', `/dashboard/invoices/${OTHER}`],
    [{ ...row(), type: 'DEPOSIT_REFUND', contractId: OTHER }, 'owner', `/dashboard/invoices/${OTHER}?section=deposit`],
    [{ ...row(), type: 'DEPOSIT_ADJUSTMENT', contractId: OTHER, invoiceId: 'amendment' }, 'tenant', `/dashboard/invoices/${OTHER}?section=deposit`],
    [{ ...row(), type: 'OTHER_CHARGE', contractId: OTHER, direction: 'TENANT_TO_LANDLORD', payerId: 'tenant', payeeId: 'owner' }, 'owner', `/dashboard/invoices/${OTHER}?section=deposit`],
  ];
  for (const [payment, actor, expected] of cases) {
    const f = fixture(); f.mountBody(ID, false, actor); f.resolve(0, [payment]); await f.runtime.settle();
    assert.ok(flatten(f.runtime.tree).some(n => n.props?.href === expected), `${actor}: ${expected}`); f.runtime.unmount();
  }
  const f = fixture(); f.mountBody(ID, false, 'outsider'); f.resolve(0, [{ ...row(), rentalRequestId: OTHER }]); await f.runtime.settle();
  assert.equal(flatten(f.runtime.tree).filter(n => n.props?.href?.includes('requestId=')).length, 0); f.runtime.unmount();
});

test('refund actions open on demand from the authorized list, preserve cancellation links and clear on selection/account boundaries', async () => {
  for (const actor of ['owner', 'tenant']) {
    const f = fixture(); f.mountBody(ID, false, actor); f.resolve(0, [{ ...row(), rentalRequestId: OTHER }, row(OTHER)]); await f.runtime.settle();
    assert.match(html(f.runtime), /Hoàn tiền/); assert.doesNotMatch(html(f.runtime), /Hoàn khoản thanh toán ban đầu/);
    const actions = () => flatten(f.runtime.tree).filter(n => n.props?.refresh);
    assert.equal(actions().length, 0, 'the list does not mount every refund action panel');
    flatten(f.runtime.tree).find(n => n.type === 'button' && n.props.children === 'Mở thao tác hoàn tiền').props.onClick(); await f.runtime.settle();
    assert.equal(actions().length, 1); assert.equal(actions()[0].props.payment.id, ID); assert.equal(actions()[0].props.isLandlord, actor === 'owner');
    assert.ok(actions()[0].key.endsWith(`${actor}=2${ID}`)); assert.equal(f.requests.length, 1, 'opening has no extra cause lookup');
    const expected = actor === 'owner' ? '/dashboard/rental-requests?' : '/dashboard/rental-requests/my-requests?';
    assert.ok(flatten(f.runtime.tree).some(n => n.props?.href?.startsWith(expected)), 'ordinary cancellation destination remains available');
    f.runtime.update({ actorId: actor, targetId: OTHER, invalidTarget: false }); assert.equal(actions().length, 0);
    f.runtime.unmount();
  }
  for (const actor of ['outsider', '']) {
    const f = fixture(); f.mountBody(ID, false, actor); f.resolve(0, [row()]); await f.runtime.settle();
    assert.match(html(f.runtime), /Không tìm thấy yêu cầu chuyển khoản/);
    assert.equal(flatten(f.runtime.tree).filter(n => n.props?.payment || n.props?.['data-payment-id']).length, 0); f.runtime.unmount();
  }
});
