"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  X,
  Home,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  FileText,
  DollarSign,
  Sparkles,
  Handshake,
} from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, addDays, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "@/features/auth/useAuth";
import rentalRequestService from "@/services/rental-request.service";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import type { DepositType } from "@/types/listing.type";
import { Calendar } from "@/components/ui/calendar";

interface RentalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingAddress?: string;
  listingPrice?: number;
  depositType?: DepositType;
  listingDepositAmount?: number | null;
  depositMonths?: number | null;
  listingThumbnail?: string | null;
  minimumLeaseMonths?: number;
  onSuccess?: (request: RentalRequestResponse) => void;
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
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export default function RentalRequestModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  listingAddress,
  listingPrice = 0,
  depositType,
  listingDepositAmount,
  depositMonths,
  listingThumbnail,
  minimumLeaseMonths = 6,
  onSuccess,
}: RentalRequestModalProps) {
  const { profile, username } = useAuth();

  // Form states
  const [moveInDate, setMoveInDate] = useState<Date>(() => addDays(new Date(), 3));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [leaseMonths, setLeaseMonths] = useState<number>(() =>
    Math.max(minimumLeaseMonths || 6, 12)
  );
  const [customMonthsInput, setCustomMonthsInput] = useState<string>("");
  const [occupantCount, setOccupantCount] = useState<number>(1);
  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [renterEmail, setRenterEmail] = useState("");
  const [renterNote, setRenterNote] = useState("");
  const [customDepositInput, setCustomDepositInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill user information from auth profile
  useEffect(() => {
    if (profile) {
      const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      if (fullName) setRenterName(fullName);
      else if (username) setRenterName(username);

      if (profile.phone) setRenterPhone(profile.phone);
      if (profile.email) setRenterEmail(profile.email);
    }
  }, [profile, username]);

  // Sinh danh sách 4 mốc chọn nhanh linh hoạt và thích ứng theo minimumLeaseMonths
  const quickLeaseOptions = useMemo(() => {
    const min = Math.max(Number(minimumLeaseMonths) || 1, 1);

    if (min <= 6) {
      // Trường hợp phổ biến (<= 6 tháng): 6, 12, 18, 24
      return [6, 12, 18, 24];
    } else if (min <= 12) {
      // Ví dụ min = 9 hoặc 12: 12, 24, 36, 48
      return [12, 24, 36, 48];
    } else if (min <= 24) {
      // Ví dụ min = 18 hoặc 24: min, 24, 36, 48
      const opts = [min, 24, 36, 48].filter((v, i, a) => a.indexOf(v) === i);
      while (opts.length < 4) {
        opts.push(opts[opts.length - 1] + 12);
      }
      return opts.slice(0, 4);
    } else {
      // Khi tối thiểu > 24 tháng (ví dụ 36, 60, 100 tháng...):
      // Option 1: đúng mốc tối thiểu
      // Option 2: min + 6 tháng
      // Option 3: min + 12 tháng (1 năm tiếp)
      // Option 4: min + 24 tháng (2 năm tiếp)
      return [min, min + 6, min + 12, min + 24];
    }
  }, [minimumLeaseMonths]);

  const formatLeaseLabel = (months: number) => {
    if (months < 12) return `${months} tháng`;
    const years = months / 12;
    if (Number.isInteger(years)) {
      return `${months} th (${years} năm)`;
    }
    return `${months} tháng`;
  };

  const formatDetailedDuration = (months: number) => {
    if (!months || months <= 0) return "0 tháng";
    if (months < 12) return `${months} tháng`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (m === 0) return `${y} năm (${months} tháng)`;
    return `${y} năm ${m} tháng (${months} tháng)`;
  };

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setMoveInDate(addDays(new Date(), 3));
      const min = Math.max(Number(minimumLeaseMonths) || 1, 1);
      const defaultLease = min > 12 ? min : 12;
      setLeaseMonths(defaultLease);
      setOccupantCount(1);
      setCustomMonthsInput(defaultLease > 24 ? String(defaultLease) : "");
      setRenterNote("");
      setIsDatePickerOpen(false);
      setCustomDepositInput(listingPrice ? new Intl.NumberFormat("vi-VN").format(listingPrice) : "");
    }
  }, [isOpen, minimumLeaseMonths, listingPrice]);

  // Calculate estimated end date
  const estimatedEndDate = useMemo(() => {
    if (!moveInDate || !leaseMonths) return null;
    return addMonths(moveInDate, leaseMonths);
  }, [moveInDate, leaseMonths]);

  // Xử lý tính toán tiền cọc ứng với từng loại cọc:
  // 1. NONE: Không đặt cọc (0 đ)
  // 2. FIXED_AMOUNT: Cọc theo số tiền cố định từ bài đăng
  // 3. MONTH_COUNT: Cọc theo số tháng (giá thuê * số tháng)
  // 4. NEGOTIABLE: Thỏa thuận (người dùng tự do nhập mức cọc mong muốn)
  const depositInfo = useMemo(() => {
    const rent = listingPrice || 0;

    // Suy luận loại cọc nếu bài đăng chưa cấu hình rõ ràng
    let type = depositType;
    if (!type) {
      if (listingDepositAmount != null && listingDepositAmount > 0) {
        type = "FIXED_AMOUNT";
      } else if (depositMonths != null && depositMonths > 0) {
        type = "MONTH_COUNT";
      } else {
        type = "FIXED_AMOUNT";
      }
    }

    if (type === "NONE") {
      return {
        type: "NONE" as const,
        label: "Không đặt cọc",
        badge: "Miễn phí đặt cọc",
        amount: 0,
        description: "Chủ nhà không yêu cầu đặt cọc cho bất động sản này.",
        isNegotiable: false,
      };
    }

    if (type === "MONTH_COUNT") {
      const months = depositMonths && depositMonths > 0 ? depositMonths : 1;
      const amt = rent * months;
      return {
        type: "MONTH_COUNT" as const,
        label: `Cọc ${months} tháng tiền nhà`,
        badge: `${months} tháng tiền nhà`,
        amount: amt,
        description: `${months} tháng x ${formatVND(rent)}`,
        isNegotiable: false,
      };
    }

    if (type === "FIXED_AMOUNT") {
      const amt = listingDepositAmount != null ? listingDepositAmount : rent;
      return {
        type: "FIXED_AMOUNT" as const,
        label: "Cọc theo số tiền",
        badge: "Cố định theo bài đăng",
        amount: amt,
        description: "Số tiền cọc cố định theo niêm yết của chủ nhà.",
        isNegotiable: false,
      };
    }

    // type === "NEGOTIABLE" (Thỏa thuận)
    let negotiatedAmt: number;
    if (customDepositInput === "") {
      negotiatedAmt = rent; // Gợi ý mặc định 1 tháng
    } else {
      const parsed = Number(customDepositInput.replace(/\D/g, ""));
      negotiatedAmt = isNaN(parsed) ? 0 : parsed;
    }

    return {
      type: "NEGOTIABLE" as const,
      label: "Tiền cọc thỏa thuận",
      badge: "Đề xuất theo thỏa thuận",
      amount: negotiatedAmt,
      description: "Chủ nhà chấp nhận thỏa thuận. Bạn có thể nhập mức tiền cọc đề xuất.",
      isNegotiable: true,
    };
  }, [depositType, listingDepositAmount, depositMonths, listingPrice, customDepositInput]);

  // Calculate estimated total initial payment
  const initialPayment = useMemo(() => {
    const rent = listingPrice || 0;
    const deposit = depositInfo.amount;
    return {
      monthlyRent: rent,
      deposit: deposit,
      total: rent + deposit,
    };
  }, [listingPrice, depositInfo.amount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!moveInDate) {
      toast.error("Vui lòng chọn ngày bắt đầu dọn vào");
      return;
    }

    if (isBefore(startOfDay(moveInDate), startOfDay(new Date()))) {
      toast.error("Ngày bắt đầu thuê không thể trong quá khứ");
      return;
    }

    if (!leaseMonths || leaseMonths < 1) {
      toast.error("Vui lòng chọn thời hạn thuê hợp lệ");
      return;
    }

    if (minimumLeaseMonths && leaseMonths < minimumLeaseMonths) {
      toast.error(`Thời hạn thuê tối thiểu cho căn này là ${minimumLeaseMonths} tháng`);
      return;
    }

    if (!occupantCount || occupantCount < 1) {
      toast.error("Vui lòng nhập số người dọn vào ở (tối thiểu 1 người)");
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

    setIsSubmitting(true);
    try {
      const created = await rentalRequestService.createRentalRequest({
        listingId,
        moveInDate: format(moveInDate, "yyyy-MM-dd"),
        leaseMonths,
        occupantCount,
        renterName: renterName.trim(),
        renterPhone: renterPhone.trim(),
        renterEmail: renterEmail.trim() || undefined,
        depositAmount: depositInfo.amount,
        renterNote: renterNote.trim() || undefined,
      });

      toast.success("Gửi yêu cầu thuê nhà thành công! Chủ nhà sẽ nhận được thông báo để xem xét.");
      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể gửi yêu cầu thuê nhà. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base sm:text-lg text-foreground">
                Gửi yêu cầu thuê nhà
              </h2>
              <p className="text-xs text-muted-foreground">
                Chủ nhà sẽ nhận được thông báo và giữ chỗ trong 24 giờ khi duyệt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT FORM */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 1. PROPERTY SUMMARY CARD */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
              {isValidImageUrl(listingThumbnail) ? (
                <Image
                  src={listingThumbnail!}
                  alt={listingTitle}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Home className="w-6 h-6 opacity-30" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1">
                {listingTitle}
              </h4>
              {listingAddress && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {listingAddress}
                </p>
              )}
              <p className="text-xs font-bold text-primary mt-1">
                {formatVND(listingPrice)}
                <span className="text-[10px] font-normal text-muted-foreground">/tháng</span>
              </p>
            </div>
          </div>

          {/* 2. CHỌN NGÀY BẮT ĐẦU DỌN VÀO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                <span>Ngày bắt đầu dọn vào</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                {format(moveInDate, "EEEE, dd/MM/yyyy", { locale: vi })}
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-input bg-background hover:bg-muted/40 text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <span>{format(moveInDate, "dd 'tháng' MM, yyyy", { locale: vi })}</span>
                </div>
                <span className="text-xs text-primary hover:underline">Đổi ngày</span>
              </button>

              {isDatePickerOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 p-2 rounded-2xl bg-card border border-border shadow-xl">
                  <Calendar
                    mode="single"
                    selected={moveInDate}
                    onSelect={(date) => {
                      if (date) {
                        setMoveInDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. THỜI HẠN THUÊ */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Thời hạn thuê</span>
                <span className="text-rose-500">*</span>
              </label>
              {minimumLeaseMonths ? (
                <span className="text-[11px] text-muted-foreground">
                  Tối thiểu {minimumLeaseMonths} tháng
                </span>
              ) : null}
            </div>

            {/* Quick Select Buttons - Tự động thích ứng theo minimumLeaseMonths */}
            <div className="grid grid-cols-4 gap-2">
              {quickLeaseOptions.map((m) => {
                const isMinDisabled = Boolean(minimumLeaseMonths && m < minimumLeaseMonths);
                const isSelected = leaseMonths === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isMinDisabled}
                    onClick={() => {
                      setLeaseMonths(m);
                      setCustomMonthsInput(m > 24 ? String(m) : "");
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/40"
                        : isMinDisabled
                        ? "border-border/50 bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    {formatLeaseLabel(m)}
                  </button>
                );
              })}
            </div>

            {/* Custom lease duration input with stepper */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={minimumLeaseMonths || 1}
                    max={240}
                    placeholder={`Nhập số tháng (tối thiểu ${minimumLeaseMonths || 1} tháng)`}
                    value={customMonthsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomMonthsInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num > 0) {
                        setLeaseMonths(num);
                      }
                    }}
                    className="w-full pl-3 pr-14 py-2 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    tháng
                  </span>
                </div>

                {/* Nút điều chỉnh nhanh: -1, +1, +1 năm */}
                <button
                  type="button"
                  disabled={leaseMonths <= (minimumLeaseMonths || 1)}
                  onClick={() => {
                    const newM = Math.max((minimumLeaseMonths || 1), leaseMonths - 1);
                    setLeaseMonths(newM);
                    setCustomMonthsInput(String(newM));
                  }}
                  className="px-2.5 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer"
                  title="Giảm 1 tháng"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newM = leaseMonths + 1;
                    setLeaseMonths(newM);
                    setCustomMonthsInput(String(newM));
                  }}
                  className="px-2.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold transition-colors cursor-pointer"
                  title="Tăng 1 tháng"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newM = leaseMonths + 12;
                    setLeaseMonths(newM);
                    setCustomMonthsInput(String(newM));
                  }}
                  className="px-2.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-primary transition-colors cursor-pointer"
                  title="Tăng 1 năm (12 tháng)"
                >
                  +1 năm
                </button>
              </div>

              {/* Thông tin quy đổi năm & dự kiến kết thúc hợp đồng */}
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Thời gian thuê:</span>
                  <span className="font-bold text-foreground">
                    {formatDetailedDuration(leaseMonths)}
                  </span>
                </div>
                {estimatedEndDate && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Dự kiến kết thúc hợp đồng:</span>
                    <span className="font-semibold text-foreground">
                      {format(estimatedEndDate, "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. SỐ NGƯỜI DỌN VÀO Ở */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Số người dọn vào ở</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                Tối thiểu 1 người
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  placeholder="Nhập số người dọn vào ở (tối thiểu 1)"
                  value={occupantCount || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setOccupantCount(0);
                    } else {
                      const num = parseInt(val, 10);
                      setOccupantCount(isNaN(num) ? 0 : Math.max(1, num));
                    }
                  }}
                  onBlur={() => {
                    if (!occupantCount || occupantCount < 1) {
                      setOccupantCount(1);
                    }
                  }}
                  className="w-full pl-3 pr-16 py-2 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                  người
                </span>
              </div>

              {/* Nút điều chỉnh nhanh: -1, +1 */}
              <button
                type="button"
                disabled={occupantCount <= 1}
                onClick={() => setOccupantCount((prev) => Math.max(1, (prev || 1) - 1))}
                className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer"
                title="Giảm 1 người"
              >
                -1
              </button>
              <button
                type="button"
                disabled={occupantCount >= 20}
                onClick={() => setOccupantCount((prev) => Math.min(20, Math.max(1, (prev || 0) + 1)))}
                className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer"
                title="Tăng 1 người"
              >
                +1
              </button>
            </div>
          </div>

          {/* 5. THÔNG TIN LIÊN HỆ CỦA BẠN */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-xs font-bold text-foreground">Thông tin liên hệ của bạn</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={renterName}
                    onChange={(e) => setRenterName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={renterPhone}
                    onChange={(e) => setRenterPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Địa chỉ Email (để nhận hợp đồng & thông báo)
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={renterEmail}
                    onChange={(e) => setRenterEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 6. ĐỀ XUẤT TIỀN CỌC (CHỈ HIỂN THỊ KHI LOẠI CỌC LÀ THỎA THUẬN) */}
          {depositInfo.isNegotiable && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Handshake className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Tiền cọc đề xuất (Thỏa thuận)</span>
                </label>
                <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
                  {formatVND(depositInfo.amount)}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={`VD: ${formatVND(listingPrice)}`}
                  value={customDepositInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setCustomDepositInput(digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "");
                  }}
                  className="w-full pl-3 pr-14 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  VNĐ
                </span>
              </div>
              {/* Nút chọn nhanh */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-muted-foreground">Gợi ý nhanh:</span>
                <button
                  type="button"
                  onClick={() => setCustomDepositInput(new Intl.NumberFormat("vi-VN").format(listingPrice))}
                  className="px-2 py-0.5 rounded-md bg-background hover:bg-muted border border-border text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                >
                  1 tháng ({formatVND(listingPrice)})
                </button>
                {listingPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomDepositInput(new Intl.NumberFormat("vi-VN").format(listingPrice * 2))}
                    className="px-2 py-0.5 rounded-md bg-background hover:bg-muted border border-border text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    2 tháng ({formatVND(listingPrice * 2)})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCustomDepositInput("0")}
                  className="px-2 py-0.5 rounded-md bg-background hover:bg-muted border border-border text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                >
                  Miễn cọc (0 đ)
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                * Bài đăng cho phép thỏa thuận tiền cọc. Mức tiền cọc bạn đề xuất sẽ được gửi đến chủ nhà xem xét duyệt.
              </p>
            </div>
          )}

          {/* 7. BẢNG TỔNG KẾT TÀI CHÍNH */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Giá thuê hàng tháng:</span>
              <span className="font-bold text-foreground">{formatVND(initialPayment.monthlyRent)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Tiền đặt cọc:</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-background text-foreground border border-border/80">
                  {depositInfo.badge}
                </span>
              </div>
              <span className="font-bold text-foreground">{formatVND(initialPayment.deposit)}</span>
            </div>
            <div className="pt-2 border-t border-primary/20 flex items-center justify-between text-xs font-bold">
              <div>
                <span className="text-foreground block">Tổng chi phí dự kiến ban đầu:</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  (Giá thuê tháng đầu + Tiền đặt cọc)
                </span>
              </div>
              <span className="text-sm font-extrabold text-primary">{formatVND(initialPayment.total)}</span>
            </div>
          </div>

          {/* 8. LỜI NHẮN GỬI CHỦ NHÀ */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground">
                Lời nhắn gửi chủ nhà (tuỳ chọn)
              </label>
              <span className="text-[11px] text-muted-foreground">
                {renterNote.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="VD: Tôi muốn thuê lâu dài, hiện đang làm việc tại quận 1, có nuôi 1 chú mèo nhỏ ngoan..."
              value={renterNote}
              onChange={(e) => setRenterNote(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground resize-none"
            />
          </div>

          {/* 9. FOOTER ACTIONS */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu thuê"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
