"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Read-only fetch that refreshes itself (default 30 s) while the tab is visible and again when it becomes visible.
 * Failures keep the last good value, so a flaky network never blanks the page; `error` is set while the latest read
 * failed (cleared by the next success). `key` identifies the resource: data of another key is never returned.
 */
export function usePolledRead<T>(read: () => Promise<T>, key: string, enabled = true, intervalMs = 30_000) {
  const [state, setState] = useState<{ key: string; value: T } | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const readRef = useRef(read);
  /** Sequence of reads: each reload takes the next number and only the newest one may apply; accept/unmount bump it too. */
  const epoch = useRef(0);
  useEffect(() => { readRef.current = read; });

  const invalidate = useCallback(() => { epoch.current++; }, []);
  const reload = useCallback(async () => {
    const mine = ++epoch.current;
    try {
      const value = await readRef.current();
      if (epoch.current === mine) { setState({ key, value }); setErrorKey(null); }
    } catch { if (epoch.current === mine) setErrorKey(key); /* keep the last good value */ }
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    invalidate();
    void reload();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void reload(); }, intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") void reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { invalidate(); window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [enabled, intervalMs, reload, invalidate]);

  // A newer snapshot supersedes any read still in flight.
  const accept = useCallback((value: T) => { invalidate(); setState({ key, value }); setErrorKey(null); }, [key, invalidate]);
  return { data: state?.key === key ? state.value : null, error: errorKey === key, reload, accept };
}
