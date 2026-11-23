"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  CheckCircle2,
  Landmark,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import bankAccountService from "@/services/bank-account.service";
import type { BankAccount, BankAccountRequest } from "@/types/bank-account.type";
import { useBanks } from "@/hooks/useBanks";
import BankLogo from "@/components/settings/BankLogo";
import BankPicker from "@/components/settings/BankPicker";
import { toast } from "sonner";
import { fetchOnboardingStatus } from "@/features/user/userSlice";
import { useAppDispatch } from "@/store/hooks";
import axios from "axios";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function BankAccountsSection() {
  const dispatch = useAppDispatch();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [selectedBin, setSelectedBin] = useState<string>("");
  const { banks, loading: banksLoading, error: banksError, retry: retryBanks } = useBanks();
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [defaultIncoming, setDefaultIncoming] = useState(true);
  const [defaultRefund, setDefaultRefund] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const selectedBank = banks.find((b) => b.bin === selectedBin) ?? banks[0];

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

  // Escape closes the add dialog even before focus moves into it; the settings modal skips stacked dialogs.
  useEffect(() => {
    if (!showAddModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAddModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddModal]);

  useEffect(() => {
    let active = true;
    bankAccountService.getBankAccounts()
      .then(data => { if (active) setAccounts(data); })
      .catch(err => { if (active) setError(getErrorMessage(err, "Không thể tải danh sách tài khoản ngân hàng.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNumber.trim() || !accountHolderName.trim()) {
      toast.error("Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản.");
      return;
    }

    const bank = selectedBank;
    if (!bank) {
      toast.error("Vui lòng chọn ngân hàng.");
      return;
    }

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
      void dispatch(fetchOnboardingStatus());
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
      void dispatch(fetchOnboardingStatus());
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
      void dispatch(fetchOnboardingStatus());
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
      void dispatch(fetchOnboardingStatus());
      toast.success("Đã xóa tài khoản thành công.");
      await loadAccounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể xóa tài khoản."));
    } finally {
      setActionInProgress(null);
    }
  }

    const addButton = (
    <button
      type="button"
      onClick={() => setShowAddModal(true)}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <Plus className="h-4 w-4" />
      Thêm tài khoản
    </button>
  );
  const toggleRow = (
    checked: boolean,
    onChange: (v: boolean) => void,
    title: string,
    help: string,
  ) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{help}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 text-sm text-muted-foreground">
          Quản lý tài khoản nhận thanh toán tiền thuê hoặc nhận tiền hoàn cọc trực tiếp.
        </p>
        {addButton}
      </div>

      {/* Direct Transfer Transparency Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
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
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-primary" />
          Đang tải danh sách tài khoản...
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={loadAccounts}
            className="mt-3 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Thử lại
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Landmark className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-foreground">Chưa có tài khoản ngân hàng</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Thêm ít nhất một tài khoản để nhận thanh toán tiền thuê và tiền hoàn cọc.
          </p>
          <div className="mt-4">{addButton}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {accounts.map((acc) => {
            const bank = banks.find((b) => b.bin === acc.bankBin);
            const busy = actionInProgress === acc.id;
            const actionBtn =
              "inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50";
            return (
              <div
                key={acc.id}
                className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <BankLogo src={bank?.logo} code={acc.bankCode} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-foreground">{bank?.shortName ?? acc.bankCode}</h3>
                    <p className="truncate text-xs text-muted-foreground" title={acc.bankName}>{acc.bankName}</p>
                  </div>
                  {acc.status === "ACTIVE" && (
                    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Hoạt động
                    </span>
                  )}
                </div>

                <dl className="my-3 space-y-1.5 border-y border-border/60 py-3 text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Số tài khoản</dt>
                    <dd className="truncate font-mono text-sm font-bold tracking-wider text-foreground">{acc.accountNumber}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Chủ tài khoản</dt>
                    <dd className="truncate font-bold uppercase text-foreground" title={acc.accountHolderName}>{acc.accountHolderName}</dd>
                  </div>
                </dl>

                <div className="flex min-h-6 flex-wrap gap-1.5">
                  {acc.defaultForIncomingPayments && (
                    <span className="whitespace-nowrap rounded-lg bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                      Nhận tiền mặc định
                    </span>
                  )}
                  {acc.defaultForRefunds && (
                    <span className="whitespace-nowrap rounded-lg bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                      Hoàn tiền mặc định
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!acc.defaultForIncomingPayments && (
                      <button type="button" disabled={busy} onClick={() => handleSetIncomingDefault(acc.id)} className={actionBtn} title="Đặt làm tài khoản mặc định nhận thanh toán">
                        <ArrowDownToLine className="h-3.5 w-3.5" /> Đặt nhận tiền
                      </button>
                    )}
                    {!acc.defaultForRefunds && (
                      <button type="button" disabled={busy} onClick={() => handleSetRefundDefault(acc.id)} className={actionBtn} title="Đặt làm tài khoản mặc định nhận hoàn tiền">
                        <Undo2 className="h-3.5 w-3.5" /> Đặt hoàn tiền
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(acc.id)}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    title="Xóa tài khoản"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Bank Account Modal (portaled so it stacks above the settings modal, z-[100]) */}
      {showAddModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bank-title"
          >
            <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h3 id="add-bank-title" className="text-lg font-bold text-foreground">Thêm tài khoản ngân hàng</h3>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ tạo mã VietQR chuyển khoản nhanh trực tiếp 24/7.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  aria-label="Đóng"
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddAccount} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                    </span>
                    <BankPicker banks={banks} value={selectedBin} onChange={setSelectedBin} loading={banksLoading} error={banksError} onRetry={retryBanks} />
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      Số tài khoản ngân hàng <span className="text-red-500">*</span>
                    </span>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
                      placeholder="Ví dụ: 0987654321"
                      required
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
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
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-semibold uppercase tracking-wider outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </label>

                  <div className="space-y-2">
                    {toggleRow(defaultIncoming, setDefaultIncoming, "Nhận thanh toán tiền thuê", "Đặt làm tài khoản mặc định nhận thanh toán tiền thuê.")}
                    {toggleRow(defaultRefund, setDefaultRefund, "Nhận hoàn tiền cọc", "Đặt làm tài khoản mặc định nhận hoàn tiền cọc.")}
                  </div>

                  <div aria-label="Xem trước" className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-3">
                    <BankLogo src={selectedBank?.logo} code={selectedBank?.code ?? ""} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{selectedBank?.shortName ?? "Ngân hàng"}</p>
                      <p className="truncate font-mono text-sm tracking-wider text-foreground">
                        {accountNumber || <span className="text-muted-foreground">Số tài khoản</span>}
                      </p>
                      <p className="truncate text-xs font-semibold uppercase text-muted-foreground">
                        {accountHolderName || "Tên chủ tài khoản"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedBank}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {submitting ? "Đang lưu..." : "Lưu tài khoản"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
