import type { ListingPolicyValue } from "@/types/listing-policy.type";
import { ShieldCheck } from "lucide-react";
export default function ListingPoliciesCard({rows,compact=false,contract=false}: {rows?: ListingPolicyValue[]; compact?: boolean; contract?: boolean}) {
  return <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <h3 className={`${compact ? "text-sm" : "text-lg"} flex items-center gap-2 font-bold`}><ShieldCheck className="h-5 w-5 text-primary" />Chính sách & nội quy thuê</h3>
    <p className="mt-1 text-xs text-muted-foreground">{contract ? "Bản chụp chính sách đã chốt của hợp đồng. Thay đổi phải được hai bên duyệt và ký phụ lục." : "Quy định do chủ nhà công bố. Các chính sách được chốt trong hợp đồng khi hai bên xác lập thỏa thuận thuê."}</p>
    {rows?.length ? <dl className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">{rows.map(r => <div key={r.code} className="min-w-0 border-b border-border/60 pb-3"><dt className="text-xs text-muted-foreground">{r.label}</dt><dd data-contract-field-state={contract?"editable":undefined} className={`mt-1 whitespace-pre-wrap break-words text-sm font-medium ${contract?"text-blue-700! dark:text-blue-400!":""}`}>{r.displayValue}</dd></div>)}</dl>
      : <p className="mt-3 text-sm text-muted-foreground">Chủ nhà chưa công bố chính sách cho bài đăng này. Hãy hỏi rõ trước khi gửi yêu cầu thuê.</p>}
  </section>;
}
