"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import { paymentModulePath, safeResourceId } from "@/lib/payment-module";
import { contractService } from "@/services/contract.service";
import { rentalWorkflowService } from "@/services/rental-workflow.service";
import RentalWorkflowPanel from "@/components/rental-request/RentalWorkflowPanel";
import { useAuth } from "@/features/auth/useAuth";

type Phase = "loading" | "missing" | "retry" | { workflowRootId: string; side: "landlord" | "tenant"; earlyExitRentalRequestId?: string };

function Message({ children }: { children: ReactNode }) {
  return <div role="status" className="mx-auto max-w-xl rounded-xl border p-5 text-sm">{children}</div>;
}

// Notification landing: the viewer's side comes from the verified account vs the persisted parties of the authorized
// contract, never from the stored dashboard role. ?workflow= is only a hint (allowlisted by the caller) and is never trusted.
function Landing({ userId, contractId, moveIn }: { userId: string; contractId: string; moveIn: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setPhase("loading");
    void contractService.getContract(contractId).then(async (contract) => {
      if (!live) return;
      const side = userId === contract?.landlordId ? "landlord" : userId === contract?.tenantId ? "tenant" : null;
      if (!side || contract.id !== contractId) { setPhase("missing"); return; }
      if (contract.agreementKind === "WORKFLOW") {
        // Workflow signing documents live on the root's panel; the exact document is validated there against the viewer's own list.
        const rootId = safeResourceId(contract.parentContractId);
        if (!rootId) setPhase("missing");
        else if (moveIn) router.replace(paymentModulePath(rootId, "deposit", undefined, { moveIn: true, agreementId: contractId }));
        else {
          // EARLY_EXIT notices have no query hint: resolve the exact child from the authorized persisted workflow list.
          const rentalRequestId = safeResourceId(contract.rentalRequestId);
          if (rentalRequestId) {
            const documents = await rentalWorkflowService.documents(rentalRequestId, "early-exit");
            if (!live) return;
            if (documents.some(document => document.signingContractId === contractId)) {
              setPhase({ workflowRootId: rootId, side, earlyExitRentalRequestId: rentalRequestId });
              return;
            }
          }
          setPhase({ workflowRootId: rootId, side });
        }
        return;
      }
      router.replace(window.location.hash === "#monthly-invoices" ? invoiceDetailPath(contractId) : contractDetailPath(side, contractId));
    }).catch((error: unknown) => {
      if (!live) return;
      // Only an answer from the server (forbidden/not found/invalid) is neutral "missing"; connection or server failures can be retried.
      const status = (error as { response?: { status?: number } })?.response?.status;
      setPhase(status === 400 || status === 403 || status === 404 ? "missing" : "retry");
    });
    return () => { live = false; };
  }, [userId, contractId, moveIn, attempt, router]);

  if (phase === "loading") return <Message>Đang mở văn bản…</Message>;
  if (phase === "retry") return <div role="alert" className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
    Chưa kết nối được máy chủ để mở văn bản. Lỗi kết nối không có nghĩa bạn mất quyền xem. <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline">Thử lại</button>
  </div>;
  if (phase === "missing") return <Message>Không tìm thấy văn bản hoặc bạn không có quyền xem. <Link href="/dashboard/contracts" className="text-primary underline">Về danh sách hợp đồng</Link></Message>;
  if (phase.earlyExitRentalRequestId) return <div className="mx-auto max-w-4xl space-y-4">
    <Link href={contractDetailPath(phase.side, phase.workflowRootId)} className="text-sm text-primary underline">Mở hợp đồng gốc</Link>
    <RentalWorkflowPanel rentalRequestId={phase.earlyExitRentalRequestId} kind="early-exit" contractId={phase.workflowRootId} agreementId={contractId} focusRequest />
  </div>;
  return <Message>Văn bản này được quản lý cùng hồ sơ của hợp đồng gốc. <Link href={contractDetailPath(phase.side, phase.workflowRootId)} className="font-semibold text-primary underline">Mở hợp đồng gốc</Link></Message>;
}

function ContractLanding() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { initialized, authenticated, userId, login } = useAuth();
  if (!initialized) return <Message>Đang xác thực tài khoản…</Message>;
  if (!authenticated || !userId) return <div className="mx-auto max-w-xl py-12"><div className="space-y-4 rounded-3xl border bg-card p-8 text-center shadow-sm">
    <h1 className="text-lg font-extrabold">Đăng nhập để mở văn bản</h1>
    <p className="text-sm text-muted-foreground">Văn bản chỉ hiển thị cho các bên của hợp đồng.</p>
    <button type="button" onClick={() => login(`${window.location.pathname}${window.location.search}${window.location.hash}`)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Đăng nhập</button>
  </div></div>;
  const contractId = safeResourceId(typeof id === "string" ? id : null);
  if (!contractId) return <Message>Không tìm thấy văn bản hoặc bạn không có quyền xem. <Link href="/dashboard/contracts" className="text-primary underline">Về danh sách hợp đồng</Link></Message>;
  return <Landing key={`${userId}:${contractId}`} userId={userId} contractId={contractId} moveIn={params.get("workflow") === "move-in"} />;
}

export default function LegacyContractDetailPage() {
  return <Suspense fallback={<Message>Đang mở văn bản…</Message>}><ContractLanding /></Suspense>;
}
