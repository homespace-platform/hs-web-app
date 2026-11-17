"use client";

import { useSyncExternalStore } from "react";
import { backendHealth } from "@/lib/backend-health";

export default function BackendHealthGate({ children }: { children: React.ReactNode }) {
  const status = useSyncExternalStore(
    backendHealth.subscribe, backendHealth.getSnapshot, backendHealth.getServerSnapshot,
  );

  if (status !== "unavailable") return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-5 text-xl font-bold text-blue-600">HomeSpace</p>
        <div role="status" aria-live="polite">
          <h1 className="text-2xl font-semibold">
            Hệ thống tạm thời gián đoạn
          </h1>
          <p className="mt-3 leading-relaxed text-slate-600">
            Hệ thống đang khởi động hoặc chưa sẵn sàng. Trang sẽ tự mở lại khi kết nối được khôi phục.
          </p>
        </div>
        <button type="button" onClick={backendHealth.recheck}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            Kiểm tra lại
        </button>
      </section>
    </main>
  );
}
