"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Check, Eye, EyeOff, LoaderCircle, LockKeyhole, MapPin, UserRound } from "lucide-react";
import userService from "@/services/user.service";
import { fetchCurrentUser } from "@/features/user/userSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { OnboardingRequest, UserProfile } from "@/types/user.type";
import AddressEditor from "@/components/settings/AddressEditor";
import { toast } from "sonner";

type Step = "profile" | "address" | "password";

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

function afterAddressStep(hasPassword: boolean | null) {
  return hasPassword === false ? ("password" as const) : null;
}

export default function OnboardingInitializer() {
  const dispatch = useAppDispatch();
  const authenticated = useAppSelector((state) => state.auth.authenticated);
  const userId = useAppSelector((state) => state.auth.userId);
  const profile = useAppSelector((state) => state.user.profile);
  const profileStatus = useAppSelector((state) => state.user.status);

  const initializedForUser = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("profile");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !authenticated ||
      !userId ||
      profileStatus !== "succeeded" ||
      !profile ||
      profile.onBoarded !== false ||
      initializedForUser.current === userId
    ) {
      return;
    }

    initializedForUser.current = userId;
    setOpen(true);
    setCheckingPassword(true);
    setError(null);

    userService
      .hasPassword()
      .then(setHasPassword)
      .catch((requestError) => {
        initializedForUser.current = null;
        setError(
          getErrorMessage(
            requestError,
            "Không thể kiểm tra trạng thái mật khẩu. Vui lòng thử lại.",
          ),
        );
      })
      .finally(() => setCheckingPassword(false));
  }, [authenticated, profile, profileStatus, userId]);

  if (!open || !profile || !userId) return null;

  function retryPasswordCheck() {
    setCheckingPassword(true);
    setError(null);
    userService
      .hasPassword()
      .then(setHasPassword)
      .catch((requestError) => {
        setError(
          getErrorMessage(
            requestError,
            "Không thể kiểm tra trạng thái mật khẩu. Vui lòng thử lại.",
          ),
        );
      })
      .finally(() => setCheckingPassword(false));
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
        "Không thể hoàn tất thông tin cá nhân. Vui lòng thử lại.",
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
      const next = afterAddressStep(hasPassword);
      if (next) {
        toast.success("Địa chỉ đã được lưu.");
        setStep(next);
      } else {
        setOpen(false);
        toast.success("Thiết lập tài khoản hoàn tất.");
      }
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể làm mới hồ sơ sau khi lưu địa chỉ.",
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
      setOpen(false);
      toast.success("Tạo mật khẩu thành công. Tài khoản đã sẵn sàng.");
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể tạo mật khẩu. Vui lòng thử lại.",
      );
      setError(message);
      toast.error(message);
      throw requestError;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Hoàn tất tài khoản"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-7">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Thiết lập tài khoản
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
            Chào mừng bạn đến với HomeSpace
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hoàn thành các bước dưới đây để bắt đầu sử dụng tài khoản.
          </p>
        </header>

        <StepIndicator step={step} showPasswordStep={hasPassword === false} />

        {checkingPassword ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mb-3 h-7 w-7 animate-spin text-primary" />
            Đang chuẩn bị thiết lập tài khoản...
          </div>
        ) : error && hasPassword === null ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={retryPasswordCheck}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
            >
              Thử lại
            </button>
          </div>
        ) : step === "profile" ? (
          <ProfileStep profile={profile} error={error} onSubmit={finishProfile} />
        ) : step === "address" ? (
          <AddressStep profile={profile} error={error} onComplete={finishAddress} />
        ) : (
          <PasswordStep error={error} onSubmit={finishPassword} />
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
    { id: "profile", label: "Thông tin cá nhân", icon: UserRound },
    { id: "address", label: "Địa chỉ", icon: MapPin },
    ...(showPasswordStep
      ? [{ id: "password" as const, label: "Tạo mật khẩu", icon: LockKeyhole }]
      : []),
  ];

  const order: Step[] = showPasswordStep
    ? ["profile", "address", "password"]
    : ["profile", "address"];
  const currentIndex = order.indexOf(step);

  return (
    <div className="mb-6 flex gap-2">
      {steps.map(({ id, label, icon: Icon }, index) => {
        const active = step === id;
        const completed = currentIndex > index;
        return (
          <div key={id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active || completed
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span
              className={`truncate text-xs font-semibold ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {index + 1}. {label}
            </span>
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
  onSubmit: (request: OnboardingRequest) => Promise<void>;
}) {
  const [form, setForm] = useState(() => profileToForm(profile));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const phone = form.phone.trim();
    const dob = form.dob.trim();

    if (!firstName || !lastName || !phone || !dob || !form.gender) {
      setLocalError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }
    if (firstName.length < 2 || lastName.length < 2) {
      setLocalError("Họ và tên phải có ít nhất 2 ký tự.");
      return;
    }
    if (!/^\d{10,15}$/.test(phone)) {
      setLocalError("Số điện thoại phải gồm 10–15 chữ số.");
      return;
    }

    setLocalError(null);
    setSaving(true);
    try {
      await onSubmit({
        firstName,
        lastName,
        phone,
        dob,
        gender: form.gender,
      });
    } catch {
      // Error is displayed by the parent modal.
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {(localError || error) && <ErrorBox message={localError || error || ""} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Tên"
          value={form.firstName}
          onValueChange={(value) => setField("firstName", value)}
          required
          minLength={2}
          maxLength={50}
        />
        <Input
          label="Họ"
          value={form.lastName}
          onValueChange={(value) => setField("lastName", value)}
          required
          minLength={2}
          maxLength={50}
        />
        <Input
          label="Số điện thoại"
          value={form.phone}
          onValueChange={(value) => setField("phone", value.replace(/\D/g, ""))}
          inputMode="numeric"
          pattern="[0-9]{10,15}"
          required
        />
        <Input
          label="Ngày sinh"
          value={form.dob}
          onValueChange={(value) => setField("dob", value)}
          type="date"
          max={getLatestAdultBirthDate()}
          required
        />
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold text-foreground">
            Giới tính <span className="text-red-500">*</span>
          </span>
          <select
            value={form.gender}
            required
            onChange={(event) =>
              setField("gender", event.target.value as OnboardingForm["gender"])
            }
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary"
          >
            <option value="OTHER">Khác</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
      >
        {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {saving ? "Đang lưu..." : "Lưu và tiếp tục"}
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
      <AddressEditor
        initialAddress={profile.address}
        embedded
        alwaysAllowSave
        saveButtonLabel="Lưu và tiếp tục"
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
  onSubmit: (newPassword: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setLocalError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLocalError(null);
    setSaving(true);
    try {
      await onSubmit(password);
    } catch {
      // Error is displayed by the parent modal.
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {(localError || error) && <ErrorBox message={localError || error || ""} />}
      <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        Tài khoản đăng nhập mạng xã hội chưa có mật khẩu. Hãy tạo mật khẩu để có thể đăng nhập bằng
        email, username hoặc số điện thoại.
      </p>
      <PasswordInput
        label="Mật khẩu mới"
        value={password}
        onChange={setPassword}
        visible={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />
      <PasswordInput
        label="Xác nhận mật khẩu"
        value={confirmPassword}
        onChange={setConfirmPassword}
        visible={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
      />
      <p className="text-[11px] leading-5 text-muted-foreground">
        Tối thiểu 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.
      </p>
      <button
        type="submit"
        disabled={saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
      >
        {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {saving ? "Đang tạo mật khẩu..." : "Hoàn tất thiết lập"}
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
    <label className="space-y-1.5">
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
