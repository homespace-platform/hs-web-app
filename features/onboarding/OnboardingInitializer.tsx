"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import userService from "@/services/user.service";
import bankAccountService from "@/services/bank-account.service";
import { fetchCurrentUser } from "@/features/user/userSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { OnboardingRequest, UserProfile } from "@/types/user.type";
import { VIETNAMESE_BANKS } from "@/data/banks";
import AddressEditor from "@/components/settings/AddressEditor";
import { toast } from "sonner";

type Step = "profile" | "address" | "password" | "bank";

type OnboardingForm = {
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  gender: "FEMALE" | "MALE" | "OTHER";
};

function getLatestAdultBirthDate() {
  const today = new Date();
  const year = today.getFullYear() - 18;
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function profileToForm(profile: UserProfile): OnboardingForm {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
    dob: profile.dob ?? "",
    gender:
      profile.gender === "MALE" ||
      profile.gender === "FEMALE" ||
      profile.gender === "OTHER"
        ? profile.gender
        : "OTHER",
  };
}

export default function OnboardingInitializer() {
  const dispatch = useAppDispatch();
  const authenticated = useAppSelector((state) => state.auth.authenticated);
  const userId = useAppSelector((state) => state.auth.userId);
  const profile = useAppSelector((state) => state.user.profile);
  const profileStatus = useAppSelector((state) => state.user.status);

  const initializedForUser = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("profile");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !authenticated ||
      !userId ||
      profileStatus !== "succeeded" ||
      !profile ||
      initializedForUser.current === userId
    ) {
      return;
    }

    initializedForUser.current = userId;
    setCheckingStatus(true);
    setError(null);

    Promise.all([
      userService.hasPassword(),
      userService.getOnboardingStatus().catch(() => null),
    ])
      .then(([pwdStatus, onboardingStatus]) => {
        setHasPassword(pwdStatus);

        if (onboardingStatus && !onboardingStatus.completed) {
          setOpen(true);
          if (onboardingStatus.nextStep === "PROFILE") {
            setStep("profile");
          } else if (onboardingStatus.nextStep === "ADDRESS") {
            setStep("address");
          } else if (onboardingStatus.nextStep === "PASSWORD") {
            setStep("password");
          } else if (onboardingStatus.nextStep === "BANK_ACCOUNT") {
            setStep("bank");
          }
        } else if (profile.onBoarded === false) {
          setOpen(true);
          setStep("profile");
        }
      })
      .catch((requestError) => {
        initializedForUser.current = null;
        setError(
          getErrorMessage(
            requestError,
            "Không thể kiểm tra trạng thái tài khoản. Vui lòng tải lại trang."
          )
        );
      })
      .finally(() => setCheckingStatus(false));
  }, [authenticated, profile, profileStatus, userId]);

  if (!open || !profile || !userId) return null;

  function retryStatusCheck() {
    setCheckingStatus(true);
    setError(null);
    Promise.all([
      userService.hasPassword(),
      userService.getOnboardingStatus().catch(() => null),
    ])
      .then(([pwdStatus, onboardingStatus]) => {
        setHasPassword(pwdStatus);
        if (onboardingStatus && !onboardingStatus.completed) {
          setOpen(true);
          if (onboardingStatus.nextStep === "PROFILE") setStep("profile");
          else if (onboardingStatus.nextStep === "ADDRESS") setStep("address");
          else if (onboardingStatus.nextStep === "PASSWORD") setStep("password");
          else if (onboardingStatus.nextStep === "BANK_ACCOUNT") setStep("bank");
        }
      })
      .catch((err) => setError(getErrorMessage(err, "Thử lại thất bại.")))
      .finally(() => setCheckingStatus(false));
  }

  async function finishProfile(request: OnboardingRequest) {
    setError(null);
    try {
      await userService.completeOnboarding(request);
      await dispatch(fetchCurrentUser({ userId: userId!, force: true })).unwrap();
      toast.success("Thông tin cá nhân đã được cập nhật.");
      setStep("address");
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể hoàn tất thông tin cá nhân. Vui lòng thử lại."
      );
      setError(message);
      toast.error(message);
      throw requestError;
    }
  }

  async function finishAddress() {
    setError(null);
    try {
      await dispatch(fetchCurrentUser({ userId: userId!, force: true })).unwrap();
      toast.success("Địa chỉ đã được lưu.");
      if (hasPassword === false) {
        setStep("password");
      } else {
        setStep("bank");
      }
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể làm mới hồ sơ sau khi lưu địa chỉ."
      );
      setError(message);
      toast.error(message);
      throw requestError;
    }
  }

  async function finishPassword(newPassword: string) {
    setError(null);
    try {
      await userService.setInitialPassword({ newPassword });
      setHasPassword(true);
      toast.success("Tạo mật khẩu thành công.");
      setStep("bank");
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể tạo mật khẩu. Vui lòng thử lại."
      );
      setError(message);
      toast.error(message);
      throw requestError;
    }
  }

  async function finishBank() {
    setError(null);
    try {
      await dispatch(fetchCurrentUser({ userId: userId!, force: true })).unwrap();
      setOpen(false);
      toast.success("Thiết lập tài khoản hoàn tất. Chào mừng bạn đến với HomeSpace!");
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể hoàn tất bước tài khoản ngân hàng."
      );
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Hoàn tất tài khoản"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-7">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Thiết lập tài khoản (4 bước)
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
            Chào mừng bạn đến với HomeSpace
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng hoàn thành đầy đủ thông tin bên dưới để kích hoạt tài khoản và sử dụng hệ thống.
          </p>
        </header>

        <StepIndicator step={step} showPasswordStep={hasPassword === false} />

        {checkingStatus ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mb-3 h-7 w-7 animate-spin text-primary" />
            Đang chuẩn bị thiết lập tài khoản...
          </div>
        ) : error && hasPassword === null ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={retryStatusCheck}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
            >
              Thử lại
            </button>
          </div>
        ) : step === "profile" ? (
          <ProfileStep profile={profile} error={error} onSubmit={finishProfile} />
        ) : step === "address" ? (
          <AddressStep profile={profile} error={error} onComplete={finishAddress} />
        ) : step === "password" ? (
          <PasswordStep error={error} onSubmit={finishPassword} />
        ) : (
          <BankStep error={error} onComplete={finishBank} />
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  showPasswordStep,
}: {
  step: Step;
  showPasswordStep: boolean;
}) {
  const steps: { id: Step; label: string; icon: typeof UserRound }[] = [
    { id: "profile", label: "Cá nhân", icon: UserRound },
    { id: "address", label: "Địa chỉ", icon: MapPin },
    ...(showPasswordStep
      ? [{ id: "password" as const, label: "Mật khẩu", icon: LockKeyhole }]
      : []),
    { id: "bank", label: "Tài khoản ngân hàng", icon: Building2 },
  ];

  const order: Step[] = showPasswordStep
    ? ["profile", "address", "password", "bank"]
    : ["profile", "address", "bank"];
  const currentIndex = order.indexOf(step);

  return (
    <div className="mb-6 grid grid-cols-3 sm:grid-cols-4 gap-2">
      {steps.map((item, index) => {
        const isDone = currentIndex > index;
        const isCurrent = currentIndex === index;

        return (
          <div
            key={item.id}
            className={`flex items-center gap-2 rounded-2xl border p-2.5 transition-colors ${
              isCurrent
                ? "border-primary bg-primary/10 text-primary"
                : isDone
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isDone
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : index + 1}
            </div>
            <div className="min-w-0">
              <span className="block truncate text-xs font-semibold">{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileStep({
  profile,
  error,
  onSubmit,
}: {
  profile: UserProfile;
  error: string | null;
  onSubmit: (data: OnboardingRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<OnboardingForm>(() => profileToForm(profile));
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof OnboardingForm>(
    field: K,
    value: OnboardingForm[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.phone.trim() ||
      !form.dob.trim()
    ) {
      setLocalError("Vui lòng nhập đầy đủ các trường bắt buộc.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dob: form.dob.trim(),
        gender: form.gender,
      });
    } catch {
      // parent error display
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {(localError || error) && <ErrorBox message={localError || error || ""} />}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Họ"
          value={form.lastName}
          onValueChange={(val) => updateField("lastName", val)}
          required
          placeholder="Nguyễn"
        />
        <Input
          label="Tên"
          value={form.firstName}
          onValueChange={(val) => updateField("firstName", val)}
          required
          placeholder="Văn A"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Số điện thoại"
          type="tel"
          value={form.phone}
          onValueChange={(val) => updateField("phone", val)}
          required
          placeholder="0912345678"
        />
        <Input
          label="Ngày sinh"
          type="date"
          value={form.dob}
          max={getLatestAdultBirthDate()}
          onValueChange={(val) => updateField("dob", val)}
          required
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-foreground">
          Giới tính <span className="text-red-500">*</span>
        </span>
        <select
          value={form.gender}
          onChange={(e) =>
            updateField("gender", e.target.value as OnboardingForm["gender"])
          }
          className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary"
        >
          <option value="MALE">Nam</option>
          <option value="FEMALE">Nữ</option>
          <option value="OTHER">Khác</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
      >
        {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {saving ? "Đang lưu..." : "Tiếp tục: Cập nhật địa chỉ"}
      </button>
    </form>
  );
}

function AddressStep({
  profile,
  error,
  onComplete,
}: {
  profile: UserProfile;
  error: string | null;
  onComplete: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      {error && <ErrorBox message={error} />}
      <p className="text-xs text-muted-foreground">
        Địa chỉ thường trú hoặc tạm trú hiện tại của bạn để hoàn thiện hồ sơ thành viên.
      </p>
      <AddressEditor
        initialAddress={profile.address || null}
        onSaved={onComplete}
      />
    </div>
  );
}

function PasswordStep({
  error,
  onSubmit,
}: {
  error: string | null;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError("Mật khẩu phải có tối thiểu 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(password);
    } catch {
      // error handled in parent
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {(localError || error) && <ErrorBox message={localError || error || ""} />}
      <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        Tài khoản đăng nhập mạng xã hội chưa có mật khẩu. Hãy tạo mật khẩu để có thể đăng nhập bằng email, username hoặc số điện thoại.
      </p>
      <PasswordInput
        label="Mật khẩu mới"
        value={password}
        onChange={setPassword}
        visible={showPassword}
        onToggle={() => setShowPassword((v) => !v)}
      />
      <PasswordInput
        label="Xác nhận mật khẩu"
        value={confirmPassword}
        onChange={setConfirmPassword}
        visible={showPassword}
        onToggle={() => setShowPassword((v) => !v)}
      />
      <button
        type="submit"
        disabled={saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
      >
        {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {saving ? "Đang lưu..." : "Tiếp tục: Cài đặt tài khoản ngân hàng"}
      </button>
    </form>
  );
}

function BankStep({
  error,
  onComplete,
}: {
  error: string | null;
  onComplete: () => Promise<void>;
}) {
  const [selectedBin, setSelectedBin] = useState<string>(VIETNAMESE_BANKS[0].bin);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedBank = VIETNAMESE_BANKS.find((b) => b.bin === selectedBin) || VIETNAMESE_BANKS[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!accountNumber.trim() || !accountHolderName.trim()) {
      setLocalError("Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản.");
      return;
    }

    setSaving(true);
    try {
      await bankAccountService.createBankAccount({
        bankBin: selectedBank.bin,
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim().toUpperCase(),
        defaultForIncomingPayments: true,
        defaultForRefunds: true,
      });
      await onComplete();
    } catch (err) {
      setLocalError(getErrorMessage(err, "Không thể lưu tài khoản ngân hàng. Vui lòng kiểm tra lại."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {(localError || error) && <ErrorBox message={localError || error || ""} />}

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Chuyển khoản trực tiếp - An toàn tuyệt đối</p>
            <p className="leading-relaxed text-blue-800/80 dark:text-blue-300/80">
              HomeSpace <strong>KHÔNG</strong> phải ví điện tử, <strong>KHÔNG</strong> nhận tiền và <strong>KHÔNG</strong> giữ tiền.
              Tài khoản này dùng để bạn nhận chuyển khoản trực tiếp hoặc nhận tiền hoàn cọc qua VietQR.
            </p>
          </div>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-foreground">
          Ngân hàng thụ hưởng <span className="text-red-500">*</span>
        </span>
        <select
          value={selectedBin}
          onChange={(e) => setSelectedBin(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary"
        >
          {VIETNAMESE_BANKS.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.code} - {b.shortName} ({b.name})
            </option>
          ))}
        </select>
      </label>

      <Input
        label="Số tài khoản ngân hàng"
        value={accountNumber}
        onValueChange={(val) => setAccountNumber(val.replace(/\s+/g, ""))}
        placeholder="Ví dụ: 0987654321"
        required
      />

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

      <button
        type="submit"
        disabled={saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
      >
        {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {saving ? "Đang xác thực & lưu..." : "Hoàn tất thiết lập tài khoản"}
      </button>
    </form>
  );
}

function Input({
  label,
  onValueChange,
  required,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        {...props}
        required={required}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={8}
          className="h-11 w-full rounded-xl border border-border bg-background px-3.5 pr-11 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </div>
  );
}
