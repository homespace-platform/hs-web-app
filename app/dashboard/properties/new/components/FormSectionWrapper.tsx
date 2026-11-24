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
      className={`rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-7 ${className}`}
    >
      <div className="flex items-start gap-3 border-b border-border/60 pb-5">
        {stepNumber && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {stepNumber}
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}
