"use client";

import { ContractEditField } from "./ContractFieldState";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { useAmendmentWorkspace, amendmentInput as input } from "./ContractAmendmentWorkspace";
import type { TermRow } from "@/types/contract-amendment.type";
import VndMoneyInput from "@/components/ui/vnd-money-input";
import { contractPropertyFeatureValue } from "@/lib/contract-property-feature-labels";
import { amendmentNumbers, amendmentDateInput, amendmentDateText, amendmentLeasePatch, numericPropertyFeature, squareMetresText } from "@/lib/contract-amendment-input";

type Group = "rent" | "residents" | "charges" | "equipments" | "amenities" | "rules";
export type TermField = readonly [key: string, label: string, locked?: boolean, hint?: string];
const text = (v: unknown) => String(v ?? "");
const methodLabels: Record<string,string> = {PER_MONTH:"Tháng",PER_PERSON_MONTH:"Người / tháng",PER_VEHICLE_MONTH:"Xe / tháng",PER_KWH:"kWh",PER_M3:"m³",PER_M2_MONTH:"mét vuông / tháng",FREE:"Miễn phí",INCLUDED:"Bao gồm",NOT_APPLICABLE:"Không áp dụng"};
const feeLabels: Record<string,string> = {NONE:"Không phạt",FIXED_ONCE:"Một lần",FIXED_PER_DAY:"Mỗi ngày"};
const capacityKey=(name:unknown)=>["Số người tối đa","Số người ở tối đa"].includes(text(name))?"maxOccupants":["Số xe tối đa","Số phương tiện tối đa"].includes(text(name))?"maxVehicles":null;
const feeModeAliases:Record<string,string>={"không phạt":"NONE","một lần":"FIXED_ONCE","mỗi ngày":"FIXED_PER_DAY"};
const canonicalFeeMode=(v:unknown)=>feeModeAliases[text(v).trim().toLowerCase()]??text(v).trim().toUpperCase();

