"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, CreditCard, FileSignature, FileText, History, Receipt, XCircle } from "lucide-react";
import { DETAIL_TABS, type DetailTab } from "@/lib/rental-labels";
import { documentDate } from "@/lib/contract-document-history";
import type { Milestone } from "./timeline";
import { usePageData } from "./pageData";
import { Card, Pill, SectionTitle } from "./ui";

export interface InfoCardData { title: string; rows: [string, ReactNode][] }

const SHORTCUTS: Record<Exclude<DetailTab, "overview">, { icon: typeof FileText; hint: string }> = {
  sign: { icon: FileSignature, hint: "Ký số, xem PDF và bằng chứng blockchain" },
  payment: { icon: CreditCard, hint: "Chuyển khoản, xác nhận và sổ tiền cọc" },
  end: { icon: XCircle, hint: "Hủy, gia hạn, phụ lục và khiếu nại" },
  content: { icon: FileText, hint: "Toàn bộ điều khoản của hợp đồng" },
  history: { icon: History, hint: "Phụ lục, phiên bản tài liệu, nhật ký" },
};

function InfoCard({ title, rows }: InfoCardData) {
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "—");
  if (!shown.length) return null;
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <dl className="mt-3 divide-y divide-border/60">
        {shown.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-2 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-right font-semibold text-foreground [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Timeline({ steps }: { steps: Milestone[] }) {
  return (
    <ol className="mt-4 space-y-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 ? <span aria-hidden="true" className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${s.done ? "bg-primary/40" : "bg-border"}`} /> : null}
          <span aria-hidden="true" className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
            s.done ? "border-primary bg-primary text-primary-foreground" : s.current ? "border-primary bg-card text-primary ring-4 ring-primary/15" : "border-border bg-card text-muted-foreground"}`}>
            {s.done ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={`text-sm font-semibold ${s.done || s.current ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
              {s.current ? <span className="ml-2 align-middle"><Pill tone="info">Đang ở bước này</Pill></span> : null}
            </p>
            {s.at ? <p className="text-sm text-muted-foreground">{documentDate(s.at)}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

export default function OverviewTab({ cards, timeline, contractId, showInvoices, onboardingSummary, role }: {
  cards: InfoCardData[];
  timeline?: Milestone[];
  contractId: string;
  /** Root lease that is already in effect: show the invoices summary. */
  showInvoices: boolean;
  /** Pre-tenancy progress panel (keeps its own refresh running while this tab is open). */
  onboardingSummary?: ReactNode;
  role: "LANDLORD" | "TENANT";
}) {
  const { lifecycle, setTab, available } = usePageData();
  const open = (lifecycle?.billing.bills ?? []).filter((b) => ["DRAFT", "UNPAID", "OVERDUE"].includes(b.status));
  const overdue = open.filter((b) => b.status === "OVERDUE").length;
  const owed = open.filter((b) => b.status !== "DRAFT").reduce((sum, b) => sum + b.totalAmount, 0);
  const steps = timeline ?? [];

  return (
    <>
      {onboardingSummary}
      <div className="grid gap-4 md:grid-cols-2">{cards.map((c) => <InfoCard key={c.title} {...c} />)}</div>

      {showInvoices ? (
        <Card>
          <SectionTitle title="Thanh toán & hóa đơn" hint="Hóa đơn thuê từng kỳ nằm ở mục Thanh toán & cọc. Cọc và hoàn cọc nằm ở hợp đồng cọc." />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><Receipt className="h-5 w-5" /></span>
              <div className="min-w-0">
                {!lifecycle ? <p className="text-sm text-muted-foreground">Đang tải tình trạng hóa đơn…</p>
                  : open.length === 0 ? <p className="text-sm font-semibold text-foreground">Không có hóa đơn nào đang chờ xử lý</p>
                  : <>
                    <p className="text-sm font-semibold text-foreground">{open.length} hóa đơn chưa hoàn tất{owed > 0 ? ` · ${money(owed)}` : ""}</p>
                    <p className="text-sm text-muted-foreground">{overdue > 0 ? `${overdue} hóa đơn đã quá hạn` : role === "TENANT" ? "Thanh toán trước hạn để tránh phí chậm trả" : "Theo dõi và xác nhận thanh toán của người thuê"}</p>
                  </>}
              </div>
            </div>
            <button type="button" onClick={() => setTab("payment")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Xem thanh toán & hóa đơn <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </Card>
      ) : null}

      {steps.length ? (
        <Card>
          <SectionTitle title="Hành trình hợp đồng" hint="Các mốc từ lúc soạn đến khi hợp đồng có hiệu lực." />
          <Timeline steps={steps} />
        </Card>
      ) : null}

      <div>
        <h2 className="text-lg font-bold text-foreground">Đi tới mục khác</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Mỗi việc cần làm nằm ở đúng một mục.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {DETAIL_TABS.filter((t) => t.id !== "overview" && available.includes(t.id)).map((t) => {
            const s = SHORTCUTS[t.id as Exclude<DetailTab, "overview">];
            const Icon = s.icon;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{t.label}</span>
                  <span className="block text-sm text-muted-foreground">{s.hint}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
