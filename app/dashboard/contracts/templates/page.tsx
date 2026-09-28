"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type { ContractTemplateResponse } from "@/types/contract.type";
import { CATEGORY_NAMES, CATEGORY_OPTIONS } from "@/types/contract.type";

export default function ContractTemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    contractService.listSystemTemplates()
      .then((items) => { if (!cancelled) setTemplates(items); })
      .catch(() => { if (!cancelled) toast.error("Không thể tải mẫu hợp đồng hệ thống."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileText className="h-6 w-6 text-primary" /> Mẫu hợp đồng HomeSpace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Chỉ quản trị viên phát hành mẫu. Khi tạo hợp đồng, hệ thống tự chọn mẫu phù hợp với loại tin đăng.</p>
        </div>
        <Link href="/dashboard/contracts/fields" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"><BookOpen className="h-4 w-4" /> Từ điển mã trường</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {CATEGORY_OPTIONS.map((category) => {
          const matches = templates.filter((item) => item.category === category);
          const template = matches.length === 1 ? matches[0] : null;
          return (
            <div key={category} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold">{CATEGORY_NAMES[category]}</h2>
                {template ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <FileText className="h-5 w-5 text-amber-600" />}
              </div>
              {loading ? <p className="mt-4 text-sm text-muted-foreground">Đang kiểm tra...</p> : template ? (
                <>
                  <p className="mt-4 text-sm font-medium">{template.name}</p>
                  <p className="mt-1 text-xs text-emerald-700">Đã phát hành · Tự động áp dụng</p>
                  <Link href={`/dashboard/contracts/templates/${template.id}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Xem thông tin mẫu</Link>
                </>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Chưa có mẫu được phát hành. Nếu cần tạo hợp đồng loại này, vui lòng liên hệ quản trị viên.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
