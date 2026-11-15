/* eslint-disable @typescript-eslint/no-require-imports -- Node harness loads TS in a VM. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");

function load(relativePath, mocks = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : name === "@/services/notification.service" ? {} : require(name), compiled, compiled.exports,
  );
  return compiled.exports;
}

const apiView = { id: "conversation", participantId: "partner", participantName: "Old name", participantAvatar: "https://s3.example/old.jpg", unreadCount: 2 };

test("old conversations get fresh public names/avatars through Gateway, once per partner", async () => {
  const calls = [];
  const service = load("services/chat.service.ts", {
    "@/lib/axios-client": { get: async () => ({ data: { result: [apiView, { ...apiView, id: "other" }] } }) },
    "@/services/user.service": { getPublicProfile: async (id) => {
      calls.push(id);
      return { id, firstName: "Nguyen", lastName: "Minh", username: "minh", avatarUrl: null };
    } },
  }).default;
  const results = await service.listConversations();
  assert.deepEqual(calls, ["partner"]);
  assert.equal(results[0].participantName, "Nguyen Minh");
  assert.equal(results[0].participantAvatar, undefined);
  await service.listConversations();
  assert.equal(calls.length, 1);
  service.clearProfileCache();
  await service.listConversations();
  assert.equal(calls.length, 2);
});

test("public profile cache can be refreshed explicitly after a profile change", async () => {
  let calls = 0;
  const service = load("services/chat.service.ts", {
    "@/lib/axios-client": {},
    "@/services/user.service": { getPublicProfile: async () => ({ id: 'partner', username: `name-${++calls}` }) },
  }).default;
  assert.equal((await service.getParticipantProfile('partner')).username, 'name-1');
  assert.equal((await service.getParticipantProfile('partner')).username, 'name-1');
  assert.equal((await service.getParticipantProfile('partner', true)).username, 'name-2');
});

test("legacy public-profile failure preserves chat availability and is retried next time", async () => {
  let attempts = 0;
  const service = load("services/chat.service.ts", {
    "@/lib/axios-client": { get: async () => ({ data: { result: [apiView] } }) },
    "@/services/user.service": { getPublicProfile: async () => { attempts++; throw new Error("offline"); } },
  }).default;
  assert.equal((await service.listConversations())[0], apiView);
  await service.listConversations();
  assert.equal(attempts, 2);
});

test("reopening an existing chat ignores stale contact names and does not restore a removed avatar", async () => {
  let conversations = [load("lib/chat-api-mapper.ts").mapApiConversation(apiView, "me")];
  const { ChatDemoProvider } = load("components/chat/ChatDemoProvider.tsx", {
    react: { ...React, useEffect() {}, useMemo: (fn) => fn(), useCallback: (fn) => fn, useRef: (value) => ({ current: value }),
      useState: () => [conversations, (value) => { conversations = typeof value === "function" ? value(conversations) : value; }],
    },
    "@/lib/keycloak": {},
    "@/features/auth/useAuth": { useAuth: () => ({ authenticated: true, profile: { id: "me" } }) },
    "@/services/chat.service": {
      createConversation: async () => ({ ...apiView, participantName: "New name", participantAvatar: undefined }),
      listMessages: async () => ({ items: [] }), markRead: async () => {},
    },
    "@/lib/chat-api-mapper": load("lib/chat-api-mapper.ts"),
  });
  const context = ChatDemoProvider({ children: null }).props.value;
  await context.openConversation({ contact: { id: "partner", name: "Old name", avatar: "https://s3.example/old.jpg" } });
  await new Promise(setImmediate);
  assert.equal(conversations[0].userName, "New name");
  assert.equal(conversations[0].userAvatar, undefined);
});

test("selected chat refreshes public profile on open, focus and visible timer without Kafka", async (t) => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const listeners = {};
  let timer;
  global.window = { setInterval: (callback, delay) => { assert.equal(delay, 15_000); timer = callback; return 1; },
    clearInterval() {}, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {},
  };
  global.document = { visibilityState: 'visible', hasFocus: () => true, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {} };
  t.after(() => { global.window = previousWindow; global.document = previousDocument; });
  const effects = [];
  let calls = 0;
  let conversations = [load('lib/chat-api-mapper.ts').mapApiConversation(apiView, 'me')];
  const { ChatDemoProvider } = load('components/chat/ChatDemoProvider.tsx', {
    react: { ...React, useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn(), useCallback: (fn) => fn,
      useRef: (value) => ({ current: value }), useState: () => [conversations, (value) => { conversations = typeof value === 'function' ? value(conversations) : value; }],
    },
    '@/features/auth/useAuth': { useAuth: () => ({ authenticated: true, profile: { id: 'me' } }) },
    '@/lib/keycloak': {},
    '@/services/chat.service': { getParticipantProfile: async (id, force) => {
      assert.equal(id, 'partner'); assert.equal(force, true); calls++;
      return { firstName: 'Nguyen', lastName: 'Minh', avatarUrl: null };
    } },
    '@/lib/chat-api-mapper': load('lib/chat-api-mapper.ts'),
  });
  const context = ChatDemoProvider({ children: null }).props.value;
  effects[3]();
  context.setActiveConversationId('conversation');
  await new Promise(setImmediate);
  assert.equal(conversations[0].userName, 'Nguyen Minh');
  assert.equal(conversations[0].userAvatar, undefined);
  listeners.focus(); timer();
  await new Promise(setImmediate);
  assert.equal(calls, 3);
  global.document.visibilityState = 'hidden';
  timer();
  assert.equal(calls, 3);
  context.setActiveConversationId(null);
  global.document.visibilityState = 'visible';
  timer();
  assert.equal(calls, 3);
});

