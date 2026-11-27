import axios from "axios";
import type {
  MembershipAddonOffer,
  MembershipCheckoutResponse,
  MembershipOrderStatus,
  MembershipOrderView,
  MembershipPaymentProvider,
  MembershipPlan,
  MembershipPlanDto,
  MembershipQuote,
  MembershipQuoteMode,
  MembershipTierCode,
  MembershipView,
  PaidMembershipTierCode,
} from "@/types/membership.type";
import type { UserProfile } from "@/types/user.type";

export interface MembershipPaymentProviderOption {
  code: MembershipPaymentProvider;
  label: string;
  shortLabel: string;
  description: string;
  enabled: boolean;
  badge: string;
}

export const MEMBERSHIP_PAYMENT_PROVIDERS: readonly MembershipPaymentProviderOption[] = [
  {
    code: "SEPAY",
    label: "SePay (Cổng thanh toán & Chuyển khoản QR)",
    shortLabel: "SePay",
    description:
      "Thanh toán trực tuyến an toàn qua cổng SePay. Tự động kích hoạt đơn sau khi máy chủ xác nhận giao dịch.",
    enabled: true,
    badge: "Đang hỗ trợ",
  },
  {
    code: "ETH",
    label: "MetaMask (Sepolia ETH)",
    shortLabel: "Sepolia ETH",
    description: "Thanh toán bằng ETH thử nghiệm; hệ thống xác nhận giao dịch trước khi kích hoạt đơn.",
    enabled: true,
    badge: "Thử nghiệm",
  },
] as const;

export const LAST_MEMBERSHIP_ORDER_STORAGE_KEY = "hs_last_membership_order_id";

export const MEMBERSHIP_API_BASE_PATH = "/api/v1/membership";

export const MEMBERSHIP_API_PATHS = {
  plans: `${MEMBERSHIP_API_BASE_PATH}/plans`,
  me: `${MEMBERSHIP_API_BASE_PATH}/me`,
  quote: `${MEMBERSHIP_API_BASE_PATH}/quote`,
  checkout: `${MEMBERSHIP_API_BASE_PATH}/checkout`,
  addons: `${MEMBERSHIP_API_BASE_PATH}/addons`,
  addonCheckout: `${MEMBERSHIP_API_BASE_PATH}/addons/checkout`,
  order: (orderId: string) =>
    `${MEMBERSHIP_API_BASE_PATH}/orders/${encodeURIComponent(orderId)}`,
  cancelOrder: (orderId: string) =>
    `${MEMBERSHIP_API_BASE_PATH}/orders/${encodeURIComponent(orderId)}/cancel`,
} as const;

export const TIER_RANK: Record<MembershipTierCode, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  BUSINESS: 3,
  ADMIN: 99,
};

export const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    code: "FREE",
    name: "Gói Miễn Phí (Free)",
    shortName: "Free",
    publicationUses: 3,
    durationDays: 30,
    priceVnd: 0,
    tagline: "Dành cho chủ nhà mới bắt đầu trải nghiệm đăng tin trên HomeSpace",
  },
  {
    code: "STARTER",
    name: "Gói Khởi Đầu (Starter)",
    shortName: "Starter",
    publicationUses: 10,
    durationDays: 30,
    priceVnd: 49_000,
    tagline: "Phù hợp cho chủ nhà cá nhân có ít phòng hoặc căn hộ cho thuê",
  },
  {
    code: "PRO",
    name: "Gói Chuyên Nghiệp (Pro)",
    shortName: "Pro",
    publicationUses: 30,
    durationDays: 30,
    priceVnd: 129_000,
    badge: "Phổ biến nhất",
    isPopular: true,
    tagline: "Tối ưu cho chủ nhà quản lý khu trọ, dãy phòng hoặc nhiều căn hộ",
  },
  {
    code: "BUSINESS",
    name: "Gói Doanh Nghiệp (Business)",
    shortName: "Business",
    publicationUses: 100,
    durationDays: 30,
    priceVnd: 349_000,
    badge: "Quy mô lớn",
    tagline: "Dành cho hệ thống tòa nhà, chuỗi căn hộ dịch vụ và đơn vị vận hành",
  },
];

const PLAN_METADATA_BY_CODE: Record<string, MembershipPlan> = Object.fromEntries(
  DEFAULT_MEMBERSHIP_PLANS.map((plan) => [plan.code, plan]),
);

export function normalizeTierCode(value: unknown): MembershipTierCode {
  const upper = String(value ?? "FREE").trim().toUpperCase();
  if (
    upper === "FREE" ||
    upper === "STARTER" ||
    upper === "PRO" ||
    upper === "BUSINESS" ||
    upper === "ADMIN"
  ) {
    return upper;
  }
  return "FREE";
}

