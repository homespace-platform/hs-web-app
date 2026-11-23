"use client";

import { useEffect, useState } from "react";

/**
 * Sticky offset for a sidebar that may be taller than the viewport.
 * Short sidebar: sticks `offset` px below the top. Tall sidebar: scrolls with the
 * page until its bottom reaches the viewport bottom, then sticks there — so every
 * part stays reachable without an inner scrollbar.
 * Returns [callbackRef, top].
 */
export function useStickyTop<T extends HTMLElement>(offset: number, bottomGap = 24) {
  const [el, setEl] = useState<T | null>(null);
  const [top, setTop] = useState(offset);

  useEffect(() => {
    if (!el) return;
    const update = () => setTop(Math.min(offset, window.innerHeight - el.offsetHeight - bottomGap));
    // ResizeObserver fires once on observe, so no synchronous initial call is needed.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [el, offset, bottomGap]);

  return [setEl, top] as const;
}
