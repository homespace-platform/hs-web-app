import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const nodeRequire = createRequire(import.meta.url);
const testDirectory = path.dirname(fileURLToPath(import.meta.url));

function load(file, resolve = nodeRequire) {
  const loaded = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(path.join(testDirectory, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(
    resolve,
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const helper = load("lib/landlord-analytics.ts");

test("money tokens keep exact decimals and large amounts without changing user text or counts", () => {
  const raw =
    '{"result":{"receivedVnd":9007199254740993.125,"netVnd":-25.2500,"vnd":1.25e+20,"count":12,"title":"text \\"receivedVnd\\": 123"}}';
  const response = helper.parseAnalyticsResponse(raw).result;
  assert.equal(response.receivedVnd, "9007199254740993.125");
  assert.equal(response.netVnd, "-25.2500");
  assert.equal(response.vnd, "1.25e+20");
  assert.equal(response.count, 12);
  assert.equal(response.title, 'text "receivedVnd": 123');
  assert.equal(
    helper.analyticsMoney(response.receivedVnd),
    "9.007.199.254.740.993,125 ₫",
  );
  assert.equal(helper.analyticsMoney(response.netVnd), "-25,25 ₫");
  assert.equal(
    helper.analyticsMoney(response.vnd),
    "125.000.000.000.000.000.000 ₫",
  );
  assert.equal(helper.analyticsMoney("1e-3"), "0,001 ₫");
  assert.equal(helper.analyticsMoney(null), "—");
});

test("month filters permit backend defaults and exactly 24 months, reject invalid ranges", () => {
  assert.equal(helper.analyticsRangeError("", ""), null);
  assert.equal(helper.analyticsRangeError("2025-01", "2026-12"), null);
  assert.ok(helper.analyticsRangeError("2024-12", "2026-12"));
  assert.ok(helper.analyticsRangeError("2026-12", "2026-11"));
  assert.ok(helper.analyticsRangeError("0000-01", "2026-11"));
  assert.ok(helper.analyticsRangeError("2026-13", "2026-13"));
  assert.ok(helper.analyticsRangeError("2026-01", ""));
});

test("only dashboard-relative backend drilldowns are used", () => {
  assert.equal(
    helper.analyticsDetailHref(
      "/dashboard/payments?id=x",
      "/dashboard/payments",
    ),
    "/dashboard/payments?id=x",
  );
  for (const href of [
    "javascript:alert(1)",
    "//evil.example",
    "https://evil.example",
    "/dashboard/\\evil.example",
  ]) {
    assert.equal(
      helper.analyticsDetailHref(href, "/dashboard/payments"),
      "/dashboard/payments",
    );
  }
});

test("API calls use the Gateway client, exact filters and lossless response transform", async () => {
  const requests = [];
  const client = {
    async get(url, config) {
      requests.push({ url, config });
      return { data: { result: { from: "2026-01" } } };
    },
  };
  const service = load("services/landlord-analytics.service.ts", (name) => {
    if (name === "@/lib/axios-client")
      return { default: client, __esModule: true };
    if (name === "@/lib/landlord-analytics") return helper;
    return nodeRequire(name);
  }).landlordAnalyticsService;
  const signal = new AbortController().signal;
  const result = await service.get(
    {
      from: "2026-01",
      to: "2026-12",
      branchId: "",
      listingId: "",
      noLeadsOnly: false,
      listingPage: 2,
    },
    signal,
  );
  assert.equal(result.from, "2026-01");
  assert.equal(requests[0].url, "/api/v1/dashboard/analytics");
  assert.deepEqual(requests[0].config.params, {
    from: "2026-01",
    to: "2026-12",
    noLeadsOnly: false,
    listingPage: 2,
  });
  assert.equal(requests[0].config.signal, signal);
  assert.equal(
    requests[0].config.transformResponse[0]('{"amountVnd":9007199254740993}')
      .amountVnd,
    "9007199254740993",
  );
});

test("export uses current report filters and rejects empty downloads", async () => {
  const requests = [];
  let body = new Blob(["report"]);
  const client = {
    async get(url, config) {
      requests.push({ url, config });
      return { data: body };
    },
  };
  const service = load("services/landlord-analytics.service.ts", (name) => {
    if (name === "@/lib/axios-client")
      return { default: client, __esModule: true };
    if (name === "@/lib/landlord-analytics") return helper;
    return nodeRequire(name);
  }).landlordAnalyticsService;
  await service.export(
    { from: "2026-01", to: "2026-12", branchId: "branch", noLeadsOnly: true },
    "revenue",
    "pdf",
    "month",
  );
  assert.equal(requests[0].url, "/api/v1/dashboard/analytics/export");
  assert.equal(requests[0].config.responseType, "blob");
  assert.deepEqual(requests[0].config.params, {
    from: "2026-01",
    to: "2026-12",
    branchId: "branch",
    noLeadsOnly: true,
    report: "revenue",
    format: "pdf",
    granularity: "month",
  });
  await service.export({}, "listings", "csv", "receipt");
  assert.equal("granularity" in requests[1].config.params, false);
  body = new Blob([]);
  await assert.rejects(
    () => service.export({}, "listings", "csv", "receipt"),
    /chưa có nội dung/,
  );
});
