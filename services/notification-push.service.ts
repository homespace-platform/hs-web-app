import keycloak from "@/lib/keycloak";
import axiosClient from "@/lib/axios-client";

const ENABLED_KEY = "hs:notification-push-enabled";
const INSTALLATION_KEY = "hs:notification-push-installation";
const DEVICE_URL = "/api/v1/notifications/devices";

type Installation = { installationId: string; installationSecret: string };
export type PushStatus = "disabled" | "registering" | "registered" | "unavailable" | "error";

let registerCurrent: (() => Promise<void>) | undefined;
let unregisterCurrent: (() => Promise<void>) | undefined;
let loggingOut = false;
let activeStart = 0;

function emitStatus(status: PushStatus): void {
  window.dispatchEvent(new CustomEvent<PushStatus>("hs:notification-push-status", { detail: status }));
}

function getInstallation(): Installation {
  const stored = localStorage.getItem(INSTALLATION_KEY);
  if (stored) {
    try {
      const value = JSON.parse(stored) as Installation;
      if (/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value.installationId) && /^[A-Za-z0-9_-]{43}$/.test(value.installationSecret)) {
        return value;
      }
    } catch {
      // Replace invalid local browser data with a new installation proof.
    }
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const installation: Installation = {
    installationId: crypto.randomUUID(),
    installationSecret: btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  };
  localStorage.setItem(INSTALLATION_KEY, JSON.stringify(installation));
  return installation;
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  );
}

export function isPushOptedIn(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(ENABLED_KEY) === "true";
}

export async function startPush(onChanged: () => void): Promise<() => void> {
  const generation = ++activeStart;
  loggingOut = false;
  if (!isPushConfigured() || !("serviceWorker" in navigator) || !("Notification" in window)) {
    emitStatus("unavailable");
    return () => {};
  }

  const [{ getApp, getApps, initializeApp }, { getMessaging, isSupported, onMessage, onRegistered, register, unregister }] =
    await Promise.all([import("firebase/app"), import("firebase/messaging")]);
  const supported = await isSupported();
  if (generation !== activeStart) return () => {};
  if (!supported) {
    emitStatus("unavailable");
    return () => {};
  }

  const app = getApps().length ? getApp() : initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const messaging = getMessaging(app);
  const worker = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  if (generation !== activeStart) return () => {};
  const stopRegistered = onRegistered(messaging, (fid) => {
    if (!isPushOptedIn() || !keycloak.authenticated || loggingOut) return;
    const installation = getInstallation();
    void axiosClient.put(DEVICE_URL, { ...installation, fid })
      .then(() => emitStatus("registered"))
      .catch(() => emitStatus("error"));
  });
  const stopMessage = onMessage(messaging, () => onChanged());
  registerCurrent = () => register(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
    serviceWorkerRegistration: worker,
  });
  unregisterCurrent = () => unregister(messaging);

  if (Notification.permission === "granted" && isPushOptedIn()) {
    emitStatus("registering");
    void registerCurrent().catch(() => emitStatus("error"));
  } else {
    emitStatus("disabled");
  }
  return () => {
    stopRegistered();
    stopMessage();
    if (generation === activeStart) {
      activeStart++;
      registerCurrent = undefined;
      unregisterCurrent = undefined;
    }
  };
}

export async function enablePush(): Promise<void> {
  if (!isPushConfigured() || !("Notification" in window)) throw new Error("Firebase Web chưa được cấu hình.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Trình duyệt chưa được cấp quyền thông báo.");
  if (!registerCurrent) throw new Error("Kết nối Firebase chưa sẵn sàng. Hãy thử lại.");
  localStorage.setItem(ENABLED_KEY, "true");
  emitStatus("registering");
  try {
    await registerCurrent();
  } catch (error) {
    emitStatus("error");
    throw error;
  }
}

export async function disablePush(): Promise<void> {
  loggingOut = true;
  try {
    await unregisterDevice();
    localStorage.setItem(ENABLED_KEY, "false");
    if (unregisterCurrent) await unregisterCurrent();
    emitStatus("disabled");
  } finally {
    loggingOut = false;
  }
}

async function unregisterDevice(): Promise<void> {
  const stored = localStorage.getItem(INSTALLATION_KEY);
  if (!stored || !keycloak.authenticated) return;
  let installation: Installation;
  try {
    installation = JSON.parse(stored) as Installation;
  } catch {
    return;
  }
  await axiosClient.delete(`${DEVICE_URL}/${encodeURIComponent(installation.installationId)}`, {
    data: { installationSecret: installation.installationSecret },
  });
}

export async function unregisterPushBeforeLogout(): Promise<void> {
  loggingOut = true;
  await unregisterDevice();
}
