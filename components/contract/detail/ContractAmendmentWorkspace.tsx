"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { contractAmendmentService as api } from "@/services/contract-amendment.service";
import { getApiErrorMessage } from "@/utils/apiError";
import type { AmendmentPayload, AmendmentProposal, AmendmentTerms, ContractAmendments, TermRow } from "@/types/contract-amendment.type";

export const amendmentInput = "mt-1 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-muted";
export const amendmentButton = "rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50";
export const amendmentMoney = (v: unknown) => Number(v || 0).toLocaleString("vi-VN") + " đ";
export const amendmentDate = (v: string) => v.split("-").reverse().join("/");
export const amendmentTime = (v?: string) => v ? new Date(v).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const empty: AmendmentTerms = { financial: {}, tenant: {}, property: {}, charges: [], equipments: [], amenities: [], policies: {}, specialTerms: "" };
export const activeAmendment = new Set(["REQUESTED", "CHANGES_REQUESTED", "APPROVED", "SCHEDULED", "TENANT_REQUESTED", "TENANT_ACCEPTED"]);

function restoreTerms(base:AmendmentTerms,change:TermRow):AmendmentTerms {
  const terms=structuredClone(base);
  for (const key of ["landlord","lease","meters","initialPayment"] as const) terms[key] = terms[key] ?? {};
  if (change.fields && typeof change.fields === "object") for (const [key, row] of Object.entries(change.fields as TermRow)) {
    if (["landlord","tenant","property","lease","financial","policies"].includes(key)) {
      const group = key as "landlord" | "tenant" | "property" | "lease" | "financial" | "policies";
      const locked=group==="financial"?["paymentDueDay","paymentDueOffsetDays"]:group==="policies"?["latePaymentFeeGraceDays","latePaymentFeeCap","billingRules"]:[];
      terms[group] = { ...terms[group], ...Object.fromEntries(Object.entries(row as TermRow).filter(([key])=>!locked.includes(key))) };
    }
  }
  if (change.rentAmount !== undefined) terms.financial.amountValue = change.rentAmount;
  for (const key of ["occupantCount","motorbikeCount","carCount"]) if (change[key] !== undefined) terms.tenant[key] = change[key];
  for (const key of ["charges","equipments","amenities"] as const) if (change[key]) terms[key] = structuredClone(change[key] as TermRow[]);
  if (change.policies) terms.policies = { ...terms.policies, ...Object.fromEntries(Object.entries(change.policies as TermRow).filter(([key])=>!["latePaymentFeeGraceDays","latePaymentFeeCap","billingRules"].includes(key))) };
  if (change.policyRows) terms.policies.listingPolicies = (change.policyRows as TermRow[]).map(r => ({code:r.code,label:r.label,valueType:"TEXT",value:r.text,displayValue:r.text,note:""}));
  if (change.specialTerms !== undefined) terms.specialTerms = String(change.specialTerms);
  if (change.featureRows) terms.property.features = structuredClone(change.featureRows);
  if (change.additionalTerms) terms.specialTerms += "\nTHỎA THUẬN BỔ SUNG:\n" + String(change.additionalTerms);
  return terms;
}
function scheduledSource(rows:AmendmentProposal[],id?:string):AmendmentProposal|undefined {
  const seen=new Set<string>();
  while(id&&!seen.has(id)){seen.add(id);const p=rows.find(p=>p.id===id);if(!p)return;if(p.status==="SCHEDULED")return p;id=p.previousProposalId;}
}

