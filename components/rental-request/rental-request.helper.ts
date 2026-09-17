import type {
  RentalEstimateResponse,
  PredictableChargeItem,
  ExcludedChargeItem,
} from "@/types/rental-request.type";

export const formatVND = (price: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price || 0);

export function clampValue(val: number, min: number, max: number): number {
  if (isNaN(val)) return min;
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

export function parseCurrency(text: string): number {
  const digits = (text || "").replace(/\D/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}

export function hasVehicleParkingAllowed(
  estimate?: RentalEstimateResponse | null
): boolean {
  if (!estimate) return false;
  return Boolean(estimate.motorbike?.allowed || estimate.car?.allowed);
}

export function hasPersonBasedCharges(
  estimate?: RentalEstimateResponse | null
): boolean {
  if (!estimate) return false;
  return (
    estimate.predictableCharges?.some(
      (c) => c.billingMethod === "PER_PERSON_MONTH"
    ) ?? false
  );
}

export function getDepositBadge(
  depositType?: string,
  depositMonths?: number,
  isNegotiable?: boolean
): string {
  if (depositType === "NONE") return "Không yêu cầu đặt cọc";
  if (isNegotiable || depositType === "NEGOTIABLE") return "Theo thỏa thuận";
  if (depositType === "MONTH_COUNT") {
    const months = depositMonths && depositMonths > 0 ? depositMonths : 1;
    return `${months} tháng tiền nhà`;
  }
  return "Cố định theo bài đăng";
}

export interface PartitionedPredictableCharges {
  /** Các khoản phải đóng hàng tháng (loại bỏ các khoản INCLUDED hoặc FREE) */
  payableCharges: PredictableChargeItem[];
  /** Các khoản đã bao gồm trong tiền thuê */
  includedCharges: PredictableChargeItem[];
  /** Các khoản miễn phí */
  freeCharges: PredictableChargeItem[];
}

export function partitionPredictableCharges(
  charges?: PredictableChargeItem[] | null
): PartitionedPredictableCharges {
  if (!charges || charges.length === 0) {
    return { payableCharges: [], includedCharges: [], freeCharges: [] };
  }

  const payableCharges: PredictableChargeItem[] = [];
  const includedCharges: PredictableChargeItem[] = [];
  const freeCharges: PredictableChargeItem[] = [];

  for (const c of charges) {
    if (c.billingMethod === "FREE") {
      freeCharges.push(c);
    } else if (c.includedInRent || c.billingMethod === "INCLUDED") {
      includedCharges.push(c);
    } else {
      payableCharges.push(c);
    }
  }

  return { payableCharges, includedCharges, freeCharges };
}

export interface PartitionedExcludedCharges {
  /** Các khoản tính sau theo sử dụng thực tế (điện, nước theo chỉ số, theo giờ) */
  meteredCharges: ExcludedChargeItem[];
  /** Các khoản cần xác nhận hoặc tự thanh toán (thỏa thuận, custom, tự túc, v.v.) */
  negotiableOrCustomCharges: ExcludedChargeItem[];
}

const METERED_BILLING_METHODS = new Set([
  "PER_KWH",
  "PER_M3",
  "STATE_WATER_RATE",
  "PER_HOUR",
]);

export function partitionExcludedCharges(
  charges?: ExcludedChargeItem[] | null
): PartitionedExcludedCharges {
  if (!charges || charges.length === 0) {
    return { meteredCharges: [], negotiableOrCustomCharges: [] };
  }

  const meteredCharges: ExcludedChargeItem[] = [];
  const negotiableOrCustomCharges: ExcludedChargeItem[] = [];

  for (const c of charges) {
    if (c.billingMethod && METERED_BILLING_METHODS.has(c.billingMethod)) {
      meteredCharges.push(c);
    } else {
      negotiableOrCustomCharges.push(c);
    }
  }

  return { meteredCharges, negotiableOrCustomCharges };
}

export interface ChargeDisplayInfo {
  mainText: string;
  subText?: string;
  isUnregisteredVehicle?: boolean;
}

export function formatChargeDisplay(
  charge: PredictableChargeItem
): ChargeDisplayInfo {
  // 1. Phí gửi xe PER_VEHICLE_MONTH
  if (charge.billingMethod === "PER_VEHICLE_MONTH") {
    if (charge.quantity > 0) {
      return {
        mainText: formatVND(charge.amount),
        subText: `${formatVND(charge.unitAmount)} × ${charge.quantity} xe`,
        isUnregisteredVehicle: false,
      };
    }
    // quantity === 0: người thuê chưa đăng ký xe
    return {
      mainText: "Chưa đăng ký",
      subText: `${formatVND(charge.unitAmount)}/xe/tháng`,
      isUnregisteredVehicle: true,
    };
  }

  // 2. Phí tính theo đầu người PER_PERSON_MONTH
  if (charge.billingMethod === "PER_PERSON_MONTH") {
    return {
      mainText: formatVND(charge.amount),
      subText: `${formatVND(charge.unitAmount)} × ${charge.quantity} người`,
      isUnregisteredVehicle: false,
    };
  }

  // 3. Phí tính theo tháng cố định PER_MONTH
  if (charge.billingMethod === "PER_MONTH") {
    return {
      mainText: formatVND(charge.amount),
      subText: `${formatVND(charge.unitAmount)}/tháng`,
      isUnregisteredVehicle: false,
    };
  }

  // 4. Các khoản cố định khác
  return {
    mainText: formatVND(charge.amount),
    subText: charge.note || (charge.unitAmount ? `${formatVND(charge.unitAmount)}/tháng` : undefined),
    isUnregisteredVehicle: false,
  };
}

export function formatExcludedChargeValue(c: ExcludedChargeItem): string {
  if (c.billingMethod === "PER_KWH" && c.unitAmount && c.unitAmount > 0) {
    return `${formatVND(c.unitAmount)}/kWh`;
  }
  if (c.billingMethod === "PER_M3" && c.unitAmount && c.unitAmount > 0) {
    return `${formatVND(c.unitAmount)}/m³`;
  }
  if (c.billingMethod === "STATE_WATER_RATE") {
    return "Theo biểu giá nhà nước";
  }
  if (c.billingMethod === "PER_HOUR" && c.unitAmount && c.unitAmount > 0) {
    return `${formatVND(c.unitAmount)}/giờ`;
  }
  return c.reason;
}
