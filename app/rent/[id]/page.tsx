"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RentCollageCard from "@/components/rent/RentCollageCard";
import RentDetailView from "@/components/rent/RentDetailView";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { RentPropertyItem } from "@/types/rent.type";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";

export default function RentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<RentPropertyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarProperties, setSimilarProperties] = useState<RentPropertyItem[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Load listing detail from API (supports both public and owner views)
    listingService
      .getById(id)
      .then((listing) => {
        if (!cancelled && listing) {
          setProperty(toRentProperty(listing));
        }
      })
      .catch((err) => {
        console.error("Error fetching rent detail:", err);
        if (!cancelled) setProperty(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Load similar published properties from API
    listingService
      .getPublished()
      .then((published) => {
        if (!cancelled && Array.isArray(published)) {
          const others = published
            .filter((item) => item.id !== id)
            .slice(0, 4)
            .map((l) => toRentProperty(l));
          setSimilarProperties(others);
        }
      })
      .catch(() => {
        if (!cancelled) setSimilarProperties([]);
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
        <main className="flex-1 pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h1 className="font-heading text-2xl font-bold">Không tìm thấy tin cho thuê</h1>
            <p className="text-sm text-muted-foreground">
              Bài đăng có thể đã hết hạn hoặc không tồn tại.
            </p>
            <Link
              href="/rent"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách
            </Link>
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

          {/* Similar properties section */}
          {similarProperties.length > 0 && (
            <section className="space-y-6 pt-12 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold">Gợi ý bất động sản tương tự</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Khám phá các lựa chọn cùng khu vực</p>
                </div>
                <Link href="/rent" className="text-sm font-semibold text-primary hover:underline">
                  Xem tất cả
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {similarProperties.map((item) => (
                  <RentCollageCard key={item.id} property={item} viewMode="grid" />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
