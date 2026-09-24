"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import bankAccountService from "@/services/bank-account.service";
import type { BankAccount, BankAccountRequest } from "@/types/bank-account.type";
import { VIETNAMESE_BANKS } from "@/data/banks";
import { toast } from "sonner";
import axios from "axios";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function BankAccountsSection() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [selectedBin, setSelectedBin] = useState<string>(VIETNAMESE_BANKS[0].bin);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [defaultIncoming, setDefaultIncoming] = useState(true);
  const [defaultRefund, setDefaultRefund] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  async function loadAccounts() {
    setLoading(true);
    setError(null);
    try {
      const data = await bankAccountService.getBankAccounts();
      setAccounts(data);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách tài khoản ngân hàng."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNumber.trim() || !accountHolderName.trim()) {
      toast.error("Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản.");
      return;
    }

    const bank = VIETNAMESE_BANKS.find((b) => b.bin === selectedBin) || VIETNAMESE_BANKS[0];

    setSubmitting(true);
    try {
      const payload: BankAccountRequest = {
        bankBin: bank.bin,
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim().toUpperCase(),
        defaultForIncomingPayments: defaultIncoming,
        defaultForRefunds: defaultRefund,
      };
      await bankAccountService.createBankAccount(payload);
      toast.success("Thêm tài khoản ngân hàng thành công.");
      setShowAddModal(false);
      setAccountNumber("");
      setAccountHolderName("");
      await loadAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Thêm tài khoản thất bại."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetIncomingDefault(id: string) {
    setActionInProgress(id);
    try {
      await bankAccountService.updateDefaults(id, { defaultForIncomingPayments: true });
      toast.success("Đã đặt làm tài khoản mặc định nhận thanh toán.");
      await loadAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể cập nhật mặc định."));
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleSetRefundDefault(id: string) {
    setActionInProgress(id);
    try {
      await bankAccountService.updateDefaults(id, { defaultForRefunds: true });
      toast.success("Đã đặt làm tài khoản mặc định nhận hoàn tiền.");
      await loadAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể cập nhật mặc định."));
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa/vô hiệu hóa tài khoản ngân hàng này?")) {
      return;
    }
    setActionInProgress(id);
    try {
      await bankAccountService.deleteBankAccount(id);
      toast.success("Đã xóa tài khoản thành công.");
      await loadAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể xóa tài khoản."));
    } finally {
      setActionInProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Tài khoản ngân hàng</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý tài khoản nhận thanh toán tiền thuê hoặc nhận tiền hoàn cọc trực tiếp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Thêm tài khoản
        </button>
      </div>

      {/* Direct Transfer Transparency Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="font-bold text-blue-950 dark:text-blue-100">
              Nguyên tắc thanh toán trực tiếp tại HomeSpace
            </p>
            <p className="leading-relaxed text-blue-800/90 dark:text-blue-300/90">
              HomeSpace <strong>KHÔNG</strong> phải ví điện tử hay cổng trung gian thanh toán, <strong>KHÔNG</strong> thu nhận hay giữ tiền của người dùng.
              Mọi khoản tiền cọc và tiền thuê được chuyển khoản <strong>trực tiếp</strong> giữa tài khoản ngân hàng của người thuê và chủ nhà thông qua VietQR / Mobile Banking.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary mr-2" />
          Đang tải danh sách tài khoản...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={loadAccounts}
            className="mt-3 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Thử lại
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">Chưa có tài khoản ngân hàng</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Bạn cần thêm ít nhất một tài khoản ngân hàng để thực hiện giao dịch thuê nhà và nhận thanh toán / hoàn cọc.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm tài khoản ngay
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                      {acc.bankCode}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{acc.bankName}</h3>
                      <p className="text-xs text-muted-foreground">Mã ngân hàng: {acc.bankCode}</p>
                    </div>
                  </div>
                  {acc.status === "ACTIVE" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Hoạt động
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 py-2 border-y border-border/60 my-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Số tài khoản:</span>
                    <span className="font-mono font-bold text-foreground tracking-wider">
                      {acc.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Chủ tài khoản:</span>
                    <span className="font-bold text-foreground uppercase">
                      {acc.accountHolderName}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {acc.defaultForIncomingPayments && (
                    <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                      Nhận tiền mặc định
                    </span>
                  )}
                  {acc.defaultForRefunds && (
                    <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                      Hoàn tiền mặc định
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-xs">
                  {!acc.defaultForIncomingPayments && (
                    <button
                      type="button"
                      disabled={actionInProgress === acc.id}
                      onClick={() => handleSetIncomingDefault(acc.id)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                    >
                      Đặt nhận tiền
                    </button>
                  )}
                  {!acc.defaultForRefunds && (
                    <button
                      type="button"
                      disabled={actionInProgress === acc.id}
                      onClick={() => handleSetRefundDefault(acc.id)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                    >
                      Đặt hoàn tiền
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={actionInProgress === acc.id}
                  onClick={() => handleDelete(acc.id)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  title="Xóa tài khoản"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">Thêm tài khoản ngân hàng</h3>
                <p className="text-xs text-muted-foreground">
                  Hỗ trợ tạo mã VietQR chuyển khoản nhanh trực tiếp 24/7.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                </span>
                <select
                  value={selectedBin}
                  onChange={(e) => setSelectedBin(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {VIETNAMESE_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.code} - {b.shortName} ({b.name})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Số tài khoản ngân hàng <span className="text-red-500">*</span>
                </span>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
                  placeholder="Ví dụ: 0987654321"
                  required
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Tên chủ tài khoản (viết hoa không dấu) <span className="text-red-500">*</span>
                </span>
                <input
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: NGUYEN VAN A"
                  required
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-semibold uppercase tracking-wider outline-none focus:border-primary"
                />
              </label>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defaultIncoming}
                    onChange={(e) => setDefaultIncoming(e.target.checked)}
                    className="rounded border-border text-primary"
                  />
                  <span>Đặt làm tài khoản mặc định nhận thanh toán tiền thuê</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defaultRefund}
                    onChange={(e) => setDefaultRefund(e.target.checked)}
                    className="rounded border-border text-primary"
                  />
                  <span>Đặt làm tài khoản mặc định nhận hoàn tiền cọc</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 disabled:opacity-60"
                >
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {submitting ? "Đang lưu..." : "Lưu tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
