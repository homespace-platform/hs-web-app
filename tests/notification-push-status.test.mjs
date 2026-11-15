import test from 'node:test';
import assert from 'node:assert/strict';
import { load, deferred } from './helpers/notification-runtime.mjs';

function push({ optedIn = true, permission = 'granted', configured = true, supported = true, put = async () => {} } = {}) {
  const stored = new Map([
    ['hs:notification-push-enabled', String(optedIn)],
    ['hs:notification-push-installation', JSON.stringify({
      installationId: '12345678-1234-4234-8234-123456789abc', installationSecret: 'a'.repeat(43),
    })],
  ]);
  const statuses = [], calls = [];
  let registered;
  const notification = { permission, requestPermission: async () => 'granted' };
  const api = load('services/notification-push.service.ts', {
    '@/lib/keycloak': { authenticated: true },
    '@/lib/axios-client': {
      put: (...args) => { calls.push(['put', ...args]); return put(...args); },
      delete: async (...args) => { calls.push(['delete', ...args]); },
    },
    'firebase/app': { getApps: () => [{}], getApp: () => ({}) },
    'firebase/messaging': {
      getMessaging: () => ({}), isSupported: async () => supported,
      onRegistered: (_, callback) => { registered = callback; return () => { registered = undefined; }; },
      onMessage: () => () => {},
      register: async () => { calls.push(['register']); registered?.('test-fid'); },
      unregister: async () => { calls.push(['unregister']); },
    },
  }, {
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    Notification: notification,
    window: { Notification: notification, dispatchEvent: event => {
      assert.equal(api.getPushStatus(), event.detail, 'cache updates before listeners receive the event');
      statuses.push(event.detail);
    } },
    navigator: { serviceWorker: { register: async () => ({}) } },
    CustomEvent: class { constructor(_, { detail }) { this.detail = detail; } },
    process: { env: Object.fromEntries(configured ? [
      'API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'MESSAGING_SENDER_ID', 'APP_ID', 'VAPID_KEY',
    ].map(key => [`NEXT_PUBLIC_FIREBASE_${key}`, 'test-value']) : []) },
  });
  return { api, statuses, calls, stored };
}

test('late settings readers see registered status after the registration event', async () => {
  const f = push();
  assert.equal(f.api.getPushStatus(), 'disabled');
  const starting = f.api.startPush(() => {});
  assert.equal(f.api.getPushStatus(), 'registering', 'status is set before asynchronous Firebase setup');
  const stop = await starting;
  await Promise.resolve();
  assert.equal(f.api.getPushStatus(), 'registered');
  assert.equal(f.statuses.at(-1), 'registered');
  await f.api.disablePush();
  assert.equal(f.api.getPushStatus(), 'disabled');
  assert.equal(f.stored.get('hs:notification-push-enabled'), 'false');
  assert.ok(f.calls.some(([method]) => method === 'delete'));
  assert.ok(f.calls.some(([method]) => method === 'unregister'));
  stop();
});

test('opted-out browsers remain disabled while Firebase initializes', async () => {
  const f = push({ optedIn: false });
  const starting = f.api.startPush(() => {});
  assert.equal(f.api.getPushStatus(), 'disabled');
  const stop = await starting;
  assert.equal(f.api.getPushStatus(), 'disabled');
  assert.equal(f.calls.length, 0);
  stop();
});

test('unconfigured, denied, and unsupported browsers cache unavailable status', async () => {
  for (const options of [{ configured: false }, { permission: 'denied' }, { supported: false }]) {
    const f = push(options);
    const stop = await f.api.startPush(() => {});
    assert.equal(f.api.getPushStatus(), 'unavailable');
    assert.equal(f.calls.length, 0);
    stop();
  }
});

test('a registration response from a cleaned-up lifecycle cannot replace the current status', async () => {
  const pending = deferred();
  const f = push({ put: () => pending.promise });
  const stop = await f.api.startPush(() => {});
  assert.ok(f.calls.some(([method]) => method === 'put'));
  stop();
  f.stored.set('hs:notification-push-enabled', 'false');
  const stopNext = await f.api.startPush(() => {});
  pending.resolve();
  await Promise.resolve();
  assert.equal(f.api.getPushStatus(), 'disabled');
  assert.equal(f.statuses.includes('registered'), false);
  stopNext();
});

test('Firebase setup failures cache error status', async () => {
  const failure = new Error('unsupported runtime');
  const f = push({ supported: Promise.reject(failure) });
  await assert.rejects(f.api.startPush(() => {}), /unsupported runtime/);
  assert.equal(f.api.getPushStatus(), 'error');
});
