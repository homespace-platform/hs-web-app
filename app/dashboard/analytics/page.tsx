"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import axios from "axios";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import branchService, { type PropertyBranch } from "@/services/branch.service";
import listingService from "@/services/listing.service";
import type { MyListingSummaryResponse } from "@/types/listing.type";
import {
  landlordAnalyticsService,
  type AnalyticsQuery,
  type LandlordAnalytics,
} from "@/services/landlord-analytics.service";
import {
  analyticsDetailHref,
  analyticsMoney,
  analyticsRangeError,
  analyticsReports,
  type AnalyticsFilters,
  type AnalyticsReport,
} from "@/lib/landlord-analytics";
import { formatInvoiceDate } from "@/lib/invoice-status";

const AnalyticsCharts = dynamic(
  () => import("@/components/dashboard/analytics/AnalyticsCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-5 xl:grid-cols-2" aria-label="Đang tải biểu đồ">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="h-80 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    ),
  },
);
const fieldClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const emptyFilters: AnalyticsFilters = {
  from: "",
  to: "",
  branchId: "",
  listingId: "",
};

function requestError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403)
      return "Bạn chưa có quyền xem báo cáo này.";
    if (error.response?.status === 404)
      return "Chi nhánh hoặc tin đăng đã chọn không còn khả dụng. Vui lòng chọn lại bộ lọc.";
    if (error.response?.status === 422)
      return "Báo cáo vượt giới hạn 20.000 dòng. Hãy thu hẹp khoảng thời gian hoặc chọn một chi nhánh.";
  }
  return "Không tải được dữ liệu. Vui lòng thử lại.";
}