export function isPaidTierCode(value: unknown): value is PaidMembershipTierCode {
  const upper = String(value ?? "").trim().toUpperCase();
  return upper === "STARTER" || upper === "PRO" || upper === "BUSINESS";
}

export function normalizeMembershipPlan(raw: Partial<MembershipPlanDto> | null | undefined): MembershipPlan {
  const code = normalizeTierCode(raw?.code);
  const fallback = PLAN_METADATA_BY_CODE[code] ?? DEFAULT_MEMBERSHIP_PLANS[0];
  const publicationUses =
    typeof raw?.publicationUses === "number" && Number.isFinite(raw.publicationUses)
      ? raw.publicationUses
      : fallback.publicationUses;
  const durationDays =
    typeof raw?.durationDays === "number" && Number.isFinite(raw.durationDays)
      ? raw.durationDays
      : fallback.durationDays;
  const priceVnd =
    typeof raw?.priceVnd === "number" && Number.isFinite(raw.priceVnd)
      ? raw.priceVnd
      : fallback.priceVnd;

  return {
    ...fallback,
    code,
    publicationUses,
    durationDays,
    priceVnd,
  };
}

export function mergeMembershipPlans(dtos: MembershipPlanDto[] | null | undefined): MembershipPlan[] {
  if (!Array.isArray(dtos) || dtos.length === 0) {
    return DEFAULT_MEMBERSHIP_PLANS;
  }
  const normalizedMap = new Map<MembershipTierCode, MembershipPlan>();
  for (const dto of dtos) {
    const plan = normalizeMembershipPlan(dto);
    normalizedMap.set(plan.code, plan);
  }
  const orderedCodes: MembershipTierCode[] = ["FREE", "STARTER", "PRO", "BUSINESS"];
  return orderedCodes.map(
    (code) => normalizedMap.get(code) ?? PLAN_METADATA_BY_CODE[code],
  );
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** No fallback price: an incomplete offer is unusable. */
export function normalizeAddonOffer(raw: unknown): MembershipAddonOffer | null {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const offer = {
    unitPriceVnd: toCount(obj.unitPriceVnd),
    validDays: toCount(obj.validDays),
    maxQuantity: Math.floor(toCount(obj.maxQuantity)),
  };
  return offer.unitPriceVnd && offer.validDays && offer.maxQuantity ? offer : null;
}

export function normalizeMembershipView(raw: unknown): MembershipView {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tier = normalizeTierCode(obj.tier);
  const unlimited = Boolean(obj.unlimited) || tier === "ADMIN";
  const remainingUses =
    typeof obj.remainingUses === "number" && Number.isFinite(obj.remainingUses)
      ? Math.max(0, obj.remainingUses)
      : 0;
  const reservedUses =
    typeof obj.reservedUses === "number" && Number.isFinite(obj.reservedUses)
      ? Math.max(0, obj.reservedUses)
      : 0;
  const expiresAt = typeof obj.expiresAt === "string" && obj.expiresAt.trim() ? obj.expiresAt : null;

  let freeUsed = 0;
  if (typeof obj.freeUsed === "number" && Number.isFinite(obj.freeUsed)) {
    freeUsed = Math.max(0, obj.freeUsed);
  } else if (typeof obj.freeUsed === "boolean") {
    freeUsed = obj.freeUsed ? 3 : Math.max(0, 3 - remainingUses);
  }

  return {
    tier,
    remainingUses,
    reservedUses,
    expiresAt,
    freeUsed,
    unlimited,
    quotaResetsAt:
      typeof obj.quotaResetsAt === "string" && obj.quotaResetsAt.trim() ? obj.quotaResetsAt : null,
    addonRemaining: toCount(obj.addonRemaining),
    addonReserved: toCount(obj.addonReserved),
    addonExpiresAt:
      typeof obj.addonExpiresAt === "string" && obj.addonExpiresAt.trim() ? obj.addonExpiresAt : null,
  };
}

export function normalizeMembershipQuote(raw: unknown, fallbackTier: PaidMembershipTierCode): MembershipQuote {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tier = isPaidTierCode(obj.tier) ? obj.tier : fallbackTier;
  const fallbackPlan = PLAN_METADATA_BY_CODE[tier];
  const modeRaw = String(obj.mode ?? "").trim().toUpperCase();
  const upgrade = Boolean(obj.upgrade) || modeRaw === "UPGRADE";
  const mode: MembershipQuoteMode = upgrade ? "UPGRADE" : "NEW";
  const amountVnd =
    typeof obj.amountVnd === "number" && Number.isFinite(obj.amountVnd)
      ? Math.max(0, obj.amountVnd)
      : fallbackPlan.priceVnd;
  const remainingUsesAfter =
    typeof obj.remainingUsesAfter === "number" && Number.isFinite(obj.remainingUsesAfter)
      ? Math.max(0, obj.remainingUsesAfter)
      : fallbackPlan.publicationUses;
  const expiresAtAfter =
    typeof obj.expiresAtAfter === "string" && obj.expiresAtAfter.trim()
      ? obj.expiresAtAfter
      : typeof obj.expiresAt === "string" && obj.expiresAt.trim()
      ? obj.expiresAt
      : null;
  const upgradeDeadline =
    typeof obj.upgradeDeadline === "string" && obj.upgradeDeadline.trim()
      ? obj.upgradeDeadline
      : null;

  return {
    tier,
    amountVnd,
    mode,
    remainingUsesAfter,
    expiresAtAfter,
    upgradeDeadline,
    upgrade,
  };
}

export function normalizeCheckoutProvider(
  value: unknown,
): MembershipPaymentProvider | null {
  const upper = String(value ?? "").trim().toUpperCase();
  if (upper === "SEPAY") return "SEPAY";
  if (upper === "ETH") return "ETH";
  return null;
}

/**
 * Normalizes backend OrderView.provider. Returns "SEPAY" for SePay orders,
 * or null for legacy/unspecified provider values so historical orders are
 * rendered safely without implying SePay.
 */
export function normalizeOrderProvider(
  value: unknown,
): MembershipPaymentProvider | null {
  return normalizeCheckoutProvider(value);
}

export function getPaymentProviderDisplayName(
  provider?: MembershipPaymentProvider | string | null,
): string {
  const normalized = normalizeOrderProvider(provider);
  return normalized === "SEPAY" ? "SePay" : normalized === "ETH" ? "Sepolia ETH" : "Cổng thanh toán";
}

export function normalizeCheckoutResponse(raw: unknown): MembershipCheckoutResponse {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawFields = obj.formFields;
  const formFields: Record<string, string> = {};
  if (rawFields && typeof rawFields === "object" && !Array.isArray(rawFields)) {
    for (const [key, value] of Object.entries(rawFields as Record<string, unknown>)) {
      const trimmedKey = key.trim();
      if (!trimmedKey || value === null || value === undefined) continue;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        formFields[trimmedKey] = String(value);
      }
    }
  }
  return {
    orderId: String(obj.orderId ?? obj.id ?? "").trim(),
    paymentUrl: String(obj.paymentUrl ?? obj.checkoutUrl ?? "").trim(),
    amountVnd:
      typeof obj.amountVnd === "number" && Number.isFinite(obj.amountVnd)
        ? Math.max(0, obj.amountVnd)
        : 0,
    provider: normalizeCheckoutProvider(obj.provider),
    formFields,
  };
}

