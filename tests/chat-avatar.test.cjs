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
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : name === "@/services/notification.service" ? {} : require(name), compiled, compiled.exports,
  );
  return compiled.exports;
}

const google = "https://lh3.googleusercontent.com/a/test-avatar=s96-c";
const s3 = "https://homespace-production-files.s3.ap-southeast-1.amazonaws.com/public/user_avatar/user/avatar.jpg";
const UserAvatar = load("components/common/UserAvatar.tsx").default;
const conversation = {
  id: "conversation", userId: "partner", userName: "Nguyen Van Minh", isOnline: false,
  lastMessage: "Xin chào", lastMessageTime: "17:11", lastMessageSender: "them",
  unreadCount: 0, isHidden: false,
  messages: [{ id: "message", sender: "them", content: "Xin chào", timestamp: "17:11" }],
};

for (const url of [google, s3]) {
  test(`all four chat avatar positions use the shared renderer: ${new URL(url).hostname}`, () => {
    let stateIndex = 0;
    const ChatWindow = load("components/chat/ChatWindow.tsx", {
      react: { ...React, useState: (initial) => ++stateIndex === 2 ? [true, () => {}] : React.useState(initial) },
      "@/components/common/UserAvatar": UserAvatar,
      "@/services/storage.service": {},
      "@/services/chat.service": {},
      "@/lib/listing-detail-access": { listingDetailPath: (id) => `/rent/${id}` },
    }).default;
    const ChatSidebar = load("components/chat/ChatSidebar.tsx", {
      "@/components/common/UserAvatar": UserAvatar,
      "@/data/mock-chat-data": { AI_QUICK_TOPICS: [] },
    }).default;
    const item = { ...conversation, userAvatar: url };
    const windowHtml = renderToStaticMarkup(React.createElement(ChatWindow, { conversation: item }));
    const sidebarHtml = renderToStaticMarkup(React.createElement(ChatSidebar, {
      channel: "direct", aiSessions: [], directConversations: [item], searchQuery: "", activeTab: "all",
    }));
    assert.equal((windowHtml.match(/referrerPolicy="no-referrer"/g) || []).length, 3);
    assert.equal((sidebarHtml.match(/referrerPolicy="no-referrer"/g) || []).length, 1);
    for (const html of [windowHtml, sidebarHtml]) {
      assert.ok(html.includes(`src="${url}"`));
      assert.ok(html.includes('alt="Nguyen Van Minh"'));
    }
  });
}

test("failed Google/S3 images show initials and changing the URL allows loading again", () => {
  let hasError = false;
  let previousSrc;
  let effect;
  const Avatar = load("components/common/UserAvatar.tsx", {
    react: { ...React,
      useState: () => [hasError, (value) => { hasError = value; }],
      useEffect: (callback, [src]) => { if (src !== previousSrc) { effect = callback; previousSrc = src; } },
    },
  }).default;
  const render = (src) => Avatar({ src, name: "Nguyen Van Minh" });
  let image = render(google);
  effect();
  assert.equal(image.type, "img");
  image.props.onError();
  const fallback = render(google);
  assert.equal(fallback.type, "div");
  assert.equal(fallback.props.children, "N");
  render(s3);
  effect();
  image = render(s3);
  assert.equal(image.type, "img");
  assert.equal(image.props.src, s3);
  image.props.onError();
  assert.equal(render(s3).props.children, "N");
});

test("missing avatar renders an initial rather than an empty image", () => {
  const html = renderToStaticMarkup(React.createElement(UserAvatar, { name: "Nguyen Van Minh" }));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes(">N</div>"));
});

for (const contactAvatar of [undefined, "", google]) {
  test(`opening chat uses the canonical backend avatar even when contact avatar is ${JSON.stringify(contactAvatar)}`, async () => {
    let conversations = [];
    const api = { ...conversation, participantId: "partner", participantAvatar: s3 };
    const { ChatDemoProvider } = load("components/chat/ChatDemoProvider.tsx", {
      react: { ...React, useEffect() {}, useMemo: (fn) => fn(), useCallback: (fn) => fn,
        useRef: (value) => ({ current: value }),
        useState: () => [conversations, (value) => { conversations = typeof value === "function" ? value(conversations) : value; }],
      },
      "@/features/auth/useAuth": { useAuth: () => ({ authenticated: true, profile: { id: "me" } }) },
      "@/lib/keycloak": {},
      "@/services/chat.service": { createConversation: async () => api },
      "@/lib/chat-api-mapper": load("lib/chat-api-mapper.ts"),
      "@/lib/chat-presence": load("lib/chat-presence.ts"),
      "@/lib/chat-demo-state": load("lib/chat-demo-state.ts"),
    });
    const context = ChatDemoProvider({ children: null }).props.value;
    assert.equal(await context.openConversation({ contact: { id: "partner", name: "Minh", avatar: contactAvatar } }), "conversation");
    assert.equal(conversations[0].userAvatar, s3);
  });
}
