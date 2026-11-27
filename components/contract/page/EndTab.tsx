"use client";

import { useSearchParams } from "next/navigation";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import RentalWorkflowPanel from "@/components/rental-request/RentalWorkflowPanel";
import ComplaintPanel from "@/components/complaint/ComplaintPanel";
import ContractLifecyclePanel from "@/components/contract/detail/ContractLifecyclePanel";
import ContractAmendmentPanel from "@/components/contract/detail/ContractAmendmentPanel";
import { useAmendmentWorkspace } from "@/components/contract/detail/ContractAmendmentWorkspace";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import type { ContractResponse } from "@/types/contract.type";
import { SectionTitle } from "./ui";

/** Plain-language rules (the server enforces them; this only explains them). */
function CancelRules({ preActive }: { preActive: boolean }) {
  return preActive ? (
    <PolicyNotice tone="info" title="Khi nào được hủy và hoàn tiền?" actionLabel="Xem quy tắc hủy"
      summary="Hủy trước khi ký đủ hợp đồng thuê: tiền cọc có thể bị giữ, tiền thuê tháng đầu được hoàn.">
      <p className="font-semibold text-foreground">Ba trường hợp hủy hồ sơ thuê</p>
      <ul>
        <li><strong>Hợp đồng thuê đã ký đủ hai bên:</strong> không thể hủy. Muốn kết thúc, hai bên dùng chấm dứt hợp đồng.</li>
        <li><strong>Hợp đồng cọc đã ký đủ nhưng hợp đồng thuê chưa ký đủ:</strong> vẫn được hủy, nhưng tiền cọc bị mất (chủ nhà giữ). Tiền thuê tháng đầu được hoàn lại.</li>
        <li><strong>Các trường hợp còn lại</strong> (chưa ký hợp đồng cọc): hoàn lại toàn bộ số tiền đã chuyển.</li>
      </ul>
      <p className="text-muted-foreground">Tiền hoàn được chuyển khoản; người nhận xác nhận đã nhận (sau một khoảng thời gian không phản hồi, hệ thống sẽ tự xác nhận).</p>
    </PolicyNotice>
  ) : (
    <PolicyNotice tone="info" title="Kết thúc hợp đồng đang có hiệu lực" actionLabel="Xem quy tắc"
      summary="Hợp đồng đã ký đủ không thể hủy. Muốn kết thúc sớm, hai bên thống nhất chấm dứt hợp đồng.">
      <ul>
        <li>Hợp đồng thuê đã ký đủ hai bên <strong>không thể hủy</strong>.</li>
        <li>Kết thúc sớm: một bên gửi đề nghị chấm dứt, bên còn lại đồng ý và hai bên ký văn bản chấm dứt.</li>
        <li>Tiền cọc được bàn giao và quyết toán ở mục Thanh toán &amp; cọc của hợp đồng cọc.</li>
        <li>Muốn kéo dài thời gian thuê, dùng mục Gia hạn bên dưới. Muốn đổi điều khoản (giá, phí…), dùng Phụ lục / điều chỉnh.</li>
      </ul>
    </PolicyNotice>
  );
}

/** Amendment panel lives here, except while a draft is being edited inline (then it sits beside the editable terms). */
export function AmendmentSlot({ where, contractId, actorId, perspective, focusId }: { where: "end" | "content"; contractId: string; actorId: string; perspective: "landlord" | "tenant"; focusId?: string }) {
  const editing = Boolean(useAmendmentWorkspace()?.editing);
  if ((where === "content") !== editing) return null;
  return <ContractAmendmentPanel contractId={contractId} actorId={actorId} perspective={perspective} focusId={focusId} />;
}

export default function EndTab({ contract, isLandlord, actorId, perspective, preActive, onUpdated, onSnapshot }: {
  contract: ContractResponse;
  isLandlord: boolean;
  actorId: string;
  perspective: "landlord" | "tenant";
  /** Pre-tenancy (deposit / signing stage): cancellation of the rental request. Otherwise a lease in effect. */
  preActive: boolean;
  onUpdated: () => Promise<void>;
  onSnapshot: (view: RentalOnboarding) => void;
}) {
  // Deep links from the branch's "Cần chú ý" list; without them nothing changes.
  const params = useSearchParams();
  const root = !contract.parentContractId;
  const effective = ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"].includes(contract.status);
  const amendable = ["ACTIVE", "EXPIRED", "CLOSED"].includes(contract.status);
  return (
    <>
      <CancelRules preActive={preActive} />
      {preActive ? (
        <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showDepositAgreement={false} sections={["end"]} onSnapshot={onSnapshot} onUpdated={onUpdated} />
      ) : null}
      {!preActive && root && effective ? (
        <>
          <section className="space-y-3">
            <SectionTitle title="Kết thúc sớm / trả nhà" hint="Đề nghị chấm dứt hoặc trả nhà trước hạn, có sự đồng ý của hai bên." />
            <RentalWorkflowPanel rentalRequestId={contract.rentalRequestId} kind="early-exit" onUpdated={onUpdated} focusRequest={params.get("focus") === "early-exit"} />
          </section>
          {contract.status === "ACTIVE" ? (
            <section className="space-y-3">
              <SectionTitle title="Gia hạn thời gian thuê" hint="Kéo dài thời hạn thuê. Dời hạn thanh toán một hóa đơn là việc khác, nằm trong mục hóa đơn." />
              <ContractLifecyclePanel key={`${actorId}:${contract.id}`} contractId={contract.id} isLandlord={isLandlord} onUpdated={onUpdated} mode="renewal" />
            </section>
          ) : null}
          {amendable ? (
            <section className="space-y-3">
              <SectionTitle title="Phụ lục / điều chỉnh" hint="Đổi điều khoản đã ký (giá thuê, phí, số người…). Có hiệu lực sau khi hai bên ký." />
              <AmendmentSlot where="end" contractId={contract.id} actorId={actorId} perspective={perspective} focusId={params.get("amendmentId") ?? undefined} />
            </section>
          ) : null}
          {contract.status === "ACTIVE" ? (
            <section className="space-y-3">
              <SectionTitle title="Khiếu nại" hint="Gửi và theo dõi khiếu nại liên quan đến hợp đồng đang thuê." />
              <ComplaintPanel rentalRequestId={contract.rentalRequestId} onUpdated={onUpdated} />
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
