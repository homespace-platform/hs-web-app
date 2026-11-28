"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  CalendarDays,
  CheckCheck,
  Clock3,
  FileCheck2,
  Heart,
  House,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  dashboardSummary,
  type TenantSummary,
} from "@/services/dashboard-summary";
import { isSafeActionPath } from "@/services/notification.service";
import {
  day,
  Empty,
  Failure,
  Header,
  integer,
  label,
  Loading,
  Metric,
  money,
  monthText,
  Pair,
  Row,
  Section,
  SetupNotices,
  Tasks,
  time,
  useSummary,
} from "./SummaryUi";

function Spending({ spending }: { spending: TenantSummary["spending"] }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Tổng kỳ đang xem</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-card-foreground">
            {money(spending.total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Phần tiền thuê và phí</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-card-foreground">
            {money(spending.totalExcludingDeposit)}
          </p>
        </div>
      </div>
      {Number(spending.total) > 0 ? (
        <div
          className="h-64 min-w-0"
          role="img"
          aria-label="Biểu đồ cột chồng chi tiêu đã xác nhận theo tháng"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={spending.months.map((month) => ({
                month: monthText(month.month),
                raw: month.byGroup,
                DEPOSIT_FIRST: Number(month.byGroup.DEPOSIT_FIRST ?? 0),
                RENT: Number(month.byGroup.RENT ?? 0),
                UTILITY_OTHER: Number(month.byGroup.UTILITY_OTHER ?? 0),
              }))}
              margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={58}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("vi-VN", {
                    notation: "compact",
                  }).format(value)
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value, name, item) => [
                  money(
                    item.payload?.raw?.[String(item.dataKey)] ?? Number(value),
                  ),
                  String(name),
                ]}
                contentStyle={{
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                name="Cọc và tháng đầu"
                dataKey="DEPOSIT_FIRST"
                stackId="spending"
                fill="var(--chart-1, var(--primary))"
              />
              <Bar
                name="Tiền thuê"
                dataKey="RENT"
                stackId="spending"
                fill="var(--chart-2, var(--muted-foreground))"
              />
              <Bar
                name="Điện nước và phí"
                dataKey="UTILITY_OTHER"
                stackId="spending"
                fill="var(--chart-3, var(--foreground))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty>Chưa có khoản thanh toán nào được xác nhận trong kỳ.</Empty>
      )}
      <details className="text-sm">
        <summary className="min-h-10 cursor-pointer py-2 font-semibold text-primary">
          Xem số liệu từng tháng
        </summary>
        <div className="divide-y divide-border">
          {spending.months.map((month) => (
            <Pair
              key={month.month}
              title={monthText(month.month)}
              value={money(month.total)}
            />
          ))}
        </div>
      </details>
      <p className="text-xs leading-5 text-muted-foreground">
        Theo biên nhận đã xác nhận. Nhóm cọc và tháng đầu gồm cả tiền cọc, không
        phản ánh số dư cọc đang giữ.
      </p>
      <Pair title="Tổng chi 12 tháng" value={money(spending.total12m)} />
      {spending.receiptPdfIssues > 0 && (
        <p className="text-xs text-destructive">
          {spending.receiptPdfIssues} biên nhận chưa có PDF trong thời gian theo
          dõi.
        </p>
      )}
    </>
  );
}

export default function TenantDashboard() {
  const [months, setMonths] = useState<6 | 12>(6);
  const load = useCallback(
    (signal: AbortSignal) => dashboardSummary.tenant(months, signal),
    [months],
  );
  const { data, loading, error, loadedAt, reload } = useSummary(load);
  return (
    <div className="space-y-6 pb-4" aria-busy={loading}>
      <Header tenant at={data?.realNow} reload={reload} busy={loading} />
      {error && <Failure reload={reload} stale={!!data} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <SetupNotices onboarded={data.setup.onboarded} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              title="Nơi đang thuê"
              value={integer(data.leases.activeCount)}
              detail="Hợp đồng thuê đang hiệu lực"
              href="/dashboard/tenant/contracts"
              icon={House}
            />
            <Metric
              title="Cần thanh toán trong 7 ngày"
              value={money(data.payables.dueSoonAmount)}
              detail={
                <>
                  Quá hạn {money(data.payables.overdueAmount)} ·{" "}
                  {data.payables.overdueCount} khoản
                </>
              }
              href="#payments"
              icon={Wallet}
              warning={data.payables.overdueCount > 0}
            />
            <Metric
              title="Việc cần làm"
              value={integer(data.tasks.total)}
              detail={`${data.tasks.urgentCount} việc gấp cần ưu tiên`}
              href="#tasks"
              icon={CheckCheck}
              warning={data.tasks.urgentCount > 0}
            />
            <Metric
              title="Lịch xem sắp tới"
              value={integer(data.visits.upcomingCount)}
              detail="Theo ngày và giờ hẹn thực tế"
              href="/dashboard/viewing-schedules/my-bookings"
              icon={CalendarDays}
            />
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
            <div id="tasks" className="scroll-mt-24">
              <Section
                title="Việc cần làm"
                badge={`${data.tasks.total} việc · ${data.tasks.urgentCount} gấp`}
                icon={CheckCheck}
              >
                <Tasks
                  items={data.tasks.items}
                  now={data}
                  loadedAt={loadedAt}
                />
              </Section>
            </div>
            <Section
              title="Giữ chỗ của bạn"
              badge={data.holds.length}
              icon={Clock3}
              href="/dashboard/rental-requests/my-requests"
            >
              {data.holds.length ? (
                data.holds.map((hold) => (
                  <Row
                    key={hold.rentalRequestId}
                    href={hold.href}
                    title={hold.listingTitle}
                    description={`Hết hạn ${time(hold.holdExpiresAt)}`}
                    value={
                      <>
                        {money(hold.amountDue)}
                        <br />
                        {hold.critical ? "Sắp hết hạn" : "Đang giữ chỗ"}
                      </>
                    }
                    urgent={hold.critical}
                  />
                ))
              ) : (
                <Empty>Chưa có giữ chỗ đang hiệu lực.</Empty>
              )}
            </Section>
            <div id="payments" className="scroll-mt-24">
              <Section
                title="Khoản phải thanh toán"
                badge={
                  data.payables.overdueCount
                    ? `${data.payables.overdueCount} quá hạn`
                    : undefined
                }
                icon={Wallet}
                href="/dashboard/tenant/contracts"
              >
                <Pair
                  title="Quá hạn"
                  value={money(data.payables.overdueAmount)}
                  warning={data.payables.overdueCount > 0}
                />
                <Pair
                  title="Đến hạn trong 7 ngày"
                  value={money(data.payables.dueSoonAmount)}
                />
                {data.payables.next && (
                  <Row
                    href={data.payables.next.href}
                    title="Khoản thanh toán tiếp theo"
                    value={money(data.payables.next.amount)}
                    description={`${data.payables.next.contractNumber || data.payables.next.listingTitle || "Hợp đồng thuê"} · Hạn ${time(data.payables.next.dueAt)}`}
                  />
                )}
                {data.payables.items.length ? (
                  data.payables.items.map((item) => (
                    <Row
                      key={item.paymentId}
                      href={item.href}
                      title={
                        item.contractNumber ||
                        item.listingTitle ||
                        "Khoản thanh toán"
                      }
                      description={
                        <>
                          {item.overdue ? "Quá hạn" : "Hạn"} {time(item.dueAt)}
                          {item.rejectedReason && (
                            <p className="text-destructive">
                              Chứng từ bị từ chối · {item.rejectedReason}
                            </p>
                          )}
                        </>
                      }
                      value={money(item.amount)}
                      urgent={item.overdue}
                    />
                  ))
                ) : (
                  <Empty>Không có khoản đang chờ bạn thanh toán.</Empty>
                )}
                {data.payables.awaiting.count > 0 && (
                  <>
                    <h3 className="pt-2 text-sm font-semibold text-card-foreground">
                      Đã báo chuyển khoản, chờ xác nhận
                    </h3>
                    <Pair
                      title={`${data.payables.awaiting.count} khoản`}
                      value={money(data.payables.awaiting.amount)}
                    />
                    {data.payables.awaiting.items.map((item) => (
                      <Row
                        key={item.paymentId}
                        href={item.href}
                        title={item.contractNumber || "Khoản đã báo thanh toán"}
                        description={`Mốc xác nhận ${time(item.confirmationDueAt)}`}
                        value={money(item.amount)}
                      />
                    ))}
                  </>
                )}
                {data.payables.refundsIncoming.count > 0 && (
                  <>
                    <h3 className="pt-2 text-sm font-semibold text-card-foreground">
                      Tiền hoàn sắp nhận
                    </h3>
                    <Pair
                      title={`${data.payables.refundsIncoming.count} khoản`}
                      value={money(data.payables.refundsIncoming.amount)}
                    />
                    {data.payables.refundsIncoming.items.map((item) => (
                      <Row
                        key={item.paymentId}
                        href={item.href}
                        title={item.contractNumber || "Khoản tiền hoàn"}
                        description={
                          item.autoConfirmAt
                            ? `Tự xác nhận ${time(item.autoConfirmAt)}`
                            : `Hạn ${time(item.dueAt)}`
                        }
                        value={money(item.amount)}
                      />
                    ))}
                  </>
                )}
              </Section>
            </div>
            <div className="space-y-5">
              <Section title="Tiền cọc và hoàn cọc" icon={ArrowDownLeft}>
                <Pair
                  title="Số dư cọc đang giữ"
                  value={money(data.deposits.heldTotal)}
                />
                {data.deposits.items.length ? (
                  data.deposits.items.map((item) => (
                    <Row
                      key={item.contractId}
                      href={item.href}
                      title={item.contractNumber}
                      value={money(item.amount)}
                      description={
                        <>
                          {label(item.status)}
                          {item.status === "CONFIRMED_PAYMENT" && (
                            <p>
                              Số đã thu ban đầu, chưa có sổ dư cọc để xác định
                              số đang giữ.
                            </p>
                          )}
                          {item.closure && (
                            <p>
                              {label(item.closure.status)} · Hoàn{" "}
                              {money(item.closure.refundAmount)} · Hạn{" "}
                              {time(item.closure.refundDueAt)}
                            </p>
                          )}
                        </>
                      }
                    />
                  ))
                ) : (
                  <Empty>Chưa có tiền cọc được ghi nhận.</Empty>
                )}
              </Section>
              <Section
                title="Đang chờ chủ nhà"
                badge={data.waiting.count}
                icon={Clock3}
              >
                {data.waiting.items.length ? (
                  data.waiting.items.map((item, index) => (
                    <Row
                      key={`${item.type}-${item.contractId}-${index}`}
                      href={item.href}
                      title={label(item.type)}
                      description={`${item.contractNumber}${item.respondBy ? ` · Hạn phản hồi ${time(item.respondBy)}` : ""}`}
                    />
                  ))
                ) : (
                  <Empty>Không có đề nghị đang chờ chủ nhà.</Empty>
                )}
              </Section>
            </div>
            <Section
              title="Nơi đang thuê"
              badge={data.leases.activeCount}
              icon={House}
              href="/dashboard/tenant/contracts"
            >
              {data.leases.items.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.leases.items.slice(0, 6).map((lease) => (
                    <Link
                      key={lease.contractId}
                      href={
                        isSafeActionPath(lease.href)
                          ? lease.href
                          : "/dashboard/tenant/contracts"
                      }
                      className="space-y-3 rounded-xl border border-border p-4 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <House aria-hidden className="size-5 text-primary" />
                        <span className="text-xs font-semibold text-primary">
                          {lease.contractNumber}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-card-foreground">
                        {lease.listingTitle || "Nơi thuê theo hợp đồng"}
                      </h3>
                      {lease.listingAddress && (
                        <p className="text-xs leading-5 text-muted-foreground">
                          {lease.listingAddress}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-card-foreground">
                        {money(lease.monthlyRent)}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          / tháng
                        </span>
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {day(lease.startsOn)} → {day(lease.endExclusive)} (ngày
                        kết thúc không bao gồm)
                        {lease.daysRemaining !== null && (
                          <>
                            <br />
                            {lease.daysRemaining > 0
                              ? `Còn ${lease.daysRemaining} ngày`
                              : "Đã đến mốc kết thúc thuê"}
                          </>
                        )}
                        {lease.landlordName && (
                          <>
                            <br />
                            Chủ nhà · {lease.landlordName}
                          </>
                        )}
                      </p>
                      {lease.nextPayment && (
                        <p className="text-xs text-primary">
                          Khoản tiếp theo {money(lease.nextPayment.amount)} ·{" "}
                          {time(lease.nextPayment.dueAt)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty>Bạn chưa có hợp đồng thuê đang hiệu lực.</Empty>
              )}
            </Section>
            <Section
              title="Lịch đi xem"
              badge={data.visits.upcomingCount}
              icon={CalendarDays}
              href="/dashboard/viewing-schedules/my-bookings"
            >
              {data.visits.items.length ? (
                data.visits.items.map((visit) => (
                  <Row
                    key={visit.id}
                    href={`/dashboard/viewing-schedules/my-bookings?appointmentId=${encodeURIComponent(visit.id)}`}
                    title={visit.listingTitle}
                    description={
                      <>
                        {day(visit.appointmentDate)} ·{" "}
                        {visit.startTime.slice(0, 5)}–
                        {visit.endTime.slice(0, 5)}
                        {visit.listingAddress && <p>{visit.listingAddress}</p>}
                        {visit.rescheduleRequested && (
                          <p>
                            Đề nghị đổi lịch · {day(visit.proposedDate)}{" "}
                            {visit.proposedStartTime?.slice(0, 5)}
                          </p>
                        )}
                      </>
                    }
                    value={label(visit.status)}
                  />
                ))
              ) : (
                <Empty>Chưa có lịch đi xem sắp tới.</Empty>
              )}
            </Section>
            <Section
              title="Yêu cầu thuê đã gửi"
              icon={FileCheck2}
              href="/dashboard/rental-requests/my-requests"
            >
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.requests.counts).map(([status, count]) => (
                  <span
                    key={status}
                    className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {label(status)} · {count}
                  </span>
                ))}
              </div>
              {data.requests.open.length ? (
                data.requests.open.map((item) => (
                  <Row
                    key={item.id}
                    href={item.href}
                    title={item.listingTitle}
                    description={
                      item.respondBy
                        ? `Hạn phản hồi ${time(item.respondBy)}`
                        : `Đã gửi ${time(item.createdAt)}`
                    }
                    value={label(item.status)}
                  />
                ))
              ) : (
                <Empty>Chưa có yêu cầu thuê đang mở.</Empty>
              )}
            </Section>
            <Section
              title="Chi tiêu theo tháng"
              icon={Wallet}
              href="/dashboard/invoices"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Theo lịch thanh toán của hệ thống
                </span>
                <label className="text-xs font-semibold text-foreground">
                  <span className="sr-only">Số tháng chi tiêu</span>
                  <select
                    value={months}
                    onChange={(event) =>
                      setMonths(Number(event.target.value) as 6 | 12)
                    }
                    className="min-h-10 rounded-lg border border-border bg-card px-3 text-foreground"
                  >
                    <option value={6}>6 tháng</option>
                    <option value={12}>12 tháng</option>
                  </select>
                </label>
              </div>
              <Spending spending={data.spending} />
            </Section>
            {data.complaints.openCount > 0 && (
              <Section
                title="Khiếu nại của tôi"
                icon={ShieldCheck}
                badge={data.complaints.openCount}
              >
                <Pair
                  title="Chờ bạn phản hồi"
                  value={data.complaints.dueFromMeCount}
                />
                {data.complaints.items.map((item) => (
                  <Row
                    key={item.id}
                    href={item.href}
                    title={item.contractNumber || "Hồ sơ thuê"}
                    description={`Hạn phản hồi ${time(item.respondBy)}`}
                    value={
                      item.responseDueFor === "YOU"
                        ? "Chờ bạn"
                        : "Chờ bên còn lại"
                    }
                    urgent={item.responseDueFor === "YOU"}
                  />
                ))}
              </Section>
            )}
            <Section
              title="Tin đã lưu"
              icon={Heart}
              badge={data.saved.total}
              href="/favorites"
            >
              <Pair
                title="Đang nhận yêu cầu thuê"
                value={data.saved.available}
              />
              <Pair
                title="Hiện chưa nhận yêu cầu"
                value={data.saved.unavailable}
              />
              {data.saved.total === 0 && (
                <Empty>Lưu các nơi ở phù hợp để dễ tìm lại sau.</Empty>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
