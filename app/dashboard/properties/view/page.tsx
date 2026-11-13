"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Edit,
  Copy,
  Loader2,
} from "lucide-react";
import RentDetailView from "@/components/rent/RentDetailView";
import ListingStatusActionMenu from "../components/ListingStatusActionMenu";
import { useListingNotifications } from "../components/useListingNotifications";
import { useAuth } from "@/features/auth/useAuth";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { getListingStatusConfig } from "@/config/listing-status.config";
import type { ListingDetailResponse } from "@/types/listing.type";

const NOT_FOUND_MESSAGE = "Tin đăng không tồn tại hoặc đã bị xóa.";
const FORBIDDEN_MESSAGE = "Bạn không có quyền xem tin đăng này.";

function DashboardPropertyViewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { initialized, authenticated, userId, login } = useAuth();

  const [fetchedListing, setFetchedListing] = useState<ListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may update state (id/account change or newer refresh).
  const requestSeq = useRef(0);

  const fetchDetail = useCallback(async (silent = false) => {
    const seq = ++requestSeq.current;
    if (!silent) {
      setFetchedListing(null);
      setError(null);
      setLoading(true);
    }
    if (!id) {
      setError("Không tìm thấy mã bài đăng.");
      setLoading(false);
      return;
    }
    if (!userId) return;
    try {
      // Authenticated endpoint; no public fallback, so access failures are never masked.
      const detail = await listingService.getMyListingById(id);
      if (seq !== requestSeq.current) return;
      if (detail.id !== id || detail.ownerId !== userId) {
        setFetchedListing(null);
        setError(FORBIDDEN_MESSAGE);
      } else {
        setFetchedListing(detail);
        setError(null);
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 403 || !silent) {
        setFetchedListing(null);
        setError(status === 404 ? NOT_FOUND_MESSAGE : status === 403 ? FORBIDDEN_MESSAGE : "Không thể tải thông tin bài đăng.");
      } // else: keep the last verified data after a transient background failure.
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [id, userId]);

  const loginRequested = useRef(false);
  useEffect(() => {
    if (!initialized) return;
    if (!authenticated || !userId) {
      requestSeq.current++;
      setFetchedListing(null);
      // Keep the full same-origin path, query and hash through the login redirect.
      if (!loginRequested.current) {
        loginRequested.current = true;
        login(`${window.location.pathname}${window.location.search}${window.location.hash}`);
      }
      return;
    }
    loginRequested.current = false;
    void fetchDetail();
  }, [initialized, authenticated, userId, fetchDetail, login]);

  const refreshSilently = useCallback(() => fetchDetail(true), [fetchDetail]);
  useListingNotifications({
    enabled: initialized && authenticated && !!userId && !!id,
    refresh: refreshSilently,
    listingId: id ?? undefined,
  });

  // Never render data that belongs to another listing or account, even for one frame.
  const visibleListing = fetchedListing && fetchedListing.id === id && fetchedListing.ownerId === userId ? fetchedListing : null;
  const property = useMemo(() => (visibleListing ? toRentProperty(visibleListing) : null), [visibleListing]);

  if ((loading || !initialized || !authenticated) && !visibleListing && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Đang tải thông tin bài đăng...</span>
      </div>
    );
  }

  if (error || !property || !visibleListing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Không thể hiển thị tin đăng</h2>
        <p className="text-xs text-muted-foreground">{error || NOT_FOUND_MESSAGE}</p>
        <div className="pt-2">
          <Link
            href="/dashboard/properties"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách</span>
          </Link>
        </div>
      </div>
    );
  }

  const rawListing = visibleListing;
  const statusConfig = getListingStatusConfig(rawListing.status);
  const isRented = String(rawListing.status || "").trim().toUpperCase() === "RENTED";
  const isRentedExternally = String(rawListing.status || "").trim().toUpperCase() === "RENTED_EXTERNALLY";
  const isViolation = String(rawListing.status || "").trim().toUpperCase() === "VIOLATION";
  const canEdit = !isViolation && !isRentedExternally;
  const canDuplicate = !isViolation;

  // Top Bar with Breadcrumbs, Status Pill and Landlord Actions
  const topBar = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/80">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/properties" className="hover:text-foreground transition-colors">
            Tin đăng
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-xs">
            {property.title}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeClassName}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dotClassName}`} />
            <span>{statusConfig.label}</span>
          </span>

          <span className="text-xs text-muted-foreground">
            {property.categoryLabel}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Danh sách tin</span>
        </Link>

        {rawListing.pendingEditId && <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Bản sửa đang chờ duyệt</span>}
        {rawListing.editRejectionReason && <span className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">
          Bản sửa bị từ chối · {rawListing.editRejectionReason}
        </span>}
        {/* Change Status Action Menu */}
        <ListingStatusActionMenu
          listing={{
            id: rawListing.id,
            title: rawListing.title,
            status: rawListing.status,
            expiresAt: rawListing.expiresAt,
          }}
          onChanged={() => void fetchDetail(true)}
          size="md"
        />

        {/* Duplicate Button */}
        {canDuplicate && (
          <Link
            href={`/dashboard/properties/new?duplicateFrom=${rawListing.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all"
            title="Nhân bản tin đăng này"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Nhân bản</span>
          </Link>
        )}

        {/* Edit Button */}
        {canEdit && (
          <Link
            href={`/dashboard/properties/upsert?id=${rawListing.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Chỉnh sửa tin đăng</span>
          </Link>
        )}
      </div>
    </div>
  );

  // Rejection Reason Banner
  const alertBanner = rawListing.statusReason &&
    (rawListing.status === "REJECTED" || rawListing.status === "VIOLATION") && (
      <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm">
            {rawListing.status === "VIOLATION" ? "Bài đăng bị khóa vi phạm" : "Bài đăng bị từ chối duyệt"}
          </h4>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
            {rawListing.statusReason}
          </p>
        </div>
      </div>
    );

  return (
    <div className="pb-16 max-w-7xl mx-auto space-y-6">
      <RentDetailView
        property={property}
        topBar={topBar}
        alertBanner={alertBanner}
        showLandlordContact={true}
      />
    </div>
  );
}

export default function DashboardPropertyViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Đang tải...</span>
        </div>
      }
    >
      <DashboardPropertyViewContent />
    </Suspense>
  );
}
