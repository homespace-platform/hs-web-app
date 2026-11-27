"use client";

import { PolicyNotice } from "@/components/common/PolicyDialog";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileCheck, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { contractService } from "@/services/contract.service";
import type { ContractResponse } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import { contractStatus, toneClasses } from "@/lib/rental-labels";
import AgreementDocumentActions from "./AgreementDocumentActions";

type Perspective = "landlord" | "tenant";
type Kind = "LEASE" | "DEPOSIT";
type Group = "ALL" | "MINE" | "WAITING" | "RUNNING" | "ENDED";

/** Sign-state of the contract seen from the viewer: who has to move next. */
function turnOf(c: ContractResponse, perspective: Perspective): "mine" | "waiting" | "running" | "ended" {
  const landlord = perspective === "landlord";
  switch (c.status) {
    case "LANDLORD_SIGNATURE_PENDING": return landlord ? "mine" : "waiting";
    case "TENANT_SIGNATURE_PENDING": return landlord ? "waiting" : "mine";
    // Deposit agreements are born ready (DRAFT = landlord signs next); a lease draft is the landlord's to finish.
    case "DRAFT": return landlord ? "mine" : "waiting";
    case "PENDING_REVIEW": return landlord ? "waiting" : "mine";
    case "ACTIVE": return "running";
    default: return "ended";
  }
}

const SIGN_STATUSES = ["LANDLORD_SIGNATURE_PENDING", "TENANT_SIGNATURE_PENDING"];

function primaryAction(c: ContractResponse, perspective: Perspective, turn: ReturnType<typeof turnOf>) {
  const detail = contractDetailPath(perspective, c.id);
  if (turn === "mine" && SIGN_STATUSES.includes(c.status)) return { label: "Ký số", href: `${detail}?tab=sign`, detail: false };
  if (c.agreementKind !== "DEPOSIT" && ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"].includes(c.status)) {
    return { label: "Xem hóa đơn", href: invoiceDetailPath(c.id), detail: false };
  }
  return { label: "Mở hồ sơ", href: detail, detail: true };
}

function hint(c: ContractResponse, perspective: Perspective, turn: ReturnType<typeof turnOf>): string | null {
  const other = perspective === "landlord" ? "người thuê" : "chủ nhà";
  if (turn === "mine") {
    if (SIGN_STATUSES.includes(c.status)) return "Đến lượt bạn ký số.";
    return c.status === "DRAFT" ? "Bản nháp đang chờ bạn hoàn thiện." : "Cần bạn xem lại và xác nhận.";
  }
  if (turn === "waiting") return c.status === "DRAFT" && perspective === "tenant" && c.agreementKind !== "DEPOSIT" ? null : `Đang chờ ${other}.`;
  return null;
}

const GROUPS: { id: Exclude<Group, "ALL">; label: (kind: Kind) => string }[] = [
  { id: "MINE", label: () => "Cần tôi xử lý" },
  { id: "WAITING", label: () => "Đang chờ bên kia" },
  { id: "RUNNING", label: (kind) => kind === "DEPOSIT" ? "Đã ký đủ" : "Đang thuê" },
  { id: "ENDED", label: () => "Đã kết thúc" },
];
const groupOf = (turn: ReturnType<typeof turnOf>): Exclude<Group, "ALL"> =>
  turn === "mine" ? "MINE" : turn === "waiting" ? "WAITING" : turn === "running" ? "RUNNING" : "ENDED";

export default function ContractListView({ perspective }: { perspective: Perspective }) {
  return <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Đang tải hợp đồng…</p>}><ContractListContent perspective={perspective}/></Suspense>;
}

