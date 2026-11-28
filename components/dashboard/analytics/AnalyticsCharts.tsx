"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyticsMoney } from "@/lib/landlord-analytics";
import type {
  LandlordAnalytics,
  RevenueMonth,
} from "@/services/landlord-analytics.service";

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
};
const monthLabel = (value: string) => `${value.slice(5)}/${value.slice(2, 4)}`;
const compact = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:p-5">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AnalyticsCharts({ data }: { data: LandlordAnalytics }) {
  const funnel = data.funnel
    ? [
        { label: "Lượt xem", count: data.funnel.views.value },
        { label: "Lịch hẹn", count: data.funnel.appointments },
        { label: "Yêu cầu thuê", count: data.funnel.requests },
        { label: "Hợp đồng", count: data.funnel.contracts },
      ]
    : [];
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <ChartCard
        title="Doanh thu theo tháng"
        description="So sánh tiền đã nhận và khoản đến hạn. Tiền cọc được loại khỏi doanh thu."
      >
        {data.revenue?.length ? (
          <>
            <div
              className="h-64 min-w-0"
              role="img"
              aria-label="Biểu đồ doanh thu đã nhận và khoản đến hạn theo tháng, bảng chi tiết ở bên dưới"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={data.revenue}
                  margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tick={axis}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    tickFormatter={compact}
                    tick={axis}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      const row = payload?.[0]?.payload as
                        RevenueMonth | undefined;
                      return active && row ? (
                        <div className="rounded-xl border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
                          <p className="mb-2 font-semibold">
                            Tháng {String(label)}
                          </p>
                          <p>Đã nhận {analyticsMoney(row.receivedVnd)}</p>
                          <p className="mt-1">
                            Đến hạn {analyticsMoney(row.dueVnd)}
                          </p>
                          <p className="mt-1">
                            Thu ròng {analyticsMoney(row.netVnd)}
                          </p>
                        </div>
                      ) : null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar
                    dataKey={(row: RevenueMonth) => Number(row.receivedVnd)}
                    name="Đã nhận"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey={(row: RevenueMonth) => Number(row.dueVnd)}
                    name="Đến hạn"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-4 border-t border-border pt-3 text-xs">
              <summary className="cursor-pointer font-medium text-primary focus-visible:outline-2 focus-visible:outline-ring">
                Xem số liệu và chi phí từng tháng
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <caption className="sr-only">
                    Chi tiết doanh thu, tiền hoàn và chi phí theo tháng
                  </caption>
                  <thead className="text-muted-foreground">
                    <tr>
                      {[
                        "Tháng",
                        "Đã nhận",
                        "Hoàn",
                        "Thu ròng",
                        "Đến hạn",
                        "Đã thu của kỳ",
                        "Thu trễ kỳ trước",
                        "Phí chậm",
                        "Nợ chuyển kỳ",
                        "Phí hội viên",
                      ].map((label) => (
                        <th key={label} className="px-3 py-2 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenue.map((row) => (
                      <tr key={row.month} className="border-t border-border">
                        <th className="px-3 py-2 font-medium">
                          {monthLabel(row.month)}
                        </th>
                        {[
                          row.receivedVnd,
                          row.refundedVnd,
                          row.netVnd,
                          row.dueVnd,
                          row.dueCollectedVnd,
                          row.lateCollectedVnd,
                          row.lateFeeVnd,
                          row.rolledOverVnd,
                          row.membershipFeeVnd,
                        ].map((value, index) => (
                          <td key={index} className="px-3 py-2 tabular-nums">
                            {analyticsMoney(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <Empty />
        )}
      </ChartCard>

      <ChartCard
        title="Tỉ lệ lấp đầy"
        description="Tỉ lệ ngày-phòng có người ở. Tháng chưa có ngày-phòng được để trống."
      >
        {data.occupancy?.length ? (
          <>
            <div
              className="h-64 min-w-0"
              role="img"
              aria-label="Biểu đồ tỉ lệ lấp đầy theo tháng"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                  data={data.occupancy}
                  margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tick={axis}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(value) => `${Math.round(value * 100)}%`}
                    tick={axis}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(value) => `Tháng ${value}`}
                    formatter={(value) => [
                      value == null
                        ? "Chưa có dữ liệu"
                        : `${(Number(value) * 100).toFixed(1)}%`,
                      "Lấp đầy",
                    ]}
                  />
                  <Line
                    dataKey="rate"
                    name="Lấp đầy"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-4 border-t border-border pt-3 text-xs">
              <summary className="cursor-pointer font-medium text-primary">
                Xem số ngày-phòng
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.occupancy.map((row) => (
                  <p
                    key={row.month}
                    className="flex justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <span>{monthLabel(row.month)}</span>
                    <span className="tabular-nums">
                      {row.occupiedRoomDays.toLocaleString("vi-VN")} /{" "}
                      {row.roomDays.toLocaleString("vi-VN")} ngày-phòng
                    </span>
                  </p>
                ))}
              </div>
            </details>
          </>
        ) : (
          <Empty text="Chưa có phòng liên kết để thống kê lấp đầy." />
        )}
      </ChartCard>

      <ChartCard
        title="Hành trình tìm thuê"
        description={
          data.funnel?.views.cumulative
            ? "Lượt xem là tổng tích luỹ, các bước tiếp theo theo khoảng đã chọn."
            : "Số lượt tương tác được ghi nhận trong khoảng đã chọn."
        }
      >
        {data.funnel ? (
          <>
            <div
              className="h-56 min-w-0"
              role="img"
              aria-label="Số lượt xem, lịch hẹn, yêu cầu thuê và hợp đồng"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={funnel}
                  layout="vertical"
                  margin={{ left: 0, right: 15 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={axis}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={axis}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      Number(value).toLocaleString("vi-VN"),
                      "Số lượng",
                    ]}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-2)"
                    radius={[0, 5, 5, 0]}
                    maxBarSize={25}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {funnel.map((row) => (
                <div key={row.label} className="rounded-xl bg-muted/50 p-3">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {row.count.toLocaleString("vi-VN")}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <Empty />
        )}
      </ChartCard>

      <ChartCard
        title="Lượt xem theo ngày"
        description={
          data.listings?.viewsSince
            ? `Dữ liệu được ghi nhận từ ${new Date(`${data.listings.viewsSince}T00:00:00`).toLocaleDateString("vi-VN")}.`
            : "Dữ liệu theo ngày bắt đầu từ khi bật ghi nhận lượt xem."
        }
      >
        {data.listings?.dailyViews.length ? (
          <div
            className="h-64 min-w-0"
            role="img"
            aria-label="Biểu đồ số lượt xem tin theo ngày"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={data.listings.dailyViews}
                margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
                accessibilityLayer
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickFormatter={(value) =>
                    `${value.slice(8)}/${value.slice(5, 7)}`
                  }
                  tick={axis}
                  minTickGap={30}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={axis}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [
                    Number(value).toLocaleString("vi-VN"),
                    "Lượt xem",
                  ]}
                />
                <Line
                  dataKey="views"
                  name="Lượt xem"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty text="Chưa có lượt xem theo ngày trong khoảng này." />
        )}
      </ChartCard>
    </div>
  );
}

function Empty({
  text = "Chưa có dữ liệu trong khoảng đã chọn.",
}: {
  text?: string;
}) {
  return (
    <p className="flex min-h-52 items-center justify-center px-5 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
