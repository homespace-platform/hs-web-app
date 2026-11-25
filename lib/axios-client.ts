import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import keycloak from "@/lib/keycloak";
import { FEATURE_LOCKED_MESSAGE, PERMISSIONS_STALE_EVENT, isPermissionDenied } from "@/lib/permissions";
import { PROFILE_GATE_STALE_EVENT, isProfileIncomplete, profileGateHref } from "@/lib/profile-gate";

declare module "axios" {
  export interface AxiosRequestConfig {
    backendHealthProbe?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

interface FailedRequestQueue {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

const axiosClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_BASE_URL,
});

let isRefreshing = false;
let failedQueue: FailedRequestQueue[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.backendHealthProbe) {
      config.headers.delete("Authorization");
      return config;
    }
    if (keycloak.authenticated) {
      try {
        await keycloak.updateToken(30);
      } catch (error) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("hs:auth-session-expired"));
        }
        return Promise.reject(error);
      }
      if (keycloak.token) {
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (originalRequest?.backendHealthProbe) return Promise.reject(error);
    if (typeof window !== "undefined" && !axios.isCancel(error)
        && (!error.response || [502, 503, 504].includes(error.response.status))) {
      window.dispatchEvent(new Event("hs:backend-health-check"));
    }
    if (typeof window !== "undefined" && !axios.isCancel(error) && !error.response) {
      window.dispatchEvent(new Event("hs:network-check"));
    }

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry && keycloak.authenticated) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        keycloak
          .updateToken(70)
          .then(() => {
            const newToken = keycloak.token;
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(axiosClient(originalRequest));
          })
          .catch((err: unknown) => {
            processQueue(err, null);
            window.dispatchEvent(new Event("hs:auth-session-expired"));
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    if (error.response.status === 401 && originalRequest._retry) {
      window.dispatchEvent(new Event("hs:auth-session-expired"));
    }

    // Revoked feature permission: callers read response.data.message, so give them the friendly text.
    if (isPermissionDenied(error.response)) {
      (error.response.data as { message?: string }).message = FEATURE_LOCKED_MESSAGE;
      if (typeof window !== "undefined") window.dispatchEvent(new Event(PERMISSIONS_STALE_EVENT));
    }

    // Incomplete profile (1010): keep the server message, refresh the status and point to settings.
    if (isProfileIncomplete(error.response) && typeof window !== "undefined") {
      window.dispatchEvent(new Event(PROFILE_GATE_STALE_EVENT));
      toast.error((error.response.data as { message?: string }).message || "Vui lòng cập nhật đầy đủ hồ sơ.", {
        id: "profile-gate-blocked",
        action: { label: "Cập nhật hồ sơ", onClick: () => window.location.assign(profileGateHref(error.response)) },
      });
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
