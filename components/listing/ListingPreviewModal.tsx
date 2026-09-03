"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  Home,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  BedDouble,
  Bath,
  Layers,
  Compass,
  Maximize2,
  Building2,
  Sparkles,
  Sofa,
  CreditCard,
  Phone,
  Mail,
  User,
  PawPrint,
  Utensils,
  FileText,
  AlertTriangle,
  Loader2,
  Eye,
  Check,
  Zap,
  Info,
  Car,
  Flame,
} from "lucide-react";
import listingService from "@/services/listing.service";
import { LISTING_STATUS_CONFIG } from "@/config/listing-status.config";
import MediaGallery, { type MediaGalleryItem } from "@/components/common/MediaGallery";
import type {
  ListingDetailResponse,
  ListingCategory,
  ListingSubtype,
  RentalMode,
  DayOfWeek,
  ViewingSlot,
  ChargeType,
  BillingMethod,
  FurnishingStatus,
} from "@/types/listing.type";

interface ListingPreviewModalProps {
  listingId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatVND = (amount?: number | null) => {
  if (amount == null) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  APARTMENT: "Căn hộ / Chung cư",
  HOUSE: "Nhà riêng / Nhà nguyên căn",
  OFFICE: "Văn phòng",
  COMMERCIAL_SPACE: "Mặt bằng kinh doanh",
  ROOM: "Phòng trọ / Căn hộ mini",
};

const SUBTYPE_LABELS: Record<string, string> = {
  APARTMENT_STANDARD: "Chung cư tiêu chuẩn",
  APARTMENT_MINI: "Chung cư mini",
  APARTMENT_STUDIO: "Studio",
  APARTMENT_OFFICETEL: "Officetel",
  APARTMENT_SERVICED: "Căn hộ dịch vụ",
  APARTMENT_PENTHOUSE: "Penthouse / Duplex",
  HOUSE_TOWNHOUSE: "Nhà phố liền kề",
  HOUSE_VILLA: "Biệt thự",
  HOUSE_ALLEY: "Nhà trong ngõ / hẻm",
  HOUSE_CORNER: "Nhà góc 2 mặt tiền",
  OFFICE_TRADITIONAL: "Văn phòng truyền thống",
  OFFICE_COWORKING: "Coworking Space",
  OFFICE_SHARED: "Văn phòng chia sẻ",
  COMMERCIAL_STREET_FRONT: "Mặt bằng mặt phố",
  COMMERCIAL_MALL: "Gian hàng TTTM",
  COMMERCIAL_KIOSK: "Kiot / Chợ",
  ROOM_BOARDING: "Phòng trọ khép kín",
  ROOM_HOMESTAY: "Homestay / Co-living",
  ROOM_MEZZANINE: "Phòng có gác lửng",
};

const RENTAL_MODE_LABELS: Record<RentalMode, string> = {
  WHOLE_UNIT: "Thuê nguyên căn / Toàn bộ diện tích",
  PARTIAL: "Thuê một phần / Phòng riêng",
};

const DIRECTION_LABELS: Record<string, string> = {
  NORTH: "Hướng Bắc",
  SOUTH: "Hướng Nam",
  EAST: "Hướng Đông",
  WEST: "Hướng Tây",
  NORTHEAST: "Đông Bắc",
  NORTHWEST: "Tây Bắc",
  SOUTHEAST: "Đông Nam",
  SOUTHWEST: "Tây Nam",
};

const FURNISHING_LABELS: Record<FurnishingStatus, string> = {
  UNFURNISHED: "Nhà trống (Không nội thất)",
  BASIC: "Nội thất cơ bản (Đèn, quạt, vệ sinh)",
  PARTIALLY_FURNISHED: "Nội thất một phần",
  FULLY_FURNISHED: "Đầy đủ nội thất cao cấp (Full đồ)",
};

const PAYMENT_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "Hàng tháng (1 tháng / lần)",
  EVERY_2_MONTHS: "2 tháng / lần",
  QUARTERLY: "Theo quý (3 tháng / lần)",
  EVERY_6_MONTHS: "6 tháng / lần",
  NEGOTIABLE: "Thỏa thuận linh hoạt",
};

