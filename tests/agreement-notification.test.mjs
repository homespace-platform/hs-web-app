import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, clock, events, service, deferred, plain, Link, html, nullComponent } from './helpers/notification-runtime.mjs';

const TYPES = ['AGREEMENT_REVIEW_READY', 'AGREEMENT_SIGNING_TURN', 'AGREEMENT_FULLY_SIGNED', 'AGREEMENT_SIGNATURE_NEEDS_REVIEW'];
const AMENDMENT_TYPES = ['AMENDMENT_RESPONSE_NEEDED', 'AMENDMENT_DECIDED', 'AMENDMENT_WITHDRAWN', 'AMENDMENT_EXPIRED', 'AMENDMENT_APPLIED'];
const RENEWAL_TYPES = ['RENEWAL_REQUESTED', 'RENEWAL_APPROVED', 'RENEWAL_REJECTED', 'RENEWAL_EXPIRED'];
const TERMINATION_TYPES = ['TERMINATION_RESPONSE_NEEDED', 'TERMINATION_AGREED', 'TERMINATION_DECLINED', 'TERMINATION_WITHDRAWN',
  'TERMINATION_NOTICE_ISSUED', 'TERMINATION_REVIEW_REQUESTED', 'TERMINATION_REVIEW_APPROVED',
  'TERMINATION_NOTICE_CANCELLED', 'TERMINATION_ENDED', 'LEASE_EXPIRED'];

test('agreement tags and scoped signals do not leak into other notification families', () => {
  const api = service();
  for (const type of TYPES) {
    assert.equal(api.isAgreementNotificationType(type), true);
    assert.notEqual(api.getNotificationTag({ category: 'CONTRACT', type }), 'Hợp đồng');
    assert.equal(api.getNotificationTag({ category: 'PAYMENT', type }), 'Thanh toán');
  }
  for (const type of ['AGREEMENT_EARLY_EXIT', 'constructor', '__proto__', null]) {
    assert.equal(api.isAgreementNotificationType(type), false);
    assert.equal(api.getNotificationTag({ category: 'CONTRACT', type }), 'Hợp đồng');
  }
  const seen = [];
  const stop = api.notificationService.subscribe(event => seen.push(event));
  api.notificationService.notifyAgreementChanged('child-1');
  api.notificationService.notifyAgreementChanged();
  stop(); api.notificationService.notifyAgreementChanged('late');
  assert.deepEqual(plain(seen), [{ type: 'agreement-changed', agreementId: 'child-1' }, { type: 'agreement-changed' }]);
});

test('amendment notices have distinct tags and use the authorized root-contract landing', async () => {
  const api = service();
  for (const type of AMENDMENT_TYPES) {
    assert.equal(api.isAmendmentNotificationType(type), true);
    assert.equal(api.isAgreementNotificationType(type), false);
    assert.notEqual(api.getNotificationTag({ category: 'CONTRACT', type }), 'Hợp đồng');
  }
  assert.equal(api.isAmendmentNotificationType('__proto__'), false);
  const owner = landing({ contractId: 'root-1' });
  await owner.answer(child({ id: 'root-1', parentContractId: null, agreementKind: 'LEASE' }));
  assert.deepEqual(owner.routes, ['/dashboard/landlord/contracts/root-1']);
  const stranger = landing({ user: 'stranger', contractId: 'root-1' });
  await stranger.answer(child({ id: 'root-1', parentContractId: null, agreementKind: 'LEASE' }));
  assert.deepEqual(stranger.routes, []);
});

test('renewal decisions have distinct tags and keep signing documents separate', () => {
  const api = service();
  for (const type of RENEWAL_TYPES) {
    assert.equal(api.isRenewalNotificationType(type), true);
    assert.equal(api.isAgreementNotificationType(type), false);
    assert.notEqual(api.getNotificationTag({ category: 'CONTRACT', type }), 'Hợp đồng');
  }
  assert.equal(api.isRenewalNotificationType('__proto__'), false);
});

test('termination decisions have distinct tags and use the authorized root route', async () => {
  const api = service();
  for (const type of TERMINATION_TYPES) {
    assert.equal(api.isTerminationNotificationType(type), true);
    assert.equal(api.isAgreementNotificationType(type), false);
    assert.notEqual(api.getNotificationTag({ category: 'CONTRACT', type }), 'Hợp đồng');
  }
  assert.equal(api.isTerminationNotificationType('__proto__'), false);
  const owner = landing({ contractId: 'root-1' });
  await owner.answer(child({ id: 'root-1', parentContractId: null, agreementKind: 'LEASE' }));
  assert.deepEqual(owner.routes, ['/dashboard/landlord/contracts/root-1']);
  const stranger = landing({ user: 'stranger', contractId: 'root-1' });
  await stranger.answer(child({ id: 'root-1', parentContractId: null, agreementKind: 'LEASE' }));
  assert.deepEqual(stranger.routes, []);
});

