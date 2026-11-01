import type { NearbyPage } from "@/types/nearby.type";

export function isNearbySyncPending(status?: string) {
  return status === "PENDING" || status === "RUNNING" || status === "RETRY_WAIT";
}

/** Bounded reads of our database-backed endpoint; this never requests a provider rescan. */
export function watchNearbySync(
  load: () => Promise<NearbyPage>,
  receive: (data: NearbyPage, watching: boolean) => void,
  failed: () => void,
  signal: AbortSignal,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remaining = 20;
  const cancel = () => { if (timer !== undefined) clearTimeout(timer); };
  signal.addEventListener("abort", cancel, { once: true });
  async function read() {
    if (signal.aborted) return;
    try {
      const data = await load();
      if (signal.aborted) return;
      const watching = data.enabled && isNearbySyncPending(data.syncStatus) && remaining-- > 0;
      receive(data, watching);
      if (watching) timer = setTimeout(read, 3000);
      else signal.removeEventListener("abort", cancel);
    } catch {
      if (!signal.aborted) failed();
      signal.removeEventListener("abort", cancel);
    }
  }
  void read();
}
