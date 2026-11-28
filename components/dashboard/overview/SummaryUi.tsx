"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCheck,
  ChevronDown,
  House,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardTask, Money } from "@/services/dashboard-summary";
import { isSafeActionPath } from "@/services/notification.service";
import notificationService from "@/services/notification.service";
import userService from "@/services/user.service";
import { workDeadline, workLabel } from "@/services/branch-overview.service";
import { analyticsMoney } from "@/lib/landlord-analytics";
import { useAuth } from "@/features/auth/useAuth";

export const money = (value: Money) => analyticsMoney(value);
export const integer = (value: number) => value.toLocaleString("vi-VN");
const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});
export const time = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value))
    ? timeFormat.format(new Date(value))
    : "Chưa xác định";
export const day = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "Chưa xác định";
export const monthText = (value: string) =>
  value.split("-").reverse().join("/");
export const LINK =
  "inline-flex min-h-10 items-center gap-1 rounded-lg text-sm font-semibold text-primary outline-offset-4 hover:underline focus-visible:outline-2";
const labels: Record<string, string> = {
  ACTIVE: "Đang hiệu lực",
  SIGNING: "Chờ ký",
  DRAFT: "Bản nháp",
  PENDING: "Chờ phản hồi",
  CONFIRMED: "Đã xác nhận",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã huỷ",
  EXPIRED: "Hết hạn",
  COMPLETED: "Hoàn tất",
  WAITING_HANDOVER: "Chờ bàn giao",
  PROPOSED: "Chờ thống nhất",
  REFUND_PENDING: "Chờ hoàn cọc",
  BALANCE_PENDING: "Chờ thanh toán cuối",
  DISPUTED: "Đang trao đổi",
  OPEN: "Đang mở",
  ESCALATED: "Đã chuyển hỗ trợ",
  CONFIRMED_PAYMENT: "Tiền cọc đã thu ban đầu",
  HELD: "Đang giữ",
  REFUNDED: "Đã hoàn",
  PARTIALLY_REFUNDED: "Đã hoàn một phần",
  LANDLORD: "Chủ nhà",
  TENANT: "Người thuê",
  SYSTEM: "Hệ thống",
  NONE: "Đã đủ bước",
  PUBLISHED: "Đang đăng",
  VIOLATION: "Cần xử lý vi phạm",
  HIDDEN: "Đã ẩn",
  PAY_DEPOSIT: "Thanh toán tiền giữ chỗ",
  PAY_FIRST_RENT: "Thanh toán tiền thuê đầu kỳ",
  SIGN_DEPOSIT: "Ký thoả thuận cọc",
  SIGN_LEASE: "Ký hợp đồng thuê",
  SIGN_ANNEX: "Ký phụ lục",
  SIGN_CONFIRM_APP: "Xác nhận ký trên ứng dụng",
  CONFIRM_REFUND: "Xác nhận nhận tiền hoàn",
  RESPOND_DEFAULT_NOTICE: "Phản hồi thông báo vi phạm",
  CLOSURE_RESPONSE: "Phản hồi quyết toán",
  CLOSURE_DISPUTED: "Trao đổi quyết toán",
  COMPLAINT_RESPOND: "Phản hồi khiếu nại",
  DEFAULT_NOTICE: "Thông báo cần phản hồi",
  CLOSURE_ACTION: "Xử lý quyết toán",
  SIGNATURE_FAILED: "Kiểm tra lần ký chưa thành công",
  DEPOSIT_SIGN: "Ký thoả thuận cọc",
  RENEWAL_REQUESTED: "Chờ gia hạn hợp đồng",
  AMENDMENT_WAITING: "Chờ phản hồi phụ lục",
  EARLY_EXIT_PROPOSED: "Chờ thống nhất kết thúc thuê",
  TERMINATION_RESPONSE: "Phản hồi kết thúc thuê",
  UNBRANCHED_RENTAL: "Yêu cầu chưa thuộc chi nhánh",
  UNBRANCHED_VIEWING: "Lịch xem chưa thuộc chi nhánh",
};
export const label = (value: string) => labels[value] ?? workLabel(value)[1];

