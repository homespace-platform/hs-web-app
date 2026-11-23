import type { Metadata } from "next";
import { SITE_URL } from "@/lib/listing-public-server";
import type { ApiResponse } from "@/types/api.type";
import type { PublicUserProfile } from "@/types/user.type";
import PublicProfileClient from "./PublicProfileClient";

type PageProps = { params: Promise<{ username: string }> };

async function fetchProfile(username: string): Promise<PublicUserProfile | null> {
  const base = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || "";
  try {
    const res = await fetch(`${base}/api/v1/public/users/${encodeURIComponent(username)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return ((await res.json()) as ApiResponse<PublicUserProfile>).result ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username);
  if (!profile) return { title: "Trang cá nhân | HomeSpace", robots: { index: false, follow: false } };
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;
  const url = `${SITE_URL}/u/${encodeURIComponent(profile.username)}`;
  const description = `Trang cá nhân của ${name} (@${profile.username}) trên HomeSpace.`;
  return {
    title: `${name} (@${profile.username}) | HomeSpace`,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "profile",
      url,
      title: name,
      description,
      ...(profile.avatarUrl ? { images: [{ url: profile.avatarUrl }] } : {}),
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  return <PublicProfileClient username={username} />;
}
