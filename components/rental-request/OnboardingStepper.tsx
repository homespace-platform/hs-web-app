import { Check, Minus } from "lucide-react";
import type { PreTenancyStep } from "@/lib/rental-request-presentation";

/** The four steps before a tenancy starts. Horizontal on wide screens, a vertical list on phones (no sideways scrolling). */
export default function OnboardingStepper({ steps, caption }: { steps: PreTenancyStep[]; caption?: string }) {
  return (
    <nav aria-label="Các bước trước khi thuê" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <ol className="grid gap-3 sm:grid-cols-4 sm:gap-2">
        {steps.map((step, i) => {
          const current = step.state === "current";
          return (
            <li key={step.id} aria-current={current ? "step" : undefined} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
              <div className="flex items-center gap-2 sm:w-full">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    step.state === "done" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : current ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {step.state === "done" ? <Check className="h-4 w-4" /> : step.state === "skipped" ? <Minus className="h-4 w-4" /> : i + 1}
                </span>
                {i < steps.length - 1 ? <span aria-hidden="true" className={`hidden h-0.5 flex-1 rounded-full sm:block ${step.state === "done" || step.state === "skipped" ? "bg-emerald-500/40" : "bg-border"}`} /> : null}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${current ? "text-foreground" : step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}>{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step.state === "done" ? "Đã xong" : current ? "Đang ở bước này" : step.state === "skipped" ? "Không yêu cầu" : "Sắp tới"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {caption ? <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{caption}</p> : null}
    </nav>
  );
}
