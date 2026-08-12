import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import keycloak from "@/lib/keycloak";

declare module "axios" {
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
    await keycloak.updateToken(30);
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const authHeader = error.response.headers["www-authenticate"];
    const isExpired = authHeader && String(authHeader).includes("expired");

    if (error.response.status === 401 && isExpired && !originalRequest._retry) {
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
            keycloak.logout({ redirectUri: window.location.origin });
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
