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
  const refs = [];
  const toasts = [];
  const dismissed = [];
  const reads = [];
  let listCalls = 0;
  let preferenceCalls = 0;
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
  const socket = { on: (name, fn) => { events[name] = fn; }, io: { on: (name, fn) => { managerEvents[name] = fn; }, opts: {} }, disconnect() {} };
  const { ChatDemoProvider } = load("components/chat/ChatDemoProvider.tsx", {
    react: { ...React, useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn),
      useRef: (value) => { const ref = { current: value }; refs.push(ref); return ref; },
      useState: () => [state, (value) => { state = typeof value === "function" ? value(state) : value; if (refs[3]) refs[3].current = state; }],
    },
    "next/link": (props) => React.createElement("a", props),
    "socket.io-client": { io: () => socket },
    "sonner": { toast },
    "@/features/auth/useAuth": { useAuth: () => ({ authenticated: true, profile: { id: "me" } }) },
    "@/lib/keycloak": { token: "test-token", updateToken: async () => {} },
    "@/lib/chat-api-mapper": load("lib/chat-api-mapper.ts"),
    "@/services/chat.service": {
      getParticipantProfile: async () => ({ firstName: "Nguyen", lastName: "Minh", username: "minh" }),
      markRead: async (id) => { reads.push(id); if (options.readFails) throw new Error("offline"); },
      listMessages: async () => ({ items: [message] }),
      clearProfileCache() {},
      listConversations: async () => { listCalls++; return options.summaries ?? []; },
    },
    "@/services/notification.service": { getPreferences: async () => {
      preferenceCalls++;
      if (options.preferenceFails) throw new Error("offline");
      if (options.preferences) return options.preferences;
      return [{ category: "CHAT", push: options.popupEnabled !== false }];
    } },
  });
  const context = ChatDemoProvider({ children: null }).props.value;
  const cleanup = effects[2]();
  await flush();
  t.after(cleanup);
  return { context, toasts, dismissed, reads, effects, visibleEvents, managerEvents, cleanup,
    state: () => state, listCalls: () => listCalls, preferenceCalls: () => preferenceCalls,
    receive: async (value = message) => { events["chat:message"](value); await flush(); await flush(); },
  };
}

test("incoming message updates unread immediately and shows bottom-left chat toast with the direct conversation link", async (t) => {
  const chat = await setup(t);
  await chat.receive();
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.state()[0].lastMessage, message.content);
  assert.equal(chat.listCalls(), 0); // No feed refresh per message for known conversations.
  assert.equal(chat.toasts.length, 1);
  assert.equal(chat.toasts[0].position, "bottom-left");
  assert.equal(chat.toasts[0].title, "Tin nhắn từ Nguyen Minh");
  assert.equal(chat.toasts[0].description, message.content);
  assert.equal(chat.toasts[0].action.props.href, "/chat?channel=direct&conversationId=conversation");
  assert.deepEqual(chat.reads, []);
});

test("own messages and duplicate socket deliveries never produce another popup or unread increment", async (t) => {
  const chat = await setup(t);
  await chat.receive();
  await chat.receive();
  await chat.receive({ ...message, id: "my-message", senderId: "me" });
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.state()[0].messages.length, 2);
  assert.equal(chat.toasts.length, 1);
  assert.equal(chat.preferenceCalls(), 1);
});

test("viewing the selected conversation marks incoming messages read and suppresses popup", async (t) => {
  const chat = await setup(t);
  chat.context.setActiveConversationId("conversation");
  await flush();
  await chat.receive();
  assert.deepEqual(chat.reads, ["conversation"]);
  assert.equal(chat.state()[0].unreadCount, 0);
  assert.equal(chat.toasts.length, 0);
  assert.equal(chat.preferenceCalls(), 0);
});

test("an unfocused/hidden chat is unread until focus returns, then clears the badge", async (t) => {
  const chat = await setup(t);
  chat.effects[3]();
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
  assert.equal(chat.toasts.length, 1);
});

test("CHAT popup preference off suppresses toast while retaining unread messages", async (t) => {
  const chat = await setup(t, { popupEnabled: false });
  await chat.receive();
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.toasts.length, 0);
});

test("preference service failure does not break messages or bypass opt-out", async (t) => {
  const chat = await setup(t, { preferenceFails: true });
  await chat.receive();
  assert.equal(chat.state()[0].messages.length, 1);
  assert.equal(chat.state()[0].unreadCount, 1);
  assert.equal(chat.toasts.length, 0);
});

test("late popup requests do not reveal messages after logout/socket disposal", async (t) => {
  let resolve;
  const preferences = new Promise((done) => { resolve = done; });
  const chat = await setup(t, { preferences });
  await chat.receive();
  chat.cleanup();
  resolve([{ category: "CHAT", push: true }]);
  await flush();
  assert.equal(chat.toasts.length, 0);
});

test("images and files have readable popup summaries and one toast ID per conversation", async (t) => {
  const chat = await setup(t);
  const attachment = { storageId: "chat_file", contentType: "image/jpeg", fileName: "photo.jpg", sizeBytes: 10 };
  await chat.receive({ ...message, attachments: [attachment] });
  await chat.receive({ ...message, id: "file-message", attachments: [{ ...attachment, contentType: "application/pdf" }] });
  assert.equal(chat.toasts[0].description, "Đã gửi ảnh");
  assert.equal(chat.toasts[1].description, "Đã gửi tệp đính kèm");
  assert.equal(chat.toasts[0].id, chat.toasts[1].id);
  assert.equal(chat.state()[0].unreadCount, 2);
});

test("a late initial summary cannot erase a realtime unread increment", async (t) => {
  let resolve;
  const summaries = new Promise((done) => { resolve = done; });
  const chat = await setup(t, { summaries });
  chat.effects[1]();
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
  chat.effects[1]();
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
  chat.effects[1]();
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
