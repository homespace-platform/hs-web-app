import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { popupMocks, load, hookRuntime, clock, events, service, icons, Link, html } from './helpers/notification-runtime.mjs';

function transport(conversations = []) {
  const runtime = hookRuntime(), timers = clock(), notifications = service(), handlers = new Map();
  const document = events({ title: 'HomeSpace', visibilityState: 'visible' });
  const window = events({ dispatchEvent() {} });
  let userId = 'alice';
  const socket = { connected: true, on(name, callback) { handlers.set(name, callback); },
    connect() { return socket; }, disconnect() { return socket; } };
  const Component = load('components/notification/NotificationTransport.tsx', {
    ...popupMocks(notifications, conversations),
    react: runtime.hooks, 'next/link': Link, 'next/navigation': { usePathname: () => '/settings/notifications' },
    'lucide-react': icons, 'socket.io-client': { io: () => socket },
    '@/features/auth/useAuth': { useAuth: () => ({ initialized: true, authenticated: true, userId }) },
    '@/lib/keycloak': { token: 'test-token', updateToken: async () => {} },
    '@/services/notification.service': notifications,
    '@/services/notification-push.service': { startPush: async () => () => {} },
  }, { ...timers.globals, document, window, navigator: { serviceWorker: events() },
    process: { env: { NEXT_PUBLIC_NOTIFICATION_SOCKET_URL: 'http://socket.test' } }, CustomEvent: class {} }).default;
  runtime.mount(Component);
  const signals = [];
  const stop = notifications.notificationService.subscribe(event => signals.push(event));
  return { runtime, timers, notifications, signals, document,
    fire: value => handlers.get('notification:new')(value),
    alert: value => handlers.get('chat:alert')(value),
    chatHandler: () => handlers.get('chat:alert'),
    switchUser(value) { userId = value; runtime.update(); },
    cleanup() { runtime.unmount(); stop(); } };
}

test('backend chat alerts show a generic direct-chat popup once, with no feed refresh', async () => {
  const f = transport();
  try {
    await f.runtime.settle();
    const before = f.notifications.calls.length;
    const alert = { eventId: 'event-1', conversationId: 'room/one', messageId: 'message-1' };
    f.alert(alert); f.alert(alert);
    await f.runtime.settle();
    const markup = html(f.runtime);
    assert.equal((markup.match(/Có tin nhắn mới/g) ?? []).length, 1);
    assert.match(markup, /\/chat\?channel=direct&amp;conversationId=room%2Fone/);
    assert.match(markup, /Mở trò chuyện/);
    assert.doesNotMatch(markup, /message-1|event-1|Xem thông báo/);
    await f.timers.advance(150);
    assert.equal(f.notifications.calls.length, before);
    await f.timers.advance(8_000); await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
  } finally { f.cleanup(); }
});

test('chat alerts reject malformed events and clear old account popups and listeners', async () => {
  const f = transport();
  try {
    const alert = { eventId: 'event-1', conversationId: 'room-1', messageId: 'message-1' };
    for (const value of [null, {}, { ...alert, messageId: '' }, { ...alert, conversationId: 42 },
      { ...alert, conversationId: 'a'.repeat(500) }]) f.alert(value);
    await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
    f.alert(alert); await f.runtime.settle();
    assert.match(html(f.runtime), /Có tin nhắn mới/);
    const oldHandler = f.chatHandler();
    f.switchUser('bob'); await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
    oldHandler({ ...alert, eventId: 'event-2' }); await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
    f.document.visibilityState = 'hidden';
    f.alert({ ...alert, eventId: 'event-3' }); await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
  } finally { f.cleanup(); }
});

test('chat popup uses the current participant name/avatar and never previews message content', async () => {
  const conversations = [{ id: 'room-1', userName: 'Nguyễn Minh', userAvatar: 'https://example.test/avatar.png', lastMessage: 'PRIVATE MESSAGE' }];
  const f = transport(conversations);
  try {
    f.alert({ eventId: 'event-1', conversationId: 'room-1', messageId: 'message-1', content: 'PRIVATE PAYLOAD' });
    await f.runtime.settle();
    let markup = html(f.runtime);
    assert.match(markup, /Nguyễn Minh/);
    assert.match(markup, /src="https:\/\/example.test\/avatar.png"/);
    assert.match(markup, /Có tin nhắn mới/);
    assert.doesNotMatch(markup, /PRIVATE MESSAGE|PRIVATE PAYLOAD/);
    conversations[0] = { ...conversations[0], userName: 'Minh mới', userAvatar: undefined };
    f.runtime.update();
    markup = html(f.runtime);
    assert.match(markup, /Minh mới/);
    assert.doesNotMatch(markup, /avatar.png/);
  } finally { f.cleanup(); }
});

