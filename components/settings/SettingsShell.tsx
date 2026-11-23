"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "./settings-nav";

interface SettingsShellProps {
  children: React.ReactNode;
  onClose?: () => void;
  /** Controlled tab mode: with onSelect, tabs switch in place instead of navigating. */
  activeSection?: SettingsSectionId;
  onSelect?: (section: SettingsSectionId) => void;
  className?: string;
}

export default function SettingsShell({
  children,
  onClose,
  activeSection: controlledSection,
  onSelect,
  className = "",
}: SettingsShellProps) {
  const pathname = usePathname();
  const controlled = Boolean(onSelect);
  const activeSection =
    controlledSection ?? ((pathname?.split("/")[2] ?? "profile") as SettingsSectionId);
  const activeLabel = SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label;

  return (
    <div className={`flex flex-col md:flex-row w-full h-full bg-card rounded-3xl overflow-hidden border border-border shadow-2xl ${className}`}>
      <aside className="w-full md:w-64 lg:w-72 bg-muted/30 border-r border-border p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <h2 id="settings-dialog-title" className="font-heading font-extrabold text-lg text-foreground tracking-tight">
            Cài đặt
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cài đặt"
              className="md:hidden p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex md:block gap-1 md:space-y-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto no-scrollbar flex-1">
          {SETTINGS_SECTIONS.map((item) => {
            const Icon = item.icon;
            const href = `/settings/${item.id}`;
            const isSelected = activeSection === item.id;

            const cls = `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none text-left shrink-0 md:w-full ${
              isSelected
                ? "bg-primary/10 text-primary font-bold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`;
            const inner = (
              <>
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="truncate flex-1 whitespace-nowrap md:whitespace-normal">{item.label}</span>
              </>
            );

            return controlled ? (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                aria-current={isSelected ? "page" : undefined}
                className={cls}
              >
                {inner}
              </button>
            ) : (
              <Link key={item.id} href={href} className={cls}>
                {inner}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className={`flex-1 bg-muted/15 p-5 sm:p-7 md:p-8 overflow-y-auto relative min-h-0 ${controlled ? "" : "max-h-[80vh] md:max-h-[640px]"}`}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="hidden md:flex absolute top-5 right-5 w-8 h-8 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground items-center justify-center transition-all cursor-pointer shadow-2xs z-20"
            title="Đóng cài đặt"
            aria-label="Đóng cài đặt"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {controlled && activeLabel && (
          <h3 className="mb-5 pr-10 font-heading text-xl font-extrabold tracking-tight text-foreground">
            {activeLabel}
          </h3>
        )}
        {children}
      </main>
    </div>
  );
}
