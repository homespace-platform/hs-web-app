import React, { ReactNode } from "react";

interface FormSectionWrapperProps {
  id?: string;
  stepNumber?: number;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export default function FormSectionWrapper({
  id,
  stepNumber,
  title,
  description,
  className = "",
  children,
}: FormSectionWrapperProps) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {stepNumber && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {stepNumber}
              </span>
            )}
            <h2 className="text-base font-bold text-foreground sm:text-lg">
              {title}
            </h2>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
