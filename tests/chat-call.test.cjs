/* eslint-disable @typescript-eslint/no-require-imports -- Node harness loads TSX without a browser. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { loadTs } = require("./helpers/ts-loader.cjs");

const flush = () => new Promise(setImmediate);
const call = { conversationId: "conversation", callId: "call", mode: "video" };

function setup(t) {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const effects = [];
  const state = [];
  const cleanups = [];
  global.window = new EventTarget();
  global.document = new EventTarget();
  t.after(() => {
    try {
      cleanups.forEach((cleanup) => cleanup());
    } finally {
      global.window = previousWindow;
      global.document = previousDocument;
    }
  });
  return {
    state,
    react: {
      ...React,
      useEffect: (effect) => effects.push(effect),
      useCallback: (callback) => callback,
      useMemo: (callback) => callback(),
      useRef: (current) => ({ current }),
      useState: (value) => {
        const index = state.push(value) - 1;
        return [value, (next) => {
          state[index] = typeof next === "function" ? next(state[index]) : next;
        }];
      },
    },
    runEffects: () => {
      for (const effect of effects) {
        const cleanup = effect();
        if (cleanup) cleanups.push(cleanup);
      }
    },
  };
}

function mountRoom(t, agora, createCallToken, historyEnabled) {
  const runtime = setup(t);
  const endCall = t.mock.fn();
  const { default: CallRoom } = loadTs("components/chat/CallRoom.tsx", {
    [t.name]: undefined, // The test loader caches modules by the names of their overrides.
    react: runtime.react,
    sonner: { toast: { error() {} } },
    "agora-rtc-sdk-ng": { default: agora, __esModule: true },
    "@/components/chat/ChatDemoProvider": { useChatDemo: () => ({ endCall }) },
    "@/services/chat.service": { createCallToken },
  });
  CallRoom({ ...call, participantName: "Partner", historyEnabled });
  runtime.runEffects();
  return { status: () => runtime.state[0], endCall };
}

test("call history negotiates on connect and a blocked popup stays retryable", async (t) => {
  const runtime = setup(t);
  const handlers = {};
  const emitted = [];
  const acknowledged = [];
  const requestedPopup = new EventTarget();
  const dismiss = t.mock.fn();
  const error = t.mock.fn();
  const close = t.mock.fn();
  const replace = t.mock.fn();
  let popup = null;
  let toastAction;
  let messageAck;
  let inviteAck;
  Object.assign(requestedPopup, { closed: false, close, location: { replace }, focus() {} });
  Object.assign(window, {
    location: { origin: "https://example.com" },
    screen: { availWidth: 1200, availHeight: 800 },
    open: t.mock.fn(() => popup),
    setInterval() {},
    clearInterval() {},
  });
  const socket = {
    connected: true,
    on: (name, fn) => { handlers[name] = fn; },
    emit: (...args) => emitted.push(args),
    timeout: () => socket,
    emitWithAck: async (...args) => { acknowledged.push(args); return args[0] === "chat:send" ? messageAck : inviteAck; },
    io: { on() {}, opts: {} },
    removeAllListeners() {},
    disconnect() {},
  };
  const { ChatDemoProvider } = loadTs("components/chat/ChatDemoProvider.tsx", {
    react: runtime.react,
    "socket.io-client": { io: () => socket },
    "sonner": { toast: { custom: (render) => { toastAction = render("call-call").props; }, dismiss, error } },
    "@/features/auth/useAuth": { useAuth: () => ({ authenticated: true, profile: { id: "me" } }) },
    "@/lib/keycloak": { token: "test-token", updateToken: async () => {} },
    "@/services/chat.service": { listConversations: async () => [] },
  });
  const { endCall, sendMessage, startCall } = ChatDemoProvider({ children: null }).props.value;
  endCall(call.conversationId, call.callId);
  runtime.runEffects();
  await flush();
  assert.deepEqual(emitted.splice(0), [["chat:call:end", { conversationId: "conversation", callId: "call" }]]);
  handlers["chat:call:incoming"](call);
  toastAction.onAccept();
  assert.equal(error.mock.callCount(), 1);
  assert.equal(dismiss.mock.callCount(), 0);
  popup = requestedPopup;
  toastAction.onAccept();
  assert.equal(dismiss.mock.callCount(), 1);
  assert.deepEqual(emitted.shift(), ["chat:call:accept", { conversationId: "conversation", callId: "call" }]);
  handlers["chat:call:ended"](call);
  assert.equal(close.mock.callCount(), 1);
  handlers["chat:call:incoming"](call);
  toastAction.onReject();
  assert.deepEqual(emitted.shift(), ["chat:call:end", { conversationId: "conversation", callId: "call" }]);
  const files = [{ storageId: "chat_1", fileName: "proof.pdf", contentType: "application/pdf", sizeBytes: 20 }];
  assert.equal(await sendMessage(call.conversationId, "", undefined, files), false);
  assert.equal(acknowledged.at(-1)[1].content, "Đã gửi proof.pdf");
  handlers.connect();
  const [event, payload, ready] = emitted.shift();
  assert.equal(event, "chat:call:history-ready");
  assert.deepEqual(payload, {});
  ready(null, { ok: true });
  startCall(call.conversationId, "voice", "Partner");
  assert.equal(acknowledged.at(-1)[1].historyVersion, undefined);
  assert.match(window.open.mock.calls.at(-1).arguments[0], /^\/chat\/call\?.*mode=voice/);
  handlers.connect();
  emitted.shift()[2](null, { ok: true, historyVersion: 1 });
  inviteAck = { ...call, mode: "voice" };
  startCall(call.conversationId, "voice", "Partner");
  assert.equal(acknowledged.at(-1)[1].historyVersion, 1);
  assert.equal(window.open.mock.calls.at(-1).arguments[0], "about:blank");
  await flush();
  assert.equal(new URL(replace.mock.calls.at(-1).arguments[0]).searchParams.get("historyVersion"), null);
  inviteAck = { ...call, mode: "voice", historyVersion: 1 };
  startCall(call.conversationId, "voice", "Partner");
  await flush();
  assert.equal(new URL(replace.mock.calls.at(-1).arguments[0]).searchParams.get("historyVersion"), "1");

  let settleInvite;
  inviteAck = new Promise((resolve) => { settleInvite = resolve; });
  startCall(call.conversationId, "voice", "Partner");
  const earlyEnd = acknowledged.at(-1)[1];
  handlers["chat:call:ended"](earlyEnd);
  settleInvite(earlyEnd);
  await flush();
  assert.equal(close.mock.callCount(), 2);
  assert.equal(replace.mock.callCount(), 2);

  messageAck = { id: "message", conversationId: call.conversationId, senderId: "me", content: "", attachments: files };
  assert.equal(await sendMessage(call.conversationId, "", undefined, files), true);
  assert.equal(acknowledged.at(-1)[1].content, "");
  handlers["chat:call:incoming"]({ ...call, historyVersion: 1 });
  toastAction.onReject();
  assert.deepEqual(emitted.shift(), ["chat:call:end", { conversationId: "conversation", callId: "call", reason: "declined" }]);
});

test("a failed media setup ends a history-enabled call with the failed reason", async (t) => {
  const room = mountRoom(t, {
    on() {}, off() {},
    createMicrophoneAudioTrack: async () => { throw new Error("permission denied"); },
  }, t.mock.fn(), true);
  await flush();
  assert.equal(room.status(), "error");
  assert.deepEqual(room.endCall.mock.calls[0].arguments, ["conversation", "call", "failed"]);
});

test("remote hangup closes the mic and any camera returned after browser permission", async (t) => {
  const microphone = { stop: t.mock.fn(), close: t.mock.fn() };
  const camera = { close: t.mock.fn() };
  let allowCamera;
  const createCameraVideoTrack = t.mock.fn(() => new Promise((resolve) => { allowCamera = resolve; }));
  const createCallToken = t.mock.fn();
  const room = mountRoom(t, {
    on() {}, off() {},
    createMicrophoneAudioTrack: async () => microphone,
    createCameraVideoTrack,
  }, createCallToken);
  await flush();
  assert.equal(createCameraVideoTrack.mock.callCount(), 1);
  const event = new CustomEvent("hs:call-ended", { cancelable: true, detail: call });
  assert.equal(window.dispatchEvent(event), false);
  allowCamera(camera);
  await flush();
  assert.equal(room.status(), "ended");
  assert.equal(room.endCall.mock.callCount(), 0);
  assert.equal(microphone.close.mock.callCount(), 1);
  assert.equal(camera.close.mock.callCount(), 1);
  assert.equal(createCallToken.mock.callCount(), 0);
});

test("video joins with the exact account string and subscribes to remote audio and video", async (t) => {
  const microphone = { stop() {}, close() {} };
  const camera = { stop() {}, close() {} };
  const handlers = {};
  const client = {
    on: (name, fn) => { handlers[name] = fn; },
    join: t.mock.fn(async () => {}),
    publish: t.mock.fn(async () => {}),
    subscribe: t.mock.fn(async () => {}),
    leave: t.mock.fn(async () => {}),
  };
  const createClient = t.mock.fn(() => client);
  const room = mountRoom(t, {
    on() {}, off() {}, createClient,
    createMicrophoneAudioTrack: async () => microphone,
    createCameraVideoTrack: async () => camera,
  }, async () => ({ appId: "app", channel: "channel", token: "token", uid: "00123" }));
  await flush();
  assert.deepEqual(createClient.mock.calls[0].arguments, [{ mode: "rtc", codec: "vp8" }]);
  assert.deepEqual(client.join.mock.calls[0].arguments, ["app", "channel", "token", "00123"]);
  assert.deepEqual(client.publish.mock.calls[0].arguments, [[microphone, camera]]);
  assert.equal(room.status(), "waiting");
  const user = { audioTrack: { play: t.mock.fn() } };
  await handlers["user-published"](user, "audio");
  await handlers["user-published"](user, "video");
  assert.deepEqual(client.subscribe.mock.calls.map(({ arguments: args }) => args), [[user, "audio"], [user, "video"]]);
  assert.equal(user.audioTrack.play.mock.callCount(), 1);
  assert.equal(room.status(), "connected");
});
