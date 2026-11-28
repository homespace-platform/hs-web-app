import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return process.env.NODE_ENV === "development"
      ? [{
          source: "/dashboard/membership/return",
          destination: "http://localhost:3000/dashboard/membership/return",
          permanent: false,
          has: [{ type: "host", value: ".*\\.trycloudflare\\.com" }],
        }]
      : [];
  },
  async rewrites() {
    const gateway = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL?.replace(/\/+$/, "");
    return [
      { source: "/payment-proof", destination: "/payment-proof.html" },
      ...(gateway ? [{ source: "/api/payment-proof", destination: `${gateway}/u/payment-proof/session` }] : []),
    ];
  },
  experimental: {
    // The proof file limit is 15 MiB, plus the multipart envelope.
    proxyClientMaxBodySize: "16mb",
  },
  // The KYC page (also opened by the mobile app) must not be framed by another site (clickjacking on "Hủy phiên").
  // Its own same-origin VNPT iframe (/kyc/vnpt-frame.html) stays allowed by 'self'.
  async headers() {
    return [{
      source: "/kyc/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
    }, {
      source: "/:proofPage(payment-proof|payment-proof\\.html)",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "default-src 'none'; img-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" },
      ],
    }, {
      source: "/api/payment-proof",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    }];
  },
  allowedDevOrigins: process.env.DEV_TUNNEL_ORIGIN
    ? [process.env.DEV_TUNNEL_ORIGIN]
    : [],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
