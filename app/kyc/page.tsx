"use client";

import { Suspense, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import KycFlow from "@/components/kyc/KycFlow";
import { parseKycParams } from "@/lib/kyc-return";

function InvalidLink() {
  return (
    <div role="alert" className="mx-auto w-full max-w-lg space-y-3 rounded-2xl border bg-card p-5 shadow-2xs sm:p-6">
      <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-600">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <h1 className="text-sm font-bold text-foreground">Liên kết không hợp lệ</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">Liên kết xác minh danh tính không đúng hoặc đã hỏng. Vui lòng quay lại ứng dụng và thử mở lại.</p>
        </div>
      </div>
      <Link href="/" className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">Về trang chủ</Link>
    </div>
  );
}

function KycPageContent() {
  const search = useSearchParams().toString();
  const params = useMemo(() => parseKycParams(search), [search]);
  const content = params.client === "app" && !params.state ? <InvalidLink /> : <KycFlow params={params} />;

  if (params.client === "app") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <div className="flex h-14 items-center justify-center border-b bg-card">
          <Image src="/logo/homespace-vertical-logo-removebg-crop-removebg.png" alt="HomeSpace" width={36} height={36} priority className="h-9 w-9 object-contain" />
        </div>
        <main className="flex-1 px-4 py-6">{content}</main>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 pb-16 pt-28 sm:px-6">{content}</main>
      <Footer />
    </div>
  );
}

export default function KycPage() {
  return (
    <Suspense fallback={<div role="status" className="flex min-h-dvh items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <KycPageContent />
    </Suspense>
  );
}
