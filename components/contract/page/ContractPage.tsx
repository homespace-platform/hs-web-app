"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import NextActionCard, { type CardAction } from "@/components/rental/NextActionCard";
import DetailTabs, { panelId, tabId, type TabItem } from "@/components/rental/DetailTabs";
import { useAmendmentWorkspace } from "@/components/contract/detail/ContractAmendmentWorkspace";
import { contractDetailPath } from "@/lib/contract-routes";
import { paymentModulePath, paymentQuery } from "@/lib/payment-module";
import { DETAIL_TABS, describeNextAction, type DetailTab, type Role } from "@/lib/rental-labels";
import { contractLifecycleService } from "@/services/contract-lifecycle.service";
import type { NextAction } from "@/services/rental-onboarding.service";
import type { ContractResponse } from "@/types/contract.type";
import { deriveNextStep, primaryLabel, type NextStep, type StepLink } from "./nextStep";
import { Pill, TabBody } from "./ui";
import { PageDataContext } from "./pageData";
import { usePolledRead } from "./usePolledRead";

const PREFIX = "contract";
const POST_ACTIVE = ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"];

interface Props {
  perspective: "landlord" | "tenant";
  role: Role;
  actorId: string;
  contract: ContractResponse;
  /** Pre-tenancy flow: the next step comes from the server (onboarding). Otherwise it is derived from page data. */
  preActive: boolean;
  nextAction: NextAction | null;
  /** Server message shown when there is no `nextAction` (older backend). */
  onboardingMessage?: string | null;
  onboardingLoaded: boolean;
  /** The onboarding read failed and nothing was loaded yet: show a retry instead of an endless skeleton. */
  onboardingError?: boolean;
  onRetryOnboarding?: () => void;
  tab: DetailTab;
  setTab: (tab: DetailTab) => void;
  available: DetailTab[];
  /** Bumped after a panel changed something, so the derived next step reloads. */
  syncTick: number;
  header: ReactNode;
  panels: Partial<Record<DetailTab, ReactNode>>;
  /** A tab that stays mounted (hidden) when inactive, e.g. the draft form that a "Lưu" button elsewhere submits. */
  keepMounted?: DetailTab;
}

function StepExtra({ step }: { step: NextStep }) {
  return (
    <div className="mt-1.5 space-y-2">
      {step.hint ? <p className="text-sm leading-relaxed text-muted-foreground">{step.hint}</p> : null}
      <Pill tone={step.mine ? (step.tone === "danger" ? "danger" : "info") : "warning"}>{step.mine ? "Đến lượt bạn" : "Đang chờ bên còn lại"}</Pill>
    </div>
  );
}

export default function ContractPage({
  perspective, role, actorId, contract, preActive, nextAction, onboardingMessage, onboardingLoaded, onboardingError, onRetryOnboarding,
  tab, setTab, available, syncTick, header, panels, keepMounted,
}: Props) {
  const workspace = useAmendmentWorkspace();
  const root = !preActive && !contract.parentContractId && POST_ACTIVE.includes(contract.status);
  const lifecycle = usePolledRead(() => contractLifecycleService.get(contract.id), contract.id, root);
  const reloadLifecycle = lifecycle.reload;
  useEffect(() => { if (syncTick > 0 && root) void reloadLifecycle(); }, [syncTick, root, reloadLifecycle]);

  // goTo: a tab switch that must end scrolled to an element of the new tab; the effect runs once that tab is rendered.
  const pendingScroll = useRef<string | null>(null);
  const goTo = useCallback((next: DetailTab, elementId: string) => { pendingScroll.current = elementId; setTab(next); }, [setTab]);
  const active = available.includes(tab) ? tab : "overview";
  useEffect(() => {
    const id = pendingScroll.current;
    pendingScroll.current = null;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  // Editing an amendment happens inline in the contract terms, so bring the viewer there.
  const editing = Boolean(workspace?.editing);
  useEffect(() => { if (editing && tab !== "content") setTab("content"); }, [editing, tab, setTab]);

  const step = useMemo(
    () => (preActive ? null : deriveNextStep({ role, actorId, contract, lifecycle: lifecycle.data, proposals: workspace?.data?.proposals })),
    [preActive, role, actorId, contract, lifecycle.data, workspace?.data?.proposals],
  );
  const view = preActive ? describeNextAction(nextAction, role) : null;
  const badgeTab: DetailTab | undefined = view?.mine ? view.tab : step?.mine ? step.tab : undefined;

  const tabs: TabItem<DetailTab>[] = DETAIL_TABS.map((t) => ({
    ...t, hidden: !available.includes(t.id), badge: t.id === badgeTab && t.id !== active ? "1" : undefined,
  }));

  // Rent invoices are in this lease's payment tab; deposit steps go through the landing, which opens the deposit agreement.
  const invoicesHref = (link: Extract<StepLink, { kind: "invoices" }>) => link.section === "monthly"
    ? `${contractDetailPath(perspective, contract.id)}?${paymentQuery("monthly", link.invoiceId)}` : paymentModulePath(contract.id, "deposit");
  const linkHref = (link: StepLink) => link.kind === "invoices" ? invoicesHref(link) : contractDetailPath(perspective, link.id);
  let primary: CardAction | undefined;
  const secondary: CardAction[] = [];
  if (view?.mine && view.tab !== active) primary = { label: primaryLabel(view.tab), onClick: () => setTab(view.tab) };
  if (step) {
    const href = step.link ? linkHref(step.link) : undefined;
    if (step.mine && href) primary = { label: step.cta ?? "Mở", href };
    else if (step.mine && step.tab && step.tab !== active) primary = { label: step.cta ?? primaryLabel(step.tab), onClick: () => setTab(step.tab!) };
    else if (href) secondary.push({ label: step.link?.kind === "invoices" ? (step.link.section === "deposit" ? "Xem cọc & hoàn cọc" : "Xem hóa đơn") : "Mở hồ sơ liên quan", href });
  }

  const card = preActive
    ? onboardingLoaded
      ? <NextActionCard role={role} nextAction={nextAction} fallbackMessage={onboardingMessage} primary={primary} secondary={secondary} />
      : onboardingError
        ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <span>Chưa tải được bước tiếp theo của hồ sơ.</span>
            <button type="button" onClick={onRetryOnboarding} className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Thử lại</button>
          </div>
        : <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" role="status" aria-label="Đang kiểm tra bước tiếp theo" />
    : step
      ? <NextActionCard role={role} custom={{ title: step.title, hint: step.hint, mine: step.mine, tone: step.tone }} extra={<StepExtra step={step} />} primary={primary} secondary={secondary} />
      : null;

  return (
    <PageDataContext.Provider value={{ lifecycle: lifecycle.data, setTab, goTo, available }}>
    <div className="mx-auto max-w-5xl space-y-6 pb-52 animate-in fade-in-50 duration-200">
      {header}
      {root && lifecycle.error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <span>Chưa cập nhật được tiến trình hợp đồng. Bước tiếp theo đang hiển thị có thể chưa mới nhất.</span>
          <button type="button" onClick={() => void reloadLifecycle()} className="inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tải lại</button>
        </div>
      ) : null}
      {card}
      <DetailTabs tabs={tabs} active={active} onChange={setTab} idPrefix={PREFIX} />
      <TabBody id={panelId(PREFIX, active)} labelledBy={tabId(PREFIX, active)}>{panels[active]}</TabBody>
      {keepMounted && keepMounted !== active ? <div hidden>{panels[keepMounted]}</div> : null}
    </div>
    </PageDataContext.Provider>
  );
}
