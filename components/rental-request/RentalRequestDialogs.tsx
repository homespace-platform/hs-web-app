"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useActionDialog } from "@/components/common/ActionDialog";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import rentalRequestService from "@/services/rental-request.service";
import { getApiErrorMessage } from "@/utils/apiError";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import { formatVND } from "./rental-request.helper";

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-3 ${strong ? "border-t border-border pt-2 font-bold text-foreground" : ""}`}><dt className="text-muted-foreground">{label}</dt><dd className={`text-right ${strong ? "text-primary" : "font-semibold text-foreground"}`}>{value}</dd></div>;
}

/** Body of the accept confirmation: the facts the landlord commits to, and the exclusivity rules behind a PolicyNotice. */
export function AcceptSummary({ request, holdLabel }: { request: RentalRequestResponse; holdLabel: string | null }) {
  const rent = request.effectiveMonthlyRent ?? request.monthlyRentPrice;
  const noDeposit = request.depositAmount === 0;
  return (
    <div className="space-y-3 text-sm">
      <p>Bạn đang chấp thuận yêu cầu thuê của <strong className="text-foreground">{request.renterName}</strong>{holdLabel ? ` và giữ chỗ ${holdLabel}.` : " và giữ chỗ cho khách."}</p>
      <dl className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3">
        <Row label="Ngày vào ở" value={request.moveInDate ? format(new Date(request.moveInDate), "dd/MM/yyyy") : "—"} />
        <Row label="Thời hạn" value={`${request.leaseMonths} tháng · ${request.occupantCount || 1} người`} />
        <Row label="Xe" value={`${request.motorbikeCount ? `${request.motorbikeCount} xe máy` : "Không xe máy"} · ${request.carCount ? `${request.carCount} ô tô` : "Không ô tô"}`} />
        <Row label="Tiền thuê kỳ đầu" value={formatVND(rent)} />
        <Row label="Tiền đặt cọc" value={request.depositAmount != null ? formatVND(request.depositAmount) : "Theo tin đăng"} />
        <Row strong label="Tổng ban đầu" value={formatVND(rent + (request.depositAmount ?? 0))} />
      </dl>
      <PolicyNotice tone="warning" title="Quy tắc khi chấp thuận" summary="Phòng chuyển sang Đang giữ chỗ; các yêu cầu chờ duyệt khác của tin này bị từ chối.">
        <ul className="list-disc space-y-2 pl-5">
          <li>Bài đăng chuyển sang <strong>Đang giữ chỗ</strong>. Người thuê cần báo chuyển trước hạn trên yêu cầu thanh toán.</li>
          <li>Các yêu cầu còn chờ duyệt của cùng tin đăng sẽ tự động bị từ chối với lý do chủ nhà đã chọn yêu cầu khác.</li>
          <li>{noDeposit ? "Không yêu cầu đặt cọc: bỏ qua hợp đồng cọc. Tiền thuê tháng đầu và ký hợp đồng thuê mở vào ngày bắt đầu thuê." : "Nếu ngày vào ở còn ở phía trước, chỉ thu cọc trước và ký riêng hợp đồng cọc sau khi xác nhận nhận tiền. Tiền tháng đầu và ký hợp đồng thuê mở vào ngày bắt đầu thuê."}</li>
          <li>Chưa báo chuyển khi hết hạn thì giải phóng giữ chỗ nếu tin còn hạn đăng. Đã báo chuyển, có tranh chấp hoặc đã nhận cọc thì không tự giải phóng phòng. Các yêu cầu đã bị từ chối không tự khôi phục khi hết hạn giữ chỗ.</li>
        </ul>
      </PolicyNotice>
    </div>
  );
}

/** Accept / reject / cancel of a request, each through the shared action dialog. Same API calls and toasts as before. */
export function useRequestDecisions({ mode, holdLabel, afterChange, afterCancel }: {
  mode: "RECEIVED" | "SENT"; holdLabel: string | null; afterChange: () => Promise<unknown> | void; afterCancel: () => void;
}) {
  const router = useRouter();
  const { confirm, askReason, dialog } = useActionDialog();
  const [processing, setProcessing] = useState(false);
  const lock = useRef(false);

  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setProcessing(true);
    try { await task(); } finally { lock.current = false; setProcessing(false); }
  }

  const accept = (request: RentalRequestResponse) => run(async () => {
    const ok = await confirm({
      title: holdLabel ? `Duyệt yêu cầu & giữ chỗ ${holdLabel}` : "Duyệt yêu cầu & giữ chỗ",
      description: <AcceptSummary request={request} holdLabel={holdLabel} />, confirmLabel: "Xác nhận chấp thuận",
    });
    if (!ok) return;
    try {
      await rentalRequestService.acceptRentalRequest(request.id);
      toast.success("Đã chấp thuận và giữ chỗ. Các yêu cầu còn chờ duyệt của tin đăng này đã được từ chối kèm lý do.");
      await afterChange();
    } catch (err: unknown) {
      const body = (err as { response?: { data?: { code?: number; message?: string } } } | undefined)?.response?.data;
      const msg = String(body?.message || "");
      if (body?.code === 7009 || msg.includes("defaultIncoming") || msg.toLowerCase().includes("tài khoản nhận tiền") || msg.toLowerCase().includes("ngân hàng")) {
        toast.error("Bạn cần thiết lập tài khoản nhận tiền mặc định trước khi chấp nhận yêu cầu thuê.", {
          action: { label: "Cài đặt tài khoản", onClick: () => router.push("/settings/bank-accounts") }, duration: 7000,
        });
      } else toast.error(getApiErrorMessage(err, "Duyệt yêu cầu thất bại."));
    }
  });

  const reject = (request: RentalRequestResponse) => run(async () => {
    // Optional reason: an empty answer is allowed, closing the dialog is not.
    const reason = await askReason({
      title: "Từ chối yêu cầu thuê", minLength: 0, label: "Lý do từ chối (tuỳ chọn)", tone: "danger", confirmLabel: "Xác nhận từ chối",
      placeholder: "VD: Căn hộ hiện đã có khách đặt cọc trước hoặc không đáp ứng thời gian dọn vào...",
      description: <>Từ chối yêu cầu của <strong>{request.renterName}</strong> cho căn {request.listingTitle}.</>,
    });
    if (reason === null) return;
    try {
      await rentalRequestService.rejectRentalRequest(request.id, reason);
      toast.success("Đã từ chối yêu cầu thuê.");
      await afterChange();
    } catch (err: unknown) { toast.error(getApiErrorMessage(err, "Từ chối yêu cầu thất bại.")); }
  });

  const cancel = (request: RentalRequestResponse) => run(async () => {
    const ok = await confirm({
      title: "Hủy yêu cầu thuê nhà?", tone: "danger", confirmLabel: "Xác nhận hủy", cancelLabel: "Giữ yêu cầu",
      description: request.status === "ACCEPTED"
        ? <>Hủy ngay lượt giữ chỗ chưa chuyển tiền cho căn <strong>{request.listingTitle}</strong>, không cần chờ hết hạn. Tin đăng và chỗ xe sẽ được trả lại nếu đủ điều kiện. Nếu người thuê đã chuyển hoặc chủ nhà đã nhận tiền, không hủy ở đây; hãy báo chuyển hoặc yêu cầu đối soát.</>
        : <>Bạn có chắc chắn muốn hủy yêu cầu thuê cho căn <strong>{request.listingTitle}</strong>?</>,
    });
    if (!ok) return;
    try {
      await rentalRequestService.cancelRentalRequest(request.id);
      toast.success(mode === "SENT" ? "Đã hủy yêu cầu thuê của bạn." : "Đã hủy yêu cầu thuê.");
      afterCancel();
      await afterChange();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Hủy yêu cầu thất bại."));
      await afterChange();
    }
  });

  return { accept, reject, cancel, processing, dialog };
}
