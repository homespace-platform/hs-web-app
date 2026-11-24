"use client";

import Image from "next/image";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { CheckCircle2, CreditCard, FileText, Home, Mail, Phone, Sparkles, User } from "lucide-react";
import AgreementDocumentActions from "@/components/contract/AgreementDocumentActions";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import { listingDetailPath } from "@/lib/listing-detail-access";
import { canOfferContractFallback } from "@/lib/rental-contract-fallback";
import { canCancelRentalRequest } from "@/lib/rental-request-actions";
import { useNowMs } from "@/hooks/useNowMs";
import { presentRentalRequest, primaryCardAction, transferWindowClosed } from "@/lib/rental-request-presentation";
import { toneClasses } from "@/lib/rental-labels";
import type { ContractResponse } from "@/types/contract.type";
import type { RentalRequestConflict, RentalRequestResponse } from "@/types/rental-request.type";
import { formatVND } from "./rental-request.helper";
import RentalContractFallbackButton from "./RentalContractFallbackButton";
import { RentalReceiptNotice } from "./RentalDepositQuickViewModal";
import { StartChangeNotice } from "./RentalStartChangeQuickModal";

export interface RequestCardActions {
  accept: (r: RentalRequestResponse) => void;
  reject: (r: RentalRequestResponse) => void;
  cancel: (r: RentalRequestResponse) => void;
  pay: (r: RentalRequestResponse) => void;
  review: (r: RentalRequestResponse) => void;
  createContract: (r: RentalRequestResponse) => void;
  openDetail: (r: RentalRequestResponse) => void;
  openContract: (contractId: string) => void;
  openStartChange: (r: RentalRequestResponse) => void;
  askAi: (conflict: RentalRequestConflict) => void;
}

const btnPrimary = "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none";
const btnSecondary = "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none";
const btnLink = "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const validImage = (url?: string | null) => !!url && /^(https?:\/\/|\/)/.test(url.trim());

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="truncate text-sm font-semibold">{value}</dd></div>;
}

