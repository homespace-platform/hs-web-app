/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness loads transpiled TS in a VM. */
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
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const mapping = load("lib/ai-conversation.ts");
const { createHomeAiChat } = load("lib/home-ai-chat.ts", { "@/lib/ai-conversation": mapping });
const detail = (id = "owned-session", messages = []) => ({ id, title: "Đoạn chat mới", messages, isPinned: false, createdAt: "2026-10-11T12:00:00Z", updatedAt: "2026-10-11T12:00:00Z" });
const answer = { answer: "Đã tìm thấy phòng phù hợp", status: "ANSWERED", listingIds: ["00000000-0000-0000-0000-000000000001"], listingPositions: { "00000000-0000-0000-0000-000000000001": 3 }, suggestedQuestions: ["Vì sao bạn ưu tiên phòng này?"] };
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

test("home creates once on first send, uses same ID for follow-up and hydrates card metadata", async () => {
  const calls = [];
  const chat = createHomeAiChat("tenant-1", {
    createConversation: async () => { calls.push("create"); return detail(); },
    ask: async (q, id) => { calls.push([q, id]); return answer; },
  });
  assert.deepEqual(calls, []); // Opening/rendering is free; no API until a question.
  await chat.send("Tìm trọ Phú Lợi");
  await chat.send("Phòng số 3 gửi xe miễn phí không?");
  assert.deepEqual(calls, ["create", ["Tìm trọ Phú Lợi", "owned-session"], ["Phòng số 3 gửi xe miễn phí không?", "owned-session"]]);
  assert.equal(chat.getSnapshot().session.messages.length, 4);
  assert.deepEqual(chat.getSnapshot().session.messages[3].listingIds, answer.listingIds);
  assert.deepEqual(chat.getSnapshot().session.messages[3].listingPositions, answer.listingPositions);
  assert.deepEqual(chat.getSnapshot().session.messages[3].suggestedQuestions, answer.suggestedQuestions);
});

test("busy mutex prevents duplicate clicks/Enter; home cannot reset its conversation", async () => {
  const pending = deferred();
  let calls = 0;
  const chat = createHomeAiChat("tenant", { createConversation: () => pending.promise, ask: async () => { calls++; return answer; } });
  const first = chat.send("Tìm phòng");
  assert.equal(chat.getSnapshot().session.messages[0].content, "Tìm phòng");
  assert.equal(await chat.send("Tìm phòng"), false);
  assert.equal(chat.newConversation, undefined);
  pending.resolve(detail());
  await first;
  assert.equal(calls, 1);
  assert.equal(chat.getSnapshot().session.id, "owned-session");
});

test("uninitialized/empty/overlength inputs never call API", async () => {
  const api = { createConversation: () => { throw new Error("API must not run"); } };
  assert.equal(await createHomeAiChat(null, api).send("Tìm phòng"), false);
  const chat = createHomeAiChat("tenant", api);
  assert.equal(await chat.send("   "), false);
  assert.equal(await chat.send("a".repeat(501)), false);
});

test("logout during create prevents subsequent paid ask; identity switch has isolated snapshots", async () => {
  const pending = deferred();
  const chat = createHomeAiChat("old-owner", { createConversation: () => pending.promise, ask: () => { throw new Error("must not ask after logout"); } });
  const send = chat.send("Tìm phòng");
  chat.setActive(false);
  const next = createHomeAiChat("new-owner", {});
  pending.resolve(detail());
  assert.equal(await send, false);
  assert.equal(next.getSnapshot().session, null);
});

test("timeout re-reads authoritative history, never retries generation or invents assistant content", async () => {
  let asks = 0, reads = 0;
  const chat = createHomeAiChat("tenant", {
    createConversation: async () => detail(),
    ask: async () => { asks++; throw new Error("timeout"); },
    getConversation: async (id) => { reads++; return detail(id, [{ id: "saved", role: "user", content: "Tìm phòng", createdAt: "2026-10-11T12:00:00Z" }]); },
  });
  assert.equal(await chat.send("Tìm phòng"), false);
  assert.equal(asks, 1);
  assert.equal(reads, 1);
  assert.equal(chat.getSnapshot().isSending, false);
  assert.equal(chat.getSnapshot().session.messages.length, 1);
  assert.equal(chat.getSnapshot().session.messages[0].id, "saved");
  assert.ok(chat.getSnapshot().error);
});

test("create failure preserves ability to start a session again", async () => {
  let creates = 0;
  const chat = createHomeAiChat("tenant", {
    createConversation: async () => { if (++creates === 1) throw new Error("offline"); return detail(); },
    ask: async () => answer,
  });
  await chat.send("Tìm phòng");
  assert.equal(chat.getSnapshot().session, null);
  assert.equal(await chat.send("Tìm phòng"), true);
  assert.equal(creates, 2);
});

