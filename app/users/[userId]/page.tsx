"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import Header from "@/components/layout/Header";
import userService from "@/services/user.service";

/** Legacy id-based URL: resolve the username and redirect to /u/{username}. */
export default function LegacyUserProfileRedirect() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    userService
      .getPublicProfile(userId)
      .then((p) => {
        if (!cancelled) router.replace(`/u/${encodeURIComponent(p.username)}`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        {failed ? (
          <>
            <UserX className="h-10 w-10 text-muted-foreground" />
            <h1 className="text-xl font-bold">Không tìm thấy người dùng</h1>
            <Link href="/" className="text-sm font-semibold text-primary hover:underline">
              Về trang chủ
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Đang chuyển đến trang cá nhân...
          </p>
        )}
      </main>
    </div>
  );
}
