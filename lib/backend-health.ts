import axiosClient from "@/lib/axios-client";
import { createBackendHealthMonitor } from "@/lib/backend-health-monitor";

const POLL_INTERVAL_MS = 60_000;
const RETRY_INTERVAL_MS = 10_000;
const TIMEOUT_MS = 5_000;

export const backendHealth = createBackendHealthMonitor(async () => {
  const response = await axiosClient.get("/api/v1/actuator/health", {
    backendHealthProbe: true,
    timeout: TIMEOUT_MS,
    params: { _healthCheck: Date.now() },
    validateStatus: () => true,
  });
  return response.status === 200 && response.data?.status === "UP";
}, POLL_INTERVAL_MS, RETRY_INTERVAL_MS);
