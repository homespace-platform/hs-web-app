"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Plus,
  MapPin,
  Layers,
  Trash2,
  RefreshCw,
  Zap,
  Droplet,
  ArrowLeft,
  Shield,
  Wifi,
  Sparkles,
  Bike,
  Car,
  FileText,
  AlertTriangle,
} from "lucide-react";
import branchService, {
  PropertyBranch,
  BranchCharge,
} from "@/services/branch.service";
import listingService from "@/services/listing.service";
import type { MyListingSummaryResponse } from "@/types/listing.type";
import ListingItemCard from "@/app/dashboard/properties/components/ListingItemCard";
import { PROPERTY_CATEGORIES } from "../../properties/new/constants";
import { getChargeDisplay, getChargeMeta } from "../page";

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.id as string;

  const [branch, setBranch] = useState<PropertyBranch | null>(null);
  const [listings, setListings] = useState<MyListingSummaryResponse[]>([]);
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);

  const loadBranchData = useCallback(async () => {
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
  }, [branchId, router]);

  const loadBranchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await listingService.getMyListings({
        branchId,
        size: 100,
      });
      const fetched = res.result || [];
      let matched = fetched.filter(
        (l) =>
          l.branchId === branchId ||
          (branch?.name &&
            l.branchName &&
            l.branchName.trim().toLowerCase() === branch.name.trim().toLowerCase())
      );

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
      }
      setListings(matched);
    } catch {
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, [branch, branchId]);

  useEffect(() => {
    if (!branchId) return;
    loadBranchData();
  }, [branchId, loadBranchData]);

  useEffect(() => {
    if (!branchId) return;
    loadBranchListings();
  }, [branchId, loadBranchListings]);

  const handleDeleteBranch = async () => {
    if (displayUnitsCount > 0) {
      alert(
        `Chi nhánh đang có ${displayUnitsCount} phòng/căn hộ. Không thể xóa chi nhánh khi vẫn còn phòng!\nVui lòng chuyển hoặc xóa các phòng thuộc chi nhánh này trước.`
      );
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa chi nhánh này?")) return;
    try {
      await branchService.deleteBranch(branchId);
      router.push("/dashboard/branches");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Không thể xóa chi nhánh.";
      alert(msg);
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

      {/* Cover Image Banner & Main Info */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Responsive Cover Hero Banner */}
        <div className="relative h-44 sm:h-56 md:h-64 w-full bg-muted/40">
          {branch.coverImageUrl ? (
            <Image
              src={branch.coverImageUrl}
              alt={branch.name}
              fill
              unoptimized
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-primary/20 via-primary/10 to-muted text-primary">
              <Building2 className="h-16 w-16 opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

          {/* Floating Badges on Banner */}
          <div className="absolute bottom-4 left-4 sm:left-6 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
              {getCategoryLabel(branch.category)}
            </span>
            {branch.code && (
              <span className="rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-xs font-mono font-semibold text-white">
                {branch.code}
              </span>
            )}
            {branch.isComplete === false && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/90 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                Biểu phí chưa hoàn thiện
              </span>
            )}
          </div>
        </div>

        {/* Info Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {branch.name}
              </h1>
              <p className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                <span>{branch.fullAddress}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/dashboard/properties/new?branchId=${branch.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Thêm phòng mới
              </Link>
              <button
                type="button"
                onClick={handleDeleteBranch}
                className={
                  displayUnitsCount > 0
                    ? "rounded-xl border border-border/60 p-2 text-muted-foreground/40 cursor-not-allowed transition-colors"
                    : "rounded-xl border border-border p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                }
                title={
                  displayUnitsCount > 0
                    ? `Chi nhánh đang có ${displayUnitsCount} phòng/căn, không thể xóa!`
                    : "Xóa chi nhánh"
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 font-bold text-primary">
              <Layers className="h-4 w-4" /> {displayUnitsCount} phòng/căn hộ
            </span>

            <span className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-1.5 font-medium text-foreground">
              <span>🏍️ Sức chứa xe máy: {branch.motorbikeParkingCapacity ?? 0}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>🚗 Sức chứa ô tô: {branch.carParkingCapacity ?? 0}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Comprehensive Charges Grid */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Biểu phí dịch vụ hàng tháng (Nguồn dữ liệu chuẩn)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Áp dụng và đồng bộ cho tất cả các phòng / tin đăng thuộc chi nhánh
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {branch.defaultCharges && branch.defaultCharges.length > 0 ? (
            branch.defaultCharges.map((c, i) => {
              const meta = getChargeMeta(c.chargeType);
              const IconComp = meta.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1.5 transition-all hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <IconComp className={`h-4 w-4 ${meta.color}`} />
                      {c.chargeType === "OTHER" ? (c.customName || "Phí khác") : meta.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {getChargeDisplay(c)}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground italic col-span-full">
              Chi nhánh này chưa thiết lập biểu phí dịch vụ hàng tháng.
            </p>
          )}
        </div>

        {/* Building Rules & Description */}
        {(branch.buildingRules || branch.description) && (
          <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
            {branch.buildingRules && (
              <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Nội quy &amp; Quy định chung
                </span>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {branch.buildingRules}
                </p>
              </div>
            )}
            {branch.description && (
              <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Tiện ích chung &amp; Mô tả
                </span>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {branch.description}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content: Render Listing Rooms in List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Danh sách phòng / căn hộ ({listings.length})
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
              Hãy tạo phòng đầu tiên cho chi nhánh &quot;{branch.name}&quot; để quản lý tin đăng và hợp đồng thuê.
            </p>
            <Link
              href={`/dashboard/properties/new?branchId=${branch.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tạo phòng mới ngay
            </Link>
          </div>
        ) : (
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
