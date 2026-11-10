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
