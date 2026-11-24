"use client";

import { useState } from "react";
import { toast } from "sonner";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import type { MonthlyInvoice, OverdueActionType } from "@/types/monthly-invoice.type";
import { getApiErrorMessage } from "@/utils/apiError";
import UnilateralTerminationPanel from "./UnilateralTerminationPanel";
import { useActionDialog } from "@/components/common/ActionDialog";

import { PolicyNotice } from "@/components/common/PolicyDialog";
const labels: Record<OverdueActionType, string> = {
  PAYMENT_REQUEST: "Yêu cầu thanh toán và liên hệ người thuê",
  EXTENSION_PROPOSAL: "Đề xuất gia hạn thanh toán",
  MUTUAL_TERMINATION_PROPOSAL: "Đề nghị hai bên chấm dứt sớm và bàn giao",
  LEGAL_REVIEW: "Thông báo xem xét biện pháp pháp lý",
  AUTOMATIC_ROLLOVER: "Hệ thống tự cộng dồn công nợ sang kỳ sau",
  UNILATERAL_TERMINATION_NOTICE: "Thông báo đơn phương chấm dứt",
  TERMINATION_REVIEW_REQUESTED: "Người thuê khiếu nại xin đổi phương án",
  TERMINATION_REVIEW_DECIDED: "Quyết định xử lý khiếu nại/chấm dứt",
  TERMINATION_ENDED: "Hợp đồng chấm dứt theo quyết định đơn phương",
  TERMINATION_HANDOVER: "Đã xác nhận nhận lại phòng",
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
  const { confirm, dialog } = useActionDialog();
  const [tenantConsent, setTenantConsent] = useState(false);
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);
  const [forceAcknowledged, setForceAcknowledged] = useState(false);
  const [tenantNotified, setTenantNotified] = useState(false);
  const history = invoice.overdueActions || [];
  const canRecord = contractActive && isLandlord && invoice.canResolveOverdue && !invoice.deferredAt
    && (!invoice.terminationProposedAt || !!invoice.terminationDeclinedAt || !!invoice.terminationCancelledAt);
  const isTerminationInvoice = invoice.terminationProposalInvoiceId === invoice.id && !invoice.unilateralTermination;
  const canPropose = canRecord && (!isTerminationInvoice || !!invoice.terminationCancelledAt);
  if (!canRecord && history.length === 0 && !isTerminationInvoice && !invoice.unilateralTermination) return null;

  async function terminationStep(step: "accept" | "decline" | "withdraw" | "complete" | "force") {
    const messages = {
      accept: ["Đồng ý chấm dứt sớm?", "Bạn đồng ý chấm dứt hợp đồng sớm và đồng ý để chủ nhà giữ toàn bộ cọc sau khi bàn giao phòng. Hãy chỉ xác nhận khi hiểu rõ công nợ còn lại."],
      decline: ["Không đồng ý chấm dứt sớm?", "Hợp đồng tiếp tục hiệu lực; chủ nhà có thể chọn cộng dồn công nợ kỳ sau."],
      withdraw: ["Rút đề nghị chấm dứt?", "Hợp đồng tiếp tục hiệu lực; bạn có thể chọn cộng dồn công nợ kỳ sau."],
      complete: ["Hoàn tất chấm dứt hợp đồng?", "Xác nhận người thuê đã bàn giao toàn bộ phòng, chìa khóa và tài sản thuê. Thao tác này chấm dứt hợp đồng, ghi nhận toàn bộ cọc thuộc chủ nhà và mở lại bài đăng. Không thể hoàn tác trên giao diện."],
      force: ["Buộc chấm dứt do quá hạn?", "Bạn xác nhận bản hợp đồng đã ký có điều khoản chấm dứt do quá hạn và đã thực tế nhận lại phòng, chìa khóa, tài sản. Hệ thống sẽ chấm dứt hợp đồng, ghi nhận cọc cho chủ nhà và mở lại tin đăng. Không thể hoàn tác trên giao diện."],
    } as const;
    const [title, description] = messages[step];
    if (!(await confirm({ title, description, tone: step === "decline" || step === "withdraw" ? "warning" : "danger" }))) return;
    setBusy(true);
    try {
      if (step === "accept") await monthlyInvoiceService.acceptTermination(invoice.id, {
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
    const ok = await confirm({ title: "Cộng dồn công nợ sang kỳ sau?", description: "Toàn bộ công nợ và phí phạt đã chốt sẽ chuyển sang hóa đơn kỳ kế tiếp. Phí phạt dừng tăng. Khi hóa đơn mới phát hành, QR kỳ này bị hủy.", confirmLabel: "Cộng dồn", tone: "warning" });
    if (!ok) return;
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

  return <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-card p-4 text-sm shadow-sm">
    <div>
      <h4 className="text-base font-semibold">Xử lý hóa đơn quá hạn</h4>
      <PolicyNotice tone="warning" className="mt-1" title="Quy tắc xử lý hóa đơn quá hạn" actionLabel="Xem quy tắc" summary="Sau 5 ngày quá hạn, chọn một phương án xử lý (không áp dụng hai phương án cùng lúc).">
        <p>Sau khi hết 5 ngày quá hạn, chọn một phương án: cộng nợ kỳ sau, đơn phương chấm dứt hoặc dời hạn thanh toán ở mục gia hạn. Chọn cộng nợ/chấm dứt sẽ từ chối yêu cầu gia hạn đang chờ và tính bù phí. Không áp dụng hai phương án cùng lúc.</p>
        <p>Phạt tối đa 5 ngày trên mỗi hóa đơn. Hết 10 ngày quá hạn, nếu chưa chọn phương án và còn kỳ sau chưa phát hành, hệ thống tự chốt nợ để cộng dồn. Không tự cộng dồn khi đang chờ duyệt gia hạn, đối soát hoặc xử lý chấm dứt.</p>
      </PolicyNotice>
    </div>
    {canRecord && invoice.canDeferToNextPeriod && <div className="rounded-xl border border-border bg-background p-3 space-y-2">
      <p className="font-semibold">Cho phép thanh toán trễ vào kỳ sau</p>
      <p className="text-muted-foreground">Chốt {invoice.totalAmount.toLocaleString("vi-VN")} đ tại thời điểm này; hóa đơn sau cộng một dòng công nợ. QR cũ chỉ bị hủy khi hóa đơn mới phát hành.</p>
      <button type="button" disabled={busy} onClick={() => void defer()}
        className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Cộng dồn sang kỳ sau</button>
    </div>}
    {canRecord && !invoice.canDeferToNextPeriod && <PolicyNotice tone="warning" title="Không thể chuyển nợ sang kỳ sau" summary="Không còn kỳ thuê kế tiếp chưa phát hành để chuyển nợ."><p>Không còn kỳ thuê kế tiếp chưa phát hành để chuyển nợ. Cần thanh toán hóa đơn này hoặc xử lý chấm dứt theo thỏa thuận.</p></PolicyNotice>}
    <UnilateralTerminationPanel key={`${invoice.id}:${invoice.unilateralTermination?.id ?? "new"}`} invoice={invoice} isLandlord={isLandlord} isTenant={isTenant} canIssue={canPropose} refresh={refresh} />
    {isTerminationInvoice && invoice.terminationProposedAt && !invoice.terminationCompletedAt && <div className="rounded-xl border border-border bg-background p-3 space-y-2">
      <p className="font-semibold">Đề nghị chấm dứt sớm đã gửi</p>
      <p className="text-muted-foreground">Gửi lúc {dateTime(invoice.terminationProposedAt)}. Phòng và cọc chưa thay đổi. Công nợ đã phát hành vẫn được theo dõi.</p>
      {invoice.terminationDeclinedAt && <p className="text-destructive">Người thuê đã từ chối lúc {dateTime(invoice.terminationDeclinedAt)}; hợp đồng vẫn hiệu lực, cọc và tin đăng chưa đổi. Chủ nhà có thể rút đề nghị hoặc xử lý theo điều khoản đã ký.</p>}
      {invoice.terminationCancelledAt && <p className="text-destructive">Đề nghị đã rút hoặc hết hiệu lực lúc {dateTime(invoice.terminationCancelledAt)}; hợp đồng vẫn hiệu lực.</p>}
      {contractActive && isTenant && !invoice.terminationAcceptedAt && !invoice.terminationDeclinedAt && !invoice.terminationCancelledAt && <div className="space-y-2">
        <label className="flex gap-2"><input type="checkbox" checked={tenantConsent} onChange={(e) => setTenantConsent(e.target.checked)} />Tôi đồng ý chấm dứt sớm, đồng ý chủ nhà giữ toàn bộ cọc {Number(invoice.originalDepositAmount || 0).toLocaleString("vi-VN")} đ sau bàn giao và hiểu rằng công nợ hóa đơn chưa thanh toán vẫn cần quyết toán.</label>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !tenantConsent} onClick={() => void terminationStep("accept")}
          className="inline-flex min-h-11 items-center rounded-xl border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Đồng ý chấm dứt và xử lý cọc</button>
        <button type="button" disabled={busy} onClick={() => void terminationStep("decline")}
          className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">Không đồng ý</button></div>
      </div>}
      {contractActive && isLandlord && !invoice.terminationAcceptedAt && !invoice.terminationCancelledAt && <button type="button" disabled={busy} onClick={() => void terminationStep("withdraw")}
        className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">Rút đề nghị</button>}
      {contractActive && isLandlord && invoice.terminationDeclinedAt && !invoice.terminationCancelledAt && !invoice.deferredAt && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-2">
        <p className="font-semibold text-destructive">Buộc chấm dứt do quá hạn</p>
        {!invoice.landlordTerminationClauseSigned ? <p className="text-destructive">Bản hợp đồng đã ký không có điều khoản 5 ngày theo cấu trúc hiện hành; không thể áp dụng nhánh này cho hợp đồng cũ.</p> : <>
          <PolicyNotice tone="warning" title="Điều kiện đơn phương chấm dứt" summary="Chỉ thực hiện khi đã thông báo cho người thuê và thực tế lấy lại phòng."><p>Chỉ thực hiện khi đã thông báo cho người thuê và thực tế lấy lại phòng. Không mở lại tin đăng nếu người thuê chưa bàn giao.</p></PolicyNotice>
          <label className="flex gap-2"><input type="checkbox" checked={forceAcknowledged} onChange={(e) => setForceAcknowledged(e.target.checked)} />Tôi xác nhận bản hợp đồng đã ký có điều khoản chấm dứt do quá hạn.</label>
          <label className="flex gap-2"><input type="checkbox" checked={tenantNotified} onChange={(e) => setTenantNotified(e.target.checked)} />Tôi đã thông báo quyết định chấm dứt cho người thuê.</label>
          <label className="flex gap-2"><input type="checkbox" checked={handoverConfirmed} onChange={(e) => setHandoverConfirmed(e.target.checked)} />Tôi đã nhận lại phòng trống, chìa khóa và toàn bộ tài sản cho thuê.</label>
          <button type="button" disabled={busy || !forceAcknowledged || !tenantNotified || !handoverConfirmed} onClick={() => void terminationStep("force")}
            className="inline-flex min-h-11 items-center rounded-xl bg-destructive px-4 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50">Buộc chấm dứt và mở lại tin đăng</button>
        </>}
      </div>}
      {invoice.terminationAcceptedAt && !invoice.terminationCancelledAt && <p className="text-emerald-700 dark:text-emerald-300">Người thuê đã đồng ý lúc {dateTime(invoice.terminationAcceptedAt)}. Chờ bàn giao phòng.</p>}
      {contractActive && isLandlord && invoice.terminationAcceptedAt && !invoice.terminationCancelledAt && <div className="space-y-2">
        <label className="flex gap-2"><input type="checkbox" checked={handoverConfirmed} onChange={(e) => setHandoverConfirmed(e.target.checked)} />Tôi xác nhận phòng đã trống, đã nhận lại chìa khóa và tài sản cho thuê.</label>
        <button type="button" disabled={busy || !handoverConfirmed} onClick={() => void terminationStep("complete")}
          className="inline-flex min-h-11 items-center rounded-xl bg-destructive px-4 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50">Đã nhận bàn giao — hoàn tất chấm dứt</button>
      </div>}
    </div>}
    {isTerminationInvoice && invoice.terminationCompletedAt && <p className="rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">Hợp đồng đã {invoice.terminationForcedAt ? "được chủ nhà chấm dứt theo điều khoản quá hạn" : "chấm dứt theo thỏa thuận"} lúc {dateTime(invoice.terminationCompletedAt)}; cọc {Number(invoice.retainedDepositAmount || 0).toLocaleString("vi-VN")} đ đã ghi nhận thuộc chủ nhà và tin đăng đã mở lại.</p>}
    {history.map((action) => <div key={action.id} className="rounded-xl border border-border bg-background p-3 space-y-1">
      <p className="font-semibold">{labels[action.type]}</p>
      <p className="text-muted-foreground">{action.type === "AUTOMATIC_ROLLOVER" ? "Hệ thống ghi nhận" : "Chủ nhà ghi nhận"} lúc {dateTime(action.createdAt)}</p>
      {action.proposedDate && <p>Ngày đề xuất: <strong>{action.proposedDate.split("-").reverse().join("/")}</strong></p>}
      <p className="whitespace-pre-wrap">{action.note}</p>
      {action.acknowledgedAt && <p className="text-emerald-700 dark:text-emerald-300">Người thuê đã xem và phản hồi lúc {dateTime(action.acknowledgedAt)}{action.tenantAcknowledgment ? `: ${action.tenantAcknowledgment}` : "."}</p>}
      {isTenant && !action.acknowledgedAt && <div className="space-y-2 pt-2">
        <textarea maxLength={1000} value={tenantNotes[action.id] || ""} placeholder="Phản hồi của bạn (không bắt buộc)"
          onChange={(event) => setTenantNotes((current) => ({ ...current, [action.id]: event.target.value }))}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm" rows={2} />
        <button type="button" disabled={busy} onClick={() => void acknowledge(action.id)}
          className="inline-flex min-h-11 items-center rounded-xl border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50">Xác nhận đã xem / gửi phản hồi</button>
        <p className="text-muted-foreground">Xác nhận đã xem không có nghĩa bạn đồng ý gia hạn hoặc chấm dứt hợp đồng.</p>
      </div>}
    </div>)}
    {dialog}
  </div>;
}
