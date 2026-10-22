"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import VietmapAddressPicker from "@/components/address/VietmapAddressPicker";
import AddressMapPreview from "@/components/address/AddressMapPreview";
import type { VietmapAddress } from "@/services/vietmap.service";
import userService from "@/services/user.service";
import type { UserAddress } from "@/types/user.type";

type Props = { initialAddress?: UserAddress | null; onSaved?: () => Promise<void> | void; embedded?: boolean; saveButtonLabel?: string; alwaysAllowSave?: boolean };
export default function AddressEditor({ initialAddress, onSaved, embedded = false, saveButtonLabel = "Lưu địa chỉ", alwaysAllowSave = false }: Props) {
  const [selected, setSelected] = useState<VietmapAddress | null>(initialAddress ?? null);
  const [note, setNote] = useState(initialAddress?.addressNote ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setSelected(initialAddress ?? null); setNote(initialAddress?.addressNote ?? ""); setDirty(false); }, [initialAddress]);
  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const saved = await userService.saveAddress({ refId: selected.refId, addressNote: note.trim() || undefined });
      setSelected(saved);
      setNote(saved.addressNote ?? "");
      setDirty(false);
      if (!embedded) toast.success("Đã lưu địa chỉ.");
      await onSaved?.();
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.message : null;
      toast.error(typeof detail === "string" ? detail : "Không thể lưu địa chỉ. Vui lòng thử lại.");
    } finally { setSaving(false); }
  }
  return <section className={embedded ? "space-y-4" : "space-y-4 rounded-2xl border border-border bg-card p-5"}>
    <h4 className="text-sm font-bold">Địa chỉ hiện tại</h4>
    <VietmapAddressPicker value={selected} disabled={saving} onChange={value => { setSelected(value); setDirty(true); }} />
    <label className="block text-sm">Thông tin bổ sung (căn/phòng, tầng…)
      <input value={note} disabled={saving} maxLength={255} onChange={e => { setNote(e.target.value); setDirty(true); }} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm" />
    </label>
    <button type="button" disabled={saving || !selected || (!alwaysAllowSave && !dirty && Boolean(initialAddress))}
      onClick={() => void save()} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
      {saving ? "Đang lưu…" : saveButtonLabel}
    </button>
    <AddressMapPreview latitude={selected?.latitude} longitude={selected?.longitude} />
  </section>;
}
