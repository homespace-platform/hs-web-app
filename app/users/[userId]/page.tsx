"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Home, Loader2, MessageCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import UserAvatar from "@/components/common/UserAvatar";
import IdentityBadge from "@/components/settings/IdentityBadge";
import RentCollageCard from "@/components/rent/RentCollageCard";
import userService from "@/services/user.service";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { useAuth } from "@/features/auth/useAuth";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import type { PublicUserProfile } from "@/types/user.type";
import type { RentPropertyItem } from "@/types/rent.type";

export default function PublicUserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { authenticated, login, profile: currentUser } = useAuth();
  const { openConversation } = useChatDemo();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [listings, setListings] = useState<RentPropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingError, setListingError] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void Promise.allSettled([
      userService.getPublicProfile(userId),
      // ponytail: first 50 covers current profiles; add pagination when an owner exceeds it.
      listingService.getPublicListings({ ownerId: userId, page: 1, size: 50 }),
    ]).then(([profileResult, listingResult]) => {
      if (cancelled) return;
      if (profileResult.status === "fulfilled") setProfile(profileResult.value);
      if (listingResult.status === "fulfilled") {
        setListings((listingResult.value.result ?? []).map(toRentProperty));
      } else {
        setListingError(true);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Đang tải" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pt-24 text-center">
          <Home className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-bold">Không tìm thấy người dùng</h1>
          <Link href="/chat" className="text-sm font-semibold text-primary hover:underline">
            Quay lại trò chuyện
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const fullName = [profile.lastName, profile.firstName].filter(Boolean).join(" ") || profile.username;
  const joinedAt = profile.createdAt
    ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
        new Date(profile.createdAt),
      )
    : null;

  const handleMessage = async () => {
    if (!authenticated) {
      login();
      return;
    }
    const conversationId = await openConversation({
      contact: {
        id: profile.id,
        name: fullName,
        avatar: profile.avatarUrl ?? undefined,
      },
    });
    if (conversationId) {
      router.push(`/chat?channel=direct&conversationId=${encodeURIComponent(conversationId)}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-28 sm:px-6">
        <Link
          href="/chat"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại trò chuyện
        </Link>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <UserAvatar
              src={profile.avatarUrl}
              name={fullName}
              sizeClassName="h-24 w-24 text-2xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="truncate text-2xl font-bold sm:text-3xl">{fullName}</h1>
                <IdentityBadge kycVerified={profile.kycVerified} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
              {joinedAt && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                  <CalendarDays className="h-4 w-4" />
                  Tham gia từ {joinedAt}
                </p>
              )}
            </div>
            {currentUser?.id !== profile.id && (
              <button
                type="button"
                onClick={() => void handleMessage()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <MessageCircle className="h-4 w-4" />
                Nhắn tin
              </button>
            )}
          </div>
        </section>

        <section className="mt-8">
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
              {listings.map((listing) => (
                <RentCollageCard key={listing.id} property={listing} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Người dùng này chưa có nhà đang cho thuê.
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
