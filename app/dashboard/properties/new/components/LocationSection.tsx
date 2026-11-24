import VietmapAddressPicker from "@/components/address/VietmapAddressPicker";
import type { VietmapAddress } from "@/services/vietmap.service";
import type { UserAddress } from "@/types/user.type";
import type { FormErrors } from "../types";
import FormSectionWrapper from "./FormSectionWrapper";
import { PolicyNotice } from "@/components/common/PolicyDialog";
export type AddressMode = "saved" | "new";
type Props = { addressMode: AddressMode; savedUserAddress: UserAddress | null; value: VietmapAddress | null;
  errors: FormErrors; isBranchSelected?: boolean; onAddressModeChange: (mode: AddressMode) => void;
  onChange: (value: VietmapAddress | null) => void };
export default function LocationSection({ addressMode, savedUserAddress, value, errors, isBranchSelected = false, onAddressModeChange, onChange }: Props) {
  return <FormSectionWrapper id="section-location" stepNumber={6} title="Vị trí" description="Chọn địa chỉ từ Vietmap.">
    <div id="field-street-line" className="space-y-4">
      {!isBranchSelected && <div className="flex flex-wrap gap-2">
        {savedUserAddress && <button type="button" onClick={() => onAddressModeChange("saved")} className={addressMode === "saved" ? "min-h-11 rounded-xl border border-primary px-4 text-sm font-semibold text-primary" : "min-h-11 rounded-xl border px-4 text-sm"}>Dùng địa chỉ hồ sơ</button>}
        <button type="button" onClick={() => onAddressModeChange("new")} className={addressMode === "new" ? "min-h-11 rounded-xl border border-primary px-4 text-sm font-semibold text-primary" : "min-h-11 rounded-xl border px-4 text-sm"}>Chọn địa chỉ mới</button>
      </div>}
      {addressMode === "saved" && savedUserAddress && !isBranchSelected
        ? <div className="rounded-xl border p-4 text-sm"><p>{savedUserAddress.display}</p><PolicyNotice className="mt-3" title="Địa chỉ của tin đăng" summary="Địa chỉ được sao chép riêng cho tin đăng." text="Địa chỉ được sao chép riêng cho tin đăng, không liên kết thay đổi với địa chỉ hồ sơ." /></div>
        : <VietmapAddressPicker value={value} disabled={isBranchSelected} onChange={onChange} />}
      {isBranchSelected && <p className="text-sm text-muted-foreground">Địa chỉ theo chi nhánh đã chọn.</p>}
      {errors.streetLine && <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-destructive">{errors.streetLine}</p>}
    </div>
  </FormSectionWrapper>;
}
