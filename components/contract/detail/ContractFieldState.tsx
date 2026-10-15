"use client";

import type { ReactNode } from "react";
import type { AmendmentTerms } from "@/types/contract-amendment.type";
import { amendmentFieldChanged, fieldStateClass, fieldStateText } from "@/lib/contract-field-state";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";

export function ContractEditField({group,field,index,readonly=false,changed:explicitChanged,children}:{group:keyof AmendmentTerms;field?:string;index?:number;readonly?:boolean;changed?:boolean;children:ReactNode}) {
  const w=useAmendmentWorkspace();
  const changed=explicitChanged??Boolean(w?.editing&&w.editBaseline&&amendmentFieldChanged(w.editBaseline,w.values,group,field,index));
  const state=readonly?"readonly":changed?"changed":"editable";
  const controls=state==="changed"?"[&_input]:text-green-700! [&_textarea]:text-green-700! [&_select]:text-green-700! dark:[&_input]:text-green-400! dark:[&_textarea]:text-green-400! dark:[&_select]:text-green-400!"
    :state==="editable"?"[&_input]:text-blue-700! [&_textarea]:text-blue-700! [&_select]:text-blue-700! dark:[&_input]:text-blue-400! dark:[&_textarea]:text-blue-400! dark:[&_select]:text-blue-400!":"[&_input]:text-foreground! [&_textarea]:text-foreground! [&_select]:text-foreground!";
  return <div data-contract-field-state={state} title={fieldStateText[state]} className={`min-w-0 ${controls}`}>
    {children}{state==="changed"&&<span className={`mt-1 block text-[10px] font-medium ${fieldStateClass.changed}`}>Đã sửa</span>}
  </div>;
}
export function ContractFieldLegend() {
  return <aside aria-label="Chú thích màu trường hợp đồng" className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border bg-card px-4 py-3 text-xs">
    <span className={fieldStateClass.editable}>● Có thể điều chỉnh qua phụ lục</span>
    <span className={fieldStateClass.readonly}>● Chỉ đọc / Hệ thống tự tính</span>
    <span className={fieldStateClass.changed}>● Đã sửa trong bản đang soạn</span>
    <p className="w-full text-muted-foreground">Xanh lá là nội dung đã sửa, chưa có nghĩa là đã áp dụng. Sửa lại đúng giá trị ban đầu sẽ trở về xanh dương; xóa dòng không làm đổi màu các dòng còn lại.</p>
  </aside>;
}
