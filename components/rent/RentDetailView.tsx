"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldCheck,
  Video,
  Eye,
  Clock,
  Calendar,
  Home,
  User,
  Edit,
  Layers,
  Zap,
  Handshake,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import type { RentPropertyItem } from "@/types/rent.type";
import MediaGallery from "@/components/common/MediaGallery";
import UserAvatar from "@/components/common/UserAvatar";
import { getRentDetailSections } from "@/lib/rent-detail-sections";
import BookingAppointmentModal from "@/components/appointment/BookingAppointmentModal";
import appointmentService from "@/services/appointment.service";
import RentalRequestModal from "@/components/rental-request/RentalRequestModal";
import rentalRequestService from "@/services/rental-request.service";
import type { RentalRequestResponse } from "@/types/rental-request.type";

const formatPrice = (priceMillion: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(priceMillion * 1_000_000);

const VIEWING_DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

const VIEWING_SLOT_LABELS: Record<string, string> = {
  MORNING: "Buổi sáng (08:00–12:00)",
  AFTERNOON: "Buổi chiều (13:00–17:00)",
  EVENING: "Buổi tối (18:00–21:00)",
};

function inferProvinceCode(city: string) {
  return /hồ chí minh|ho chi minh|tp\.?\s*(hcm|hồ chí minh|ho chi minh)/i.test(city) ? "79" : "";
}

function formatLocationLabel(value: string) {
  return value.replace(/^(thành phố|tỉnh|tp\.?|p\.?|phường|xã)\s*/i, "").trim();
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DetailMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground truncate">{label}</p>
        <p className="font-heading text-base font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

export interface RentDetailViewProps {
  property: RentPropertyItem;
  topBar?: React.ReactNode;
  alertBanner?: React.ReactNode;
  sidebarActions?: React.ReactNode;
  showLandlordContact?: boolean;
}

export default function RentDetailView({
  property,
  topBar,
  alertBanner,
  sidebarActions,
  showLandlordContact = true,
}: RentDetailViewProps) {
  const provinceCode = property.provinceCode ?? inferProvinceCode(property.city);
  const provinceName = property.provinceName ?? property.city;
  const wardName = property.ward ?? property.district;
  const provinceLabel = formatLocationLabel(provinceName);
  const wardLabel = formatLocationLabel(wardName);
  const provinceHref = `/rent?provinceCode=${encodeURIComponent(provinceCode)}&provinceName=${encodeURIComponent(provinceName)}`;
  const wardHref = `${provinceHref}&ward=${encodeURIComponent(wardName)}`;

  const { profile, authenticated, login } = useAuth();
  const currentUserId = profile?.id;
  const isOwner =
    authenticated &&
    Boolean(
      currentUserId &&
        (currentUserId === property.ownerId || currentUserId === property.landlord?.id)
    );

  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [quickMessage, setQuickMessage] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [activeRentalRequest, setActiveRentalRequest] = useState<RentalRequestResponse | null>(null);

  React.useEffect(() => {
    if (authenticated && property?.id) {
      appointmentService.getMyBookingByListing(property.id).then((b) => {
        setHasActiveBooking(Boolean(b && ["PENDING", "CONFIRMED"].includes(b.status)));
      }).catch(() => {});

      rentalRequestService.getMyRequestByListing(property.id).then((r) => {
        setActiveRentalRequest(r);
      }).catch(() => {});
    }
  }, [authenticated, property?.id]);

  const rawPhone = property.landlord.phone || "0999999999";
  const cleanPhone = rawPhone.replace(/\s+/g, "");

  // Che vài ký tự số điện thoại bằng dấu sao (vd: 0999 *** 999)
  const formatPhoneMasked = (phone: string) => {
    const c = phone.replace(/\s+/g, "");
    if (c.length === 10) {
      return `${c.slice(0, 4)} *** ${c.slice(7)}`;
    }
    if (c.length > 6) {
      return `${c.slice(0, 4)} *** ${c.slice(-2)}`;
    }
    return `${c}***`;
  };

  // Hiển thị số điện thoại đầy đủ cách khoảng dễ đọc (vd: 0999 999 999)
  const formatPhoneFull = (phone: string) => {
    const c = phone.replace(/\s+/g, "");
    if (c.length === 10) {
      return `${c.slice(0, 4)} ${c.slice(4, 7)} ${c.slice(7)}`;
    }
    return c;
  };

  const QUICK_SUGGESTIONS = [
    "Nhà này còn không?",
    "Thời hạn thuê tối thiểu?",
    "Giá thuê có thương lượng được không?",
    "Khi nào có thể xem nhà?",
  ];

  const handleSendQuickMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickMessage.trim()) return;
    toast.success(`Đã gửi tin nhắn đến ${property.landlord.name}: "${quickMessage.trim()}"`);
    setQuickMessage("");
  };

  const highlights = [
    { icon: Building2, label: property.categoryLabel },
    { icon: Camera, label: `${property.photosCount} ảnh thực tế` },
    property.hasVideo
      ? { icon: Video, label: "Có video tham quan" }
      : { icon: ImageIcon, label: "Xem thư viện hình ảnh" },
  ];

  const detailSections = getRentDetailSections(property);
  const showBedroomMetric = ["apartment", "house", "villa"].includes(property.category);
  const amenities = [
    ...(Array.isArray(property.details?.amenities) ? property.details.amenities : []),
    ...(Array.isArray(property.details?.customAmenities) ? property.details.customAmenities : []),
  ].filter((item): item is string => typeof item === "string");
  const roomFeatures = (
    Array.isArray(property.details?.furnishings)
      ? property.details.furnishings
      : Array.isArray(property.details?.roomFeatures)
      ? property.details.roomFeatures
      : []
  ).filter((item): item is string => typeof item === "string");

  const viewingDays = Array.isArray(property.details?.viewingDays)
    ? property.details.viewingDays
    : [];
  const viewingSlots = Array.isArray(property.details?.viewingSlots)
    ? property.details.viewingSlots
    : [];

  const contactButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-muted";

  return (
    <div className="space-y-6">
      {/* Optional Top Bar (e.g. Breadcrumbs + Status + Dashboard Actions) */}
      {topBar}

      {/* Optional Alert Banner (e.g. Rejection reason, status reason) */}
      {alertBanner}

      {/* Media Gallery (Adaptive non-blank grid + Lightbox + S3 Private Video) */}
      <MediaGallery
        title={property.title}
        mediaItems={
          property.mediaItems && property.mediaItems.length > 0
            ? property.mediaItems
            : property.images.map((img) => ({ type: "image", url: img }))
        }
        categoryLabel={property.categoryLabel}
      />

      {/* Main Details & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Property Specs & Details */}
        <div className="lg:col-span-2 space-y-10">
          <section>
            {property.hasVideo && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-ai/10 px-2.5 py-1 text-[11px] font-bold text-accent-ai">
                  <Video className="w-3.5 h-3.5" />
                  Có video tham quan
                </span>
              </div>
            )}

            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              {property.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed break-words">{property.location}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs">
                <span className="flex items-center gap-1 font-medium text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                  {property.timeAgo}
                </span>
                <span className="flex items-center gap-1 font-semibold text-foreground/80">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  {property.viewCount ?? property.viewsCount ?? 0} lượt xem
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-card">
              <DetailMetric icon={BedDouble} label="Giá thuê" value={`${formatPrice(property.priceMillion)}/th`} />
              <DetailMetric icon={Bath} label="Diện tích" value={`${property.areaM2} m²`} />
              {showBedroomMetric ? (
                <DetailMetric icon={BedDouble} label="Phòng ngủ" value={`${property.beds} PN`} />
              ) : property.category === "office" && property.details?.expectedSeats != null ? (
                <DetailMetric icon={Building2} label="Chỗ ngồi" value={`${property.details.expectedSeats} chỗ`} />
              ) : property.category === "commercial" && property.details?.frontageWidthM != null ? (
                <DetailMetric icon={Building2} label="Mặt tiền" value={`${property.details.frontageWidthM} m`} />
              ) : property.category === "room" && property.details?.maxOccupants != null ? (
                <DetailMetric icon={Building2} label="Tối đa" value={`${property.details.maxOccupants} người`} />
              ) : (
                <DetailMetric icon={Building2} label="Loại hình" value={property.categoryLabel} />
              )}
              <DetailMetric
                icon={Bath}
                label="Phòng tắm / WC"
                value={`${
                  property.baths ||
                  (property.details?.bathroomCount as number) ||
                  (property.details?.restroomCount as number) ||
                  (property.details?.restroomType === "PRIVATE" ? "Khép kín" : property.details?.restroomType === "SHARED" ? "Chung" : 1)
                } WC`}
              />
            </div>
          </section>

          {/* Highlights */}
          <section className="space-y-4">
            <h2 className="font-heading text-lg font-bold">Điểm nổi bật</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/20 text-xs font-semibold">
                  <h.icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{h.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Categorized Detail Sections */}
          {detailSections.map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="font-heading text-lg font-bold">{section.title}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {section.items.map((item, itemIdx) => (
                  <DetailValue key={itemIdx} label={item.label} value={item.value} />
                ))}
              </div>
            </section>
          ))}

          {/* Amenities */}
          {amenities.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold">Tiện ích tòa nhà & dịch vụ</h2>
              <div className="flex flex-wrap gap-2">
                {amenities.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Room Furnishings */}
          {roomFeatures.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold">Trang bị sẵn có</h2>
              <div className="flex flex-wrap gap-2">
                {roomFeatures.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Viewing Schedule */}
          {(viewingDays.length > 0 || viewingSlots.length > 0) && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold">Lịch hẹn xem nhà</h2>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs">
                {viewingDays.length > 0 && (
                  <div>
                    <span className="font-semibold text-muted-foreground block mb-1.5">Ngày tiếp khách trong tuần:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingDays.map((d) => (
                        <span key={d} className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 font-semibold text-foreground">
                          {VIEWING_DAY_LABELS[d] || d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {viewingSlots.length > 0 && (
                  <div>
                    <span className="font-semibold text-muted-foreground block mb-1.5">Khung giờ tiếp khách:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingSlots.map((s) => (
                        <span key={s} className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                          {VIEWING_SLOT_LABELS[s] || s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Description */}
          {property.description && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold">Mô tả chi tiết</h2>
              <div className="rounded-xl border border-border bg-muted/20 p-5 text-sm text-foreground leading-relaxed whitespace-pre-line">
                {property.description}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Landlord Card & Action Sidebar */}
        <aside className="space-y-4">
          {isOwner || !showLandlordContact ? (
            /* Khi là bài đăng của bản thân: Bỏ card liên hệ (ảnh 2), hiện thông tin chính chủ & nút quản lý */
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs space-y-4 sticky top-28">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <UserAvatar
                    src={property.landlord.avatar}
                    name={property.landlord.name}
                    sizeClassName="w-12 h-12 text-base font-bold"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-foreground truncate">
                    {property.landlord.name}
                  </p>
                  <p className="text-xs font-semibold text-primary">Chính chủ (Bài đăng của bạn)</p>
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-3.5 text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">Bạn đang xem bài đăng của chính mình</p>
                <p className="text-[11px] leading-relaxed">
                  Các nút liên hệ, đặt lịch xem nhà sẽ tự động ẩn với bạn và chỉ hiển thị đối với khách tìm thuê.
                </p>
              </div>

              {sidebarActions}

              <div className="pt-2 space-y-2">
                <Link
                  href={`/dashboard/properties/new?id=${property.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  <Edit className="w-4 h-4" />
                  <span>Chỉnh sửa bài đăng</span>
                </Link>
                <Link
                  href="/dashboard/properties"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-xs font-bold text-foreground hover:bg-muted transition-all active:scale-[0.98]"
                >
                  <Layers className="w-4 h-4" />
                  <span>Quản lý tin đăng</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Khi là bài đăng của người khác: Hiển thị 2 card theo đúng Ảnh 3 nâng cấp từ Ảnh 1 */
            <div className="space-y-4 sticky top-24">
              {/* Card 1: Bạn quan tâm đến căn này? */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Bạn quan tâm đến căn này?
                </h3>

                {/* 1. Nút Yêu cầu thuê nhà (Hành động chính - Nổi bật nhất) */}
                {activeRentalRequest?.status === "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.info("Yêu cầu thuê nhà của bạn đang chờ chủ nhà xác nhận.");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 py-3.5 px-4 text-sm font-bold text-amber-700 dark:text-amber-300 shadow-xs hover:bg-amber-500/20 transition-all cursor-pointer active:scale-[0.98]"
                    title="Yêu cầu thuê nhà đang chờ duyệt"
                  >
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>Đã gửi yêu cầu thuê (Chờ duyệt)</span>
                  </button>
                ) : activeRentalRequest?.status === "ACCEPTED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.success("Yêu cầu thuê đã được duyệt và bất động sản đang được giữ chỗ trong 24 giờ!");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 py-3.5 px-4 text-sm font-bold text-emerald-700 dark:text-emerald-300 shadow-xs hover:bg-emerald-500/20 transition-all cursor-pointer active:scale-[0.98]"
                    title="Yêu cầu thuê đã được chấp thuận"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Yêu cầu được duyệt (Đang giữ chỗ)</span>
                  </button>
                ) : property.status === "RESERVED" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted py-3.5 px-4 text-sm font-bold text-muted-foreground border border-border/50 cursor-not-allowed opacity-80"
                    title="Bất động sản này đang được giữ chỗ trong 24 giờ cho một khách thuê khác"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Đang giữ chỗ (Tạm khóa)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isOwner) {
                        toast.info("Bạn là chủ bài đăng này, không thể tự gửi yêu cầu thuê.");
                        return;
                      }
                      if (!authenticated) {
                        toast.error("Vui lòng đăng nhập để gửi yêu cầu thuê nhà");
                        login();
                        return;
                      }
                      setIsRentalModalOpen(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 px-4 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer active:scale-[0.98]"
                    title="Gửi yêu cầu thuê nhà trực tiếp tới chủ nhà"
                  >
                    <Home className="w-4 h-4" />
                    <span>Yêu cầu thuê nhà</span>
                  </button>
                )}

                {/* 2. Hàng 2 nút phụ: Đặt lịch xem & Thương lượng hợp đồng */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isOwner) {
                        toast.info("Bạn là chủ bài đăng này, không thể tự đặt lịch xem nhà.");
                        return;
                      }
                      if (!authenticated) {
                        toast.error("Vui lòng đăng nhập để đặt lịch xem nhà");
                        login();
                        return;
                      }
                      setIsBookingModalOpen(true);
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.98] ${
                      hasActiveBooking
                        ? "bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        : "border border-border bg-card hover:bg-muted text-foreground hover:border-primary/40"
                    }`}
                    title="Đặt lịch hẹn gặp trực tiếp chủ nhà tại bất động sản"
                  >
                    {hasActiveBooking ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">Lịch xem của bạn</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">Đặt lịch xem</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toast.info("Tính năng Thương lượng đang được kết nối!")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground py-2.5 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.98] hover:border-primary/40"
                    title="Đề xuất giá thuê, tiền cọc hoặc các điều khoản mong muốn"
                  >
                    <Handshake className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">Thương lượng</span>
                  </button>
                </div>

                {/* 3. Hàng 2 nút liên hệ: Gọi điện & Chat */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <a
                    href={`tel:${cleanPhone}`}
                    onClick={() => setPhoneRevealed(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 px-3 text-xs font-semibold text-primary hover:bg-muted/60 transition-all cursor-pointer"
                    title={`Gọi điện đến ${cleanPhone}`}
                  >
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span>{phoneRevealed ? formatPhoneFull(rawPhone) : "Gọi điện"}</span>
                  </a>
                  <Link
                    href="/chat"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 px-3 text-xs font-semibold text-foreground hover:bg-muted/60 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Chat</span>
                  </Link>
                </div>
              </div>

              {/* Card 2: Thẻ thông tin chủ nhà & Liên hệ nhanh */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                {/* Profile Header */}
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <UserAvatar
                      src={property.landlord.avatar}
                      name={property.landlord.name}
                      sizeClassName="w-14 h-14 text-lg font-bold shadow-xs"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-base text-foreground truncate">
                      {property.landlord.name}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span>{property.landlord.role || "Cá nhân"}</span>
                    </p>
                  </div>
                </div>

                {/* Green Reveal Phone Button - click mở liên kết tel: và hiện số đầy đủ */}
                <a
                  href={`tel:${cleanPhone}`}
                  onClick={() => {
                    if (!phoneRevealed) {
                      setPhoneRevealed(true);
                      toast.success(`Số điện thoại: ${formatPhoneFull(rawPhone)} (Đang kết nối cuộc gọi...)`);
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00ba51] hover:bg-[#00a848] py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  title={`Gọi điện đến ${cleanPhone}`}
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {phoneRevealed
                      ? `Gọi ngay: ${formatPhoneFull(rawPhone)}`
                      : `Gọi ngay: ${formatPhoneMasked(rawPhone)}`}
                  </span>
                </a>

                {/* Quick Chat Input Box */}
                <form onSubmit={handleSendQuickMessage} className="space-y-2">
                  <div className="relative flex items-center rounded-xl border border-border bg-muted/30 px-3 py-1.5 focus-within:border-primary focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={quickMessage}
                      onChange={(e) => setQuickMessage(e.target.value)}
                      placeholder="Nhắn hỏi thông tin"
                      className="w-full bg-transparent px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!quickMessage.trim()}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        quickMessage.trim()
                          ? "bg-primary text-primary-foreground shadow-2xs cursor-pointer hover:bg-primary/90"
                          : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                      }`}
                    >
                      Gửi
                    </button>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                    {QUICK_SUGGESTIONS.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setQuickMessage(sug)}
                        className="px-2.5 py-1 rounded-full border border-border bg-muted/20 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all whitespace-nowrap cursor-pointer shrink-0"
                      >
                        {sug}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const random =
                          QUICK_SUGGESTIONS[
                            Math.floor(Math.random() * QUICK_SUGGESTIONS.length)
                          ];
                        setQuickMessage(random);
                      }}
                      className="p-1 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      title="Gợi ý khác"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                {/* Trust & Safety notes */}
                <div className="pt-3 border-t border-border space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                    <span>Thông tin chủ nhà và điều khoản thuê cần được xác nhận trước khi đặt cọc.</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                    <span>Ưu tiên trao đổi trực tiếp qua kênh liên hệ chính thức của HomeSpace.</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modal Đặt lịch xem nhà */}
      <BookingAppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          if (authenticated && property?.id) {
            appointmentService.getMyBookingByListing(property.id).then((b) => {
              setHasActiveBooking(Boolean(b && ["PENDING", "CONFIRMED"].includes(b.status)));
            }).catch(() => {});
          }
        }}
        listingId={property.id}
        listingTitle={property.title}
        listingAddress={property.location}
        listingPrice={property.priceMillion * 1_000_000}
        listingThumbnail={property.images?.[0] || null}
        ownerId={property.ownerId || property.landlord?.id}
      />

      {/* Modal Gửi yêu cầu thuê nhà */}
      <RentalRequestModal
        isOpen={isRentalModalOpen}
        onClose={() => {
          setIsRentalModalOpen(false);
          if (authenticated && property?.id) {
            rentalRequestService.getMyRequestByListing(property.id).then((r) => {
              setActiveRentalRequest(r);
            }).catch(() => {});
          }
        }}
        listingId={property.id}
        listingTitle={property.title}
        listingAddress={property.location}
        listingPrice={property.priceMillion * 1_000_000}
        depositType={property.depositType || (property.details?.depositType as any) || (property.details?.pricing as any)?.depositType}
        listingDepositAmount={property.depositAmount ?? (property.details?.depositAmount as any) ?? (property.details?.pricing as any)?.depositAmount}
        depositMonths={property.depositMonths ?? (property.details?.depositMonths as any) ?? (property.details?.pricing as any)?.depositMonths}
        listingThumbnail={property.images?.[0] || null}
        minimumLeaseMonths={Number(property.details?.minimumLeaseMonths) || 6}
        onSuccess={(req) => {
          setActiveRentalRequest(req);
        }}
      />
    </div>
  );
}
