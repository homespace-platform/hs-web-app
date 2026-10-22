"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ContractCompletenessResponse } from "@/types/contract.type";
import type { InitialMeterField } from "@/lib/contract-initial-meters";

export default function ContractMissingFieldsNotice({ completeness, isLandlord, meterFields = [] }: {
  completeness: ContractCompletenessResponse | null;
  isLandlord: boolean;
  meterFields?: InitialMeterField[];
}) {
  const incomplete = completeness && !completeness.complete ? completeness : null;
  const hasMeterEditor = meterFields.length > 0;
  if (!incomplete && !hasMeterEditor) return null;
  const fields = incomplete?.missingFields ?? [];
  // Meter labels already appear directly on their inputs. List other missing data without repeating them.
  const listedFields = hasMeterEditor
    ? fields.filter(field => !["meters.electricityInitial", "meters.waterInitial"].includes(field.key))
    : fields;
  const missingCount = fields.length || meterFields.length;

  return <div role="status" data-contract-missing-fields
    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="min-w-0 space-y-1 text-amber-900 dark:text-amber-200">
        <p className="text-sm font-bold">Hợp đồng còn {missingCount} thông tin bắt buộc chưa có dữ liệu</p>
        {incomplete && <p className="text-xs">Đã điền {incomplete.filledFields}/{incomplete.totalFields} trường.</p>}
        <p className="text-xs leading-relaxed">{hasMeterEditor
          ? isLandlord
            ? "Vui lòng nhập chỉ số thực tế vào các ô bên dưới và bấm Lưu chỉ số trước khi kết xuất, ký hợp đồng. Số 0 là hợp lệ. Sau khi lưu đủ chỉ số bắt buộc, mục này sẽ trở về vị trí cũ trong nội dung hợp đồng."
            : "Chủ nhà cần bổ sung và lưu chỉ số công tơ ban đầu trước khi kết xuất, ký hợp đồng. Người thuê vui lòng kiểm tra chỉ số thực tế cùng chủ nhà."
          : "Vui lòng bổ sung thông tin còn thiếu trước khi kết xuất và gửi hợp đồng."}</p>
        {listedFields.length > 0 && <>
          {hasMeterEditor && <p className="pt-1 text-xs font-semibold">Thông tin khác cần bổ sung:</p>}
          <ul className="text-[11px] list-disc pl-4 space-y-0.5 pt-1">
            {listedFields.slice(0, 6).map(field => <li key={field.key}>{field.label}</li>)}
            {listedFields.length > 6 && <li>… và {listedFields.length - 6} trường khác</li>}
          </ul>
        </>}
        {isLandlord && fields.some(field => field.key === "landlord.permanentAddress") && <Link href="/settings/profile"
          className="inline-flex text-xs font-semibold underline underline-offset-2 pt-1">
          Cập nhật nơi thường trú trong hồ sơ cá nhân
        </Link>}
      </div>
    </div>
  </div>;
}