export interface CheckoutValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

export const SEPAY_ALLOWED_HOSTS = new Set([
  "pay-sandbox.sepay.vn",
  "pay.sepay.vn",
]);

export const SEPAY_CHECKOUT_INIT_PATH = "/v1/checkout/init";

export const SEPAY_REQUIRED_NONEMPTY_FIELDS = [
  "merchant",
  "currency",
  "operation",
  "signature",
  "order_invoice_number",
  "order_amount",
] as const;

export function isValidSePayActionUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return (
      parsed.protocol === "https:" &&
      SEPAY_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase()) &&
      parsed.port === "" &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.pathname === SEPAY_CHECKOUT_INIT_PATH &&
      parsed.search === "" &&
      parsed.hash === ""
    );
  } catch {
    return false;
  }
}

export function isValidHttpActionUrl(value: unknown): boolean {
  return isValidSePayActionUrl(value);
}

export function validateCheckoutResponse(
  checkout: Partial<MembershipCheckoutResponse> | null | undefined,
  expectedProvider: MembershipPaymentProvider = "SEPAY",
): CheckoutValidationResult {
  if (!checkout || typeof checkout !== "object") {
    return {
      valid: false,
      errorMessage: "Phản hồi khởi tạo thanh toán từ máy chủ không hợp lệ.",
    };
  }

  if (checkout.provider !== expectedProvider) {
    return {
      valid: false,
      errorMessage: `Máy chủ trả về cổng thanh toán không hợp lệ (${String(
        checkout.provider ?? "UNKNOWN",
      )}). Vui lòng thử lại.`,
    };
  }

  const orderId = String(checkout.orderId ?? "").trim();
  if (!orderId) {
    return {
      valid: false,
      errorMessage: "Máy chủ không trả về mã đơn hàng thanh toán (orderId) hợp lệ.",
    };
  }

  const amountVnd = checkout.amountVnd;
  if (
    typeof amountVnd !== "number" ||
    !Number.isFinite(amountVnd) ||
    amountVnd <= 0 ||
    Math.round(amountVnd) !== amountVnd
  ) {
    return {
      valid: false,
      errorMessage: "Số tiền đơn hàng từ máy chủ không hợp lệ.",
    };
  }

  if (expectedProvider === "ETH") {
    return { valid: true, errorMessage: null };
  }

  if (!isValidSePayActionUrl(checkout.paymentUrl)) {
    return {
      valid: false,
      errorMessage:
        "Địa chỉ cổng thanh toán SePay từ máy chủ không hợp lệ (yêu cầu HTTPS tới pay-sandbox.sepay.vn hoặc pay.sepay.vn /v1/checkout/init).",
    };
  }

  const fields = checkout.formFields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return {
      valid: false,
      errorMessage: "Máy chủ không trả về dữ liệu biểu mẫu thanh toán SePay (formFields).",
    };
  }
  const entries = Object.entries(fields);
  if (
    entries.length === 0 ||
    entries.some(
      ([k, v]) =>
        typeof k !== "string" ||
        !k.trim() ||
        typeof v !== "string",
    )
  ) {
    return {
      valid: false,
      errorMessage: "Dữ liệu biểu mẫu thanh toán SePay (formFields) bị trống hoặc không hợp lệ.",
    };
  }

  for (const requiredKey of SEPAY_REQUIRED_NONEMPTY_FIELDS) {
    const value = fields[requiredKey];
    if (typeof value !== "string" || !value.trim()) {
      return {
        valid: false,
        errorMessage: `Thiếu trường bắt buộc "${requiredKey}" trong biểu mẫu thanh toán SePay.`,
      };
    }
  }

  if (fields.order_invoice_number.trim() !== orderId) {
    return {
      valid: false,
      errorMessage:
        "Mã đơn hàng trong biểu mẫu SePay (order_invoice_number) không khớp với orderId từ máy chủ.",
    };
  }

  if (fields.order_amount.trim() !== String(amountVnd)) {
    return {
      valid: false,
      errorMessage:
        "Số tiền trong biểu mẫu SePay (order_amount) không khớp với số tiền đơn hàng từ máy chủ.",
    };
  }

  return { valid: true, errorMessage: null };
}

