"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Check, LoaderCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/ui/searchable-select";
import AddressMapPreview from "@/components/address/AddressMapPreview";
import provinceService from "@/services/province.service";
import userService from "@/services/user.service";
import type { Province, Ward } from "@/types/province.type";
import type { UserAddress } from "@/types/user.type";

type AddressEditorProps = {
  initialAddress?: UserAddress | null;
  onSaved?: () => Promise<void> | void;
};

function codeOf(value: string | number) {
  return String(value);
}

export default function AddressEditor({ initialAddress, onSaved }: AddressEditorProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState(initialAddress?.provinceCode ?? "");
  const [wardCode, setWardCode] = useState(initialAddress?.wardCode ?? "");
  const [streetLine, setStreetLine] = useState(initialAddress?.streetLine ?? "");
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectedProvince = useMemo(
    () => provinces.find((item) => codeOf(item.code) === provinceCode),
    [provinces, provinceCode],
  );
  const selectedWard = useMemo(
    () => wards.find((item) => codeOf(item.code) === wardCode),
    [wards, wardCode],
  );

  const fullAddress = [streetLine.trim(), selectedWard?.name, selectedProvince?.name]
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingCatalog(true);
        const list = await provinceService.getProvinces();
        if (cancelled) return;
        setProvinces(list);
        if (initialAddress?.provinceCode) {
          const nextWards = await provinceService.getWardsByProvince(initialAddress.provinceCode);
          if (!cancelled) setWards(nextWards);
        }
      } catch {
        if (!cancelled) toast.error("Không thể tải danh mục tỉnh/thành.");
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialAddress?.provinceCode]);

  const handleProvinceChange = useCallback(async (code: string) => {
    setProvinceCode(code);
    setWardCode("");
    setWards([]);
    setDirty(true);
    if (!code) return;
    try {
      setLoadingCatalog(true);
      setWards(await provinceService.getWardsByProvince(code));
    } catch {
      toast.error("Không thể tải phường/xã.");
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  async function handleSave() {
    if (!selectedProvince || !selectedWard || !streetLine.trim()) {
      toast.error("Chọn tỉnh/thành, phường/xã và nhập số nhà, tên đường.");
      return;
    }

    setSaving(true);
    try {
      await userService.saveAddress({
        provinceCode: codeOf(selectedProvince.code),
        provinceName: selectedProvince.name,
        wardCode: codeOf(selectedWard.code),
        wardName: selectedWard.name,
        streetLine: streetLine.trim(),
      });
      setDirty(false);
      toast.success("Đã lưu địa chỉ.");
      await onSaved?.();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(typeof message === "string" && message.trim() ? message : "Không thể lưu địa chỉ.");
    } finally {
      setSaving(false);
    }
  }

  const provinceOptions = provinces.map((province) => ({
    value: codeOf(province.code),
    label: province.name,
  }));
  const wardOptions = wards.map((ward) => ({
    value: codeOf(ward.code),
    label: ward.name,
  }));

  return (
    <section className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-2xs">
      <div>
        <h4 className="text-sm font-bold text-foreground">Địa chỉ hiện tại</h4>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Chọn tỉnh/thành, phường/xã và nhập số nhà. Bản đồ chỉ để xem trước, không lưu tọa độ.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-foreground">Tỉnh/Thành phố</label>
          <SearchableSelect
            value={provinceCode}
            options={provinceOptions}
            onChange={handleProvinceChange}
            disabled={loadingCatalog && provinces.length === 0}
            loading={loadingCatalog && provinces.length === 0}
            placeholder="Chọn tỉnh/thành"
            searchPlaceholder="Tìm tỉnh thành..."
            emptyText="Không tìm thấy tỉnh thành"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-foreground">Phường/Xã</label>
          <SearchableSelect
            value={wardCode}
            options={wardOptions}
            onChange={(code) => {
              setWardCode(code);
              setDirty(true);
            }}
            disabled={!provinceCode || loadingCatalog}
            loading={Boolean(provinceCode) && loadingCatalog}
            placeholder="Chọn phường/xã"
            searchPlaceholder="Tìm phường/xã..."
            emptyText="Không tìm thấy phường/xã"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-foreground">Số nhà, tên đường</label>
        <input
          value={streetLine}
          onChange={(event) => {
            setStreetLine(event.target.value);
            setDirty(true);
          }}
          placeholder="Ví dụ: 460/6 Nơ Trang Long"
          className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
        />
      </div>

      {fullAddress && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-medium text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{fullAddress}</span>
        </div>
      )}

      {fullAddress && <AddressMapPreview fullAddress={fullAddress} />}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!dirty && Boolean(initialAddress))}
          className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{saving ? "Đang lưu..." : "Lưu địa chỉ"}</span>
        </button>
      </div>
    </section>
  );
}
