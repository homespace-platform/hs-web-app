"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Edit,
  Loader2,
} from "lucide-react";
import RentDetailView from "@/components/rent/RentDetailView";
import ListingStatusActionMenu from "../components/ListingStatusActionMenu";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { getListingStatusConfig } from "@/config/listing-status.config";
import type { ListingDetailResponse } from "@/types/listing.type";
import type { RentPropertyItem } from "@/types/rent.type";

function DashboardPropertyViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [rawListing, setRawListing] = useState<ListingDetailResponse | null>(null);
  const [property, setProperty] = useState<RentPropertyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = () => {
    if (!id) {
      setError("Không tìm thấy mã bài đăng.");
      setLoading(false);
      return;
    }

    setLoading(true);
    // getMyListingById calls authenticated endpoint /api/v1/listings/{id}
    // which allows the owner to view the listing regardless of status (HIDDEN, PENDING_REVIEW, etc.)
    listingService
      .getMyListingById(id)
      .then((detail) => {
        setRawListing(detail);
        setProperty(toRentProperty(detail));
        setError(null);
      })
      .catch((err) => {
        console.error("Error loading property in dashboard view:", err);
        // Fallback to getById
        listingService
          .getById(id)
          .then((detail) => {
            setRawListing(detail);
            setProperty(toRentProperty(detail));
            setError(null);
          })
          .catch(() => {
            setError("Không thể tải thông tin bài đăng hoặc bạn không có quyền xem bài đăng này.");
          });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Đang tải thông tin bài đăng...</span>
      </div>
    );
  }

  if (error || !property || !rawListing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Không thể hiển thị tin đăng</h2>
        <p className="text-xs text-muted-foreground">{error || "Tin đăng không tồn tại hoặc đã bị xóa."}</p>
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

  const statusConfig = getListingStatusConfig(rawListing.status);
  const canEdit = rawListing.status !== "VIOLATION";

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

        {/* Change Status Action Menu */}
        <ListingStatusActionMenu
          listing={{
            id: rawListing.id,
            title: rawListing.title,
            status: rawListing.status,
            expiresAt: rawListing.expiresAt,
          }}
          onChanged={() => fetchDetail()}
          size="md"
        />

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
