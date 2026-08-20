'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Camera, Check, LoaderCircle } from 'lucide-react';
import userService from '@/services/user.service';
import storageService from '@/services/storage.service';
import AvatarCropModal from '@/components/avatar/AvatarCropModal';
import { fetchCurrentUser } from '@/features/user/userSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { UpdateUserProfileRequest, UserProfile } from '@/types/user.type';
import { toast } from 'sonner';
import { userProfileSchema, type UserProfileForm } from '@/lib/validation/user.schema';

type ProfileForm = UserProfileForm;

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;

function profileToForm(profile: UserProfile): ProfileForm {
    return {
        username: profile.username ?? '',
        email: profile.email ?? '',
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? null,
        dob: profile.dob ?? null,
        gender:
            profile.gender === 'FEMALE' || profile.gender === 'MALE' || profile.gender === 'OTHER'
                ? profile.gender
                : null,
    };
}

function normalizeProfileForm(form: ProfileForm): ProfileForm {
    return {
        ...form,
        phone: form.phone?.trim() || null,
        dob: form.dob || null,
        gender: form.gender || null,
    };
}

function errorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    return error instanceof Error && error.message ? error.message : fallback;
}

export default function ProfileSection() {
    const profile = useAppSelector((state) => state.user.profile);
    const status = useAppSelector((state) => state.user.status);
    const loadError = useAppSelector((state) => state.user.error);

    if (status === 'loading' || status === 'idle') {
        return (
            <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Đang tải thông tin cá nhân...
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {loadError || 'Không có dữ liệu người dùng.'}
            </div>
        );
    }

    return <ProfileContent key={profile.updatedAt ?? profile.id} profile={profile} />;
}