const Workflow = () => null;
function landing({ user = 'owner', contractId = 'child-1', documents = [] } = {}) {
  const runtime = hookRuntime(), requests = [], routes = [], documentCalls = [];
  const getContract = id => { const call = deferred(); requests.push({ id, ...call }); return call.promise; };
  const router = { replace: route => routes.push(route) };
  const Component = load('app/dashboard/contracts/[id]/page.tsx', {
    react: runtime.hooks, 'next/link': Link,
    'next/navigation': { useRouter: () => router, useParams: () => ({ id: contractId }), useSearchParams: () => new URLSearchParams() },
    '@/lib/contract-routes': { contractDetailPath: (side, id) => `/dashboard/${side}/contracts/${id}`, invoiceDetailPath: id => `/dashboard/invoices/${id}` },
    '@/lib/payment-module': { safeResourceId: value => typeof value === 'string' && /^[\w-]+$/.test(value) ? value : null },
    '@/services/contract.service': { contractService: { getContract } },
    '@/services/rental-workflow.service': { rentalWorkflowService: { async documents(...args) { documentCalls.push(args); return documents; } } },
    '@/components/rental-request/RentalWorkflowPanel': Workflow,
    '@/features/auth/useAuth': { useAuth: () => ({ initialized: true, authenticated: true, userId: user }) },
  }, { window: { location: { hash: '' } } }, '\nexports.TestLanding=Landing;').TestLanding;
  runtime.mount(Component, { userId: user, contractId });
  return { runtime, requests, routes, documentCalls, answer: async value => { requests.at(-1).resolve(value); await runtime.settle(); } };
}

const child = over => ({ id: 'child-1', landlordId: 'owner', tenantId: 'tenant', parentContractId: 'root-1', agreementKind: 'AMENDMENT', ...over });

test('authorized persisted party opens the exact child; a stranger never redirects', async () => {
  const owner = landing(); await owner.answer(child());
  assert.deepEqual(owner.routes, ['/dashboard/landlord/contracts/child-1']);
  const tenant = landing({ user: 'tenant' }); await tenant.answer(child());
  assert.deepEqual(tenant.routes, ['/dashboard/tenant/contracts/child-1']);
  const stranger = landing({ user: 'stranger' }); await stranger.answer(child());
  assert.deepEqual(stranger.routes, []);
  assert.match(html(stranger.runtime), /không có quyền/);
});

test('historical workflow child outside the early-exit list never redirects or opens a workflow', async () => {
  const view = landing({ documents: [] });
  await view.answer(child({ agreementKind: 'WORKFLOW', rentalRequestId: 'rental-1' }));
  assert.deepEqual(view.routes, []);
  assert.match(html(view.runtime), /hồ sơ của hợp đồng gốc/);
  const bad = landing();
  await bad.answer(child({ agreementKind: 'WORKFLOW', parentContractId: '../other' }));
  assert.deepEqual(bad.routes, []);
  assert.match(html(bad.runtime), /không có quyền/);
});

test('mismatched response id cannot redirect to another agreement', async () => {
  const view = landing(); await view.answer(child({ id: 'other' }));
  assert.deepEqual(view.routes, []);
  assert.match(html(view.runtime), /Không tìm thấy văn bản/);
});

test('early-exit signing landing resolves the exact child from the persisted authorized workflow list for either party', async () => {
  for (const user of ['owner', 'tenant']) {
    const view = landing({ user, documents: [{ signingContractId: 'new-child', current: true }, { signingContractId: 'child-1', current: false }] });
    await view.answer(child({ agreementKind: 'WORKFLOW', rentalRequestId: 'persisted-rental' }));
    assert.deepEqual(view.documentCalls, [['persisted-rental', 'early-exit']]);
    assert.deepEqual(view.routes, [], 'the exact child URL is retained');
    const panel = React.Children.toArray(view.runtime.tree.props.children).find(node => node.type === Workflow);
    assert.deepEqual(plain(panel.props), { rentalRequestId: 'persisted-rental', kind: 'early-exit', contractId: 'root-1', agreementId: 'child-1', focusRequest: true });
    assert.match(html(view.runtime), new RegExp(`/dashboard/${user === 'owner' ? 'landlord' : 'tenant'}/contracts/root-1`));
    view.runtime.unmount();
  }
  const stranger = landing({ user: 'stranger', documents: [{ signingContractId: 'child-1' }] });
  await stranger.answer(child({ agreementKind: 'WORKFLOW', rentalRequestId: 'persisted-rental' }));
  assert.deepEqual(stranger.documentCalls, [], 'ownership is checked before reading a workflow');
  assert.match(html(stranger.runtime), /không có quyền/);
  const unknown = landing({ documents: [{ signingContractId: 'different-child' }] });
  await unknown.answer(child({ agreementKind: 'WORKFLOW', rentalRequestId: 'persisted-rental' }));
  assert.equal(React.Children.toArray(unknown.runtime.tree.props.children).some(node => node.type === Workflow), false, 'never substitute a different signing document');
});

