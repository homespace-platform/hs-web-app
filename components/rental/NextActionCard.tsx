"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Hourglass, Loader2, Sparkles } from "lucide-react";
import { describeNextAction, toneClasses, type NextActionView, type Role } from "@/lib/rental-labels";
import type { NextAction } from "@/services/rental-onboarding.service";

export interface CardAction {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  busy?: boolean;
}

function remaining(dueAt: string | null | undefined, now: number) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - now;
  if (Number.isNaN(ms)) return null;
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const span = d > 0 ? `${d} ngày ${h} giờ` : h > 0 ? `${h} giờ ${m} phút` : `${Math.max(m, 1)} phút`;
  return { late: ms <= 0, text: ms <= 0 ? `Đã quá hạn ${span}` : `Còn ${span}`, at: new Date(dueAt) };
}

function ActionButton({ action, primary }: { action: CardAction; primary?: boolean }) {
  const cls = primary
    ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
  const inner = (
    <>
      {action.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      <span>{action.label}</span>
      {primary && !action.busy ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
    </>
  );
  if (action.href && !action.disabled) return <Link href={action.href} className={cls}>{inner}</Link>;
  return (
    <button type="button" className={cls} onClick={action.onClick} disabled={action.disabled || action.busy}>
      {inner}
    </button>
  );
}

/**
 * The first thing on a rental / contract page: ONE next step, who owes it, and until when.
 * `nextAction` comes from the server; without it (older backend) the card falls back to `fallbackMessage`.
 */
export default function NextActionCard({
  role, nextAction, custom, fallbackMessage, primary, secondary = [], extra,
}: {
  role: Role;
  nextAction?: NextAction | null;
  /** A ready-made step (e.g. derived client-side after the pre-tenancy flow); wins over `nextAction`. */
  custom?: Pick<NextActionView, "title" | "hint" | "mine" | "tone">;
  fallbackMessage?: string | null;
  /** The button for the step shown. Omit it when the viewer is only waiting. */
  primary?: CardAction;
  secondary?: CardAction[];
  extra?: ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const view: NextActionView | null = custom ? { ...custom, tab: "overview" } : describeNextAction(nextAction, role);
  if (!view && !fallbackMessage) return null;

  const due = remaining(nextAction?.dueAt, now);
  const tone = !view ? "neutral" : view.mine ? (due?.late ? "danger" : "info") : view.tone;
  const Icon = !view ? Sparkles : view.mine ? Sparkles : nextAction?.actor === "SYSTEM" ? Loader2 : Hourglass;

  return (
    <section
      aria-label="Việc cần làm"
      className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${view?.mine ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[tone]}`} aria-hidden="true">
          <Icon className={`h-6 w-6 ${nextAction?.actor === "SYSTEM" ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {view ? (view.mine ? "Việc cần làm của bạn" : nextAction?.actor === "SYSTEM" ? "Hệ thống đang xử lý" : view.tone === "warning" ? "Đang chờ bên còn lại" : "Tình trạng hiện tại") : "Tiến trình hiện tại"}
          </p>
          <h2 className="mt-0.5 text-lg font-bold leading-snug text-foreground sm:text-xl">{view?.title ?? fallbackMessage}</h2>
          {view?.hint ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{view.hint}</p> : null}
          {due ? (
            <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[due.late ? "danger" : "warning"]}`}>
              {due.late ? <Clock className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {due.text}
              <span className="font-normal opacity-80">· hạn {due.at.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
            </p>
          ) : null}
          {extra}
        </div>
        {primary || secondary.length ? (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {primary ? <ActionButton action={primary} primary /> : null}
            {secondary.map((a) => <ActionButton key={a.label} action={a} />)}
          </div>
        ) : null}
      </div>
    </section>
  );
}
