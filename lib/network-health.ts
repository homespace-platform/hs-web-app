import { createNetworkHealthMonitor } from "@/lib/network-health-monitor";

// Điểm thử bên thứ ba, độc lập với backend. no-cors => kết quả opaque, chỉ cần promise resolve.
const PROBE_URLS = [
  "https://www.gstatic.com/generate_204",
  "https://cp.cloudflare.com/generate_204",
];
const TIMEOUT_MS = 6_000;

async function probe() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await Promise.any(PROBE_URLS.map((url) =>
      fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal })));
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

export const networkHealth = createNetworkHealthMonitor(probe, {
  activeIntervalMs: 15_000,
  blockedIntervalMs: 2_000,
  minGapMs: 1_000,
  slowRttMs: 2_500,
  badToBlock: 2,
  goodToUnblock: 3,
});
