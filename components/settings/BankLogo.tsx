"use client";

import { useState } from "react";

export default function BankLogo({
  src,
  code,
  className = "h-10 w-14",
}: {
  src?: string | null;
  code: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white ${className}`}
    >
      {failed ? (
        <span className="px-0.5 text-[10px] font-black leading-none text-primary">{code}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-contain p-0.5"
        />
      )}
    </div>
  );
}
