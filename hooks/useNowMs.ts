import { useEffect, useState } from "react";

/** Browser clock that re-renders every `intervalMs`; UX hint only, the server decides deadlines. */
export function useNowMs(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
