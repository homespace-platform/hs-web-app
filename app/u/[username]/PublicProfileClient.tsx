"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtSign,
  BadgeCheck,
  CalendarDays,
  Copy,
  Home,
  ImageIcon,
  MapPin,
  MessageCircle,
  Pencil,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/common/Breadcrumb";
import UserAvatar from "@/components/common/UserAvatar";
import IdentityBadge from "@/components/settings/IdentityBadge";
import SettingsModal from "@/components/settings/SettingsModal";
import RentCollageCard from "@/components/rent/RentCollageCard";
import userService from "@/services/user.service";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { listingDetailPath } from "@/lib/listing-detail-access";
import { useAuth } from "@/features/auth/useAuth";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import type { PublicUserProfile } from "@/types/user.type";
import type { RentPropertyItem } from "@/types/rent.type";

const card = "rounded-2xl border border-border bg-card shadow-sm";

function Shell({ crumb, children }: { crumb: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-28 sm:px-6">
        <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: crumb }]} className="mb-4" />
        {children}
      </main>
      <Footer />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Đang tải">
      <div className={`${card} flex flex-col items-center gap-5 p-5 sm:p-8 md:flex-row`}>
        <div className="h-24 w-24 shrink-0 rounded-full bg-muted sm:h-28 sm:w-28" />
        <div className="flex flex-1 flex-col items-center gap-2 md:items-start">
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-2 h-6 w-72 max-w-full rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className={`${card} h-64`} />
        <div className={`${card} h-64 lg:col-span-2`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  );
}

export default function PublicProfileClient({ username }: { username: string }) {
  const router = useRouter();
  const { authenticated, login, profile: currentUser } = useAuth();
  const { openConversation } = useChatDemo();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [listings, setListings] = useState<RentPropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingError, setListingError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    userService
      .getPublicProfileByUsername(username)
      .then(async (p) => {
        if (cancelled) return;
        setProfile(p);
        try {
          // ponytail: first 50 covers current profiles; add pagination when an owner exceeds it.
          const res = await listingService.getPublicListings({ ownerId: p.id, page: 1, size: 50 });
          if (!cancelled) setListings((res.result ?? []).map(toRentProperty));
        } catch {
          if (!cancelled) setListingError(true);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <Shell crumb="Trang cá nhân">
        <Skeleton />
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell crumb="Không tìm thấy">
        <div className={`${card} flex flex-col items-center gap-3 px-6 py-20 text-center`}>
          <UserX className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-bold">Không tìm thấy người dùng</h1>
          <p className="text-sm text-muted-foreground">
            Trang cá nhân @{username} không tồn tại hoặc đã bị gỡ.
          </p>
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            Về trang chủ
          </Link>
        </div>
      </Shell>
    );
  }

  // Same order as the settings profile (firstName holds the family name).
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;
  const joinedAt = profile.createdAt
    ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date(profile.createdAt))
    : null;
  const isOwn = currentUser?.id === profile.id;
  const photos = listings.filter((l) => l.images[0]).slice(0, 9);

  const handleMessage = async () => {
    if (!authenticated) {
      login();
      return;
    }
    const conversationId = await openConversation({
      contact: { id: profile.id, name: fullName, avatar: profile.avatarUrl ?? undefined },
    });
    if (conversationId) {
      router.push(`/chat?channel=direct&conversationId=${encodeURIComponent(conversationId)}`);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/u/${encodeURIComponent(profile.username)}`,
      );
      toast.success("Đã sao chép liên kết trang cá nhân");
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const chip = "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground";
  const primaryBtn =
    "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90";

  return (
    <Shell crumb={fullName}>
      <section className={`${card} p-5 sm:p-8`}>
        <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-center md:text-left">
          <UserAvatar
            src={profile.avatarUrl}
            name={fullName}
            sizeClassName="h-24 w-24 shrink-0 text-3xl sm:h-28 sm:w-28"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="break-words text-2xl font-bold sm:text-3xl">{fullName}</h1>
              <IdentityBadge kycVerified={profile.kycVerified} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {joinedAt && (
                <span className={chip}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  Tham gia {joinedAt}
                </span>
              )}
              {profile.provinceName && (
                <span className={chip}>
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.provinceName}
                </span>
              )}
              {profile.kycVerified && (
                <span className={`${chip} bg-primary/10 text-primary`}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Đã xác minh danh tính
                </span>
              )}
              {!listingError && (
                <span className={chip}>
                  <Home className="h-3.5 w-3.5" />
                  {listings.length} tin đăng
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:shrink-0 md:flex-col md:items-stretch">
              {isOwn ? (
                <button type="button" onClick={() => setSettingsOpen(true)} className={primaryBtn}>
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa trang cá nhân
                </button>
              ) : (
                <button type="button" onClick={() => void handleMessage()} className={primaryBtn}>
                  <MessageCircle className="h-4 w-4" />
                  Nhắn tin
                </button>
              )}
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <Copy className="h-4 w-4" />
                Sao chép liên kết
              </button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className={`${card} p-5`}>
            <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
              <AtSign className="h-4 w-4 text-primary" />
              Thông tin cá nhân
            </h2>
            <dl className="divide-y divide-border">
              <InfoRow label="Tên người dùng" value={`@${profile.username}`} />
              {profile.provinceName && <InfoRow label="Khu vực" value={profile.provinceName} />}
              {joinedAt && <InfoRow label="Tham gia" value={joinedAt} />}
              <InfoRow label="Xác minh" value={profile.kycVerified ? "Đã xác minh danh tính" : "Chưa xác minh"} />
            </dl>
          </section>

          {photos.length > 0 && (
            <section className={`${card} p-5`}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                <ImageIcon className="h-4 w-4 text-primary" />
                Ảnh
              </h2>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((l) => (
                  <Link
                    key={l.id}
                    href={listingDetailPath(l)}
                    title={l.title}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={l.images[0]}
                      alt={l.title}
                      fill
                      sizes="120px"
                      className="object-cover transition-transform hover:scale-105"
                      unoptimized
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>

        <section className="min-w-0 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Nhà đang cho thuê</h2>
            {!listingError && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {listings.length}
              </span>
            )}
          </div>
          {listingError ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Không thể tải danh sách nhà. Vui lòng thử lại sau.
            </div>
          ) : listings.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {listings.map((l) => (
                <RentCollageCard key={l.id} property={l} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Home className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isOwn ? "Bạn chưa có nhà đang cho thuê." : "Người dùng này chưa có nhà đang cho thuê."}
              </p>
            </div>
          )}
        </section>
      </div>

      {isOwn && <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </Shell>
  );
}
