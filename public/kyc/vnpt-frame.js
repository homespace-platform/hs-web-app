/* The SDK runs in an isolated document; removing the iframe releases its camera. */
(() => {
  "use strict";
  if (window.parent === window) return;
  const origin = window.location.origin;
  const nativeFetch = window.fetch.bind(window);
  const pending = new Map();
  const steps = new Set(["upload", "card", "ocr", "ocr-front", "face", "compare", "mask"]);
  let nonce, started = false;
  const send = (data) => window.parent.postMessage({ ...data, nonce }, origin);
  if (window.navigator?.mediaDevices?.getUserMedia) {
    const capture = window.navigator.mediaDevices.getUserMedia.bind(window.navigator.mediaDevices);
    window.navigator.mediaDevices.getUserMedia = async (...args) => {
      try { return await capture(...args); }
      catch (error) { send({ type: "vnpt:camera-error" }); throw error; }
    };
  }
  window.fetch = async (url, options = {}) => {
    const target = new URL(typeof url === "string" || url instanceof URL ? url : url.url, origin);
    if (target.origin === origin && target.pathname.startsWith("/vendor/vnpt/")) return nativeFetch(url, options);
    if (target.origin !== origin || !target.pathname.startsWith("/__homespace_vnpt__/")) throw new Error("Unapproved capture endpoint");
    const step = target.pathname.slice("/__homespace_vnpt__/".length);
    if (!nonce || options.method !== "POST" || !steps.has(step)) throw new Error("Invalid capture request");
    const id = crypto.randomUUID();
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("Capture timeout")); }, 60000);
      pending.set(id, { resolve, reject, timer });
    });
    const data = options.body instanceof FormData ? { file: options.body.get("file") } : { body: JSON.parse(options.body) };
    send({ type: "vnpt:request", id, step, ...data });
    return new Response(JSON.stringify(await result), { headers: { "Content-Type": "application/json" } });
  };
  window.addEventListener("message", (event) => {
    if (event.origin !== origin || event.source !== window.parent || !event.data || typeof event.data !== "object") return;
    const data = event.data;
    if (data.type === "vnpt:init" && !started && typeof data.nonce === "string") {
      started = true; nonce = data.nonce;
      if (!window.SDK || !Number.isFinite(data.maxImageMb)) { send({ type: "vnpt:error" }); return; }
      if (!window.navigator?.mediaDevices?.getUserMedia) { send({ type: "vnpt:camera-error" }); return; }
      try {
        window.SDK.launch({
          BACKEND_URL: origin + "/__homespace_vnpt__", ACCESS_TOKEN: "", TOKEN_ID: "", TOKEN_KEY: "",
          ENDPOINT_UPLOAD_IMAGE: "/upload", ENDPOINT_LIVENESS_DOCUMENT: "/card", ENDPOINT_OCR_DOCUMENT: "/ocr",
          ENDPOINT_OCR_DOCUMENT_FRONT: "/ocr-front", ENDPOINT_LIVENESS_FACE: "/face", ENDPOINT_COMPARE_FACE: "/compare", ENDPOINT_MASKED_FACE: "/mask",
          SDK_FLOW: "DOCUMENT_TO_FACE", DOCUMENT_TYPE_START: -1, LIST_TYPE_DOCUMENT: [-1], USE_METHOD: data.allowUpload === true ? "PHOTO_AND_UPLOAD" : "PHOTO", HAS_QR_SCAN: false,
          ENABLE_API_UPLOAD_IMAGE: true, ENABLE_API_LIVENESS_DOCUMENT: true, ENABLE_API_LIVENESS_FACE: true,
          ENABLE_API_MASKED_FACE: true, ENABLE_API_COMPARE_FACE: true, ENABLE_API_OCR_DOCUMENT: true,
          HAS_RESULT_SCREEN: false, HAS_BACKGROUND_IMAGE: false, DEFAULT_LANGUAGE: "vi", MAX_SIZE_IMAGE: data.maxImageMb,
          URL_WEB_OVAL: origin + "/vendor/vnpt/lib/web-oval.json", URL_MOBILE_OVAL: origin + "/vendor/vnpt/lib/mobile-oval.json",
          URL_ENGLISH_VIDEO_TUTORIAL: origin + "/vendor/vnpt/lib/english-tutorial.mp4", URL_VIETNAMESE_VIDEO_TUTORIAL: origin + "/vendor/vnpt/lib/vietnamese-tutorial.mp4",
          CUSTOM_THEME: { PRIMARY_COLOR: "#2563eb", TEXT_COLOR_DEFAULT: "#0f172a", BACKGROUND_COLOR: "#ffffff" },
          CALL_BACK_END_FLOW: () => send({ type: "vnpt:complete" }),
        });
      } catch { send({ type: "vnpt:error" }); }
    }
    if (data.type === "vnpt:response" && data.nonce === nonce && pending.has(data.id)) {
      const call = pending.get(data.id); pending.delete(data.id); clearTimeout(call.timer);
      if (data.error) call.reject(new Error("Capture request failed")); else call.resolve(data.result);
    }
  });
  send({ type: "vnpt:ready" });
})();
