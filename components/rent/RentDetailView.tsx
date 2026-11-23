"use client";

import React, { useState } from "react";
import Image from "next/image";
import ListingPoliciesCard from "@/components/listing/ListingPoliciesCard";
import NearbyPlacesPanel from "@/components/nearby/NearbyPlacesPanel";
import type { ListingPolicyValue } from "@/types/listing-policy.type";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Video,
  Eye,
  Clock,
  Calendar,
  Home,
  User,
  Edit,
  Copy,
  Layers,
  FileText,
  Info,
  Maximize2,
  Users,
  Handshake,
  ExternalLink,
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
import type { DepositType, ListingAddressResponse } from "@/types/listing.type";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import type { RelatedListing } from "@/types/chat.type";
import { chatConversationUrl } from "@/lib/chat-demo-state";
import { RENTAL_HOLD_DURATION_LABEL } from "@/config/rental-hold.config";
import { requireKyc } from "@/lib/kyc-gate";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";

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



function formatLocationLabel(value: string) {
  return value.replace(/^(thành phố|tỉnh|tp\.?|p\.?|phường|xã)\s*/i, "").trim();
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const chipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground";

const locationChipClass = `inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary ${focusRing}`;

function SectionCard({
  title,
  icon: Icon,
  children,
  id,
}: {
  title: string;
  icon: typeof Layers;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs scroll-mt-28">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold text-foreground break-words">{value}</dd>
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
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
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
  const provinceCode = property.provinceCode ?? "";
  const provinceName = property.provinceName ?? property.city;
  const wardName = property.ward ?? property.district;
  const provinceLabel = formatLocationLabel(provinceName);
  const wardLabel = formatLocationLabel(wardName);
  const provinceHref = `/rent?cityId=${encodeURIComponent(provinceCode)}`;
  const wardHref = property.wardCode ? `${provinceHref}&wardId=${encodeURIComponent(property.wardCode)}` : provinceHref;
  const listingAddress = property.details?.address as ListingAddressResponse | undefined;

  const { profile, authenticated, login } = useAuth();
  const rentalGate = useFeatureGate(PERMISSIONS.RENTAL_REQUEST_CREATE);
  const bookGate = useFeatureGate(PERMISSIONS.APPOINTMENT_BOOK);
  const router = useRouter();
  const { openConversation, sendMessage } = useChatDemo();
  const currentUserId = profile?.id;
  const isOwner =
    authenticated &&
    Boolean(
      currentUserId &&
      (currentUserId === property.ownerId || currentUserId === property.landlord?.id)
    );

  const pricing = (property.details?.pricing as Record<string, unknown> | undefined) ?? undefined;
  const isNegotiable = Boolean(
    pricing?.negotiable ?? property.details?.negotiable
  );
  const acceptsNewRequests = property.status === "PUBLISHED";
  const publicListing = acceptsNewRequests || property.status === "RESERVED";

  const [descExpanded, setDescExpanded] = useState(false);
  const showVisitorCta = !(isOwner || !showLandlordContact);
  const [quickMessage, setQuickMessage] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [activeRentalRequest, setActiveRentalRequest] = useState<RentalRequestResponse | null>(null);

  React.useEffect(() => {
    if (authenticated && property?.id) {
      appointmentService.getMyBookingByListing(property.id).then((b) => {
        setHasActiveBooking(Boolean(b && ["PENDING", "CONFIRMED"].includes(b.status)));
      }).catch(() => { });

      rentalRequestService.getMyRequestByListing(property.id).then((r) => {
        setActiveRentalRequest(r);
      }).catch(() => { });
    }
  }, [authenticated, property?.id]);

  const QUICK_SUGGESTIONS = [
    "Nhà này còn không?",
    "Thời hạn thuê tối thiểu?",
    "Giá thuê có thương lượng được không?",
    "Khi nào có thể xem nhà?",
  ];

  const chatListing: RelatedListing = {
    id: property.id,
    title: property.title,
    price: formatPrice(property.priceMillion),
    location: property.location,
    image: property.images?.[0] || "",
    bedrooms: property.beds,
    area: property.areaM2,
    verified: property.isVerified,
  };

  const openPropertyChat = async (message?: string) => {
    const conversationId = await openConversation({
      listing: chatListing,
      contact: {
        id: property.ownerId || property.landlord.id,
        name: property.landlord.name,
        avatar: property.landlord.avatar,
        role: property.landlord.role || "Chủ nhà",
      },
    });
    if (message && conversationId) {
      await sendMessage(conversationId, message, chatListing);
      setQuickMessage("");
    }
    if (conversationId) router.push(chatConversationUrl(conversationId));
  };

  const handleSendQuickMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickMessage.trim()) return;
    await openPropertyChat(quickMessage);
  };

  // Category and video already appear in the badge row above the title.
  const highlights = property.photosCount > 0
    ? [{ icon: Camera, label: `${property.photosCount} ảnh thực tế` }]
    : [];

  const detailSections = getRentDetailSections(property);
  const showBedroomMetric = ["apartment", "house", "villa"].includes(property.category);
  const amenities = [
    ...(Array.isArray(property.details?.amenities) ? property.details.amenities : []),
    ...(Array.isArray(property.details?.customAmenities) ? property.details.customAmenities : []),
  ].filter((item): item is string => typeof item === "string");
  const rawFurnishings = (
    Array.isArray(property.details?.furnishingList)
      ? (property.details.furnishingList as Array<{
          index?: number;
          assetName?: string;
          quantity?: number;
          handoverCondition?: string;
          conditionText?: string;
          conditionNote?: string;
        }>)
      : []
  ).filter((item) => Boolean(item && item.assetName));

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

  return (
    <div className={`space-y-6 ${showVisitorCta ? "pb-24 lg:pb-0" : ""}`}>
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
      />

      {/* Main Details & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-10">
        {/* Left Column: Property Specs & Details */}
        <div className="min-w-0 space-y-6">
          {/* Overview */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground">
                {property.categoryLabel}
              </span>
              {property.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-verified/10 px-2.5 py-1 text-xs font-semibold text-verified">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã xác minh
                </span>
              )}
              {property.hasVideo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-ai/10 px-2.5 py-1 text-xs font-semibold text-accent-ai">
                  <Video className="w-3.5 h-3.5" />
                  Có video tham quan
                </span>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-balance mb-3">
              {property.title}
            </h1>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed break-words">{property.location}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {wardLabel && (
                <Link href={wardHref} className={locationChipClass}>
                  {wardLabel}
                </Link>
              )}
              {provinceCode && provinceLabel && (
                <Link href={provinceHref} className={locationChipClass}>
                  {provinceLabel}
                </Link>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {property.timeAgo}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {property.viewCount ?? property.viewsCount ?? 0} lượt xem
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-2">
              <span className="font-heading text-3xl font-bold text-primary tabular-nums">
                {formatPrice(property.priceMillion)}
              </span>
              <span className="text-sm text-muted-foreground">/tháng</span>
              {isNegotiable && (
                <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Có thể thương lượng
                </span>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-border pt-5">
              <DetailMetric icon={Maximize2} label="Diện tích" value={`${property.areaM2} m²`} />
              {showBedroomMetric ? (
                <DetailMetric icon={BedDouble} label="Phòng ngủ" value={`${property.beds} PN`} />
              ) : property.category === "office" && property.details?.expectedSeats != null ? (
                <DetailMetric icon={Building2} label="Chỗ ngồi" value={`${property.details.expectedSeats} chỗ`} />
              ) : property.category === "commercial" && property.details?.frontageWidthM != null ? (
                <DetailMetric icon={Building2} label="Mặt tiền" value={`${property.details.frontageWidthM} m`} />
              ) : property.category === "room" && property.details?.maxOccupants != null ? (
                <DetailMetric icon={Users} label="Tối đa" value={`${property.details.maxOccupants} người`} />
              ) : (
                <DetailMetric icon={Building2} label="Loại hình" value={property.categoryLabel} />
              )}
              <DetailMetric
                icon={Bath}
                label="Phòng tắm / WC"
                value={`${property.baths ||
                  (property.details?.bathroomCount as number) ||
                  (property.details?.restroomCount as number) ||
                  (property.details?.restroomType === "PRIVATE" ? "Khép kín" : property.details?.restroomType === "SHARED" ? "Chung" : 1)
                  } WC`}
              />
            </div>

            {/* Highlights */}
            {highlights.length > 0 && <div className="mt-5 flex flex-wrap gap-2">
              {highlights.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
                  <h.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  {h.label}
                </span>
              ))}
            </div>}
          </section>

          {/* Categorized Detail Sections */}
          {detailSections.map((section, idx) => (
            <SectionCard key={idx} title={section.title} icon={Layers}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {section.items.map((item, itemIdx) => (
                  <DetailValue key={itemIdx} label={item.label} value={item.value} />
                ))}
              </dl>
            </SectionCard>
          ))}

          <ListingPoliciesCard rows={Array.isArray(property.details?.policies) ? property.details.policies as ListingPolicyValue[] : undefined} />

          {/* Amenities */}
          {amenities.length > 0 && (
            <SectionCard title="Tiện ích tòa nhà & dịch vụ" icon={CheckCircle2}>
              <div className="flex flex-wrap gap-2">
                {amenities.map((item, idx) => (
                  <span key={idx} className={chipClass}>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Trang thiết bị / Nội thất bàn giao */}
          {rawFurnishings.length > 0 ? (
            <SectionCard title="Trang thiết bị / Nội thất bàn giao" icon={Home}>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-105 border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left font-semibold text-muted-foreground">
                      <th scope="col" className="w-12 px-3 py-2.5">STT</th>
                      <th scope="col" className="px-3 py-2.5">Tên tài sản / Trang thiết bị</th>
                      <th scope="col" className="w-24 px-3 py-2.5">Số lượng</th>
                      <th scope="col" className="px-3 py-2.5">Hiện trạng bàn giao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawFurnishings.map((item, idx) => (
                      <tr key={idx} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-3 py-2.5 text-muted-foreground">{item.index ?? idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-foreground">{item.assetName}</td>
                        <td className="px-3 py-2.5 text-foreground">{item.quantity ?? 1}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {item.conditionText || item.handoverCondition || "Chưa ghi nhận"}
                          {!item.conditionText && item.conditionNote ? ` (${item.conditionNote})` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : roomFeatures.length > 0 ? (
            <SectionCard title="Trang thiết bị / Nội thất bàn giao" icon={Home}>
              <div className="flex flex-wrap gap-2">
                {roomFeatures.map((item, idx) => (
                  <span key={idx} className={chipClass}>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </SectionCard>
          ) : ["house", "apartment", "room"].includes(property.category) ? (
            <SectionCard title="Trang thiết bị / Nội thất bàn giao" icon={Home}>
              <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {property.details?.furnishingStatus === "UNFURNISHED"
                    ? "Không có nội thất bàn giao kèm theo. Bài đăng được chủ nhà khai báo là không nội thất."
                    : "Chủ nhà chưa cung cấp danh sách nội thất bàn giao. Vui lòng xác nhận khi xem nhà."}
                </span>
              </p>
            </SectionCard>
          ) : null}

          {/* Viewing Schedule */}
          {(viewingDays.length > 0 || viewingSlots.length > 0) && (
            <SectionCard title="Lịch hẹn xem nhà" icon={Calendar}>
              <div className="space-y-4">
                {viewingDays.length > 0 && (
                  <div>
                    <span className="block mb-2 text-sm font-medium text-muted-foreground">Ngày tiếp khách trong tuần</span>
                    <div className="flex flex-wrap gap-2">
                      {viewingDays.map((d) => (
                        <span key={d} className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground">
                          {VIEWING_DAY_LABELS[d] || d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {viewingSlots.length > 0 && (
                  <div>
                    <span className="block mb-2 text-sm font-medium text-muted-foreground">Khung giờ tiếp khách</span>
                    <div className="flex flex-wrap gap-2">
                      {viewingSlots.map((s) => (
                        <span key={s} className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                          {VIEWING_SLOT_LABELS[s] || s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Description */}
          {property.description && (
            <SectionCard title="Mô tả chi tiết" icon={FileText}>
              <div
                className={`max-w-prose text-[15px] leading-7 text-foreground whitespace-pre-line ${
                  property.description.length > 600 && !descExpanded ? "line-clamp-[10]" : ""
                }`}
              >
                {property.description}
              </div>
              {property.description.length > 600 && (
                <button
                  type="button"
                  aria-expanded={descExpanded}
                  onClick={() => setDescExpanded((v) => !v)}
                  className={`mt-3 rounded-md text-sm font-semibold text-primary hover:underline ${focusRing}`}
                >
                  {descExpanded ? "Thu gọn" : "Xem thêm"}
                </button>
              )}
            </SectionCard>
          )}

          <NearbyPlacesPanel listingId={property.id}
            latitude={listingAddress?.latitude}
            longitude={listingAddress?.longitude} />
        </div>

        {/* Right Column: Landlord Card & Action Sidebar */}
        <aside className="min-w-0">
          <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto no-scrollbar">
          {isOwner || !showLandlordContact ? (
            /* Khi là bài đăng của bản thân: Bỏ card liên hệ, hiện thông tin chính chủ & nút quản lý */
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs space-y-4">
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
                <p className="text-sm font-bold text-foreground">Bạn đang xem bài đăng của chính mình</p>
                <p className="text-xs leading-relaxed">
                  Các nút liên hệ, đặt lịch xem nhà sẽ tự động ẩn với bạn và chỉ hiển thị đối với khách tìm thuê.
                </p>
              </div>

              {sidebarActions}

              <div className="pt-2 space-y-2">
                {String(property.status || "").trim().toUpperCase() !== "RENTED_EXTERNALLY" &&
                  String(property.status || "").trim().toUpperCase() !== "VIOLATION" && (
                  <Link
                    href={`/dashboard/properties/new?id=${property.id}`}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98] ${focusRing}`}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Chỉnh sửa bài đăng</span>
                  </Link>
                )}
                {String(property.status || "").trim().toUpperCase() !== "VIOLATION" && (
                  <Link
                    href={`/dashboard/properties/new?duplicateFrom=${property.id}`}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground hover:bg-muted transition-all active:scale-[0.98] ${focusRing}`}
                  >
                    <Copy className="w-4 h-4" />
                    <span>Nhân bản bài đăng</span>
                  </Link>
                )}
                <Link
                  href="/dashboard/properties"
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground hover:bg-muted transition-all active:scale-[0.98] ${focusRing}`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Quản lý tin đăng</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Khi là bài đăng của người khác */
            <div className="space-y-4">
              {/* Card 1: Bạn quan tâm đến căn này? */}
              <div id="listing-contact" className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3 scroll-mt-28">
                <div className="pb-3 border-b border-border">
                  <p className="font-heading text-2xl font-bold text-primary tabular-nums">
                    {formatPrice(property.priceMillion)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/tháng</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {property.areaM2} m²
                    {showBedroomMetric ? ` · ${property.beds} PN` : ""}
                  </p>
                </div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  Bạn quan tâm đến căn này?
                </h3>

                {/* 1. Nút Yêu cầu thuê nhà (Hành động chính - Nổi bật nhất) */}
                {activeRentalRequest?.status === "PENDING" ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        router.push("/dashboard/rental-requests/my-requests");
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 py-3.5 px-4 text-sm font-bold text-amber-700 dark:text-amber-300 shadow-xs hover:bg-amber-500/20 transition-all cursor-pointer active:scale-[0.98] ${focusRing}`}
                      title="Xem yêu cầu thuê đang chờ duyệt của bạn"
                    >
                      <Clock className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                      <span>Đã gửi yêu cầu thuê (Chờ duyệt)</span>
                    </button>
                    <div className="text-center">
                      <Link
                        href="/dashboard/rental-requests/my-requests"
                        className={`inline-flex items-center gap-1 rounded-md text-xs font-semibold text-primary hover:underline ${focusRing}`}
                      >
                        <span>Xem yêu cầu của tôi</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ) : activeRentalRequest?.status === "ACCEPTED" ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        router.push("/dashboard/rental-requests/my-requests");
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 py-3.5 px-4 text-sm font-bold text-emerald-700 dark:text-emerald-300 shadow-xs hover:bg-emerald-500/20 transition-all cursor-pointer active:scale-[0.98] ${focusRing}`}
                      title={`Yêu cầu thuê đã được duyệt và đang giữ chỗ trong ${RENTAL_HOLD_DURATION_LABEL}! Bấm để xem chi tiết`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Yêu cầu được duyệt (Đang giữ chỗ)</span>
                    </button>
                    <div className="text-center">
                      <Link
                        href="/dashboard/rental-requests/my-requests"
                        className={`inline-flex items-center gap-1 rounded-md text-xs font-semibold text-primary hover:underline ${focusRing}`}
                      >
                        <span>Xem yêu cầu của tôi</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ) : property.status === "RESERVED" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted py-3.5 px-4 text-sm font-bold text-muted-foreground border border-border/50 cursor-not-allowed opacity-80"
                    title={`Bất động sản này đang được giữ chỗ trong ${RENTAL_HOLD_DURATION_LABEL} cho một khách thuê khác`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Đang giữ chỗ (Tạm khóa)</span>
                  </button>
                ) : !acceptsNewRequests ? (
                  <div className="rounded-xl border border-border bg-muted p-3 text-center text-sm font-medium text-muted-foreground">
                    Tin hiện không nhận yêu cầu thuê mới
                  </div>
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
                      if (!rentalGate.guard()) return;
                      requireKyc(profile, {
                        router,
                        redirect: false,
                        onAllowed: () => setIsRentalModalOpen(true),
                      });
                    }}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 px-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] ${focusRing}`}
                    title={rentalGate.title ?? "Gửi yêu cầu thuê nhà trực tiếp tới chủ nhà"}
                  >
                    <Home className="w-4 h-4" />
                    <span>Yêu cầu thuê nhà</span>
                  </button>
                )}

                {/* 2. Hàng nút phụ: Đặt lịch xem (+ Thương lượng nếu tin cho phép) */}
                <div className={`grid gap-2.5 ${isNegotiable ? "grid-cols-2" : "grid-cols-1"}`}>
                  <button
                    type="button"
                    disabled={!publicListing && !hasActiveBooking}
                    onClick={() => {
                      if (!publicListing) {
                        if (hasActiveBooking) router.push("/dashboard/viewing-schedules/my-bookings");
                        return;
                      }
                      if (isOwner) {
                        toast.info("Bạn là chủ bài đăng này, không thể tự đặt lịch xem nhà.");
                        return;
                      }
                      if (!authenticated) {
                        toast.error("Vui lòng đăng nhập để đặt lịch xem nhà");
                        login();
                        return;
                      }
                      if (!bookGate.guard()) return;
                      requireKyc(profile, {
                        router,
                        redirect: false,
                        onAllowed: () => setIsBookingModalOpen(true),
                      });
                    }}
                    className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-sm font-bold transition-all cursor-pointer active:scale-[0.98] ${focusRing} ${hasActiveBooking
                      ? "bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : "border border-border bg-card hover:bg-muted text-foreground hover:border-primary/40"
                      }`}
                    title={bookGate.title ?? "Đặt lịch hẹn gặp trực tiếp chủ nhà tại bất động sản"}
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

                  {isNegotiable && publicListing && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isOwner) {
                          toast.info("Bạn là chủ bài đăng này, không thể tự thương lượng.");
                          return;
                        }
                        if (!authenticated) {
                          toast.error("Vui lòng đăng nhập để thương lượng");
                          login();
                          return;
                        }
                        requireKyc(profile, {
                          router,
                          redirect: false,
                          onAllowed: () =>
                            toast.info("Tính năng Thương lượng đang được kết nối!"),
                        });
                      }}
                      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground py-2.5 px-3 text-sm font-bold transition-all cursor-pointer active:scale-[0.98] hover:border-primary/40 ${focusRing}`}
                      title="Đề xuất giá thuê, tiền cọc hoặc các điều khoản mong muốn"
                    >
                      <Handshake className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">Thương lượng</span>
                    </button>
                  )}
                </div>

                {/* Liên hệ qua chat */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => void openPropertyChat()}
                    className={`w-full inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 px-3 text-sm font-semibold text-foreground hover:bg-muted/60 transition-all cursor-pointer ${focusRing}`}
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span>Nhắn tin với chủ nhà</span>
                  </button>
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

                {/* Quick Chat Input Box */}
                <form onSubmit={handleSendQuickMessage} className="space-y-2">
                  <div className="relative flex min-h-11 items-center rounded-xl border border-border bg-muted/30 px-3 py-1.5 focus-within:border-primary focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={quickMessage}
                      onChange={(e) => setQuickMessage(e.target.value)}
                      placeholder="Nhắn hỏi thông tin"
                      aria-label="Nội dung tin nhắn"
                      className="w-full bg-transparent px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!quickMessage.trim()}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${focusRing} ${quickMessage.trim()
                        ? "bg-primary text-primary-foreground shadow-2xs cursor-pointer hover:bg-primary/90"
                        : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                        }`}
                    >
                      Gửi
                    </button>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {QUICK_SUGGESTIONS.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setQuickMessage(sug)}
                        className={`px-2.5 py-1 rounded-full border border-border bg-muted/20 hover:bg-muted text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer ${focusRing}`}
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
                      className={`p-1 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shrink-0 cursor-pointer ${focusRing}`}
                      title="Gợi ý khác"
                      aria-label="Gợi ý khác"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                {/* Trust & Safety notes */}
                <div className="pt-3 border-t border-border space-y-2 text-xs leading-relaxed text-muted-foreground">
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
          </div>
        </aside>
      </div>

      {showVisitorCta && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <p className="min-w-0 font-heading text-lg font-bold text-primary tabular-nums truncate">
            {formatPrice(property.priceMillion)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/tháng</span>
          </p>
          <a
            href="#listing-contact"
            className={`shrink-0 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 ${focusRing}`}
          >
            Liên hệ
          </a>
        </div>
      )}


      {/* Modal Đặt lịch xem nhà */}
      <BookingAppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          if (authenticated && property?.id) {
            appointmentService.getMyBookingByListing(property.id).then((b) => {
              setHasActiveBooking(Boolean(b && ["PENDING", "CONFIRMED"].includes(b.status)));
            }).catch(() => { });
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
            }).catch(() => { });
          }
        }}
        listingId={property.id}
        listingTitle={property.title}
        listingAddress={property.location}
        listingPrice={property.priceMillion * 1_000_000}
        depositType={
          (property.depositType as DepositType | undefined) ||
          (property.details?.depositType as DepositType | undefined) ||
          (pricing?.depositType as DepositType | undefined)
        }
        listingDepositAmount={
          property.depositAmount ??
          (typeof property.details?.depositAmount === "number"
            ? property.details.depositAmount
            : undefined) ??
          (typeof pricing?.depositAmount === "number" ? pricing.depositAmount : undefined)
        }
        depositMonths={
          property.depositMonths ??
          (typeof property.details?.depositMonths === "number"
            ? property.details.depositMonths
            : undefined) ??
          (typeof pricing?.depositMonths === "number" ? pricing.depositMonths : undefined)
        }
        listingThumbnail={property.images?.[0] || null}
        minimumLeaseMonths={Number(property.details?.minimumLeaseMonths) || 6}
        listingMaxOccupants={typeof property.details?.maxOccupants === "number" ? property.details.maxOccupants : null}
        onSuccess={(req) => {
          setActiveRentalRequest(req);
        }}
      />
    </div>
  );
}
