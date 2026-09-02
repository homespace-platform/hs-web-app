"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import appointmentService from "@/services/appointment.service";
import type {
  AppointmentResponse,
  AppointmentStatus,
} from "@/types/appointment.type";
import AppointmentCardCompact from "@/components/appointment/AppointmentCardCompact";
import AppointmentDetailModal from "@/components/appointment/AppointmentDetailModal";
import AppointmentDateFilter from "@/components/appointment/AppointmentDateFilter";

const STATUS_TABS: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Tất cả", value: "ALL", icon: Calendar },
  { label: "Chờ xác nhận", value: "PENDING", icon: Clock },
  { label: "Đã xác nhận", value: "CONFIRMED", icon: CheckCircle2 },
  { label: "Đã hoàn thành", value: "COMPLETED", icon: CalendarCheck },
  { label: "Đã hủy", value: "CANCELLED", icon: XCircle },
  { label: "Đã từ chối", value: "REJECTED", icon: XCircle },
];

export default function ViewingSchedulesHostPage() {
  const { authenticated, login } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal Chi Tiết
  const [detailAppointment, setDetailAppointment] = useState<AppointmentResponse | null>(null);

  // Dialog Xử Lý Thao Tác (Approve, Reject, Cancel, Complete, Reject Reschedule)
  const [activeDialog, setActiveDialog] = useState<{
    type: "APPROVE" | "REJECT" | "CANCEL" | "REJECT_RESCHEDULE" | null;
    apt: AppointmentResponse | null;
  }>({ type: null, apt: null });
  const [dialogInput, setDialogInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Tải danh sách lịch tiếp khách của chủ nhà
  const fetchAppointments = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const res = await appointmentService.getOwnerAppointments({
        status: statusFilter,
        date: selectedDateFilter,
        page: currentPage,
        size: 10,
      });
      setAppointments(res.result || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);

      // Tải counts
      const counts = await appointmentService.getOwnerAppointmentCounts();
      setStatusCounts(counts);
    } catch (err: any) {
      console.error("Lỗi khi tải lịch tiếp khách:", err);
      toast.error("Không thể tải danh sách lịch tiếp khách.");
    } finally {
      setLoading(false);
    }
  }, [authenticated, statusFilter, selectedDateFilter, currentPage]);

  useEffect(() => {
    if (authenticated) {
      fetchAppointments();
    }
  }, [authenticated, fetchAppointments]);

  // Reset trang về 1 khi đổi bộ lọc
  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleDateChange = (date?: string) => {
    setSelectedDateFilter(date);
    setCurrentPage(1);
  };

  // Mở Dialog thao tác
  const openActionDialog = (
    apt: AppointmentResponse,
    type: "APPROVE" | "REJECT" | "CANCEL" | "REJECT_RESCHEDULE"
  ) => {
    setActiveDialog({ type, apt });
    setDialogInput("");
  };

  const closeActionDialog = () => {
    setActiveDialog({ type: null, apt: null });
    setDialogInput("");
  };

  // 2. Xử lý Chấp nhận lịch hẹn (Approve)
  const handleConfirmApprove = async () => {
    if (!activeDialog.apt) return;
    setActionLoading(true);
    try {
      await appointmentService.approveAppointment(activeDialog.apt.id, dialogInput.trim() || undefined);
      toast.success("Đã chấp nhận lịch xem nhà! Khung giờ này đã được khóa lại.");
      closeActionDialog();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể chấp nhận lịch hẹn.");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Xử lý Từ chối lịch hẹn (Reject)
  const handleConfirmReject = async () => {
    if (!activeDialog.apt) return;
    if (!dialogInput.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setActionLoading(true);
    try {
      await appointmentService.rejectAppointment(activeDialog.apt.id, dialogInput.trim());
      toast.success("Đã từ chối lịch xem nhà.");
      closeActionDialog();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể từ chối lịch hẹn.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Xử lý Hủy lịch hẹn (Cancel by Owner)
  const handleConfirmCancel = async () => {
    if (!activeDialog.apt) return;
    if (!dialogInput.trim()) {
      toast.error("Vui lòng nhập lý do hủy lịch");
      return;
    }
    setActionLoading(true);
    try {
      await appointmentService.cancelByOwner(activeDialog.apt.id, dialogInput.trim());
      toast.success("Đã hủy lịch hẹn xem nhà.");
      closeActionDialog();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể hủy lịch hẹn.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Xử lý Hoàn thành (Complete)
  const handleComplete = async (apt: AppointmentResponse) => {
    try {
      await appointmentService.completeAppointment(apt.id);
      toast.success("Đã đánh dấu hoàn thành buổi xem nhà!");
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể đánh dấu hoàn thành.");
    }
  };

  // 6. Xử lý Đồng ý Đổi lịch
  const handleApproveReschedule = async (apt: AppointmentResponse) => {
    try {
      await appointmentService.approveReschedule(apt.id);
      toast.success("Đã chấp nhận thời gian hẹn mới của khách!");
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể chấp nhận đổi lịch.");
    }
  };

  // 7. Xử lý Từ chối Đổi lịch
  const handleConfirmRejectReschedule = async () => {
    if (!activeDialog.apt) return;
    if (!dialogInput.trim()) {
      toast.error("Vui lòng nhập lý do từ chối yêu cầu đổi lịch");
      return;
    }
    setActionLoading(true);
    try {
      await appointmentService.rejectReschedule(activeDialog.apt.id, dialogInput.trim());
      toast.success("Đã từ chối yêu cầu đổi lịch của khách.");
      closeActionDialog();
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể từ chối đổi lịch.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <Calendar className="w-12 h-12 text-muted-foreground animate-pulse" />
        <h2 className="text-lg font-bold text-foreground">Bạn cần đăng nhập</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vui lòng đăng nhập tài khoản chủ nhà để quản lý lịch hẹn tiếp khách xem nhà.
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
            <span>Lịch tiếp khách (Chủ nhà)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Quản lý các yêu cầu đặt lịch xem nhà từ khách thuê gửi đến bài đăng của bạn.
          </p>
        </div>

        {/* Nút Làm mới */}
        <button
          type="button"
          onClick={fetchAppointments}
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
          const count =
            tab.value === "ALL"
              ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
              : statusCounts[tab.value] ?? 0;

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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Danh Sách Lịch Hẹn (Compact Cards) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 text-muted-foreground">
          <RefreshCw className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs">Đang tải danh sách lịch tiếp khách...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border space-y-3 shadow-2xs">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Không có lịch hẹn nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedDateFilter
              ? "Không tìm thấy lịch hẹn nào trong ngày đã chọn. Thử chọn ngày khác hoặc xem tất cả."
              : "Hiện chưa có khách hàng nào đặt lịch xem các bất động sản của bạn."}
          </p>
          {selectedDateFilter && (
            <button
              type="button"
              onClick={() => setSelectedDateFilter(undefined)}
              className="px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all cursor-pointer"
            >
              Xem tất cả ngày
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <AppointmentCardCompact
              key={apt.id}
              appointment={apt}
              viewRole="OWNER"
              onViewDetail={(item) => setDetailAppointment(item)}
              onQuickApprove={(item) => openActionDialog(item, "APPROVE")}
              onQuickReject={(item) => openActionDialog(item, "REJECT")}
              onQuickComplete={(item) => handleComplete(item)}
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
        viewRole="OWNER"
        onApprove={(apt) => openActionDialog(apt, "APPROVE")}
        onReject={(apt) => openActionDialog(apt, "REJECT")}
        onComplete={(apt) => handleComplete(apt)}
        onCancel={(apt) => openActionDialog(apt, "CANCEL")}
        onApproveReschedule={(apt) => handleApproveReschedule(apt)}
        onRejectReschedule={(apt) => openActionDialog(apt, "REJECT_RESCHEDULE")}
      />

      {/* 7. Dialog Nhập Lý Do / Lời Dặn (Approve, Reject, Cancel, Reject Reschedule) */}
      {activeDialog.type && activeDialog.apt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground">
              {activeDialog.type === "APPROVE" && "Chấp nhận lịch hẹn xem nhà"}
              {activeDialog.type === "REJECT" && "Từ chối lịch hẹn"}
              {activeDialog.type === "CANCEL" && "Hủy lịch hẹn đã xác nhận"}
              {activeDialog.type === "REJECT_RESCHEDULE" && "Từ chối yêu cầu đổi lịch"}
            </h3>

            <p className="text-xs text-muted-foreground">
              {activeDialog.type === "APPROVE" &&
                "Khung giờ này sẽ được khóa lại đối với các khách khác. Bạn có thể để lại lời dặn dò cho khách thuê nếu cần (chỗ để xe, người mở cửa...):"}
              {activeDialog.type === "REJECT" &&
                "Vui lòng nhập lý do từ chối để khách thuê nắm được thông tin:"}
              {activeDialog.type === "CANCEL" &&
                "Vui lòng nhập lý do hủy lịch hẹn để thông báo đến khách thuê:"}
              {activeDialog.type === "REJECT_RESCHEDULE" &&
                "Vui lòng nhập lý do từ chối đổi thời gian mới:"}
            </p>

            <textarea
              rows={3}
              required={activeDialog.type !== "APPROVE"}
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder={
                activeDialog.type === "APPROVE"
                  ? "Ví dụ: Đến nơi gọi tôi theo số này để mở cổng nhé..."
                  : "Nhập lý do cụ thể..."
              }
              className="w-full p-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeActionDialog}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={
                  activeDialog.type === "APPROVE"
                    ? handleConfirmApprove
                    : activeDialog.type === "REJECT"
                    ? handleConfirmReject
                    : activeDialog.type === "CANCEL"
                    ? handleConfirmCancel
                    : handleConfirmRejectReschedule
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                  activeDialog.type === "APPROVE"
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-destructive hover:bg-destructive/90"
                }`}
              >
                {actionLoading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
