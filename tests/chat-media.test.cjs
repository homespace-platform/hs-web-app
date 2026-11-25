/* eslint-disable @typescript-eslint/no-require-imports -- Node harness loads TS in a VM. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { loadTs } = require('./helpers/ts-loader.cjs');

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

function findNode(node, matches) {
  if (Array.isArray(node)) return node.map((child) => findNode(child, matches)).find(Boolean);
  if (!React.isValidElement(node)) return;
  return matches(node) ? node : findNode(node.props.children, matches);
}

test('legacy attachment text is hidden while captions and standalone text stay visible', () => {
  const { mapApiMessage } = loadTs('lib/chat-api-mapper.ts');
  const file = { fileName: 'proof.pdf', contentType: 'application/pdf', sizeBytes: 20 };
  const content = (text, attachments) => mapApiMessage({ content: text, attachments }, 'me').content;
  assert.equal(content('Đã gửi proof.pdf', [file]), '');
  assert.equal(content('Đã gửi tệp đính kèm', [file]), '');
  assert.equal(content('Đã gửi 2 tệp đính kèm', [file, file]), '');
  assert.equal(content('', [file]), '');
  assert.equal(content('Đã gửi proof.pdf để bạn xem', [file]), 'Đã gửi proof.pdf để bạn xem');
  assert.equal(content('Đã gửi proof.pdf', []), 'Đã gửi proof.pdf');
});

test('document preview loads bytes from the signed link without app credentials', async (t) => {
  const { fetchChatDocument } = loadTs('lib/chat-document-preview.ts');
  const originalWindow = global.window;
  const originalFetch = global.fetch;
  t.after(() => { global.window = originalWindow; global.fetch = originalFetch; });
  global.window = { location: { origin: 'https://homespace.example' } };
  const request = new AbortController();
  const signed = 'https://storage.example/file.pdf?signature=a%2Fb';
  global.fetch = async (url, options) => {
    assert.equal(url, signed);
    assert.deepEqual(options, { signal: request.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    return new Response('%PDF-1.4');
  };
  assert.equal(await (await fetchChatDocument(async () => signed, request.signal)).text(), '%PDF-1.4');
  global.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(fetchChatDocument(async () => signed, request.signal), /fetch failed/);
  const pending = fetchChatDocument(() => new Promise(() => {}), request.signal);
  request.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

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

test('JFIF uses the canonical JPEG type when the browser provides an alias or no MIME', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  const service = load({
    '@/lib/axios-client': { post: async (url, body) => {
      if (url.endsWith('/uploads')) assert.equal(body.contentType, 'image/jpeg');
      return { data: { result: { storageId: 'chat_uuid', uploadUrl: 'https://s3.example/signed' } } };
    } },
    '@/services/user.service': {},
  });
  global.fetch = async (_, options) => {
    assert.equal(options.headers['Content-Type'], 'image/jpeg');
    return { ok: true };
  };
  for (const type of ['', 'image/pjpeg', 'image/jfif']) {
    await service.uploadAttachment(new File(['image'], 'photo.JFIF', { type }), 'conversation');
  }
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
  const calls = [];
  const ChatWindow = load({
    'next/image': () => null,
    'next/link': () => null,
    react: { ...React, useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: (value) => ({ current: value }), useEffect() {} },
    '@/components/common/UserAvatar': () => null,
    '@/components/common/MediaGallery': {},
    '@/components/chat/ChatDocumentModal': {},
    '@/lib/chat-document-preview': loadTs('lib/chat-document-preview.ts'),
    '@/lib/listing-detail-access': { listingDetailPath: (id) => `/rent/${id}` },
    '@/services/chat.service': { getAttachmentViewUrl: async (...args) => { calls.push(['chat', ...args]); return 'https://s3.example/fresh-version'; } },
    '@/services/storage.service': { getViewUrl: async (id) => { calls.push(['core', id]); return 'https://s3.example/legacy'; } },
  }, 'components/chat/ChatWindow.tsx');
  const render = (storageId, name = 'x.xlsx') => {
    const tree = ChatWindow({ conversation: { id: 'conversation', userName: 'Minh', messages: [
      { id: 'message', sender: 'them', content: 'file', attachments: [{ storageId, name, type: 'file', url: '' }] },
    ] } });
    const component = findNode(tree, (node) => node.type?.name === 'AttachmentPreview');
    return component.type({ ...component.props, onOpenDocument: (document) => { preview = document; } });
  };
  let preview;
  for (const [storageId, name, format, url] of [
    ['chat_uuid', 'x.pdf', 'pdf', 'https://s3.example/fresh-version'],
    ['chat_uuid', 'x.docx', 'docx', 'https://s3.example/fresh-version'],
    ['old-core-uuid', 'x.DOC', 'doc', 'https://s3.example/legacy'],
  ]) {
    render(storageId, name).props.onClick();
    assert.equal(preview.format, format);
    assert.equal(await preview.getUrl(), url);
  }
  assert.deepEqual(calls.splice(0), [['chat', 'conversation', 'chat_uuid'], ['chat', 'conversation', 'chat_uuid'], ['core', 'old-core-uuid']]);
  render('chat_uuid').props.onClick();
  await new Promise(setImmediate);
  assert.equal(fileTab.opener, null);
  assert.equal(fileTab.location.href, 'https://s3.example/fresh-version');
  assert.deepEqual(calls, [['chat', 'conversation', 'chat_uuid']]);
  render('old-core-uuid').props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(calls.at(-1), ['core', 'old-core-uuid']);
});

test('drafts cap attachments at five and keep caption, preview, and uploads until an acknowledged retry', async (t) => {
  const slots = [];
  let slot = 0;
  let finishSend;
  let attempt = 0;
  const uploadAttachment = t.mock.fn(async (file) => ({ storageId: file.name }));
  const onSendMessage = t.mock.fn(() => ++attempt === 1
    ? new Promise((resolve) => { finishSend = resolve; }) : Promise.resolve(true));
  const ChatWindow = load({
    'next/image': () => null,
    'next/link': () => null,
    react: { ...React, useEffect() {}, useRef: (current) => slots[slot++] ??= { current },
      useState(initial) {
        const index = slot++;
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
        return [slots[index], (value) => { slots[index] = value; }];
      },
    },
    sonner: { toast: { error() {} } },
    '@/components/common/UserAvatar': () => null,
    '@/components/common/MediaGallery': {},
    '@/components/chat/ChatDocumentModal': {},
    '@/lib/chat-document-preview': loadTs('lib/chat-document-preview.ts'),
    '@/lib/listing-detail-access': {},
    '@/services/chat.service': { uploadAttachment },
    '@/services/storage.service': {},
  }, 'components/chat/ChatWindow.tsx');
  const find = (matches) => {
    slot = 0;
    return findNode(ChatWindow({ conversation: { id: 'conversation', messages: [] }, onSendMessage }), matches);
  };
  const files = Array.from({ length: 6 }, (_, index) => new File(['contents'], `${index}.pdf`, { type: 'application/pdf' }));
  find((node) => node.type === 'input' && node.props.accept?.includes('.pdf')).props.onChange({ currentTarget: { files } });
  const previews = () => find((node) => node.type === 'ul' && node.props['aria-label'] === 'Tệp đính kèm');
  assert.equal(previews().props.children.length, 5);
  find((node) => node.props['aria-label'] === 'Bỏ tệp 1.pdf').props.onClick();
  assert.equal(previews().props.children.length, 4);
  const input = () => find((node) => node.type === 'input' && node.props.type === 'text');
  input().props.onChange({ target: { value: 'Chú thích' } });
  const submit = () => find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  const first = submit();
  await submit();
  await new Promise(setImmediate);
  assert.equal(onSendMessage.mock.callCount(), 1);
  assert.equal(uploadAttachment.mock.callCount(), 4);
  assert.equal(previews().props.children.length, 4);
  assert.equal(input().props.value, 'Chú thích');
  finishSend(false);
  await first;
  assert.ok(find((node) => node.props['aria-label'] === 'Thử gửi lại'));
  await submit();
  assert.equal(uploadAttachment.mock.callCount(), 4);
  assert.deepEqual(onSendMessage.mock.calls[0].arguments, onSendMessage.mock.calls[1].arguments);
  assert.equal(previews(), undefined);
  assert.equal(input().props.value, '');
});
