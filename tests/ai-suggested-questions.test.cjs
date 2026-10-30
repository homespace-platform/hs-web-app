/* eslint-disable @typescript-eslint/no-require-imports -- Test the actual TSX handlers with a small hook harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");

function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), mod, mod.exports);
  return mod.exports;
}
const questions = load("lib/ai-suggested-questions.ts");
const prompt = "Vì sao bạn ưu tiên phòng này?";
const message = { id: "a", sender: "them", content: "Kết quả", timestamp: "10:00", status: "read", suggestedQuestions: [prompt] };

test("questions follow only the latest message, are complete, capped and never leak across conversations", () => {
  assert.deepEqual(questions.suggestedQuestions([]), questions.RENTER_STARTER_QUESTIONS);
  assert.deepEqual(questions.suggestedQuestions([message]), [prompt]);
  assert.deepEqual(questions.suggestedQuestions([message, { sender: "me", content: "Xem thêm" }]), []);
  assert.deepEqual(questions.suggestedQuestions([{ ...message, suggestedQuestions: undefined }]), []);
  const items = [prompt, prompt, "Tôi ở [khu vực]", "Ngân sách ...", "Phòng nào rộng hơn?", "Phí ra sao?", "Xem thêm được không?", "Có ban công không?"];
  assert.deepEqual(questions.suggestedQuestions([{ ...message, suggestedQuestions: items }]), [prompt, "Phòng nào rộng hơn?", "Phí ra sao?", "Xem thêm được không?"]);
});

function harness() {
  const slots = [], effects = [];
  let cursor = 0;
  const hooks = { ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], (value) => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(fn) { cursor++; return fn(); },
    useEffect(fn, deps) { const i = cursor++; const prev = slots[i]; if (!prev || deps.some((d, n) => !Object.is(d, prev[n]))) effects.push(fn); slots[i] = deps; },
  };
  const stub = () => null;
  const Window = load("components/chat/AiChatWindow.tsx", {
    react: hooks, "next/image": stub, "@/lib/ai-suggested-questions": questions,
    "@/components/chat/AiListingCards": stub, "@/components/chat/AiListingLinks": stub,
    "@/lib/ai-listing-cards": { splitCardsAndLinks: () => new Map() },
    "@/components/chat/AiContractCards": stub, "@/lib/ai-contract-cards": { safeContractCards: () => [], aiStatusNote: () => null, aiSourceNote: () => null },
    "@/components/chat/AiAppointmentCards": stub, "@/lib/ai-appointment-cards": { safeAppointmentCards: () => [] },
    "@/data/mock-chat-data": { AI_QUICK_TOPICS: [] }, "@/components/chat/AiMarkdownMessage": stub,
    "@/components/chat/GuestAiLoginDialog": stub,
  }).default;
  return (props) => { cursor = 0; const tree = Window({ isVisible: false, ...props }); while (effects.length) effects.shift()(); return tree; };
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, predicate));
  if (!React.isValidElement(tree)) return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}

for (const size of ["full", "compact"]) test(`${size}: click fills the real composer, only explicit submit sends`, () => {
  const render = harness();
  const sent = [], selected = [];
  const props = { size, session: { id: "owned", messages: [message] }, onSendMessage: (...args) => sent.push(args), onSelectTopic: (q) => selected.push(q) };
  let tree = render(props);
  nodes(tree, (node) => node.type === "button" && node.props.title === prompt)[0].props.onClick();
  assert.equal(sent.length, 0); assert.equal(selected.length, 0);
  tree = render(props);
  assert.equal(nodes(tree, (node) => node.type === "input")[0].props.value, prompt);
  nodes(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(sent, [["owned", prompt]]);
  tree = render(props);
  assert.equal(nodes(tree, (node) => node.type === "input")[0].props.value, "");
});

test("external sidebar draft also only fills input; changing conversations clears it", () => {
  const render = harness();
  const sent = [];
  const props = { session: { id: "a", messages: [message] }, onSendMessage: (...args) => sent.push(args), onSelectTopic() {} };
  render(props);
  const draftProps = { ...props, draftRequest: { text: prompt, id: 1 } };
  render(draftProps);
  assert.equal(nodes(render(draftProps), (node) => node.type === "input")[0].props.value, prompt);
  assert.equal(sent.length, 0);
  const next = { ...props, session: { id: "b", messages: [{ ...message, suggestedQuestions: ["Phòng nào khác?"] }] } };
  render(next);
  const tree = render(next);
  assert.equal(nodes(tree, (node) => node.type === "input")[0].props.value, "");
  assert.equal(nodes(tree, (node) => node.type === "button" && node.props.title === prompt).length, 0);
});
