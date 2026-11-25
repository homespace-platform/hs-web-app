const documentFormats = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

export type ChatDocumentFormat = (typeof documentFormats)[keyof typeof documentFormats];

export function chatDocumentFormat(name = "", contentType = ""): ChatDocumentFormat | undefined {
  if (Object.hasOwn(documentFormats, contentType)) {
    return documentFormats[contentType as keyof typeof documentFormats];
  }
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || extension === "doc" || extension === "docx") return extension;
}

export function previewFileUrl(value: string) {
  if (!value.trim()) throw new Error("Attachment URL missing");
  const url = new URL(value, window.location.origin);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    throw new Error("Invalid attachment URL");
  }
  return url.href;
}

export async function fetchChatDocument(getUrl: () => Promise<string>, signal: AbortSignal) {
  signal.throwIfAborted();
  const url = await new Promise<string>((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
    void Promise.resolve().then(getUrl).then(resolve, reject).finally(() => signal.removeEventListener("abort", cancel));
  });
  const source = previewFileUrl(url);
  const response = await fetch(source, { signal, credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error("Attachment fetch failed");
  return response.blob();
}