test("guest quota shows a friendly limit notice, not a connection failure or a fake AI answer", async () => {
  const chat = createHomeAiChat("guest", {
    createConversation: async () => { throw { response: { status: 429 } }; },
  });
  assert.equal(await chat.send("Tìm phòng"), false);
  assert.match(chat.getSnapshot().error, /Bạn đã hỏi khá nhiều/);
  assert.equal(chat.getSnapshot().session, null);
  assert.equal(chat.getSnapshot().isSending, false);
});

test("identity switch while reconciling a timeout never publishes old history or errors", async () => {
  const pending = deferred();
  const reading = deferred();
  const chat = createHomeAiChat("old-owner", {
    createConversation: async () => detail(),
    ask: async () => { throw new Error("timeout"); },
    getConversation: () => { reading.resolve(); return pending.promise; },
  });
  const sending = chat.send("Tìm phòng");
  await reading.promise;
  chat.setActive(false);
  const next = createHomeAiChat("guest", {});
  pending.resolve(detail("old-history", []));
  assert.equal(await sending, false);
  assert.equal(next.getSnapshot().session, null);
  assert.equal(chat.getSnapshot().error, null);
  assert.notEqual(chat.getSnapshot().session.id, "old-history");
});

test("natural-language questions are sent unchanged, without old selection criteria", async () => {
  const questions = [];
  const chat = createHomeAiChat("tenant", { createConversation: async () => detail(), ask: async (question) => { questions.push(question); return answer; } });
  await chat.send("  Mình cần căn hộ ở Hà Nội dưới 8 triệu  ");
  await chat.send("HomeSpace là gì?");
  assert.deepEqual(questions, ["Mình cần căn hộ ở Hà Nội dưới 8 triệu", "HomeSpace là gì?"]);
});

test("explicit handoff uses AI URL parameter, not direct-messaging conversationId", () => {
  assert.equal(mapping.aiConversationHref("id&x=1"), "/chat?channel=ai&aiConversationId=id%26x%3D1");
  assert.equal(mapping.aiConversationHref(""), "/chat?channel=ai");
});

const ChatWindow = load("components/chat/AiChatWindow.tsx", {
  "@/lib/ai-suggested-questions": load("lib/ai-suggested-questions.ts"),
  "@/components/chat/GuestAiLoginDialog": () => null,
  "next/image": ({ unoptimized, ...props }) => React.createElement("img", props),
  "@/components/chat/AiListingCards": ({ listingIds, positions }) => React.createElement("div", { "data-card-ids": listingIds.join(","), "data-card-ordinal": positions?.[listingIds[0]] }),
  "@/components/chat/AiListingLinks": ({ listingIds }) => React.createElement("p", { "data-link-ids": listingIds.join(",") }),
  "@/lib/ai-listing-cards": load("lib/ai-listing-cards.ts"),
  "@/components/chat/AiContractCards": ({ cards }) => React.createElement("div", { "data-contract-cards": cards.map((card) => card.contractId).join(",") }),
  "@/lib/ai-contract-cards": load("lib/ai-contract-cards.ts"),
  "@/components/chat/AiAppointmentCards": ({ cards }) => React.createElement("div", { "data-appointment-cards": cards.map((card) => card.appointmentId).join(",") }),
  "@/lib/ai-appointment-cards": load("lib/ai-appointment-cards.ts"),
  "@/components/chat/AiMarkdownMessage": ({ content }) => React.createElement("div", { "data-markdown": true }, content),
  "@/data/mock-chat-data": { AI_QUICK_TOPICS: [{ id: "overview", title: "HomeSpace là gì?", prompt: "HomeSpace là gì?", desc: "Tìm hiểu HomeSpace" }] },
}).default;

const panelModule = load("components/home/HomeAiChatPanel.tsx", {
  "next/link": ({ children, prefetch, ...props }) => React.createElement("a", props, children),
  "@/lib/ai-conversation": mapping,
  "@/components/chat/AiChatWindow": ChatWindow,
});
const Panel = panelModule.default;
const panelProps = { open: true, onToggle() {}, state: { session: { id: "owned", messages: [] }, isSending: false, error: null }, authenticated: true, initialized: true, customerName: "Bạn", onLogin() {}, onSend() {} };