/** Plain labels, not disabled inputs. Only the backend supplies the workflow constants. */
export function BillingSystemRuleLabels({ policies, rules, deadlineOnly=false }: {policies?:Record<string,unknown>;rules?:Record<string,unknown>;deadlineOnly?:boolean}) {
  const w=useAmendmentWorkspace();
  const p=policies??w?.values.policies??{};
  const r=(rules??w?.data?.currentTerms.billingRules??p.billingRules) as Record<string,unknown>|undefined;
  if(!r)return <p className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">Mốc thanh toán và giới hạn phạt do hệ thống quản lý, không phải nội dung chủ nhà được chỉnh. Lưu/tải lại bản nháp để nhận mô tả quy trình hiện hành.</p>;
  const mode=canonicalFeeMode(p.latePaymentFeeMode),amount=Number(p.latePaymentFeeAmount??0),days=Number(r.maximumPenaltyDays);
  const valid=mode==="NONE"||["FIXED_ONCE","FIXED_PER_DAY"].includes(mode)&&Number.isSafeInteger(amount)&&amount>0&&amount<=1_000_000_000;
  const maximum=mode==="NONE"?0:mode==="FIXED_PER_DAY"?amount*days:amount;
  const original=w?.data?.currentTerms.policies;
  const changed=original&&(canonicalFeeMode(original.latePaymentFeeMode)!==mode||Number(original.latePaymentFeeAmount??0)!==amount);
  const legacy=!changed&&(Number(p.latePaymentFeeGraceDays??0)>Number(r.lateFeeGraceDays)||Number(p.latePaymentFeeCap??0)>0&&Number(p.latePaymentFeeCap)<maximum);
  const money=(value:number)=>new Intl.NumberFormat("vi-VN").format(value)+" đ";
  return <aside data-contract-field-state="readonly" aria-label={deadlineOnly?"Hạn thanh toán do hệ thống quản lý":"Quy tắc phạt do hệ thống quản lý"} className="space-y-3 rounded-xl border bg-muted/30 p-3 text-xs text-foreground">
    <p className="font-semibold">Quy tắc hệ thống · Không chỉnh sửa</p>
    {deadlineOnly?<><dl className="space-y-1"><dt className="text-muted-foreground">Thời gian thanh toán</dt><dd className="font-medium">{String(r.paymentWindowDays)} ngày lịch, tính cả ngày chốt kỳ</dd></dl><p className="text-muted-foreground">Hệ thống lấy ngày chốt kỳ cộng {String(r.paymentDueOffsetDays)} ngày để tính hạn 23:59. Đây không phải ngày kết thúc toàn bộ hợp đồng. Hạn cụ thể hiển thị trên hóa đơn.</p></>:<>
      <p className="text-muted-foreground">Chủ nhà chỉ chọn cách tính và mức phí. Các mốc dưới đây được đưa tự động vào Word, không phải ô cần nhập hay đề xuất thay đổi.</p>
      <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-muted-foreground">Bắt đầu tính phạt</dt><dd className="mt-1 font-medium">{legacy&&Number(p.latePaymentFeeGraceDays)>0?`Theo bản ký cũ: sau ${Number(p.latePaymentFeeGraceDays)} ngày ân hạn`:"Từ ngày đầu tiên sau hạn thanh toán; không cộng thêm ngày ân hạn"}</dd></div><div><dt className="text-muted-foreground">Giới hạn tính phạt mỗi hóa đơn</dt><dd className="mt-1 font-medium">{mode==="NONE"?"Không áp dụng phí phạt":mode==="FIXED_ONCE"?"Chỉ thu một lần, không nhân số ngày":`Tối đa ${String(r.maximumPenaltyDays)} ngày tính phạt`}</dd></div><div><dt className="text-muted-foreground">Tổng phí phạt tối đa · Hệ thống tính</dt><dd className="mt-1 font-semibold">{valid?money(legacy?Math.min(maximum,Number(p.latePaymentFeeCap)||maximum):maximum):"Nhập cách tính và mức phí hợp lệ"}</dd>{valid&&mode==="FIXED_PER_DAY"&&<p className="mt-1 text-muted-foreground">{money(amount)}/ngày × {days} ngày = {money(maximum)}</p>}</div><div><dt className="text-muted-foreground">Mốc xử lý quá hạn</dt><dd className="mt-1 font-medium">Sau hết {String(r.overdueActionDays)} ngày quá hạn: mở các phương án xử lý. Sau hết {String(r.maximumPenaltyDays)} ngày: chốt công nợ theo điều kiện hệ thống, không tự chấm dứt.</dd></div></dl>
      {legacy&&<p className="text-amber-800">Bản ký cũ có {Number(p.latePaymentFeeGraceDays??0)} ngày ân hạn hoặc trần tiền thấp hơn; tiếp tục giữ đúng điều khoản cũ nếu chưa đổi phí. Khi đề nghị đổi cách tính/mức phí, hệ thống tính lại giới hạn theo quy tắc trên cho phụ lục mới.</p>}
      <p className="text-muted-foreground">Đây là mức tối đa, không phải phí luôn phải trả. Phí thực tế tùy số ngày trễ và trạng thái thanh toán/đối soát/gia hạn.</p>
    </>}
  </aside>;
}
export function ContractTermFields({ group, fields }: {group:"landlord"|"tenant"|"property"|"lease"|"financial"|"policies";fields:readonly TermField[]}) {
  const w = useAmendmentWorkspace();
  if (!w?.editing) return null;
  const values = w.values[group] ?? {};
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2">{fields.map(([key,label,locked,hint]) => {
    const date = key.endsWith("DateText"), numeric = amendmentNumbers[key], area = group === "property" && key === "areaText";
    const raw = text(values[key]);
    const value = date ? amendmentDateInput(raw) : area ? raw.replace(/\s*(m²|m2|mét vuông)\s*$/i, "") : key === "unitNumber" ? raw || "Toàn bộ căn" : key === "latePaymentFeeMode" ? feeLabels[raw] ?? raw : squareMetresText(raw);
    return <ContractEditField key={key} group={group} field={key} readonly={locked}><label className="block min-w-0 text-xs font-medium">{label}
      <input type={date ? "date" : numeric || area ? "number" : "text"} {...numeric} min={area ? 0.01 : numeric?.min} step={area ? "any" : numeric?.step} aria-label={label} maxLength={2000} disabled={w.busy || locked} value={value}
        onChange={e => {
          const features=group==="property" && ["maxOccupants","maxVehicles"].includes(key) && Array.isArray(values.features)
            ? {features:(values.features as TermRow[]).map(row=>capacityKey(row.featureName)===key?{...row,featureValue:e.target.value+(key==="maxOccupants"?" người":" xe")}:row)}:{};
          const entered = date ? amendmentDateText(e.target.value) : area ? (e.target.value ? e.target.value + " mét vuông" : "") : e.target.value;
          w.patch(group,{...values,...(group==="lease" ? amendmentLeasePatch(values,key,entered) : {[key]:entered}),...features});
        }} className={input} />
      {(hint || locked) && <span className="mt-1 block font-normal text-muted-foreground">{hint ?? "Giữ nguyên dữ liệu đã xác nhận; không ghi đè lịch sử."}</span>}
    </label></ContractEditField>})}</div>;
}
export function PropertyFeaturesEditor() {
  const w=useAmendmentWorkspace();if(!w?.editing)return null;
  const rows=Array.isArray(w.values.property.features)?w.values.property.features as TermRow[]:[];
  const update=(next:TermRow[],field?:TermRow)=>w.patch("property",{...w.values.property,...field,features:next});
  return <div className="min-w-0 space-y-2"><h4 className="text-xs font-semibold">Bảng đặc điểm tài sản</h4><p className="text-xs text-muted-foreground">Sửa giá trị từng đặc điểm. Danh sách đặc điểm cố định, không thêm hoặc xóa hàng.</p><div className="max-w-full overflow-x-auto rounded-xl border"><table className="w-full min-w-[360px] text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-3">Đặc điểm</th><th className="p-3">Giá trị</th></tr></thead><tbody>{rows.map((r,i)=>{
    const displayed=contractPropertyFeatureValue(r.featureName,r.featureValue), numeric=numericPropertyFeature(r.featureName,displayed);
    return <tr key={i} className="border-t"><th scope="row" className="p-3 font-medium">{text(r.featureName)}</th><td className="p-2"><ContractEditField group="property" field="featureValue" index={i}><div className="flex items-center gap-2"><input type={numeric?"number":"text"} min={numeric?.min} step={numeric?.step} disabled={w.busy} aria-label={"Giá trị đặc điểm "+(i+1)} value={numeric?.value??squareMetresText(displayed)} maxLength={1000} onChange={e=>update(rows.map((a,j)=>j===i?{...a,featureValue:e.target.value+(numeric&&e.target.value?" "+numeric.unit:"")}:a),capacityKey(r.featureName)?{[capacityKey(r.featureName)!]:e.target.value}:undefined)} className={input}/>{numeric&&<span className="shrink-0 text-muted-foreground">{numeric.unit}</span>}</div></ContractEditField></td></tr>;
  })}</tbody></table></div></div>;
}
export default function InlineAmendmentFields({ group }: { group: Group }) {
  const w = useAmendmentWorkspace();
  if (!w?.editing || !w.data) return null;
  const values=w.values, base=w.data.currentTerms;
  const update=(table:"charges"|"equipments"|"amenities",index:number,key:string,value:unknown) => w.patch(table,values[table].map((row,i)=>i===index?{...row,[key]:value}:row));
  const reset=() => {
    if(group==="rent") w.patch("financial",structuredClone(base.financial));
    else if(group==="residents") w.patch("tenant",structuredClone(base.tenant));
    else if(group==="rules"){w.patch("policies",structuredClone(base.policies));w.patch("specialTerms",base.specialTerms);}
    else w.patch(group,structuredClone(base[group]));
  };
  const heading=<div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Nhập nội dung đã thỏa thuận · Chưa có hiệu lực</span><button disabled={w.busy} type="button" onClick={reset} className="inline-flex items-center gap-1 text-primary"><RotateCcw className="h-3 w-3"/>Khôi phục mục này</button></div>;
  if(group==="rent") return <div>{heading}<ContractEditField group="financial" field="amountValue"><VndMoneyInput label="Tiền thuê hàng tháng (đ)" min={1} value={values.financial.amountValue} onValueChange={value=>w.patch("financial",{...values.financial,amountValue:value})}/></ContractEditField><p className="mt-2 text-xs text-muted-foreground">Bằng chữ được tính lại từ số tiền; tiền cọc đã nhận giữ nguyên.</p></div>;
  if(group==="residents") return <ContractTermFields group="tenant" fields={[["occupantCount","Số người cư trú"],["motorbikeCount","Xe máy đăng ký"],["carCount","Ô tô đăng ký"]]}/>;
  if(group==="rules") {
    const raw=Array.isArray(values.policies.listingPolicies)?values.policies.listingPolicies as TermRow[]:[];
    const rows=Array.isArray(values.policies.listingPolicies)?raw:Object.entries(values.policies).filter(([k,v])=>["petPolicy","smokingPolicy","subleasePolicy","overnightGuestPolicy","propertyInspectionNotice","depositRefundDays","noticeDaysBeforeTermination"].includes(k)&&v!==undefined).map(([code,value])=>({code,label:code,displayValue:text(value),value}));
    const change=(index:number,key:string,value:string) => w.patch("policies",{...values.policies,listingPolicies:rows.map((r,i)=>i===index?{...r,[key]:value,...(key==="displayValue"?{value,valueType:["depositRefundDays","noticeDaysBeforeTermination","propertyInspectionNotice"].includes(text(r.code))?"INTEGER":"TEXT",note:""}:{})}:r)});
    return <div className="min-w-0 space-y-4">{heading}<div className="max-w-full overflow-x-auto rounded-xl border"><table className="w-full min-w-[420px] text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-3">Chính sách</th><th className="p-3">Quy định áp dụng</th><th className="w-12 p-3">Xóa</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t align-top"><td className="p-2"><ContractEditField group="policies" field="label" index={i}><input aria-label={"Tên chính sách "+(i+1)} value={text(r.label)} onChange={e=>change(i,"label",e.target.value)} className={input} maxLength={150}/></ContractEditField></td><td className="p-2"><ContractEditField group="policies" field="displayValue" index={i}>{["depositRefundDays","noticeDaysBeforeTermination","propertyInspectionNotice"].includes(text(r.code))?<input type="number" aria-label={text(r.label)} min={r.code==="depositRefundDays"?1:0} max={r.code==="propertyInspectionNotice"?168:180} step={1} value={text(r.value)} onChange={e=>change(i,"displayValue",e.target.value)} disabled={w.busy} className={input}/>:<textarea aria-label={text(r.label)} rows={2} value={text(r.displayValue??r.value)} onChange={e=>change(i,"displayValue",e.target.value)} disabled={w.busy} className={input} maxLength={2000}/>}</ContractEditField>{["depositRefundDays","noticeDaysBeforeTermination","propertyInspectionNotice"].includes(text(r.code))&&<span className="text-muted-foreground">Nhập số nguyên theo đơn vị giờ/ngày của chính sách.</span>}</td><td className="p-2"><button type="button" disabled={w.busy || ["depositRefundDays","noticeDaysBeforeTermination","propertyInspectionNotice"].includes(text(r.code))} aria-label={"Xóa chính sách "+(i+1)} onClick={()=>w.patch("policies",{...values.policies,listingPolicies:rows.filter((_,j)=>j!==i)})} className="mt-2 rounded-lg border p-2 text-rose-600 disabled:opacity-40"><Minus className="h-4 w-4"/></button></td></tr>)}</tbody></table></div>
      <button type="button" disabled={w.busy||rows.length>=50} onClick={()=>w.patch("policies",{...values.policies,listingPolicies:[...rows,{code:"custom_"+crypto.randomUUID().replaceAll("-",""),label:"",valueType:"TEXT",value:"",displayValue:"",note:""}]})} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Plus className="h-4 w-4"/>Thêm chính sách</button>
      <ContractEditField group="policies" field="latePaymentFeeMode"><label className="block text-xs font-medium">Cách tính phí chậm trả
        <select aria-label="Cách tính phí chậm trả" disabled={w.busy} value={canonicalFeeMode(values.policies.latePaymentFeeMode)||"NONE"}
          onChange={e=>w.patch("policies",{...values.policies,latePaymentFeeMode:e.target.value,...(e.target.value==="NONE"?{latePaymentFeeAmount:"0"}:{})})} className={input}>
          {Object.entries(feeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
        <span className="mt-1 block font-normal text-muted-foreground">Phụ lục phải được hai bên ký đủ và đến kỳ áp dụng. Không tính lại phí của hóa đơn đã phát hành.</span>
      </label></ContractEditField>
      <ContractEditField group="policies" field="latePaymentFeeAmount" readonly={canonicalFeeMode(values.policies.latePaymentFeeMode)==="NONE"}><VndMoneyInput label="Mức phí chậm trả (đ)" min={canonicalFeeMode(values.policies.latePaymentFeeMode)==="NONE"?0:1} disabled={w.busy||canonicalFeeMode(values.policies.latePaymentFeeMode)==="NONE"} value={values.policies.latePaymentFeeAmount} onValueChange={v=>w.patch("policies",{...values.policies,latePaymentFeeAmount:v})}/></ContractEditField>
      <BillingSystemRuleLabels />
      {values.systemTerms&&<div aria-label="Điều khoản quy trình hệ thống không chỉnh sửa" className="space-y-2 rounded-xl border bg-muted/30 p-3 text-xs"><p className="font-semibold">Quy trình xử lý quá hạn · Nhãn chỉ đọc</p><p className="whitespace-pre-wrap text-muted-foreground">{values.systemTerms}</p><p>Hệ thống tự giữ nội dung này trong Word. Ô bên dưới chỉ dành cho thỏa thuận bổ sung của hai bên.</p></div>}
      <ContractEditField group="specialTerms"><label className="block text-xs font-medium">Điều khoản thỏa thuận khác<textarea aria-label="Điều khoản thỏa thuận khác" rows={6} maxLength={8000} value={values.specialTerms} onChange={e=>w.patch("specialTerms",e.target.value)} className={input}/></label></ContractEditField>
    </div>;
  }
  const columns=group==="charges"?[["name","Khoản phí"],["unitAmount","Đơn giá (đ)"],["billingMethod","Cách tính"],["note","Ghi chú"]]:group==="equipments"?[["name","Tên tài sản"],["quantity","Số lượng"],["condition","Hiện trạng"],["note","Ghi chú"]]:[["name","Tiện ích"]];
  const rows=values[group];
  return <div className="min-w-0 space-y-3">{heading}
    <div className="max-w-full overflow-x-auto rounded-xl border"><table className="w-full min-w-[680px] table-fixed text-left text-xs"><thead className="bg-muted/40"><tr>{columns.map(([key,label])=><th key={key} className="p-3">{label}</th>)}<th className="w-14 p-3">Xóa</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t align-top">{columns.map(([key,label])=><td key={key} className="min-w-0 p-2"><ContractEditField group={group} field={key} index={i}>{key==="unitAmount"?<VndMoneyInput ariaLabel={"Đơn giá "+text(r.name)+" (đ)"} value={r.unitAmount} onValueChange={v=>w.patch(group,rows.map((row,j)=>j===i?{...row,[key]:v,includedInRent:false}:row))}/>:<input type={key==="quantity"?"number":"text"} min={key==="quantity"?1:undefined} max={key==="quantity"?1000:undefined} step={key==="quantity"?1:undefined} aria-label={label+" "+(i+1)} value={key==="billingMethod"?r.includedInRent?"Bao gồm":text(r[key])==="PER_VEHICLE_MONTH"?(r.chargeType==="CAR_PARKING"?"Ô tô / tháng":"Xe máy / tháng"):methodLabels[text(r[key])]??text(r[key]):text(r[key])} onChange={e=>key==="billingMethod"?w.patch(group,rows.map((row,j)=>j===i?{...row,[key]:e.target.value,includedInRent:false}:row)):update(group,i,key,e.target.value)} maxLength={key==="name"?150:1000} disabled={w.busy} className={input}/>}</ContractEditField></td>)}<td className="p-2"><button type="button" disabled={w.busy} aria-label={"Xóa dòng "+group+" "+(i+1)} onClick={()=>w.patch(group,rows.filter((_,j)=>j!==i))} className="mt-2 rounded-lg border p-2 text-rose-600"><Minus className="h-4 w-4"/></button></td></tr>)}</tbody></table></div>
    <button disabled={w.busy||rows.length>=50} type="button" onClick={()=>w.patch(group,[...rows,group==="charges"?{name:"",chargeType:"OTHER",billingMethod:"PER_MONTH",unitAmount:"0",includedInRent:false,note:""}:group==="equipments"?{name:"",quantity:1,condition:"",note:""}:{code:"CUSTOM_"+crypto.randomUUID(),name:"",sourceType:"AGREED_AMENDMENT"}])} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Plus className="h-4 w-4"/>{"Thêm dòng "+(group==="charges"?"phí":group==="equipments"?"nội thất":"tiện ích")}</button>
    {group==="charges"&&<p className="text-xs text-muted-foreground">Nhập cách tính: Tháng, Người / tháng, Xe máy / tháng, Ô tô / tháng, kWh, m³, mét vuông / tháng, Miễn phí, Bao gồm hoặc Không áp dụng. Hệ thống tính lại tổng tiền khi đối chiếu.</p>}
  </div>;
}
