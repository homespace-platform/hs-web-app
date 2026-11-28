"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicLinks } from "@/app/(public-info)/_content/navigation";

const NOTICE_KEY = "hs:privacy-notice";
const NOTICE_VERSION = "1";
const PUBLIC_SECTIONS = new Set([
  "/rent", "/membership", "/u", "/users",
  ...Object.values(publicLinks).map(({ href }) => href),
]);
const linkClassName =
  "rounded-sm font-semibold text-primary underline underline-offset-4 hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-accent-foreground";

export default function PrivacyNotice() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(NOTICE_KEY) !== NOTICE_VERSION);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible || pathname === publicLinks.privacy.href || pathname === publicLinks.terms.href ||
      (pathname !== "/" && !PUBLIC_SECTIONS.has(`/${pathname.split("/")[1]}`))) {
    return null;
  }

  function acknowledge() {
    setVisible(false);
    try {
      window.localStorage.setItem(NOTICE_KEY, NOTICE_VERSION);
    } catch {
      // The notice can still be closed when the browser denies storage.
    }
  }

  return (
    <aside
      aria-labelledby="privacy-notice-title"
      className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 max-h-[calc(100dvh-8rem)] overflow-auto rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:right-auto sm:left-6 sm:w-md sm:p-5 lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-h-[calc(100dvh-3rem)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Shield className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="privacy-notice-title" className="text-sm leading-5 font-bold sm:text-base">
            Quyền riêng tư và điều khoản
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Xem cách HomeSpace xử lý dữ liệu cá nhân và quy định sử dụng dịch vụ.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6">
            <Link href={publicLinks.privacy.href} className={linkClassName}>
              Chính sách quyền riêng tư
            </Link>
            <Link href={publicLinks.terms.href} className={linkClassName}>
              Điều khoản sử dụng
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setVisible(false)} className="h-11 px-3">
          Để sau
        </Button>
        <Button type="button" onClick={acknowledge} className="h-11 px-4 dark:bg-primary-dark dark:hover:bg-primary-dark/80">
          Tôi đã hiểu
        </Button>
      </div>
    </aside>
  );
}
