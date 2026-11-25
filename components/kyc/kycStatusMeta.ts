import { BadgeCheck, LoaderCircle, RefreshCw, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { KycStatus } from "@/types/kyc.type";

export function statusMeta(status: KycStatus, rejectionReason?: string | null) {
  switch (status) {
    case "VERIFIED":
      return {
        title: "Danh tính đã được xác minh",
        description: "Hồ sơ KYC của bạn đã được xác nhận thành công.",
        icon: ShieldCheck,
        tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      };
    case "PENDING":
      return {
        title: "Đang xác minh danh tính",
        description: "Hoàn tất giấy tờ và khuôn mặt với VNPT eKYC để nhận kết quả xác minh.",
        icon: LoaderCircle,
        tone: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      };
    case "REVIEW_REQUIRED":
      return {
        title: "Đang chờ xét duyệt",
        description: "Hồ sơ đang cần được xem xét thêm.",
        icon: ShieldQuestion,
        tone: "text-sky-600 bg-sky-500/10 border-sky-500/20",
      };
    case "REJECTED":
      return {
        title: "Xác minh không thành công",
        description:
          rejectionReason?.trim() ||
          "Bạn có thể thử lại với giấy tờ rõ hơn hoặc ánh sáng tốt hơn.",
        icon: ShieldAlert,
        tone: "text-rose-600 bg-rose-500/10 border-rose-500/20",
      };
    case "EXPIRED":
      return {
        title: "Phiên xác minh đã hết hạn / đã hủy",
        description:
          rejectionReason?.trim() ||
          "Vui lòng bắt đầu lại quy trình KYC.",
        icon: RefreshCw,
        tone: "text-orange-600 bg-orange-500/10 border-orange-500/20",
      };
    default:
      return {
        title: "Xác minh danh tính",
        description:
          "Xác minh CCCD + khuôn mặt để tăng độ tin cậy khi thuê / cho thuê trên HomeSpace.",
        icon: BadgeCheck,
        tone: "text-primary bg-primary/10 border-primary/20",
      };
  }
}
