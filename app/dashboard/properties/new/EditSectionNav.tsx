"use client";

import { useEffect, useState } from "react";

export interface SectionNavItem {
  id: string;
  label: string;
}

export default function EditSectionNav({ items }: { items: SectionNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = items.find((i) => visible.has(i.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Các mục của tin đăng"
      className="sticky top-16 z-20 -mx-1 flex gap-1.5 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:bg-transparent lg:px-0 lg:py-0"
    >
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          aria-current={active === i.id ? "true" : undefined}
          onClick={() => {
            setActive(i.id);
            const el = document.getElementById(i.id);
            if (el) {
              el.style.scrollMarginTop = "112px";
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
            active === i.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {i.label}
        </button>
      ))}
    </nav>
  );
}
