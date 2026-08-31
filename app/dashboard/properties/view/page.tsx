"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  MapPin,
  Building,
  Home,
  Briefcase,
  Store,
  DoorOpen,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import listingService from "@/services/listing.service";
import AddressMapPreview from "@/components/address/AddressMapPreview";
import type { ListingDetailResponse } from "@/types/listing.type";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

const CATEGORY_NAMES: Record<string, string> = {
  APARTMENT: "Căn hộ / Chung cư",
  HOUSE: "Nhà ở nguyên căn",
  OFFICE: "Văn phòng cho thuê",
  COMMERCIAL_SPACE: "Mặt bằng kinh doanh",
  COMMERCIAL: "Mặt bằng kinh doanh",
  ROOM: "Nhà trọ / Phòng cho thuê",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  APARTMENT: <Building className="h-4 w-4" />,
  HOUSE: <Home className="h-4 w-4" />,
  OFFICE: <Briefcase className="h-4 w-4" />,
  COMMERCIAL_SPACE: <Store className="h-4 w-4" />,
  COMMERCIAL: <Store className="h-4 w-4" />,
  ROOM: <DoorOpen className="h-4 w-4" />,
};

const SUBTYPE_NAMES: Record<string, string> = {
  APARTMENT_STANDARD: "Chung cư tiêu chuẩn",
  APARTMENT_STUDIO: "Căn hộ Studio",
  APARTMENT_DUPLEX: "Căn hộ Duplex",
  APARTMENT_PENTHOUSE: "Penthouse cao cấp",
  APARTMENT_OFFICETEL: "Officetel",
  APARTMENT_SERVICE: "Căn hộ dịch vụ",
  HOUSE_TOWNHOUSE: "Nhà phố liền kề",
  HOUSE_VILLA: "Biệt thự / Villa",
  HOUSE_ALLEY: "Nhà trong ngõ / hẻm",
  HOUSE_LEVEL4: "Nhà cấp 4",
  OFFICE_TRADITIONAL: "Văn phòng truyền thống",
  OFFICE_SERVICED: "Văn phòng trọn gói (Serviced)",
  OFFICE_COWORKING: "Không gian làm việc chung (Co-working)",
  OFFICE_SHARED: "Văn phòng chia sẻ",
  COMMERCIAL_STREET_HOUSE: "Mặt bằng nhà mặt phố",
  COMMERCIAL_SHOPHOUSE: "Shophouse khối đế",
  COMMERCIAL_SHOP: "Kiot / Cửa hàng",
  COMMERCIAL_SHOWROOM: "Showroom trưng bày",
  COMMERCIAL_MALL: "Mặt bằng trung tâm thương mại",
  ROOM_BOARDING: "Phòng trọ sinh viên / công nhân",
  ROOM_HOMESTAY: "Phòng trong nhà nguyên căn",
  ROOM_SERVICED: "Phòng trọ cao cấp / Mini studio",
  ROOM_DORMITORY: "Ký túc xá / Giường tầng (Sleepbox)",
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

const SLOT_LABELS: Record<string, string> = {
  MORNING: "Buổi sáng (08:00 – 12:00)",
  AFTERNOON: "Buổi chiều (13:00 – 17:00)",
  EVENING: "Buổi tối (18:00 – 21:00)",
};

function DetailItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: React.ReactNode;
  highlight?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border/80 bg-muted/20 p-3 text-xs">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? "text-primary text-sm font-bold" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  stepNumber,
  children,
}: {
  title: string;
  stepNumber?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
        {stepNumber != null && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {stepNumber}
          </span>
        )}
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function PropertyDetailPageContent() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("id");

  const [data, setData] = useState<ListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [error, setError] = useState(
    !listingId ? "Không tìm thấy mã tin đăng trong đường dẫn." : ""
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!listingId) {
      return;
    }

    let active = true;

    listingService
      .getById(listingId)
      .then((res) => {
        if (active) {
          setData(res);
          setError("");
          setSelectedImageIndex(0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Error loading listing detail:", err);
          setError(err?.response?.data?.message || "Không thể tải chi tiết bài đăng hoặc tin không tồn tại.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [listingId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Đang tải thông tin chi tiết bài đăng...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Info className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Không thể hiển thị tin đăng</h2>
        <p className="text-sm text-muted-foreground">{error || "Tin đăng không tồn tại hoặc đã bị xóa."}</p>
        <div className="pt-2">
          <Link
            href="/dashboard/properties"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách tin
          </Link>
        </div>
      </div>
    );
  }

  const images = data.media?.filter((m) => m.mediaType === "IMAGE" && m.url) || [];
  const videos = data.media?.filter((m) => m.mediaType === "VIDEO" && m.url) || [];
  const currentImage = images[selectedImageIndex] || images[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in-50 duration-200">
      {/* Top Navigation Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
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
              {data.title}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
              {CATEGORY_ICONS[data.category]}
              {CATEGORY_NAMES[data.category] || data.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                data.status === "PUBLISHED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {data.status === "PUBLISHED" ? "Đang hiển thị" : data.status}
            </span>
            {data.publishedAt && (
              <span className="text-xs text-muted-foreground">
                Đăng ngày: {new Date(data.publishedAt).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/properties"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Danh sách tin
          </Link>
          <Link
            href={`/dashboard/properties/upsert?id=${data.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
          >
            <Edit className="h-4 w-4" />
            Chỉnh sửa tin đăng
          </Link>
        </div>
      </div>

      {/* Hero Overview & Media Gallery */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Gallery column */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-sm">
            {currentImage?.url ? (
              <Image
                src={currentImage.url}
                alt={data.title}
                fill
                priority
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Building className="h-12 w-12 opacity-30" />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-md shadow-md text-foreground hover:bg-background transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-md shadow-md text-foreground hover:bg-background transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white">
              {selectedImageIndex + 1} / {images.length || 1} ảnh
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? "border-primary ring-2 ring-primary/20 scale-95"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={`Ảnh ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}

          {/* Videos if available */}
          {videos.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Video thực tế ({videos.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {videos.map((vid, idx) => (
                  <video
                    key={vid.id || idx}
                    src={vid.url}
                    controls
                    className="w-full rounded-xl border border-border bg-black max-h-64 object-contain"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Highlights Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
              {data.title}
            </h1>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>{data.address?.fullAddress || data.address?.streetLine || "Chưa cập nhật địa chỉ"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Giá cho thuê</span>
                <span className="text-lg font-extrabold text-primary">
                  {formatCurrency(Number(data.pricing?.amount || 0))} ₫
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  /{data.pricing?.unit === "ROOM_MONTH" ? "phòng/tháng" : data.pricing?.unit === "M2_MONTH" ? "m²/tháng" : "tháng"}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/25 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Diện tích</span>
                <span className="text-lg font-extrabold text-foreground">{data.areaM2}</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">m² sử dụng</span>
              </div>

              <div className="rounded-xl border border-border bg-muted/25 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Tiền đặt cọc</span>
                <span className="text-sm font-bold text-foreground">
                  {data.pricing?.depositType === "FIXED_AMOUNT" && data.pricing.depositAmount
                    ? `${formatCurrency(Number(data.pricing.depositAmount))} ₫`
                    : data.pricing?.depositType === "MONTH_COUNT" && data.pricing.depositMonths
                    ? `${data.pricing.depositMonths} tháng tiền thuê`
                    : data.pricing?.depositType === "NONE"
                    ? "Không yêu cầu cọc"
                    : "Thương lượng"}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/25 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Ngày vào ở</span>
                <span className="text-sm font-bold text-foreground">
                  {data.availableFrom || "Vào ở ngay"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-foreground block">Mã quản lý bài đăng</span>
              <code className="text-[11px] text-muted-foreground font-mono">{data.id}</code>
            </div>
            <Link
              href={`/dashboard/properties/upsert?id=${data.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            >
              <Edit className="h-3.5 w-3.5" />
              Sửa tin
            </Link>
          </div>
        </div>
      </div>

      {/* 8 Full Detail Sections */}
      <div className="space-y-6 pt-2">
        {/* Section 1: Thông tin cơ bản */}
        <SectionCard stepNumber={1} title="Thông tin cơ bản">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <DetailItem label="Loại hình" value={CATEGORY_NAMES[data.category] || data.category} />
            <DetailItem label="Phân loại chi tiết" value={SUBTYPE_NAMES[data.subtype] || data.subtype} />
            <DetailItem
              label="Hình thức cho thuê"
              value={data.rentalMode === "WHOLE_UNIT" ? "Cho thuê toàn bộ" : "Cho thuê một phần"}
            />
            <DetailItem label="Ngày có thể vào ở" value={data.availableFrom} />
            <DetailItem label="Tổng diện tích" value={`${data.areaM2} m²`} />
            <DetailItem label="Trạng thái" value={data.status} />
            <DetailItem label="Thương lượng giá" value={data.pricing?.negotiable ? "Có thương lượng" : "Giá cố định"} />
            <DetailItem label="Mã tin đăng" value={data.id} />
          </div>
        </SectionCard>

        {/* Section 2: Chi tiết theo từng loại hình */}
        {data.apartmentDetail && (
          <SectionCard stepNumber={2} title="Thông tin chi tiết — Căn hộ / Chung cư">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DetailItem label="Tên dự án / Tòa nhà" value={data.apartmentDetail.projectName} highlight />
              <DetailItem label="Tòa / Block" value={data.apartmentDetail.buildingBlock} />
              <DetailItem label="Mã căn hộ" value={data.apartmentDetail.unitCode} />
              <DetailItem label="Tầng số" value={data.apartmentDetail.floorNumber} />
              <DetailItem label="Tổng số tầng của tòa" value={data.apartmentDetail.buildingTotalFloors} />
              <DetailItem label="Số phòng ngủ" value={data.apartmentDetail.bedroomCount} />
              <DetailItem label="Số nhà vệ sinh" value={data.apartmentDetail.bathroomCount} />
              <DetailItem label="Phòng khách" value={data.apartmentDetail.livingRoomCount} />
              <DetailItem label="Phòng bếp" value={data.apartmentDetail.kitchenCount} />
              <DetailItem label="Tình trạng nội thất" value={data.apartmentDetail.furnishingStatus} />
              <DetailItem label="Hướng cửa chính" value={data.apartmentDetail.mainDoorDirection} />
              <DetailItem label="Hướng ban công" value={data.apartmentDetail.balconyDirection} />
              <DetailItem label="Tầm nhìn (View)" value={data.apartmentDetail.viewDescription} />
              <DetailItem label="Số người ở tối đa" value={data.apartmentDetail.maxOccupants ? `${data.apartmentDetail.maxOccupants} người` : undefined} />
              <DetailItem label="Tình trạng pháp lý" value={data.apartmentDetail.legalStatus} />
            </div>
          </SectionCard>
        )}

        {data.houseDetail && (
          <SectionCard stepNumber={2} title="Thông tin chi tiết — Nhà ở nguyên căn">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DetailItem label="Diện tích đất" value={data.houseDetail.landAreaM2 ? `${data.houseDetail.landAreaM2} m²` : undefined} />
              <DetailItem label="Chiều rộng mặt tiền" value={data.houseDetail.frontageWidthM ? `${data.houseDetail.frontageWidthM} m` : undefined} />
              <DetailItem label="Chiều dài nhà" value={data.houseDetail.lengthM ? `${data.houseDetail.lengthM} m` : undefined} />
              <DetailItem label="Độ rộng đường trước nhà" value={data.houseDetail.accessRoadWidthM ? `${data.houseDetail.accessRoadWidthM} m` : undefined} />
              <DetailItem label="Số mặt tiền" value={data.houseDetail.frontageCount} />
              <DetailItem label="Tổng số tầng" value={data.houseDetail.totalFloors} />
              <DetailItem label="Số phòng ngủ" value={data.houseDetail.bedroomCount} />
              <DetailItem label="Số nhà vệ sinh" value={data.houseDetail.bathroomCount} />
              <DetailItem label="Phòng khách" value={data.houseDetail.livingRoomCount} />
              <DetailItem label="Phòng bếp" value={data.houseDetail.kitchenCount} />
              <DetailItem label="Sân thượng" value={data.houseDetail.hasRooftop ? "Có sân thượng" : "Không có"} />
              <DetailItem label="Chỗ để ô tô / Gara" value={data.houseDetail.hasGarage ? "Có gara riêng" : "Không có"} />
              <DetailItem label="Lối đi" value={data.houseDetail.accessType} />
              <DetailItem label="Số người ở tối đa" value={data.houseDetail.maxOccupants ? `${data.houseDetail.maxOccupants} người` : undefined} />
              <DetailItem label="Số lượng xe tối đa" value={data.houseDetail.maxVehicles ? `${data.houseDetail.maxVehicles} xe` : undefined} />
              <DetailItem label="Tình trạng nội thất" value={data.houseDetail.furnishingStatus} />
              <DetailItem label="Tình trạng pháp lý" value={data.houseDetail.legalStatus} />
              {data.houseDetail.rentalScopeDescription && (
                <DetailItem label="Phạm vi cho thuê" value={data.houseDetail.rentalScopeDescription} />
              )}
            </div>
          </SectionCard>
        )}

        {data.officeDetail && (
          <SectionCard stepNumber={2} title="Thông tin chi tiết — Văn phòng">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DetailItem label="Tên tòa nhà văn phòng" value={data.officeDetail.buildingName} highlight />
              <DetailItem label="Hạng văn phòng" value={data.officeDetail.officeGrade ? `Hạng ${data.officeDetail.officeGrade}` : undefined} />
              <DetailItem label="Tầng đặt văn phòng" value={data.officeDetail.floorNumber} />
              <DetailItem label="Tình trạng bàn giao" value={data.officeDetail.handoverStatus} />
              <DetailItem label="Quy mô chỗ ngồi dự kiến" value={data.officeDetail.expectedSeats ? `${data.officeDetail.expectedSeats} chỗ` : undefined} />
              <DetailItem label="Diện tích tối thiểu chia nhỏ" value={data.officeDetail.minimumDivisibleAreaM2 ? `${data.officeDetail.minimumDivisibleAreaM2} m²` : undefined} />
              <DetailItem label="Số nhà vệ sinh" value={data.officeDetail.restroomCount} />
              <DetailItem label="Hệ thống vệ sinh" value={data.officeDetail.restroomType} />
              <DetailItem label="Khu vực Pantry" value={data.officeDetail.pantryType} />
              <DetailItem label="Chế độ hoạt động" value={data.officeDetail.operatingMode === "ALWAYS_OPEN" ? "24/7" : "Theo lịch tùy chỉnh"} />
              <DetailItem label="Chỗ đỗ ô tô" value={data.officeDetail.carParkingCapacity ? `${data.officeDetail.carParkingCapacity} ô tô` : undefined} />
              <DetailItem label="Chỗ đỗ xe máy" value={data.officeDetail.motorbikeParkingCapacity ? `${data.officeDetail.motorbikeParkingCapacity} xe máy` : undefined} />
            </div>

            {data.officeDetail.operatingHours && data.officeDetail.operatingHours.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Lịch hoạt động văn phòng chi tiết
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {data.officeDetail.operatingHours.map((h, i) => (
                    <div key={i} className="rounded-xl border border-border p-2.5 text-xs bg-muted/20">
                      <span className="font-semibold text-foreground block">{DAY_LABELS[h.dayOfWeek] || h.dayOfWeek}</span>
                      <span className="text-muted-foreground">{h.openTime} – {h.closeTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {data.commercialDetail && (
          <SectionCard stepNumber={2} title="Thông tin chi tiết — Mặt bằng kinh doanh">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DetailItem label="Vị trí mặt bằng" value={data.commercialDetail.positionType} />
              <DetailItem label="Chiều rộng mặt tiền" value={data.commercialDetail.frontageWidthM ? `${data.commercialDetail.frontageWidthM} m` : undefined} />
              <DetailItem label="Chiều sâu mặt bằng" value={data.commercialDetail.lengthM ? `${data.commercialDetail.lengthM} m` : undefined} />
              <DetailItem label="Độ rộng đường / vỉa hè" value={data.commercialDetail.roadWidthM ? `${data.commercialDetail.roadWidthM} m` : undefined} />
              <DetailItem label="Số mặt tiền" value={data.commercialDetail.frontageCount} />
              <DetailItem label="Số tầng cho thuê" value={data.commercialDetail.rentedFloorCount} />
              <DetailItem label="Gác lửng" value={data.commercialDetail.hasMezzanine ? "Có gác lửng" : "Không có"} />
              <DetailItem label="Số nhà vệ sinh" value={data.commercialDetail.restroomCount} />
              <DetailItem label="Lối đi" value={data.commercialDetail.accessType} />
              <DetailItem label="Chỗ đỗ xe" value={data.commercialDetail.parkingType} />
              <DetailItem label="Tình trạng bàn giao" value={data.commercialDetail.handoverStatus} />
              <DetailItem label="Điện 3 pha" value={data.commercialDetail.hasThreePhasePower ? "Có trang bị" : "Không có"} />
              <DetailItem label="PCCC tiêu chuẩn" value={data.commercialDetail.hasStandardFireSafety ? "Đã nghiệm thu đạt chuẩn" : "Chưa có"} />
              <DetailItem label="Giờ hoạt động" value={data.commercialDetail.operatingHoursDescription} />
              <DetailItem label="Ngành nghề hạn chế" value={data.commercialDetail.restrictedBusinesses} />
              <DetailItem label="Khu vực bốc dỡ hàng" value={data.commercialDetail.loadingAreaDescription} />
            </div>
          </SectionCard>
        )}

        {data.roomDetail && (
          <SectionCard stepNumber={2} title="Thông tin chi tiết — Nhà trọ / Phòng cho thuê">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DetailItem label="Mã phòng" value={data.roomDetail.roomCode} highlight />
              <DetailItem label="Tầng số" value={data.roomDetail.floorNumber} />
              <DetailItem label="Nhà vệ sinh" value={data.roomDetail.restroomType === "PRIVATE" ? "Khép kín riêng trong phòng" : "Dùng chung bên ngoài"} />
              <DetailItem label="Khu vực nấu ăn" value={data.roomDetail.kitchenType === "PRIVATE" ? "Khu bếp riêng trong phòng" : data.roomDetail.kitchenType === "SHARED" ? "Khu bếp chung" : "Không cho nấu ăn"} />
              <DetailItem label="Cửa sổ" value={data.roomDetail.hasWindow ? "Có cửa sổ thoáng" : "Không có"} />
              <DetailItem label="Ban công" value={data.roomDetail.hasBalcony ? "Có ban công riêng" : "Không có"} />
              <DetailItem label="Gác lửng" value={data.roomDetail.hasMezzanine ? "Có gác lửng" : "Không có"} />
              <DetailItem label="Tình trạng nội thất" value={data.roomDetail.furnishingStatus} />
              <DetailItem label="Lối đi" value={data.roomDetail.accessType === "PRIVATE" ? "Lối đi riêng biệt" : "Chung lối đi"} />
              <DetailItem label="Giờ giấc" value={data.roomDetail.accessHoursType === "FLEXIBLE" ? "Tự do 24/24 (không chung chủ)" : "Có quy định giờ giới nghiêm"} />
              <DetailItem label="Đồng hồ điện" value={data.roomDetail.electricMeterType === "PRIVATE" ? "Đồng hồ riêng" : "Dùng chung"} />
              <DetailItem label="Đồng hồ nước" value={data.roomDetail.waterMeterType === "PRIVATE" ? "Đồng hồ riêng" : "Dùng chung"} />
              <DetailItem label="Số người ở tối đa" value={data.roomDetail.maxOccupants ? `${data.roomDetail.maxOccupants} người` : undefined} />
              <DetailItem label="Số lượng xe tối đa" value={data.roomDetail.maxVehicles ? `${data.roomDetail.maxVehicles} xe` : undefined} />
              <DetailItem label="Chính sách gửi xe" value={data.roomDetail.parkingPolicy} />
            </div>
          </SectionCard>
        )}

        {/* Section 3: Tiện ích & Trang thiết bị */}
        <SectionCard stepNumber={3} title="Tiện ích & Trang thiết bị sẵn có">
          {data.amenities && data.amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.amenities.map((item) => (
                <span
                  key={item.code}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {item.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Chưa chọn tiện ích nào.</p>
          )}

          {data.customAmenities && data.customAmenities.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Tiện ích bổ sung khác
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.customAmenities.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs"
                  >
                    • {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.furnishings && data.furnishings.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Nội thất & Trang thiết bị đi kèm
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.furnishings.map((f) => (
                  <span
                    key={f.code}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs"
                  >
                    <CheckCircle className="h-3 w-3 text-primary" />
                    {f.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Section 4: Chi phí hàng tháng */}
        <SectionCard stepNumber={4} title="Chi phí hàng tháng">
          {data.charges && data.charges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.charges.map((c, i) => {
                const chargeTitle =
                  c.chargeType === "ELECTRICITY"
                    ? "Tiền điện"
                    : c.chargeType === "WATER"
                    ? "Tiền nước"
                    : c.chargeType === "MANAGEMENT"
                    ? "Phí quản lý tòa nhà"
                    : c.chargeType === "INTERNET"
                    ? "Internet / WiFi"
                    : c.chargeType === "SERVICE_OR_GARBAGE"
                    ? "Phí vệ sinh / Rác"
                    : c.chargeType === "MOTORBIKE_PARKING"
                    ? "Phí gửi xe máy"
                    : c.chargeType === "CAR_PARKING"
                    ? "Phí gửi ô tô"
                    : c.chargeType === "OVERTIME_AIR_CONDITIONING"
                    ? "Phí điều hòa ngoài giờ"
                    : c.customName || "Chi phí khác";

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs"
                  >
                    <span className="font-medium text-foreground">{chargeTitle}</span>
                    <span className="font-bold text-primary text-sm">
                      {c.includedInRent
                        ? "Đã bao gồm"
                        : c.amount != null
                        ? `${formatCurrency(Number(c.amount))} ₫ ${c.unit ? `/${c.unit}` : ""}`
                        : "Thỏa thuận"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Chưa có thông tin chi phí riêng.</p>
          )}
        </SectionCard>

        {/* Section 5: Giá thuê & Điều kiện hợp đồng */}
        <SectionCard stepNumber={5} title="Giá thuê & Điều kiện hợp đồng">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <DetailItem
              label="Giá cho thuê"
              value={`${formatCurrency(Number(data.pricing?.amount || 0))} ₫`}
              highlight
            />
            <DetailItem label="Đơn vị tính giá" value={data.pricing?.unit} />
            <DetailItem
              label="Thương lượng giá"
              value={data.pricing?.negotiable ? "Có thể thương lượng" : "Không thương lượng"}
            />
            <DetailItem
              label="Hình thức đặt cọc"
              value={
                data.pricing?.depositType === "FIXED_AMOUNT"
                  ? "Đặt cọc số tiền cố định"
                  : data.pricing?.depositType === "MONTH_COUNT"
                  ? "Đặt cọc theo số tháng thuê"
                  : data.pricing?.depositType === "NONE"
                  ? "Không yêu cầu cọc"
                  : "Thương lượng"
              }
            />
            <DetailItem
              label="Số tiền / Tháng cọc"
              value={
                data.pricing?.depositAmount
                  ? `${formatCurrency(Number(data.pricing.depositAmount))} ₫`
                  : data.pricing?.depositMonths
                  ? `${data.pricing.depositMonths} tháng tiền thuê`
                  : undefined
              }
            />
            <DetailItem label="Chu kỳ thanh toán" value={data.pricing?.paymentCycle} />
            <DetailItem
              label="Thời hạn hợp đồng tối thiểu"
              value={data.pricing?.minimumLeaseMonths ? `${data.pricing.minimumLeaseMonths} tháng` : undefined}
            />
            <DetailItem
              label="Bao gồm phí quản lý"
              value={data.pricing?.managementFeeIncluded ? "Đã bao gồm" : "Chưa bao gồm"}
            />
            <DetailItem
              label="Bao gồm VAT"
              value={data.pricing?.vatIncluded ? "Đã bao gồm VAT" : "Chưa bao gồm VAT"}
            />
          </div>
        </SectionCard>

        {/* Section 6: Địa chỉ & Vị trí */}
        <SectionCard stepNumber={6} title="Địa chỉ & Vị trí">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DetailItem label="Tỉnh / Thành phố" value={data.address?.provinceName} />
            <DetailItem label="Phường / Xã" value={data.address?.wardName} />
            <DetailItem label="Số nhà, tên đường" value={data.address?.streetLine} />
          </div>
          <div className="pt-1">
            <DetailItem
              label="Địa chỉ đầy đủ hiển thị cho người thuê"
              value={data.address?.fullAddress || [data.address?.streetLine, data.address?.wardName, data.address?.provinceName].filter(Boolean).join(", ")}
              highlight
            />
          </div>

          {/* Bản đồ định vị Google Maps giống Upsert */}
          {(data.address?.fullAddress || data.address?.streetLine) && (
            <div className="pt-3 border-t border-border/60">
              <AddressMapPreview
                fullAddress={
                  data.address?.fullAddress ||
                  [data.address?.streetLine, data.address?.wardName, data.address?.provinceName]
                    .filter(Boolean)
                    .join(", ")
                }
              />
            </div>
          )}
        </SectionCard>

        {/* Section 7: Lịch xem nhà */}
        <SectionCard stepNumber={7} title="Lịch sẵn sàng tiếp khách xem nhà">
          <div className="space-y-3">
            {data.viewingDays && data.viewingDays.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Ngày trong tuần tiếp khách:</span>
                <div className="flex flex-wrap gap-2">
                  {data.viewingDays.map((day) => (
                    <span
                      key={day}
                      className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground shadow-2xs"
                    >
                      {DAY_LABELS[day] || day}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Chưa thiết lập ngày tiếp khách.</p>
            )}

            {data.viewingSlots && data.viewingSlots.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-muted-foreground">Khung giờ / Buổi tiếp khách:</span>
                <div className="flex flex-wrap gap-2">
                  {data.viewingSlots.map((slot) => (
                    <span
                      key={slot}
                      className="rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary"
                    >
                      {SLOT_LABELS[slot] || slot}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Section 8: Mô tả chi tiết */}
        <SectionCard stepNumber={8} title="Mô tả chi tiết bài đăng">
          <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5 text-sm text-foreground leading-relaxed whitespace-pre-line">
            {data.description || "Chưa có mô tả chi tiết."}
          </div>
        </SectionCard>
      </div>

      {/* Bottom Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted shadow-2xs transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách tin
        </Link>
        <Link
          href={`/dashboard/properties/upsert?id=${data.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa tin đăng này
        </Link>
      </div>
    </div>
  );
}

export default function PropertyDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium">Đang tải...</p>
        </div>
      }
    >
      <PropertyDetailPageContent />
    </Suspense>
  );
}
