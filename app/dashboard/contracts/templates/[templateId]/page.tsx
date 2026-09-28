"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { contractService } from "@/services/contract.service";
import type { ContractTemplateResponse } from "@/types/contract.type";
import { CATEGORY_NAMES } from "@/types/contract.type";

export default function ContractTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<ContractTemplateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    contractService.listSystemTemplates()
      .then((items) => { if (!cancelled) setTemplate(items.find((item) => item.id === templateId) ?? null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [templateId]);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/dashboard/contracts/templates" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Mẫu hợp đồng</Link>
      {loading ? <p className="text-sm text-muted-foreground">Đang tải thông tin mẫu...</p> : !template ? (
        <p className="rounded-xl border border-border p-6 text-sm">Mẫu này không còn được HomeSpace phát hành. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <ShieldCheck className="h-7 w-7 text-emerald-600" />
          <h1 className="mt-3 text-2xl font-bold">{template.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{template.description || "Mẫu hợp đồng chuẩn do HomeSpace phát hành."}</p>
          <p className="mt-4 text-sm">Loại bất động sản: <strong>{template.category ? CATEGORY_NAMES[template.category] : "Không xác định"}</strong></p>
          <p className="mt-2 text-sm text-emerald-700">Mẫu được tự động áp dụng khi tạo hợp đồng phù hợp; chủ nhà không cần tải lên hoặc lựa chọn mẫu.</p>
        </div>
      )}
    </div>
  );
}