export function useSummary<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{
    data: T | null;
    error: boolean;
    loading: boolean;
    loadedAt: number;
    source: typeof load;
  }>({ data: null, error: false, loading: true, loadedAt: 0, source: load });
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true }));
    setRefresh((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({
            data,
            error: false,
            loading: false,
            loadedAt: performance.now(),
            source: load,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            data: previous.source === load ? previous.data : null,
            source: load,
            error: true,
            loading: false,
          }));
      });
    return () => controller.abort();
  }, [load, refresh]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 60_000);
    const onFocus = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [reload]);
  return {
    ...state,
    data: state.source === load ? state.data : null,
    error: state.source === load && state.error,
    loading: state.source !== load || state.loading,
    reload,
  };
}
export function Header({
  tenant,
  at,
  reload,
  busy = false,
  children,
}: {
  tenant?: boolean;
  at?: string;
  reload: () => void;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          {tenant ? "Không gian thuê của bạn" : "Quản lý cho thuê"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {tenant ? "Tổng quan người thuê" : "Tổng quan chủ nhà"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {at
            ? `Dữ liệu cập nhật ${time(at)} · Giờ Việt Nam`
            : "Theo dõi các việc cần xử lý và tiến độ thuê."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button
          variant="outline"
          onClick={reload}
          disabled={busy}
          className="h-11 gap-2"
        >
          <RefreshCw
            className={`size-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`}
            aria-hidden
          />
          {busy ? "Đang cập nhật" : "Tải lại"}
        </Button>
      </div>
    </div>
  );
}
export function Failure({
  reload,
  stale = false,
}: {
  reload: () => void;
  stale?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground"
    >
      <p>
        {stale
          ? "Chưa cập nhật được dữ liệu. Các số đang hiển thị là lần tải thành công gần nhất."
          : "Không tải được dữ liệu tổng quan. Vui lòng thử lại."}
      </p>
      <Button variant="outline" onClick={reload}>
        Thử lại
      </Button>
    </div>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      aria-label="Đang tải tổng quan"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-2xl border border-border bg-muted motion-reduce:animate-none"
        />
      ))}
      <span className="sr-only">Đang tải tổng quan</span>
    </div>
  );
}

