"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Wallet,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Copy,
  Clock,
  Search,
  Check,
  RefreshCw,
  X,
  Sparkles,
  ArrowLeftRight,
  ShieldAlert,
} from "lucide-react";
import {
  MOCK_DEPOSIT_HISTORY,
  PRESET_AMOUNTS,
  MIN_DEPOSIT_AMOUNT,
  DepositTransaction,
} from "@/data/mock-deposit-data";
import { Button } from "@/components/ui/button";

export default function DepositPage() {
  const [balance, setBalance] = useState(100000000);
  const [amount, setAmount] = useState<number>(100000);
  const [customAmountStr, setCustomAmountStr] = useState<string>("100000");
  const [history, setHistory] = useState<DepositTransaction[]>(MOCK_DEPOSIT_HISTORY);

  // Search & Filter for History
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Active current transaction when QR is generated (inline, not modal)
  const [activeTx, setActiveTx] = useState<{
    id: string;
    amount: number;
    transactionCode: string;
    description: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    createdAt: string;
  } | null>(null);

  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(580); // ~ 9:40 countdown
  const [isSuccessDemo, setIsSuccessDemo] = useState(false);

  // Sync custom input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      setCustomAmountStr("");
      setAmount(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    setAmount(num);
    setCustomAmountStr(num.toString());
  };

  const handleSelectPreset = (preset: number) => {
    setAmount(preset);
    setCustomAmountStr(preset.toString());
  };

  // Generate QR Inline
  const handleCreateQr = () => {
    if (!amount || amount < MIN_DEPOSIT_AMOUNT) {
      alert("Số tiền nạp tối thiểu là 10.000 VNĐ");
      return;
    }

    setIsGeneratingQr(true);
    setTimeout(() => {
      const randomId = `#${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const dateCode = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const txCode = `PB${amount}02026${dateCode.slice(4)}`;
      const memo = `NGUYEN VAN MINH PB chuyen tien`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

      setActiveTx({
        id: randomId,
        amount: amount,
        transactionCode: txCode,
        description: memo,
        accountNumber: "9353999798",
        accountName: "NGUYEN VAN MINH",
        bankName: "Vietcombank",
        createdAt: timeStr,
      });

      setTimeLeft(580); // 09:40
      setIsSuccessDemo(false);
      setIsGeneratingQr(false);
    }, 300);
  };

  // Countdown timer for active QR
  useEffect(() => {
    if (!activeTx || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTx, timeLeft]);

  // Format time MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Copy All Info
  const handleCopyAll = () => {
    if (!activeTx) return;
    const allInfo = `Ngân hàng: ${activeTx.bankName}\nSố tài khoản: ${activeTx.accountNumber}\nChủ tài khoản: ${activeTx.accountName}\nSố tiền: ${activeTx.amount.toLocaleString("vi-VN")} VNĐ\nNội dung: ${activeTx.description}`;
    handleCopy(allInfo, "copyAll");
  };

  // Cancel Transaction
  const handleCancelTx = () => {
    setActiveTx(null);
    setIsSuccessDemo(false);
  };

  // Simulate payment completion
  const handleSimulatePaymentSuccess = () => {
    if (!activeTx) return;
    setIsSuccessDemo(true);

    setTimeout(() => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const formattedDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const newHistoryItem: DepositTransaction = {
        id: activeTx.id,
        amount: activeTx.amount,
        transactionCode: activeTx.transactionCode,
        description: `MBVCB.${activeTx.transactionCode.slice(6)}.NGUYEN VAN MINH PB chuyen tien.CT tu 9353999798 NGUYEN VAN MINH toi 0141000780830 PHAM QUANG HUY`,
        status: "success",
        createdAt: formattedDate,
        bankName: "Vietcombank",
      };

      setBalance((prev) => prev + activeTx.amount);
      setHistory((prev) => [newHistoryItem, ...prev]);

      setTimeout(() => {
        setActiveTx(null);
        setIsSuccessDemo(false);
      }, 1500);
    }, 1000);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.transactionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [history, searchQuery, statusFilter]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 pb-12">
      {/* 1. TOP CARD: INLINE QR OR DEPOSIT FORM */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Nạp tiền
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTx
                  ? "Vui lòng quét mã VietQR bên dưới hoặc chuyển khoản theo đúng thông tin"
                  : "Nạp tiền tự động 24/7 qua chuyển khoản ngân hàng VietQR"}
              </p>
            </div>
          </div>

          {/* Pending Status Badge when Active Transaction */}
          {activeTx && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center gap-3 animate-in fade-in-50">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Chờ thanh toán: {activeTx.amount.toLocaleString("vi-VN")}đ
                </div>
                <div className="text-[11px] font-mono text-amber-600/80 dark:text-amber-400/80">
                  {activeTx.transactionCode} · {activeTx.createdAt}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONDITION 1: INLINE ACTIVE QR PAYMENT VIEW */}
        {activeTx ? (
          <div className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in-50 duration-200">
            {/* Left Column: Transfer Information */}
            <div className="lg:col-span-7 space-y-5">
              {/* Timer Bar & Auto Check */}
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary animate-pulse" />
                    Thời gian còn lại
                  </span>
                  <span className="font-mono font-bold text-sm sm:text-base text-primary">
                    {formatTimer(timeLeft)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-1000"
                    style={{ width: `${(timeLeft / 580) * 100}%` }}
                  />
                </div>

                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>↔ Tự động kiểm tra mỗi 5 giây</span>
                </div>
              </div>

              {/* Big Amount Header */}
              <div className="text-center py-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                  {activeTx.amount.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>

              {/* Bank Details Rows */}
              <div className="bg-muted/20 border border-border/80 rounded-xl p-4.5 space-y-3.5 text-xs sm:text-sm">
                {/* Ngân hàng */}
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">
                    Ngân hàng
                  </span>
                  <span className="font-bold text-foreground text-sm">
                    {activeTx.bankName}
                  </span>
                </div>

                {/* Số tài khoản */}
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">
                    Số tài khoản
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base text-foreground">
                      {activeTx.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeTx.accountNumber, "accNum")}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                      title="Sao chép STK"
                    >
                      {copiedField === "accNum" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Chủ tài khoản */}
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">
                    Chủ tài khoản
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase text-sm">
                      {activeTx.accountName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeTx.accountName, "accName")}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                      title="Sao chép chủ tài khoản"
                    >
                      {copiedField === "accName" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Nội dung chuyển khoản */}
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">
                    Nội dung chuyển khoản
                  </span>
                  <div className="flex items-center justify-between bg-primary/5 p-2.5 rounded-lg border border-primary/15">
                    <span className="font-semibold text-primary text-xs sm:text-sm">
                      {activeTx.description}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeTx.description, "memo")}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                      title="Sao chép nội dung"
                    >
                      {copiedField === "memo" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Warning Notice Box */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs sm:text-xs text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
                <p className="font-bold text-amber-700 dark:text-amber-300">
                  Chuyển đúng số tiền và đúng nội dung chuyển khoản.
                </p>
                <p>
                  Tiền sẽ tự động cộng sau <strong>1–5 phút</strong>. Vui lòng chờ hệ thống xử lý, không rời khỏi trang.
                </p>
                <p className="text-muted-foreground italic text-[11px] pt-1">
                  Nếu quá 10 phút chưa được cộng tiền, hãy liên hệ Admin hoặc{" "}
                  <span className="text-primary underline font-medium cursor-pointer">
                    tạo ticket hỗ trợ
                  </span>
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyAll}
                  className="h-10 px-4 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2 cursor-pointer"
                >
                  {copiedField === "copyAll" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Đã sao chép tất cả</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép tất cả</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelTx}
                  className="h-10 px-4 rounded-xl text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  Hủy giao dịch
                </Button>

                <Button
                  type="button"
                  onClick={handleSimulatePaymentSuccess}
                  disabled={isSuccessDemo}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs ml-auto cursor-pointer"
                >
                  {isSuccessDemo ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Tôi đã chuyển tiền
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column: VietQR Code Box */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-muted/20 border border-border rounded-2xl p-6 text-center shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-4">
                <QrCode className="w-4 h-4 text-primary" />
                <span>Quét mã để thanh toán</span>
              </div>

              {/* VietQR Header Logo */}
              <div className="mb-3">
                <span className="font-extrabold text-lg tracking-wider text-red-600">
                  VIET<span className="text-blue-600">QR</span>
                </span>
              </div>

              {/* QR Image Container */}
              <div className="w-64 h-64 bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-center relative overflow-hidden">
                <img
                  src={`https://api.vietqr.io/image/970436-${activeTx.accountNumber}-compact2.jpg?amount=${activeTx.amount}&addInfo=${encodeURIComponent(activeTx.description)}&accountName=${encodeURIComponent(activeTx.accountName)}`}
                  alt="VietQR Vietcombank"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              {/* Napas & Vietcombank Logos */}
              <div className="flex items-center justify-center gap-3 mt-4 text-[11px] font-bold text-muted-foreground border-t border-border/60 pt-3 w-full max-w-[240px]">
                <span className="text-blue-600">napas 247</span>
                <span className="text-border">|</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Vietcombank
                </span>
              </div>

              <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5">
                <p className="font-mono">{activeTx.accountNumber}</p>
                <p>Số tiền: {activeTx.amount.toLocaleString("vi-VN")} VNĐ</p>
              </div>
            </div>
          </div>
        ) : (
          /* CONDITION 2: DEPOSIT AMOUNT INPUT FORM */
          <>
            {/* 3 Step Instruction Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-6">
              {/* Step 1 */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border/70 flex items-center gap-3.5 transition-all hover:bg-muted/60">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                  1
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Tạo mã QR
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    Nhập số tiền và bấm tạo QR bên dưới
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border/70 flex items-center gap-3.5 transition-all hover:bg-muted/60">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                  2
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Chuyển khoản
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    Quét QR hoặc chuyển khoản theo thông tin
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border/70 flex items-center gap-3.5 transition-all hover:bg-muted/60">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                  3
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Nhận tiền
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    Tiền tự động cộng sau 1–5 phút
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Alert Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-amber-700 dark:text-amber-300">
                  Quan trọng:
                </strong>{" "}
                Phải tạo QR trước rồi mới chuyển khoản. Chuyển khoản không qua QR sẽ không được ghi nhận tự động.
              </div>
            </div>

            {/* Current Balance Bar */}
            <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 flex items-center justify-between mb-6">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                Số dư hiện tại
              </span>
              <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {balance.toLocaleString("vi-VN")}đ
              </span>
            </div>

            {/* Amount Input & Preset Chips */}
            <div className="space-y-3 mb-6">
              <label className="text-xs sm:text-sm font-semibold text-foreground block">
                Số tiền nạp
              </label>

              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                {/* Input with VNĐ suffix */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={amount ? amount.toLocaleString("vi-VN") : ""}
                    onChange={handleAmountChange}
                    placeholder="Nhập số tiền..."
                    className={`w-full h-11 px-4 pr-14 text-sm font-semibold bg-background rounded-xl border focus:outline-none focus:ring-2 text-foreground transition-all ${
                      amount > 0 && amount < MIN_DEPOSIT_AMOUNT
                        ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                        : "border-border focus:border-primary focus:ring-primary/20"
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                    VNĐ
                  </span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_AMOUNTS.map((preset) => {
                    const isSelected = amount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`h-11 px-3.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                            : "bg-muted/40 text-foreground border-border hover:bg-muted hover:border-primary/40"
                        }`}
                      >
                        {preset.toLocaleString("vi-VN")}đ
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Validation Error Message */}
              {amount > 0 && amount < MIN_DEPOSIT_AMOUNT && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1.5 animate-in fade-in-50">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Số tiền nạp tối thiểu là 10.000 VNĐ</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="button"
                onClick={handleCreateQr}
                disabled={isGeneratingQr || !amount || amount < MIN_DEPOSIT_AMOUNT}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingQr ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tạo mã QR...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Tạo mã QR thanh toán</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* 2. BOTTOM SECTION: LỊCH SỬ NẠP TIỀN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Lịch sử nạp tiền
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Danh sách các giao dịch nạp tiền qua tài khoản của bạn
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã GD, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 text-xs bg-card rounded-lg border border-border focus:outline-none focus:border-primary text-foreground w-40 sm:w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-card rounded-lg border border-border focus:outline-none focus:border-primary text-foreground cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="success">Thành công</option>
              <option value="pending">Đang xử lý</option>
              <option value="failed">Thất bại</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4 w-28">SỐ TIỀN</th>
                  <th className="py-3 px-4 w-52">MÃ GD</th>
                  <th className="py-3 px-4 min-w-[280px]">MÔ TẢ</th>
                  <th className="py-3 px-4 w-32">TRẠNG THÁI</th>
                  <th className="py-3 px-4 w-40">NGÀY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr
                      key={item.id + item.transactionCode}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {item.id}
                      </td>

                      {/* Số tiền */}
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {item.amount.toLocaleString("vi-VN")} đ
                      </td>

                      {/* Mã GD */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 group">
                          <span className="truncate max-w-[180px]">{item.transactionCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.transactionCode, item.id + "-code")}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity cursor-pointer"
                            title="Sao chép mã GD"
                          >
                            {copiedField === item.id + "-code" ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Mô tả */}
                      <td className="py-3.5 px-4 text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-1.5 group">
                          <span className="line-clamp-2 max-w-md">{item.description}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.description, item.id + "-desc")}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity shrink-0 mt-0.5 cursor-pointer"
                            title="Sao chép mô tả"
                          >
                            {copiedField === item.id + "-desc" ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        {item.status === "success" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Thành công
                          </span>
                        )}
                        {item.status === "pending" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            Đang xử lý
                          </span>
                        )}
                        {item.status === "failed" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            Thất bại
                          </span>
                        )}
                      </td>

                      {/* Ngày */}
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                          <span>{item.createdAt}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy giao dịch nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
