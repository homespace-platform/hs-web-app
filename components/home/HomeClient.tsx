"use client";

import { useEffect, useState } from "react";
import { LogOut, Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import axiosClient from "@/lib/axios-client";

type UserProfileResponse = {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type ApiResponse<T> = {
  code: number;
  message?: string;
  result: T;
};

export default function HomeClient() {
  const { profileName, email, logout, keycloakInstance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [nowSeconds, setNowSeconds] = useState(() =>
    Math.floor(Date.now() / 1000),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowSeconds(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const callProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get<ApiResponse<UserProfileResponse>>(
        "/api/v1/users/me/profile",
      );
      setProfile(res.data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Goi API that bai");
    } finally {
      setLoading(false);
    }
  };

  const exp = keycloakInstance.tokenParsed?.exp;
  const expText =
    typeof exp === "number"
      ? `${new Date(exp * 1000).toLocaleTimeString("vi-VN")} (con ${Math.max(0, exp - nowSeconds)}s)`
      : "khong co";

  return (
    <main className="mx-auto max-w-3xl p-6 w-full space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Xin chao, {profileName ?? email ?? "ban"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Web client Next.js dang dung Keycloak + PKCE.
          </p>
        </div>
        <Button variant="ghost" onClick={logout}>
          <LogOut className="h-4 w-4" data-icon="inline-start" />
          Dang xuat
        </Button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
        <p>
          <strong>Client:</strong> {process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}
        </p>
        <p>
          <strong>Access token het han:</strong> {expText}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm text-slate-600">
          Test API gateway: <code>/api/v1/users/me/profile</code>
        </p>
        <Button onClick={callProfile} disabled={loading}>
          <Send className="h-4 w-4" data-icon="inline-start" />
          {loading ? "Dang goi..." : "Goi API"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {profile && (
          <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
