import { buildCreateListingPayload, type BuildPayloadParams } from "@/app/dashboard/properties/new/utils/buildListingPayload";
import { HANDOVER_CONDITIONS } from "@/app/dashboard/properties/new/constants";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { policyPermissions } from "@/types/listing-policy.type";
import type { ListingPolicyDefinition, ListingPolicyValue } from "@/types/listing-policy.type";
import type { ListingDetailResponse, ListingMediaResponse } from "@/types/listing.type";
import type { RentPropertyItem } from "@/types/rent.type";

export interface ListingPreviewExtras {
  /** Địa chỉ đã chọn trong form (form chỉ giữ refId nên cần truyền thêm để hiển thị). */
  address?: ListingDetailResponse["address"];
  /** code -> tên tiện ích trong danh mục; thiếu thì hiển thị chính giá trị đã chọn. */
  amenityLabels?: Record<string, string>;
  policyDefinitions?: ListingPolicyDefinition[];
  branchName?: string | null;
  owner?: ListingDetailResponse["owner"];
  /** Tạo URL tạm cho file cục bộ (component sẽ revoke khi unmount). */
  fileToUrl?: (file: File) => string;
}

function previewPolicies(params: BuildPayloadParams, defs: ListingPolicyDefinition[] = []): ListingPolicyValue[] {
  return (params.policies ?? [])
    .filter((p) => p.value?.trim())
    .map((p) => {
      const def = defs.find((d) => d.code === p.code);
      const choice = def?.choices?.find((c) => c.value === p.value)?.label;
      const permission = policyPermissions.find((x) => x.value === p.value)?.label;
      const base = p.note?.trim() ? `${choice ?? permission ?? p.value}\n${p.note.trim()}` : (choice ?? permission ?? p.value);
      const unit = !choice && !permission && def?.unitLabel ? ` ${def.unitLabel}` : "";
      return {
        valueType: "TEXT", required: false, sortOrder: 0, label: p.code, ...def,
        code: p.code, value: p.value, note: p.note, displayValue: base + unit,
      } as ListingPolicyValue;
    });
}

/** Dựng RentPropertyItem từ state form, đi qua toRentProperty để nhãn/định dạng giống trang công khai. */
export function buildListingPreview(params: BuildPayloadParams, extras: ListingPreviewExtras = {}): RentPropertyItem {
  const req = buildCreateListingPayload(params);
  const now = new Date().toISOString();
  const toUrl = (file?: File) => (file && extras.fileToUrl ? extras.fileToUrl(file) : "");

  const media: ListingMediaResponse[] = [
    ...params.basicInfo.images.map((img) => ({ type: "IMAGE" as const, url: img.dataUrl || toUrl(img.file) })),
    ...params.basicInfo.videos.map((vid) => ({ type: "VIDEO" as const, url: vid.url || toUrl(vid.file) })),
  ]
    .filter((m) => m.url)
    .map((m, i) => ({
      id: `preview-${i}`, storageObjectId: "", mediaType: m.type, sortOrder: i, cover: i === 0,
      url: m.url, contentType: "", sizeBytes: 0,
    }));

  const labels = extras.amenityLabels ?? {};
  const furnishingLabel = (c: string) => HANDOVER_CONDITIONS.find((h) => h.value === c)?.label ?? "";

  const listing = {
    ...req,
    id: "preview",
    slug: null,
    ownerId: extras.owner?.id ?? "",
    branchName: extras.branchName ?? null,
    status: "DRAFT",
    description: req.description ?? "",
    pricing: req.pricing,
    amenities: (req.amenityCodes ?? []).map((code, i) => ({ code, name: labels[code] ?? code, sortOrder: i })),
    customAmenities: req.customAmenities ?? [],
    furnishings: (req.furnishings ?? [])
      .filter((f) => f.assetName)
      .map((f, i) => ({
        index: i + 1, itemCode: f.itemCode, assetName: f.assetName, quantity: f.quantity,
        handoverCondition: f.handoverCondition, handoverConditionLabel: furnishingLabel(f.handoverCondition),
        conditionNote: f.conditionNote,
        conditionText: furnishingLabel(f.handoverCondition) + (f.conditionNote ? ` (${f.conditionNote})` : ""),
      })),
    address:
      extras.address ??
      ({ display: params.addressNote?.trim() || "Chưa chọn địa chỉ", street: "", address: "", city: "", cityId: "", ward: "", wardId: "", refId: "", latitude: 0, longitude: 0 } as ListingDetailResponse["address"]),
    owner: extras.owner ?? { id: "", displayName: "Bạn", phone: null, avatarUrl: null },
    media,
    policies: previewPolicies(params, extras.policyDefinitions),
    viewingDays: req.viewingDays ?? [],
    viewingSlots: req.viewingSlots ?? [],
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  } as unknown as ListingDetailResponse;

  const property = toRentProperty(listing);
  // Video cục bộ (blob:/data:) không đi qua proxy /api/video được.
  const direct = (url: string) => /^(blob|data):/.test(url);
  const fix = <T extends { url: string; streamUrl?: string }>(v: T): T => (direct(v.url) ? { ...v, streamUrl: v.url } : v);
  return {
    ...property,
    videos: property.videos?.map(fix),
    mediaItems: property.mediaItems?.map(fix),
  };
}