test('chat delivery resolves participant metadata without refreshing the bell and updates when the conversation arrives', async () => {
  const conversations = [];
  const f = transport(conversations);
  try {
    await f.runtime.settle();
    const before = f.notifications.calls.length;
    const item = { id: 'chat-notice-1', category: 'CHAT', type: 'CHAT_ALERT_REQUESTED',
      metadata: { conversationId: 'room-1', messageId: 'message-1' }, title: 'Tin nhắn mới',
      body: 'PRIVATE PAYLOAD', priority: 'NORMAL', actionPath: '/chat?channel=direct&conversationId=room-1' };
    f.fire(item); f.fire(item);
    await f.runtime.settle();
    assert.match(html(f.runtime), /Người dùng HomeSpace/);
    conversations.push({ id: 'room-1', userName: 'Nguyễn Minh', userAvatar: 'https://example.test/avatar.png', lastMessage: 'PRIVATE MESSAGE' });
    f.runtime.update();
    const markup = html(f.runtime);
    assert.match(markup, /Nguyễn Minh/);
    assert.match(markup, /src="https:\/\/example.test\/avatar.png"/);
    assert.equal((markup.match(/Có tin nhắn mới/g) ?? []).length, 1);
    assert.doesNotMatch(markup, /PRIVATE PAYLOAD|PRIVATE MESSAGE/);
    await f.timers.advance(150);
    assert.equal(f.notifications.calls.length, before);
    assert.equal(f.notifications.NOTIFICATION_FILTER_TABS.some(tab => tab.id === 'CHAT'), false);
  } finally { f.cleanup(); }
});

test('popup navigates from the card, closes separately and rejects external action URLs', () => {
  const notifications = service();
  const Popup = popupMocks(notifications)['@/components/notification/NotificationPopup'].default;
  const item = { category: 'APPOINTMENT', type: 'BOOKING_REQUESTED', title: 'Lịch mới', body: 'Nội dung dài '.repeat(50), priority: 'URGENT', actionPath: '/dashboard/viewing-schedules' };
  let dismissed = 0;
  const card = Popup({ item, onDismiss: () => dismissed++ });
  const link = card.props.children[0];
  assert.equal(link.props.href, item.actionPath);
  link.props.onClick();
  const close = card.props.children.at(-1);
  close.props.onClick();
  assert.equal(dismissed, 2);
  assert.match(card.props.className, /h-\[104px\]/);
  const content = card.props.children[2];
  assert.match(content.props.children[1].props.className, /truncate/);
  assert.match(content.props.children[2].props.className, /truncate/);
  const unsafe = Popup({ item: { ...item, actionPath: 'https://evil.test' }, onDismiss() {} });
  assert.equal(unsafe.props.children[0], null);
  const chat = Popup({ item: { ...item, category: 'CHAT', title: 'PRIVATE TITLE', body: 'PRIVATE BODY' }, onDismiss() {} });
  const markup = html({ tree: chat });
  assert.match(markup, /Có tin nhắn mới/);
  assert.doesNotMatch(markup, /PRIVATE TITLE|PRIVATE BODY/);
});

const categories = ['SYSTEM', 'NEWS', 'ACCOUNT', 'LISTING', 'APPOINTMENT', 'RENTAL_REQUEST', 'CONTRACT', 'PAYMENT', 'CHAT'];
const notice = (category, extra = {}) => ({ id: `notice-${category}`, category, type: `${category}_NOTICE`,
  title: 'Test notice', body: 'Test body', priority: 'URGENT', actionPath: '/notifications', ...extra });

test('an opted-out category never pops, including urgent notices, but feed/count refresh still runs', async () => {
  const f = transport();
  try {
    await f.runtime.settle();
    const before = f.notifications.calls.length;
    for (const category of categories) f.fire(notice(category, { popupAllowed: false }));
    await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
    await f.timers.advance(150); await f.runtime.settle();
    assert.equal(f.notifications.calls.length, before + 1, 'coalesced unread-count refresh is preserved');
    assert.ok(f.signals.some(event => event.type === 'refresh'));
  } finally { f.cleanup(); }
});

test('suppressing popups preserves business refresh signals for every integrated domain', async () => {
  const f = transport();
  try {
    await f.runtime.settle();
    const cases = [
      notice('LISTING', { metadata: { listingId: 'listing-1' } }),
      notice('RENTAL_REQUEST', { metadata: { requestId: 'request-1' } }),
      notice('APPOINTMENT', { metadata: { bookingId: 'booking-1' } }),
      notice('PAYMENT', { type: 'MEMBERSHIP_ACTIVATED', metadata: { orderId: 'order-1' } }),
      notice('PAYMENT', { type: 'PAYMENT_REQUEST_CREATED', metadata: { paymentId: 'payment-1' } }),
      notice('PAYMENT', { type: 'INVOICE_ISSUED', metadata: { contractId: 'contract-1', invoiceId: 'invoice-1' } }),
      notice('CONTRACT', { type: 'AGREEMENT_FULLY_SIGNED', metadata: { agreementId: 'agreement-1' } }),
    ];
    for (const item of cases) f.fire({ ...item, popupAllowed: false });
    await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
    for (const type of ['listing-changed', 'rental-request-changed', 'appointment-changed', 'membership-changed',
      'payment-changed', 'invoice-changed', 'agreement-changed']) {
      assert.ok(f.signals.some(event => event.type === type), type);
    }
  } finally { f.cleanup(); }
});

