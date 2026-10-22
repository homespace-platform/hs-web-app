import VietmapAddressPicker from "@/components/address/VietmapAddressPicker";
import type { VietmapAddress } from "@/services/vietmap.service";
import type { UserAddress } from "@/types/user.type";
import type { FormErrors } from "../types";
import FormSectionWrapper from "./FormSectionWrapper";
export type AddressMode = "saved" | "new";
type Props = { addressMode: AddressMode; savedUserAddress: UserAddress | null; value: VietmapAddress | null;
  errors: FormErrors; isBranchSelected?: boolean; onAddressModeChange: (mode: AddressMode) => void;
  onChange: (value: VietmapAddress | null) => void };
export default function LocationSection({ addressMode, savedUserAddress, value, errors, isBranchSelected = false, onAddressModeChange, onChange }: Props) {
  return <FormSectionWrapper id="section-location" stepNumber={6} title="Vị trí" description="Chọn địa chỉ từ Vietmap để xác định đầy đủ địa chỉ và tọa độ.">
    <div id="field-street-line" className="space-y-4">
      {!isBranchSelected && <div className="flex gap-2">
        {savedUserAddress && <button type="button" onClick={() => onAddressModeChange("saved")} className={addressMode === "saved" ? "rounded-xl border border-primary p-3 text-sm text-primary" : "rounded-xl border p-3 text-sm"}>Dùng địa chỉ hồ sơ</button>}
        <button type="button" onClick={() => onAddressModeChange("new")} className={addressMode === "new" ? "rounded-xl border border-primary p-3 text-sm text-primary" : "rounded-xl border p-3 text-sm"}>Chọn địa chỉ mới</button>
      </div>}
      {addressMode === "saved" && savedUserAddress && !isBranchSelected
        ? <div className="rounded-xl border p-4 text-sm"><p>{savedUserAddress.display}</p><p className="mt-2 text-xs text-muted-foreground">Địa chỉ được sao chép riêng cho tin đăng, không liên kết thay đổi với địa chỉ hồ sơ.</p></div>
        : <VietmapAddressPicker value={value} disabled={isBranchSelected} onChange={onChange} />}
      {isBranchSelected && <p className="text-xs text-muted-foreground">Địa chỉ theo chi nhánh đã chọn.</p>}
      {errors.streetLine && <p role="alert" className="text-sm text-destructive">{errors.streetLine}</p>}
    </div>
  </FormSectionWrapper>;
}
