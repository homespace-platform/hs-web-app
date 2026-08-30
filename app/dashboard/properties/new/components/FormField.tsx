import React, { ReactNode } from "react";

interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export const inputClass =
  "h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background disabled:opacity-60";

export const selectClass =
  "h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background disabled:opacity-60 cursor-pointer";

export const textareaClass =
  "w-full rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background disabled:opacity-60";

export default function FormField({
  id,
  label,
  required,
  error,
  hint,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <div id={id} className={`space-y-1.5 ${className}`}>
      <label className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>
          {label} {required && <span className="text-destructive">*</span>}
        </span>
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] font-medium text-destructive animate-in fade-in-50 duration-150">
          {error}
        </p>
      )}
    </div>
  );
}
