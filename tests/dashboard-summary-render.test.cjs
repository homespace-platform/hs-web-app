/* eslint-disable @typescript-eslint/no-require-imports -- Server-rendered release regression fixtures. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTs } = require("./helpers/ts-loader.cjs");
let auth = {
  initialized: false,
  authenticated: false,
  userId: null,
  login() {},
};
const ui = loadTs("components/dashboard/overview/SummaryUi.tsx", {
  "@/components/ui/button": {
    Button: ({ children, variant: _variant, ...props }) =>
      React.createElement("button", props, children),
  },
  "@/features/auth/useAuth": { useAuth: () => auth },
  "@/services/notification.service": {
    isSafeActionPath: (href) =>
      typeof href === "string" && /^\/(?!\/)/.test(href),
    getPreferences: async () => [],
  },
  "@/services/user.service": {
    getProfile: async () => ({ kycVerified: true }),
  },
  "@/services/branch-overview.service": {
    workLabel: (type) => ["Việc", type],
    workDeadline: () => "Hạn theo đồng hồ hệ thống",
  },
});
const render = (Component, props = {}) =>
  renderToStaticMarkup(React.createElement(Component, props));

test("dashboard waits for initialized authentication and does not mount private content for guests", () => {
  function PrivateContent() {
    throw new Error("Private dashboard mounted too early");
  }
  const child = React.createElement(PrivateContent);
  assert.match(
    render(ui.DashboardAccess, { children: child }),
    /Đang tải tổng quan/,
  );
  auth = { ...auth, initialized: true };
  assert.match(
    render(ui.DashboardAccess, { children: child }),
    /Đăng nhập để xem tổng quan/,
  );
  auth = { ...auth, authenticated: true, userId: "tenant-a" };
  assert.match(
    render(ui.DashboardAccess, { children: "own-data" }),
    /own-data/,
  );
});

test("missing complaint target remains readable without inventing a dashboard link", () => {
  const html = render(ui.Row, {
    href: null,
    title: "Hồ sơ cần theo dõi",
    description: "Đang xử lý",
  });
  assert.match(html, /Hồ sơ cần theo dõi/);
  assert.doesNotMatch(html, /<a |href=/);
});

const base = {
  billingNow: "2026-11-30T17:00:00Z",
  realNow: "2026-11-28T10:00:00Z",
};
let state;
const overrides = { "./SummaryUi": { ...ui, useSummary: () => state } };
const Landlord = loadTs(
  "components/dashboard/overview/LandlordDashboard.tsx",
  overrides,
).default;
const Tenant = loadTs(
  "components/dashboard/overview/TenantDashboard.tsx",
  overrides,
).default;

test("analytics uses the same initialized-account boundary before private requests mount", () => {
  const Analytics = loadTs("app/dashboard/analytics/page.tsx", {
    "@/components/dashboard/overview/SummaryUi": ui,
    "next/dynamic": { __esModule: true, default: () => () => null },
    "@/components/ui/button": {
      Button: ({ children, variant: _variant, ...props }) =>
        React.createElement("button", props, children),
    },
  }).default;
  auth = { ...auth, initialized: false, authenticated: false, userId: null };
  assert.match(render(Analytics), /Đang tải tổng quan/);
  auth = { ...auth, initialized: true };
  const guest = render(Analytics);
  assert.match(guest, /Đăng nhập để xem tổng quan/);
  assert.doesNotMatch(guest, /Bộ lọc báo cáo/);
});

test("landlord partial failure keeps healthy groups and renders unavailable money without fake zero", () => {
  state = {
    reload() {},
    loadedAt: 0,
    loading: false,
    error: false,
    data: {
      ...base,
      month: "2026-11",
      errors: {
        money: true,
        todo: true,
        contracts: true,
        rooms: false,
        leads: false,
        membership: true,
        complaints: true,
      },
      setup: { hasReceivingAccount: false },
      rooms: {
        total: 4,
        occupied: 2,
        vacant: 1,
        reserved: 1,
        other: 0,
        byStatus: {},
      },
      listings: {
        published: 3,
        pendingReview: 0,
        draft: 1,
        oldestPendingSince: null,
        unplaced: { listings: 0, contracts: 0 },
        needsFix: { rejected: 0, violation: 0, hidden: 0, items: [] },
      },
      revenue: null,
      todo: null,
      contracts: null,
      membership: null,
      complaints: null,
      expiringContracts: null,
      appointments: [],
      expiringListings: [],
      competing: [],
      holds: [],
    },
  };
  const html = render(Landlord);
  assert.match(html, /Tổng quan chủ nhà/);
  assert.match(html, /2 \/ 4/);
  assert.match(html, /Thêm tài khoản nhận tiền/);
  assert.match(html, /Chưa tải được dữ liệu tiền/);
  assert.match(html, /Chưa tải được nhóm dữ liệu này/);
  assert.match(html, /href="\/dashboard\/properties"/);
});

test("tenant empty snapshot renders every dashboard group, exact held balance and stale error feedback", () => {
  state = {
    reload() {},
    loadedAt: 0,
    loading: false,
    error: true,
    data: {
      ...base,
      timezone: "Asia/Ho_Chi_Minh",
      setup: { onboarded: true },
      leases: { activeCount: 0, items: [] },
      payables: {
        overdueCount: 0,
        overdueAmount: "0",
        dueSoonAmount: "0",
        next: null,
        items: [],
        awaiting: { count: 0, amount: "0", items: [] },
        refundsIncoming: { count: 0, amount: "0", items: [] },
      },
      tasks: { total: 0, urgentCount: 0, items: [] },
      holds: [],
      visits: { upcomingCount: 0, items: [] },
      requests: { counts: { PENDING: 0 }, open: [] },
      spending: {
        currency: "VND",
        total: "0",
        totalExcludingDeposit: "0",
        total12m: "0",
        total12mExcludingDeposit: "0",
        months: [],
        receiptPdfIssues: 0,
      },
      deposits: { heldTotal: "9007199254740993.25", items: [] },
      waiting: { count: 0, items: [] },
      complaints: { openCount: 0, dueFromMeCount: 0, items: [] },
      saved: { total: 0, available: 0, unavailable: 0 },
    },
  };
  const html = render(Tenant);
  for (const title of [
    "Tổng quan người thuê",
    "Việc cần làm",
    "Giữ chỗ của bạn",
    "Khoản phải thanh toán",
    "Tiền cọc và hoàn cọc",
    "Đang chờ chủ nhà",
    "Nơi đang thuê",
    "Lịch đi xem",
    "Yêu cầu thuê đã gửi",
    "Chi tiêu theo tháng",
    "Tin đã lưu",
  ])
    assert.ok(html.includes(title), title);
  assert.match(html, /9\.007\.199\.254\.740\.993,25/);
  assert.match(html, /lần tải thành công gần nhất/);
  assert.match(html, /href="#payments"/);
  assert.match(html, /href="#tasks"/);
  assert.match(html, /href="\/favorites"/);
});
