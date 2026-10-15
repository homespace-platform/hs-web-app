"use client";
import type { ListingPolicyDefinition, ListingPolicyInput } from "@/types/listing-policy.type";
import { policyPermissions } from "@/types/listing-policy.type";

export default function ListingPolicyFields({definitions,values,onChange,lockedCodes=[]}: {
  definitions: ListingPolicyDefinition[]; values: ListingPolicyInput[]; onChange: (v: ListingPolicyInput[]) => void; lockedCodes?: string[];
}) {
  const patch = (code: string,field: "value" | "note",value: string) => {
    const old = values.find(v => v.code === code) ?? {code,value:"",note:""};
    onChange([...values.filter(v => v.code !== code),{...old,[field]:value}]);
  };
  const input = "mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";
  return <div className="grid gap-4 md:grid-cols-2">{definitions.map(d => {
    const row = values.find(v => v.code === d.code), locked = lockedCodes.includes(d.code);
    return <fieldset key={d.code} disabled={locked} className="min-w-0 rounded-xl border border-border bg-card p-4">
      <label htmlFor={`policy-${d.code}`} className="text-sm font-semibold">{d.label}{d.required && <span className="ml-1 text-rose-600">*</span>}</label>
      {d.helpText && <p className="mt-1 text-xs text-muted-foreground">{d.helpText}</p>}
      {d.valueType === "PERMISSION" ? <select id={`policy-${d.code}`} aria-label={d.label} value={row?.value ?? ""} onChange={e => patch(d.code,"value",e.target.value)} className={input}>
        <option value="">Chọn quy định…</option>{(d.choices?.length ? d.choices : policyPermissions).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select> : d.valueType === "INTEGER" ? <div className="flex items-center gap-2"><input id={`policy-${d.code}`} aria-label={d.label} type="number" min={d.minimumValue ?? undefined} max={d.maximumValue ?? undefined} step={1} value={row?.value ?? ""} onChange={e => patch(d.code,"value",e.target.value)} className={input} /><span className="pt-2 text-xs text-muted-foreground">{d.unitLabel}</span></div>
        : <textarea id={`policy-${d.code}`} aria-label={d.label} rows={3} maxLength={2000} value={row?.value ?? ""} onChange={e => patch(d.code,"value",e.target.value)} className={input} placeholder="Nhập quy định thực tế áp dụng cho tài sản này…" />}
      {d.valueType !== "TEXT" && <label className="mt-3 block text-xs text-muted-foreground">Điều kiện / ghi chú {d.label.toLowerCase()}<textarea aria-label={`Ghi chú ${d.label}`} rows={2} maxLength={1000} value={row?.note ?? ""} onChange={e => patch(d.code,"note",e.target.value)} className={input} placeholder="Điều kiện cụ thể, khu vực áp dụng… (không bắt buộc)" /></label>}
      {locked && <p className="mt-2 text-xs text-muted-foreground">Điều khoản thời hạn này được giữ nguyên trong phụ lục điều chỉnh.</p>}
    </fieldset>;
  })}</div>;
}