test('early-exit document UI opens the exact requested historical child and never substitutes a newer or foreign document', async () => {
  const Signature = () => null;
  const mount = async (agreementId, pending) => {
    const runtime = hookRuntime(), reads = [], lists = [], updates = [], timers = clock(), notifications = service();
    const document = events({ visibilityState: 'visible' });
    const { useAgreementChangeSync } = load('hooks/useAgreementChangeSync.ts', {
      react: runtime.hooks, '@/services/notification.service': notifications,
    }, { ...timers.globals, document });
    const rows = [{ signingContractId: 'new-child', current: true }, { signingContractId: 'child-1', current: false }];
    const Component = load('components/rental-request/WorkflowDocumentsPanel.tsx', {
      react: runtime.hooks, sonner: { toast: { error() {} } },
      '@/hooks/useAgreementChangeSync': { useAgreementChangeSync },
      '@/services/rental-workflow.service': { rentalWorkflowService: { async documents(...args) { lists.push(args); return lists.length > 1 && pending ? pending.promise : rows; } } },
      '@/services/contract.service': { contractService: {
        async getContract(id) { reads.push(id); return { id }; }, async getSignatureState() { return { smartCaEnabled: false }; },
        async getDocuments() { return [{ id: 'pdf', documentType: 'PDF', status: 'READY', purpose: 'SIGNED_FINAL' }]; },
      } },
      '@/components/contract/detail/SmartCaSignaturePanel': Signature,
      '@/components/contract/detail/ContractPdfViewerModal': nullComponent,
      '@/utils/apiError': { getApiErrorMessage: (_e, fallback) => fallback },
    }, { ...timers.globals, document, window: {} }).default;
    runtime.mount(Component, { rentalRequestId: 'rental', kind: 'early-exit', agreementId,
      data: { revision: 9, status: 'AGREED', role: 'TENANT' }, onUpdated() { updates.push(1); } });
    await runtime.settle();
    return { runtime, reads, lists, updates, timers, document, notifications: notifications.notificationService,
      signature: React.Children.toArray(runtime.tree.props.children).find(node => node.type === Signature) };
  };
  const exact = await mount('child-1');
  assert.deepEqual(exact.lists, [['rental', 'early-exit']]); assert.deepEqual(exact.reads, ['child-1']);
  assert.equal(exact.runtime.tree.props.open, true); assert.equal(exact.signature.props.contract.id, 'child-1');
  assert.equal(exact.signature.props.signingAllowed, false, 'historical PDF cannot be signed as the current revision');
  assert.match(html(exact.runtime), /Xem \/ tải PDF đã ký đủ/);
  exact.notifications.notifyAgreementChanged('foreign-root'); await exact.timers.advance(250); assert.equal(exact.updates.length, 0);
  exact.document.visibilityState = 'hidden';
  exact.notifications.notifyAgreementChanged('child-1'); exact.notifications.notifyAgreementChanged('child-1');
  await exact.timers.advance(1000); assert.equal(exact.updates.length, 0);
  exact.document.visibilityState = 'visible'; exact.document.fire('visibilitychange');
  await exact.timers.advance(250); await exact.runtime.settle();
  assert.equal(exact.updates.length, 1, 'the exact-child signing signal also refreshes the current parent workflow');
  await exact.timers.advance(60000); assert.equal(exact.updates.length, 1, 'the document read never becomes a parent refresh loop');
  const missing = await mount('foreign-child'); assert.deepEqual(missing.reads, []); assert.equal(missing.signature, undefined);
  assert.match(html(missing.runtime), /Không tìm thấy văn bản được chọn/);
  exact.runtime.unmount(); missing.runtime.unmount(); assert.equal(exact.timers.size, 0); assert.equal(exact.document.listenerCount, 0);
  const pending = deferred(), late = await mount('child-1', pending);
  late.notifications.notifyAgreementChanged('child-1'); await late.timers.advance(250); late.runtime.unmount();
  pending.resolve([]); await late.runtime.settle(); assert.equal(late.updates.length, 0, 'an unmounted document cannot refresh the old parent');
});

test('agreement view refreshes only for its document and defers hidden work until visible', async () => {
  const runtime = hookRuntime(), timers = clock(), document = events({ visibilityState: 'visible' });
  const api = service(), seen = [];
  const useAgreementChangeSync = load('hooks/useAgreementChangeSync.ts', {
    react: runtime.hooks, '@/services/notification.service': api,
  }, { ...timers.globals, document }).useAgreementChangeSync;
  runtime.mount(() => { useAgreementChangeSync(id => !id || id === 'child-1', () => seen.push('refresh')); return null; });
  api.notificationService.notifyAgreementChanged('other');
  api.notificationService.notifyAgreementChanged('child-1');
  api.notificationService.notifyAgreementChanged('child-1');
  await timers.advance(249); assert.equal(seen.length, 0);
  await timers.advance(1); await runtime.settle(); assert.equal(seen.length, 1);
  document.visibilityState = 'hidden';
  api.notificationService.notifyAgreementChanged('child-1');
  await timers.advance(1000); assert.equal(seen.length, 1);
  document.visibilityState = 'visible'; document.fire('visibilitychange');
  await timers.advance(250); await runtime.settle(); assert.equal(seen.length, 2);
  runtime.unmount();
  api.notificationService.notifyAgreementChanged('child-1');
  await timers.advance(1000); assert.equal(seen.length, 2);
  assert.equal(timers.size, 0);
});
