export type BackendHealthStatus = "checking" | "ready" | "unavailable";

export function createBackendHealthMonitor(
  probe: () => Promise<boolean>,
  pollIntervalMs: number,
  retryIntervalMs: number,
) {
  let status: BackendHealthStatus = "checking";
  let lastCheckAt = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | undefined;
  const listeners = new Set<() => void>();

  const publish = (next: BackendHealthStatus) => {
    if (status === next) return;
    status = next;
    listeners.forEach((listener) => listener());
  };
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const schedule = (delay: number) => {
    clearTimer();
    if (listeners.size && !document.hidden && navigator.onLine !== false) {
      timer = setTimeout(check, Math.max(0, delay));
    }
  };
  const interval = () => status === "ready" ? pollIntervalMs : retryIntervalMs;

  function check() {
    clearTimer();
    if (!listeners.size || document.hidden) return;
    if (navigator.onLine === false) {
      publish("unavailable");
      return;
    }
    if (inFlight) return;
    const remaining = retryIntervalMs - (Date.now() - lastCheckAt);
    if (remaining > 0) {
      schedule(remaining);
      return;
    }
    lastCheckAt = Date.now();
    inFlight = Promise.resolve().then(probe)
      .then((ready) => publish(ready && navigator.onLine !== false ? "ready" : "unavailable"))
      .catch(() => publish("unavailable"))
      .finally(() => {
        inFlight = undefined;
        schedule(interval());
      });
  }

  const resume = () => {
    if (document.hidden) {
      clearTimer();
      return;
    }
    const remaining = interval() - (Date.now() - lastCheckAt);
    if (remaining > 0) schedule(remaining);
    else check();
  };
  const offline = () => {
    clearTimer();
    publish("unavailable");
  };

  return {
    getSnapshot: () => status,
    getServerSnapshot: (): BackendHealthStatus => "checking",
    recheck: check,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        document.addEventListener("visibilitychange", resume);
        window.addEventListener("online", check);
        window.addEventListener("offline", offline);
        window.addEventListener("hs:backend-health-check", check);
        resume();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearTimer();
          document.removeEventListener("visibilitychange", resume);
          window.removeEventListener("online", check);
          window.removeEventListener("offline", offline);
          window.removeEventListener("hs:backend-health-check", check);
        }
      };
    },
  };
}
