import type { Metadata } from "next";
import type { ApiResponse } from "@/types/api.type";
import type { PublicNewsResponse } from "@/types/news.type";
import { SITE_URL } from "@/lib/listing-public-server";
import NewsDetailClient from "./NewsDetailClient";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || ""}/api/v1/public/news/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) },
    );
    const news = res.ok ? ((await res.json()) as ApiResponse<PublicNewsResponse>).result : null;
    if (!news) return { title: "Tin tức | HomeSpace", robots: { index: false } };
    const canonical = `${SITE_URL}/news/${encodeURIComponent(news.slug)}`;
    return {
      title: `${news.title} | HomeSpace`,
      description: news.summary,
      alternates: { canonical },
      openGraph: {
        type: "article",
        url: canonical,
        title: news.title,
        description: news.summary,
        ...(news.thumbnailUrl ? { images: [{ url: news.thumbnailUrl }] } : {}),
      },
    };
  } catch {
    return { title: "Tin tức | HomeSpace", robots: { index: false } };
  }
}

export default function NewsDetailPage(props: PageProps) {
  return <NewsDetailClient {...props} />;
}
