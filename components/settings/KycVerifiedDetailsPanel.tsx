"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import kycService from "@/services/kyc.service";
import type { KycVerifiedDetails } from "@/types/kyc.type";

const checks: { key: keyof KycVerifiedDetails; label: string }[] = [
  { key: "documentValid", label: "Loại giấy tờ hợp lệ" },
  { key: "frontBackIdentical", label: "Mặt trước và sau khớp" },
  { key: "clearCorners", label: "Ảnh rõ, đủ góc" },
  { key: "idQualityGood", label: "Chất lượng số định danh" },
  { key: "issueDateQualityGood", label: "Ngày cấp rõ nét" },
  { key: "unexpired", label: "Giấy tờ còn hạn" },
  { key: "liveDocument", label: "Giấy tờ chụp trực tiếp" },
  { key: "noWarnings", label: "Không có cảnh báo" },
  { key: "noOverlayImage", label: "Không ghép ảnh" },
  { key: "eyesOpen", label: "Mắt mở" },
  { key: "faceNotBlurred", label: "Khuôn mặt rõ nét" },
  { key: "faceValid", label: "Khuôn mặt hợp lệ" },
  { key: "faceNotCovered", label: "Khuôn mặt không bị che" },
];

export default function KycVerifiedDetailsPanel({ cccd, verified }: {
  cccd?: string | null;
  verified: boolean;
}) {
  const [details, setDetails] = useState<KycVerifiedDetails | null>(null);
  const [loading, setLoading] = useState(verified);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!verified) return;
    let active = true;
    kycService.getVerifiedDetails().then(result => {
      if (active) setDetails(result);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [verified]);

  const fields: [string, string | null][] = details ? [
    ["Họ và tên trên CCCD", details.fullName], ["Ngày sinh", details.birthDate],
    ["Nơi thường trú", details.permanentAddress], ["Giới tính", details.gender],
    ["Ngày cấp", details.issueDate], ["Ngày hết hạn", details.expirationDate],
    ["Nơi cấp", details.issuePlace],
    ["Độ khớp khuôn mặt", details.faceMatchPercent == null ? null : `${details.faceMatchPercent.toFixed(2)}%`],
  ] : [];

  return <section className="rounded-2xl border border-border bg-card p-4 shadow-2xs sm:p-5 space-y-4">
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><BadgeCheck className="h-4 w-4 text-primary" />Thông tin xác thực KYC</h3>
      <p className="mt-1 text-xs text-muted-foreground">Kết quả do hệ thống xác nhận; các trường này không chỉnh sửa trong hồ sơ cá nhân.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">CCCD</p>
        <p className="mt-1 font-mono text-xs text-foreground">{cccd || "Chưa có số CCCD"}</p>
      </div>
      {fields.map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-xs font-medium text-foreground">{value || "Chưa có dữ liệu"}</p>
      </div>)}
    </div>
    {loading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải kết quả VNPT...</p>}
    {error && <p className="text-xs text-destructive">Không tải được kết quả KYC. Vui lòng tải lại trang.</p>}
    {!loading && !error && !details && <p className="text-xs text-muted-foreground">{verified ? "Lần xác minh trước chưa lưu kết quả chi tiết từ VNPT." : "Thông tin chi tiết sẽ xuất hiện sau khi xác minh với VNPT."}</p>}
    {details && <div className="border-t border-border pt-4">
      <h4 className="mb-3 text-xs font-bold text-foreground">Kết quả kiểm tra</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map(({ key, label }) => {
          const result = details[key];
          return <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className={result === true ? "font-semibold text-emerald-700 dark:text-emerald-300" : result === false ? "font-semibold text-rose-600" : "text-muted-foreground"}>
              {result === true ? "Đạt" : result === false ? "Không đạt" : "Chưa có dữ liệu"}
            </span>
          </div>;
        })}
      </div>
    </div>}
  </section>;
}
