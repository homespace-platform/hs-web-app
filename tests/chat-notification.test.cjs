/* eslint-disable @typescript-eslint/no-require-imports -- Node harness loads TSX without a browser. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(relativePath, mocks = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), compiled, compiled.exports,
  );
  return compiled.exports;
}

const flush = () => new Promise(setImmediate);
const conversation = { id: "conversation", userId: "partner", userName: "Nguyen Minh", messages: [], unreadCount: 0, isHidden: false, isPinned: true };
const message = { id: "message-1", conversationId: "conversation", senderId: "partner", content: "Phòng còn trống nhé", createdAt: "2026-11-15T11:00:00Z" };

async function setup(t, options = {}) {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const events = {};
  const managerEvents = {};
  const visibleEvents = {};
  let state = options.conversations ?? [{ ...conversation }];
  const effects = [];
  let conversationsRef;
  const toasts = [];
  const dismissed = [];
  const reads = [];
  let listCalls = 0;
  const toast = (title, props) => toasts.push({ title, ...props });
  toast.dismiss = (id) => dismissed.push(id);
  toast.error = () => {};
  global.document = { visibilityState: "visible", hasFocus: () => true,
    addEventListener: (name, fn) => { visibleEvents[name] = fn; }, removeEventListener() {},
  };
  global.window = { location: { origin: "http://localhost:3000" }, setInterval: () => 1, clearInterval() {},
    addEventListener: (name, fn) => { visibleEvents[name] = fn; }, removeEventListener() {},
  };
  t.after(() => { global.window = previousWindow; global.document = previousDocument; });
  const socket = { on: (name, fn) => { events[name] = fn; }, io: { on: (name, fn) => { managerEvents[name] = fn; }, opts: {} }, removeAllListeners() {}, disconnect() {} };
  const { ChatDemoProvider } = load("components/chat/ChatDemoProvider.tsx", {
    react: { ...React, useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn),
      useRef: (value) => {
        const ref = { current: value };
        if (value === state) conversationsRef = ref;
        return ref;
      },
      useState: (initial) => Array.isArray(initial)
        ? [state, (value) => {
          state = typeof value === "function" ? value(state) : value;
          conversationsRef.current = state;
        }]
        : [initial, () => {}],
    },
    "next/link": (props) => React.createElement("a", props),
    "socket.io-client": { io: () => socket },
    "sonner": { toast },
    "@/features/auth/useAuth": { useAuth: () => ({ authenticated: true, profile: { id: "me" } }) },
    "@/lib/keycloak": { token: "test-token", updateToken: async () => {} },
    "@/lib/chat-api-mapper": load("lib/chat-api-mapper.ts"),
    "@/lib/chat-presence": load("lib/chat-presence.ts"),
    "@/lib/chat-demo-state": load("lib/chat-demo-state.ts"),
    "@/services/chat.service": {
      getParticipantProfile: options.getParticipantProfile ??
        (async () => ({ firstName: "Nguyen", lastName: "Minh", username: "minh" })),
      markRead: async (id) => { reads.push(id); if (options.readFails) throw new Error("offline"); },
      listMessages: async () => ({ items: [message] }),
      clearProfileCache() {},
      listConversations: async () => { listCalls++; return options.summaries ?? []; },
    },
  });
  const context = ChatDemoProvider({ children: null }).props.value;
  const [, , , loadSummary, connectSocket, listenVisibility] = effects;
  const cleanup = connectSocket();
  await flush();
  t.after(cleanup);
  return { context, toasts, dismissed, reads, loadSummary, listenVisibility, visibleEvents, managerEvents, cleanup,
    state: () => state, listCalls: () => listCalls,
    receive: async (value = message) => { events["chat:message"](value); await flush(); await flush(); },
    receiveProfileChange: async (userId) => {
      events["chat:profile:changed"]({ userId });
      await flush();
    },
  };
}

test("incoming message updates unread immediately without deciding on a popup", async (t) => {
  const chat = await setup(t);
  await chat.receive();
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.state()[0].lastMessage, message.content);
  assert.equal(chat.listCalls(), 0); // No feed refresh per message for known conversations.
  assert.equal(chat.toasts.length, 0);
  assert.deepEqual(chat.reads, []);
});

test("own messages and duplicate socket deliveries never increment unread twice", async (t) => {
  const chat = await setup(t);
  await chat.receive();
  await chat.receive();
  await chat.receive({ ...message, id: "my-message", senderId: "me" });
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.state()[0].messages.length, 2);
  assert.equal(chat.toasts.length, 0);
});

test("a late socket message keeps the newer preview and still counts as unread", async (t) => {
  const chat = await setup(t);
  await chat.receive({ ...message, id: "message-2", content: "Tin mới" });
  await chat.receive(message);
  assert.equal(chat.state()[0].lastMessage, "Tin mới");
  assert.equal(chat.state()[0].lastMessageId, "message-2");
  assert.equal(chat.state()[0].unreadCount, 2);
});

test("profile changes refresh an unopened conversation and clear an old avatar", async (t) => {
  const requests = [];
  const chat = await setup(t, {
    conversations: [{ ...conversation, userAvatar: "old.jpg", unreadCount: 2 }],
    getParticipantProfile: async (id, force) => {
      requests.push([id, force]);
      return { firstName: "Minh", lastName: "Nguyen", username: "new-name", avatarUrl: null };
    },
  });
  await chat.receiveProfileChange("unrelated");
  await chat.receiveProfileChange("partner");
  assert.deepEqual(requests, [["partner", true]]);
  assert.equal(chat.state()[0].userName, "Minh Nguyen");
  assert.equal(chat.state()[0].userAvatar, undefined);
  assert.equal(chat.state()[0].unreadCount, 2);
  assert.equal(chat.state()[0].isPinned, true);
});
test("viewing the selected conversation marks incoming messages read and suppresses popup", async (t) => {
  const chat = await setup(t);
  chat.context.setActiveConversationId("conversation");
  await flush();
  await chat.receive();
  assert.deepEqual(chat.reads, ["conversation"]);
  assert.equal(chat.state()[0].unreadCount, 0);
  assert.equal(chat.toasts.length, 0);
});

test("an unfocused/hidden chat is unread until focus returns, then clears the badge", async (t) => {
  const chat = await setup(t);
  chat.listenVisibility();
  chat.context.setActiveConversationId("conversation");
  await flush();
  global.document.visibilityState = "hidden";
  global.document.hasFocus = () => false;
  await chat.receive();
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.reads.length, 0);
  assert.equal(chat.toasts.length, 0);
  global.document.visibilityState = "visible";
  global.document.hasFocus = () => true;
  chat.visibleEvents.focus();
  await flush();
  assert.equal(chat.state()[0].unreadCount, 0);
  assert.equal(chat.reads.length, 1);
});

test("failed mark-read preserves unread instead of pretending it succeeded", async (t) => {
  const chat = await setup(t, { readFails: true });
  chat.context.setActiveConversationId("conversation");
  await chat.receive();
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.toasts.length, 0);
});

test("new conversations are counted immediately even when summary lookup fails", async (t) => {
  const chat = await setup(t, { conversations: [] });
  await chat.receive();
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.listCalls(), 1);
  assert.equal(chat.toasts.length, 0);
});

test("image and file messages update unread without exposing attachment details in a toast", async (t) => {
  const chat = await setup(t);
  const attachment = { storageId: "chat_file", contentType: "image/jpeg", fileName: "photo.jpg", sizeBytes: 10 };
  await chat.receive({ ...message, attachments: [attachment] });
  await chat.receive({ ...message, id: "file-message", attachments: [{ ...attachment, contentType: "application/pdf" }] });
  assert.equal(chat.toasts.length, 0);
  assert.equal(chat.state()[0].unreadCount, 2);
});

test("a late initial summary cannot erase a realtime unread increment", async (t) => {
  let resolve;
  const summaries = new Promise((done) => { resolve = done; });
  const chat = await setup(t, { summaries });
  chat.loadSummary();
  await chat.receive();
  resolve([{ id: "conversation", participantId: "partner", participantName: "Nguyen Minh", unreadCount: 0 }]);
  await flush();
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.state()[0].messages.length, 1);
});

test("initial unread backlog is retained when a new message arrives while the summary is loading", async (t) => {
  let resolve;
  const summaries = new Promise((done) => { resolve = done; });
  const chat = await setup(t, { conversations: [], summaries });
  chat.loadSummary();
  // Both initial load and the new-contact lookup wait for this server snapshot.
  await chat.receive();
  resolve([{ id: "conversation", participantId: "partner", participantName: "Nguyen Minh", unreadCount: 6,
    lastMessageAt: "2026-11-15T10:59:00Z" }]);
  await flush();
  await flush();
  assert.equal(chat.state()[0].unreadCount, 7);
});

test("a late summary cannot resurrect unread after a successful mark-read", async (t) => {
  let resolve;
  const summaries = new Promise((done) => { resolve = done; });
  const chat = await setup(t, { conversations: [{ ...conversation, unreadCount: 5 }], summaries });
  chat.loadSummary();
  chat.context.setActiveConversationId("conversation");
  await chat.receive();
  resolve([{ id: "conversation", participantId: "partner", participantName: "Nguyen Minh", unreadCount: 5 }]);
  await flush();
  assert.equal(chat.state()[0].unreadCount, 0);
});

test("reconnect restores server unread counts without showing historical popups", async (t) => {
  const chat = await setup(t, { summaries: [{ id: "conversation", participantId: "partner", participantName: "Nguyen Minh", unreadCount: 7 }] });
  chat.managerEvents.reconnect();
  await flush();
  assert.equal(chat.state()[0].unreadCount, 7);
  assert.equal(chat.toasts.length, 0);
});

test("floating chat shows capped unread badge and opens the latest unread conversation", () => {
  const navigations = [];
  const FloatingChatButton = load("components/chat/FloatingChatButton.tsx", {
    "next/navigation": { usePathname: () => "/", useRouter: () => ({ push: (url) => navigations.push(url) }) },
    "next/image": ({ src, alt }) => React.createElement("img", { src, alt }),
    "@/components/chat/ChatDemoProvider": { useChatDemo: () => ({ currentUserId: "me", conversations: [{ ...conversation, unreadCount: 123 }] }) },
  }).default;
  const html = renderToStaticMarkup(React.createElement(FloatingChatButton));
  assert.match(html, /99\+/);
  assert.match(html, /123 tin nhắn chưa đọc/);
  function findButton(node) {
    if (Array.isArray(node)) return node.map(findButton).find(Boolean);
    if (!node || typeof node !== "object") return;
    return node.type === "button" ? node : findButton(node.props?.children);
  }
  const hooks = { ...React, useState: (value) => [value, () => {}] };
  const Button = load("components/chat/FloatingChatButton.tsx", {
    react: hooks,
    "next/navigation": { usePathname: () => "/", useRouter: () => ({ push: (url) => navigations.push(url) }) },
    "@/components/chat/ChatDemoProvider": { useChatDemo: () => ({ currentUserId: "me", conversations: [{ ...conversation, unreadCount: 123 }] }) },
  }).default;
  findButton(Button()).props.onClick();
  assert.deepEqual(navigations, ["/chat?channel=direct&conversationId=conversation"]);
});
