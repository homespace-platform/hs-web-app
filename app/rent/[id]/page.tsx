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
  Sparkles,
  Video,
} from "lucide-react";
import { RentPropertyItem } from "@/data/mock-rent-data";
import { FEATURED_PROPERTIES, RECENT_PROPERTIES, PropertyItem } from "@/data/home-data";
import { getMockRentListings } from "@/lib/mock-rent-listings";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";

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

const HOME_RENT_PROPERTIES = [...FEATURED_PROPERTIES, ...RECENT_PROPERTIES];

const toRentHomeProperty = (property: PropertyItem): RentPropertyItem => ({
  id: property.id,
  title: property.title,
  location: property.location,
  district: property.district,
  city: property.city,
  priceMillion: property.priceMillion,
  beds: property.beds,
  baths: property.baths,
  areaM2: property.areaM2,
  images: [property.imageUrl],
  isVerified: property.isVerified,
  category: property.category,
  categoryLabel: property.propertyTypeLabel || "Nhà cho thuê",
  timeAgo: property.timeAgo || "Vừa đăng",
  photosCount: property.photosCount || 1,
  landlord: {
    name: "HomeSpace",
    role: "Tin đăng trên HomeSpace",
    listingsCount: 1,
  },
});

export default function RentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const rentProperty = getMockRentListings().find((item) => item.id === id);
  const homeProperty = HOME_RENT_PROPERTIES.find((item) => item.id === id);
  const [apiProperty, setApiProperty] = useState<RentPropertyItem | null>(null);
  const [apiLoading, setApiLoading] = useState(!rentProperty && !homeProperty);

  useEffect(() => {
    if (rentProperty || homeProperty) return;

    let cancelled = false;
    listingService.getById(id)
      .then((listing) => {
        if (!cancelled) setApiProperty(toRentProperty(listing));
      })
      .catch(() => {
        if (!cancelled) setApiProperty(null);
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, rentProperty, homeProperty]);

  const property = rentProperty || (homeProperty ? toRentHomeProperty(homeProperty) : apiProperty);

  if (!property) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-heading text-2xl font-bold">{apiLoading ? "Đang tải tin cho thuê..." : "Không tìm thấy tin cho thuê"}</h1>
            <Link href="/rent" className="mt-4 inline-flex text-primary font-semibold hover:underline">
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
  const galleryImages = Array.from(
    { length: 5 },
    (_, index) => property.images[index] ?? property.images[0],
  );
  const similarProperties = [
    ...getMockRentListings().filter(
      (item) => item.id !== property.id && item.category === property.category,
    ),
    ...getMockRentListings().filter(
      (item) => item.id !== property.id && item.category !== property.category,
    ),
  ].slice(0, 4);
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
  const apartmentDetails = [
    { label: "Phòng khách", value: formatDetail(property.details?.livingRooms, " phòng") },
    { label: "Phòng bếp", value: formatDetail(property.details?.kitchens, " phòng") },
    { label: "Khu bếp", value: formatLabel(property.details?.hasKitchen, { YES: "Có", NO: "Không" }) },
    { label: "Ban công", value: typeof property.details?.hasBalcony === "boolean" ? (property.details.hasBalcony ? "Có" : "Không") : formatDetail(property.details?.balconies, "") },
    { label: "Tầng căn hộ", value: formatDetail(property.details?.apartmentFloor, "") },
    { label: "Tổng số tầng chung cư", value: formatDetail(property.details?.buildingTotalFloors, "") },
    { label: "Tầng", value: formatDetail(property.details?.floor, "") },
    { label: "Tổng số tầng", value: formatDetail(property.details?.totalFloors, "") },
    { label: "Nội thất", value: formatLabel(property.details?.furnishing, { NONE: "Chưa nội thất", BASIC: "Nội thất cơ bản", FULL: "Đầy đủ nội thất" }) },
    { label: "Pháp lý", value: formatLabel(property.details?.legalStatus, { NONE: "Chưa cập nhật", PINK_BOOK: "Sổ hồng / sổ đỏ", CONTRACT: "Hợp đồng mua bán" }) },
    { label: "Tầng phòng", value: formatDetail(property.details?.roomFloor, "") },
    { label: "Ở chung với chủ nhà", value: formatLabel(property.details?.sharedWithOwner, { YES: "Có", NO: "Không" }) },
    { label: "WC của phòng", value: formatLabel(property.details?.privateBathroom, { PRIVATE: "WC riêng trong phòng", SHARED: "WC dùng chung" }) },
    { label: "Nội thất phòng", value: formatLabel(property.details?.roomFurnishing, { NONE: "Không nội thất", BASIC: "Nội thất cơ bản", FULL: "Đầy đủ nội thất" }) },
    { label: "Gác lửng", value: typeof property.details?.hasLoft === "boolean" ? (property.details.hasLoft ? "Có" : "Không") : "" },
    { label: "Sân thượng", value: typeof property.details?.hasRooftopTerrace === "boolean" ? (property.details.hasRooftopTerrace ? "Có" : "Không") : "" },
    { label: "Vị trí không gian", value: formatLabel(property.details?.spacePosition, { GROUND_LEVEL: "Mặt đất / tầng trệt", BUILDING_FLOOR: "Một tầng trong tòa nhà" }) },
    { label: "Thang máy", value: formatLabel(property.details?.elevator, { YES: "Có", NO: "Không" }) },
  ].filter((item) => item.value);
  const rentalDetails = [
    { label: "Hình thức thuê", value: formatLabel(property.details?.rentalMode, { WHOLE_PROPERTY: "Nguyên căn / nguyên mặt bằng", SINGLE_UNIT: "Một phòng / một căn", MULTIPLE_UNITS: "Nhiều phòng / nhiều căn" }) },
    { label: "Đơn vị cho thuê", value: formatDetail(property.details?.unitLabel, "") },
    { label: "Tổng số đơn vị", value: formatDetail(property.details?.totalUnits, "") },
    { label: "Đơn vị còn trống", value: formatDetail(property.details?.availableUnits, "") },
    { label: "Chính sách gửi xe", value: formatLabel(property.details?.parkingPolicy, { NONE: "Không thu phí gửi xe", PAID: "Có thu phí gửi xe" }) },
    { label: "Tiền cọc", value: formatMoney(property.details?.depositAmount) },
    { label: "Thuê tối thiểu", value: formatDetail(property.details?.minimumLeaseMonths, " tháng") },
    { label: "Phí gửi xe", value: formatMoney(property.details?.parkingFee) },
    { label: "Số người tối đa", value: formatDetail(property.details?.maxOccupants, " người") },
    { label: "Số xe tối đa", value: formatDetail(property.details?.maxVehicles, " xe") },
    { label: property.category === "apartment" ? "Phí quản lý chung cư" : "Phí quản lý", value: formatMoney(property.details?.managementFee) },
    { label: "Giá điện", value: formatMoney(property.details?.electricityPrice, "/ kWh") },
    { label: "Giá nước", value: formatMoney(property.details?.waterPrice, "/ m³") },
  ].filter((item) => item.value);
  const amenities = Array.isArray(property.details?.amenities)
    ? property.details.amenities.filter((item): item is string => typeof item === "string")
    : [];
  const roomFeatures = Array.isArray(property.details?.roomFeatures)
    ? property.details.roomFeatures.filter((item): item is string => typeof item === "string")
    : [];
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
              {galleryImages.slice(1).map((image, index) => (
                <div key={`${image}-${index}`} className="hidden md:block relative group overflow-hidden">
                  <Image
                    src={image}
                    alt={`${property.title} - ảnh ${index + 2}`}
                    fill
                    sizes="25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  {index === 3 && (
                    <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-primary shadow-sm">
                        <Camera className="w-4 h-4" />
                        Xem tất cả {property.photosCount} ảnh
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-foreground">
                  {property.title}
                </h1>
                <div className="flex items-baseline gap-3 mt-4">
                  <span className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-primary">
                    {formatPrice(property.priceMillion)}
                  </span>
                  <span className="text-base text-muted-foreground">/ tháng</span>
                </div>
                <div className="flex flex-wrap gap-x-7 gap-y-4 mt-6 py-5 border-y border-border">
                  <DetailMetric icon={BedDouble} label="Phòng ngủ" value={`${property.beds} PN`} />
                  <DetailMetric icon={Bath} label="Phòng tắm" value={`${property.baths} WC`} />
                  <DetailMetric icon={Building2} label="Diện tích" value={`${property.areaM2} m²`} />
                  <DetailMetric icon={MapPin} label="Loại hình" value={property.categoryLabel} />
                </div>
              </section>

              {(apartmentDetails.length > 0 || rentalDetails.length > 0) && (
                <section>
                  <h2 className="font-heading text-2xl font-semibold mb-4">Thông tin chi tiết</h2>
                  {apartmentDetails.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {apartmentDetails.map((item) => <DetailValue key={item.label} {...item} />)}
                    </div>
                  )}
                  {rentalDetails.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {rentalDetails.map((item) => <DetailValue key={item.label} {...item} />)}
                    </div>
                  )}
                  {amenities.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-sm font-semibold text-foreground">Tiện ích</p>
                      <div className="flex flex-wrap gap-2">
                        {amenities.map((amenity) => <span key={amenity} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{amenity}</span>)}
                      </div>
                    </div>
                  )}
                  {roomFeatures.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-sm font-semibold text-foreground">Nội thất có sẵn trong phòng</p>
                      <div className="flex flex-wrap gap-2">
                        {roomFeatures.map((feature) => <span key={feature} className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">{feature}</span>)}
                      </div>
                    </div>
                  )}
                  {viewingDays.length > 0 && viewingSlots.length > 0 && (
                    <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
                      <p className="mb-2 text-sm font-semibold text-foreground">Lịch xem nhà</p>
                      <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Ngày:</span> {viewingDays.map((day) => VIEWING_DAY_LABELS[day] ?? day).join(", ")}</p>
                      <p className="mt-1 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Thời gian:</span> {viewingSlots.map((slot) => VIEWING_SLOT_LABELS[slot] ?? slot).join(", ")}</p>
                    </div>
                  )}
                </section>
              )}

              <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                <Sparkles className="absolute right-4 top-4 w-16 h-16 text-accent-ai opacity-10" />
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-accent-ai" />
                  <h2 className="font-heading text-xl font-semibold">AI Matching Profile</h2>
                  <span className="ml-auto rounded-full border border-accent-ai/20 bg-accent-ai/10 px-3 py-1 text-[11px] font-bold text-accent-ai">
                    Đang đánh giá
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground max-w-2xl">
                  Kết quả phù hợp cá nhân hoá sẽ xuất hiện khi hồ sơ tìm nhà và dữ liệu tiện ích của tin đăng được hoàn thiện.
                </p>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-semibold mb-4">Mô tả chi tiết</h2>
                <div className="space-y-3 text-sm sm:text-base leading-7 text-muted-foreground">
                  <p>{property.description || `${property.title}. Tin ${property.categoryLabel.toLowerCase()} tại ${property.location}, diện tích ${property.areaM2} m² với ${property.beds} phòng ngủ và ${property.baths} phòng tắm.`}</p>
                  <p>
                    Hình ảnh và thông tin do {property.landlord.name} đăng tải {property.timeAgo.toLowerCase()}. Liên hệ chủ nhà để xác nhận tình trạng nhà, nội thất và lịch xem.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-semibold mb-4">Điểm nổi bật</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {highlights.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Icon className="w-5 h-5 text-primary shrink-0" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="font-heading text-2xl font-semibold mb-4">Vị trí &amp; xung quanh</h2>
                <div className="h-[300px] rounded-xl border border-border bg-primary/5 flex flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
                  <MapPin className="w-7 h-7 text-primary" />
                  <p className="font-semibold text-foreground">{property.location}</p>
                  <p className="text-sm">Bản đồ tương tác sẽ hiển thị khi tin đăng có toạ độ.</p>
                </div>
              </section>
            </div>

            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 rounded-xl border border-border bg-card p-5 shadow-[0_4px_12px_rgba(15,23,42,0.08)] space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  {property.landlord.avatar ? (
                    <Image
                      src={property.landlord.avatar}
                      alt={property.landlord.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover border border-border"
                      unoptimized
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-xl font-bold border border-primary/20">
                      {property.landlord.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-heading text-xl font-semibold truncate">{property.landlord.name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      {property.isVerified && <BadgeCheck className="w-4 h-4 text-verified" />}
                      {property.landlord.role}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{property.landlord.listingsCount} tin đang đăng</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {property.landlord.phone ? (
                    <a href={`tel:${property.landlord.phone}`} className={contactButtonClass}>
                      <Phone className="w-4 h-4" />
                      Gọi điện
                    </a>
                  ) : (
                    <button type="button" disabled className={`${contactButtonClass} cursor-not-allowed opacity-50`}>
                      <Phone className="w-4 h-4" />
                      Chưa có số
                    </button>
                  )}
                  <Link href="/chat" className={contactButtonClass}>
                    <MessageCircle className="w-4 h-4" />
                    Nhắn tin
                  </Link>
                </div>
                <Link href="/chat" className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Liên hệ xem nhà
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <div className="pt-4 border-t border-border space-y-3 text-xs leading-5 text-muted-foreground">
                  <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />Thông tin chủ nhà và điều khoản thuê cần được xác nhận trước khi đặt cọc.</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />Ưu tiên trao đổi trực tiếp qua kênh liên hệ chính thức của HomeSpace.</p>
                </div>
              </div>
            </aside>
          </div>

          <section className="mt-16">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Nhà đất ở khu vực tương tự</h2>
                <p className="mt-1 text-sm text-muted-foreground">Gợi ý dựa trên loại hình nhà bạn đang xem</p>
              </div>
              <Link href="/rent" className="text-sm font-semibold text-primary hover:underline">Xem tất cả</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {similarProperties.map((item) => <RentCollageCard key={item.id} property={item} viewMode="grid" />)}
            </div>
          </section>
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
  return value
    .replace(/^(thành phố|tỉnh|tp\.?|p\.?|phường|xã)\s*/i, "")
    .trim();
}

function formatDetail(value: unknown, suffix: string) {
  return value === undefined || value === null || value === "" ? "" : `${value}${suffix}`;
}

function formatLabel(value: unknown, labels: Record<string, string>) {
  return typeof value === "string" ? labels[value] ?? value : "";
}

function formatMoney(value: unknown, suffix = "") {
  if (value === undefined || value === null || value === "") return "";
  return `${new Intl.NumberFormat("vi-VN").format(Number(value))} VNĐ${suffix}`;
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DetailMetric({ icon: Icon, label, value }: { icon: typeof BedDouble; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="font-heading text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
