"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RentDetailView from "@/components/rent/RentDetailView";
import { ArrowLeft, Loader2, Building, Clock } from "lucide-react";
import type { RentPropertyItem } from "@/types/rent.type";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { useAuth } from "@/features/auth/useAuth";
import { useAppDispatch } from "@/store/hooks";
import { recordHistoryItem } from "@/features/history/historySlice";
import { RENTAL_HOLD_DURATION_LABEL } from "@/config/rental-hold.config";

import { getListingStatusConfig } from "@/config/listing-status.config";
import { fetchListingForViewer } from "@/lib/listing-detail-access";

export default function RentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { initialized, authenticated, userId } = useAuth();
  const dispatch = useAppDispatch();
  const [property, setProperty] = useState<RentPropertyItem | null>(null);
  const [listingStatus, setListingStatus] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([id, authenticated, userId, retry]);
  const loading = !initialized || loadedFor !== requestKey;

  useEffect(() => {
    if (!id || !initialized) return;
    let cancelled = false;

    const loadDetail = async () => {
      let listingDetail = null;
      let failed = false;
      try {
        listingDetail = await fetchListingForViewer(id, authenticated, listingService);
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        failed = status !== 403 && status !== 404;
      }

      if (cancelled) return;

      if (!listingDetail) {
        setProperty(null);
        setListingStatus(null);
        setLoadError(failed);
        setLoadedFor(requestKey);
        return;
      }

      const isVisible = listingDetail.status === "PUBLISHED" || listingDetail.status === "RESERVED";

      // Successful API response is authorized by Core, including related tenants.
      setListingStatus(listingDetail.status);
      setProperty(toRentProperty(listingDetail));
      setLoadError(false);

      // Ghi nhận lượt xem (chỉ áp dụng cho tin công khai)
      if (isVisible) {
        listingService.recordView(id).then((viewRes) => {
          if (viewRes.counted && !cancelled) {
            setProperty((prev) =>
              prev ? { ...prev, viewCount: viewRes.viewCount, viewsCount: viewRes.viewCount } : null,
            );
          }
        });
      }

      // Ghi nhận lịch sử xem tin cho user đã đăng nhập
      if (authenticated && isVisible) {
        dispatch(recordHistoryItem(id));
      }

      setLoadedFor(requestKey);
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [id, initialized, authenticated, userId, requestKey, dispatch]);

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
                {loadError ? "Chưa tải được bài đăng" : "Không tìm thấy bài đăng"}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {loadError ? "Không thể kết nối hoặc phiên đăng nhập chưa sẵn sàng. Vui lòng thử lại." : "Bài đăng không tồn tại, đã bị xóa hoặc bạn không có quyền truy cập."}
              </p>
            </div>
            <div className="pt-2">
              {loadError && <button type="button" onClick={() => setRetry(value => value + 1)} className="mb-3 w-full rounded-full border border-border px-6 py-2.5 text-sm font-semibold">Thử lại</button>}
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

  const currentStatus = listingStatus || property.status;
  const statusCfg = getListingStatusConfig(currentStatus);
  const isOwnerView = authenticated && !!userId && userId === property.ownerId;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Reusable Core Detail View */}
          <RentDetailView
            key={property.id}
            property={property}
            alertBanner={
              currentStatus === "RESERVED" ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-center gap-3 text-xs sm:text-sm shadow-xs">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Tin đăng đang trong thời gian giữ chỗ</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tin đang được giữ cho một yêu cầu thuê. Hạn thanh toán giữ chỗ ban đầu là {RENTAL_HOLD_DURATION_LABEL}; nếu cọc đã được xác nhận, xem tiến trình nhận nhà để biết bước tiếp theo.
                    </p>
                  </div>
                </div>
              ) : currentStatus && currentStatus !== "PUBLISHED" ? (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-200 flex items-center gap-3 text-xs sm:text-sm shadow-xs">
                  <Building className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{isOwnerView ? "Xem trước tin đăng" : "Tin đăng liên quan đến yêu cầu thuê của bạn"} ({statusCfg.label})</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isOwnerView ? "Bạn có quyền xem với tư cách chủ tin đăng." : "Bạn có quyền xem vì có yêu cầu thuê liên quan. Quyền xem này không cấp quyền chỉnh sửa hoặc gửi yêu cầu thuê mới khi tin không còn nhận khách."} Tin hiện không hiển thị công khai.
                    </p>
                  </div>
                </div>
              ) : undefined
            }
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