export default function AnalyticsPage() {
  const [draft, setDraft] = useState<AnalyticsFilters>(emptyFilters);
  const [query, setQuery] = useState<AnalyticsQuery>({
    listingPage: 1,
    listingSize: 10,
  });
  const [result, setResult] = useState<{
    query: AnalyticsQuery;
    data: LandlordAnalytics | null;
    error: string | null;
  } | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [branches, setBranches] = useState<PropertyBranch[]>([]);
  const [branchError, setBranchError] = useState(false);
  const [options, setOptions] = useState<{
    branch: string;
    page: number;
    search: string;
    items: MyListingSummaryResponse[];
    more: boolean;
    error: boolean;
  } | null>(null);
  const [optionPage, setOptionPage] = useState(1);
  const [listingSearch, setListingSearch] = useState("");
  const [report, setReport] = useState<AnalyticsReport>("revenue");
  const [granularity, setGranularity] = useState<"month" | "receipt">("month");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const current = result?.query === query ? result : null;
  const data = current?.data;
  const loading = current == null;
  const optionsLoading =
    options?.branch !== draft.branchId ||
    options?.page !== optionPage ||
    options?.search !== listingSearch;

  useEffect(() => {
    const controller = new AbortController();
    landlordAnalyticsService
      .get(query, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult({ query, data: response, error: null });
        if (!query.from && !query.to)
          setDraft((value) => ({
            ...value,
            from: value.from || response.from,
            to: value.to || response.to,
          }));
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ query, data: null, error: requestError(error) });
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    let active = true;
    branchService
      .getMyBranches()
      .then((rows) => {
        if (active) setBranches(rows);
      })
      .catch(() => {
        if (active) setBranchError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      listingService
        .getMyListings({
          page: optionPage,
          size: 50,
          branchId: draft.branchId || undefined,
          keyword: listingSearch || undefined,
        })
        .then((response) => {
          if (active)
            setOptions({
              branch: draft.branchId,
              page: optionPage,
              search: listingSearch,
              items: response.result,
              more: response.hasMore,
              error: false,
            });
        })
        .catch(() => {
          if (active)
            setOptions({
              branch: draft.branchId,
              page: optionPage,
              search: listingSearch,
              items: [],
              more: false,
              error: true,
            });
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft.branchId, optionPage, listingSearch]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = analyticsRangeError(draft.from, draft.to);
    setFilterError(error);
    if (!error) {
      setExportError(null);
      setQuery({
        ...draft,
        listingPage: 1,
        listingSize: 10,
        noLeadsOnly: query.noLeadsOnly,
      });
    }
  }

  async function exportReport(format: "csv" | "pdf") {
    if (!data || exporting) return;
    setExporting(format);
    setExportError(null);
    try {
      const blob = await landlordAnalyticsService.export(
        { ...query, from: data.from, to: data.to },
        report,
        format,
        granularity,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `homespace-${report}-${data.from}_${data.to}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      setExportError(
        axios.isAxiosError(error) &&
          error.response?.status === 503 &&
          format === "pdf"
          ? "Chưa thể xuất PDF lúc này. Bạn có thể tải CSV hoặc thử lại sau."
          : error instanceof Error && !axios.isAxiosError(error)
            ? error.message
            : requestError(error),
      );
    } finally {
      setExporting(null);
    }
  }

  const latest = data?.revenue?.at(-1);
  return (
    <div className="min-w-0 space-y-5 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Phân tích & Báo cáo
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Theo dõi doanh thu, công nợ và hiệu quả cho thuê.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2"
          disabled={loading}
          onClick={() => setQuery((value) => ({ ...value }))}
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Tải lại
        </Button>
      </header>

      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-2xs sm:p-5"
        aria-label="Bộ lọc báo cáo"
      >
        <form onSubmit={applyFilters} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-xs font-medium text-muted-foreground">
              <span>Chi nhánh</span>
              <select
                value={draft.branchId}
                className={fieldClass}
                onChange={(event) => {
                  setDraft((value) => ({
                    ...value,
                    branchId: event.target.value,
                    listingId: "",
                  }));
                  setOptionPage(1);
                }}
              >
                <option value="">Tất cả chi nhánh</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs font-medium text-muted-foreground">
              <span>Tin đăng</span>
              <select
                value={draft.listingId}
                disabled={optionsLoading}
                className={fieldClass}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    listingId: event.target.value,
                  }))
                }
              >
                <option value="">Tất cả tin đăng</option>
                {draft.listingId &&
                !options?.items.some((row) => row.id === draft.listingId) ? (
                  <option value={draft.listingId}>Tin đã chọn</option>
                ) : null}
                {!optionsLoading &&
                  options?.items.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-2 text-xs font-medium text-muted-foreground">
              <span>Từ tháng</span>
              <input
                type="month"
                min="0001-01"
                max="9999-12"
                value={draft.from}
                className={fieldClass}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, from: event.target.value }))
                }
              />
            </label>
            <label className="space-y-2 text-xs font-medium text-muted-foreground">
              <span>Đến tháng</span>
              <input
                type="month"
                min="0001-01"
                max="9999-12"
                value={draft.to}
                className={fieldClass}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, to: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="analytics-listing-search">
                Tìm tin trong bộ lọc
              </label>
              <input
                id="analytics-listing-search"
                type="search"
                placeholder="Tìm tin theo tên…"
                value={listingSearch}
                onChange={(event) => {
                  setListingSearch(event.target.value);
                  setOptionPage(1);
                }}
                className={`${fieldClass} w-52`}
              />
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                disabled={optionPage === 1 || optionsLoading}
                onClick={() => setOptionPage((page) => page - 1)}
                aria-label="Nhóm tin trước"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Nhóm {optionPage}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                disabled={!options?.more || optionsLoading}
                onClick={() => setOptionPage((page) => page + 1)}
                aria-label="Nhóm tin tiếp"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                disabled={loading}
                onClick={() => {
                  setDraft(emptyFilters);
                  setListingSearch("");
                  setOptionPage(1);
                  setFilterError(null);
                  setQuery({ listingPage: 1, listingSize: 10 });
                }}
              >
                Đặt lại
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 px-5 dark:bg-primary-dark dark:hover:bg-primary-dark/80"
              >
                Áp dụng
              </Button>
            </div>
          </div>
          {filterError ? (
            <p role="alert" className="text-sm text-destructive">
              {filterError}
            </p>
          ) : null}
          {branchError || options?.error ? (
            <p role="status" className="text-xs text-muted-foreground">
              Chưa tải được một phần danh sách bộ lọc. Bạn vẫn có thể xem báo
              cáo tổng hợp hoặc tải lại trang.
            </p>
          ) : null}
        </form>
      </section>

      <section
        className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Xuất báo cáo"
      >
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-accent p-2.5 text-accent-foreground">
            <ArrowDownToLine className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Xuất báo cáo</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              CSV mở được bằng Excel. Báo cáo áp dụng bộ lọc đã tải.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <label className="min-w-36 flex-1 space-y-1 text-xs text-muted-foreground">
            <span>Nội dung</span>
            <select
              value={report}
              onChange={(event) =>
                setReport(event.target.value as AnalyticsReport)
              }
              className={fieldClass}
            >
              {analyticsReports.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {report === "revenue" ? (
            <label className="min-w-32 flex-1 space-y-1 text-xs text-muted-foreground">
              <span>Chi tiết</span>
              <select
                value={granularity}
                onChange={(event) =>
                  setGranularity(event.target.value as "month" | "receipt")
                }
                className={fieldClass}
              >
                <option value="month">Theo tháng</option>
                <option value="receipt">Theo phiếu thu</option>
              </select>
            </label>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            disabled={!data || !!exporting}
            onClick={() => void exportReport("csv")}
          >
            {exporting === "csv" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="size-4" />
            )}
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            disabled={!data || !!exporting}
            onClick={() => void exportReport("pdf")}
          >
            {exporting === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="size-4" />
            )}
            PDF
          </Button>
        </div>
        {exportError ? (
          <p role="alert" className="w-full text-sm text-destructive">
            {exportError}
          </p>
        ) : null}
      </section>

      {loading ? (
        <div
          className="space-y-5"
          aria-busy="true"
          aria-label="Đang tải báo cáo"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-28 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
          <p
            role="status"
            className="text-center text-sm text-muted-foreground"
          >
            Đang tổng hợp dữ liệu…
          </p>
        </div>
      ) : current?.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-card p-6"
        >
          <p className="text-sm text-destructive">{current.error}</p>
          <Button
            type="button"
            className="mt-4 h-11"
            variant="outline"
            onClick={() => setQuery((value) => ({ ...value }))}
          >
            Thử lại
          </Button>
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              Khoảng báo cáo{" "}
              <strong className="font-medium text-foreground">
                {data.from} — {data.to}
              </strong>
            </p>
            <p>
              Tính đến{" "}
              {new Date(data.billingNow).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
          </div>
          {latest ? (
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: `Đã nhận · ${latest.month}`,
                  value: latest.receivedVnd,
                },
                { label: `Thu ròng · ${latest.month}`, value: latest.netVnd },
                {
                  label: "Công nợ hiện tại",
                  value: data.receivables?.totalVnd,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <dt className="text-xs text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-3 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
                    {analyticsMoney(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <AnalyticsCharts data={data} />
          <Receivables data={data} />
          <ListingPerformance
            data={data}
            loading={loading}
            noLeadsOnly={!!query.noLeadsOnly}
            onNoLeadsChange={(value) =>
              setQuery((previous) => ({
                ...previous,
                noLeadsOnly: value,
                listingPage: 1,
              }))
            }
            onPageChange={(page) =>
              setQuery((previous) => ({ ...previous, listingPage: page }))
            }
          />
          <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>
              {data.receiptsSince
                ? `Phiếu thu được ghi nhận từ ${formatInvoiceDate(data.receiptsSince)}. `
                : "Chưa có phiếu thu được ghi nhận. "}
              Lượt xem theo ngày chỉ có từ khi bật ghi nhận. Lịch sử lấp đầy có
              thể dựa trên số phòng hiện tại khi chưa có bản chụp tháng cũ.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Receivables({ data }: { data: LandlordAnalytics }) {
  const debt = data.receivables;
  const labels: Record<string, string> = {
    D0_7: "Trễ 0–7 ngày",
    D8_30: "Trễ 8–30 ngày",
    D31_PLUS: "Trễ trên 30 ngày",
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-2xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Công nợ hiện tại</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {debt
              ? `${debt.count.toLocaleString("vi-VN")} khoản · theo hạn đến ${formatInvoiceDate(debt.asOf)}`
              : "Chưa có dữ liệu"}
          </p>
        </div>
        <Link
          href="/dashboard/payments"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
        >
          Lịch sử thanh toán
          <ArrowRight className="size-4" />
        </Link>
      </div>
      {debt ? (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {debt.buckets.map((bucket) => (
              <div
                key={bucket.key}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <dt className="text-xs text-muted-foreground">
                  {labels[bucket.key] || bucket.key} · {bucket.count} khoản
                </dt>
                <dd className="mt-2 font-semibold tabular-nums">
                  {analyticsMoney(bucket.vnd)}
                </dd>
              </div>
            ))}
          </dl>
          {debt.top.length ? (
            <ul className="mt-4 divide-y divide-border">
              {debt.top.map((row) => (
                <li key={row.paymentId}>
                  <Link
                    href={analyticsDetailHref(row.href, "/dashboard/payments")}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg py-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {row.roomCode || "Khoản thanh toán"}{" "}
                        <span className="font-normal text-muted-foreground">
                          ·{" "}
                          {row.tenantName ||
                            row.contractNumber ||
                            "Hợp đồng thuê"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hạn {formatInvoiceDate(row.dueAt)} · trễ {row.daysLate}{" "}
                        ngày
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {analyticsMoney(row.amountVnd)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Không có khoản quá hạn.
            </p>
          )}
          {debt.count > debt.top.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Đang hiển thị {debt.top.length} khoản nợ lớn nhất. Xem các khoản
              còn lại trong lịch sử thanh toán.
            </p>
          ) : null}
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Chưa tải được dữ liệu công nợ.
        </p>
      )}
    </section>
  );
}

function ListingPerformance({
  data,
  noLeadsOnly,
  loading,
  onNoLeadsChange,
  onPageChange,
}: {
  data: LandlordAnalytics;
  noLeadsOnly: boolean;
  loading: boolean;
  onNoLeadsChange: (value: boolean) => void;
  onPageChange: (value: number) => void;
}) {
  const listings = data.listings;
  const statuses: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING_REVIEW: "Chờ duyệt",
    PUBLISHED: "Đang hiển thị",
    RESERVED: "Đang giữ chỗ",
    RENTED: "Đã cho thuê",
    RENTED_EXTERNALLY: "Đã cho thuê ngoài",
    EXPIRED: "Hết hạn",
    REJECTED: "Bị từ chối",
    HIDDEN: "Đã ẩn",
    VIOLATION: "Vi phạm",
  };
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <h2 className="font-semibold">Hiệu quả tin đăng</h2>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={noLeadsOnly}
            disabled={loading}
            onChange={(event) => onNoLeadsChange(event.target.checked)}
            className="size-4 accent-primary"
          />
          Chỉ tin chưa có khách
        </label>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Tin chưa có khách đã đăng ít nhất 7 ngày và chưa có lịch hẹn hoặc yêu
        cầu thuê.
      </p>
      {!listings?.items.length ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Không có tin đăng khớp bộ lọc.
        </p>
      ) : (
        <>
          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <caption className="sr-only">
                Hiệu quả từng tin đăng trong khoảng đã chọn
              </caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Tin đăng",
                    "Lượt xem trong kỳ",
                    "Tổng lượt xem",
                    "Hẹn xem",
                    "Yêu cầu",
                    "Hợp đồng",
                    "Lượt lưu",
                    "Xem → yêu cầu",
                  ].map((label) => (
                    <th key={label} className="px-3 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.items.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="max-w-72 px-3 py-4">
                      <Link
                        className="block truncate text-sm font-semibold text-primary hover:underline"
                        href={`/dashboard/properties/view?id=${encodeURIComponent(row.id)}`}
                      >
                        {row.title}
                      </Link>
                      <p className="mt-1 truncate text-muted-foreground">
                        {row.branchName || "Tin đăng độc lập"} ·{" "}
                        {statuses[row.status] || row.status}
                      </p>
                      {row.noLeads ? (
                        <span className="mt-2 inline-block rounded-md bg-muted px-2 py-1 text-[11px]">
                          Chưa có khách
                        </span>
                      ) : null}
                    </td>
                    {[
                      row.viewsInRange,
                      row.viewCountTotal,
                      row.appointments,
                      row.requests,
                      row.contracts,
                      row.favorites,
                    ].map((value, index) => (
                      <td key={index} className="px-3 py-4 tabular-nums">
                        {value == null ? "—" : value.toLocaleString("vi-VN")}
                      </td>
                    ))}
                    <td className="px-3 py-4 tabular-nums">
                      {row.viewToRequestRate == null
                        ? "—"
                        : `${(row.viewToRequestRate * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 divide-y divide-border md:hidden">
            {listings.items.map((row) => (
              <li key={row.id} className="py-4">
                <Link
                  href={`/dashboard/properties/view?id=${encodeURIComponent(row.id)}`}
                  className="text-sm font-semibold text-primary"
                >
                  {row.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.branchName || "Tin đăng độc lập"} ·{" "}
                  {statuses[row.status] || row.status}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  {[
                    { label: "Xem trong kỳ", value: row.viewsInRange },
                    { label: "Tổng lượt xem", value: row.viewCountTotal },
                    { label: "Hẹn xem", value: row.appointments },
                    { label: "Yêu cầu", value: row.requests },
                    { label: "Hợp đồng", value: row.contracts },
                    { label: "Lượt lưu", value: row.favorites },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-muted-foreground">{item.label}</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {item.value == null
                          ? "—"
                          : item.value.toLocaleString("vi-VN")}
                      </dd>
                    </div>
                  ))}
                </dl>
                {row.noLeads ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Chưa có khách
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
      {listings ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {listings.total.toLocaleString("vi-VN")} tin · trang {listings.page}{" "}
            / {Math.max(1, Math.ceil(listings.total / listings.size))}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={loading || listings.page <= 1}
              onClick={() => onPageChange(listings.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={
                loading ||
                listings.page * listings.size >= listings.total ||
                listings.page >= 10000
              }
              onClick={() => onPageChange(listings.page + 1)}
            >
              Tiếp
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
