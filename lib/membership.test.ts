import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { AxiosError, AxiosHeaders } from "axios";
import {
  DEFAULT_MEMBERSHIP_PLANS,
  MEMBERSHIP_API_BASE_PATH,
  MEMBERSHIP_API_PATHS,
  MEMBERSHIP_PAYMENT_PROVIDERS,
  canCancelMembershipOrder,
  cancelOrderOnQuoteChange,
  clearPendingMembershipOrderId,
  getMembershipErrorMessage,
  getOrderStatusPresentation,
  getPaymentProviderDisplayName,
  getPendingMembershipOrderId,
  isListingQuotaExhaustedError,
  isMembershipDowngradeError,
  isMembershipPendingOrderError,
  isOrderCancelledStatus,
  isOrderFailedStatus,
  isOrderPaidStatus,
  isOrderPendingStatus,
  isOrderReviewStatus,
  isUnlimitedMembership,
  isValidHttpActionUrl,
  isValidSePayActionUrl,
  mergeMembershipPlans,
  normalizeCheckoutResponse,
  normalizeMembershipQuote,
  normalizeMembershipView,
  normalizeOrderProvider,
  normalizeOrderView,
  resolveCancelOrderOutcome,
  savePendingMembershipOrderId,
  submitSePayCheckoutForm,
  validateCheckoutResponse,
} from "./membership.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

