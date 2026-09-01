"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RentCollageCard from "@/components/rent/RentCollageCard";
import {
  ArrowLeft,
  BadgeCheck,
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
  Loader2,
} from "lucide-react";
import type { RentPropertyItem } from "@/types/rent.type";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
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

export default function RentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<RentPropertyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarProperties, setSimilarProperties] = useState<RentPropertyItem[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Load listing detail from API
    listingService
      .getById(id)
      .then((listing) => {
        if (!cancelled && listing) {
          setProperty(toRentProperty(listing));
        }
      })
      .catch((err) => {
        console.error("Error fetching rent detail:", err);
        if (!cancelled) setProperty(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Load similar published properties from API
    listingService
      .getPublished()
      .then((published) => {
        if (!cancelled && Array.isArray(published)) {
          const others = published
            .filter((item) => item.id !== id)
            .slice(0, 4)
            .map((l) => toRentProperty(l));
          setSimilarProperties(others);
        }
      })
      .catch(() => {
        if (!cancelled) setSimilarProperties([]);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

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
        <main className="flex-1 pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h1 className="font-heading text-2xl font-bold">Không tìm thấy tin cho thuê</h1>
            <p className="text-sm text-muted-foreground">
              Bài đăng có thể đã hết hạn hoặc không tồn tại.
            </p>
            <Link
              href="/rent"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const provinceCode = property.provinceCode ?? inferProvinceCode(property.city);
  const provinceName = property.provinceName ?? property.city;
  const wardName = property.ward ?? property.district;
  const provinceLabel = formatLocationLabel(provinceName);
  const wardLabel = formatLocationLabel(wardName);
  const provinceHref = `/rent?provinceCode=${encodeURIComponent(provinceCode)}&provinceName=${encodeURIComponent(provinceName)}`;
  const wardHref = `${provinceHref}&ward=${encodeURIComponent(wardName)}`;
  const galleryImages = property.images;

  const contactButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-muted";
  const highlights = [
    { icon: Building2, label: property.categoryLabel },
    { icon: Camera, label: `${property.photosCount} ảnh thực tế` },
    property.isVerified
      ? { icon: BadgeCheck, label: "Tin đăng đã xác thực" }
      : { icon: ShieldCheck, label: "Thông tin đang được cập nhật" },
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
    ? property.details.viewingDays.filter((item): item is string => typeof item === "string")
    : [];
  const viewingSlots = Array.isArray(property.details?.viewingSlots)
    ? property.details.viewingSlots.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <nav className="flex flex-wrap items-center gap-2 mb-6 text-xs font-semibold text-muted-foreground">
            <Link href="/rent" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Trở lại danh sách
            </Link>
            <span className="inline-flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-border" />
              <Link href={wardHref} className="hover:text-primary transition-colors">{wardLabel}</Link>
            </span>
            <span className="inline-flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-border" />
              <Link href={provinceHref} className="hover:text-primary transition-colors">{provinceLabel}</Link>
            </span>
            <span className="inline-flex items-center gap-2 text-foreground truncate max-w-full">
              <ChevronRight className="w-3.5 h-3.5 text-border shrink-0" />
              {property.title}
            </span>
          </nav>

          <section className="mb-12">
            {galleryImages.length >= 3 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[360px] sm:h-[440px] md:h-[500px] rounded-xl overflow-hidden bg-muted">
                <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden">
                  <Image
                    src={galleryImages[0]}
                    alt={property.title}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                </div>
                {galleryImages.slice(1, 5).map((image, index) => (
                  <div key={`${image}-${index}`} className="hidden md:block relative group overflow-hidden">
                    <Image
                      src={image}
                      alt={`${property.title} - ảnh ${index + 2}`}
                      fill
                      sizes="25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    {index === 3 && galleryImages.length > 5 && (
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-primary shadow-sm">
                          <Camera className="w-4 h-4" />
                          Xem tất cả {property.photosCount} ảnh
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : galleryImages.length === 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[360px] sm:h-[440px] md:h-[500px] rounded-xl overflow-hidden bg-muted">
                <div className="relative group overflow-hidden">
                  <Image
                    src={galleryImages[0]}
                    alt={property.title}
                    fill
                    priority
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                </div>
                <div className="relative group overflow-hidden">
                  <Image
                    src={galleryImages[1]}
                    alt={`${property.title} - ảnh 2`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                </div>
              </div>
            ) : galleryImages.length === 1 ? (
              <div className="relative h-[360px] sm:h-[440px] md:h-[500px] rounded-xl overflow-hidden bg-muted">
                <Image
                  src={galleryImages[0]}
                  alt={property.title}
                  fill
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
              </div>
            ) : (
              <div className="relative h-[300px] rounded-xl overflow-hidden bg-muted flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border">
                <Camera className="w-10 h-10 opacity-40 mb-2" />
                <span className="text-sm">Chưa có hình ảnh đăng tải</span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-12">
              <section>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {property.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-verified/10 px-2.5 py-1 text-[11px] font-bold text-verified">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Tin đăng xác thực
                    </span>
                  )}
                  {property.hasVideo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-ai/10 px-2.5 py-1 text-[11px] font-bold text-accent-ai">
                      <Video className="w-3.5 h-3.5" />
                      Có video tham quan
                    </span>
                  )}
                </div>

                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  {property.title}
                </h1>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>{property.location}</span>
                </div>

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

              <section className="space-y-4">
                <h2 className="font-heading text-lg font-bold">Điểm nổi bật</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/20 text-xs font-semibold">
                      <h.icon className="w-4 h-4 text-primary shrink-0" />
                      <span>{h.label}</span>
                    </div>
                  ))}
                </div>
              </section>

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

              {property.description && (
                <section className="space-y-4">
                  <h2 className="font-heading text-lg font-bold">Mô tả chi tiết</h2>
                  <div className="rounded-xl border border-border bg-muted/20 p-5 text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {property.description}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Landlord Info */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 sticky top-28">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border border-border">
                    {property.landlord.avatar ? (
                      <Image
                        src={property.landlord.avatar}
                        alt={property.landlord.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-primary bg-primary/10">
                        {property.landlord.name[0] || "H"}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{property.landlord.name}</h3>
                    <p className="text-xs text-muted-foreground">{property.landlord.role}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <a
                    href={`tel:${property.landlord.phone || "19008888"}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Gọi điện: {property.landlord.phone || "Liên hệ xem nhà"}</span>
                  </a>
                  <Link
                    href={`/chat?partnerId=${property.id}`}
                    className={contactButtonClass + " w-full"}
                  >
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span>Nhắn tin trực tiếp</span>
                  </Link>
                </div>

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

          {similarProperties.length > 0 && (
            <section className="mt-16">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
                    Nhà đất ở khu vực tương tự
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Gợi ý dựa trên loại hình nhà bạn đang xem</p>
                </div>
                <Link href="/rent" className="text-sm font-semibold text-primary hover:underline">
                  Xem tất cả
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {similarProperties.map((item) => (
                  <RentCollageCard key={item.id} property={item} viewMode="grid" />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

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
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="font-heading text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
