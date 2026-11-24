"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

export interface WizardStep {
  id: number;
  label: string;
}

interface Props {
  steps: WizardStep[];
  current: number;
  /** True when the user may jump to this step (done, or all previous steps valid). */
  isReachable: (id: number) => boolean;
  onSelect: (id: number) => void;
}

export default function ListingWizardStepper({ steps, current, isReachable, onSelect }: Props) {
  const percent = Math.round(((current - 1) / (steps.length - 1)) * 100);
  const listRef = useRef<HTMLOListElement>(null);

  // The bar is hidden, so keep the current step visible when it changes on narrow screens.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [current]);

  return (
    <nav aria-label="Các bước đăng tin" className="space-y-3">
      <ol ref={listRef} className="no-scrollbar flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
        {steps.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          const clickable = !active && (done || isReachable(step.id));
          return (
            <li key={step.id} className="shrink-0">
              <button
                type="button"
                disabled={!clickable}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-border bg-card text-muted-foreground"
                } ${clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[11px]">
                  {done ? <Check className="h-3 w-3" /> : step.id}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </nav>
  );
}