describe("membership domain logic and DTO adapters", () => {
  it("merges backend plan DTOs with official tier metadata in canonical order", () => {
    const merged = mergeMembershipPlans([
      { code: "PRO", publicationUses: 30, durationDays: 30, priceVnd: 129_000 },
      { code: "STARTER", publicationUses: 10, durationDays: 30, priceVnd: 49_000 },
      { code: "BUSINESS", publicationUses: 100, durationDays: 30, priceVnd: 349_000 },
      { code: "FREE", publicationUses: 3, durationDays: 0, priceVnd: 0 },
    ]);

    assert.equal(merged.length, 4);
    assert.deepEqual(
      merged.map((p) => [p.code, p.publicationUses, p.durationDays, p.priceVnd]),
      [
        ["FREE", 3, 0, 0],
        ["STARTER", 10, 30, 49_000],
        ["PRO", 30, 30, 129_000],
        ["BUSINESS", 100, 30, 349_000],
      ],
    );
    assert.equal(merged[0].isOneTime, true);
    assert.equal(merged[2].isPopular, true);
  });

  it("falls back to default plans when server list is empty", () => {
    assert.equal(mergeMembershipPlans([]), DEFAULT_MEMBERSHIP_PLANS);
  });

  it("normalizes MembershipView and detects ADMIN unlimited state", () => {
    const starterView = normalizeMembershipView({
      tier: "STARTER",
      remainingUses: 8,
      reservedUses: 1,
      expiresAt: "2026-12-10T00:00:00Z",
      freeUsed: 3,
      unlimited: false,
    });
    assert.equal(starterView.tier, "STARTER");
    assert.equal(starterView.remainingUses, 8);
    assert.equal(starterView.reservedUses, 1);
    assert.equal(isUnlimitedMembership(starterView, null), false);

    const adminView = normalizeMembershipView({
      tier: "ADMIN",
      remainingUses: 999999,
      reservedUses: 0,
      expiresAt: null,
      freeUsed: 0,
      unlimited: true,
    });
    assert.equal(isUnlimitedMembership(adminView, null), true);
  });

  it("normalizes 24h UPGRADE quote and beyond-24h NEW quote from backend", () => {
    const upgradeQuote = normalizeMembershipQuote(
      {
        tier: "PRO",
        amountVnd: 80_000,
        mode: "UPGRADE",
        remainingUsesAfter: 28,
        expiresAtAfter: "2026-12-10T00:00:00Z",
        upgradeDeadline: "2026-11-11T10:00:00Z",
        upgrade: true,
      },
      "PRO",
    );
    assert.equal(upgradeQuote.mode, "UPGRADE");
    assert.equal(upgradeQuote.upgrade, true);
    assert.equal(upgradeQuote.amountVnd, 80_000);
    assert.equal(upgradeQuote.remainingUsesAfter, 28);

    const newQuote = normalizeMembershipQuote(
      {
        tier: "BUSINESS",
        amountVnd: 349_000,
        mode: "NEW",
        remainingUsesAfter: 100,
        expiresAtAfter: "2026-12-10T00:00:00Z",
        upgradeDeadline: null,
        upgrade: false,
      },
      "BUSINESS",
    );
    assert.equal(newQuote.mode, "NEW");
    assert.equal(newQuote.upgrade, false);
    assert.equal(newQuote.amountVnd, 349_000);
    assert.equal(newQuote.remainingUsesAfter, 100);
  });

  it("normalizes checkout and order responses and classifies trusted order statuses", () => {
    const checkout = normalizeCheckoutResponse({
      orderId: "ord_123",
      paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=ord_123",
      amountVnd: 129_000,
    });
    assert.equal(checkout.orderId, "ord_123");
    assert.equal(checkout.amountVnd, 129_000);

    const paidOrder = normalizeOrderView({
      id: "ord_123",
      tier: "PRO",
      amountVnd: 129_000,
      status: "PAID",
      createdAt: "2026-11-10T07:00:00Z",
      paidAt: "2026-11-10T07:02:00Z",
    });
    assert.equal(isOrderPaidStatus(paidOrder.status), true);
    assert.equal(isOrderPendingStatus(paidOrder.status), false);
    assert.equal(isOrderFailedStatus(paidOrder.status), false);

    assert.equal(isOrderPendingStatus("PENDING"), true);
    assert.equal(isOrderFailedStatus("FAILED"), true);
    assert.equal(isOrderFailedStatus("CANCELLED"), true);
    assert.equal(isOrderFailedStatus("EXPIRED"), true);
    assert.equal(isOrderReviewStatus("REVIEW"), true);
    assert.equal(isOrderPendingStatus("REVIEW"), false);
  });

  it("detects HTTP 409 LISTING_QUOTA_EXHAUSTED (4013) and membership error codes 4016 / 4018", () => {
    const headers = new AxiosHeaders();
    const quotaError = new AxiosError(
      "Request failed with status code 409",
      "ERR_BAD_REQUEST",
      { headers },
      null,
      {
        data: {
          code: 4013,
          errorCode: "LISTING_QUOTA_EXHAUSTED",
          message: "Bạn đã hết lượt đăng tin khả dụng",
        },
        status: 409,
        statusText: "Conflict",
        headers,
        config: { headers },
      },
    );
    assert.equal(isListingQuotaExhaustedError(quotaError), true);

    const downgradeError = new AxiosError(
      "Request failed with status code 409",
      "ERR_BAD_REQUEST",
      { headers },
      null,
      {
        data: {
          code: 4016,
          message: "Membership downgrade is not allowed while the current package is active.",
        },
        status: 409,
        statusText: "Conflict",
        headers,
        config: { headers },
      },
    );
    assert.equal(isMembershipDowngradeError(downgradeError), true);

    const pendingOrderError = new AxiosError(
      "Request failed with status code 409",
      "ERR_BAD_REQUEST",
      { headers },
      null,
      {
        data: {
          code: 4018,
          message: "Another membership checkout is already pending.",
        },
        status: 409,
        statusText: "Conflict",
        headers,
        config: { headers },
      },
    );
    assert.equal(isMembershipPendingOrderError(pendingOrderError), true);
    assert.match(getMembershipErrorMessage(pendingOrderError), /15 phút/);

    const otherConflictError = new AxiosError(
      "Request failed with status code 409",
      "ERR_BAD_REQUEST",
      { headers },
      null,
      {
        data: {
          code: 4012,
          message: "Tin đã cho thuê ngoài hệ thống",
        },
        status: 409,
        statusText: "Conflict",
        headers,
        config: { headers },
      },
    );
    assert.equal(isListingQuotaExhaustedError(otherConflictError), false);
  });

  it("targets gateway /api/v1/membership/* contract paths and removes unused /api/membership BFF", () => {
    assert.equal(MEMBERSHIP_API_BASE_PATH, "/api/v1/membership");
    assert.equal(MEMBERSHIP_API_PATHS.plans, "/api/v1/membership/plans");
    assert.equal(MEMBERSHIP_API_PATHS.me, "/api/v1/membership/me");
    assert.equal(MEMBERSHIP_API_PATHS.quote, "/api/v1/membership/quote");
    assert.equal(MEMBERSHIP_API_PATHS.checkout, "/api/v1/membership/checkout");
    assert.equal(
      MEMBERSHIP_API_PATHS.order("ord 123/456"),
      "/api/v1/membership/orders/ord%20123%2F456",
    );
    assert.equal(
      MEMBERSHIP_API_PATHS.cancelOrder("ord 123/456"),
      "/api/v1/membership/orders/ord%20123%2F456/cancel",
    );

    const serviceSource = fs.readFileSync(
      path.join(repoRoot, "services", "membership.service.ts"),
      "utf8",
    );
    assert.match(serviceSource, /\/api\/v1\/membership\/plans/);
    assert.match(serviceSource, /\/api\/v1\/membership\/me/);
    assert.match(serviceSource, /\/api\/v1\/membership\/quote/);
    assert.match(serviceSource, /\/api\/v1\/membership\/checkout/);
    assert.match(
      serviceSource,
      /\/api\/v1\/membership\/orders\/\$\{encodeURIComponent\(orderId\)\}/,
    );
    assert.match(serviceSource, /cancelOrder\(orderId:\s*string\)/);
    assert.match(serviceSource, /MEMBERSHIP_API_PATHS\.cancelOrder\(orderId\)/);
    assert.doesNotMatch(serviceSource, /\/api\/membership\//);

    const unusedBffRoute = path.join(
      repoRoot,
      "app",
      "api",
      "membership",
      "[...path]",
      "route.ts",
    );
    assert.equal(fs.existsSync(unusedBffRoute), false);
  });

  it("allows canceling only trusted backend PENDING orders and resolves cancel race outcomes accurately", () => {
    assert.equal(canCancelMembershipOrder(null), false);
    assert.equal(canCancelMembershipOrder(undefined), false);
    assert.equal(canCancelMembershipOrder({ id: "", status: "PENDING" }), false);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "PENDING" }), true);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "pending" }), true);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "PROCESSING" }), false);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "PAID" }), false);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "REVIEW" }), false);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "FAILED" }), false);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "CANCELLED" }), false);
    assert.equal(canCancelMembershipOrder({ id: "ord_1", status: "EXPIRED" }), false);

    assert.equal(isOrderCancelledStatus("CANCELLED"), true);
    assert.equal(isOrderCancelledStatus("PAID"), false);
    const cancelledMeta = getOrderStatusPresentation("CANCELLED");
    assert.equal(cancelledMeta.label, "Đã hủy thanh toán");
    assert.equal(cancelledMeta.tone, "danger");
    assert.match(cancelledMeta.description, /REVIEW/);

    const cancelledOutcome = resolveCancelOrderOutcome({ status: "CANCELLED" });
    assert.equal(cancelledOutcome.outcome, "cancelled");
    assert.equal(cancelledOutcome.cancelled, true);
    assert.equal(cancelledOutcome.shouldStopPolling, true);
    assert.equal(cancelledOutcome.shouldClearPendingOrder, true);
    assert.match(cancelledOutcome.noticeMessage, /HomeSpace đã được hủy/);
    assert.match(cancelledOutcome.noticeMessage, /VNPAY/);
    assert.match(cancelledOutcome.noticeMessage, /REVIEW/);

    const paidRaceOutcome = resolveCancelOrderOutcome({ status: "PAID" });
    assert.equal(paidRaceOutcome.outcome, "already_paid");
    assert.equal(paidRaceOutcome.cancelled, false);
    assert.equal(paidRaceOutcome.shouldStopPolling, true);
    assert.equal(paidRaceOutcome.shouldClearPendingOrder, true);
    assert.match(paidRaceOutcome.noticeMessage, /PAID/);
    assert.doesNotMatch(paidRaceOutcome.noticeMessage, /HomeSpace đã được hủy/);

    const reviewRaceOutcome = resolveCancelOrderOutcome({ status: "REVIEW" });
    assert.equal(reviewRaceOutcome.outcome, "already_review");
    assert.equal(reviewRaceOutcome.cancelled, false);
    assert.equal(reviewRaceOutcome.shouldStopPolling, true);
    assert.equal(reviewRaceOutcome.shouldClearPendingOrder, true);
    assert.match(reviewRaceOutcome.noticeMessage, /REVIEW/);
    assert.doesNotMatch(reviewRaceOutcome.noticeMessage, /HomeSpace đã được hủy/);

    const failedRaceOutcome = resolveCancelOrderOutcome({ status: "FAILED" });
    assert.equal(failedRaceOutcome.outcome, "already_failed");
    assert.equal(failedRaceOutcome.cancelled, false);
    assert.equal(failedRaceOutcome.shouldStopPolling, true);
    assert.equal(failedRaceOutcome.shouldClearPendingOrder, true);
    assert.match(failedRaceOutcome.noticeMessage, /FAILED/);
    assert.doesNotMatch(failedRaceOutcome.noticeMessage, /HomeSpace đã được hủy/);

    const expiredRaceOutcome = resolveCancelOrderOutcome({ status: "EXPIRED" });
    assert.equal(expiredRaceOutcome.outcome, "already_failed");
    assert.equal(expiredRaceOutcome.cancelled, false);
    assert.equal(expiredRaceOutcome.shouldStopPolling, true);
    assert.equal(expiredRaceOutcome.shouldClearPendingOrder, true);
    assert.match(expiredRaceOutcome.noticeMessage, /EXPIRED/);
    assert.doesNotMatch(expiredRaceOutcome.noticeMessage, /HomeSpace đã được hủy/);
  });

  it("wires return page cancel flow with confirmation, duplicate guard, and race handling", () => {
    const returnPageSource = fs.readFileSync(
      path.join(repoRoot, "app", "dashboard", "membership", "return", "page.tsx"),
      "utf8",
    );
    assert.match(returnPageSource, /canCancelMembershipOrder\(order\)/);
    assert.match(returnPageSource, /membershipService\.cancelOrder\(targetOrderId\)/);
    assert.match(returnPageSource, /resolveCancelOrderOutcome\(updatedOrder\)/);
    assert.match(returnPageSource, /clearPendingMembershipOrderId\(\)/);
    assert.match(returnPageSource, /role="alertdialog"/);
    assert.match(
      returnPageSource,
      /không thể hủy hoặc hoàn trả giao dịch thu tiền phía \{providerLabel\}/,
    );
    assert.match(returnPageSource, /normalizeOrderProvider\(order\.provider\)/);
    assert.match(returnPageSource, /REVIEW/);
    assert.match(returnPageSource, /data-testid="cancel-pending-order-button"/);
    assert.match(returnPageSource, /data-testid="confirm-cancel-order-button"/);
    assert.match(returnPageSource, /data-testid="new-membership-checkout-link"/);
  });

  it("normalizes and validates SePay checkout response (strict HTTPS host/path + signed fields) and submits hidden HTML POST form", () => {
    const sepayCheckout = normalizeCheckoutResponse({
      orderId: "ord_sepay_001",
      paymentUrl: "https://pay-sandbox.sepay.vn/v1/checkout/init",
      amountVnd: 129_000,
      provider: "SEPAY",
      formFields: {
        merchant: "SP_HOMESPACE",
        currency: "VND",
        operation: "PURCHASE",
        order_invoice_number: "ord_sepay_001",
        order_amount: "129000",
        signature: "sig_abc123",
      },
    });

    assert.equal(sepayCheckout.orderId, "ord_sepay_001");
    assert.equal(
      sepayCheckout.paymentUrl,
      "https://pay-sandbox.sepay.vn/v1/checkout/init",
    );
    assert.equal(sepayCheckout.amountVnd, 129_000);
    assert.equal(sepayCheckout.provider, "SEPAY");
    assert.deepEqual(sepayCheckout.formFields, {
      merchant: "SP_HOMESPACE",
      currency: "VND",
      operation: "PURCHASE",
      order_invoice_number: "ord_sepay_001",
      order_amount: "129000",
      signature: "sig_abc123",
    });

    // Accept official sandbox and production HTTPS action URLs
    assert.equal(
      isValidSePayActionUrl("https://pay-sandbox.sepay.vn/v1/checkout/init"),
      true,
    );
    assert.equal(
      isValidSePayActionUrl("https://pay.sepay.vn/v1/checkout/init"),
      true,
    );
    assert.equal(
      isValidHttpActionUrl("https://pay.sepay.vn/v1/checkout/init"),
      true,
    );

    // Reject HTTP, untrusted host, wrong path, non-default port, query/hash
    assert.equal(
      isValidSePayActionUrl("http://pay-sandbox.sepay.vn/v1/checkout/init"),
      false,
    );
    assert.equal(
      isValidSePayActionUrl("https://evil.example.com/v1/checkout/init"),
      false,
    );
    assert.equal(
      isValidSePayActionUrl("https://pay-sandbox.sepay.vn/v1/checkout/other"),
      false,
    );
    assert.equal(
      isValidSePayActionUrl(
        "https://pay-sandbox.sepay.vn:8443/v1/checkout/init",
      ),
      false,
    );
    assert.equal(
      isValidSePayActionUrl(
        "https://pay-sandbox.sepay.vn/v1/checkout/init?foo=1",
      ),
      false,
    );

    const validResult = validateCheckoutResponse(sepayCheckout, "SEPAY");
    assert.equal(validResult.valid, true);
    assert.equal(validResult.errorMessage, null);

    const validProdResult = validateCheckoutResponse(
      {
        ...sepayCheckout,
        paymentUrl: "https://pay.sepay.vn/v1/checkout/init",
      },
      "SEPAY",
    );
    assert.equal(validProdResult.valid, true);

    // Reject wrong provider
    assert.equal(
      validateCheckoutResponse({ ...sepayCheckout, provider: "VNPAY" }, "SEPAY")
        .valid,
      false,
    );
    assert.equal(
      validateCheckoutResponse({ ...sepayCheckout, provider: null }, "SEPAY")
        .valid,
      false,
    );

    // Reject invalid action URL (empty, javascript:, HTTP, non-SePay host, wrong path)
    assert.equal(
      validateCheckoutResponse({ ...sepayCheckout, paymentUrl: "" }, "SEPAY")
        .valid,
      false,
    );
    assert.equal(
      validateCheckoutResponse(
        { ...sepayCheckout, paymentUrl: "javascript:alert(1)" },
        "SEPAY",
      ).valid,
      false,
    );
    assert.equal(
      validateCheckoutResponse(
        {
          ...sepayCheckout,
          paymentUrl: "http://pay-sandbox.sepay.vn/v1/checkout/init",
        },
        "SEPAY",
      ).valid,
      false,
    );
    assert.equal(
      validateCheckoutResponse(
        {
          ...sepayCheckout,
          paymentUrl: "https://attacker.com/v1/checkout/init",
        },
        "SEPAY",
      ).valid,
      false,
    );
    assert.equal(
      validateCheckoutResponse(
        {
          ...sepayCheckout,
          paymentUrl: "https://pay-sandbox.sepay.vn/v2/checkout/init",
        },
        "SEPAY",
      ).valid,
      false,
    );

    // Reject missing or empty formFields
    assert.equal(
      validateCheckoutResponse({ ...sepayCheckout, formFields: {} }, "SEPAY")
        .valid,
      false,
    );

    // Reject missing or empty required signed fields (merchant, currency, operation, signature)
    for (const requiredField of [
      "merchant",
      "currency",
      "operation",
      "signature",
    ]) {
      assert.equal(
        validateCheckoutResponse(
          {
            ...sepayCheckout,
            formFields: {
              ...sepayCheckout.formFields,
              [requiredField]: "   ",
            },
          },
          "SEPAY",
        ).valid,
        false,
        `Expected empty ${requiredField} to fail validation`,
      );
    }

    // Reject order_invoice_number mismatch with checkout.orderId
    const invoiceMismatch = validateCheckoutResponse(
      {
        ...sepayCheckout,
        formFields: {
          ...sepayCheckout.formFields,
          order_invoice_number: "ord_other_999",
        },
      },
      "SEPAY",
    );
    assert.equal(invoiceMismatch.valid, false);
    assert.match(invoiceMismatch.errorMessage ?? "", /order_invoice_number/);

    // Reject order_amount mismatch with checkout.amountVnd
    const amountMismatch = validateCheckoutResponse(
      {
        ...sepayCheckout,
        formFields: {
          ...sepayCheckout.formFields,
          order_amount: "49000",
        },
      },
      "SEPAY",
    );
    assert.equal(amountMismatch.valid, false);
    assert.match(amountMismatch.errorMessage ?? "", /order_amount/);

    // Verify hidden HTML POST form creation and submission
    const appendedForms: Array<{
      method: string;
      action: string;
      style: { display: string };
      attributes: Record<string, string>;
      inputs: Array<{ type: string; name: string; value: string }>;
      submitted: boolean;
    }> = [];

    const mockDoc = {
      body: {
        appendChild(node: unknown) {
          appendedForms.push(node as (typeof appendedForms)[number]);
          return node;
        },
      },
      createElement(tag: string) {
        if (tag === "form") {
          const formObj = {
            method: "",
            action: "",
            style: { display: "" },
            attributes: {} as Record<string, string>,
            inputs: [] as Array<{ type: string; name: string; value: string }>,
            submitted: false,
            setAttribute(k: string, v: string) {
              this.attributes[k] = v;
            },
            appendChild(child: { type: string; name: string; value: string }) {
              this.inputs.push(child);
              return child;
            },
            submit() {
              this.submitted = true;
            },
          };
          return formObj;
        }
        if (tag === "input") {
          return { type: "", name: "", value: "" };
        }
        throw new Error(`Unexpected tag ${tag}`);
      },
    } as unknown as Document;

    submitSePayCheckoutForm(sepayCheckout, mockDoc);
    assert.equal(appendedForms.length, 1);
    const submittedForm = appendedForms[0];
    assert.equal(submittedForm.method, "POST");
    assert.equal(
      submittedForm.action,
      "https://pay-sandbox.sepay.vn/v1/checkout/init",
    );
    assert.equal(submittedForm.style.display, "none");
    assert.equal(submittedForm.submitted, true);
    assert.deepEqual(submittedForm.inputs, [
      { type: "hidden", name: "merchant", value: "SP_HOMESPACE" },
      { type: "hidden", name: "currency", value: "VND" },
      { type: "hidden", name: "operation", value: "PURCHASE" },
      { type: "hidden", name: "order_invoice_number", value: "ord_sepay_001" },
      { type: "hidden", name: "order_amount", value: "129000" },
      { type: "hidden", name: "signature", value: "sig_abc123" },
    ]);

    assert.throws(() =>
      submitSePayCheckoutForm({ ...sepayCheckout, formFields: {} }, mockDoc),
    );
    assert.throws(() =>
      submitSePayCheckoutForm(
        {
          ...sepayCheckout,
          paymentUrl: "http://pay-sandbox.sepay.vn/v1/checkout/init",
        },
        mockDoc,
      ),
    );
    assert.equal(appendedForms.length, 1);
  });

  it("handles quote change order cancellation accurately: clears ID only on CANCELLED, preserves ID on failure or non-CANCELLED terminal status", async () => {
    const storageMap = new Map<string, string>();
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      sessionStorage: {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => {
          storageMap.set(k, v);
        },
        removeItem: (k: string) => {
          storageMap.delete(k);
        },
      },
    };

    try {
      const cancelledOrderIds: string[] = [];

      // 1. Successful CANCELLED status -> clears session order ID and reports cancelled: true
      savePendingMembershipOrderId("ord_changed_1");
      const cancelledRes = await cancelOrderOnQuoteChange(
        { orderId: "ord_changed_1", amountVnd: 129_000 },
        80_000,
        async (orderId) => {
          cancelledOrderIds.push(orderId);
          return { status: "CANCELLED" };
        },
      );
      assert.equal(cancelledRes.quoteChanged, true);
      assert.equal(cancelledRes.cancelled, true);
      assert.equal(cancelledRes.resolution, "cancelled");
      assert.equal(cancelledRes.preservedOrderId, null);
      assert.equal(getPendingMembershipOrderId(), null);
      assert.match(cancelledRes.message ?? "", /Đơn tạm đã được hủy/);
      assert.deepEqual(cancelledOrderIds, ["ord_changed_1"]);

      // 2. Cancel API throws -> preserves order ID in sessionStorage, cancelled: false, does NOT claim cancelled
      clearPendingMembershipOrderId();
      const failedCancelRes = await cancelOrderOnQuoteChange(
        { orderId: "ord_cancel_fail_2", amountVnd: 129_000 },
        80_000,
        async (orderId) => {
          cancelledOrderIds.push(orderId);
          throw new Error("Network error while canceling");
        },
      );
      assert.equal(failedCancelRes.quoteChanged, true);
      assert.equal(failedCancelRes.cancelled, false);
      assert.equal(failedCancelRes.resolution, "cancel_failed");
      assert.equal(failedCancelRes.preservedOrderId, "ord_cancel_fail_2");
      assert.equal(getPendingMembershipOrderId(), "ord_cancel_fail_2");
      assert.doesNotMatch(
        failedCancelRes.message ?? "",
        /Đơn tạm đã được hủy/,
      );
      assert.match(
        failedCancelRes.message ?? "",
        /chưa thể tự động hủy đơn tạm #ord_cancel_fail_2/,
      );

      // 3. Cancel API returns non-CANCELLED terminal status (e.g. PAID or REVIEW) -> preserves order ID, cancelled: false, does NOT claim cancelled
      clearPendingMembershipOrderId();
      const nonCancelledTerminalRes = await cancelOrderOnQuoteChange(
        { orderId: "ord_already_paid_3", amountVnd: 129_000 },
        80_000,
        async (orderId) => {
          cancelledOrderIds.push(orderId);
          return { status: "PAID" };
        },
      );
      assert.equal(nonCancelledTerminalRes.quoteChanged, true);
      assert.equal(nonCancelledTerminalRes.cancelled, false);
      assert.equal(
        nonCancelledTerminalRes.resolution,
        "not_cancelled_terminal",
      );
      assert.equal(
        nonCancelledTerminalRes.preservedOrderId,
        "ord_already_paid_3",
      );
      assert.equal(nonCancelledTerminalRes.orderStatus, "PAID");
      assert.equal(getPendingMembershipOrderId(), "ord_already_paid_3");
      assert.doesNotMatch(
        nonCancelledTerminalRes.message ?? "",
        /Đơn tạm đã được hủy/,
      );
      assert.match(nonCancelledTerminalRes.message ?? "", /PAID/);
      assert.match(nonCancelledTerminalRes.message ?? "", /chưa được hủy/);

      // 4. Quote unchanged -> does not call cancel API
      const unchangedRes = await cancelOrderOnQuoteChange(
        { orderId: "ord_same_4", amountVnd: 80_000 },
        80_000,
        async (orderId) => {
          cancelledOrderIds.push(orderId);
          return { status: "CANCELLED" };
        },
      );
      assert.equal(unchangedRes.quoteChanged, false);
      assert.equal(unchangedRes.cancelled, false);
      assert.equal(unchangedRes.resolution, "unchanged");
      assert.deepEqual(cancelledOrderIds, [
        "ord_changed_1",
        "ord_cancel_fail_2",
        "ord_already_paid_3",
      ]);
    } finally {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  });

  it("maps OrderView.provider for SEPAY, VNPAY, and legacy null -> VNPAY across return and cancel texts", () => {
    assert.equal(normalizeOrderProvider("SEPAY"), "SEPAY");
    assert.equal(normalizeOrderProvider("VNPAY"), "VNPAY");
    assert.equal(normalizeOrderProvider(null), "VNPAY");
    assert.equal(normalizeOrderProvider(undefined), "VNPAY");
    assert.equal(getPaymentProviderDisplayName("SEPAY"), "SePay");
    assert.equal(getPaymentProviderDisplayName("VNPAY"), "VNPAY");
    assert.equal(getPaymentProviderDisplayName(null), "VNPAY");

    const sepayOrder = normalizeOrderView({
      id: "ord_sp",
      tier: "PRO",
      amountVnd: 129_000,
      status: "CANCELLED",
      provider: "SEPAY",
    });
    assert.equal(sepayOrder.provider, "SEPAY");

    const legacyNullOrder = normalizeOrderView({
      id: "ord_legacy",
      tier: "STARTER",
      amountVnd: 49_000,
      status: "CANCELLED",
      provider: null,
    });
    assert.equal(legacyNullOrder.provider, "VNPAY");

    const sepayCancelOutcome = resolveCancelOrderOutcome(sepayOrder);
    assert.match(sepayCancelOutcome.noticeMessage, /SePay/);
    assert.doesNotMatch(sepayCancelOutcome.noticeMessage, /VNPAY/);

    const legacyCancelOutcome = resolveCancelOrderOutcome(legacyNullOrder);
    assert.match(legacyCancelOutcome.noticeMessage, /VNPAY/);
    assert.doesNotMatch(legacyCancelOutcome.noticeMessage, /SePay/);

    assert.match(
      getOrderStatusPresentation("PAID", "SEPAY").description,
      /SePay/,
    );
    assert.match(
      getOrderStatusPresentation("PAID", null).description,
      /VNPAY/,
    );
    assert.match(
      getOrderStatusPresentation("REVIEW", "SEPAY").description,
      /SePay/,
    );
    assert.match(
      getOrderStatusPresentation("CANCELLED", "SEPAY").description,
      /SePay/,
    );
    assert.match(
      getOrderStatusPresentation("PENDING", "SEPAY").description,
      /SePay/,
    );
  });

  it("configures checkout modal provider selection (SEPAY enabled, VNPAY disabled) without wallet balance UI", () => {
    const sepayOption = MEMBERSHIP_PAYMENT_PROVIDERS.find(
      (p) => p.code === "SEPAY",
    );
    const vnpayOption = MEMBERSHIP_PAYMENT_PROVIDERS.find(
      (p) => p.code === "VNPAY",
    );
    assert.ok(sepayOption);
    assert.equal(sepayOption.enabled, true);
    assert.ok(vnpayOption);
    assert.equal(vnpayOption.enabled, false);
    assert.match(vnpayOption.disabledReason ?? "", /không khả dụng/);

    const modalSource = fs.readFileSync(
      path.join(
        repoRoot,
        "components",
        "membership",
        "MembershipCheckoutModal.tsx",
      ),
      "utf8",
    );
    assert.match(modalSource, /payment-provider-selection/);
    assert.match(modalSource, /payment-provider-option-\$\{providerOpt\.code\}/);
    assert.match(modalSource, /submitSePayCheckoutForm\(checkoutRes\)/);
    assert.match(modalSource, /validateCheckoutResponse/);
    assert.match(modalSource, /cancelOrderOnQuoteChange/);
    assert.match(modalSource, /quoteChangeResult\.cancelled/);
    assert.match(modalSource, /quoteChangeResult\.preservedOrderId/);
    assert.doesNotMatch(modalSource, /window\.location\.assign/);
    assert.doesNotMatch(modalSource, /số dư ví|wallet/i);

    const pricingSource = fs.readFileSync(
      path.join(
        repoRoot,
        "components",
        "membership",
        "MembershipPricingWorkspace.tsx",
      ),
      "utf8",
    );
    assert.match(pricingSource, /SePay/);
    assert.doesNotMatch(pricingSource, /VNPAY/);

    const homeCtaSource = fs.readFileSync(
      path.join(repoRoot, "components", "home", "LandlordCta.tsx"),
      "utf8",
    );
    assert.match(homeCtaSource, /SePay/);
    assert.doesNotMatch(homeCtaSource, /VNPAY/);
  });
});
