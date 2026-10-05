"use client";

import { useState } from "react";
import { toast } from "sonner";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import type { MonthlyInvoice, OverdueActionType } from "@/types/monthly-invoice.type";
import { getApiErrorMessage } from "@/utils/apiError";

const labels: Record<OverdueActionType, string> = {
  PAYMENT_REQUEST: "Yêu cầu thanh toán và liên hệ người thuê",
  EXTENSION_PROPOSAL: "Đề xuất gia hạn thanh toán",
  MUTUAL_TERMINATION_PROPOSAL: "Đề nghị hai bên chấm dứt sớm và bàn giao",
  LEGAL_REVIEW: "Thông báo xem xét biện pháp pháp lý",
};

const dateTime = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default function OverdueActionsPanel({ invoice, contractActive, isLandlord, isTenant, refresh }: {
  invoice: MonthlyInvoice;
  contractActive: boolean;
  isLandlord: boolean;
  isTenant: boolean;
  refresh: () => Promise<void>;
}) {
  const [tenantNotes, setTenantNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [tenantConsent, setTenantConsent] = useState(false);
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);
  const [forceAcknowledged, setForceAcknowledged] = useState(false);
  const [tenantNotified, setTenantNotified] = useState(false);
  const history = invoice.overdueActions || [];
  const canRecord = contractActive && isLandlord && invoice.workflowState === "OVERDUE_ACTION_REQUIRED" && !invoice.deferredAt
    && (!invoice.terminationProposedAt || !!invoice.terminationDeclinedAt || !!invoice.terminationCancelledAt);
  const isTerminationInvoice = invoice.terminationProposalInvoiceId === invoice.id;
  const canPropose = canRecord && (!isTerminationInvoice || !!invoice.terminationCancelledAt);
  if (!canRecord && history.length === 0 && !isTerminationInvoice) return null;

  async function terminationStep(step: "propose" | "accept" | "decline" | "withdraw" | "complete" | "force") {
    const messages = {
      propose: "Gửi đề nghị chấm dứt sớm cho người thuê? Hợp đồng, cọc và tin đăng chưa thay đổi.",
      accept: "Bạn đồng ý chấm dứt hợp đồng sớm và đồng ý để chủ nhà giữ toàn bộ cọc sau khi bàn giao phòng? Hãy chỉ xác nhận khi hiểu rõ công nợ còn lại.",
      decline: "Từ chối đề nghị chấm dứt sớm? Hợp đồng tiếp tục hiệu lực; chủ nhà có thể chọn cộng dồn công nợ kỳ sau.",
      withdraw: "Rút đề nghị chấm dứt? Hợp đồng tiếp tục hiệu lực; bạn có thể chọn cộng dồn công nợ kỳ sau.",
      complete: "Xác nhận người thuê đã bàn giao toàn bộ phòng, chìa khóa và tài sản thuê? Thao tác này chấm dứt hợp đồng, ghi nhận toàn bộ cọc thuộc chủ nhà và mở lại bài đăng. Không thể hoàn tác trên giao diện.",
      force: "Bạn xác nhận bản hợp đồng đã ký có điều khoản chấm dứt do quá hạn và đã thực tế nhận lại phòng, chìa khóa, tài sản? Hệ thống sẽ chấm dứt hợp đồng, ghi nhận cọc cho chủ nhà và mở lại tin đăng. Không thể hoàn tác trên giao diện.",
    };
    if (!window.confirm(messages[step])) return;
    setBusy(true);
    try {
      if (step === "propose") await monthlyInvoiceService.proposeTermination(invoice.id);
      else if (step === "accept") await monthlyInvoiceService.acceptTermination(invoice.id, {
        acceptEarlyTermination: true, acceptDepositRetention: true, acknowledgeOutstandingDebt: true,
      });
      else if (step === "decline") await monthlyInvoiceService.declineTermination(invoice.id);
      else if (step === "withdraw") await monthlyInvoiceService.withdrawTermination(invoice.id);
      else if (step === "force") await monthlyInvoiceService.forceTerminationAfterDecline(invoice.id, {
        signedClauseAcknowledged: true, tenantNotified: true,
        vacantPossessionConfirmed: true, keysAndAssetsReturned: true,
      });
      else await monthlyInvoiceService.completeTermination(invoice.id, {
        vacantPossessionConfirmed: true, keysAndAssetsReturned: true,
      });
      toast.success(step === "complete" || step === "force" ? "Đã chấm dứt hợp đồng và mở lại tin đăng." : "Đã ghi nhận quyết định.");
      if (step === "complete" || step === "force") window.location.reload();
      else await refresh();
    } catch (error) { toast.error(getApiErrorMessage(error, "Không thể xử lý đề nghị chấm dứt.")); }
    finally { setBusy(false); }
  }

  async function defer() {
    if (!window.confirm("Cho phép chuyển toàn bộ công nợ và phí phạt đã chốt sang hóa đơn kỳ kế tiếp? Phí phạt sẽ dừng tăng. Khi hóa đơn mới phát hành, QR kỳ này bị hủy.")) return;
    setBusy(true);
    try {
      await monthlyInvoiceService.deferToNextPeriod(invoice.id);
      toast.success("Đã chốt công nợ để cộng vào kỳ sau.");
      await refresh();
    } catch (error) { toast.error(getApiErrorMessage(error, "Không thể chuyển nợ sang kỳ sau.")); }
    finally { setBusy(false); }
  }

  async function acknowledge(actionId: string) {
    setBusy(true);
    try {
      await monthlyInvoiceService.acknowledgeOverdueAction(invoice.id, actionId, tenantNotes[actionId] || "");
      toast.success("Đã ghi nhận phản hồi của bạn.");
      await refresh();
    } catch (error) { toast.error(getApiErrorMessage(error, "Không thể gửi phản hồi.")); }
    finally { setBusy(false); }
  }

  return <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3 text-sm">
    <div>
      <h4 className="font-semibold text-amber-950">Hồ sơ xử lý quá hạn</h4>
      <p className="mt-1 text-xs text-amber-900">Sau 5 ngày quá hạn, chủ nhà có thể chốt công nợ để cộng kỳ sau hoặc đề nghị hai bên chấm dứt. Đề nghị chấm dứt chưa tự thu cọc hay mở lại tin đăng.</p>
    </div>
    {canRecord && invoice.canDeferToNextPeriod && <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-2">
      <p className="font-semibold">Cho phép thanh toán trễ vào kỳ sau</p>
      <p className="text-xs text-muted-foreground">Chốt {invoice.totalAmount.toLocaleString("vi-VN")} đ tại thời điểm này; hóa đơn sau cộng một dòng công nợ. QR cũ chỉ bị hủy khi hóa đơn mới phát hành.</p>
      <button type="button" disabled={busy} onClick={() => void defer()}
        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Cộng dồn sang kỳ sau</button>
    </div>}
    {canRecord && !invoice.canDeferToNextPeriod && <p className="rounded-lg bg-white p-3 text-xs text-amber-900">Không còn kỳ thuê kế tiếp chưa phát hành để chuyển nợ. Cần thanh toán hóa đơn này hoặc xử lý chấm dứt theo thỏa thuận.</p>}
    {canPropose && invoice.originalDepositAmount != null && <div className="rounded-lg border border-rose-200 bg-white p-3 space-y-2">
      <p className="font-semibold">Đề nghị chấm dứt hợp đồng sớm</p>
      <p className="text-xs text-muted-foreground">Cọc hiện ghi nhận: {Number(invoice.originalDepositAmount).toLocaleString("vi-VN")} đ. Người thuê cần đồng ý rõ ràng với việc chấm dứt và xử lý cọc. Sau khi hai bên thống nhất và đã bàn giao phòng, chủ nhà xác nhận hoàn tất; lúc đó tin đăng mới mở lại.</p>
      <button type="button" disabled={busy} onClick={() => void terminationStep("propose")}
        className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Gửi đề nghị chấm dứt</button>
    </div>}
    {canPropose && invoice.originalDepositAmount == null && <p className="rounded-lg bg-white p-3 text-xs text-amber-900">Chưa có hồ sơ cọc đã xác nhận để quyết toán; chưa thể đề nghị chấm dứt bằng luồng giữ cọc này.</p>}
    {isTerminationInvoice && invoice.terminationProposedAt && !invoice.terminationCompletedAt && <div className="rounded-lg border border-rose-200 bg-white p-3 space-y-2">
      <p className="font-semibold">Đề nghị chấm dứt sớm đã gửi</p>
      <p className="text-xs text-muted-foreground">Gửi lúc {dateTime(invoice.terminationProposedAt)}. Phòng và cọc chưa thay đổi. Công nợ đã phát hành vẫn được theo dõi.</p>
      {invoice.terminationDeclinedAt && <p className="text-xs text-rose-700">Người thuê đã từ chối lúc {dateTime(invoice.terminationDeclinedAt)}; hợp đồng vẫn hiệu lực, cọc và tin đăng chưa đổi. Chủ nhà có thể rút đề nghị hoặc xử lý theo điều khoản đã ký.</p>}
      {invoice.terminationCancelledAt && <p className="text-xs text-rose-700">Đề nghị đã rút hoặc hết hiệu lực lúc {dateTime(invoice.terminationCancelledAt)}; hợp đồng vẫn hiệu lực.</p>}
      {contractActive && isTenant && !invoice.terminationAcceptedAt && !invoice.terminationDeclinedAt && !invoice.terminationCancelledAt && <div className="space-y-2">
        <label className="flex gap-2 text-xs"><input type="checkbox" checked={tenantConsent} onChange={(e) => setTenantConsent(e.target.checked)} />Tôi đồng ý chấm dứt sớm, đồng ý chủ nhà giữ toàn bộ cọc {Number(invoice.originalDepositAmount || 0).toLocaleString("vi-VN")} đ sau bàn giao và hiểu rằng công nợ hóa đơn chưa thanh toán vẫn cần quyết toán.</label>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !tenantConsent} onClick={() => void terminationStep("accept")}
          className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Đồng ý chấm dứt và xử lý cọc</button>
        <button type="button" disabled={busy} onClick={() => void terminationStep("decline")}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">Không đồng ý</button></div>
      </div>}
      {contractActive && isLandlord && !invoice.terminationAcceptedAt && !invoice.terminationCancelledAt && <button type="button" disabled={busy} onClick={() => void terminationStep("withdraw")}
        className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">Rút đề nghị</button>}
      {contractActive && isLandlord && invoice.terminationDeclinedAt && !invoice.terminationCancelledAt && !invoice.deferredAt && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2">
        <p className="font-semibold text-rose-900">Buộc chấm dứt do quá hạn</p>
        {!invoice.landlordTerminationClauseSigned ? <p className="text-xs text-rose-800">Bản hợp đồng đã ký không có điều khoản 5 ngày theo cấu trúc hiện hành; không thể áp dụng nhánh này cho hợp đồng cũ.</p> : <>
          <p className="text-xs text-rose-800">Chỉ thực hiện khi đã thông báo cho người thuê và thực tế lấy lại phòng. Không mở lại tin đăng nếu người thuê chưa bàn giao.</p>
          <label className="flex gap-2 text-xs"><input type="checkbox" checked={forceAcknowledged} onChange={(e) => setForceAcknowledged(e.target.checked)} />Tôi xác nhận bản hợp đồng đã ký có điều khoản chấm dứt do quá hạn.</label>
          <label className="flex gap-2 text-xs"><input type="checkbox" checked={tenantNotified} onChange={(e) => setTenantNotified(e.target.checked)} />Tôi đã thông báo quyết định chấm dứt cho người thuê.</label>
          <label className="flex gap-2 text-xs"><input type="checkbox" checked={handoverConfirmed} onChange={(e) => setHandoverConfirmed(e.target.checked)} />Tôi đã nhận lại phòng trống, chìa khóa và toàn bộ tài sản cho thuê.</label>
          <button type="button" disabled={busy || !forceAcknowledged || !tenantNotified || !handoverConfirmed} onClick={() => void terminationStep("force")}
            className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Buộc chấm dứt và mở lại tin đăng</button>
        </>}
      </div>}
      {invoice.terminationAcceptedAt && !invoice.terminationCancelledAt && <p className="text-xs text-emerald-800">Người thuê đã đồng ý lúc {dateTime(invoice.terminationAcceptedAt)}. Chờ bàn giao phòng.</p>}
      {contractActive && isLandlord && invoice.terminationAcceptedAt && !invoice.terminationCancelledAt && <div className="space-y-2">
        <label className="flex gap-2 text-xs"><input type="checkbox" checked={handoverConfirmed} onChange={(e) => setHandoverConfirmed(e.target.checked)} />Tôi xác nhận phòng đã trống, đã nhận lại chìa khóa và tài sản cho thuê.</label>
        <button type="button" disabled={busy || !handoverConfirmed} onClick={() => void terminationStep("complete")}
          className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Đã nhận bàn giao — hoàn tất chấm dứt</button>
      </div>}
    </div>}
    {isTerminationInvoice && invoice.terminationCompletedAt && <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">Hợp đồng đã {invoice.terminationForcedAt ? "được chủ nhà chấm dứt theo điều khoản quá hạn" : "chấm dứt theo thỏa thuận"} lúc {dateTime(invoice.terminationCompletedAt)}; cọc {Number(invoice.retainedDepositAmount || 0).toLocaleString("vi-VN")} đ đã ghi nhận thuộc chủ nhà và tin đăng đã mở lại.</p>}
    {history.map((action) => <div key={action.id} className="rounded-lg border border-amber-200 bg-white p-3 space-y-1">
      <p className="font-semibold">{labels[action.type]}</p>
      <p className="text-xs text-muted-foreground">Chủ nhà ghi nhận lúc {dateTime(action.createdAt)}</p>
      {action.proposedDate && <p>Ngày đề xuất: <strong>{action.proposedDate.split("-").reverse().join("/")}</strong></p>}
      <p className="whitespace-pre-wrap">{action.note}</p>
      {action.acknowledgedAt && <p className="text-xs text-emerald-800">Người thuê đã xem và phản hồi lúc {dateTime(action.acknowledgedAt)}{action.tenantAcknowledgment ? `: ${action.tenantAcknowledgment}` : "."}</p>}
      {isTenant && !action.acknowledgedAt && <div className="space-y-2 pt-2">
        <textarea maxLength={1000} value={tenantNotes[action.id] || ""} placeholder="Phản hồi của bạn (không bắt buộc)"
          onChange={(event) => setTenantNotes((current) => ({ ...current, [action.id]: event.target.value }))}
          className="w-full rounded-lg border border-border bg-background p-2 text-xs" rows={2} />
        <button type="button" disabled={busy} onClick={() => void acknowledge(action.id)}
          className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50">Xác nhận đã xem / gửi phản hồi</button>
        <p className="text-xs text-muted-foreground">Xác nhận đã xem không có nghĩa bạn đồng ý gia hạn hoặc chấm dứt hợp đồng.</p>
      </div>}
    </div>)}
  </div>;
}
