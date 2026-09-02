"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import appointmentService from "@/services/appointment.service";
import type {
  AppointmentResponse,
} from "@/types/appointment.type";
import AppointmentCardCompact from "@/components/appointment/AppointmentCardCompact";
import AppointmentDetailModal from "@/components/appointment/AppointmentDetailModal";
import AppointmentDateFilter from "@/components/appointment/AppointmentDateFilter";
import BookingAppointmentModal from "@/components/appointment/BookingAppointmentModal";

const STATUS_TABS: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Tất cả", value: "ALL", icon: Calendar },
  { label: "Chờ xác nhận", value: "PENDING", icon: Clock },
  { label: "Đã xác nhận", value: "CONFIRMED", icon: CheckCircle2 },
  { label: "Đã hoàn thành", value: "COMPLETED", icon: CalendarCheck },
  { label: "Đã hủy", value: "CANCELLED", icon: XCircle },
  { label: "Đã từ chối", value: "REJECTED", icon: XCircle },
];

export default function MyViewingBookingsPage() {
  const { authenticated, login } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal Chi Tiết
  const [detailAppointment, setDetailAppointment] = useState<AppointmentResponse | null>(null);

  // Modal Đổi lịch
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentResponse | null>(null);

  // Dialog Hủy Lịch
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponse | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // 1. Tải danh sách lịch tôi đi xem
  const fetchMyBookings = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const res = await appointmentService.getMyBookings({
        status: statusFilter,
        date: selectedDateFilter,
        page: currentPage,
        size: 10,
      });
      setAppointments(res.result || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error("Lỗi khi tải lịch đi xem:", err);
      toast.error("Không thể tải danh sách lịch đi xem.");
    } finally {
      setLoading(false);
    }
  }, [authenticated, statusFilter, selectedDateFilter, currentPage]);

  useEffect(() => {
    if (authenticated) {
      fetchMyBookings();
    }
  }, [authenticated, fetchMyBookings]);

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleDateChange = (date?: string) => {
    setSelectedDateFilter(date);
    setCurrentPage(1);
  };

  // 2. Xử lý Hủy lịch hẹn bởi khách
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await appointmentService.cancelByRenter(cancelTarget.id, cancelReason.trim() || undefined);
      toast.success("Đã hủy lịch xem nhà thành công.");
      setCancelTarget(null);
      setCancelReason("");
      fetchMyBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể hủy lịch hẹn.");
    } finally {
      setCancelling(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <Calendar className="w-12 h-12 text-muted-foreground animate-pulse" />
        <h2 className="text-lg font-bold text-foreground">Bạn cần đăng nhập</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vui lòng đăng nhập để theo dõi danh sách lịch hẹn xem nhà bạn đã đăng ký.
        </p>
        <button
          type="button"
          onClick={login}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-all cursor-pointer"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-primary" />
            <span>Lịch tôi đi xem (Khách thuê)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Theo dõi các lịch hẹn xem nhà bạn đã đăng ký trực tiếp với các chủ nhà.
          </p>
        </div>

        {/* Nút Làm mới */}
        <button
          type="button"
          onClick={fetchMyBookings}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Bộ Lọc Theo Ngày (Date Filter) */}
      <AppointmentDateFilter
        selectedDate={selectedDateFilter}
        onSelectDate={handleDateChange}
      />

      {/* 3. Bộ Lọc Theo Trạng Thái (Status Filter Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusChange(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0 ${
                isActive
                  ? "border-primary text-primary font-bold bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Danh Sách Lịch Hẹn (Compact Cards) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 text-muted-foreground">
          <RefreshCw className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs">Đang tải danh sách lịch đi xem của bạn...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border space-y-3 shadow-2xs">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Bạn chưa có lịch hẹn xem nhà nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedDateFilter
              ? "Không có lịch hẹn nào vào ngày đã chọn. Thử đổi ngày khác hoặc bấm xem tất cả."
              : "Khám phá các căn hộ đang cho thuê trên HomeSpace và đặt lịch xem nhà ngay."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter(undefined)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-bold transition-all cursor-pointer"
              >
                Xem tất cả ngày
              </button>
            )}
            <Link
              href="/rent"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
            >
              Khám phá nhà thuê
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <AppointmentCardCompact
              key={apt.id}
              appointment={apt}
              viewRole="RENTER"
              onViewDetail={(item) => setDetailAppointment(item)}
            />
          ))}
        </div>
      )}

      {/* 5. Phân Trang (Pagination) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
          <span className="text-muted-foreground">
            Tổng cộng: <strong className="text-foreground">{totalElements}</strong> lịch hẹn
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Trước
            </button>
            <span className="px-3 py-1.5 font-semibold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal Xem Chi Tiết Lịch Hẹn */}
      <AppointmentDetailModal
        appointment={detailAppointment}
        isOpen={!!detailAppointment}
        onClose={() => setDetailAppointment(null)}
        viewRole="RENTER"
        onCancel={(apt) => {
          setCancelTarget(apt);
          setCancelReason("");
        }}
        onRequestReschedule={(apt) => {
          setRescheduleTarget(apt);
        }}
      />

      {/* 7. Modal Đổi Lịch (Sử dụng BookingAppointmentModal với prop listingId) */}
      {rescheduleTarget && (
        <BookingAppointmentModal
          isOpen={!!rescheduleTarget}
          onClose={() => {
            setRescheduleTarget(null);
            fetchMyBookings();
          }}
          listingId={rescheduleTarget.listingId}
          listingTitle={rescheduleTarget.listingTitle}
          listingAddress={rescheduleTarget.listingAddress}
          listingPrice={rescheduleTarget.listingPrice ?? undefined}
          listingThumbnail={rescheduleTarget.listingThumbnail}
          ownerId={rescheduleTarget.ownerId}
        />
      )}

      {/* 8. Dialog Xác Nhận Hủy Lịch */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground">Hủy lịch xem nhà</h3>
            <p className="text-xs text-muted-foreground">
              Bạn có chắc chắn muốn hủy lịch hẹn xem nhà cho bài đăng{" "}
              <strong className="text-foreground">{cancelTarget.listingTitle}</strong>?
            </p>

            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy lịch (ví dụ: bận đột xuất, đã tìm được nhà khác...)"
              className="w-full p-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive resize-none"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-destructive hover:bg-destructive/90 transition-all cursor-pointer"
              >
                {cancelling ? "Đang hủy..." : "Xác nhận hủy lịch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