export function submitSePayCheckoutForm(
  checkout: Pick<
    MembershipCheckoutResponse,
    "orderId" | "amountVnd" | "paymentUrl" | "provider" | "formFields"
  >,
  doc: Document | undefined = typeof document !== "undefined" ? document : undefined,
): HTMLFormElement {
  const validation = validateCheckoutResponse(checkout, "SEPAY");
  if (!validation.valid) {
    throw new Error(
      validation.errorMessage ?? "Dữ liệu biểu mẫu thanh toán SePay không hợp lệ.",
    );
  }
  if (!doc || !doc.body) {
    throw new Error("Không tìm thấy môi trường trình duyệt để gửi biểu mẫu thanh toán SePay.");
  }

  const form = doc.createElement("form");
  form.method = "POST";
  form.action = checkout.paymentUrl.trim();
  form.style.display = "none";
  form.setAttribute("data-testid", "sepay-checkout-post-form");

  for (const [name, value] of Object.entries(checkout.formFields)) {
    const input = doc.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  doc.body.appendChild(form);

  if (typeof HTMLFormElement !== "undefined" && form instanceof HTMLFormElement) {
    HTMLFormElement.prototype.submit.call(form);
  } else {
    (form as HTMLFormElement).submit();
  }

  return form;
}

export function hasCheckoutQuoteChanged(
  quotedAmountVnd: number,
  checkoutAmountVnd: number,
): boolean {
  return (
    Number.isFinite(checkoutAmountVnd) &&
    checkoutAmountVnd > 0 &&
    checkoutAmountVnd !== quotedAmountVnd
  );
}

export type QuoteChangeResolutionStatus =
  | "unchanged"
  | "cancelled"
  | "cancel_failed"
  | "not_cancelled_terminal";

export interface QuoteChangeCancelResult {
  quoteChanged: boolean;
  resolution: QuoteChangeResolutionStatus;
  cancelled: boolean;
  preservedOrderId: string | null;
  orderStatus: MembershipOrderStatus | null;
  message: string | null;
}

export async function cancelOrderOnQuoteChange(
  checkout: Pick<MembershipCheckoutResponse, "orderId" | "amountVnd">,
  quotedAmountVnd: number,
  cancelOrderFn: (
    orderId: string,
  ) => Promise<Pick<MembershipOrderView, "status"> | null | undefined>,
): Promise<QuoteChangeCancelResult> {
  if (!hasCheckoutQuoteChanged(quotedAmountVnd, checkout.amountVnd)) {
    return {
      quoteChanged: false,
      resolution: "unchanged",
      cancelled: false,
      preservedOrderId: null,
      orderStatus: null,
      message: null,
    };
  }

  const orderId = String(checkout.orderId ?? "").trim();
  const formattedNewAmount = formatExactVnd(checkout.amountVnd);

  if (!orderId) {
    return {
      quoteChanged: true,
      resolution: "cancel_failed",
      cancelled: false,
      preservedOrderId: null,
      orderStatus: null,
      message: `Số tiền thanh toán từ máy chủ đã thay đổi thành ${formattedNewAmount}, nhưng không xác định được mã đơn tạm để tự động hủy. Vui lòng kiểm tra lại trước khi thử lại.`,
    };
  }

  try {
    const cancelResult = await cancelOrderFn(orderId);
    const resultingStatus = String(cancelResult?.status ?? "")
      .trim()
      .toUpperCase();

    if (isOrderCancelledStatus(resultingStatus)) {
      clearPendingMembershipOrderId();
      return {
        quoteChanged: true,
        resolution: "cancelled",
        cancelled: true,
        preservedOrderId: null,
        orderStatus: resultingStatus,
        message: `Số tiền thanh toán từ máy chủ đã cập nhật thành ${formattedNewAmount}. Đơn tạm đã được hủy, vui lòng kiểm tra lại và xác nhận.`,
      };
    }

    savePendingMembershipOrderId(orderId);
    const statusLabel = resultingStatus || "UNKNOWN";
    return {
      quoteChanged: true,
      resolution: "not_cancelled_terminal",
      cancelled: false,
      preservedOrderId: orderId,
      orderStatus: statusLabel,
      message: `Số tiền thanh toán từ máy chủ đã thay đổi thành ${formattedNewAmount}, nhưng đơn hàng #${orderId} hiện ở trạng thái ${statusLabel} (chưa được hủy). Vui lòng kiểm tra trạng thái đơn hàng trước khi thử lại.`,
    };
  } catch {
    savePendingMembershipOrderId(orderId);
    return {
      quoteChanged: true,
      resolution: "cancel_failed",
      cancelled: false,
      preservedOrderId: orderId,
      orderStatus: null,
      message: `Số tiền thanh toán từ máy chủ đã thay đổi thành ${formattedNewAmount}, nhưng hệ thống chưa thể tự động hủy đơn tạm #${orderId}. Vui lòng mở trang đơn hàng để kiểm tra hoặc hủy đơn trước khi tạo giao dịch mới.`,
    };
  }
}

export function normalizeOrderView(raw: unknown): MembershipOrderView {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind = String(obj.kind ?? "").trim().toUpperCase() === "ADDON" ? "ADDON" : "PLAN";
  const tier = kind === "ADDON" ? null : normalizeTierCode(obj.tier);
  const status = String(obj.status ?? "PENDING").trim().toUpperCase() as MembershipOrderStatus;
  const provider = normalizeOrderProvider(obj.provider);
  return {
    id: String(obj.id ?? obj.orderId ?? "").trim(),
    tier,
    kind,
    quantity: toCount(obj.quantity) || null,
    amountVnd:
      typeof obj.amountVnd === "number" && Number.isFinite(obj.amountVnd)
        ? Math.max(0, obj.amountVnd)
        : 0,
    status,
    provider,
    createdAt: typeof obj.createdAt === "string" && obj.createdAt.trim() ? obj.createdAt : null,
    paidAt: typeof obj.paidAt === "string" && obj.paidAt.trim() ? obj.paidAt : null,
  };
}

export function isUnlimitedMembership(
  membership?: MembershipView | null,
  profile?: UserProfile | null,
): boolean {
  if (membership?.unlimited) return true;
  if (membership?.tier === "ADMIN") return true;
  if (String(profile?.role ?? "").trim().toUpperCase() === "ADMIN") return true;
  return false;
}

/**
 * UX-only mirror of the purchase rules; the backend decides. The server reports a paid tier only
 * while it is active, so no browser clock is involved.
 */
export function getPlanBlockReason(
  target: MembershipTierCode,
  membership?: MembershipView | null,
): string | undefined {
  if (!membership || membership.unlimited || target === "FREE" || membership.tier === "FREE") {
    return undefined;
  }
  if (TIER_RANK[target] < TIER_RANK[membership.tier]) return "Đang sử dụng gói cao hơn";
  if (target === membership.tier && membership.remainingUses > 0) {
    return "Mua lại được khi đã dùng hết lượt gói";
  }
  return undefined;
}

export function formatVnDateTime(iso?: string | null): string | null {
  const date = new Date(iso ?? "");
  if (!iso || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "Hồi lượt vào ..." for FREE users; null when the server sends no valid reset time. */
export function getQuotaResetLabel(membership?: MembershipView | null): string | null {
  if (!membership || membership.unlimited || membership.tier !== "FREE") return null;
  const formatted = formatVnDateTime(membership.quotaResetsAt);
  return formatted ? `Hồi lượt vào ${formatted}` : null;
}

export function getTierLabel(tier?: MembershipTierCode | string | null): string {
  const code = normalizeTierCode(tier);
  switch (code) {
    case "ADMIN":
      return "Quản trị viên (Không giới hạn)";
    case "BUSINESS":
      return "Business (100 lượt / 30 ngày)";
    case "PRO":
      return "Pro (30 lượt / 30 ngày)";
    case "STARTER":
      return "Starter (10 lượt / 30 ngày)";
    case "FREE":
    default:
      return "Free (3 lượt / 30 ngày)";
  }
}

export function getOrderProductLabel(
  order: Pick<MembershipOrderView, "kind" | "tier" | "quantity">,
): string {
  if (order.kind !== "ADDON") return getTierLabel(order.tier);
  return order.quantity ? `Mua thêm ${order.quantity} lượt đăng tin` : "Mua thêm lượt đăng tin";
}

/** Everything the user can publish with right now: plan uses (spent first) plus extra uses. */
export function getPublishableUses(membership?: MembershipView | null): number {
  return (membership?.remainingUses ?? 0) + (membership?.addonRemaining ?? 0);
}

/** Extra-use balance line; null when there is nothing to show. */
export function getAddonBalanceLabel(membership?: MembershipView | null): string | null {
  if (!membership || membership.unlimited) return null;
  const { addonRemaining = 0, addonReserved = 0, addonExpiresAt } = membership;
  if (!addonRemaining && !addonReserved) return null;
  const expiry = addonRemaining ? formatVnDateTime(addonExpiresAt) : null;
  return `Lượt mua thêm: ${addonRemaining}${expiry ? ` (hạn gần nhất ${expiry})` : ""}`;
}

export function getTierShortLabel(tier?: MembershipTierCode | string | null): string {
  const code = normalizeTierCode(tier);
  switch (code) {
    case "ADMIN":
      return "ADMIN Unlimited";
    case "BUSINESS":
      return "Business";
    case "PRO":
      return "Pro";
    case "STARTER":
      return "Starter";
    case "FREE":
    default:
      return "Free";
  }
}

export function formatVndPrice(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "Miễn phí";
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(amount))} ₫`;
}

export function formatExactVnd(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `${new Intl.NumberFormat("vi-VN").format(safe)} VNĐ`;
}

export function isOrderPaidStatus(status?: MembershipOrderStatus | string | null): boolean {
  const s = String(status ?? "").trim().toUpperCase();
  return s === "PAID" || s === "SUCCEEDED" || s === "COMPLETED" || s === "SUCCESS";
}

export function isOrderReviewStatus(status?: MembershipOrderStatus | string | null): boolean {
  const s = String(status ?? "").trim().toUpperCase();
  return s === "REVIEW";
}

export function isOrderCancelledStatus(status?: MembershipOrderStatus | string | null): boolean {
  const s = String(status ?? "").trim().toUpperCase();
  return s === "CANCELLED" || s === "CANCELED";
}

export function isOrderFailedStatus(status?: MembershipOrderStatus | string | null): boolean {
  const s = String(status ?? "").trim().toUpperCase();
  return (
    s === "FAILED" ||
    s === "CANCELLED" ||
    s === "CANCELED" ||
    s === "EXPIRED" ||
    s === "ERROR" ||
    s === "REJECTED"
  );
}

export function isOrderPendingStatus(status?: MembershipOrderStatus | string | null): boolean {
  return (
    !isOrderPaidStatus(status) &&
    !isOrderFailedStatus(status) &&
    !isOrderReviewStatus(status)
  );
}

export function canCancelMembershipOrder(
  order?: Pick<MembershipOrderView, "id" | "status"> | null,
): boolean {
  if (!order || !String(order.id ?? "").trim()) return false;
  return String(order.status ?? "").trim().toUpperCase() === "PENDING";
}

export type CancelOrderOutcomeType =
  | "cancelled"
  | "already_paid"
  | "already_review"
  | "already_failed"
  | "still_pending";

export interface CancelOrderOutcome {
  outcome: CancelOrderOutcomeType;
  cancelled: boolean;
  shouldStopPolling: boolean;
  shouldClearPendingOrder: boolean;
  noticeTone: "info" | "success" | "warning";
  noticeMessage: string;
}

export function resolveCancelOrderOutcome(
  order: Pick<MembershipOrderView, "status"> & {
    provider?: MembershipPaymentProvider | string | null;
    kind?: MembershipOrderView["kind"];
  },
): CancelOrderOutcome {
  const status = String(order.status ?? "").trim().toUpperCase();
  const providerLabel = getPaymentProviderDisplayName(order.provider);

  if (isOrderCancelledStatus(status)) {
    return {
      outcome: "cancelled",
      cancelled: true,
      shouldStopPolling: true,
      shouldClearPendingOrder: true,
      noticeTone: "info",
      noticeMessage: `Đơn hàng trên HomeSpace đã được hủy. Bạn có thể tạo đơn thanh toán mới ngay. Lưu ý: thao tác này không hủy giao dịch phía ${providerLabel}.`,
    };
  }

  if (isOrderPaidStatus(status)) {
    return {
      outcome: "already_paid",
      cancelled: false,
      shouldStopPolling: true,
      shouldClearPendingOrder: true,
      noticeTone: "success",
      noticeMessage: `Đơn hàng đã được xác nhận thanh toán (PAID) trước khi yêu cầu hủy hoàn tất. ${
        order.kind === "ADDON" ? "Lượt mua thêm đã được cộng vào tài khoản." : "Gói hội viên của bạn đã được kích hoạt."
      }`,
    };
  }

  if (isOrderReviewStatus(status)) {
    return {
      outcome: "already_review",
      cancelled: false,
      shouldStopPolling: true,
      shouldClearPendingOrder: true,
      noticeTone: "warning",
      noticeMessage:
        "Đơn hàng đang được xử lý nên chưa thể hủy.",
    };
  }

  if (isOrderFailedStatus(status)) {
    return {
      outcome: "already_failed",
      cancelled: false,
      shouldStopPolling: true,
      shouldClearPendingOrder: true,
      noticeTone: "warning",
      noticeMessage:
        status === "EXPIRED"
          ? "Đơn hàng đã hết hạn (EXPIRED) trước khi yêu cầu hủy hoàn tất. Bạn có thể tạo giao dịch mới ngay."
          : "Đơn hàng đã kết thúc ở trạng thái không thành công (FAILED) trước khi yêu cầu hủy hoàn tất. Bạn có thể tạo giao dịch mới ngay.",
    };
  }

  return {
    outcome: "still_pending",
    cancelled: false,
    shouldStopPolling: false,
    shouldClearPendingOrder: false,
    noticeTone: "warning",
    noticeMessage: "Đơn hàng vẫn đang ở trạng thái chờ xử lý trên máy chủ.",
  };
}

export function getOrderStatusPresentation(
  status?: MembershipOrderStatus | string | null,
  provider?: MembershipPaymentProvider | string | null,
): {
  label: string;
  tone: "success" | "danger" | "warning";
  description: string;
} {
  const providerLabel = getPaymentProviderDisplayName(provider);

  if (isOrderPaidStatus(status)) {
    return {
      label: "Đã thanh toán & Kích hoạt",
      tone: "success",
      description: `Hệ thống HomeSpace đã xác nhận giao dịch thành công từ ${providerLabel} và cập nhật lượt đăng tin cho tài khoản của bạn.`,
    };
  }
  if (isOrderReviewStatus(status)) {
    return {
      label: "Đang xử lý",
      tone: "warning",
      description: `Đơn hàng đang được xử lý.`,
    };
  }
  if (isOrderFailedStatus(status)) {
    const upper = String(status ?? "").trim().toUpperCase();
    const isCancelled = upper === "CANCELLED" || upper === "CANCELED";
    const label = isCancelled
      ? "Đã hủy thanh toán"
      : upper === "EXPIRED"
      ? "Đơn thanh toán hết hạn"
      : "Thanh toán không thành công";
    return {
      label,
      tone: "danger",
      description: isCancelled
        ? `Đơn hàng trên HomeSpace đã được hủy và gói hội viên hiện tại không bị thay đổi. Bạn có thể khởi tạo giao dịch mới ngay.`
        : "Giao dịch chưa hoàn tất hoặc đã hết thời gian thanh toán (15 phút). Gói hội viên hiện tại của bạn không bị thay đổi. Bạn có thể khởi tạo lại giao dịch mới bất cứ lúc nào.",
    };
  }
  return {
    label: "Đang chờ xác nhận từ hệ thống",
    tone: "warning",
    description: `Hệ thống đang kiểm tra kết quả giao dịch trực tiếp với máy chủ ${providerLabel}. Trạng thái thanh toán chỉ được xác nhận từ máy chủ HomeSpace, không dựa trên tham số URL.`,
  };
}

export function extractBackendErrorCode(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  const data = (error.response?.data ?? {}) as Record<string, unknown>;
  const codeNum = Number(data.code);
  return Number.isFinite(codeNum) ? codeNum : null;
}

/**
 * Checks whether an API error represents HTTP 409 LISTING_QUOTA_EXHAUSTED (code 4013).
 */
export function isListingQuotaExhaustedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const data = (error.response?.data ?? {}) as Record<string, unknown>;
  const code = data.code;
  const errorCode = String(data.errorCode ?? data.error ?? "").toUpperCase();
  const message = String(data.message ?? data.detail ?? "").toUpperCase();

  if (code === 4013 || String(code) === "4013") return true;
  if (String(code).toUpperCase() === "LISTING_QUOTA_EXHAUSTED") return true;
  if (errorCode.includes("QUOTA_EXHAUSTED") || errorCode.includes("INSUFFICIENT_QUOTA")) {
    return true;
  }
  if (
    message.includes("LISTING_QUOTA_EXHAUSTED") ||
    message.includes("NO PUBLICATION USES REMAIN")
  ) {
    return true;
  }
  if (
    status === 409 &&
    (message.includes("QUOTA") ||
      message.includes("HẾT LƯỢT") ||
      message.includes("KHÔNG ĐỦ LƯỢT") ||
      message.includes("LƯỢT ĐĂNG"))
  ) {
    return true;
  }
  return false;
}

export function isMembershipDowngradeError(error: unknown): boolean {
  const code = extractBackendErrorCode(error);
  if (code === 4016 || code === 4082) return true; // 4082: same tier still has uses
  if (!axios.isAxiosError(error)) return false;
  const msg = String(error.response?.data?.message ?? "").toUpperCase();
  return msg.includes("DOWNGRADE");
}

/** Code 4084: the same item was paid moments ago; the user must confirm a repeat purchase. */
export const isMembershipRecentlyPaidError = (error: unknown) => extractBackendErrorCode(error) === 4084;

export function isMembershipPendingOrderError(error: unknown): boolean {
  const code = extractBackendErrorCode(error);
  if (code === 4018) return true;
  if (!axios.isAxiosError(error)) return false;
  const msg = String(error.response?.data?.message ?? "").toUpperCase();
  return msg.includes("CHECKOUT IS ALREADY PENDING");
}

export function getMembershipErrorMessage(
  error: unknown,
  fallback = "Không thể thực hiện thao tác với gói hội viên. Vui lòng thử lại.",
): string {
  const code = extractBackendErrorCode(error);
  switch (code) {
    case 4013:
      return "Bạn đã hết lượt đăng tin. Vui lòng mua thêm lượt, mua hoặc nâng cấp gói hội viên.";
    case 4014:
      return "Không tìm thấy thông tin giữ chỗ lượt đăng tin cho bài đăng này.";
    case 4015:
      return "Gói hội viên đã chọn không hợp lệ.";
    case 4016:
      return "Không thể hạ cấp khi gói còn hạn; chỉ mua lại cùng gói khi đã dùng hết lượt.";
    case 4017:
      return "Đơn hàng hội viên không còn đủ điều kiện kích hoạt.";
    case 4018:
      return "Bạn đang có một đơn thanh toán hội viên chờ xử lý (trong khung 15 phút). Vui lòng hoàn tất đơn đó hoặc đợi đơn hết hạn trước khi tạo đơn mới.";
    case 4019:
      return "Không tìm thấy đơn hàng hội viên này hoặc bạn không có quyền xem.";
    default: {
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message;
        if (typeof msg === "string" && msg.trim()) {
          return msg;
        }
      }
      if (error instanceof Error && error.message.trim()) {
        return error.message;
      }
      return fallback;
    }
  }
}

export function savePendingMembershipOrderId(orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  try {
    window.sessionStorage.setItem(LAST_MEMBERSHIP_ORDER_STORAGE_KEY, orderId);
  } catch {
    // Ignore storage quota errors
  }
}

export function getPendingMembershipOrderId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(LAST_MEMBERSHIP_ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingMembershipOrderId(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LAST_MEMBERSHIP_ORDER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