test("home is only an adapter to the whole shared chat, with smaller height and explicit handoff", () => {
  const html = renderToStaticMarkup(React.createElement(Panel, panelProps));
  assert.match(html, /aiConversationId=owned/);
  assert.match(html, /Mở trang chat/);
  assert.doesNotMatch(html, /Đoạn chat mới/);
  assert.match(html, /aria-controls="home-ai-conversation"/);
  assert.match(html, /560px,65svh/);
  assert.match(html, /motion-reduce:transition-none/);
  assert.match(html, /HomeSpace Assistant AI/);
  assert.match(html, /Câu hỏi cho HomeSpace AI/);
  assert.match(html, /Bạn có thể hỏi tiếp:/);
  const collapsed = renderToStaticMarkup(React.createElement(Panel, { ...panelProps, open: false }));
  assert.match(collapsed, /inert=""/);
  assert.match(collapsed, /grid-rows-\[0fr\]/);
  assert.match(collapsed, /Câu hỏi cho HomeSpace AI/); // Kept mounted; preserve draft.
  assert.doesNotMatch(collapsed, /Quay lại danh sách/);
});

test("guest can use the shared composer and sees an anonymous greeting; loading stays gated", () => {
  const guest = renderToStaticMarkup(React.createElement(Panel, { ...panelProps, authenticated: false }));
  assert.match(guest, /Chào bạn!/);
  assert.doesNotMatch(guest, /Xin chào, Bạn|Đăng nhập để trò chuyện/);
  assert.match(guest, /HomeSpace Assistant AI/);
  assert.match(guest, /Câu hỏi cho HomeSpace AI/);
  assert.match(guest, /Bạn có thể hỏi tiếp:/);
  const loading = renderToStaticMarkup(React.createElement(Panel, { ...panelProps, initialized: false }));
  assert.match(loading, /Đang chuẩn bị trợ lý/);
  assert.doesNotMatch(loading, /Câu hỏi cho HomeSpace AI/);
});

test("both sizes have identical header, welcome topics, chips and composer; only layout differs", () => {
  const props = { session: null, customerName: "Bạn", onSendMessage() {}, onSelectTopic() {} };
  for (const size of ["full", "compact"]) {
    const html = renderToStaticMarkup(React.createElement(ChatWindow, { ...props, size }));
    for (const content of ["HomeSpace Assistant AI", "Xin chào, Bạn", "Tìm hiểu HomeSpace", "Bạn có thể hỏi tiếp:", "Câu hỏi cho HomeSpace AI"]) assert.ok(html.includes(content), `${size}: ${content}`);
    assert.doesNotMatch(html, /Đoạn chat mới/);
    assert.equal((html.match(/HomeSpace là gì\?<\/p>/g) || []).length, 1);
    assert.match(html, /data-ai-greeting/); // Welcome is the first assistant bubble.
    assert.equal(html.includes("560px,65svh"), size === "compact");
  }
});

test("both sizes reuse the same two-sided stream, Markdown, card metadata and suggestions", () => {
  const session = { ...detail(), messages: [
    mapping.toChatMessage({ id: "q", role: "user", content: "Tìm phòng Phú Lợi", createdAt: detail().createdAt }),
    mapping.toChatMessage({ id: "a", role: "assistant", content: "Mình tìm thấy phòng phù hợp", createdAt: detail().createdAt, listingIds: answer.listingIds, listingPositions: answer.listingPositions, suggestedQuestions: answer.suggestedQuestions }),
  ] };
  const props = { session, onBack() {}, onSendMessage() {}, onSelectTopic() {} };
  for (const size of ["full", "compact"]) {
    const html = renderToStaticMarkup(React.createElement(ChatWindow, { ...props, size }));
    assert.match(html, /justify-end/);
    assert.match(html, /justify-start/);
    assert.match(html, /data-markdown="true"/);
    assert.match(html, /data-card-ordinal="3"/);
    assert.match(html, /overscroll-contain/);
    assert.doesNotMatch(html, /Đoạn chat mới/);
    assert.match(html, /Bạn có thể hỏi tiếp:/);
  }
});

test("contract cards and sources render beside, not instead of, listing cards and old messages", () => {
  const cid = "00000000-0000-0000-0000-0000000000c1";
  const card = { contractId: cid, contractNumber: "HD-1", askerRole: "TENANT", roleLabel: "Người thuê", status: "ACTIVE",
    statusLabel: "Đang có hiệu lực", leasePhase: "IN_LEASE", phaseLabel: "Đang trong thời hạn thuê" };
  const session = { ...detail(), messages: [
    mapping.toChatMessage({ id: "old", role: "assistant", content: "Tin cũ", createdAt: detail().createdAt, listingIds: answer.listingIds, listingPositions: answer.listingPositions }),
    mapping.toChatMessage({ id: "c", role: "assistant", content: "Theo dữ liệu hệ thống", createdAt: detail().createdAt, status: "ANSWERED", contractCards: [card], dataSources: ["CORE_CONTRACT"] }),
    mapping.toChatMessage({ id: "n", role: "assistant", content: "Không đọc được", createdAt: detail().createdAt, status: "TOOL_UNAVAILABLE", dataSources: ["CORE_CONTRACT"] }),
  ] };
  const html = renderToStaticMarkup(React.createElement(ChatWindow, { session, onBack() {}, onSendMessage() {}, onSelectTopic() {} }));
  assert.match(html, /data-card-ordinal="3"/);                 // listing history untouched
  assert.match(html, new RegExp(`data-contract-cards="${cid}"`));
  assert.ok(html.includes("Nguồn: dữ liệu hợp đồng của bạn, đọc từ hệ thống."));
  assert.ok(html.includes("Chưa đọc được dữ liệu hợp đồng lúc này"));
  assert.ok(!html.includes("Chưa kiểm tra được dữ liệu tin đăng"));
});

