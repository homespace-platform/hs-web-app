"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  /** Small count/dot on the tab, e.g. the number of things waiting for the viewer. */
  badge?: ReactNode;
  /** Hide tabs that do not apply to the current state instead of showing them empty. */
  hidden?: boolean;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * Accessible tab bar (arrow keys / Home / End). Render each section yourself with
 * role="tabpanel" id={panelId(prefix, id)} aria-labelledby={tabId(prefix, id)} and show only the active one (only the selected tab points at it via aria-controls).
 * Scrolls sideways on phones without a visible scrollbar.
 */
export default function DetailTabs<T extends string>({
  tabs, active, onChange, idPrefix = "detail",
}: {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  idPrefix?: string;
}) {
  const visible = tabs.filter((t) => !t.hidden);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent, index: number) => {
    const last = visible.length - 1;
    const next = e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    const target = visible[next];
    onChange(target.id);
    refs.current[target.id]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Các mục của hồ sơ" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
        {visible.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => { refs.current[tab.id] = el; }}
              type="button" role="tab" id={tabId(idPrefix, tab.id)} aria-selected={selected} aria-controls={selected ? panelId(idPrefix, tab.id) : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)} onKeyDown={(e) => onKey(e, i)}
              className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                selected ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-5 text-white">{tab.badge}</span> : null}
              <span aria-hidden="true" className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-colors ${selected ? "bg-primary" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
