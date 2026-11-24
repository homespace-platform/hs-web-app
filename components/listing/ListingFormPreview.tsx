"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import RentDetailView from "@/components/rent/RentDetailView";
import { buildListingPreview, type ListingPreviewExtras } from "@/lib/listing-form-preview";
import type { BuildPayloadParams } from "@/app/dashboard/properties/new/utils/buildListingPayload";

type Props = {
  params: BuildPayloadParams;
  branchName?: string | null;
  mode: "create" | "edit";
} & Pick<ListingPreviewExtras, "address" | "amenityLabels" | "policyDefinitions" | "owner">;

const MODE_HINT = {
  create: "Kiểm tra lại thông tin trước khi gửi. Tin chỉ được đăng sau khi bạn gửi.",
  edit: "Đây là nội dung sau khi chỉnh sửa; thay đổi chỉ có hiệu lực sau khi bạn lưu.",
};

export default function ListingFormPreview({ params, branchName, mode, address, amenityLabels, policyDefinitions, owner }: Props) {
  const { images, videos } = params.basicInfo;
  const [urls, setUrls] = useState<Map<File, string>>(new Map());
  // Chỉ file cục bộ chưa có URL mới cần object URL; revoke khi danh sách đổi hoặc unmount.
  useEffect(() => {
    const files = [...images.filter((i) => !i.dataUrl).map((i) => i.file), ...videos.filter((v) => !v.url).map((v) => v.file)];
    const map = new Map<File, string>();
    for (const f of files) if (f) map.set(f, URL.createObjectURL(f));
    setUrls(map);
    return () => map.forEach((u) => URL.revokeObjectURL(u));
  }, [images, videos]);

  const preview = useMemo(
    () => buildListingPreview(params, { address, amenityLabels, policyDefinitions, owner, branchName, fileToUrl: (f) => urls.get(f) ?? "" }),
    [params, branchName, address, amenityLabels, policyDefinitions, owner, urls],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-foreground">Xem trước tin đăng</h2>
          <p className="text-sm text-muted-foreground">Đây là cách người thuê sẽ thấy tin của bạn.</p>
          <p className="mt-1 text-xs text-muted-foreground">{MODE_HINT[mode]}</p>
        </div>
      </div>
      <RentDetailView property={preview} previewMode showLandlordContact={false} />
    </div>
  );
}
