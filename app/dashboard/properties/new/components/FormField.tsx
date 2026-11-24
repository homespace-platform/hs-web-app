import React, { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}

export const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-muted/40 px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-base placeholder:text-muted-foreground focus:border-primary focus:bg-background disabled:opacity-60";

export const selectClass =
  "min-h-11 w-full rounded-xl border border-border bg-muted/40 px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-base focus:border-primary focus:bg-background disabled:opacity-60 cursor-pointer";

export const textareaClass =
  "w-full rounded-xl border border-border bg-muted/40 p-3.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-base placeholder:text-muted-foreground focus:border-primary focus:bg-background disabled:opacity-60";

export default function FormField({
  id,
  label,
  required,
  error,
  hint,
  className = "",
  action,
  children,
}: FormFieldProps) {
  return (
    <div id={id} className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {action}
      </div>
      {children}
      {hint && !error && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="flex items-start gap-1.5 text-sm font-medium text-destructive animate-in fade-in-50 duration-150">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
