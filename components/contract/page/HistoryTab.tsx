"use client";

import Link from "next/link";
import { FileClock } from "lucide-react";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import { useAmendmentWorkspace } from "@/components/contract/detail/ContractAmendmentWorkspace";
import { amendmentDocumentStatus, amendmentDocumentTitle, concreteProposals, documentDate } from "@/lib/contract-document-history";
import { contractDetailPath } from "@/lib/contract-routes";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import type { ContractResponse } from "@/types/contract.type";
import { usePageData } from "./pageData";
import { Card, SectionTitle } from "./ui";

function AmendmentHistory({ perspective }: { perspective: "landlord" | "tenant" }) {
  const w = useAmendmentWorkspace();
  const rows = w?.data ? [...concreteProposals(w.data.proposals)].reverse() : [];
  if (!w?.data) return null;
  return (
    <Card>
      <SectionTitle title="Phụ lục & điều chỉnh" hint="Các đề xuất đổi điều khoản, từ mới nhất đến cũ nhất." />
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Chưa có phụ lục hay đề xuất điều chỉnh nào.</p> : (
        <ul className="mt-4 divide-y divide-border/60">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{amendmentDocumentTitle(p)}</p>
                <p className="text-muted-foreground">Áp dụng từ {documentDate(p.effectiveOn)} · {amendmentDocumentStatus(p, w.data!.serverNow)}</p>
              </div>
              {p.agreementContractId ? <Link href={contractDetailPath(perspective, p.agreementContractId)} className="shrink-0 font-semibold text-primary underline-offset-2 hover:underline">Mở phụ lục</Link> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function HistoryTab({ contract, isLandlord, perspective, preActive, onUpdated, onSnapshot }: {
  contract: ContractResponse;
  isLandlord: boolean;
  perspective: "landlord" | "tenant";
  preActive: boolean;
  onUpdated: () => Promise<void>;
  onSnapshot: (view: RentalOnboarding) => void;
}) {
  const { goTo, available } = usePageData();
  return (
    <>
      {!contract.parentContractId ? <AmendmentHistory perspective={perspective} /> : null}
      {available.includes("sign") ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><FileClock className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground">Phiên bản tài liệu</h2>
                <p className="text-sm text-muted-foreground">Mọi tệp Word/PDF đã tạo, các mốc ký và bằng chứng blockchain.</p>
              </div>
            </div>
            <button type="button" onClick={() => goTo("sign", "contract-document-history")}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Xem lịch sử tệp
            </button>
          </div>
        </Card>
      ) : null}
      {preActive ? (
        <section className="space-y-3">
          <SectionTitle title="Nhật ký hồ sơ thuê" hint="Những gì đã diễn ra từ lúc đặt cọc." />
          <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showDepositAgreement={false} sections={["history"]} onSnapshot={onSnapshot} onUpdated={onUpdated} />
        </section>
      ) : null}
    </>
  );
}
