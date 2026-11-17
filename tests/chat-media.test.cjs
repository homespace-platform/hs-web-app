/* eslint-disable @typescript-eslint/no-require-imports -- Node harness loads TS in a VM. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function load(mocks, relativePath = 'services/chat.service.ts') {
  const filename = path.join(__dirname, '..', relativePath);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), compiled, compiled.exports,
  );
  return compiled.exports.default;
}

test('chat uploads request a URL from Chat through Gateway, PUT to S3, then complete before returning', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  const calls = [];
  const attachment = { storageId: 'chat_uuid', fileName: 'proof.pdf', contentType: 'application/pdf', sizeBytes: 20 };
  const service = load({
    '@/lib/axios-client': { post: async (url, body) => {
      calls.push({ url, body });
      return { data: { result: url.endsWith('/uploads') ? { storageId: attachment.storageId, uploadUrl: 'https://s3.example/signed' } : attachment } };
    } },
    '@/services/user.service': {},
  });
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true }; };
  const file = { name: 'proof.pdf', type: '', size: 20 };
  assert.deepEqual(await service.uploadAttachment(file, 'conversation'), attachment);
  assert.equal(calls[0].url, '/api/v1/chat/conversations/conversation/media/uploads');
  assert.deepEqual(calls[0].body, { fileName: 'proof.pdf', contentType: 'application/pdf', size: 20 });
  assert.equal(calls[1].url, 'https://s3.example/signed');
  assert.equal(calls[1].options.method, 'PUT');
  assert.equal(calls[1].options.body, file);
  assert.equal(calls[2].url, '/api/v1/chat/conversations/conversation/media/chat_uuid/complete');
});

test('failed S3 PUT never completes or sends a message attachment', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  const calls = [];
  const service = load({
    '@/lib/axios-client': { post: async (url) => { calls.push(url); return { data: { result: { storageId: 'chat_uuid', uploadUrl: 'https://s3.example/signed' } } }; } },
    '@/services/user.service': {},
  });
  global.fetch = async () => ({ ok: false });
  await assert.rejects(service.uploadAttachment({ name: 'x.jpg', type: 'image/jpeg', size: 10 }, 'conversation'));
  assert.equal(calls.length, 1);
});

test('invalid type/size is rejected before any request; viewing uses the conversation-scoped Chat endpoint', async () => {
  const calls = [];
  const service = load({
    '@/lib/axios-client': {
      post: () => { throw new Error('must not upload'); },
      get: async (url) => { calls.push(url); return { data: { result: { url: 'https://s3.example/version-pinned' } } }; },
    },
    '@/services/user.service': {},
  });
  await assert.rejects(service.uploadAttachment({ name: 'x.html', type: 'text/html', size: 10 }, 'conversation'));
  await assert.rejects(service.uploadAttachment({ name: 'x.pdf', type: 'application/pdf', size: 26 * 1024 * 1024 }, 'conversation'));
  assert.equal(await service.getAttachmentViewUrl('conversation', 'chat_uuid'), 'https://s3.example/version-pinned');
  assert.deepEqual(calls, ['/api/v1/chat/conversations/conversation/media/chat_uuid/view-url']);
});

test('clicking a private chat attachment requests a fresh URL; old attachments keep the Core reader', async (t) => {
  const originalWindow = global.window;
  const fileTab = { opener: {}, location: {}, close() {} };
  global.window = { open: () => fileTab };
  t.after(() => { global.window = originalWindow; });
  const effects = [];
  const calls = [];
  const ChatWindow = load({
    'next/image': () => null,
    'next/link': () => null,
    react: { ...React, useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: (value) => ({ current: value }), useEffect: (fn) => effects.push(fn) },
    '@/components/common/UserAvatar': () => null,
    '@/lib/listing-detail-access': { listingDetailPath: (id) => `/rent/${id}` },
    '@/services/chat.service': { getAttachmentViewUrl: async (...args) => { calls.push(['chat', ...args]); return 'https://s3.example/fresh-version'; } },
    '@/services/storage.service': { getViewUrl: async (id) => { calls.push(['core', id]); return 'https://s3.example/legacy'; } },
  }, 'components/chat/ChatWindow.tsx');
  function findAttachment(node) {
    if (Array.isArray(node)) return node.map(findAttachment).find(Boolean);
    if (!node || typeof node !== 'object') return;
    if (node.type?.name === 'AttachmentPreview') return node;
    return findAttachment(node.props?.children);
  }
  const render = (storageId) => {
    const tree = ChatWindow({ conversation: { id: 'conversation', userName: 'Minh', messages: [
      { id: 'message', sender: 'them', content: 'file', attachments: [{ storageId, name: 'x.pdf', type: 'file', url: '' }] },
    ] } });
    const component = findAttachment(tree);
    return component.type(component.props);
  };
  const privateLink = render('chat_uuid');
  let prevented = false;
  privateLink.props.onClick({ preventDefault: () => { prevented = true; } });
  await new Promise(setImmediate);
  assert.equal(prevented, true);
  assert.equal(fileTab.opener, null);
  assert.equal(fileTab.location.href, 'https://s3.example/fresh-version');
  assert.deepEqual(calls, [['chat', 'conversation', 'chat_uuid']]);
  render('old-core-uuid');
  effects.at(-1)();
  await new Promise(setImmediate);
  assert.deepEqual(calls.at(-1), ['core', 'old-core-uuid']);
});
