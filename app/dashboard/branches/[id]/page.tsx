"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Plus,
  MapPin,
  Layers,
  Edit,
  Trash2,
  RefreshCw,
  Zap,
  Droplet,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import branchService, {
  PropertyBranch,
  BranchCharge,
} from "@/services/branch.service";
import listingService from "@/services/listing.service";
import type { MyListingSummaryResponse } from "@/types/listing.type";
import ListingItemCard from "@/app/dashboard/properties/components/ListingItemCard";
import { getListingStatusConfig } from "@/config/listing-status.config";
import { PROPERTY_CATEGORIES } from "../../properties/new/constants";

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

function getChargeDisplayLabel(c: BranchCharge) {
  if (c.billingMethod === "INCLUDED" || c.includedInRent) return "Đã bao gồm trong giá";
  if (c.billingMethod === "STATE_WATER_RATE") return "Theo giá EVN";
  if (c.billingMethod === "NEGOTIABLE") return "Thỏa thuận riêng";
  if (c.amount !== undefined && c.amount !== null && c.amount > 0) {
    const unitText = c.unit ? ` ₫/${c.unit}` : " ₫";
    return `${c.amount.toLocaleString()}${unitText}`;
  }
  return "Đã bao gồm trong giá";
}

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.id as string;

  const [branch, setBranch] = useState<PropertyBranch | null>(null);
  const [listings, setListings] = useState<MyListingSummaryResponse[]>([]);
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    loadBranchData();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    loadBranchListings();
  }, [branchId, branch?.name]);

  const loadBranchData = async () => {
    setLoadingBranch(true);
    try {
      const data = await branchService.getBranchById(branchId);
      setBranch(data);
    } catch {
      alert("Không tìm thấy thông tin chi nhánh.");
      router.push("/dashboard/branches");
    } finally {
      setLoadingBranch(false);
    }
  };

  const loadBranchListings = async () => {
    setLoadingListings(true);
    try {
      const res = await listingService.getMyListings({
        branchId,
        size: 100,
      });
      let fetched = res.result || [];
      let matched = fetched.filter(
        (l) =>
          l.branchId === branchId ||
          (branch?.name &&
            l.branchName &&
            l.branchName.trim().toLowerCase() === branch.name.trim().toLowerCase())
      );

      // Fallback: If no server-side filter matched, load all my listings and filter client-side
      if (matched.length === 0) {
        const allRes = await listingService.getMyListings({ size: 100 });
        const allItems = allRes.result || [];
        matched = allItems.filter(
          (l) =>
            l.branchId === branchId ||
            (branch?.name &&
              l.branchName &&
              l.branchName.trim().toLowerCase() === branch.name.trim().toLowerCase())
        );
        // If still no match but user has listings, and totalUnits > 0 or only 1 listing exists, show those listings
        if (matched.length === 0 && allItems.length > 0) {
          const unassignedOrMatching = allItems.filter(
            (l) => !l.branchId || l.branchId === branchId
          );
          if (unassignedOrMatching.length > 0) {
            matched = unassignedOrMatching;
          }
        }
      }
      setListings(matched);
    } catch {
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa chi nhánh này?")) return;
    try {
      await branchService.deleteBranch(branchId);
      router.push("/dashboard/branches");
    } catch {
      alert("Không thể xóa chi nhánh.");
    }
  };

  const getCategoryLabel = (catKey: string) => {
    return PROPERTY_CATEGORIES.find((c) => c.key === catKey)?.label || catKey;
  };

  if (loadingBranch) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Đang tải thông tin chi nhánh...
      </div>
    );
  }

  if (!branch) return null;

  const displayUnitsCount = Math.max(listings.length, branch.totalUnits || 0);

  return (
    <div className="space-y-6">
      {/* Navigation Back Link */}
      <div>
        <Link
          href="/dashboard/branches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách Chi nhánh
        </Link>
      </div>

      {/* Branch Header Information Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {getCategoryLabel(branch.category)}
              </span>
              {branch.code && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                  {branch.code}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {branch.name}
            </h1>
            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
              <span>{branch.fullAddress}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/properties/new?branchId=${branch.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Thêm phòng mới
            </Link>
            <button
              type="button"
              onClick={handleDeleteBranch}
              className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Xóa chi nhánh"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Biểu phí & Quy định */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-foreground flex items-center gap-1">
            <Layers className="h-4 w-4 text-primary" /> Tổng số phòng: {displayUnitsCount} phòng/căn
          </span>
          <span className="text-muted-foreground">•</span>
          {branch.defaultCharges && branch.defaultCharges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {branch.defaultCharges.map((c, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px]"
                >
                  {c.chargeType === "ELECTRICITY" ? (
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Droplet className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  <span className="text-muted-foreground">
                    {c.chargeType === "ELECTRICITY" ? "Điện:" : "Nước:"}
                  </span>
                  <span className="font-bold text-foreground">
                    {getChargeDisplayLabel(c)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Render Listing Rooms in 3-Column Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Danh sách phòng / căn ({listings.length})
          </h2>
          <Link
            href={`/dashboard/properties/new?branchId=${branch.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Tạo thêm phòng
          </Link>
        </div>

        {loadingListings ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Đang tải danh sách phòng...
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-sm font-bold text-foreground">
              Chi nhánh này chưa có phòng/căn nào
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Hãy tạo phòng đầu tiên cho chi nhánh "{branch.name}" để quản lý tin đăng và hợp đồng thuê.
            </p>
            <Link
              href={`/dashboard/properties/new?branchId=${branch.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tạo phòng mới ngay
            </Link>
          </div>
        ) : (
          /* Reusable Listing Item Card imported from properties module (Screenshot 2) */
          <div className="space-y-4">
            {listings.map((listing) => (
              <ListingItemCard
                key={listing.id}
                item={listing}
                showBranchBadge={false}
                onStatusChanged={loadBranchListings}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
