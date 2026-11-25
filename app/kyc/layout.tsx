import type { Metadata } from "next";

// The URL can carry a one-time `state`; never index it or leak it through Referer.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function KycLayout({ children }: { children: React.ReactNode }) {
  return children;
}
