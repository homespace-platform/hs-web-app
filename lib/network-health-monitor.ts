export type NetworkHealthStatus = "checking" | "online" | "offline";
export type NetworkHealthState = {
  status: NetworkHealthStatus;
  /** Nguyên nhân khi đang chặn: offline = không có mạng, weak = chậm/chập chờn. */
  reason: "offline" | "weak";
  /** Số lượt GOOD liên tiếp khi đang chặn (tiến độ xác nhận ổn định). */
  goodStreak: number;
};
export type NetworkHealthOptions = {
  activeIntervalMs: number;
  blockedIntervalMs: number;
  minGapMs: number;
  slowRttMs: number;
  badToBlock: number;
  goodToUnblock: number;
};

const INITIAL: NetworkHealthState = { status: "checking", reason: "offline", goodStreak: 0 };

/** probe: resolve true nếu có ít nhất một điểm thử trả lời; false/throw = thất bại. */
export function createNetworkHealthMonitor(probe: () => Promise<boolean>, o: NetworkHealthOptions) {
  let state = INITIAL;
  let badStreak = 0;
  let lastCheckAt = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight = false;
  const listeners = new Set<() => void>();

  const publish = (next: Partial<NetworkHealthState>) => {
    const merged = { ...state, ...next };
    if (merged.status === state.status && merged.reason === state.reason
        && merged.goodStreak === state.goodStreak) return;
    state = merged;
    listeners.forEach((listener) => listener());
  };
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const blocked = () => state.status === "offline";
  const schedule = (delay: number) => {
    clearTimer();
    if (listeners.size && !document.hidden) timer = setTimeout(check, Math.max(0, delay));
  };
  const block = (reason: "offline" | "weak") => publish({ status: "offline", reason, goodStreak: 0 });

  function apply(ok: boolean, rtt: number) {
    if (navigator.onLine === false) {
      block("offline");
      return;
    }
    if (ok && rtt <= o.slowRttMs) {
      badStreak = 0;
      if (!blocked()) {
        publish({ status: "online" });
        return;
      }
      const goodStreak = state.goodStreak + 1;
      if (goodStreak >= o.goodToUnblock) {
        publish({ status: "online", goodStreak: 0 });
        // Cho backend monitor kiểm tra lại ngay để không nháy màn "gián đoạn".
        window.dispatchEvent(new Event("hs:backend-health-check"));
      } else {
        publish({ reason: "weak", goodStreak });
      }
      return;
    }
    badStreak++;
    if (blocked() || badStreak >= o.badToBlock) {
      block(!ok && state.goodStreak === 0 ? "offline" : "weak");
    }
  }

  function check() {
    clearTimer();
    if (!listeners.size || document.hidden || inFlight) return;
    if (navigator.onLine === false) {
      block("offline");
      schedule(o.blockedIntervalMs);
      return;
    }
    const remaining = o.minGapMs - (Date.now() - lastCheckAt);
    if (remaining > 0) {
      schedule(remaining);
      return;
    }
    inFlight = true;
    const start = lastCheckAt = Date.now();
    Promise.resolve().then(probe).catch(() => false)
      .then((ok) => apply(ok, Date.now() - start))
      .finally(() => {
        inFlight = false;
        // Đang chờ lượt BAD thứ hai: thử lại nhanh như khi chặn thay vì chờ nhịp online.
        schedule(blocked() || badStreak > 0 ? o.blockedIntervalMs : o.activeIntervalMs);
      });
  }

  const resume = () => {
    if (document.hidden) clearTimer();
    else check();
  };
  const offline = () => {
    block("offline");
    schedule(o.blockedIntervalMs);
  };

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => INITIAL,
    recheck: check,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        document.addEventListener("visibilitychange", resume);
        window.addEventListener("online", check);
        window.addEventListener("offline", offline);
        window.addEventListener("hs:network-check", check);
        resume();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearTimer();
          document.removeEventListener("visibilitychange", resume);
          window.removeEventListener("online", check);
          window.removeEventListener("offline", offline);
          window.removeEventListener("hs:network-check", check);
        }
      };
    },
  };
}