function ProfileContent({ profile }: { profile: UserProfile }) {
    const dispatch = useAppDispatch();
    const userId = useAppSelector((state) => state.auth.userId);
    const {
        control,
        setValue,
        handleSubmit,
        formState: { errors, isDirty, isSubmitting },
    } = useForm<ProfileForm>({
        resolver: zodResolver(userProfileSchema),
        defaultValues: profileToForm(profile),
        mode: 'onChange',
    });
    const form = useWatch({ control }) as ProfileForm;
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarSource, setAvatarSource] = useState<{
        url: string;
        fileName: string;
    } | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const fullName = useMemo(() => {
        const name = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
        return name || form.username || 'Người dùng';
    }, [form.firstName, form.lastName, form.username]);

    useEffect(() => {
        return () => {
            if (avatarSource) URL.revokeObjectURL(avatarSource.url);
        };
    }, [avatarSource]);

    function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
        setValue(key, value as never, { shouldDirty: true, shouldValidate: true });
    }

    async function handleSaveProfile(validForm: ProfileForm) {
        if (!isDirty || isSubmitting) return;
        try {
            await userService.updateProfile(normalizeProfileForm(validForm) as UpdateUserProfileRequest);
            if (userId) {
                await dispatch(fetchCurrentUser({ userId, force: true })).unwrap();
            }
            const message = 'Cập nhật thông tin cá nhân thành công!';
            toast.success(message);
        } catch (requestError) {
            const message = errorMessage(requestError, 'Không thể cập nhật thông tin cá nhân.');
            toast.error(message);
        }
    }

    function handleInvalidProfile() {
        const firstMessage = Object.values(errors).find((field) => field?.message)?.message;
        if (typeof firstMessage === 'string') toast.error(firstMessage);
    }

    function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || uploadingAvatar) return;

        if (!AVATAR_TYPES.has(file.type)) {
            const message = 'Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WebP.';
            toast.error(message);
            return;
        }
        if (file.size > MAX_SOURCE_IMAGE_SIZE) {
            const message = 'Ảnh gốc không được vượt quá 20 MB.';
            toast.error(message);
            return;
        }

        setAvatarSource({
            url: URL.createObjectURL(file),
            fileName: file.name,
        });
    }

    async function handleCroppedAvatar(file: File) {
        setUploadingAvatar(true);
        try {
            const storageId = await storageService.uploadUserAvatar(file, profile.id);
            await userService.updateAvatar({ storageId });
            await dispatch(fetchCurrentUser({ userId: userId ?? profile.id, force: true })).unwrap();
            const message = 'Cập nhật ảnh đại diện thành công!';
            toast.success(message);
        } catch (requestError) {
            const message = errorMessage(requestError, 'Không thể cập nhật ảnh đại diện.');
            toast.error(message);
            throw new Error(message);
        } finally {
            setUploadingAvatar(false);
        }
    }

    function closeAvatarCrop() {
        if (uploadingAvatar) return;
        setAvatarSource(null);
    }

    return (
        <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
            {avatarSource && (
                <AvatarCropModal
                    imageUrl={avatarSource.url}
                    originalFileName={avatarSource.fileName}
                    onCancel={closeAvatarCrop}
                    onConfirm={handleCroppedAvatar}
                />
            )}
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 shadow-2xs">
                <div className="relative">
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarSelected}
                    />
                    {profile?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={profile.avatarUrl}
                            alt={fullName}
                            className="h-16 w-16 rounded-full object-cover shadow-md sm:h-18 sm:w-18"
                        />
                    ) : (
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-primary text-primary-foreground font-extrabold text-2xl flex items-center justify-center shadow-md">
                            {fullName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-card border border-border text-foreground hover:text-primary shadow-xs transition-colors cursor-pointer"
                        title="Thay đổi ảnh đại diện"
                    >
                        {uploadingAvatar ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Camera className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                    <h3 className="font-bold text-base text-foreground">{fullName}</h3>
                    <p className="text-xs text-muted-foreground">{form.email}</p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit(handleSaveProfile, handleInvalidProfile)}
                className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-2xs"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <TextField
                        label="Tên"
                        value={form.firstName}
                        onChange={(value) => setField('firstName', value)}
                        error={errors.firstName?.message}
                    />
                    <TextField
                        label="Họ"
                        value={form.lastName}
                        onChange={(value) => setField('lastName', value)}
                        error={errors.lastName?.message}
                    />
                    <TextField
                        label="Tên đăng nhập"
                        value={form.username}
                        onChange={(value) => setField('username', value)}
                        error={errors.username?.message}
                    />
                    <TextField
                        label="Số điện thoại"
                        value={form.phone ?? ''}
                        onChange={(value) => setField('phone', value || null)}
                        inputMode="tel"
                        error={errors.phone?.message}
                    />
                    <TextField
                        label="Email liên hệ"
                        value={form.email}
                        onChange={(value) => setField('email', value)}
                        type="email"
                        error={errors.email?.message}
                    />
                    <TextField
                        label="Ngày sinh"
                        value={form.dob ?? ''}
                        onChange={(value) => setField('dob', value || null)}
                        type="date"
                        max={getLatestAdultBirthDate()}
                        error={errors.dob?.message}
                    />

                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-foreground">Giới tính</label>
                        <select
                            value={form.gender ?? ''}
                            onChange={(event) =>
                                setField('gender', (event.target.value || null) as ProfileForm['gender'])
                            }
                            className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all cursor-pointer"
                        >
                            <option value="">Chưa cập nhật</option>
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={!isDirty || isSubmitting || Object.keys(errors).length > 0}
                        className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <LoaderCircle className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        <span>{isSubmitting ? 'Đang cập nhật...' : 'Cập nhật thông tin'}</span>
                    </button>
                </div>
            </form>

            {profile && (
                <section className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-2xs">
                    <div>
                        <h4 className="text-sm font-bold text-foreground">Thông tin hệ thống</h4>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Dữ liệu chỉ đọc được đồng bộ từ tài khoản backend.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ReadOnlyField label="User ID" value={profile.id} mono />
                        <ReadOnlyField label="Role ID" value={profile.roleId || 'Chưa được gán'} mono />
                        <ReadOnlyField label="Vai trò" value={formatRole(profile.role)} />
                        <ReadOnlyField
                            label="Onboarding"
                            value={profile.onBoarded ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                        />
                        <ReadOnlyField
                            label="Trạng thái tài khoản"
                            value={profile.active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                        />
                        <ReadOnlyField label="Ngày tạo" value={formatInstant(profile.createdAt)} />
                        <ReadOnlyField label="Cập nhật gần nhất" value={formatInstant(profile.updatedAt)} />
                    </div>
                </section>
            )}
        </div>
    );
}

function formatInstant(value?: string | null) {
    if (!value) return 'Chưa có dữ liệu';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('vi-VN', {
              dateStyle: 'medium',
              timeStyle: 'medium',
          }).format(date);
}

function getLatestAdultBirthDate() {
    const today = new Date();
    const year = today.getFullYear() - 18;
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatRole(role?: string | null) {
    if (role === 'USER') return 'Người dùng';
    if (role === 'ADMIN') return 'Quản trị viên';
    return role || 'Chưa được gán';
}

function ReadOnlyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`mt-1 break-all text-xs text-foreground ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    type = 'text',
    inputMode,
    max,
    error,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: React.HTMLInputTypeAttribute;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    max?: string;
    error?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">{label}</label>
            <input
                type={type}
                inputMode={inputMode}
                max={max}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={Boolean(error)}
                className={`w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border text-xs sm:text-sm text-foreground outline-none transition-all ${
                    error ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
                }`}
            />
            {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
        </div>
    );
}
