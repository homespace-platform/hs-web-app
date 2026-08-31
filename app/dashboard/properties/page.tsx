"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  EyeOff,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  AlertCircle,
  Loader2,
} from "lucide-react";
import listingService from "@/services/listing.service";
import type { ListingCategory, ListingStatus, MyListingSummaryResponse } from "@/types/listing.type";
import { getListingStatusConfig } from "@/config/listing-status.config";
import { getApiErrorMessage } from "@/utils/apiError";

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

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Tin nháp" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "PUBLISHED", label: "Đang hiển thị" },
  { value: "RENTED", label: "Đã cho thuê" },
  { value: "EXPIRED", label: "Hết hạn" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "HIDDEN", label: "Đã ẩn" },
  { value: "VIOLATION", label: "Vi phạm" },
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Confirm Action Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "HIDE" | "MARK_RENTED";
    listingId: string;
    listingTitle: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    type: "HIDE",
    listingId: "",
    listingTitle: "",
    isProcessing: false,
  });

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

  // Actions
  function openHideConfirm(listing: MyListingSummaryResponse) {
    setConfirmDialog({
      isOpen: true,
      type: "HIDE",
      listingId: listing.id,
      listingTitle: listing.title,
      isProcessing: false,
    });
  }

  function openMarkRentedConfirm(listing: MyListingSummaryResponse) {
    setConfirmDialog({
      isOpen: true,
      type: "MARK_RENTED",
      listingId: listing.id,
      listingTitle: listing.title,
      isProcessing: false,
    });
  }

  async function handleConfirmAction() {
    const { type, listingId } = confirmDialog;
    if (!listingId) return;

    setConfirmDialog((prev) => ({ ...prev, isProcessing: true }));

    try {
      if (type === "HIDE") {
        await listingService.hide(listingId);
        toast.success("Đã ẩn bài đăng thành công.");
      } else if (type === "MARK_RENTED") {
        await listingService.markRented(listingId);
        toast.success("Đã chuyển trạng thái sang Đã cho thuê.");
      }

      setConfirmDialog((prev) => ({ ...prev, isOpen: false, isProcessing: false }));
      // Refetch list without page reload
      setReloadKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Action error:", error);
      const msg = getApiErrorMessage(error, "Thao tác không thành công. Vui lòng thử lại.");
      toast.error(msg);
      setConfirmDialog((prev) => ({ ...prev, isProcessing: false }));
    }
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
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Tin đăng của tôi
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Quản lý {totalElements} tin cho thuê, theo dõi trạng thái kiểm duyệt và cập nhật bài đăng.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề bài đăng..."
            className="w-full h-10 rounded-xl bg-muted/40 pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterStatusChange(e.target.value)}
            className="w-full h-10 rounded-xl bg-muted/40 px-3 text-xs font-medium text-foreground border border-transparent focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
            const isViolation = item.status === "VIOLATION";
            const isPublished = item.status === "PUBLISHED";
            const canEdit = !isViolation;

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

                      {/* Action riêng khi PUBLISHED */}
                      {isPublished && (
                        <>
                          <button
                            onClick={() => openHideConfirm(item)}
                            className="inline-flex items-center gap-1 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Ẩn tin</span>
                          </button>

                          <button
                            onClick={() => openMarkRentedConfirm(item)}
                            className="inline-flex items-center gap-1 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Đã cho thuê</span>
                          </button>
                        </>
                      )}
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

      {/* Confirm Action Modal (Hide or Mark Rented) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  confirmDialog.type === "HIDE"
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                    : "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                }`}
              >
                {confirmDialog.type === "HIDE" ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {confirmDialog.type === "HIDE" ? "Xác nhận ẩn bài đăng" : "Xác nhận đã cho thuê"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {confirmDialog.type === "HIDE"
                    ? "Bài đăng sẽ không còn hiển thị với khách thuê tìm kiếm."
                    : "Đánh dấu bất động sản này đã tìm được người thuê."}
                </p>
              </div>
            </div>

            <p className="text-xs text-foreground bg-muted/50 p-3 rounded-xl border border-border/80 font-medium line-clamp-2">
              &quot;{confirmDialog.listingTitle}&quot;
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                }
                disabled={confirmDialog.isProcessing}
                className="h-9 rounded-xl border border-border px-4 text-xs font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmDialog.isProcessing}
                className={`inline-flex h-9 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white transition-all shadow-sm ${
                  confirmDialog.type === "HIDE"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } disabled:opacity-70`}
              >
                {confirmDialog.isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Xác nhận</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