const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  ELECTRICITY: "Tiền điện",
  WATER: "Tiền nước",
  MANAGEMENT: "Phí quản lý",
  INTERNET: "Internet / Wifi",
  SERVICE_OR_GARBAGE: "Dịch vụ & Vệ sinh",
  MOTORBIKE_PARKING: "Gửi xe máy",
  CAR_PARKING: "Gửi ô tô",
  OVERTIME_AIR_CONDITIONING: "Điều hòa ngoài giờ",
  OTHER: "Chi phí khác",
};

const BILLING_METHOD_LABELS: Record<BillingMethod, string> = {
  PER_KWH: "Theo số điện (kWh)",
  STATE_WATER_RATE: "Theo giá nhà nước",
  PER_M3: "Theo khối nước (m³)",
  PER_PERSON_MONTH: "Người / tháng",
  PER_MONTH: "Tháng cố định",
  PER_M2_MONTH: "m² / tháng",
  PER_VEHICLE_MONTH: "Xe / tháng",
  PER_HOUR: "Giờ",
  FREE: "Miễn phí",
  INCLUDED: "Đã gồm trong tiền thuê",
  NOT_APPLICABLE: "Không áp dụng",
  NEGOTIABLE: "Thỏa thuận",
  CUSTOM: "Tùy chỉnh",
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

const SLOT_LABELS: Record<ViewingSlot, string> = {
  MORNING: "Buổi sáng (08:00 – 12:00)",
  AFTERNOON: "Buổi chiều (13:00 – 17:00)",
  EVENING: "Buổi tối (18:00 – 21:00)",
};

export default function ListingPreviewModal({
  listingId,
  isOpen,
  onClose,
}: ListingPreviewModalProps) {
  const [listing, setListing] = useState<ListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !listingId) {
      setListing(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Thử lấy qua authenticated endpoint trước (nếu là chủ sở hữu hoặc có quyền)
    // Nếu không được, fallback sang public endpoint (hỗ trợ cả RESERVED và PUBLISHED)
    listingService
      .getMyListingById(listingId)
      .then((data) => {
        if (isMounted) setListing(data);
      })
      .catch(() => {
        return listingService.getById(listingId).then((data) => {
          if (isMounted) setListing(data);
        });
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error("Failed to fetch listing detail for preview:", err);
          setError(
            err?.response?.data?.message ||
              "Không thể tải thông tin bài đăng. Vui lòng thử lại sau."
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, listingId]);

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statusConfig = listing?.status ? LISTING_STATUS_CONFIG[listing.status] : null;

  // Chuẩn hóa danh sách media cho MediaGallery
  const mediaItems: MediaGalleryItem[] = (listing?.media || [])
    .filter((m) => Boolean(m.url))
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => ({
      id: m.storageObjectId || m.id,
      url: m.url as string,
      type: m.mediaType === "VIDEO" ? "video" : "image",
      alt: listing?.title || "Hình ảnh bài đăng",
    }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                  Chi tiết bài đăng xem trước
                </h3>
                {statusConfig && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClassName}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClassName}`} />
                    {statusConfig.label}
                  </span>
                )}
                {listing?.category && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                    {CATEGORY_LABELS[listing.category] || listing.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Mã bài đăng: <span className="font-mono">{listingId}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading && (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Đang tải đầy đủ thông tin bài đăng...</p>
            </div>
          )}

          {error && (
            <div className="p-8 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <h4 className="font-bold text-destructive text-base">Không thể hiển thị bài đăng</h4>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  listingService
                    .getMyListingById(listingId!)
                    .then(setListing)
                    .catch(() => listingService.getById(listingId!).then(setListing))
                    .catch((err) => setError(err?.message || "Lỗi tải bài"))
                    .finally(() => setLoading(false));
                }}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Thử tải lại
              </button>
            </div>
          )}

          {listing && !loading && (
            <>
              {/* 1. KHỐI MEDIA HÌNH ẢNH / VIDEO */}
              {mediaItems.length > 0 ? (
                <div className="rounded-2xl overflow-hidden border border-border">
                  <MediaGallery
                    title={listing.title}
                    mediaItems={mediaItems}
                    categoryLabel={CATEGORY_LABELS[listing.category]}
                  />
                </div>
              ) : (
                <div className="w-full h-48 rounded-2xl bg-muted/40 border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Home className="w-8 h-8 opacity-40" />
                  <p className="text-xs">Bài đăng chưa có hình ảnh hoặc video đính kèm</p>
                </div>
              )}

              {/* 2. TIÊU ĐỀ, ĐỊA CHỈ & THỜI GIAN */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  {listing.subtype && (
                    <span className="font-semibold text-primary">
                      {SUBTYPE_LABELS[listing.subtype] || listing.subtype}
                    </span>
                  )}
                  {listing.rentalMode && (
                    <>
                      <span>•</span>
                      <span>{RENTAL_MODE_LABELS[listing.rentalMode] || listing.rentalMode}</span>
                    </>
                  )}
                  {listing.areaM2 && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-foreground">{listing.areaM2} m²</span>
                    </>
                  )}
                  {listing.viewCount != null && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {listing.viewCount} lượt xem
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                  {listing.title}
                </h2>

                {listing.address?.fullAddress && (
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground pt-1">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{listing.address.fullAddress}</span>
                  </div>
                )}
              </div>

              {/* 3. KHỐI TÀI CHÍNH & ĐIỀU KIỆN THUÊ (CARD HIGHLIGHT) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Giá thuê */}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Giá thuê hàng tháng
                  </p>
                  <p className="text-xl font-black text-primary">
                    {formatVND(listing.pricing?.amount)}
                    <span className="text-xs font-normal text-muted-foreground">/tháng</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {listing.pricing?.negotiable ? "✓ Có thể thương lượng" : "• Giá cố định"}
                  </p>
                </div>

                {/* Tiền cọc */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tiền cọc quy định
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {listing.pricing?.depositType === "NONE" && "0 ₫ (Không cần cọc)"}
                    {listing.pricing?.depositType === "FIXED_AMOUNT" &&
                      formatVND(listing.pricing?.depositAmount)}
                    {listing.pricing?.depositType === "MONTH_COUNT" &&
                      `${listing.pricing?.depositMonths} tháng thuê (${formatVND(
                        (listing.pricing?.amount ?? 0) * (listing.pricing?.depositMonths ?? 1)
                      )})`}
                    {listing.pricing?.depositType === "NEGOTIABLE" && "Thỏa thuận với chủ nhà"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Hình thức: {listing.pricing?.depositType || "Chưa rõ"}
                  </p>
                </div>

                {/* Thời hạn thuê tối thiểu */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Thời hạn thuê tối thiểu
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {listing.pricing?.minimumLeaseMonths
                      ? `${listing.pricing.minimumLeaseMonths} tháng`
                      : "Không quy định"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Chu kỳ đóng tiền:{" "}
                    {PAYMENT_CYCLE_LABELS[listing.pricing?.paymentCycle] ||
                      listing.pricing?.paymentCycle ||
                      "Hàng tháng"}
                  </p>
                </div>

                {/* Ngày dọn vào */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Thời điểm vào ở
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {listing.availableFrom
                      ? new Date(listing.availableFrom).toLocaleDateString("vi-VN")
                      : "Dọn vào ngay"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {listing.pricing?.managementFeeIncluded
                      ? "Đã gồm phí quản lý"
                      : "Chưa gồm phí quản lý"}
                  </p>
                </div>
              </div>

              {/* 4. CHI TIẾT ĐẶC THÙ THEO DANH MỤC */}
              <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Thông số chi tiết bất động sản
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  {/* Diện tích */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-muted-foreground">Diện tích sử dụng</p>
                    <p className="font-bold text-foreground mt-0.5">{listing.areaM2} m²</p>
                  </div>

                  {/* CĂN HỘ (APARTMENT) */}
                  {listing.apartmentDetail && (
                    <>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Số phòng ngủ</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.apartmentDetail.bedroomCount} phòng
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Số phòng vệ sinh</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.apartmentDetail.bathroomCount} phòng
                        </p>
                      </div>
                      {listing.apartmentDetail.floorNumber != null && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Vị trí tầng</p>
                          <p className="font-bold text-foreground mt-0.5">
                            Tầng {listing.apartmentDetail.floorNumber}
                            {listing.apartmentDetail.buildingTotalFloors
                              ? ` / ${listing.apartmentDetail.buildingTotalFloors} tầng`
                              : ""}
                          </p>
                        </div>
                      )}
                      {listing.apartmentDetail.projectName && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Dự án / Tòa nhà</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.apartmentDetail.projectName}
                            {listing.apartmentDetail.buildingBlock ? ` - Tòa ${listing.apartmentDetail.buildingBlock}` : ""}
                          </p>
                        </div>
                      )}
                      {listing.apartmentDetail.mainDoorDirection && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Hướng cửa chính</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {DIRECTION_LABELS[listing.apartmentDetail.mainDoorDirection] ||
                              listing.apartmentDetail.mainDoorDirection}
                          </p>
                        </div>
                      )}
                      {listing.apartmentDetail.balconyDirection && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Hướng ban công</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {DIRECTION_LABELS[listing.apartmentDetail.balconyDirection] ||
                              listing.apartmentDetail.balconyDirection}
                          </p>
                        </div>
                      )}
                      {listing.apartmentDetail.furnishingStatus && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Tình trạng nội thất</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {FURNISHING_LABELS[listing.apartmentDetail.furnishingStatus] ||
                              listing.apartmentDetail.furnishingStatus}
                          </p>
                        </div>
                      )}
                      {listing.apartmentDetail.maxOccupants != null && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Số người ở tối đa</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.apartmentDetail.maxOccupants} người
                          </p>
                        </div>
                      )}
                      {listing.apartmentDetail.legalStatus && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Tình trạng pháp lý</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.apartmentDetail.legalStatus}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* NHÀ Ở (HOUSE) */}
                  {listing.houseDetail && (
                    <>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Số phòng ngủ</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.houseDetail.bedroomCount} phòng
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Số phòng vệ sinh</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.houseDetail.bathroomCount} phòng
                        </p>
                      </div>
                      {listing.houseDetail.totalFloors && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Tổng số tầng</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.houseDetail.totalFloors} tầng
                          </p>
                        </div>
                      )}
                      {listing.houseDetail.frontageWidthM && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Mặt tiền</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.houseDetail.frontageWidthM} m
                          </p>
                        </div>
                      )}
                      {listing.houseDetail.accessRoadWidthM && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Đường trước nhà</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.houseDetail.accessRoadWidthM} m
                          </p>
                        </div>
                      )}
                      {listing.houseDetail.landAreaM2 && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Diện tích đất</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.houseDetail.landAreaM2} m²
                          </p>
                        </div>
                      )}
                      {listing.houseDetail.furnishingStatus && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Nội thất bàn giao</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {FURNISHING_LABELS[listing.houseDetail.furnishingStatus] ||
                              listing.houseDetail.furnishingStatus}
                          </p>
                        </div>
                      )}
                      {listing.houseDetail.legalStatus && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Tình trạng pháp lý</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.houseDetail.legalStatus}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* VĂN PHÒNG (OFFICE) */}
                  {listing.officeDetail && (
                    <>
                      {listing.officeDetail.officeGrade && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Hạng văn phòng</p>
                          <p className="font-bold text-foreground mt-0.5">
                            Hạng {listing.officeDetail.officeGrade}
                          </p>
                        </div>
                      )}
                      {listing.officeDetail.floorNumber != null && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Vị trí tầng</p>
                          <p className="font-bold text-foreground mt-0.5">
                            Tầng {listing.officeDetail.floorNumber}
                          </p>
                        </div>
                      )}
                      {listing.officeDetail.buildingName && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Tòa nhà</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.officeDetail.buildingName}
                          </p>
                        </div>
                      )}
                      {listing.officeDetail.handoverStatus && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Bàn giao</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.officeDetail.handoverStatus}
                          </p>
                        </div>
                      )}
                      {listing.officeDetail.expectedSeats && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Chỗ ngồi dự kiến</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.officeDetail.expectedSeats} chỗ
                          </p>
                        </div>
                      )}
                      {listing.officeDetail.carParkingCapacity != null && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Chỗ đỗ ô tô</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.officeDetail.carParkingCapacity} chỗ
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* MẶT BẰNG THƯƠNG MẠI (COMMERCIAL) */}
                  {listing.commercialDetail && (
                    <>
                      {listing.commercialDetail.frontageWidthM && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Mặt tiền</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.commercialDetail.frontageWidthM} m
                          </p>
                        </div>
                      )}
                      {listing.commercialDetail.roadWidthM && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Đường trước mặt bằng</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.commercialDetail.roadWidthM} m
                          </p>
                        </div>
                      )}
                      {listing.commercialDetail.rentedFloorCount && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Số tầng cho thuê</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.commercialDetail.rentedFloorCount} tầng
                          </p>
                        </div>
                      )}
                      {listing.commercialDetail.positionType && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Vị trí mặt bằng</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.commercialDetail.positionType}
                          </p>
                        </div>
                      )}
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Điện 3 pha</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.commercialDetail.hasThreePhasePower ? "✓ Có" : "Không"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Tiêu chuẩn PCCC</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.commercialDetail.hasStandardFireSafety ? "✓ Đạt chuẩn" : "Chưa đạt"}
                        </p>
                      </div>
                    </>
                  )}

                  {/* PHÒNG TRỌ (ROOM) */}
                  {listing.roomDetail && (
                    <>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Phòng vệ sinh</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.roomDetail.restroomType === "PRIVATE" ? "✓ Khép kín (Riêng)" : "Chung bên ngoài"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Gác lửng</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.roomDetail.hasMezzanine ? "✓ Có gác lửng" : "Không có"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                        <p className="text-muted-foreground">Ban công / Cửa sổ</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {listing.roomDetail.hasBalcony ? "✓ Có ban công" : listing.roomDetail.hasWindow ? "✓ Có cửa sổ" : "Không có"}
                        </p>
                      </div>
                      {listing.roomDetail.maxOccupants && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Số người ở tối đa</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {listing.roomDetail.maxOccupants} người
                          </p>
                        </div>
                      )}
                      {listing.roomDetail.furnishingStatus && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <p className="text-muted-foreground">Nội thất phòng</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {FURNISHING_LABELS[listing.roomDetail.furnishingStatus] ||
                              listing.roomDetail.furnishingStatus}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 5. MÔ TẢ BÀI ĐĂNG */}
              <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Mô tả chi tiết từ chủ nhà
                </h4>
                <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-xl border border-border/50">
                  {listing.description || "Chưa có mô tả chi tiết cho bài đăng này."}
                </div>
              </div>

              {/* 6. TIỆN ÍCH & NỘI THẤT */}
              <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Tiện ích & Nội thất bàn giao
                </h4>

                {/* Tiện ích */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Tiện ích sẵn có:</p>
                  {listing.amenities && listing.amenities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {listing.amenities.map((item) => (
                        <span
                          key={item.code}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {item.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Không có tiện ích mặc định</p>
                  )}
                </div>

                {/* Tiện ích tùy chỉnh */}
                {listing.customAmenities && listing.customAmenities.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <p className="text-xs font-semibold text-muted-foreground">Tiện ích bổ sung khác:</p>
                    <div className="flex flex-wrap gap-2">
                      {listing.customAmenities.map((name, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nội thất */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sofa className="w-3.5 h-3.5 text-primary" />
                    Đồ dùng & Nội thất bàn giao:
                  </p>
                  {listing.furnishings && listing.furnishings.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {listing.furnishings.map((item) => (
                        <span
                          key={item.code}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-foreground text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {item.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Nhà trống, chưa có nội thất kèm theo
                    </p>
                  )}
                </div>
              </div>

              {/* 7. BẢNG PHỤ PHÍ & DỊCH VỤ (CHARGES) */}
              {listing.charges && listing.charges.length > 0 && (
                <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Chi phí dịch vụ & Phụ phí sinh hoạt
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="pb-2 font-semibold">Khoản phí</th>
                          <th className="pb-2 font-semibold">Hình thức tính</th>
                          <th className="pb-2 font-semibold">Đơn giá</th>
                          <th className="pb-2 font-semibold text-right">Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {listing.charges.map((charge, idx) => (
                          <tr key={idx} className="py-2.5">
                            <td className="py-2.5 font-medium text-foreground">
                              {CHARGE_TYPE_LABELS[charge.chargeType] || charge.chargeType}
                              {charge.customName && ` (${charge.customName})`}
                            </td>
                            <td className="py-2.5 text-muted-foreground">
                              {BILLING_METHOD_LABELS[charge.billingMethod] || charge.billingMethod}
                            </td>
                            <td className="py-2.5 font-semibold text-foreground">
                              {charge.amount != null ? `${formatVND(charge.amount)} ${charge.unit || ""}` : "—"}
                            </td>
                            <td className="py-2.5 text-right">
                              {charge.includedInRent ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                  Đã gồm trong tiền thuê
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
                                  Thu riêng theo thực tế
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 8. LỊCH XEM NHÀ & THÔNG TIN CHỦ NHÀ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Lịch xem nhà */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Thời gian nhận xem nhà
                  </h4>
                  {listing.viewingDays && listing.viewingDays.length > 0 ? (
                    <div className="space-y-1.5 text-xs">
                      <p className="text-foreground font-medium">
                        Ngày nhận xem:{" "}
                        <span className="text-muted-foreground">
                          {listing.viewingDays.map((d) => DAY_LABELS[d] || d).join(", ")}
                        </span>
                      </p>
                      {listing.viewingSlots && listing.viewingSlots.length > 0 && (
                        <p className="text-foreground font-medium">
                          Khung giờ:{" "}
                          <span className="text-muted-foreground">
                            {listing.viewingSlots.map((s) => SLOT_LABELS[s] || s).join(" • ")}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Liên hệ hẹn trước khi đến xem
                    </p>
                  )}
                </div>

                {/* Người đăng bài / Chủ nhà */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Thông tin liên hệ chủ tin
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden relative">
                      {listing.owner?.avatarUrl ? (
                        <Image
                          src={listing.owner.avatarUrl}
                          alt={listing.owner.displayName || "Chủ nhà"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        (listing.owner?.displayName?.[0] || "U").toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-foreground truncate">
                        {listing.owner?.displayName || "Chủ nhà HomeSpace"}
                      </p>
                      {listing.owner?.phone && (
                        <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {listing.owner.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="text-[11px] text-muted-foreground flex items-center gap-3">
            {listing?.createdAt && (
              <span>Đăng ngày: {new Date(listing.createdAt).toLocaleDateString("vi-VN")}</span>
            )}
            {listing?.publishedAt && (
              <span>Duyệt ngày: {new Date(listing.publishedAt).toLocaleDateString("vi-VN")}</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