/** One request. Status pill, key facts, ONE primary action (decided by presentation.ts) and a secondary "Xem chi tiết". */
export default function RentalRequestCard({ req, mode, contract, agreement, holdLabel, conflict, busy, creatingContract, canManage, manageTitle, canManageContract, actions }: {
  req: RentalRequestResponse; mode: "RECEIVED" | "SENT"; contract?: ContractResponse | null; agreement?: ContractResponse | null;
  holdLabel: string | null; conflict?: RentalRequestConflict; busy: boolean; creatingContract: boolean;
  canManage: boolean; manageTitle?: string; canManageContract: boolean; actions: RequestCardActions;
}) {
  const role = mode === "RECEIVED" ? "LANDLORD" : "TENANT";
  const nowMs = useNowMs();
  const p = presentRentalRequest({ role, request: req, contract, paymentLapsed: transferWindowClosed(req.initialPayment, nowMs) });
  const canCreate = canOfferContractFallback(req, mode, contract);
  const kind = primaryCardAction(role, p, { canCreateContract: canCreate });
  const showCancel = canCancelRentalRequest(req, contract, undefined, role);
  // "Mở hồ sơ" goes to the lease contract when there is one, otherwise it opens the request itself (so no second "Xem chi tiết").
  const opensContract = kind === "open" && !!contract && (req.status === "ACCEPTED" || req.status === "COMPLETED");
  const showDetailSecondary = !(kind === "open" && !opensContract);

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5" aria-label={`Yêu cầu thuê ${req.listingTitle}`}>
      <div className="flex gap-3">
        <Link href={listingDetailPath(req.listingId)} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted" title="Xem bài đăng">
          {validImage(req.listingThumbnail)
            ? <Image src={req.listingThumbnail!} alt={req.listingTitle} fill className="object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-muted-foreground"><Home className="h-6 w-6 opacity-40" aria-hidden="true" /></span>}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={listingDetailPath(req.listingId)} className="line-clamp-2 text-base font-bold leading-snug hover:text-primary">{req.listingTitle}</Link>
          {req.listingAddress && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{req.listingAddress}</p>}
          {req.listingPrice ? <p className="mt-1 text-sm font-extrabold text-primary">{formatVND(req.listingPrice)}<span className="text-xs font-normal text-muted-foreground">/tháng</span></p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${toneClasses[p.tone]}`}>
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />{p.label}
        </span>
        <span className="text-xs text-muted-foreground">Gửi {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: vi })}</span>
      </div>
      <p className="text-sm text-muted-foreground">{p.hint}</p>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 sm:grid-cols-4">
        <Fact label="Dọn vào" value={req.moveInDate ? format(new Date(req.moveInDate), "dd/MM/yyyy") : "—"} />
        <Fact label="Thời hạn" value={`${req.leaseMonths} tháng`} />
        <Fact label="Số người ở" value={`${req.occupantCount || 1} người`} />
        <Fact label="Tiền cọc" value={req.depositAmount != null ? formatVND(req.depositAmount) : "Theo tin đăng"} />
      </dl>

      {mode === "RECEIVED" && (
        <div className="space-y-1 text-sm">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground"><User className="h-4 w-4 text-primary" aria-hidden="true" />{req.renterName}</span>
            <a href={`tel:${req.renterPhone}`} className="flex items-center gap-1.5 hover:text-primary"><Phone className="h-4 w-4" aria-hidden="true" />{req.renterPhone}</a>
            {req.renterEmail && <span className="flex min-w-0 items-center gap-1.5"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{req.renterEmail}</span></span>}
          </p>
          {req.renterNote && <p className="line-clamp-2 italic text-muted-foreground">&quot;{req.renterNote}&quot;</p>}
        </div>
      )}
      {req.rejectReason && <p className={`rounded-xl border p-3 text-sm ${toneClasses.danger}`}>Lý do từ chối: {req.rejectReason}</p>}
      {req.status === "PENDING" && req.respondBy && <p className="text-sm text-muted-foreground">Hạn chủ nhà phản hồi: {new Date(req.respondBy).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (giờ Việt Nam)</p>}

      {agreement && (
        <section aria-label="Hợp đồng của yêu cầu thuê" className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{agreement.agreementKind === "DEPOSIT" ? "Hợp đồng đặt cọc giữ phòng" : "Hợp đồng thuê"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{agreement.contractNumber}{agreement.agreementKind === "DEPOSIT" && agreement.status === "ACTIVE" ? " · Đã ký đủ hai bên" : ""}</p>
          </div>
          <AgreementDocumentActions key={agreement.id} contract={agreement} perspective={mode === "RECEIVED" ? "landlord" : "tenant"} />
        </section>
      )}
      <StartChangeNotice request={req} mode={mode} onOpen={() => actions.openStartChange(req)} />
      {kind === "review" && <RentalReceiptNotice request={req} onOpen={() => actions.review(req)} />}

      {/* The one action area */}
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {kind === "respond" && <>
            <button type="button" className={btnPrimary} disabled={busy || !canManage} title={manageTitle} onClick={() => actions.accept(req)}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />Chấp thuận{holdLabel ? ` · giữ chỗ ${holdLabel}` : " & giữ chỗ"}
            </button>
            <button type="button" className={btnSecondary} disabled={busy || !canManage} title={manageTitle} onClick={() => actions.reject(req)}>Từ chối</button>
          </>}
          {kind === "pay" && <button type="button" className={btnPrimary} disabled={busy} onClick={() => actions.pay(req)}>
            <CreditCard className="h-4 w-4" aria-hidden="true" />{p.phase === "rejected" ? "Gửi lại chứng từ" : "Thanh toán"}
          </button>}
          {kind === "createContract" && <RentalContractFallbackButton request={req} mode={mode} contract={contract} busy={creatingContract} disabled={busy || !canManageContract} onCreate={actions.createContract} />}
          {kind === "open" && (opensContract
            ? <button type="button" className={btnPrimary} disabled={busy} onClick={() => actions.openContract(contract!.id)}><FileText className="h-4 w-4" aria-hidden="true" />{contract!.status === "ACTIVE" ? "Xem hợp đồng hiệu lực" : "Mở hợp đồng"}</button>
            : <button type="button" className={btnPrimary} onClick={() => actions.openDetail(req)}>Mở hồ sơ</button>)}
          {showDetailSecondary && <button type="button" className={btnSecondary} onClick={() => actions.openDetail(req)}>Xem chi tiết</button>}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <Link href={listingDetailPath(req.listingId)} className={btnLink}>Xem bài đăng</Link>
          {mode === "RECEIVED" && req.status === "PENDING" && conflict && (
            <button type="button" className={`${btnLink} text-violet-700 dark:text-violet-300`} onClick={() => actions.askAi(conflict)} title={`Phòng này có ${conflict.pendingCount} yêu cầu đang chờ duyệt`}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />Hỏi AI đánh giá ({conflict.pendingCount} yêu cầu)
            </button>
          )}
          {mode === "SENT" && req.status === "ACCEPTED" && !req.cancellationRefundPending && !req.latestStartChange && req.initialPayment?.status === "CONFIRMED" && (
            <button type="button" className={btnLink} onClick={() => actions.openStartChange(req)}>Đề nghị bắt đầu thuê sớm</button>
          )}
          {showCancel && <button type="button" className={`${btnLink} text-destructive hover:text-destructive`} disabled={busy} onClick={() => actions.cancel(req)}>Hủy yêu cầu</button>}
        </div>
      </div>

      {req.status === "ACCEPTED" && (
        <PolicyNotice tone="neutral" title="Hợp đồng cọc & hợp đồng thuê"
          text={req.depositAmount === 0
            ? "Không yêu cầu đặt cọc: bỏ qua hợp đồng cọc. Hợp đồng thuê được chuẩn bị khi đến ngày bắt đầu thuê và xác nhận đủ tiền thuê tháng đầu."
            : "Hợp đồng cọc có thể xem và ký ngay sau khi xác nhận nhận tiền. Khi hợp đồng thuê được tạo, nút xem sẽ ưu tiên hợp đồng thuê; HĐ cọc vẫn được lưu riêng trong hồ sơ."} />
      )}
    </article>
  );
}