test('enabled categories show popups and remain enabled after an earlier opted-out event', async () => {
  const f = transport();
  try {
    f.fire(notice('NEWS', { popupAllowed: false })); await f.runtime.settle();
    assert.equal(f.runtime.tree, null);
    f.fire(notice('NEWS', { popupAllowed: true })); await f.runtime.settle();
    assert.match(html(f.runtime), /Test notice/);
    assert.match(html(f.runtime), /Tin tức/);
  } finally { f.cleanup(); }
});

test('settings uses cached registered status, patches Push only, and keeps Email disabled', async () => {
  const runtime = hookRuntime(), timers = clock(), window = events({ Notification: {} });
  const categories = load('types/notification.type.ts').NOTIFICATION_CATEGORIES;
  let stored = categories.map(category => ({ category, push: true, email: true }));
  const calls = [];
  const notifications = {
    getPreferences: async () => stored.map(item => ({ ...item })),
    patchPreference: async (category, channel, enabled) => {
      calls.push({ category, channel, enabled });
      stored = stored.map(item => item.category === category ? { ...item, [channel]: enabled } : item);
      return stored.map(item => ({ ...item }));
    },
  };
  const Switch = ({ checked, 'aria-label': label }) => React.createElement('button', { 'aria-label': label, 'aria-checked': checked });
  const Component = load('components/settings/sections/NotificationsSection.tsx', {
    react: runtime.hooks, 'lucide-react': icons, sonner: { toast: { success() {}, error() {} } },
    '@/components/ui/switch': { Switch }, '@/components/ui/button': { Button: () => null },
    '@/features/auth/useAuth': { useAuth: () => ({ initialized: true, authenticated: true, userId: 'alice', login() {} }) },
    '@/services/notification.service': { __esModule: true, default: notifications, getCategoryMeta: service().getCategoryMeta },
    '@/utils/apiError': { getApiErrorMessage: () => 'Error' },
    '@/components/common/PolicyDialog': { PolicyNotice: () => null },
    '@/services/notification-push.service': { getPushStatus: () => 'registered', isPushConfigured: () => true,
      isPushOptedIn: () => true, disablePush: async () => {}, enablePush: async () => {} },
  }, { ...timers.globals, window, Notification: { permission: 'granted' } }).default;
  try {
    runtime.mount(Component); await runtime.settle();
    assert.match(html(runtime), /Đã bật thông báo đẩy cho trình duyệt này/);
    assert.doesNotMatch(html(runtime), /Đang đăng ký trình duyệt/);
    // Another tab saves NEWS=false after this screen loaded its old NEWS=true snapshot.
    stored = stored.map(item => item.category === 'NEWS' ? { ...item, push: false } : item);
    const flatten = node => node == null || typeof node !== 'object' ? []
      : [node, ...React.Children.toArray(node.props?.children).flatMap(flatten)];
    const emailSwitches = flatten(runtime.tree).filter(node => node.type === Switch && node.props['aria-label'].endsWith(' - Email'));
    assert.equal(emailSwitches.length, categories.length);
    const systemEmail = emailSwitches.find(node => node.props['aria-label'] === 'Hệ thống - Email');
    assert.ok(systemEmail && !systemEmail.props.disabled && typeof systemEmail.props.onCheckedChange === 'function', 'SYSTEM email is enabled');
    assert.ok(emailSwitches.filter(node => node !== systemEmail).every(node => node.props.disabled && node.props.onCheckedChange === undefined));
    const paymentPush = flatten(runtime.tree).find(node => node.type === Switch && node.props['aria-label'] === 'Thanh toán & Hóa đơn - Push');
    assert.ok(paymentPush, 'payment Push switch is present');
    paymentPush.props.onCheckedChange(false); await runtime.settle();
    assert.deepEqual(calls, [{ category: 'PAYMENT', channel: 'push', enabled: false }]);
    assert.equal(stored.find(item => item.category === 'NEWS').push, false);
    const newsPush = flatten(runtime.tree).find(node => node.type === Switch && node.props['aria-label'] === 'Tin tức - Push');
    assert.equal(newsPush.props.checked, false, 'server response refreshes the old tab snapshot');
  } finally { runtime.unmount(); }
});
