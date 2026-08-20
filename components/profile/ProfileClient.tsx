"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/types/user.type";

function displayName(profile: UserProfile | null, fallback: string) {
  if (!profile) return fallback;
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return name || profile.username || profile.email || fallback;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

export default function ProfileClient() {
  const { logout, profile } = useAuth();
  const loading = !profile;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <span className="text-sm font-semibold text-slate-800">HomeSpace</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" data-icon="inline-start" />
            Đăng xuất
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {loading ? "Đang tải..." : displayName(profile, profile?.email ?? "Người dùng")}
        </h1>

        {!loading && profile && (
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Username" value={profile.username} />
              <Field label="Email" value={profile.email} />
              <Field label="Họ" value={profile.lastName || "—"} />
              <Field label="Tên" value={profile.firstName || "—"} />
              <Field label="Số điện thoại" value={profile.phone || "—"} />
              <Field label="Ngày sinh" value={profile.dob || "—"} />
              <Field label="Giới tính" value={profile.gender || "—"} />
              <Field label="Vai trò" value={profile.role || "—"} />
              <Field
                label="Trạng thái"
                value={profile.active ? "Active" : "Inactive"}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
