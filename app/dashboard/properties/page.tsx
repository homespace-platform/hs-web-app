"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Building,
  Home,
  Briefcase,
  Store,
  DoorOpen,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  EyeOff,
  XCircle,
  CalendarX,
  ExternalLink,
} from "lucide-react";
import listingService from "@/services/listing.service";
import type { ListingCategory, ListingStatus, MyListingSummaryResponse } from "@/types/listing.type";
import { getListingStatusConfig } from "@/config/listing-status.config";
import { getApiErrorMessage } from "@/utils/apiError";
import ListingStatusActionMenu from "./components/ListingStatusActionMenu";

const CATEGORY_ICONS: Record<ListingCategory, React.ReactNode> = {
  APARTMENT: <Building className="h-3.5 w-3.5" />,
  HOUSE: <Home className="h-3.5 w-3.5" />,
  OFFICE: <Briefcase className="h-3.5 w-3.5" />,
  COMMERCIAL_SPACE: <Store className="h-3.5 w-3.5" />,
  ROOM: <DoorOpen className="h-3.5 w-3.5" />,
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  APARTMENT: "Căn hộ",
  HOUSE: "Nhà nguyên căn",
  OFFICE: "Văn phòng",
  COMMERCIAL_SPACE: "Mặt bằng",
  ROOM: "Nhà trọ / Phòng",
};