function renderHomeSearch(snapshot, chatVisible = false) {
  let booleanState = 0;
  const SearchBar = load("components/home/AiSearchBar.tsx", {
    "@/lib/guest-ai-session": { guestChatState: {} },
    react: { ...React, useState: (initial) => initial === false && ++booleanState <= 2 ? [chatVisible, () => {}] : React.useState(initial) },
    "next/dynamic": () => () => null,
    "@/components/ui/button": { Button: ({ children, ...props }) => React.createElement("button", props, children) },
    "@/data/featured-locations": { getFeaturedLocationsByProvince: () => [{ label: "Chợ Bến Thành" }] },
    "@/features/auth/useAuth": { useAuth: () => ({ profile: { id: "tenant", username: "Bạn" }, authenticated: true, initialized: true, login() {} }) },
    "@/services/ai.service": { aiService: {} },
    "@/lib/home-ai-chat": { createHomeAiChat: () => ({ subscribe: () => () => {}, getSnapshot: () => snapshot, setActive() {}, send() {} }) },
  }).default;
  return renderToStaticMarkup(React.createElement(SearchBar));
}

test("home removes selectors and preserves featured places before any messages", () => {
  for (const session of [null, { id: "owned", messages: [] }]) {
    const html = renderHomeSearch({ session, isSending: false, error: null });
    assert.match(html, /Chợ Bến Thành/);
    assert.match(html, /Mô tả nhu cầu tìm nơi ở/);
    assert.match(html, /Tìm kiếm nhanh/);
    assert.doesNotMatch(html, /Tất cả quận\/huyện|Tất cả thể loại|Đoạn chat mới/);
  }
});

test("featured places disappear on the first message, including pending and collapsed chat", () => {
  for (const isSending of [true, false]) {
    const html = renderHomeSearch({ session: { id: "owned", messages: [{ id: "q", sender: "me", content: "Tìm phòng" }] }, isSending, error: null });
    assert.doesNotMatch(html, /Địa điểm nổi bật|Chợ Bến Thành/);
    assert.match(html, /aria-expanded="false"/); // Hidden even when chat is collapsed.
  }
});

test("opening chat animates search height from full to zero and makes hidden inputs inert", () => {
  const snapshot = { session: null, isSending: false, error: null };
  const open = renderHomeSearch(snapshot, true);
  assert.match(open, /aria-hidden="true" inert="" data-home-search=""/);
  assert.match(open, /grid-rows-\[0fr\] opacity-0 -translate-y-4/);
  assert.match(open, /motion-reduce:transition-none/);
  assert.match(open, /Mô tả nhu cầu tìm nơi ở/); // Draft input is kept mounted.
  const closed = renderHomeSearch(snapshot, false);
  assert.match(closed, /aria-hidden="false" data-home-search=""/);
  assert.match(closed, /grid-rows-\[1fr\] opacity-100 translate-y-0/);
});

test("chat centers below fixed navigation; oversized panels align below header, never scroll negative", () => {
  assert.equal(panelModule.homeChatScrollTarget(600, 626, 0, 922), 412);
  assert.equal(panelModule.homeChatScrollTarget(300, 626, 300, 922), 412);
  assert.equal(panelModule.homeChatScrollTarget(600, 1000, 0, 922), 520);
  assert.equal(panelModule.homeChatScrollTarget(20, 626, 0, 922), 0);
});

test("new conversation action remains in the chat sidebar, not either shared header", () => {
  const page = fs.readFileSync(path.join(__dirname, "..", "app/chat/page.tsx"), "utf8");
  const sidebar = fs.readFileSync(path.join(__dirname, "..", "components/chat/ChatSidebar.tsx"), "utf8");
  assert.match(page, /onNewAiSession=\{handleNewAiSession\}/);
  assert.match(sidebar, /onClick=\{onNewAiSession\}/);
  assert.match(sidebar, /Đoạn chat mới/);
});
