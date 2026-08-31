import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  MapPin,
  Edit,
  Loader2,
  CheckCircle,
} from "lucide-react";
import listingService from "@/services/listing.service";
import type { ListingDetailResponse } from "@/types/listing.type";

interface ListingDetailModalProps {
  listingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

const CATEGORY_NAMES: Record<string, string> = {
  APARTMENT: "Căn hộ / Chung cư",
  HOUSE: "Nhà ở nguyên căn",
  OFFICE: "Văn phòng cho thuê",
  COMMERCIAL_SPACE: "Mặt bằng kinh doanh",
  ROOM: "Phòng trọ / Căn hộ dịch vụ",
};

export default function ListingDetailModal({
  listingId,
  isOpen,
  onClose,
  onEdit,
}: ListingDetailModalProps) {
  const [data, setData] = useState<ListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !listingId) return;

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
          setData(null);
          setError(err?.response?.data?.message || "Không thể tải chi tiết bài đăng.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, listingId]);

  if (!isOpen) return null;

  const images = data?.media.filter((m) => m.mediaType === "IMAGE") || [];
  const currentImage = images[selectedImageIndex]?.url || "/area/hcm-1.jpg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-150">
      <div className="relative flex flex-col max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {data ? CATEGORY_NAMES[data.category] || data.category : "Chi tiết tin đăng"}
            </span>
            {data?.status && (
              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {data.status === "PUBLISHED"
                  ? "Đang hiển thị"
                  : data.status === "RENTED"
                  ? "Đã cho thuê"
                  : data.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(data.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
              >
                <Edit className="h-3.5 w-3.5" />
                Chỉnh sửa
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs font-medium">Đang tải thông tin chi tiết...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Media Gallery */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-xl bg-muted/40 border border-border">
                    <Image
                      src={currentImage}
                      alt={data.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {images.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition-all ${
                            idx === selectedImageIndex
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border opacity-70 hover:opacity-100"
                          }`}
                        >
                          <Image
                            src={img.url || "/area/hcm-1.jpg"}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title & Key Stats */}
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {data.title}
                </h2>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>{data.address?.fullAddress || "Chưa cập nhật địa chỉ"}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <span className="text-[11px] font-medium text-muted-foreground">Giá thuê</span>
                    <p className="text-sm sm:text-base font-bold text-primary">
                      {formatCurrency(Number(data.pricing?.amount || 0))} ₫
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      /{data.pricing?.unit === "MONTH" ? "tháng" : "m²/tháng"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <span className="text-[11px] font-medium text-muted-foreground">Diện tích</span>
                    <p className="text-sm sm:text-base font-bold text-foreground">
                      {data.areaM2} m²
                    </p>
                    <span className="text-[10px] text-muted-foreground">Sử dụng thực tế</span>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <span className="text-[11px] font-medium text-muted-foreground">Đặt cọc</span>
                    <p className="text-sm font-bold text-foreground">
                      {data.pricing?.depositType === "FIXED_AMOUNT"
                        ? `${formatCurrency(Number(data.pricing.depositAmount || 0))} ₫`
                        : data.pricing?.depositType === "MONTH_COUNT"
                        ? `${data.pricing.depositMonths} tháng`
                        : "Thỏa thuận"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">Hình thức cọc</span>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <span className="text-[11px] font-medium text-muted-foreground">Vào ở từ</span>
                    <p className="text-sm font-bold text-foreground">
                      {data.availableFrom}
                    </p>
                    <span className="text-[10px] text-muted-foreground">Thời điểm bàn giao</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Mô tả chi tiết
                </h3>
                <p className="whitespace-pre-line text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {data.description}
                </p>
              </div>

              {/* Details Category Specific */}
              {data.apartmentDetail && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Thông tin căn hộ
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Dự án:</span>{" "}
                      <span className="font-semibold text-foreground">{data.apartmentDetail.projectName}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Tầng:</span>{" "}
                      <span className="font-semibold text-foreground">{data.apartmentDetail.floorNumber}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Phòng ngủ:</span>{" "}
                      <span className="font-semibold text-foreground">{data.apartmentDetail.bedroomCount} PN</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Phòng tắm / WC:</span>{" "}
                      <span className="font-semibold text-foreground">{data.apartmentDetail.bathroomCount} WC</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Nội thất:</span>{" "}
                      <span className="font-semibold text-foreground">{data.apartmentDetail.furnishingStatus}</span>
                    </div>
                  </div>
                </div>
              )}

              {data.houseDetail && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Thông tin nhà nguyên căn
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Tổng số tầng:</span>{" "}
                      <span className="font-semibold text-foreground">{data.houseDetail.totalFloors} tầng</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Phòng ngủ:</span>{" "}
                      <span className="font-semibold text-foreground">{data.houseDetail.bedroomCount} PN</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Phòng tắm / WC:</span>{" "}
                      <span className="font-semibold text-foreground">{data.houseDetail.bathroomCount} WC</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Garage để xe:</span>{" "}
                      <span className="font-semibold text-foreground">{data.houseDetail.hasGarage ? "Có" : "Không"}</span>
                    </div>
                  </div>
                </div>
              )}

              {data.officeDetail && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Thông tin văn phòng
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    {data.officeDetail.buildingName && (
                      <div className="p-2 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground">Tòa nhà:</span>{" "}
                        <span className="font-semibold text-foreground">{data.officeDetail.buildingName}</span>
                      </div>
                    )}
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Hạng văn phòng:</span>{" "}
                      <span className="font-semibold text-foreground">{data.officeDetail.officeGrade}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Số WC:</span>{" "}
                      <span className="font-semibold text-foreground">{data.officeDetail.restroomCount ?? "Tiêu chuẩn"}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Giờ hoạt động:</span>{" "}
                      <span className="font-semibold text-foreground">
                        {data.officeDetail.operatingMode === "ALWAYS_OPEN" ? "24/7" : "Theo khung giờ"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Amenities */}
              {data.amenities && data.amenities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tiện ích sẵn có
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.amenities.map((item) => (
                      <span
                        key={item.code}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Charges */}
              {data.charges && data.charges.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Chi phí hàng tháng
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.charges.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border p-2.5 text-xs bg-muted/20"
                      >
                        <span className="font-medium text-foreground">
                          {c.chargeType === "ELECTRICITY"
                            ? "Tiền điện"
                            : c.chargeType === "WATER"
                            ? "Tiền nước"
                            : c.chargeType === "MANAGEMENT"
                            ? "Phí quản lý"
                            : c.chargeType === "INTERNET"
                            ? "Internet"
                            : c.chargeType === "SERVICE_OR_GARBAGE"
                            ? "Rác / Vệ sinh"
                            : c.chargeType === "MOTORBIKE_PARKING"
                            ? "Gửi xe máy"
                            : c.chargeType === "CAR_PARKING"
                            ? "Gửi ô tô"
                            : c.customName || "Phí khác"}
                        </span>
                        <span className="font-bold text-primary">
                          {c.includedInRent
                            ? "Đã bao gồm"
                            : c.amount != null
                            ? `${formatCurrency(Number(c.amount))} ₫ ${c.unit ? `/${c.unit}` : ""}`
                            : "Thỏa thuận"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viewing Schedule */}
              {((data.viewingDays && data.viewingDays.length > 0) ||
                (data.viewingSlots && data.viewingSlots.length > 0)) && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/15 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Lịch sẵn sàng tiếp khách xem nhà
                  </h3>
                  {data.viewingDays && data.viewingDays.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Ngày trong tuần:</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {data.viewingDays.map((day) => {
                          const dayLabel: Record<string, string> = {
                            MONDAY: "Thứ 2",
                            TUESDAY: "Thứ 3",
                            WEDNESDAY: "Thứ 4",
                            THURSDAY: "Thứ 5",
                            FRIDAY: "Thứ 6",
                            SATURDAY: "Thứ 7",
                            SUNDAY: "Chủ nhật",
                          };
                          return (
                            <span
                              key={day}
                              className="rounded-lg bg-card px-2.5 py-1 text-xs font-semibold text-foreground border border-border shadow-2xs"
                            >
                              {dayLabel[day] || day}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {data.viewingSlots && data.viewingSlots.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Khung giờ tiếp khách:</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {data.viewingSlots.map((slot) => {
                          const slotLabel: Record<string, string> = {
                            MORNING: "Buổi sáng (08:00 – 12:00)",
                            AFTERNOON: "Buổi chiều (13:00 – 17:00)",
                            EVENING: "Buổi tối (18:00 – 21:00)",
                          };
                          return (
                            <span
                              key={slot}
                              className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20"
                            >
                              {slotLabel[slot] || slot}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
