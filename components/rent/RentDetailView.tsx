"use client";

import React from "react";
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
  Phone,
  ShieldCheck,
  Video,
} from "lucide-react";
import type { RentPropertyItem } from "@/types/rent.type";
import RentMediaGallery from "@/components/rent/RentMediaGallery";
import { getRentDetailSections } from "@/lib/rent-detail-sections";

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
      <RentMediaGallery
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

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>{property.location}</span>
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
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6 sticky top-28">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                {property.landlord.avatar ? (
                  <Image
                    src={property.landlord.avatar}
                    alt={property.landlord.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/10">
                    {property.landlord.name[0] || "C"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-heading font-semibold truncate">{property.landlord.name}</p>
                <p className="text-xs text-muted-foreground">{property.landlord.role}</p>
              </div>
            </div>

            {/* Optional Custom Sidebar Actions (e.g. in dashboard) */}
            {sidebarActions}

            {/* Standard Tenant Contact Actions */}
            {showLandlordContact && (
              <div className="space-y-3">
                <a
                  href={`tel:${property.landlord.phone || "19001234"}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Gọi điện: {property.landlord.phone || "1900 1234"}</span>
                </a>

                <Link
                  href="/chat"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
                >
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span>Nhắn tin trực tiếp</span>
                </Link>
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-3 text-xs leading-5 text-muted-foreground">
              <p className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                Thông tin chủ nhà và điều khoản thuê cần được xác nhận trước khi đặt cọc.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                Ưu tiên trao đổi trực tiếp qua kênh liên hệ chính thức của HomeSpace.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