export function DashboardAccess({ children }: { children: ReactNode }) {
  const { initialized, authenticated, userId, login } = useAuth();
  if (!initialized) return <Loading />;
  if (!authenticated) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold text-card-foreground">
          Đăng nhập để xem tổng quan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Theo dõi công việc, hợp đồng và các khoản thanh toán của bạn.
        </p>
        <Button onClick={() => login()} className="mt-5 min-h-11">
          Đăng nhập
        </Button>
      </div>
    );
  }
  return <div key={userId}>{children}</div>;
}
export function Empty({
  children = "Hiện chưa có mục nào cần xử lý.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
      <CheckCheck aria-hidden className="size-5 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  );
}
export function Section({
  title,
  icon: Icon,
  badge,
  href,
  children,
  failed = false,
}: {
  title: string;
  icon: typeof House;
  badge?: string | number;
  href?: string;
  children: ReactNode;
  failed?: boolean;
}) {
  return (
    <details
      open
      className="group rounded-2xl border border-border bg-card shadow-2xs"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        <Icon className="size-5 shrink-0 text-primary" aria-hidden />
        <h2 className="min-w-0 flex-1 font-bold text-card-foreground">
          {title}
        </h2>
        {badge !== undefined && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {badge}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 border-t border-border p-5">
        {failed ? (
          <p role="status" className="text-sm text-destructive">
            Chưa tải được nhóm dữ liệu này. Nhấn Tải lại để thử lại.
          </p>
        ) : (
          children
        )}
        {href && (
          <Link href={href} className={LINK}>
            Xem tất cả
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </details>
  );
}
export function Metric({
  title,
  value,
  detail,
  href,
  icon: Icon,
  warning = false,
}: {
  title: string;
  value: ReactNode;
  detail: ReactNode;
  href: string;
  icon: typeof House;
  warning?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border bg-card p-5 shadow-2xs transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${warning ? "border-destructive/40" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        <Icon className="size-5 text-primary" aria-hidden />
      </div>
      <p
        className={`mt-4 break-words text-2xl font-bold tracking-tight tabular-nums ${warning ? "text-destructive" : "text-card-foreground"}`}
      >
        {value}
      </p>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">
        {detail}
      </div>
    </Link>
  );
}
export function Pair({
  title,
  value,
  warning = false,
}: {
  title: string;
  value: ReactNode;
  warning?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{title}</span>
      <span
        className={`text-right font-semibold tabular-nums ${warning ? "text-destructive" : "text-card-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}
export function Row({
  href,
  title,
  description,
  value,
  urgent = false,
}: {
  href: string | null | undefined;
  title: string;
  description?: ReactNode;
  value?: ReactNode;
  urgent?: boolean;
}) {
  const target = isSafeActionPath(href) ? href : null;
  const className =
    "flex min-h-16 items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-card-foreground">
          {title}
        </p>
        {description && (
          <div className="mt-1 break-words text-xs leading-5 text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {value !== undefined && (
        <span
          className={`shrink-0 text-right text-xs font-semibold tabular-nums ${urgent ? "text-destructive" : "text-primary"}`}
        >
          {value}
        </span>
      )}
      {target && (
        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </>
  );
  return target ? (
    <Link href={target} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
export function Tasks({
  items,
  now,
  loadedAt,
}: {
  items: DashboardTask[];
  now: { billingNow: string; realNow: string };
  loadedAt: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setElapsed(Math.max(0, performance.now() - loadedAt)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [loadedAt]);
  return items.length ? (
    <div className="space-y-2">
      {items.map((item) => (
        <Row
          key={item.key}
          href={item.href}
          title={label(item.type)}
          description={
            <>
              {[item.roomCode && `Phòng ${item.roomCode}`, item.contextLabel]
                .filter(Boolean)
                .join(" · ")}
              {item.dueAt && <p>{workDeadline(item, now, elapsed)}</p>}
            </>
          }
          urgent={item.priority === "URGENT"}
          value={
            item.priority === "URGENT"
              ? "Gấp"
              : item.priority === "SOON"
                ? "Sắp tới"
                : "Cần xử lý"
          }
        />
      ))}
    </div>
  ) : (
    <Empty>Không có việc cần làm trong danh sách hiện tại.</Empty>
  );
}
export function SetupNotices({
  receivingAccount,
  onboarded,
}: {
  receivingAccount?: boolean;
  onboarded?: boolean;
}) {
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [remindersOff, setRemindersOff] = useState(false);
  useEffect(() => {
    let active = true;
    void userService
      .getProfile()
      .then((profile) => {
        if (active) setKycVerified(profile.kycVerified === true);
      })
      .catch(() => undefined);
    void notificationService
      .getPreferences()
      .then((items) => {
        if (active)
          setRemindersOff(
            items.some(
              (item) =>
                ["PAYMENT", "CONTRACT"].includes(item.category) &&
                (!item.email || !item.push),
            ),
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const notices = [
    ...(kycVerified === false
      ? [
          {
            title: "Xác minh danh tính",
            detail: "Hoàn tất xác minh để sử dụng đầy đủ các bước thuê nhà.",
            href: "/kyc",
          },
        ]
      : []),
    ...(onboarded === false
      ? [
          {
            title: "Hoàn tất hồ sơ",
            detail:
              "Bổ sung thông tin và tài khoản ngân hàng để thanh toán, nhận hoàn tiền.",
            href: "/settings/profile",
          },
        ]
      : []),
    ...(receivingAccount === false
      ? [
          {
            title: "Thêm tài khoản nhận tiền",
            detail:
              "Thiết lập tài khoản ngân hàng mặc định để tiếp nhận thanh toán.",
            href: "/settings/bank-accounts",
          },
        ]
      : []),
    ...(remindersOff
      ? [
          {
            title: "Kiểm tra kênh nhắc hạn",
            detail: "Một số thông báo hợp đồng hoặc thanh toán đang tắt.",
            href: "/settings/notifications",
          },
        ]
      : []),
  ];
  return notices.length ? (
    <div className="grid gap-3 sm:grid-cols-2">
      {notices.map((notice) => (
        <Link
          key={notice.href}
          href={notice.href}
          className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ShieldCheck
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {notice.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {notice.detail}
            </p>
          </div>
          <ArrowRight
            aria-hidden
            className="ml-auto size-4 shrink-0 text-primary"
          />
        </Link>
      ))}
    </div>
  ) : null;
}
