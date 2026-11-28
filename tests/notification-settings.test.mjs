import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, icons, html } from './helpers/notification-runtime.mjs';

const CATEGORIES = ['LISTING', 'CONTRACT', 'PAYMENT', 'APPOINTMENT', 'RENTAL_REQUEST', 'ACCOUNT', 'SYSTEM', 'NEWS'];

async function render(items) {
  const service = load('services/notification.service.ts', {
    '@/lib/axios-client': {}, '@/types/notification.type': { NOTIFICATION_CATEGORIES: CATEGORIES },
  });
  const runtime = hookRuntime();
  const Component = load('components/settings/sections/NotificationsSection.tsx', {
    react: runtime.hooks, 'lucide-react': icons, sonner: { toast: {} },
    '@/components/ui/switch': { Switch: ({ checked, disabled, ...p }) =>
      React.createElement('input', { type: 'checkbox', readOnly: true, checked, disabled, ...p }) },
    '@/components/ui/button': { Button: ({ children }) => React.createElement('button', null, children) },
    '@/components/common/PolicyDialog': { PolicyNotice: () => null },
    '@/features/auth/useAuth': { useAuth: () => ({ authenticated: true, initialized: true, userId: 'u', login() {} }) },
    '@/services/notification.service': { __esModule: true, ...service, default: { getPreferences: async () => items } },
    '@/services/notification-push.service': { disablePush() {}, enablePush() {}, getPushStatus: () => 'disabled',
      isPushConfigured: () => false, isPushOptedIn: () => false },
    '@/utils/apiError': { getApiErrorMessage: () => 'x' },
  }, { window: { addEventListener() {}, removeEventListener() {} }, Notification: { permission: 'default' } }).default;
  runtime.mount(Component);
  await runtime.settle();
  return html(runtime);
}

test('email toggle is enabled only for SYSTEM, PAYMENT and CONTRACT, with server values and notes', async () => {
  // Server effective values: CONTRACT/PAYMENT email ON by default, others off.
  const markup = await render(CATEGORIES.map(category => ({ category, push: true, email: ['CONTRACT', 'PAYMENT'].includes(category) })));
  const email = Object.fromEntries([...markup.matchAll(/<input[^>]*>/g)].map(m => m[0])
    .filter(tag => tag.includes(' - Email'))
    .map(tag => [tag.match(/aria-label="([^"]*) - Email"/)[1], { disabled: /disabled=""/.test(tag), checked: /checked=""/.test(tag) }]));
  const open = Object.keys(email).filter(k => !email[k].disabled);
  assert.equal(open.length, 3, JSON.stringify(email));
  for (const title of ['Thanh toán &amp; Hóa đơn', 'Hợp đồng thuê &amp; Đặt cọc']) assert.ok(open.includes(title) && email[title].checked, title);
  assert.equal(markup.match(/Sắp có/g)?.length, CATEGORIES.length - 3);
  assert.match(markup, /Biên nhận thanh toán luôn được gửi qua email kèm file PDF\./);
  assert.match(markup, /Khi hợp đồng thuê ký xong, email kèm PDF hợp đồng thuê và hợp đồng cọc\./);
});