interface StatusTabItem {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

const STATUS_TABS: StatusTabItem[] = [
  { value: "ALL", label: "Tất cả", icon: Layers, colorClass: "text-muted-foreground" },
  { value: "PUBLISHED", label: "Đang hiển thị", icon: CheckCircle2, colorClass: "text-emerald-500" },
  { value: "RENTED", label: "Đã cho thuê", icon: Home, colorClass: "text-blue-500" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt", icon: Clock, colorClass: "text-amber-500" },
  { value: "DRAFT", label: "Tin nháp", icon: FileText, colorClass: "text-slate-400" },
  { value: "HIDDEN", label: "Đã ẩn", icon: EyeOff, colorClass: "text-zinc-400" },
  { value: "EXPIRED", label: "Hết hạn", icon: CalendarX, colorClass: "text-orange-500" },
  { value: "REJECTED", label: "Bị từ chối", icon: XCircle, colorClass: "text-rose-500" },
  { value: "RENTED_EXTERNALLY", label: "Cho thuê ngoài", icon: ExternalLink, colorClass: "text-indigo-500" },
  { value: "VIOLATION", label: "Vi phạm", icon: AlertTriangle, colorClass: "text-red-500" },
];

function formatCurrency(amount: number): string {
  if (!amount || amount <= 0) return "Thỏa thuận";
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")} triệu`;
  }
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function MyPropertiesPage() {
  const router = useRouter();

  // State
  const [listings, setListings] = useState<MyListingSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [keywordInput, setKeywordInput] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch status counts on load & reload
  useEffect(() => {
    let cancelled = false;
    listingService
      .getMyListingCounts()
      .then((counts) => {
        if (!cancelled && counts) {
          setStatusCounts(counts);
        }
      })
      .catch((err) => {
        console.warn("Could not load listing status counts:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextKeyword = keywordInput.trim();
      setDebouncedKeyword((prev) => {
        if (prev !== nextKeyword) {
          setPage(1);
          return nextKeyword;
        }
        return prev;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  // Load listings from API
  useEffect(() => {
    let cancelled = false;

    const statusParam = statusFilter !== "ALL" ? (statusFilter as ListingStatus) : undefined;
    listingService
      .getMyListings({
        page,
        status: statusParam,
        keyword: debouncedKeyword || undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setListings(res.result || []);
          setTotalPages(res.totalPages || 1);
          setTotalElements(res.totalElements || 0);
          setLoading(false);
          setErrorMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("Fetch my listings error:", error);
          const msg = getApiErrorMessage(error, "Không thể tải danh sách tin đăng của bạn.");
          setErrorMessage(msg);
          setListings([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, debouncedKeyword, reloadKey]);

  function handleFilterStatusChange(newStatus: string) {
    setStatusFilter(newStatus);
    setPage(1);
    setLoading(true);
  }

  function handleOpenDetail(id: string) {
    router.push(`/dashboard/properties/view?id=${id}`);
  }

  function handleEditListing(id: string) {
    router.push(`/dashboard/properties/upsert?id=${id}`);
  }

  // Generate Smart Pagination page numbers
  const paginationPages = React.useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6 pb-28 animate-in fade-in-50 duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý tin đăng
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý {totalElements} tin cho thuê, theo dõi trạng thái kiểm duyệt và cập nhật bài đăng.
          </p>
        </div>

        {/* Header Action: Làm mới */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
            title="Làm mới danh sách tin đăng"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Segmented Status Tabs & Search Toolbar */}
      <div className="bg-card rounded-2xl border border-border shadow-2xs overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-3 sm:px-4 pt-2.5 pb-0 border-b border-border">
          {/* Scrollable Status Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth -mb-px">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = statusFilter === tab.value;
              const count =
                tab.value === "ALL"
                  ? statusCounts["ALL"] ?? totalElements
                  : statusCounts[tab.value] ?? 0;

              return (
                <button
                  key={tab.value}
                  onClick={() => handleFilterStatusChange(tab.value)}
                  className={`group relative flex items-center gap-2 py-3 px-3.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-primary" : tab.colorClass
                    }`}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary font-bold"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box on Desktop Right / Mobile Bottom */}
          <div className="pb-3 lg:pb-0 lg:mb-2.5 shrink-0">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Tìm kiếm tin đăng..."
                className="w-full h-9 rounded-xl bg-muted/40 pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/80 focus:border-primary transition-all"
              />
              {keywordInput && (
                <button
                  onClick={() => {
                    setKeywordInput("");
                    if (debouncedKeyword !== "") {
                      setDebouncedKeyword("");
                      setPage(1);
                      setLoading(true);
                    }
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-6 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">Không thể tải dữ liệu</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !errorMessage && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-border bg-card animate-pulse shadow-2xs"
            >
              <div className="w-full sm:w-44 h-32 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-5 bg-muted rounded-md w-3/4" />
                <div className="h-4 bg-muted rounded-md w-1/2" />
                <div className="h-4 bg-muted rounded-md w-1/3" />
                <div className="flex gap-2 pt-2">
                  <div className="h-8 bg-muted rounded-lg w-24" />
                  <div className="h-8 bg-muted rounded-lg w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMessage && listings.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground shadow-2xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {debouncedKeyword || statusFilter !== "ALL"
              ? "Không tìm thấy tin đăng phù hợp"
              : "Chưa có tin đăng nào"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {debouncedKeyword || statusFilter !== "ALL"
              ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái để xem các tin khác."
              : "Bạn chưa tạo tin cho thuê nào. Hãy bắt đầu đăng tin ngay để tiếp cận hàng ngàn khách thuê tiềm năng!"}
          </p>
          {(debouncedKeyword || statusFilter !== "ALL") && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setKeywordInput("");
                  setDebouncedKeyword("");
                  setStatusFilter("ALL");
                  setPage(1);
                  setLoading(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
              >
                <span>Xóa bộ lọc</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Property List Cards */}
      {!loading && !errorMessage && listings.length > 0 && (
        <div className="space-y-4">
          {listings.map((item) => {
            const statusConfig = getListingStatusConfig(item.status);
            const canEdit = item.status !== "VIOLATION";

            return (
              <div
                key={item.id}
                className="group relative flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Cover Image Thumbnail */}
                <div
                  onClick={() => handleOpenDetail(item.id)}
                  className="relative h-48 sm:h-auto sm:w-56 shrink-0 bg-muted cursor-pointer overflow-hidden"
                >
                  {item.coverImageUrl ? (
                    <Image
                      src={item.coverImageUrl}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-muted">
                      <Building className="h-10 w-10 opacity-40" />
                    </div>
                  )}

                  {/* Category Pill on Image */}
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-black/65 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
                    {CATEGORY_ICONS[item.category] || <Building className="h-3 w-3" />}
                    <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                  </span>

                  {/* Media Count */}
                  {item.mediaCount > 0 && (
                    <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Layers className="h-3 w-3" />
                      {item.mediaCount} ảnh
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 space-y-3">
                  <div>
                    {/* Status & Subtype Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${statusConfig.badgeClassName}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClassName}`} />
                        {statusConfig.label}
                      </span>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Đăng: {formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2
                      onClick={() => handleOpenDetail(item.id)}
                      className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2"
                    >
                      {item.title}
                    </h2>

                    {/* Address */}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate">
                        {item.fullAddress || "Chưa có thông tin địa chỉ"}
                      </span>
                    </p>

                    {/* Price & Area Specs */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-primary text-sm sm:text-base">
                        {formatCurrency(item.priceAmount)}
                        <span className="text-[11px] font-normal text-muted-foreground">
                          /{item.priceUnit === "M2_MONTH" ? "m²/tháng" : "tháng"}
                        </span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold text-foreground">{item.areaM2} m²</span>
                      {item.availableFrom && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground text-[11px]">
                            Vào ở từ: {formatDate(item.availableFrom)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Status Reason Alert for REJECTED or VIOLATION */}
                    {item.statusReason && (item.status === "REJECTED" || item.status === "VIOLATION") && (
                      <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <span className="font-bold">
                            {item.status === "VIOLATION" ? "Lý do khóa tin: " : "Lý do từ chối: "}
                          </span>
                          <span>{item.statusReason}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                    <div className="text-[11px] text-muted-foreground">
                      {item.publishedAt ? (
                        <span>Duyệt ngày: {formatDate(item.publishedAt)}</span>
                      ) : item.submittedAt ? (
                        <span>Gửi duyệt: {formatDate(item.submittedAt)}</span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Xem chi tiết */}
                      <button
                        onClick={() => handleOpenDetail(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Xem</span>
                      </button>

                      {/* Chỉnh sửa (nếu không phải VIOLATION) */}
                      {canEdit && (
                        <button
                          onClick={() => handleEditListing(item.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Sửa</span>
                        </button>
                      )}

                      {/* Đổi trạng thái theo các chuyển đổi chủ tin được phép */}
                      <ListingStatusActionMenu
                        listing={{
                          id: item.id,
                          title: item.title,
                          status: item.status,
                          expiresAt: item.expiresAt,
                        }}
                        onChanged={() => setReloadKey((prev) => prev + 1)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !errorMessage && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Trang <span className="font-bold text-foreground">{page}</span> / {totalPages} (Tổng cộng {totalElements} tin đăng)
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {paginationPages.map((p, idx) => {
              if (typeof p === "string") {
                return (
                  <span key={`dots-${idx}`} className="px-2 text-xs text-muted-foreground">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 min-w-9 px-3 rounded-xl text-xs font-bold transition-colors ${
                    p === page
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "border border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
