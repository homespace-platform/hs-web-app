const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/firebase-messaging-sw.js', 'utf8');

function worker(tabs) {
  const handlers = {};
  const shown = [];
  const opened = [];
  const context = {
    URL,
    self: {
      location: { origin: 'http://localhost:3000' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      clients: {
        matchAll: async () => tabs,
        openWindow: async (url) => { opened.push(url); },
      },
      registration: {
        showNotification: async (...args) => { shown.push(args); },
      },
    },
  };
  vm.runInNewContext(source, context);
  return { handlers, shown, opened };
}

test('focused HomeSpace tab receives a refresh signal without an OS popup', async () => {
  const received = [];
  const { handlers, shown } = worker([{ focused: true, postMessage: (data) => received.push(data) }]);
  let finished;
  handlers.push({ waitUntil: (promise) => { finished = promise; } });
  await finished;
  assert.equal(shown.length, 0);
  assert.equal(received[0].event, 'notifications.changed');
});

test('visible HomeSpace tab shows its in-page popup instead of an OS popup', async () => {
  const { handlers, shown } = worker([{ focused: false, visibilityState: 'visible', postMessage: () => {} }]);
  let finished;
  handlers.push({ waitUntil: (promise) => { finished = promise; } });
  await finished;
  assert.equal(shown.length, 0);
});

test('closed or hidden tab gets one generic OS notification', async () => {
  const { handlers, shown } = worker([]);
  let finished;
  handlers.push({ waitUntil: (promise) => { finished = promise; } });
  await finished;
  assert.equal(shown.length, 1);
  assert.equal(shown[0][0], 'HomeSpace');
  assert.equal(shown[0][1].body, 'Bạn có thông báo mới.');
});

test('untrusted push content never enters the OS notification or worker deep link', async () => {
  const { handlers, shown, opened } = worker([]);
  let finished;
  handlers.push({ data: { json: () => ({ title: 'Private listing', body: 'Private rejection reason', actionPath: 'https://evil.test' }) },
    waitUntil: promise => { finished = promise; } });
  await finished;
  assert.equal(JSON.stringify(shown).includes('Private'), false);
  assert.equal(JSON.stringify(shown).includes('evil.test'), false);
  assert.equal(shown[0][1].data.path, '/notifications');
  let closed = false;
  handlers.notificationclick({ notification: { data: { path: 'https://evil.test' }, close() { closed = true; } },
    waitUntil: promise => { finished = promise; } });
  await finished;
  assert.equal(closed, true);
  assert.deepEqual(opened, ['http://localhost:3000/notifications']);
});
