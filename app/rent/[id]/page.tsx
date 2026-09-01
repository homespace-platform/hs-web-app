"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RentDetailView from "@/components/rent/RentDetailView";
import { ArrowLeft, Loader2, Building } from "lucide-react";
import type { RentPropertyItem } from "@/types/rent.type";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";

export default function RentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<RentPropertyItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Load listing detail from API (chỉ cho phép xem tin công khai đang hiển thị)
    listingService
      .getById(id)
      .then((listing) => {
        if (!cancelled && listing) {
          if (listing.status !== "PUBLISHED") {
            setProperty(null);
          } else {
            setProperty(toRentProperty(listing));
            // Ghi nhận lượt xem hợp lệ (Backend có cơ chế chống spam Redis TTL)
            listingService.recordView(id).then((viewRes) => {
              if (viewRes.counted && !cancelled) {
                setProperty((prev) =>
                  prev ? { ...prev, viewCount: viewRes.viewCount, viewsCount: viewRes.viewCount } : null,
                );
              }
            });
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching rent detail:", err);
        if (!cancelled) setProperty(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1 pt-32 pb-16 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">Đang tải thông tin bài đăng...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-md w-full text-center space-y-5 rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 shadow-inner">
              <Building className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                Không tìm thấy bài đăng
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bài đăng có thể đã bị ẩn, hết hạn hoặc không còn hiển thị công khai.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/rent"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại danh sách</span>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Reusable Core Detail View */}
          <RentDetailView property={property} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
