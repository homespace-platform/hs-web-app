/* eslint-disable @typescript-eslint/no-require-imports -- Node VM test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)((name) => mocks[name] ?? require(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test("guest has memory-only history, signed asks with cookies; accounts stay protected", async () => {
  const calls = [];
  const axios = Object.fromEntries(["get", "post", "patch", "delete"].map((method) => [method, async (...args) => {
    calls.push({ method, args }); return { data: { result: method === "post" && args[0].endsWith("/conversations")
      ? { id: "guest-id", guestState: "signed-state", remainingQuestions: 3, messages: [] }
      : { answer: "Public", guestState: "signed-next", remainingQuestions: 2, suggestedQuestions: ["Phòng nào phù hợp hơn?"] } } };
  }]));
  const guestModule = load("lib/guest-ai-session.ts", { "@/lib/axios-client": axios });
  const { aiService, guestAiService } = load("services/ai.service.ts", { "@/lib/axios-client": axios, "@/lib/guest-ai-session": guestModule });
  assert.deepEqual(await guestAiService.listConversations(), []);
  await guestAiService.createConversation();
  await guestAiService.ask("Tìm phòng", "guest-id");
  assert.equal((await guestAiService.getConversation("guest-id")).messages.length, 2);
  assert.deepEqual((await guestAiService.getConversation("guest-id")).messages[1].suggestedQuestions, ["Phòng nào phù hợp hơn?"]);
  assert.deepEqual(await guestAiService.listConversations(), []);
  assert.equal(calls.length, 2); // No GET/CRUD history in Mongo.
  for (const call of calls) {
    assert.ok(call.args[0].startsWith("/api/v1/ai/guest/agent/"));
    assert.equal(call.args.at(-1).withCredentials, true);
  }
  assert.deepEqual(calls[1].args[1], { question: "Tìm phòng", conversationId: "guest-id", guestState: "signed-state" });
  guestModule.guestChatState.clear();
  await assert.rejects(guestAiService.getConversation("guest-id"));
  await aiService.ask("HomeSpace là gì?", "id");
  assert.equal(calls[2].args[0], "/api/v1/ai/agent/ask");
  assert.equal(calls[2].args.at(-1).withCredentials, false);
});

test("fourth guest question opens login before a paid request, preserves pending text", async () => {
  let asks = 0;
  const { guestAiService, guestChatState, GuestLoginRequiredError } = load("lib/guest-ai-session.ts", {
    "@/lib/axios-client": { post: async (url) => ({ data: { result: url.endsWith("/conversations")
      ? { id: "guest", guestState: "s0", remainingQuestions: 3, messages: [] }
      : { answer: "Public", status: "ANSWERED", guestState: `s${++asks}`, remainingQuestions: 3 - asks } } }) },
  });
  await guestAiService.createConversation();
  for (let i = 0; i < 3; i++) await guestAiService.ask(`Question ${i + 1}`, "guest");
  await assert.rejects(guestAiService.ask("Question 4", "guest"), GuestLoginRequiredError);
  assert.equal(asks, 3);
  assert.equal(guestChatState.getSnapshot().loginRequired, true);
  assert.equal(guestChatState.getSnapshot().pendingQuestion, "Question 4");
  assert.equal((await guestAiService.getConversation("guest")).messages.length, 6);
  guestChatState.closeLogin();
  assert.equal(guestChatState.canAsk("Another fourth question"), false);
});

test("login handoff is consent-only, idempotent, cookie-bound and cleared after claim", async () => {
  const originalStorage = global.sessionStorage;
  const originalWindow = global.window;
  const values = new Map();
  global.sessionStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  global.window = { location: { origin: "http://localhost:3000" } };
  try {
    const calls = [];
    const mod = load("lib/guest-ai-session.ts", { "@/lib/axios-client": { post: async (...args) => {
      calls.push(args);
      return { data: { result: args[0].endsWith("/conversations")
        ? { id: "g", guestState: "s0", remainingQuestions: 3, messages: [] }
        : args[0].endsWith("/claim-guest") ? { id: "g", messages: [{ role: "user", content: "q" }] }
        : { answer: "Public", status: "ANSWERED", guestState: "verified", remainingQuestions: 0 } } };
    } } });
    await mod.guestAiService.createConversation();
    await mod.guestAiService.ask("q", "g");
    assert.equal(values.size, 0); // No writes on normal guest chat.
    mod.guestChatState.canAsk("fourth");
    const redirect = mod.guestChatState.prepareLogin();
    const nonce = new URL(redirect).searchParams.get("resumeGuest");
    mod.guestChatState.clear(); // OAuth/page unmount doesn't remove the consented handoff.
    const [a, b] = await Promise.all([mod.resumeGuestConversation(nonce), mod.resumeGuestConversation(nonce)]);
    assert.equal(a.conversation.id, "g");
    assert.equal(b.pendingQuestion, "fourth");
    assert.equal(values.size, 0);
    const claim = calls.filter((args) => args[0].endsWith("/claim-guest"));
    assert.equal(claim.length, 1);
    assert.equal(claim[0][2].withCredentials, true);
    assert.deepEqual(claim[0][1], { guestState: "verified" });
  } finally { global.sessionStorage = originalStorage; global.window = originalWindow; }
});

test("real unmount clears guest memory; StrictMode remount preserves an active request", async () => {
  const mod = load("lib/guest-ai-session.ts", { "@/lib/axios-client": { post: async () => ({ data: { result: { id: "g", messages: [], remainingQuestions: 3 } } }) } });
  await mod.guestAiService.createConversation();
  const detach = mod.guestChatState.retain();
  detach();
  const detachAgain = mod.guestChatState.retain();
  await Promise.resolve();
  assert.equal((await mod.guestAiService.getConversation("g")).id, "g");
  detachAgain();
  await Promise.resolve();
  await assert.rejects(mod.guestAiService.getConversation("g"));
});

test("home guest limit blocks before optimistic messages, create or paid ask", async () => {
  const mapping = load("lib/ai-conversation.ts");
  const { createHomeAiChat } = load("lib/home-ai-chat.ts", { "@/lib/ai-conversation": mapping });
  let pending;
  const chat = createHomeAiChat("guest", { canAsk: (q) => { pending = q; return false; },
    createConversation: () => { throw Error("must not create"); }, ask: () => { throw Error("must not ask"); } });
  assert.equal(await chat.send("question 4"), false);
  assert.equal(pending, "question 4");
  assert.equal(chat.getSnapshot().session, null);
});

test("login dialog is accessible, shows pending question and consent to transfer", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Dialog = require("@radix-ui/react-dialog");
  const LoginDialog = load("components/chat/GuestAiLoginDialog.tsx", {
    "@radix-ui/react-dialog": { ...Dialog, Portal: ({ children }) => React.createElement(React.Fragment, null, children) },
    "@/lib/keycloak": { login: () => { throw Error("SSR must not log in"); } },
    "@/lib/guest-ai-session": { guestChatState: { subscribe: () => () => {}, getSnapshot: () => ({ loginRequired: true, pendingQuestion: "Phòng nào phù hợp nhất?" }) } },
  }).default;
  const html = renderToStaticMarkup(React.createElement(LoginDialog));
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /Đăng nhập và tiếp tục/);
  assert.match(html, /Phòng nào phù hợp nhất/);
  assert.match(html, /không được lưu lịch sử/);
  assert.match(html, /Để sau/);
  assert.match(html, /max-h-\[90svh\]/);
});

test("expired login handoff is deleted without calling any API", async () => {
  const originalStorage = global.sessionStorage;
  let value = JSON.stringify({ nonce: "expired", expires: Date.now() - 1, guestState: "old" });
  global.sessionStorage = { getItem: () => value, removeItem: () => { value = null; } };
  try {
    const mod = load("lib/guest-ai-session.ts", { "@/lib/axios-client": { post: () => { throw Error("must not claim an expired state"); } } });
    assert.equal(await mod.resumeGuestConversation("expired"), null);
    assert.equal(value, null);
  } finally { global.sessionStorage = originalStorage; }
});

test("AI chat is a public page; account-only pages remain guarded", () => {
  const { isProtectedRoute } = load("features/auth/protectedRoutes.ts");
  assert.equal(isProtectedRoute("/chat"), false);
  for (const route of ["/settings", "/favorites", "/history", "/notifications", "/chat/call"]) {
    assert.equal(isProtectedRoute(route), true);
  }
});

test("guest home controller supports search and follow-up without a login or paid greeting", async () => {
  const mapping = load("lib/ai-conversation.ts");
  const { createHomeAiChat } = load("lib/home-ai-chat.ts", { "@/lib/ai-conversation": mapping });
  const calls = [];
  const chat = createHomeAiChat("guest", {
    createConversation: async () => { calls.push("create"); return { id: "guest-id", title: "Đoạn chat mới", messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; },
    ask: async (question, id) => { calls.push([question, id]); return { answer: "Tin công khai", status: "ANSWERED", listingIds: [] }; },
  });
  assert.deepEqual(calls, []);
  assert.equal(await chat.send("Tìm trọ Phú Lợi"), true);
  assert.equal(await chat.send("Ở 2 người được không?"), true);
  assert.deepEqual(calls, ["create", ["Tìm trọ Phú Lợi", "guest-id"], ["Ở 2 người được không?", "guest-id"]]);
});