function useWorkspaceState(contractId: string, actorId: string, perspective: "landlord" | "tenant", enabled: boolean) {
  const [data, setData] = useState<ContractAmendments | null>(null), [error, setError] = useState("");
  const [savedDraft, setSavedDraft] = useState<AmendmentPayload | null>(null);
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false);
  const [values, setValues] = useState<AmendmentTerms>(empty);
  const [reason, setReason] = useState(""), [effectiveOn, setEffectiveOn] = useState("");
  const [previousId, setPreviousId] = useState<string>(), [tenantRequestId, setTenantRequestId] = useState<string>();
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]), [files, setFiles] = useState<File[]>([]);
  const mutex = useRef(false), editingRef = useRef(false), draftBase = useRef("");
  const requestId = useRef("");
  const [initialValues,setInitialValues] = useState("");
  const editBaseline=useMemo<AmendmentTerms|null>(()=>initialValues?JSON.parse(initialValues):null,[initialValues]);
  const load = useCallback(async () => {
    if (!enabled) return;
    try { const response = await api.get(contractId); setData(response); setError(""); }
    catch (e) { setError(getApiErrorMessage(e,"Không tải được điều khoản đang áp dụng.")); }
  }, [contractId, enabled]);
  useEffect(() => {
    void load();
    if (enabled && perspective === "landlord") {
      void api.draft(contractId).then(setSavedDraft).catch(() => { /* Explicit save failures are reported; absence never changes terms. */ });
    }
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && !editingRef.current && !mutex.current) void load(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load, contractId, perspective, enabled]);
  useEffect(() => {
    if (!editing) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload",beforeUnload);
    return () => window.removeEventListener("beforeunload",beforeUnload);
  }, [editing]);
  const run = async (fn: () => Promise<void>) => {
    if (mutex.current) return;
    mutex.current = true; setBusy(true);
    try { await fn(); } catch (e) { toast.error(getApiErrorMessage(e,"Không thực hiện được thao tác.")); }
    finally { mutex.current = false; setBusy(false); }
  };
  const start = (previous?: AmendmentProposal, draft?: AmendmentPayload | null, source?: AmendmentProposal) => {
    if (!data || perspective !== "landlord") return;
    if (draft && draft.baseRevisionId !== data.currentTermsRevisionId) { toast.error("Bản nháp dựa trên điều khoản cũ. Hãy bắt đầu lại và đối chiếu nội dung đang áp dụng."); return; }
    const acceptedRequest = source ?? data.proposals.find(p => p.status === "TENANT_ACCEPTED");
    if (draft?.tenantRequestId && draft.tenantRequestId !== acceptedRequest?.id) { toast.error("Yêu cầu liên kết bản nháp đã đóng. Xóa bản nháp hoặc bắt đầu đề xuất mới."); return; }
    const change = draft?.changes ?? previous?.changes ?? {}, terms = restoreTerms(data.currentTerms,change);
    setValues(terms);
    const oldScheduled=scheduledSource(data.proposals,draft?.previousProposalId ?? previous?.id);
    setInitialValues(JSON.stringify(restoreTerms(data.currentTerms,oldScheduled?.changes??{})));
    setReason(draft?.reason ?? previous?.reason ?? source?.reason ?? "");
    setEffectiveOn(previous?.status === "SCHEDULED" ? previous.effectiveOn : draft?.effectiveOn ?? (previous?.immediateEffect ? undefined : previous?.effectiveOn) ?? data.availableDates[0] ?? "");
    setPreviousId(draft?.previousProposalId ?? previous?.id); setTenantRequestId(draft?.tenantRequestId ?? acceptedRequest?.id);
    setEvidenceIds(draft?.evidenceIds ?? previous?.evidenceIds ?? []); setFiles([]);
    draftBase.current = data.currentTermsRevisionId; requestId.current = crypto.randomUUID();
    setEditing(true); editingRef.current = true;
    document.getElementById("contract-amendment-actions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const changes = useMemo(() => {
    if (!data || !editing) return {};
    const t = data.currentTerms, result: TermRow = {};
    if (String(values.financial.amountValue) !== String(t.financial.amountValue)) result.rentAmount = String(values.financial.amountValue ?? "");
    for (const k of ["occupantCount","motorbikeCount","carCount"]) if (String(values.tenant[k] ?? 0) !== String(t.tenant[k] ?? 0)) result[k] = values.tenant[k];
    for (const k of ["charges","equipments","amenities"] as const) if (JSON.stringify(values[k]) !== JSON.stringify(t[k])) {
      result[k] = k === "amenities" ? values[k].map(row => Object.fromEntries(Object.entries(row).filter(([key]) => ["index","code","name","sourceType"].includes(key)))) : values[k];
    }
    const fields: TermRow = {};
    for (const group of ["landlord","tenant","property","lease","financial","policies"] as const) {
      const excluded = group === "tenant" ? ["occupantCount","motorbikeCount","carCount"] : group === "financial" ? ["amountValue","amountNumber","amountWords","paymentDueDay","paymentDueOffsetDays"] : group === "policies" ? ["listingPolicies","latePaymentFeeGraceDays","latePaymentFeeCap","billingRules"] : group === "property" ? ["features"] : [];
      const rows = Object.fromEntries(Object.entries(values[group] ?? {}).filter(([key,value]) => !excluded.includes(key) && JSON.stringify(value) !== JSON.stringify((t[group] ?? {})[key])));
      if (Object.keys(rows).length) fields[group] = rows;
    }
    if (Object.keys(fields).length) result.fields = fields;
    if (JSON.stringify(values.property.features) !== JSON.stringify(t.property.features)) result.featureRows = values.property.features;
    if (JSON.stringify(values.policies.listingPolicies) !== JSON.stringify(t.policies.listingPolicies)) result.policyRows = (values.policies.listingPolicies as TermRow[] ?? []).map(r => ({code:r.code,label:r.label,text:r.valueType === "INTEGER" ? r.value : r.displayValue ?? r.value}));
    if (values.specialTerms !== t.specialTerms) result.specialTerms = values.specialTerms;
    if (Object.keys(result).length || previousId) result.freeForm = true;
    return result;
  }, [data, editing, values, previousId]);
  const replacement = scheduledSource(data?.proposals??[],previousId);
  const hasChanges = Boolean(Object.keys(changes).length && (!replacement || JSON.stringify(values) !== initialValues));
  const changedGroupCount = useMemo(() => {
    if (!replacement || !initialValues) return Object.keys(changes).filter(key => key !== "freeForm").length;
    const before = JSON.parse(initialValues) as AmendmentTerms;
    return (Object.keys(values) as (keyof AmendmentTerms)[]).filter(key => JSON.stringify(values[key]) !== JSON.stringify(before[key])).length;
  }, [replacement, initialValues, changes, values]);
  const changedFields = changes.fields as TermRow | undefined;
  const financial = ["rentAmount","charges","occupantCount","motorbikeCount","carCount"].some(k => k in changes)
    || Boolean(changedFields?.financial || changedFields?.lease || changedFields?.policies || (changedFields?.property as TermRow | undefined)?.areaText);
  const payload = (validate = true): AmendmentPayload => {
    if (!data) throw new Error("Chưa có dữ liệu hợp đồng.");
    if (validate) {
      const invalid = document.querySelector<HTMLInputElement>('[id^="amendment-"] input:invalid');
      if (invalid) { invalid.reportValidity(); throw new Error("Kiểm tra lại giá trị số/ngày đang nhập."); }
      if (!hasChanges) throw new Error("Chưa có nội dung thay đổi.");
      if (reason.trim().length < 10) throw new Error("Lý do cần ít nhất 10 ký tự.");
      if (!data.availableDates.includes(effectiveOn) || replacement && effectiveOn !== replacement.effectiveOn) throw new Error("Chọn đầu kỳ áp dụng hợp lệ; bản thay thế phải giữ ngày hiệu lực cũ.");
    }
    return { requestId: requestId.current, baseRevisionId: draftBase.current, previousProposalId: previousId, tenantRequestId,
      effectiveOn: effectiveOn || null, reason: reason.trim(), changes: { ...changes }, evidenceIds };
  };
  const stop = () => { setEditing(false); editingRef.current = false; };
  const patch = (group: keyof AmendmentTerms, value: TermRow | TermRow[] | string) => setValues(v => ({ ...v, [group]: value }));
  return { contractId, actorId, perspective, data, setData, error, savedDraft, setSavedDraft,
    editing, busy, run, load, start, stop, values, patch, changes, financial, replacement, hasChanges, changedGroupCount, editBaseline,
    reason, setReason, effectiveOn, setEffectiveOn, payload, files, setFiles, evidenceIds, setEvidenceIds };
}
type Workspace = ReturnType<typeof useWorkspaceState>;
const Context = createContext<Workspace | null>(null);
export const useAmendmentWorkspace = () => useContext(Context);
export function ContractTermsNotice() {
  const workspace = useAmendmentWorkspace();
  return <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground" role={workspace?.error ? "alert" : undefined}>
    {workspace?.error ? "Chưa tải được điều khoản hiện tại. Các mục bên dưới tạm hiển thị bản hợp đồng gốc; tải lại mục Phụ lục trước khi đối chiếu."
      : !workspace?.data ? "Đang kiểm tra phụ lục để hiển thị điều khoản hiện tại. Bản hợp đồng gốc đã ký được giữ nguyên trong hồ sơ."
      : "Các mục bên dưới thể hiện điều khoản đang áp dụng, bao gồm phụ lục đã đủ chữ ký và đến ngày hiệu lực. Bản hợp đồng gốc đã ký được giữ nguyên tại Tài liệu hợp đồng."}
  </p>;
}
export default function ContractAmendmentWorkspace({ contractId, actorId, perspective, enabled = true, children }: {
  contractId: string; actorId: string; perspective: "landlord" | "tenant"; enabled?: boolean; children: ReactNode;
}) {
  const state = useWorkspaceState(contractId,actorId,perspective,enabled);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
