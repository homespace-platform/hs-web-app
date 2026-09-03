"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Info,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { format, getDay, isBefore, startOfDay, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "@/features/auth/useAuth";
import appointmentService from "@/services/appointment.service";
import type {
  AppointmentResponse,
  AvailabilitySlot,
  ListingAvailabilityResponse,
} from "@/types/appointment.type";
import { Calendar } from "@/components/ui/calendar";

interface BookingAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingAddress?: string;
  listingPrice?: number;
  listingThumbnail?: string | null;
  ownerId?: string;
}

const formatVND = (price: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/");
}

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return format(date, "EEEE, dd/MM/yyyy", { locale: vi });
  } catch {
    return dateStr;
  }
}

const DAY_OF_WEEK_LABELS: Record<string, string> = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

const DAY_NUM_TO_ENUM: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export default function BookingAppointmentModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  listingAddress,
  listingPrice,
  listingThumbnail,
  ownerId,
}: BookingAppointmentModalProps) {
  const router = useRouter();
  const { authenticated, login, profile } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingAppointment, setExistingAppointment] = useState<AppointmentResponse | null>(null);
  const [availability, setAvailability] = useState<ListingAvailabilityResponse | null>(null);

  // Ngày được chọn dạng Date Object
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Slot được chọn
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Form thông tin khách
  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [visitorCount, setVisitorCount] = useState(1);
  const [renterNote, setRenterNote] = useState("");

  // Chế độ đổi lịch (Reschedule mode)
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Modal hủy lịch
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Tự động điền thông tin người dùng từ profile
  useEffect(() => {
    if (profile) {
      const fullName = [profile.lastName, profile.firstName].filter(Boolean).join(" ").trim();
      setRenterName(fullName || profile.username || "");
      if (profile.phone) setRenterPhone(profile.phone);
    }
  }, [profile]);

  // Chuỗi ngày YYYY-MM-DD theo giờ địa phương
  const formattedDateStr = useMemo(() => {
    return format(selectedDate, "yyyy-MM-dd");
  }, [selectedDate]);

  // Tải thông tin lịch hẹn và danh sách slot khả dụng khi mở modal hoặc đổi ngày
  useEffect(() => {
    if (!isOpen || !listingId) return;

    async function loadData() {
      setLoading(true);
      try {
        if (authenticated) {
          const booking = await appointmentService.getMyBookingByListing(listingId);
          setExistingAppointment(booking);
        }
        const avail = await appointmentService.getAvailability(listingId, formattedDateStr);
        setAvailability(avail);

        // Nếu ngày hiện tại không nằm trong danh sách ngày chủ nhà tiếp khách, tự động chọn ngày hợp lệ tiếp theo
        if (avail?.allowedViewingDays && avail.allowedViewingDays.length > 0) {
          const currentDayEnum = DAY_NUM_TO_ENUM[getDay(selectedDate)];
          if (!avail.allowedViewingDays.includes(currentDayEnum)) {
            let nextDay = new Date();
            for (let i = 0; i < 14; i++) {
              const testDate = addDays(new Date(), i);
              const testEnum = DAY_NUM_TO_ENUM[getDay(testDate)];
              if (avail.allowedViewingDays.includes(testEnum)) {
                nextDay = testDate;
                break;
              }
            }
            setSelectedDate(nextDay);
          }
        }
      } catch (err: any) {
        console.error("Failed to load appointment data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, listingId, formattedDateStr, authenticated]);

  // Nhóm các slot trong ngày được chọn theo Ca (Sáng / Chiều / Tối)
  const groupedSlots = useMemo(() => {
    if (!availability?.slots) return { morning: [], afternoon: [], evening: [] };
    const morning = availability.slots.filter((s) => s.slotType === "MORNING");
    const afternoon = availability.slots.filter((s) => s.slotType === "AFTERNOON");
    const evening = availability.slots.filter((s) => s.slotType === "EVENING");
    return { morning, afternoon, evening };
  }, [availability?.slots]);

  // Xử lý gửi Đặt lịch mới
  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!authenticated) {
      toast.error("Vui lòng đăng nhập để đặt lịch xem nhà");
      login();
      return;
    }

    if (!selectedSlot) {
      toast.error("Vui lòng chọn khung giờ xem nhà");
      return;
    }

    if (!renterName.trim()) {
      toast.error("Vui lòng nhập họ và tên của bạn");
      return;
    }

    if (!renterPhone.trim()) {
      toast.error("Vui lòng nhập số điện thoại liên hệ");
      return;
    }

    setSubmitting(true);
    try {
      const created = await appointmentService.createAppointment({
        listingId,
        appointmentDate: formattedDateStr,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        renterName: renterName.trim(),
        renterPhone: renterPhone.trim(),
        visitorCount,
        renterNote: renterNote.trim() || undefined,
      });
      toast.success("Gửi yêu cầu đặt lịch thành công! Vui lòng chờ chủ nhà xác nhận.");
      onClose();
      router.push("/dashboard/viewing-schedules/my-bookings");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Không thể đặt lịch. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Xử lý gửi Yêu cầu đổi lịch (Reschedule)
  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!existingAppointment) return;

    if (!selectedSlot) {
      toast.error("Vui lòng chọn khung giờ mới bạn muốn đổi sang");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await appointmentService.requestReschedule(existingAppointment.id, {
        proposedDate: formattedDateStr,
        proposedStartTime: selectedSlot.startTime,
        proposedEndTime: selectedSlot.endTime,
        rescheduleReason: rescheduleReason.trim() || undefined,
      });
      toast.success("Đã gửi yêu cầu đổi lịch đến chủ nhà!");
      onClose();
      router.push("/dashboard/viewing-schedules/my-bookings");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Không thể đổi lịch. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Xử lý Hủy lịch hẹn
  async function handleCancelAppointment() {
    if (!existingAppointment) return;

    setSubmitting(true);
    try {
      await appointmentService.cancelByRenter(existingAppointment.id, cancelReason);
      toast.success("Đã hủy lịch xem nhà thành công");
      setExistingAppointment(null);
      setShowCancelConfirm(false);
      setIsRescheduleMode(false);
      // Tải lại khung giờ khả dụng
      const avail = await appointmentService.getAvailability(listingId, formattedDateStr);
      setAvailability(avail);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Không thể hủy lịch. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs overflow-y-auto animate-in fade-in-50 duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isRescheduleMode ? "Yêu cầu đổi lịch xem nhà" : "Đặt lịch xem nhà"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Hẹn gặp trực tiếp chủ nhà tại bất động sản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 no-scrollbar">
          {/* Thông tin bài đăng ngắn gọn */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-muted/40 border border-border">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
              {isValidImageUrl(listingThumbnail) ? (
                <Image
                  src={listingThumbnail!}
                  alt={listingTitle || "Ảnh tin đăng"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  Ảnh
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                {listingTitle}
              </h4>
              {listingAddress && (
                <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {listingAddress}
                </p>
              )}
              {listingPrice && (
                <p className="text-xs sm:text-sm font-bold text-primary mt-1">
                  {formatVND(listingPrice)} / tháng
                </p>
              )}
            </div>
          </div>

          {/* TRƯỜNG HỢP 1: KHÁCH ĐÃ CÓ LỊCH HẸN VÀ KHÔNG Ở CHẾ ĐỘ ĐỔI LỊCH */}
          {existingAppointment &&
            !isRescheduleMode &&
            ["PENDING", "CONFIRMED"].includes(existingAppointment.status) && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Lịch hẹn hiện tại của bạn
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${existingAppointment.status === "CONFIRMED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                    >
                      {existingAppointment.status === "CONFIRMED" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Chủ nhà đã xác nhận</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Chờ chủ nhà xác nhận</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Ngày xem</p>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          {formatDateLabel(existingAppointment.appointmentDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">Khung giờ</p>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          {existingAppointment.startTime.slice(0, 5)} –{" "}
                          {existingAppointment.endTime.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {existingAppointment.ownerNote && (
                    <div className="p-3 rounded-xl bg-card border border-border flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">Lời dặn từ chủ nhà:</p>
                        <p className="text-muted-foreground mt-0.5">
                          {existingAppointment.ownerNote}
                        </p>
                      </div>
                    </div>
                  )}

                  {existingAppointment.rescheduleRequested && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Đang chờ chủ nhà duyệt yêu cầu đổi lịch:
                      </p>
                      <p className="text-muted-foreground">
                        Ngày mới đề xuất:{" "}
                        <strong className="text-foreground">
                          {formatDateLabel(existingAppointment.proposedDate)}
                        </strong>{" "}
                        lúc{" "}
                        <strong className="text-foreground">
                          {existingAppointment.proposedStartTime?.slice(0, 5)} –{" "}
                          {existingAppointment.proposedEndTime?.slice(0, 5)}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Các nút thao tác đối với lịch hiện tại */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  {!existingAppointment.rescheduleRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRescheduleMode(true);
                        setSelectedSlot(null);
                      }}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl border-2 border-primary text-primary hover:bg-primary/5 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                    >
                      Yêu cầu đổi ngày / giờ khác
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    Hủy lịch hẹn
                  </button>
                </div>

                {/* Nút Xem tất cả lịch hẹn của tôi */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/dashboard/viewing-schedules/my-bookings");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Xem tất cả lịch hẹn của bạn</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Hộp xác nhận hủy lịch */}
                {showCancelConfirm && (
                  <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3 animate-in fade-in-50 duration-150">
                    <p className="text-xs font-semibold text-destructive">
                      Bạn có chắc chắn muốn hủy lịch hẹn này?
                    </p>
                    <input
                      type="text"
                      placeholder="Nhập lý do hủy (tùy chọn)..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        Quay lại
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleCancelAppointment}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {submitting ? "Đang hủy..." : "Xác nhận hủy lịch"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* TRƯỜNG HỢP 2: ĐẶT LỊCH MỚI HOẶC ĐANG TRONG CHẾ ĐỘ ĐỔI LỊCH */}
          {(!existingAppointment ||
            !["PENDING", "CONFIRMED"].includes(existingAppointment.status) ||
            isRescheduleMode) && (
              <form
                onSubmit={isRescheduleMode ? handleRescheduleSubmit : handleBookAppointment}
                className="space-y-6"
              >
                {/* Thông báo nếu đang ở chế độ đổi lịch */}
                {isRescheduleMode && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <RefreshCw className="w-4 h-4" />
                      <span>Đang chọn lại thời gian mới để gửi chủ nhà xét duyệt</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRescheduleMode(false);
                        setSelectedSlot(null);
                      }}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground underline"
                    >
                      Hủy đổi
                    </button>
                  </div>
                )}

                {/* BƯỚC 1: CHỌN NGÀY XEM NHÀ - DÙNG THƯ VIỆN LỊCH CHUYÊN DỤNG */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      <span>1. Chọn ngày xem nhà</span>
                      <span className="text-destructive">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Chủ nhà tiếp khách vào:{" "}
                      <strong className="text-foreground">
                        {availability?.allowedViewingDays?.length
                          ? availability.allowedViewingDays
                            .map((d) => DAY_OF_WEEK_LABELS[d] || d)
                            .join(", ")
                          : "Tất cả các ngày"}
                      </strong>
                    </span>
                  </div>

                  {/* Calendar Thư viện React-Day-Picker */}
                  <div className="rounded-2xl border border-border bg-card p-2 sm:p-3 shadow-2xs">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }
                      }}
                      disabled={[
                        { before: startOfDay(new Date()) },
                        (date) => {
                          if (
                            !availability?.allowedViewingDays ||
                            availability.allowedViewingDays.length === 0
                          ) {
                            return false;
                          }
                          const dayEnum = DAY_NUM_TO_ENUM[getDay(date)];
                          return !availability.allowedViewingDays.includes(dayEnum);
                        },
                      ]}
                    />

                    {/* Thanh thông báo ngày đang chọn */}
                    <div className="mt-2 pt-2.5 border-t border-border flex items-center justify-between px-2 text-xs">
                      <span className="text-muted-foreground">Ngày đã chọn:</span>
                      <span className="font-bold text-primary flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" />
                        {format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BƯỚC 2: CHỌN KHUNG GIỜ */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>2. Chọn khung giờ (1 tiếng / lượt)</span>
                      <span className="text-destructive">*</span>
                    </label>
                    {selectedSlot && (
                      <span className="text-xs font-bold text-primary">
                        Đã chọn: {selectedSlot.startTime.slice(0, 5)} – {selectedSlot.endTime.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      <span>Đang tải khung giờ khả dụng cho ngày {format(selectedDate, "dd/MM/yyyy")}...</span>
                    </div>
                  ) : !availability?.isDayAvailable ? (
                    <div className="p-6 rounded-2xl bg-muted/40 border border-border text-center text-xs text-muted-foreground">
                      Chủ nhà không tiếp khách vào ngày này. Vui lòng chọn một ngày khác trên lịch.
                    </div>
                  ) : availability.slots.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-muted/40 border border-border text-center text-xs text-muted-foreground">
                      Không có khung giờ nào khả dụng cho ngày này.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Ca Sáng */}
                      {groupedSlots.morning.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                            <span>Buổi sáng (08:00 – 12:00)</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {groupedSlots.morning.map((slot) => renderSlotButton(slot))}
                          </div>
                        </div>
                      )}

                      {/* Ca Chiều */}
                      {groupedSlots.afternoon.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                            <Sunset className="w-3.5 h-3.5 text-orange-500" />
                            <span>Buổi chiều (13:00 – 17:00)</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {groupedSlots.afternoon.map((slot) => renderSlotButton(slot))}
                          </div>
                        </div>
                      )}

                      {/* Ca Tối */}
                      {groupedSlots.evening.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                            <Moon className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Buổi tối (17:00 – 21:00)</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {groupedSlots.evening.map((slot) => renderSlotButton(slot))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* BƯỚC 3: THÔNG TIN KHÁCH HÀNG LIÊN HỆ */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>3. Thông tin người đi xem</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Họ và tên <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={renterName}
                          onChange={(e) => setRenterName(e.target.value)}
                          placeholder="Nhập họ và tên của bạn..."
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Số điện thoại <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          value={renterPhone}
                          onChange={(e) => setRenterPhone(e.target.value)}
                          placeholder="Số điện thoại nhận xác nhận..."
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>

                  {/* Số lượng người tham quan */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border">
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-foreground">Số người cùng tham quan</p>
                        <p className="text-[11px] text-muted-foreground">
                          Bao gồm cả bạn và người thân / bạn bè
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setVisitorCount((c) => Math.max(1, c - 1))}
                        className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center font-bold text-sm hover:bg-muted cursor-pointer"
                      >
                        –
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-foreground">
                        {visitorCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVisitorCount((c) => Math.min(10, c + 1))}
                        className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center font-bold text-sm hover:bg-muted cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Ghi chú hoặc lý do đổi lịch */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>
                        {isRescheduleMode ? "Lý do xin đổi lịch hẹn" : "Ghi chú gửi chủ nhà"}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        Tối đa 500 ký tự
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={isRescheduleMode ? rescheduleReason : renterNote}
                      onChange={(e) =>
                        isRescheduleMode
                          ? setRescheduleReason(e.target.value)
                          : setRenterNote(e.target.value)
                      }
                      placeholder={
                        isRescheduleMode
                          ? "Ví dụ: Em có việc đột xuất vào giờ cũ, muốn xin dời sang khung giờ này..."
                          : "Ví dụ: Tôi muốn hỏi thêm về chỗ để ô tô, khoảng cách ra bến xe..."
                      }
                      className="w-full p-3 rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>
                </div>

                {/* Action Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !selectedSlot}
                    className="w-full py-3.5 px-6 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    {submitting ? (
                      <span>Đang gửi yêu cầu...</span>
                    ) : isRescheduleMode ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Gửi yêu cầu đổi lịch hẹn</span>
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-4 h-4" />
                        <span>Xác nhận đặt lịch xem nhà</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
        </div>
      </div>
    </div>
  );

  // Helper render button cho từng slot
  function renderSlotButton(slot: AvailabilitySlot) {
    const isSelected =
      selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime;
    const isLocked = slot.status === "LOCKED";
    const isUnavailable = slot.status === "UNAVAILABLE";
    const isPendingYou = slot.status === "PENDING_YOU";
    const isConfirmedYou = slot.status === "CONFIRMED_YOU";

    const disabled = isLocked || isUnavailable || isPendingYou || isConfirmedYou;

    let statusText = "Còn trống";
    let badgeClass = "text-emerald-600 dark:text-emerald-400";
    if (isLocked) {
      statusText = "Đã có người đặt";
      badgeClass = "text-destructive font-semibold";
    } else if (isUnavailable) {
      statusText = "Không khả dụng";
      badgeClass = "text-muted-foreground";
    } else if (isPendingYou) {
      statusText = "Bạn đang chờ duyệt";
      badgeClass = "text-amber-600 dark:text-amber-400 font-semibold";
    } else if (isConfirmedYou) {
      statusText = "Lịch của bạn";
      badgeClass = "text-primary font-bold";
    }

    return (
      <button
        key={`${slot.startTime}-${slot.endTime}`}
        type="button"
        disabled={disabled}
        onClick={() => setSelectedSlot(slot)}
        className={`p-2.5 rounded-xl border text-left flex flex-col items-start transition-all cursor-pointer ${isSelected
            ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 scale-[1.02]"
            : disabled
              ? "bg-muted/40 border-border/80 opacity-50 cursor-not-allowed"
              : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-muted/30"
          }`}
      >
        <span className="text-xs font-bold">
          {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
        </span>
        <span
          className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? "text-primary-foreground/90 font-medium" : badgeClass
            }`}
        >
          {statusText}
        </span>
      </button>
    );
  }
}
