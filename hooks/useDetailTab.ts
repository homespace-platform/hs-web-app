"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DETAIL_TABS, type DetailTab } from "@/lib/rental-labels";

/**
 * Active tab of a detail PAGE, kept in `?tab=` so links (notifications, "go to payment") can open the right section
 * and the browser back button behaves. The page using it must sit under a <Suspense> boundary.
 * For modals use plain useState instead (a modal's tab is not a URL).
 */
export function useDetailTab(defaultTab: DetailTab = "overview") {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab = (DETAIL_TABS.some((t) => t.id === raw) ? raw : defaultTab) as DetailTab;
  const query = params.toString();
  const setTab = useCallback(
    (next: DetailTab) => {
      const q = new URLSearchParams(query);
      q.set("tab", next);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [query, pathname, router],
  );
  return [tab, setTab] as const;
}
