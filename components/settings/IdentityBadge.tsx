"use client";

import { Check, Crown } from "lucide-react";

type IdentityBadgeProps = {
  /** Role name from profile, e.g. ADMIN / USER */
  role?: string | null;
  kycVerified?: boolean | null;
};

/**
 * ADMIN → crown (KYC optional).
 * USER + KYC verified → Facebook-style blue tick.
 * Otherwise → nothing.
 */
export default function IdentityBadge({ role, kycVerified }: IdentityBadgeProps) {
  const isAdmin = role === "ADMIN";

  if (isAdmin) {
    return (
      <span
        className="relative group inline-flex shrink-0"
        tabIndex={0}
        aria-label="Quản trị viên"
      >
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
          <Crown className="h-2.5 w-2.5" strokeWidth={2.75} />
        </span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-[10px] font-semibold text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Quản trị viên
        </span>
      </span>
    );
  }

  if (kycVerified) {
    return (
      <span
        className="relative group inline-flex shrink-0"
        tabIndex={0}
        aria-label="Đã xác minh danh tính"
      >
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1877F2] text-white shadow-xs">
          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
        </span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-[10px] font-semibold text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Đã xác minh danh tính
        </span>
      </span>
    );
  }

  return null;
}
