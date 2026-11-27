"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reads on mount, whenever `load` changes and whenever the owner comes back to the window. Late answers are
 * dropped; a failed refresh keeps the last answer of the same `load`. Both arguments must be stable.
 */
export function useRefetchOnReturn<T>(load: () => Promise<T>, describe: (error: unknown) => string) {
  const [result, setResult] = useState<{ load: () => Promise<T>; data: T | null; error: string; at: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const data = await load();
      if (mine !== seq.current) return;
      setResult({ load, data, error: "", at: Date.now() });
    } catch (failure) {
      if (mine !== seq.current) return;
      const error = describe(failure);
      setResult((old) => ({ load, data: old?.load === load ? old.data : null, error, at: old?.at ?? 0 }));
    }
    setLoading(false);
  }, [load, describe]);

  useEffect(() => {
    void reload();
    const refresh = () => void reload();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [reload]);

  const current = result?.load === load ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? "", at: current?.at ?? 0, loading, reload };
}
