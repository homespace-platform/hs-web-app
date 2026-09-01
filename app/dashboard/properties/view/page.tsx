"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function PropertyViewRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (id) {
      router.replace(`/rent/${id}`);
    } else {
      router.replace("/dashboard/properties");
    }
  }, [id, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm font-medium">Đang chuyển tiếp tới chi tiết bài đăng...</span>
    </div>
  );
}

export default function DashboardPropertyViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Đang tải...</span>
        </div>
      }
    >
      <PropertyViewRedirectContent />
    </Suspense>
  );
}
