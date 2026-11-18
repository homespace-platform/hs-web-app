"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useProfileGate } from "@/hooks/useProfileGate";
import { missingItems } from "@/lib/profile-gate";

/** Fixed under the 80px Header; an in-flow spacer keeps page content clear and `--hs-banner-h` lets other fixed layers (sidebar) follow. */
export default function ProfileCompletionBanner() {
  const authenticated = useAppSelector((state) => state.auth.authenticated);
  const { missing } = useProfileGate();
  const items = missingItems(missing);
  const visible = authenticated && items.length > 0;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--hs-banner-h", `${el.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--hs-banner-h");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div
        ref={ref}
        role="status"
        className="fixed inset-x-0 top-20 z-40 border-b border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      >
        <div className="mx-auto flex max-w-7xl items-start justify-center gap-2 px-4 py-2 text-center text-sm sm:px-6 lg:px-8">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0">
            <span className="font-semibold">Hoàn thiện hồ sơ để sử dụng dịch vụ HomeSpace: </span>
            {items.map((item) => item.label).join(", ")}.{" "}
            {/* Points at the first missing item; it moves to the next one as each is completed. */}
            <Link
              href={items[0].href}
              className="font-semibold underline underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 dark:focus-visible:outline-amber-200"
            >
              Cập nhật thông tin
            </Link>
          </p>
        </div>
      </div>
      <div aria-hidden="true" style={{ height: "var(--hs-banner-h, 0px)" }} />
    </>
  );
}
