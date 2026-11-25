"use client";

import { useSyncExternalStore } from "react";
import { networkHealth } from "@/lib/network-health";

export default function NetworkGate({ children }: { children: React.ReactNode }) {
  const { status, reason, goodStreak } = useSyncExternalStore(
    networkHealth.subscribe, networkHealth.getSnapshot, networkHealth.getServerSnapshot,
  );

  if (status !== "offline") return children;

  const offline = reason === "offline";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-5 text-xl font-bold text-blue-600">HomeSpace</p>
        <div role="status" aria-live="polite">
          <h1 className="text-2xl font-semibold">
            {offline ? "Mất kết nối mạng" : "Kết nối mạng không ổn định"}
          </h1>
          <p className="mt-3 leading-relaxed text-slate-600">
            {offline
              ? "Không có kết nối Internet. Vui lòng kiểm tra Wi-Fi hoặc dữ liệu di động. Trang sẽ tự mở lại khi kết nối ổn định."
              : "Đường truyền đang chậm hoặc chập chờn. Trang sẽ tự mở lại khi kết nối ổn định."}
          </p>
          {goodStreak > 0 && (
            <p className="mt-2 text-sm text-slate-500">Đang xác nhận kết nối… {goodStreak}/3</p>
          )}
        </div>
        <button type="button" onClick={networkHealth.recheck}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            Kiểm tra lại
        </button>
      </section>
    </main>
  );
}
