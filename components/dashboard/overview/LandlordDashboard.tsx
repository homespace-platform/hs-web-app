"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCheck,
  Clock3,
  FileCheck2,
  House,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { dashboardSummary } from "@/services/dashboard-summary";
import {
  Empty,
  Failure,
  Header,
  integer,
  label,
  LINK,
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

export default function LandlordDashboard() {
  const [month, setMonth] = useState("");
  const load = useCallback(
    (signal: AbortSignal) => dashboardSummary.landlord(month, signal),
    [month],
  );
  const { data, loading, error, loadedAt, reload } = useSummary(load);
  const revenue = data?.revenue;
  return (
    <div className="space-y-6 pb-4" aria-busy={loading}>
      <Header at={data?.realNow} reload={reload} busy={loading}>
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-foreground">
          <span>Tháng</span>
          <input
            aria-label="Tháng báo cáo"
            type="month"
            min="0001-01"
            max="9999-12"
            value={month || data?.month || ""}
            onChange={(event) => setMonth(event.target.value)}
            className="min-w-0 bg-transparent outline-offset-2"
          />
        </label>
      </Header>
      {error && <Failure reload={reload} stale={!!data} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <SetupNotices receivingAccount={data.setup?.hasReceivingAccount} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              title="Phòng đang thuê"
              value={
                data.rooms
                  ? `${integer(data.rooms.occupied)} / ${integer(data.rooms.total)}`
                  : "—"
              }
              detail={
                data.rooms
                  ? `${data.rooms.vacant} phòng trống · ${data.rooms.reserved} giữ chỗ/sắp vào`
                  : "Chưa tải được dữ liệu phòng"
              }
              href="/dashboard/branches"
              icon={House}
            />
            <Metric
              title="Tin đang đăng"
              value={data.listings ? integer(data.listings.published) : "—"}
              detail={
                data.listings
                  ? `${data.listings.pendingReview} chờ duyệt · ${data.listings.draft} bản nháp`
                  : "Chưa tải được dữ liệu tin"
              }
              href="/dashboard/properties"
              icon={Building2}
            />
            <Metric
              title={`Đã nhận · ${monthText(data.month)}`}
              value={revenue ? money(revenue.receivedVnd) : "—"}
              detail={
                revenue
                  ? `${revenue.receiptCount} biên nhận · Hoàn tiền thuê ${money(revenue.refundedVnd)}`
                  : "Chưa tải được dữ liệu tiền"
              }
              href="/dashboard/invoices"
              icon={Wallet}
            />
            <Metric
              title="Khoản quá hạn"
              value={revenue ? money(revenue.overdueVnd) : "—"}
              detail={
                revenue
                  ? `${revenue.overdueCount} khoản cần theo dõi`
                  : "Chưa tải được dữ liệu tiền"
              }
              href="/dashboard/branches"
              icon={Clock3}
              warning={!!revenue && revenue.overdueCount > 0}
            />
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Section
              title="Việc cần làm"
              icon={CheckCheck}
              badge={
                data.todo
                  ? `${data.todo.total} việc · ${data.todo.urgent} gấp`
                  : undefined
              }
              href="/dashboard/branches"
              failed={data.errors.todo}
            >
              {data.todo && (
                <Tasks items={data.todo.items} now={data} loadedAt={loadedAt} />
              )}
            </Section>
            <Section
              title="Thu tiền trong tháng"
              icon={Wallet}
              href="/dashboard/invoices"
              failed={data.errors.money}
            >
              {revenue && (
                <>
                  <Pair
                    title="Dự kiến thu"
                    value={money(revenue.expectedVnd)}
                  />
                  <Pair
                    title="Đã nhận, gồm khoản trả trễ"
                    value={money(revenue.receivedVnd)}
                  />
                  <Pair
                    title="Đã hoàn tiền thuê"
                    value={money(revenue.refundedVnd)}
                  />
                  <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                    Theo biên nhận đã xác nhận. Dự kiến chưa gồm hoá đơn chưa
                    phát hành. Cọc được theo dõi riêng.
                  </p>
                  <Pair
                    title="Tiền cọc đã nhận"
                    value={money(revenue.depositReceivedVnd)}
                  />
                  <Pair
                    title="Khoản trả trễ của kỳ trước"
                    value={money(revenue.lateFromPreviousVnd)}
                  />
                  <Pair
                    title="Phí chậm đã thu"
                    value={money(revenue.lateFeeVnd)}
                  />
                  <Pair
                    title="Nợ chuyển kỳ"
                    value={money(revenue.rolledOverVnd)}
                  />
                  <div className="space-y-2">
                    <Row
                      href="/dashboard/branches"
                      title="Chờ xác nhận chuyển khoản"
                      value={`${revenue.awaitingConfirm.count} · ${money(revenue.awaitingConfirm.vnd)}`}
                      description={
                        revenue.awaitingConfirm.nextDueAt
                          ? `Hạn gần nhất ${time(revenue.awaitingConfirm.nextDueAt)}`
                          : undefined
                      }
                    />
                    <Row
                      href="/dashboard/invoices"
                      title="Khoản chuyển bị từ chối"
                      value={`${revenue.rejected.count} · ${money(revenue.rejected.vnd)}`}
                    />
                    <Row
                      href="/dashboard/landlord/contracts"
                      title="Tiền cần hoàn"
                      value={`${revenue.refundsOwed.count} · ${money(revenue.refundsOwed.vnd)}`}
                    />
                  </div>
                  <Pair
                    title="Tự xác nhận trong 30 ngày"
                    value={integer(revenue.autoConfirmed30d)}
                  />
                  {revenue.receiptPdfIssues > 0 && (
                    <p className="text-xs text-destructive">
                      {revenue.receiptPdfIssues} biên nhận đang chờ hoặc chưa
                      tạo được PDF.
                    </p>
                  )}
                </>
              )}
            </Section>
            <Section
              title="Hợp đồng và quyết toán"
              icon={FileCheck2}
              href="/dashboard/landlord/contracts"
              failed={data.errors.contracts}
            >
              {data.contracts && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {["ACTIVE", "SIGNING", "DRAFT"].map((status) => (
                      <div key={status} className="rounded-xl bg-muted/50 p-3">
                        <p className="text-xl font-bold tabular-nums text-card-foreground">
                          {data.contracts!.byStatus[status] ?? 0}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {label(status)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Pair
                    title="Lần ký cần kiểm tra"
                    value={data.contracts.signatureIssues.failed}
                    warning={data.contracts.signatureIssues.failed > 0}
                  />
                  <Pair
                    title="Chờ xác nhận ký trên ứng dụng"
                    value={data.contracts.signatureIssues.pendingConfirm}
                  />
                  <Pair
                    title="Thoả thuận cọc chờ ký"
                    value={data.contracts.depositAgreements.waitingSign}
                  />
                  <Pair
                    title="Hết hạn, chưa quyết toán"
                    value={data.contracts.closures.endedNotClosed}
                  />
                  {Object.entries(data.contracts.closures.byStatus).map(
                    ([status, count]) => (
                      <Pair key={status} title={label(status)} value={count} />
                    ),
                  )}
                  <Pair
                    title="Tiền hoàn khi quyết toán"
                    value={money(data.contracts.closures.refundVnd)}
                  />
                  {data.contracts.closures.nextRefundDueAt && (
                    <p className="text-xs text-muted-foreground">
                      Hạn hoàn gần nhất{" "}
                      {time(data.contracts.closures.nextRefundDueAt)}
                    </p>
                  )}
                  <div className="space-y-2">
                    {data.expiringContracts?.length ? (
                      data.expiringContracts.map((lease) => (
                        <Row
                          key={lease.contractId}
                          href={lease.href}
                          title={lease.contractNumber}
                          description={[
                            lease.roomCode && `Phòng ${lease.roomCode}`,
                            lease.tenantName,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          value={`Còn ${lease.daysRemaining} ngày`}
                        />
                      ))
                    ) : (
                      <Empty>
                        Không có hợp đồng sắp hết hạn trong danh sách theo dõi.
                      </Empty>
                    )}
                  </div>
                </>
              )}
            </Section>
            <Section
              title="Phòng và tin đăng"
              icon={Building2}
              href="/dashboard/properties"
              failed={data.errors.rooms}
            >
              {data.rooms && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Phòng trống", data.rooms.vacant],
                    ["Đang thuê", data.rooms.occupied],
                    ["Giữ chỗ / sắp vào", data.rooms.reserved],
                    ["Trạng thái khác", data.rooms.other],
                  ].map(([title, count]) => (
                    <div key={title} className="rounded-xl bg-muted/50 p-3">
                      <p className="text-lg font-bold text-card-foreground">
                        {count}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {title}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {data.listings && (
                <>
                  <Pair
                    title="Tin chưa xếp phòng"
                    value={data.listings.unplaced.listings}
                  />
                  <Pair
                    title="Hợp đồng chưa xếp phòng"
                    value={data.listings.unplaced.contracts}
                  />
                  {data.listings.oldestPendingSince && (
                    <p className="text-xs text-muted-foreground">
                      Tin chờ duyệt lâu nhất từ{" "}
                      {time(data.listings.oldestPendingSince)}
                    </p>
                  )}
                  <Pair
                    title="Tin bị từ chối"
                    value={data.listings.needsFix.rejected}
                  />
                  <Pair
                    title="Tin vi phạm"
                    value={data.listings.needsFix.violation}
                  />
                  <Pair
                    title="Tin đã ẩn"
                    value={data.listings.needsFix.hidden}
                  />
                  <div className="space-y-2">
                    {data.listings.needsFix.items.map((item) => (
                      <Row
                        key={item.id}
                        href={item.href}
                        title={item.title}
                        description={item.reason}
                        value={label(item.status)}
                      />
                    ))}
                    {data.expiringListings?.map((item) => (
                      <Row
                        key={item.id}
                        href={item.href}
                        title={item.title}
                        description={`${integer(item.viewCount)} lượt xem · ${item.favorites} lượt lưu${item.noLeads ? " · Chưa có khách quan tâm" : ""}`}
                        value={`Còn ${item.daysRemaining} ngày đăng`}
                      />
                    ))}
                  </div>
                  {data.listings.published === 0 && (
                    <Link href="/dashboard/properties/new" className={LINK}>
                      Đăng tin cho thuê
                    </Link>
                  )}
                </>
              )}
            </Section>
            <Section
              title="Khách và lịch xem"
              icon={CalendarDays}
              href="/dashboard/viewing-schedules"
              failed={data.errors.leads}
            >
              {data.appointments?.length ? (
                data.appointments.map((visit) => (
                  <Row
                    key={visit.id}
                    href={visit.href}
                    title={visit.listingTitle}
                    description={`${visit.renterName} · ${time(visit.at)}`}
                    value={label(visit.status)}
                  />
                ))
              ) : (
                <Empty>Chưa có lịch xem sắp tới.</Empty>
              )}
              {!!data.competing?.length && (
                <>
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Tin có nhiều yêu cầu thuê
                  </h3>
                  {data.competing.map((item) => (
                    <Row
                      key={item.listingId}
                      href={item.href}
                      title={item.title}
                      description={
                        item.nextRespondBy
                          ? `Hạn phản hồi gần nhất ${time(item.nextRespondBy)}`
                          : undefined
                      }
                      value={`${item.pendingCount} yêu cầu`}
                    />
                  ))}
                </>
              )}
              {!!data.holds?.length && (
                <>
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Giữ chỗ đang xử lý
                  </h3>
                  {data.holds.map((hold) => (
                    <Row
                      key={hold.rentalRequestId}
                      href={hold.href}
                      title={hold.listingTitle}
                      description={`${hold.renterName} · Hết hạn ${time(hold.holdExpiresAt)}`}
                      value={`Chờ ${label(hold.waitingFor).toLowerCase()}`}
                    />
                  ))}
                </>
              )}
            </Section>
            <div className="space-y-5">
              <Section
                title="Gói hội viên"
                icon={ShieldCheck}
                href="/dashboard/membership"
                failed={data.errors.membership}
              >
                {data.membership && (
                  <>
                    <Pair title="Gói đang dùng" value={data.membership.tier} />
                    <Pair
                      title="Lượt đăng còn lại"
                      value={
                        data.membership.unlimited
                          ? "Không giới hạn"
                          : data.membership.remainingUses
                      }
                    />
                    <Pair
                      title="Lượt đang giữ"
                      value={data.membership.reservedUses}
                    />
                    <Pair
                      title="Lượt mua thêm còn lại / đang giữ"
                      value={`${data.membership.addonRemaining} / ${data.membership.addonReserved}`}
                    />
                    {data.membership.expiresAt && (
                      <Pair
                        title="Hạn gói"
                        value={time(data.membership.expiresAt)}
                      />
                    )}
                    {data.membership.quotaResetsAt && (
                      <Pair
                        title="Cấp lại lượt"
                        value={time(data.membership.quotaResetsAt)}
                      />
                    )}
                    {data.membership.addonExpiresAt && (
                      <Pair
                        title="Hạn lượt mua thêm"
                        value={time(data.membership.addonExpiresAt)}
                      />
                    )}
                    <Pair
                      title="Đơn đang chờ"
                      value={data.membership.pendingOrders}
                    />
                    {data.membership.nextOrderExpiresAt && (
                      <Pair
                        title="Hạn thanh toán gần nhất"
                        value={time(data.membership.nextOrderExpiresAt)}
                      />
                    )}
                    <Pair
                      title="Đơn lỗi trong 30 ngày"
                      value={data.membership.failedOrders30d}
                    />
                    <Pair
                      title="Chi phí hội viên trong tháng"
                      value={money(data.membership.paidVndMonth)}
                    />
                  </>
                )}
              </Section>
              <Section
                title="Khiếu nại cần theo dõi"
                icon={ShieldCheck}
                badge={data.complaints?.openCount}
                failed={data.errors.complaints}
              >
                {data.complaints && (
                  <>
                    <Pair
                      title="Đang chờ bạn phản hồi"
                      value={data.complaints.dueFromMeCount}
                    />
                    {data.complaints.items.length ? (
                      data.complaints.items.map((item) => (
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
                      ))
                    ) : (
                      <Empty>Không có khiếu nại đang mở.</Empty>
                    )}
                  </>
                )}
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
