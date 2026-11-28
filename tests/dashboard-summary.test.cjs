/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node regression checks. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTs } = require("./helpers/ts-loader.cjs");
const moneyHelpers = loadTs("lib/landlord-analytics.ts");
const calls = [];
let response;
const { dashboardSummary, parseDashboardSummary } = loadTs(
  "services/dashboard-summary.ts",
  {
    "@/lib/landlord-analytics": moneyHelpers,
    "@/lib/axios-client": {
      get: async (...args) => {
        calls.push(args);
        return { data: response };
      },
    },
  },
);

test("preserves monetary JSON tokens beyond Number safe precision and restores count fields", () => {
  const parsed = parseDashboardSummary(
    '{"result":{"revenue":{"receivedVnd":9007199254740993.25},"rooms":{"total":30},"todo":{"total":10},"tasks":{"total":2},"saved":{"total":3},"spending":{"total":9007199254740993.25,"months":[{"total":123.45,"byGroup":{"DEPOSIT_FIRST":100.01,"RENT":20.02,"UTILITY_OTHER":3.42}}]},"deposits":{"heldTotal":9007199254740993.75},"holds":[{"amountDue":123.45}],"payables":{"overdueAmount":1e3}}}',
  ).result;
  assert.equal(parsed.revenue.receivedVnd, "9007199254740993.25");
  assert.equal(parsed.spending.total, "9007199254740993.25");
  assert.equal(parsed.spending.months[0].total, "123.45");
  assert.equal(parsed.spending.months[0].byGroup.DEPOSIT_FIRST, "100.01");
  assert.equal(parsed.deposits.heldTotal, "9007199254740993.75");
  assert.equal(parsed.holds[0].amountDue, "123.45");
  assert.equal(parsed.payables.overdueAmount, "1e3");
  assert.equal(parsed.rooms.total, 30);
  assert.equal(parsed.todo.total, 10);
  assert.equal(parsed.tasks.total, 2);
  assert.equal(parsed.saved.total, 3);
  assert.equal(
    moneyHelpers.analyticsMoney(parsed.spending.total),
    "9.007.199.254.740.993,25 ₫",
  );
});

test("uses verified-user endpoints, backend month defaults and cancellable requests", async () => {
  response = { result: { month: "2026-11" } };
  const controller = new AbortController();
  await dashboardSummary.landlord("", controller.signal);
  await dashboardSummary.landlord("2026-10", controller.signal);
  await dashboardSummary.tenant(6, controller.signal);
  assert.deepEqual(
    calls.map(([url]) => url),
    [
      "/api/v1/dashboard/landlord/summary",
      "/api/v1/dashboard/landlord/summary",
      "/api/v1/dashboard/tenant/summary",
    ],
  );
  assert.equal(calls[0][1].params, undefined);
  assert.deepEqual(calls[1][1].params, { month: "2026-10" });
  assert.deepEqual(calls[2][1].params, { spendMonths: 6 });
  for (const [, config] of calls) {
    assert.equal(config.signal, controller.signal);
    assert.equal(config.timeout, 30000);
    assert.equal(config.transformResponse[0], parseDashboardSummary);
  }
});

test("missing result and invalid JSON cannot produce a false empty dashboard", async () => {
  response = {};
  await assert.rejects(
    dashboardSummary.tenant(12, new AbortController().signal),
  );
  assert.throws(() => parseDashboardSummary("not json"));
  assert.deepEqual(parseDashboardSummary('{"code":1002,"result":null}'), {
    code: 1002,
    result: null,
  });
});
