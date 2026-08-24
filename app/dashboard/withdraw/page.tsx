"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Banknote,
  AlertCircle,
  CheckCircle2,
  Copy,
  Clock,
  Search,
  Check,
  RefreshCw,
  Building2,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Send,
  X,
} from "lucide-react";
import {
  MOCK_WITHDRAW_HISTORY,
  VIETNAM_BANKS,
  BankInfo,
  WithdrawTransaction,
} from "@/data/mock-withdraw-data";
import { Button } from "@/components/ui/button";

const PRESET_WITHDRAW_AMOUNTS = [
  100000,
  500000,
  1000000,
  2000000,
  5000000,
  10000000,
];

export default function WithdrawPage() {
  const [availableBalance, setAvailableBalance] = useState(9999999);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500000);

  // Selected Bank State
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>({
    code: "VCB",
    shortName: "Vietcombank",
    name: "Ngân hàng Ngoại thương Việt Nam",
  });
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  const [accountNumber, setAccountNumber] = useState<string>("9353999798");
  const [accountName, setAccountName] = useState<string>("NGUYEN VAN MINH");

  const [history, setHistory] = useState<WithdrawTransaction[]>(MOCK_WITHDRAW_HISTORY);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Close Bank dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        bankDropdownRef.current &&
        !bankDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBankDropdownOpen(false);
      }
    }

    if (isBankDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isBankDropdownOpen]);

  // Sync custom input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      setWithdrawAmount(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    setWithdrawAmount(num);
  };

  const handleSelectPreset = (preset: number) => {
    setWithdrawAmount(preset);
  };

  const handleWithdrawAll = () => {
    setWithdrawAmount(availableBalance);
  };

  const handleSelectBank = (bank: BankInfo) => {
    setSelectedBank(bank);
    setIsBankDropdownOpen(false);
    setBankSearchQuery("");
  };

  // Filtered Banks for Searchable Dropdown
  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return VIETNAM_BANKS;
    const query = bankSearchQuery.toLowerCase();
    return VIETNAM_BANKS.filter(
      (b) =>
        b.code.toLowerCase().includes(query) ||
        b.shortName.toLowerCase().includes(query) ||
        b.name.toLowerCase().includes(query)
    );
  }, [bankSearchQuery]);

  // Reset form
  const handleResetForm = () => {
    setWithdrawAmount(500000);
    setSelectedBank({
      code: "VCB",
      shortName: "Vietcombank",
      name: "Ngân hàng Ngoại thương Việt Nam",
    });
    setAccountNumber("");
    setAccountName("");
    setSuccessMessage(null);
  };

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle submit withdrawal request
  const handleSubmitWithdraw = (e: React.FormEvent) => {
    e.preventDefault();

    if (!withdrawAmount || withdrawAmount < 50000) {
      alert("Số tiền rút tối thiểu là 50.000 VNĐ");
      return;
    }

    if (withdrawAmount > availableBalance) {
      alert("Số tiền rút vượt quá số dư khả dụng!");
      return;
    }

    if (!selectedBank) {
      alert("Vui lòng chọn ngân hàng thụ hưởng!");
      return;
    }

    if (!accountNumber.trim()) {
      alert("Vui lòng nhập số tài khoản ngân hàng!");
      return;
    }

    if (!accountName.trim()) {
      alert("Vui lòng nhập tên chủ tài khoản!");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const formattedDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const randomId = `#WD-${Math.floor(1000 + Math.random() * 9000)}`;
      const txCode = `WD${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      const newTx: WithdrawTransaction = {
        id: randomId,
        amount: withdrawAmount,
        bankCode: selectedBank.code,
        bankName: selectedBank.shortName,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim().toUpperCase(),
        transactionCode: txCode,
        status: "pending",
        createdAt: formattedDate,
        fee: 0,
      };

      setAvailableBalance((prev) => prev - withdrawAmount);
      setHistory((prev) => [newTx, ...prev]);
      setIsSubmitting(false);
      setSuccessMessage(
        `Yêu cầu rút ${withdrawAmount.toLocaleString("vi-VN")}đ đã được gửi thành công! Tiền sẽ được chuyển về tài khoản trong 5-30 phút.`
      );

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }, 600);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.transactionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.accountNumber.includes(searchQuery) ||
        item.accountName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [history, searchQuery, statusFilter]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 pb-12">
      {/* 1. TOP CARD: TẠO YÊU CẦU RÚT TIỀN */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center gap-3 pb-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Tạo yêu cầu rút tiền
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rút số dư về tài khoản ngân hàng nội địa 24/7, xử lý tự động trong 5-30 phút
            </p>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl p-3.5 my-5 flex items-start gap-2.5 text-xs sm:text-sm animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="font-semibold">{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmitWithdraw} className="space-y-5 my-6">
          {/* Available Balance Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-foreground">
                Số dư khả dụng:
              </span>
              <span className="text-base sm:text-lg font-bold text-primary tracking-tight">
                {availableBalance.toLocaleString("vi-VN")} đ
              </span>
            </div>

            <button
              type="button"
              onClick={handleWithdrawAll}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Rút toàn bộ số dư</span>
            </button>
          </div>

          {/* 1. Số tiền rút */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1">
                <span className="text-destructive">*</span> Số tiền rút
              </label>
              <span className="text-[11px] text-muted-foreground">
                Tối thiểu: 50.000đ
              </span>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Input with VND suffix */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={withdrawAmount ? withdrawAmount.toLocaleString("vi-VN") : ""}
                  onChange={handleAmountChange}
                  placeholder="Nhập số tiền cần rút..."
                  className={`w-full h-11 px-4 pr-14 text-sm font-semibold bg-background rounded-xl border focus:outline-none focus:ring-2 text-foreground transition-all ${withdrawAmount > availableBalance
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : "border-border focus:border-primary focus:ring-primary/20"
                    }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  VND
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_WITHDRAW_AMOUNTS.map((preset) => {
                  const isSelected = withdrawAmount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`h-11 px-3.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${isSelected
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

            {withdrawAmount > availableBalance && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1 animate-in fade-in-50">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Số tiền rút vượt quá số dư khả dụng ({availableBalance.toLocaleString("vi-VN")}đ)</span>
              </p>
            )}
          </div>

          {/* 2. CHỌN NGÂN HÀNG (SEARCHABLE SELECT / COMBOBOX) */}
          <div className="space-y-2 relative" ref={bankDropdownRef}>
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1">
              <span className="text-destructive">*</span> Chọn ngân hàng
            </label>

            {/* Custom Searchable Select Trigger */}
            <button
              type="button"
              onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
              className={`w-full h-11 px-4 rounded-xl border text-sm flex items-center justify-between transition-all bg-background text-left cursor-pointer ${isBankDropdownOpen
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                {selectedBank ? (
                  <span className="font-semibold text-foreground truncate">
                    <span className="text-primary font-bold">{selectedBank.code}</span> - {selectedBank.shortName} ({selectedBank.name})
                  </span>
                ) : (
                  <span className="text-muted-foreground">Chọn ngân hàng thụ hưởng...</span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isBankDropdownOpen ? "rotate-180 text-primary" : ""
                  }`}
              />
            </button>

            {/* Searchable Dropdown Menu */}
            {isBankDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                {/* Search Input */}
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên ngân hàng, mã viết tắt (VD: VCB, MB, Techcombank)..."
                    className="w-full h-9 pl-9 pr-8 text-xs bg-muted/60 rounded-xl border border-border focus:outline-none focus:border-primary focus:bg-background text-foreground"
                    autoFocus
                  />
                  {bankSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBankSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bank List Scrollable */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                  {filteredBanks.length > 0 ? (
                    filteredBanks.map((b) => {
                      const isSelected = selectedBank?.code === b.code;
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => handleSelectBank(b)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-foreground hover:bg-muted"
                            }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/60">
                                {b.code}
                              </span>
                              <span>{b.shortName}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {b.name}
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Không tìm thấy ngân hàng nào phù hợp với &quot;{bankSearchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Số tài khoản */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1">
              <span className="text-destructive">*</span> Số tài khoản
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Nhập số tài khoản ngân hàng thụ hưởng..."
              className="w-full h-11 px-4 text-sm font-mono font-medium bg-background rounded-xl border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
            />
          </div>

          {/* 4. Chủ tài khoản */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1">
              <span className="text-destructive">*</span> Chủ tài khoản
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
              placeholder="Nhập tên chủ tài khoản (viết hoa không dấu)..."
              className="w-full h-11 px-4 text-sm font-semibold uppercase bg-background rounded-xl border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
            />
          </div>

          {/* Security & Processing Info Note */}
          <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Giao dịch bảo mật 100% qua cổng Napas 247</span>
            </p>
            <p className="leading-relaxed">
              Yêu cầu rút tiền được duyệt tự động từ <strong>5 – 30 phút</strong>. Vui lòng kiểm tra chính xác số tài khoản để tránh chậm trễ.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetForm}
              className="h-11 px-6 rounded-xl border-border hover:bg-muted text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !withdrawAmount ||
                withdrawAmount < 50000 ||
                withdrawAmount > availableBalance ||
                !selectedBank ||
                !accountNumber.trim() ||
                !accountName.trim()
              }
              className="h-11 px-7 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi yêu cầu</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. BOTTOM SECTION: LỊCH SỬ RÚT TIỀN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Lịch sử rút tiền
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Danh sách các yêu cầu rút tiền về ngân hàng của bạn
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã GD, ID, STK..."
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
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4 w-24">ID</th>
                  <th className="py-3 px-4 w-32">SỐ TIỀN</th>
                  <th className="py-3 px-4 min-w-[200px]">NGÂN HÀNG & STK</th>
                  <th className="py-3 px-4 min-w-[180px]">CHỦ TÀI KHOẢN</th>
                  <th className="py-3 px-4 w-44">MÃ GD</th>
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

                      {/* Ngân hàng & STK */}
                      <td className="py-3.5 px-4 text-foreground">
                        <div className="font-semibold">{item.bankName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{item.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.accountNumber, item.id + "-acc")}
                            className="p-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Sao chép STK"
                          >
                            {copiedField === item.id + "-acc" ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Chủ tài khoản */}
                      <td className="py-3.5 px-4 font-semibold uppercase text-foreground">
                        {item.accountName}
                      </td>

                      {/* Mã GD */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 group">
                          <span className="truncate max-w-[140px]">{item.transactionCode}</span>
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
                        {(item.status === "cancelled" || item.status === "rejected") && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            Đã hủy
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
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy giao dịch rút tiền nào phù hợp.
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