function ContractCard({ c, perspective }: { c: ContractResponse; perspective: Perspective }) {
  const kind: Kind = c.agreementKind === "DEPOSIT" ? "DEPOSIT" : "LEASE";
  const status = contractStatus(c.status, kind);
  const turn = turnOf(c, perspective);
  const action = primaryAction(c, perspective, turn);
  const note = hint(c, perspective, turn);
  const detail = contractDetailPath(perspective, c.id);
  const tenantDraft = kind === "LEASE" && c.status === "DRAFT" && perspective === "tenant";
  return (
    <article className={`rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${turn === "mine" ? "border-primary/40 ring-1 ring-primary/15" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{kind === "DEPOSIT" ? "Hợp đồng cọc · Giữ phòng" : "Hợp đồng thuê"}</p>
          <h2 className="mt-0.5 truncate text-base font-bold text-foreground">
            <Link href={detail} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{c.contractNumber}</Link>
          </h2>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-semibold ${toneClasses[status.tone]}`}>{status.label}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {perspective === "landlord" ? "Bạn là bên cho thuê" : "Bạn là bên đi thuê"}
        {c.createdAt ? ` · Tạo ${format(new Date(c.createdAt), "dd/MM/yyyy")}` : ""}
        {kind === "LEASE" && c.effectiveLeaseMonths ? ` · Thời hạn ${c.effectiveLeaseMonths} tháng` : ""}
      </p>
      {note && <p className="mt-1 text-sm font-medium text-foreground">{note}</p>}
      {tenantDraft && (
        <div className="mt-3 space-y-1 rounded-xl bg-muted/50 p-3 text-sm">
          <p className="text-muted-foreground">Đây là bản đang soạn, chưa có hiệu lực. Bạn được xem nội dung; chỉ ký được khi đã đến ngày thuê và xác nhận đủ tiền.</p>
          <Link href={detail} className="inline-flex font-semibold text-primary hover:underline">Xem hợp đồng & đề nghị bắt đầu thuê sớm →</Link>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href={action.href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {action.label} →
        </Link>
        {!action.detail && !tenantDraft && (
          <Link href={detail} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Mở hồ sơ</Link>
        )}
        <AgreementDocumentActions contract={c} perspective={perspective} showDetails={false}/>
      </div>
    </article>
  );
}

function ContractListContent({ perspective }: { perspective: Perspective }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agreementKind: Kind = searchParams.get("kind") === "DEPOSIT" ? "DEPOSIT" : "LEASE";
  const sequence = useRef({ value: 0 });
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContractResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [group, setGroup] = useState<Group>("ALL");

  const load = useCallback(async (silent = false) => {
    const current = ++sequence.current.value;
    if (!silent) setLoading(true);
    try {
      // The groups are a client-side view over the page: the API filter stays "all statuses".
      const res = await contractService.listContracts({
        role: perspective.toUpperCase() as "LANDLORD" | "TENANT",
        page,
        size: 12,
        agreementKind,
      });
      if (current !== sequence.current.value) return;
      setItems(res.result || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      if (current === sequence.current.value && !silent) toast.error(getApiErrorMessage(err, "Không thể tải danh sách hợp đồng."));
    } finally {
      if (current === sequence.current.value) setLoading(false);
    }
  }, [page, perspective, agreementKind]);

  useEffect(() => {
    const counter = sequence.current;
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(true); }, 30000);
    return () => { ++counter.value; window.clearInterval(timer); };
  }, [load]);

  const counts: Record<Group, number> = { ALL: items.length, MINE: 0, WAITING: 0, RUNNING: 0, ENDED: 0 };
  for (const c of items) counts[groupOf(turnOf(c, perspective))]++;
  const shown = group === "ALL" ? items : items.filter((c) => groupOf(turnOf(c, perspective)) === group);

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
            <FileCheck className="h-6 w-6 text-primary" />
            {perspective === "landlord" ? "Hợp đồng cho thuê" : "Hợp đồng đi thuê"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {perspective === "landlord" ? "Ký và theo dõi hợp đồng cọc, hợp đồng thuê của các hồ sơ cho thuê." : "Xem và ký hợp đồng cọc giữ phòng, hợp đồng thuê của bạn."}
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="flex gap-2 rounded-2xl border border-border bg-card p-2" role="tablist" aria-label="Loại hợp đồng">
        {(["LEASE", "DEPOSIT"] as const).map((kind) => <button key={kind} type="button" role="tab" aria-selected={agreementKind === kind}
          className={`min-h-11 flex-1 cursor-pointer rounded-xl px-4 text-sm font-semibold ${agreementKind === kind ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          onClick={() => { setPage(1); setGroup("ALL"); router.replace(`/dashboard/${perspective}/contracts?kind=${kind}`, { scroll: false }); }}>
          {kind === "DEPOSIT" ? "Hợp đồng cọc" : "Hợp đồng thuê"}
        </button>)}
      </div>
      {agreementKind === "LEASE" && <PolicyNotice tone="neutral" title="Hợp đồng thuê" summary="Theo dõi hiệu lực, hóa đơn hằng tháng, phụ lục và trả nhà tại đây."><p>Hợp đồng thuê được chuẩn bị khi đến ngày bắt đầu và đã xác nhận đủ tiền thuê kỳ đầu. Mở từng hợp đồng để xem hóa đơn, phụ lục, gia hạn hoặc trả nhà.</p></PolicyNotice>}
      {agreementKind === "DEPOSIT" && <PolicyNotice tone="neutral" title="Hợp đồng cọc" summary="Ký cọc, theo dõi hạn vào ở và thanh toán tháng đầu tại đây."><p>Xem và ký cọc, theo dõi hạn vào ở, thanh toán tháng đầu và xử lý hồ sơ giữ phòng tại đây. Sau khi ký cọc, bạn cần hoàn tất nghĩa vụ đúng hạn.</p></PolicyNotice>}

      <div className="flex flex-wrap gap-2" aria-label="Nhóm hợp đồng">
        <button type="button" aria-pressed={group === "ALL"} onClick={() => { setPage(1); setGroup("ALL"); }}
          className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors ${group === "ALL" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
          Tất cả ({counts.ALL})
        </button>
        {GROUPS.map((g) => (
          <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}
            className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors ${group === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
            {g.label(agreementKind)} ({counts[g.id]})
          </button>
        ))}
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">Số lượng tính trên các hợp đồng đang hiển thị ở trang này.</p>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((k) => <div key={k} className="h-40 animate-pulse rounded-2xl border border-border bg-muted/40" />)}
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-foreground">{agreementKind === "DEPOSIT" ? "Chưa có hợp đồng cọc" : "Chưa có hợp đồng thuê"}</p>
          <div className="mx-auto max-w-md text-left">
            <PolicyNotice tone="neutral" title="Khi nào xuất hiện hợp đồng?" actionLabel="Xem quy tắc" summary={agreementKind === "DEPOSIT"
              ? (perspective === "landlord" ? "Hợp đồng cọc xuất hiện sau khi bạn xác nhận nhận cọc." : "Bạn ký hợp đồng cọc sau khi chủ nhà xác nhận nhận cọc.")
              : "Hợp đồng thuê xuất hiện khi đến ngày bắt đầu và đã xác nhận đủ tiền thuê kỳ đầu."}>
              <p>{perspective === "landlord"
                ? "Với hồ sơ có cọc, hợp đồng cọc sẽ xuất hiện sau khi xác nhận nhận cọc. Hồ sơ không đặt cọc hoặc cọc 0 đồng bỏ qua hợp đồng cọc. Hợp đồng thuê được chuẩn bị khi đến ngày bắt đầu và xác nhận đủ tiền thuê."
                : "Với hồ sơ có cọc, bạn xem và ký hợp đồng cọc sau khi chủ nhà xác nhận nhận cọc. Không đặt cọc hoặc cọc 0 đồng thì bỏ qua bước này. Hợp đồng thuê xuất hiện khi đến ngày bắt đầu và xác nhận đủ tiền."}</p>
            </PolicyNotice>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Không có hợp đồng thuộc nhóm này ở trang hiện tại.
              <button type="button" onClick={() => setGroup("ALL")} className="ml-2 cursor-pointer font-semibold text-primary hover:underline">Xem tất cả</button>
            </div>
          )}
          {shown.map((c) => <ContractCard key={c.id} c={c} perspective={perspective} />)}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 pt-2 text-sm">
              <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span>{page}/{totalPages}</span>
              <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
