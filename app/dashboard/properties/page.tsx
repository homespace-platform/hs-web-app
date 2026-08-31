"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  MapPin,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building,
  Home,
  Briefcase,
  Store,
  DoorOpen,
} from "lucide-react";
import listingService from "@/services/listing.service";
import type { MyListingSummaryResponse } from "@/types/listing.type";
import ListingDetailModal from "./components/ListingDetailModal";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  APARTMENT: <Building className="h-3.5 w-3.5" />,
  HOUSE: <Home className="h-3.5 w-3.5" />,
  OFFICE: <Briefcase className="h-3.5 w-3.5" />,
  COMMERCIAL_SPACE: <Store className="h-3.5 w-3.5" />,
  ROOM: <DoorOpen className="h-3.5 w-3.5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  APARTMENT: "Căn hộ",
  HOUSE: "Nhà nguyên căn",
  OFFICE: "Văn phòng",
  COMMERCIAL_SPACE: "Mặt bằng",
  ROOM: "Nhà trọ / Phòng",
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")} triệu`;
  }
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

export default function MyPropertiesPage() {
  const router = useRouter();
  const [listings, setListings] = useState<MyListingSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Detail Modal
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    listingService
      .getMyListings(page)
      .then((res) => {
        if (active) {
          setListings(res.result || []);
          setTotalPages(res.totalPages || 1);
          setTotalElements(res.totalElements || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Error loading listings:", err);
          setListings([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [page]);

  function handleOpenDetail(id: string) {
    setSelectedListingId(id);
    setIsDetailModalOpen(true);
  }

  function handleEditListing(id: string) {
    router.push(`/dashboard/properties/upsert?id=${id}`);
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Tin đăng của tôi
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Quản lý {totalElements} tin cho thuê, theo dõi trạng thái và cập nhật thông tin bài đăng.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-xs font-medium">Đang tải danh sách tin đăng...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && listings.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground shadow-2xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">Chưa có tin đăng nào</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Bạn chưa tạo tin đăng cho thuê nào. Hãy bắt đầu đăng tin ngay hôm nay để tiếp cận khách thuê!
          </p>
          <Link
            href="/dashboard/properties/upsert"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Đăng tin mới
          </Link>
        </div>
      )}

      {/* Listings Grid / Cards */}
      {!loading && listings.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {listings.map((item) => {
              const coverImg = item.coverImageUrl || "/area/hcm-1.jpg";
              const isPublished = item.status === "PUBLISHED";

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col sm:flex-row gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-2xs transition-all hover:border-primary/40 hover:shadow-md"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => handleOpenDetail(item.id)}
                    className="relative h-48 sm:h-36 sm:w-56 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-muted/40"
                  >
                    <Image
                      src={coverImg}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                        {CATEGORY_ICONS[item.category]}
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </div>

                    {item.mediaCount > 0 && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                        📸 {item.mediaCount}
                      </span>
                    )}
                  </div>

                  {/* Info Column */}
                  <div className="flex flex-1 flex-col justify-between space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isPublished
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : item.status === "RENTED"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isPublished
                            ? "Đang hiển thị"
                            : item.status === "RENTED"
                            ? "Đã cho thuê"
                            : item.status}
                        </span>

                        <span className="text-[11px] text-muted-foreground">
                          {item.availableFrom ? `Vào ở: ${item.availableFrom}` : ""}
                        </span>
                      </div>

                      <h3
                        onClick={() => handleOpenDetail(item.id)}
                        className="cursor-pointer text-sm sm:text-base font-bold text-foreground transition-colors hover:text-primary line-clamp-2"
                      >
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.fullAddress || "Chưa cập nhật địa chỉ"}</span>
                      </div>
                    </div>

                    {/* Price, Area & Actions Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                      <div className="flex items-baseline gap-3">
                        <div className="text-base sm:text-lg font-extrabold text-primary">
                          {formatCurrency(Number(item.priceAmount))}
                          <span className="text-xs font-normal text-muted-foreground">
                            /{item.priceUnit === "MONTH" ? "tháng" : "m²/tháng"}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-muted-foreground">
                          • {item.areaM2} m²
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditListing(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-2xs transition-colors hover:bg-primary/90"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Chỉnh sửa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">
                Trang <span className="font-bold text-foreground">{page}</span> / {totalPages} (Tổng số {totalElements} tin)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                      p === page
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Listing Detail Modal */}
      <ListingDetailModal
        listingId={selectedListingId}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={(id) => handleEditListing(id)}
      />
    </div>
  );
}
