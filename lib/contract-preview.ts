import type { ContractDocumentResponse } from "@/types/contract.type";

export function isUncertainPreviewError(error: unknown): boolean {
  const err = error as { response?: { status?: number }; code?: string } | null;
  if (!err || typeof err !== "object") return false;
  return [502, 503, 504].includes(err.response?.status ?? 0)
    || (!err.response && ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"].includes(err.code ?? ""));
}

export interface PreviewTransport {
  trigger: (signal: AbortSignal) => Promise<ContractDocumentResponse>;
  status: (signal: AbortSignal) => Promise<ContractDocumentResponse | null>;
}

const sleep = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  signal.throwIfAborted();
  const abort = () => { clearTimeout(timer); reject(signal.reason); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, milliseconds);
  signal.addEventListener("abort", abort, { once: true });
});

/** POST once. An uncertain transport result is reconciled only with read-only requests. */
export async function generateContractPreview(
  transport: PreviewTransport,
  revisionId: string,
  signal: AbortSignal,
  onReconciling: () => void,
  options: { attempts?: number; wait?: (ms: number, signal: AbortSignal) => Promise<void> } = {},
): Promise<ContractDocumentResponse | null> {
  signal.throwIfAborted();
  try {
    const doc = await transport.trigger(signal);
    signal.throwIfAborted();
    if (doc?.status === "READY" && doc.revisionId === revisionId && doc.storageObjectId) return doc;
  } catch (error) {
    signal.throwIfAborted();
    if (!isUncertainPreviewError(error)) throw error;
  }
  onReconciling();
  for (let attempt = 0; attempt < (options.attempts ?? 20); attempt++) {
    signal.throwIfAborted();
    try {
      const doc = await transport.status(signal);
      signal.throwIfAborted();
      if (doc?.status === "READY" && doc.revisionId === revisionId && doc.storageObjectId) return doc;
    } catch (error) {
      signal.throwIfAborted();
      if (!isUncertainPreviewError(error)) throw error;
    }
    if (attempt + 1 < (options.attempts ?? 20)) await (options.wait ?? sleep)(3000, signal);
  }
  return null; // Unknown is not failure. A subsequent explicit click safely reuses server result.
}
