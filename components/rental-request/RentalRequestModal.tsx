"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Sparkles,
  Handshake,
  Bike,
  Car,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, addDays, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "@/features/auth/useAuth";
import rentalRequestService from "@/services/rental-request.service";
import type {
  RentalRequestResponse,
  RentalEstimateResponse,
} from "@/types/rental-request.type";
import type { DepositType } from "@/types/listing.type";
import { Calendar } from "@/components/ui/calendar";
import { RENTAL_HOLD_DURATION_LABEL } from "@/config/rental-hold.config";
import {
  formatVND,
  clampValue,
  hasVehicleParkingAllowed,
  hasPersonBasedCharges,
} from "./rental-request.helper";
import { RentalCostSummary } from "./RentalCostSummary";

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
  const [moveInDate, setMoveInDate] = useState<Date>(() =>
    addDays(new Date(), 3),
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [leaseMonths, setLeaseMonths] = useState<number>(() =>
    Math.max(minimumLeaseMonths || 6, 12),
  );
  const [customMonthsInput, setCustomMonthsInput] = useState<string>(() =>
    String(Math.max(minimumLeaseMonths || 6, 12)),
  );
  const [occupantCount, setOccupantCount] = useState<number>(1);
  const [motorbikeCount, setMotorbikeCount] = useState<number>(0);
  const [carCount, setCarCount] = useState<number>(0);
  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [renterEmail, setRenterEmail] = useState("");
  const [renterNote, setRenterNote] = useState("");
  const [customDepositInput, setCustomDepositInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estimate state from backend calculation
  const [estimate, setEstimate] = useState<RentalEstimateResponse | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const estimateSeqRef = useRef(0);

  // Prefill user information from auth profile
  useEffect(() => {
    if (profile) {
      const fullName = [profile.firstName, profile.lastName]
        .filter(Boolean)
        .join(" ");
      queueMicrotask(() => {
        if (fullName) setRenterName(fullName);
        else if (username) setRenterName(username);

        if (profile.phone) setRenterPhone(profile.phone);
        if (profile.email) setRenterEmail(profile.email);
      });
    }
  }, [profile, username]);

  // Sinh danh sách 4 mốc chọn nhanh linh hoạt và thích ứng theo minimumLeaseMonths
  const quickLeaseOptions = useMemo(() => {
    const min = Math.max(Number(minimumLeaseMonths) || 1, 1);

    if (min <= 6) {
      return [6, 12, 18, 24];
    } else if (min <= 12) {
      return [12, 24, 36, 48];
    } else if (min <= 24) {
      const opts = [min, 24, 36, 48].filter((v, i, a) => a.indexOf(v) === i);
      while (opts.length < 4) {
        opts.push(opts[opts.length - 1] + 12);
      }
      return opts.slice(0, 4);
    } else {
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
      queueMicrotask(() => {
        setMoveInDate(addDays(new Date(), 3));
        const min = Math.max(Number(minimumLeaseMonths) || 1, 1);
        const defaultLease = min > 12 ? min : 12;
        setLeaseMonths(defaultLease);
        setOccupantCount(1);
        setMotorbikeCount(0);
        setCarCount(0);
        setCustomMonthsInput(String(defaultLease));
        setRenterNote("");
        setIsDatePickerOpen(false);
        setEstimate(null);
        setEstimateError(null);
        setCustomDepositInput(
          listingPrice ? new Intl.NumberFormat("vi-VN").format(listingPrice) : "",
        );
      });
    }
  }, [isOpen, minimumLeaseMonths, listingPrice]);

  // Calculate estimated end date
  const estimatedEndDate = useMemo(() => {
    if (!moveInDate || !leaseMonths) return null;
    return addMonths(moveInDate, leaseMonths);
  }, [moveInDate, leaseMonths]);

  // Xử lý thông tin cọc ban đầu
  const depositInfo = useMemo(() => {
    const rent = listingPrice || 0;
    let type = depositType as string | undefined;
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
        badge: "Không yêu cầu đặt cọc",
        amount: 0,
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
        isNegotiable: false,
      };
    }

    // type === "NEGOTIABLE" (Thỏa thuận)
    let negotiatedAmt: number;
    if (customDepositInput === "") {
      negotiatedAmt = rent;
    } else {
      const parsed = Number(customDepositInput.replace(/\D/g, ""));
      negotiatedAmt = isNaN(parsed) ? 0 : parsed;
    }

    return {
      type: "NEGOTIABLE" as const,
      label: "Tiền cọc thỏa thuận",
      badge: "Theo thỏa thuận",
      amount: negotiatedAmt,
      isNegotiable: true,
    };
  }, [
    depositType,
    listingDepositAmount,
    depositMonths,
    listingPrice,
    customDepositInput,
  ]);

  // Backend Estimate Fetching (debounced)
  useEffect(() => {
    if (!isOpen || !listingId || !moveInDate || !leaseMonths) return;

    const seq = ++estimateSeqRef.current;

    const timer = setTimeout(() => {
      setLoadingEstimate(true);
      setEstimateError(null);
      const negotiatedAmt = depositInfo.isNegotiable ? depositInfo.amount : undefined;

      rentalRequestService
        .estimateRentalCost({
          listingId,
          moveInDate: format(moveInDate, "yyyy-MM-dd"),
          leaseMonths,
          occupantCount: Math.max(1, occupantCount || 1),
          motorbikeCount: Math.min(Math.max(0, motorbikeCount || 0), Math.max(1, occupantCount || 1)),
          carCount: Math.min(Math.max(0, carCount || 0), Math.max(1, occupantCount || 1)),
          negotiatedDepositAmount: negotiatedAmt,
        })
        .then((res) => {
          if (seq === estimateSeqRef.current) {
            setEstimate(res);
            setLoadingEstimate(false);

            // Tự động reset hoặc clamp khi sức chứa hoặc quyền gửi xe thay đổi
            const effectiveOcc = Math.max(1, occupantCount || 1);
            if (!res.motorbike.allowed && motorbikeCount > 0) {
              setMotorbikeCount(0);
            } else if (res.motorbike.allowed) {
              const maxMoto = Math.min(res.motorbike.available, effectiveOcc);
              if (motorbikeCount > maxMoto) {
                setMotorbikeCount(maxMoto);
              }
            }

            if (!res.car.allowed && carCount > 0) {
              setCarCount(0);
            } else if (res.car.allowed) {
              const maxCar = Math.min(res.car.available, effectiveOcc);
              if (carCount > maxCar) {
                setCarCount(maxCar);
              }
            }

            if (res.occupantLimit && occupantCount > res.occupantLimit) {
              const limit = res.occupantLimit;
              setOccupantCount(limit);
              setMotorbikeCount((m) => Math.min(m, limit));
              setCarCount((c) => Math.min(c, limit));
            }
          }
        })
        .catch((err) => {
          if (seq === estimateSeqRef.current) {
            setLoadingEstimate(false);
            const msg =
              err?.response?.data?.message ||
              "Không thể tính toán chi phí dự kiến cho bài đăng này.";
            setEstimateError(msg);
          }
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    listingId,
    moveInDate,
    leaseMonths,
    occupantCount,
    motorbikeCount,
    carCount,
    depositInfo.amount,
    depositInfo.isNegotiable,
  ]);


  const depositAmount = estimate?.depositAmount ?? depositInfo.amount;
  const occupantLimit = estimate?.occupantLimit;
  const effectiveOccupants = Math.max(1, occupantCount || 1);
  const maxMotorbikeAllowed = Math.min(
    estimate?.motorbike.available ?? 0,
    effectiveOccupants
  );
  const maxCarAllowed = Math.min(
    estimate?.car.available ?? 0,
    effectiveOccupants
  );

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
      toast.error(
        `Thời hạn thuê tối thiểu cho căn này là ${minimumLeaseMonths} tháng`,
      );
      return;
    }

    if (!occupantCount || occupantCount < 1) {
      toast.error("Vui lòng nhập số người dọn vào ở (tối thiểu 1 người)");
      return;
    }

    if (occupantLimit && occupantCount > occupantLimit) {
      toast.error(`Bài đăng chỉ cho phép tối đa ${occupantLimit} người.`);
      return;
    }

    if (estimate?.motorbike.allowed && motorbikeCount > estimate.motorbike.available) {
      toast.error(
        `Chỉ còn ${estimate.motorbike.available} chỗ xe máy khả dụng trong thời gian này.`
      );
      return;
    }

    if (estimate?.car.allowed && carCount > estimate.car.available) {
      toast.error(
        `Chỉ còn ${estimate.car.available} chỗ ô tô khả dụng trong thời gian này.`
      );
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
        motorbikeCount: Math.min(motorbikeCount, occupantCount),
        carCount: Math.min(carCount, occupantCount),
        renterName: renterName.trim(),
        renterPhone: renterPhone.trim(),
        renterEmail: renterEmail.trim() || undefined,
        depositAmount: depositAmount,
        negotiatedDepositAmount: depositInfo.isNegotiable ? depositAmount : undefined,
        renterNote: renterNote.trim() || undefined,
      });

      toast.success(
        "Gửi yêu cầu thuê nhà thành công! Chủ nhà sẽ nhận được thông báo để xem xét.",
      );
      onSuccess?.(created);
      onClose();
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        errObj?.response?.data?.message ||
          errObj?.message ||
          "Không thể gửi yêu cầu thuê nhà. Vui lòng kiểm tra lại thông tin.",
      );
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
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Gửi yêu cầu thuê nhà
              </h3>
              <p className="text-xs text-muted-foreground">
                Đăng ký quan tâm và thỏa thuận điều kiện thuê
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THÔNG BÁO THỜI HẠN GIỮ CHỖ */}
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            Sau khi chủ nhà chấp thuận, bạn có{" "}
            <strong>{RENTAL_HOLD_DURATION_LABEL}</strong> để ký hợp đồng và hoàn
            tất thanh toán để đảm bảo giữ chỗ căn nhà.
          </p>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. TÓM TẮT BẤT ĐỘNG SẢN */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/80">
            {listingThumbnail && isValidImageUrl(listingThumbnail) ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-border">
                <Image
                  src={listingThumbnail}
                  alt={listingTitle}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border">
                <Home className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {listingTitle}
              </h4>
              {listingAddress && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {listingAddress}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-extrabold text-primary">
                  {formatVND(listingPrice)}/tháng
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
                  {depositInfo.badge}
                </span>
              </div>
            </div>
          </div>

          {/* 2. NGÀY BẮT ĐẦU DỌN VÀO */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              <span>Ngày bắt đầu dọn vào</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border border-input bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <span className="font-semibold">
                  {moveInDate
                    ? format(moveInDate, "EEEE, 'ngày' dd 'tháng' MM, yyyy", {
                        locale: vi,
                      })
                    : "Chọn ngày dọn vào"}
                </span>
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              </button>

              {isDatePickerOpen && (
                <div className="absolute left-0 top-full mt-1 z-30 p-2 rounded-2xl bg-card border border-border shadow-xl">
                  <Calendar
                    mode="single"
                    selected={moveInDate}
                    onSelect={(date) => {
                      if (date) {
                        setMoveInDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) =>
                      isBefore(startOfDay(date), startOfDay(new Date()))
                    }
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

            {/* Quick Select Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickLeaseOptions.map((m) => {
                const isMinDisabled = Boolean(
                  minimumLeaseMonths && m < minimumLeaseMonths,
                );
                const isSelected = leaseMonths === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isMinDisabled}
                    onClick={() => {
                      setLeaseMonths(m);
                      setCustomMonthsInput(String(m));
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
                    onBlur={() => {
                      if (!customMonthsInput || parseInt(customMonthsInput, 10) < (minimumLeaseMonths || 1)) {
                        setCustomMonthsInput(String(leaseMonths));
                      }
                    }}
                    className="w-full pl-3 pr-14 py-2 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    tháng
                  </span>
                </div>

                <button
                  type="button"
                  disabled={leaseMonths <= (minimumLeaseMonths || 1)}
                  onClick={() => {
                    const newM = Math.max(
                      minimumLeaseMonths || 1,
                      leaseMonths - 1,
                    );
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

          {/* 4. SỐ NGƯỜI SẼ Ở THƯỜNG XUYÊN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Số người sẽ ở thường xuyên</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                {occupantLimit
                  ? `Tối đa ${occupantLimit} người theo bài đăng`
                  : "Tối thiểu 1 người"}
              </span>
            </div>

            {(hasPersonBasedCharges(estimate) || (estimate && estimate.effectiveMonthlyRent > (listingPrice || 0))) && (
              <p className="text-[11px] text-primary font-medium flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                <span>Số người được dùng để tính tiền thuê / phí nước.</span>
              </p>
            )}

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={occupantLimit || 20}
                  step={1}
                  placeholder={`Nhập số người (tối đa ${occupantLimit || 20})`}
                  value={occupantCount || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setOccupantCount(0);
                    } else {
                      const num = parseInt(val, 10);
                      const maxLimit = occupantLimit || 20;
                      const validOccupants = isNaN(num) ? 0 : clampValue(num, 1, maxLimit);
                      setOccupantCount(validOccupants);
                      if (validOccupants > 0) {
                        setMotorbikeCount((m) => Math.min(m, validOccupants));
                        setCarCount((c) => Math.min(c, validOccupants));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!occupantCount || occupantCount < 1) {
                      setOccupantCount(1);
                      setMotorbikeCount((m) => Math.min(m, 1));
                      setCarCount((c) => Math.min(c, 1));
                    }
                  }}
                  className="w-full pl-3 pr-16 py-2 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                  người
                </span>
              </div>

              <button
                type="button"
                disabled={occupantCount <= 1}
                onClick={() =>
                  setOccupantCount((prev) => {
                    const next = Math.max(1, (prev || 1) - 1);
                    setMotorbikeCount((m) => Math.min(m, next));
                    setCarCount((c) => Math.min(c, next));
                    return next;
                  })
                }
                className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer"
                title="Giảm 1 người"
              >
                -1
              </button>
              <button
                type="button"
                disabled={Boolean(occupantLimit ? occupantCount >= occupantLimit : occupantCount >= 20)}
                onClick={() =>
                  setOccupantCount((prev) => {
                    const max = occupantLimit || 20;
                    return Math.min(max, Math.max(1, (prev || 0) + 1));
                  })
                }
                className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer"
                title="Tăng 1 người"
              >
                +1
              </button>
            </div>
          </div>

          {/* 5. PHƯƠNG TIỆN MANG THEO */}
          {hasVehicleParkingAllowed(estimate) && (
            <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Bike className="w-4 h-4 text-primary" />
                  <span>Phương tiện mang theo</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Chỗ khả dụng theo lịch thuê
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {/* Xe máy */}
                {estimate?.motorbike.allowed && (
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/80 bg-background">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Bike className="w-3.5 h-3.5 text-primary" />
                          <span>Xe máy</span>
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            estimate.motorbike.available > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          }`}
                        >
                          {estimate.motorbike.available > 0
                            ? `Còn ${estimate.motorbike.available} chỗ`
                            : "Hết chỗ"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {estimate.motorbike.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={motorbikeCount <= 0}
                        onClick={() => setMotorbikeCount((prev) => Math.max(0, prev - 1))}
                        className="w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={maxMotorbikeAllowed}
                        value={motorbikeCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setMotorbikeCount(
                            isNaN(val) ? 0 : clampValue(val, 0, maxMotorbikeAllowed)
                          );
                        }}
                        className="w-12 text-center py-1 text-xs rounded-lg border border-input bg-background font-bold text-foreground"
                      />
                      <button
                        type="button"
                        disabled={motorbikeCount >= maxMotorbikeAllowed}
                        onClick={() =>
                          setMotorbikeCount((prev) =>
                            Math.min(maxMotorbikeAllowed, prev + 1)
                          )
                        }
                        className="w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Ô tô */}
                {estimate?.car.allowed && (
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/80 bg-background">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-primary" />
                          <span>Ô tô</span>
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            estimate.car.available > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          }`}
                        >
                          {estimate.car.available > 0
                            ? `Còn ${estimate.car.available} chỗ`
                            : "Hết chỗ"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {estimate.car.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={carCount <= 0}
                        onClick={() => setCarCount((prev) => Math.max(0, prev - 1))}
                        className="w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={maxCarAllowed}
                        value={carCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setCarCount(
                            isNaN(val) ? 0 : clampValue(val, 0, maxCarAllowed)
                          );
                        }}
                        className="w-12 text-center py-1 text-xs rounded-lg border border-input bg-background font-bold text-foreground"
                      />
                      <button
                        type="button"
                        disabled={carCount >= maxCarAllowed}
                        onClick={() =>
                          setCarCount((prev) => Math.min(maxCarAllowed, prev + 1))
                        }
                        className="w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. THÔNG TIN LIÊN HỆ CỦA BẠN */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-xs font-bold text-foreground">
              Thông tin liên hệ của bạn
            </h4>
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

          {/* 7. ĐỀ XUẤT TIỀN CỌC (CHỈ HIỂN THỊ KHI LOẠI CỌC LÀ THỎA THUẬN) */}
          {depositInfo.isNegotiable && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Handshake className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Tiền cọc đề xuất (Thỏa thuận)</span>
                </label>
                <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
                  {formatVND(depositAmount)}
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
                    setCustomDepositInput(
                      digits
                        ? new Intl.NumberFormat("vi-VN").format(Number(digits))
                        : "",
                    );
                  }}
                  className="w-full pl-3 pr-14 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  VNĐ
                </span>
              </div>
              {/* Nút chọn nhanh */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  Gợi ý nhanh:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomDepositInput(
                      new Intl.NumberFormat("vi-VN").format(listingPrice),
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-background hover:bg-muted border border-border text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                >
                  1 tháng ({formatVND(listingPrice)})
                </button>
                {listingPrice > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCustomDepositInput(
                        new Intl.NumberFormat("vi-VN").format(listingPrice * 2),
                      )
                    }
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
                * Bài đăng cho phép thỏa thuận tiền cọc. Mức tiền cọc bạn đề
                xuất sẽ được gửi đến chủ nhà xem xét duyệt.
              </p>
            </div>
          )}

          {/* 8. DỰ TOÁN THANH TOÁN */}
          <RentalCostSummary
            estimate={estimate}
            loading={loadingEstimate}
            error={estimateError}
            depositBadge={depositInfo.badge}
            occupantCount={occupantCount}
          />

          {/* 9. LỜI NHẮN GỬI CHỦ NHÀ */}
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

          {/* 10. FOOTER ACTIONS */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {estimateError ? (
              <span className="text-[11px] text-rose-500 font-medium">
                Chưa thể xác nhận dự toán chi phí.
              </span>
            ) : !estimate && loadingEstimate ? (
              <span className="text-[11px] text-muted-foreground font-medium">
                Đang tính toán dự toán thanh toán...
              </span>
            ) : (
              <div />
            )}

            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
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
                disabled={isSubmitting || loadingEstimate || Boolean(estimateError) || !estimate}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu thuê"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
