"use client";
import type { ListingPolicyDefinition, ListingPolicyInput } from "@/types/listing-policy.type";
import { policyPermissions } from "@/types/listing-policy.type";
import { canReplacePolicyText, policySuggestion, selectPermission, systemPolicyValues } from "@/lib/listing-policy-suggestions";

export default function ListingPolicyFields({category,definitions,values,onChange,lockedCodes=[]}: {
  category: string;
  definitions: ListingPolicyDefinition[]; values: ListingPolicyInput[]; onChange: (v: ListingPolicyInput[]) => void; lockedCodes?: string[];
}) {
  const rowFor = (code: string) => values.find(v => v.code === code) ?? {code,value:"",note:""};
  const replace = (row: ListingPolicyInput) => onChange([...values.filter(v => v.code !== row.code),row]);
  const patch = (code: string,field: "value" | "note",value: string) => replace({...rowFor(code),[field]:value});
  const input = "mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";
  return <div className="grid gap-4 md:grid-cols-2">{definitions.map(d => {
    const row = values.find(v => v.code === d.code), locked = lockedCodes.includes(d.code);
    const fixed = systemPolicyValues[d.code];
    if (fixed !== undefined) return <div key={d.code} className="min-w-0 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">{d.label}</p>
      {d.helpText && <p className="mt-1 text-xs text-muted-foreground">{d.helpText}</p>}
      <p className="mt-2 flex flex-wrap items-center gap-2"><span className="text-lg font-bold">{fixed} {d.unitLabel}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Quy định hệ thống</span></p>
      <p className="mt-2 text-xs text-muted-foreground">{policySuggestion(category,d.code,"note")}</p>
    </div>;
    const target = d.valueType === "TEXT" ? "value" : "note";
    const template = d.valueType === "PERMISSION" ? undefined : policySuggestion(category,d.code,target);
    const offerTemplate = template !== undefined && row?.[target] !== template && canReplacePolicyText(d.code,row?.[target]);
    return <fieldset key={d.code} disabled={locked} className="min-w-0 rounded-xl border border-border bg-card p-4">
      <label htmlFor={`policy-${d.code}`} className="text-sm font-semibold">{d.label}{d.required && <span className="ml-1 text-rose-600">*</span>}</label>
      {d.helpText && <p className="mt-1 text-xs text-muted-foreground">{d.helpText}</p>}
      {d.valueType === "PERMISSION" ? <select id={`policy-${d.code}`} aria-label={d.label} value={row?.value ?? ""} onChange={e => replace(selectPermission(rowFor(d.code),e.target.value,category))} className={input}>
        <option value="">Chọn quy định…</option>{(d.choices?.length ? d.choices : policyPermissions).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select> : d.valueType === "INTEGER" ? <div className="flex items-center gap-2"><input id={`policy-${d.code}`} aria-label={d.label} type="number" min={d.minimumValue ?? undefined} max={d.maximumValue ?? undefined} step={1} value={row?.value ?? ""} onChange={e => patch(d.code,"value",e.target.value)} className={input} /><span className="pt-2 text-xs text-muted-foreground">{d.unitLabel}</span></div>
        : <textarea id={`policy-${d.code}`} aria-label={d.label} rows={3} maxLength={2000} value={row?.value ?? ""} onChange={e => patch(d.code,"value",e.target.value)} className={input} placeholder="Nhập quy định thực tế áp dụng cho tài sản này…" />}
      {d.valueType !== "TEXT" && <label className="mt-3 block text-xs text-muted-foreground">Điều kiện / ghi chú {d.label.toLowerCase()}<textarea aria-label={`Ghi chú ${d.label}`} rows={2} maxLength={1000} value={row?.note ?? ""} onChange={e => patch(d.code,"note",e.target.value)} className={input} placeholder="Điều kiện cụ thể, khu vực áp dụng… (không bắt buộc)" /></label>}
      {offerTemplate && <button type="button" aria-label={`Dùng mẫu gợi ý cho ${d.label}`} onClick={() => patch(d.code,target,template)} className="mt-2 rounded text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60">Dùng mẫu gợi ý</button>}
      {locked && <p className="mt-2 text-xs text-muted-foreground">Điều khoản thời hạn này được giữ nguyên trong phụ lục điều chỉnh.</p>}
    </fieldset>;
  })}</div>;
}
