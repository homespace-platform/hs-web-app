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
  // The KYC page (also opened by the mobile app) must not be framed by another site (clickjacking on "Hủy phiên").
  // Its own same-origin VNPT iframe (/kyc/vnpt-frame.html) stays allowed by 'self'.
  async headers() {
    return [{
      source: "/kyc/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
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
