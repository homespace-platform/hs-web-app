"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function RentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authenticated } = useAuth();
  const dispatch = useAppDispatch();
  const [property, setProperty] = useState<RentPropertyItem | null>(null);
  const [listingStatus, setListingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadDetail = async () => {
      let listingDetail = null;
      let isOwnerView = false;

      // 1. Thử gọi API chính chủ getMyListingById trước (cho phép chủ tin xem bài đăng ở mọi trạng thái: Đã ẩn, Tin nháp, Chờ duyệt...)
      if (authenticated) {
        try {
          listingDetail = await listingService.getMyListingById(id);
          isOwnerView = true;
        } catch {
          // Không phải chủ tin hoặc chưa đăng nhập -> fallback
        }
      }

      // 2. Nếu chưa lấy được bằng API cá nhân, gọi API công khai getById
      if (!listingDetail) {
        try {
          listingDetail = await listingService.getById(id);
        } catch {
          listingDetail = null;
        }
      }

      if (cancelled) return;

      if (!listingDetail) {
        setProperty(null);
        setLoading(false);
        return;
      }

      const isVisible = listingDetail.status === "PUBLISHED" || listingDetail.status === "RESERVED";

      // Nếu tin không thuộc dạng công khai VÀ người dùng không phải là chủ tin -> Trả về 404 không tìm thấy
      if (!isVisible && !isOwnerView) {
        setProperty(null);
        setLoading(false);
        return;
      }

      setListingStatus(listingDetail.status);
      setProperty(toRentProperty(listingDetail));

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
      if (authenticated) {
        dispatch(recordHistoryItem(id));
      }

      setLoading(false);
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [id, authenticated, dispatch]);

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

  const currentStatus = listingStatus || property.status;
  const statusCfg = getListingStatusConfig(currentStatus);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Reusable Core Detail View */}
          <RentDetailView
            property={property}
            alertBanner={
              currentStatus === "RESERVED" ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-center gap-3 text-xs sm:text-sm shadow-xs">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Tin đăng đang trong thời gian giữ chỗ</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Chủ nhà đã duyệt một yêu cầu thuê và tin đăng đang tạm thời được giữ chỗ trong {RENTAL_HOLD_DURATION_LABEL}.
                    </p>
                  </div>
                </div>
              ) : currentStatus && currentStatus !== "PUBLISHED" ? (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-200 flex items-center gap-3 text-xs sm:text-sm shadow-xs">
                  <Building className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Xem trước tin đăng ({statusCfg.label})</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tin đăng này hiện đang ở trạng thái &quot;{statusCfg.label}&quot; và không hiển thị công khai với khách thuê. Chỉ có bạn (chủ tin đăng) mới có quyền truy cập xem trước.
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
