"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  MapPin,
  Layers,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Zap,
  Droplet,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import Link from "next/link";
import branchService, {
  PropertyBranch,
  CreatePropertyBranchPayload,
  BranchCharge,
} from "@/services/branch.service";
import provinceService from "@/services/province.service";
import type { Province, Ward } from "@/types/province.type";
import { PROPERTY_CATEGORIES } from "../properties/new/constants";
import type { PropertyCategoryKey } from "../properties/new/types";

interface LocationOption {
  code: string | number;
  name: string;
  full_name?: string;
}

function matchesLocation(option: LocationOption, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${option.name} ${option.full_name ?? ""}`
    .toLowerCase()
    .includes(normalizedQuery);
}

function getFilteredLocationOptions(
  options: LocationOption[],
  query: string,
  selectedCode?: string
) {
  const selected = options.find((o) => String(o.code) === String(selectedCode));
  if (selected && (query.trim() === selected.name.trim() || query.trim() === (selected.full_name ?? "").trim())) {
    return options;
  }
  return options.filter((o) => matchesLocation(o, query));
}

function getChargeDisplayLabel(c: BranchCharge) {
  if (c.billingMethod === "INCLUDED" || c.includedInRent) return "Đã bao gồm trong giá";
  if (c.billingMethod === "STATE_WATER_RATE") return "Theo giá EVN";
  if (c.billingMethod === "NEGOTIABLE") return "Thỏa thuận riêng";
  if (c.amount !== undefined && c.amount !== null && c.amount > 0) {
    const unitText = c.unit ? ` ₫/${c.unit}` : " ₫";
    return `${c.amount.toLocaleString()}${unitText}`;
  }
  return "Đã bao gồm trong giá";
}

function SearchableLocationDropdown({
  name,
  placeholder,
  value,
  onChange,
  open,
  onOpen,
  onClose,
  options,
  selectedCode,
  onSelect,
  disabled,
  emptyText,
}: {
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  options: LocationOption[];
  selectedCode: string;
  onSelect: (option: LocationOption) => void;
  disabled: boolean;
  emptyText: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={onOpen}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background pl-8 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-20" onClick={onClose} />
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
            {options.length ? (
              options.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(option);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-muted ${
                    String(option.code) === selectedCode
                      ? "bg-primary/10 text-primary"
                      : "text-foreground"
                  }`}
                >
                  <span className="truncate">{option.name}</span>
                  {String(option.code) === selectedCode && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                {emptyText}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import listingService from "@/services/listing.service";
import type { MyListingSummaryResponse } from "@/types/listing.type";
import { getListingStatusConfig } from "@/config/listing-status.config";

import { useRouter } from "next/navigation";

function formatCurrency(amount: number): string {
  if (!amount || amount <= 0) return "Thỏa thuận";
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")} triệu`;
  }
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function BranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<PropertyBranch[]>([]);
  const [listings, setListings] = useState<MyListingSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<PropertyBranch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<PropertyCategoryKey>("house");
  
  // Location States
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState("79");
  const [provinceQuery, setProvinceQuery] = useState("Thành phố Hồ Chí Minh");
  const [wardCode, setWardCode] = useState("");
  const [wardQuery, setWardQuery] = useState("");
  const [streetLine, setStreetLine] = useState("");
  const [wardLoading, setWardLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"province" | "ward" | null>(null);

  const [description, setDescription] = useState("");
  const [electricityBillingMethod, setElectricityBillingMethod] = useState<string>("PER_KWH");
  const [electricityAmount, setElectricityAmount] = useState<number | string>(3500);
  const [waterBillingMethod, setWaterBillingMethod] = useState<string>("PER_PERSON_MONTH");
  const [waterAmount, setWaterAmount] = useState<number | string>(100000);
  const [buildingRules, setBuildingRules] = useState("");

  // Fetch provinces on load
  useEffect(() => {
    provinceService
      .getCurrentProvinces()
      .then((data) => setProvinces(data))
      .catch(() => {});
  }, []);

  // Fetch wards when province changes
  useEffect(() => {
    if (!provinceCode) return;
    setWardLoading(true);
    provinceService
      .getCurrentWardsByProvince(provinceCode)
      .then((data) => {
        setWards(data);
        setWardLoading(false);
      })
      .catch(() => {
        setWards([]);
        setWardLoading(false);
      });
  }, [provinceCode]);

  useEffect(() => {
    loadBranches();
    loadListings();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await branchService.getMyBranches();
      setBranches(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    setLoadingListings(true);
    try {
      const res = await listingService.getMyListings({ page: 1 });
      setListings(res.result || []);
    } catch {
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setName("");
    setCode("");
    setCategory("house");
    setProvinceCode("79");
    const foundP = provinces.find((p) => String(p.code) === "79");
    setProvinceQuery(foundP ? foundP.name : "Thành phố Hồ Chí Minh");
    setWardCode("");
    setWardQuery("");
    setStreetLine("");
    setDescription("");
    setElectricityBillingMethod("PER_KWH");
    setElectricityAmount(3500);
    setWaterBillingMethod("PER_PERSON_MONTH");
    setWaterAmount(100000);
    setBuildingRules("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: PropertyBranch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setCode(branch.code || "");
    setCategory(branch.category);
    
    const pCode = branch.provinceCode || "79";
    setProvinceCode(pCode);
    const foundP = provinces.find((p) => String(p.code) === pCode);
    setProvinceQuery(foundP ? foundP.name : branch.provinceName || "");
    
    setWardCode(branch.wardCode || "");
    setWardQuery(branch.wardName || "");
    setStreetLine(branch.streetLine || "");

    setDescription(branch.description || "");
    setBuildingRules(branch.buildingRules || "");

    const eleCharge = branch.defaultCharges?.find((c) => c.chargeType === "ELECTRICITY");
    if (eleCharge) {
      setElectricityBillingMethod(eleCharge.billingMethod || "PER_KWH");
      setElectricityAmount(eleCharge.amount ?? "");
    } else {
      setElectricityBillingMethod("PER_KWH");
      setElectricityAmount(3500);
    }

    const waterCharge = branch.defaultCharges?.find((c) => c.chargeType === "WATER");
    if (waterCharge) {
      setWaterBillingMethod(waterCharge.billingMethod || "PER_PERSON_MONTH");
      setWaterAmount(waterCharge.amount ?? "");
    } else {
      setWaterBillingMethod("PER_PERSON_MONTH");
      setWaterAmount(100000);
    }

    setIsModalOpen(true);
  };

  const selectedProvince = provinces.find((p) => String(p.code) === String(provinceCode));
  const selectedWard = wards.find((w) => String(w.code) === String(wardCode));
  const previewFullAddress = [
    streetLine.trim(),
    selectedWard?.name || wardQuery,
    selectedProvince?.name || provinceQuery,
  ]
    .filter(Boolean)
    .join(", ");

  const handleProvinceSelect = (province: Province) => {
    setProvinceCode(String(province.code));
    setProvinceQuery(province.name);
    setWardCode("");
    setWardQuery("");
  };

  const handleWardSelect = (ward: Ward) => {
    setWardCode(String(ward.code));
    setWardQuery(ward.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !previewFullAddress.trim()) return;

    setSubmitting(true);
    try {
      const charges: BranchCharge[] = [
        {
          chargeType: "ELECTRICITY",
          billingMethod: electricityBillingMethod,
          amount: electricityBillingMethod === "PER_KWH" ? (Number(electricityAmount) || 0) : undefined,
          currency: "VND",
          unit: electricityBillingMethod === "PER_KWH" ? "kWh" : "",
          includedInRent: electricityBillingMethod === "INCLUDED",
          sortOrder: 1,
        },
        {
          chargeType: "WATER",
          billingMethod: waterBillingMethod,
          amount: waterBillingMethod !== "INCLUDED" ? (Number(waterAmount) || 0) : undefined,
          currency: "VND",
          unit:
            waterBillingMethod === "PER_M3"
              ? "m³"
              : waterBillingMethod === "PER_PERSON_MONTH"
              ? "người/tháng"
              : waterBillingMethod === "PER_MONTH"
              ? "phòng/tháng"
              : "",
          includedInRent: waterBillingMethod === "INCLUDED",
          sortOrder: 2,
        },
      ];

      const pName = selectedProvince?.name || provinceQuery;
      const wName = selectedWard?.name || wardQuery;

      const payload: CreatePropertyBranchPayload = {
        name,
        code,
        category,
        streetLine,
        wardCode,
        wardName: wName,
        provinceCode,
        provinceName: pName,
        fullAddress: previewFullAddress,
        description,
        buildingRules,
        defaultCharges: charges,
      };

      if (editingBranch) {
        await branchService.updateBranch(editingBranch.id, payload);
      } else {
        await branchService.createBranch(payload);
      }

      setIsModalOpen(false);
      loadBranches();
    } catch {
      alert("Đã xảy ra lỗi khi lưu chi nhánh.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa chi nhánh này?")) return;
    try {
      await branchService.deleteBranch(id);
      loadBranches();
    } catch {
      alert("Không thể xóa chi nhánh.");
    }
  };

  const getCategoryLabel = (catKey: string) => {
    return PROPERTY_CATEGORIES.find((c) => c.key === catKey)?.label || catKey;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Quản lý Chi nhánh / Tòa nhà
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Quản lý tập trung Địa chỉ, Loại hình thuê, Biểu phí điện/nước và Tiện ích tòa nhà của các cụm bất động sản.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Thêm Chi nhánh / Tòa nhà
        </button>
      </div>

      {/* Branch List - Horizontal Layout */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Đang tải danh sách chi nhánh...
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">Chưa có Chi nhánh / Tòa nhà nào</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Tạo chi nhánh đầu tiên để cố định địa chỉ, biểu phí điện nước và quy định chung cho dãy phòng trọ hoặc tòa nhà của bạn.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Tạo Chi nhánh ngay
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/dashboard/branches/${b.id}`)}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs hover:border-primary/50 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group"
            >
              {/* Left Info: Badge + Name + Address */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary shrink-0">
                    {getCategoryLabel(b.category)}
                  </span>
                  {b.code && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground shrink-0">
                      {b.code}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {b.name}
                </h3>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <span>{b.fullAddress}</span>
                </p>
              </div>

              {/* Middle: Default Charges */}
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
                {b.defaultCharges && b.defaultCharges.length > 0 ? (
                  b.defaultCharges.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-xs"
                    >
                      {c.chargeType === "ELECTRICITY" ? (
                        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Droplet className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      )}
                      <span className="text-muted-foreground text-[11px] font-medium">
                        {c.chargeType === "ELECTRICITY" ? "Điện:" : "Nước:"}
                      </span>
                      <span className="font-bold text-foreground text-xs">
                        {getChargeDisplayLabel(c)}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Chưa có biểu phí
                  </span>
                )}
              </div>

              {/* Right: Stats & Actions */}
              <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  <Layers className="h-3.5 w-3.5" />
                  {b.totalUnits || 0} phòng/căn
                </span>

                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={`/dashboard/properties/new?branchId=${b.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Thêm phòng</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(b)}
                    title="Chỉnh sửa chi nhánh"
                    className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    title="Xóa chi nhánh"
                    className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {editingBranch ? "Chỉnh sửa Chi nhánh" : "Tạo Chi nhánh / Tòa nhà mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Tên Chi nhánh / Tòa nhà <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Tòa nhà Căn hộ dịch vụ HomeSpace Q7"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Mã Chi nhánh</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ví dụ: HS-Q7"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Loại hình thuê chính <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PropertyCategoryKey)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PROPERTY_CATEGORIES.filter((c) => !c.disabled).map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Địa chỉ chọn theo Tỉnh / Phường / Đường */}
              <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                <label className="block font-bold text-foreground">
                  Địa chỉ Chi nhánh / Tòa nhà <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-muted-foreground mb-1 text-[11px]">
                      Tỉnh / Thành phố
                    </label>
                    <SearchableLocationDropdown
                      name="provinceName"
                      placeholder="Tìm tỉnh / thành phố..."
                      value={provinceQuery}
                      onChange={(val) => {
                        setProvinceQuery(val);
                        if (
                          val !== selectedProvince?.name &&
                          val !== selectedProvince?.full_name
                        ) {
                          setProvinceCode("");
                          setWardCode("");
                          setWardQuery("");
                          setWards([]);
                        }
                      }}
                      open={openDropdown === "province"}
                      onOpen={() => setOpenDropdown("province")}
                      onClose={() => setOpenDropdown(null)}
                      options={getFilteredLocationOptions(
                        provinces,
                        provinceQuery,
                        provinceCode
                      )}
                      selectedCode={provinceCode}
                      onSelect={handleProvinceSelect}
                      disabled={!provinces.length}
                      emptyText="Không tìm thấy tỉnh/thành phố"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-muted-foreground mb-1 text-[11px]">
                      Phường / Xã
                    </label>
                    <SearchableLocationDropdown
                      name="wardCode"
                      placeholder={wardLoading ? "Đang tải..." : "Tìm phường / xã..."}
                      value={wardQuery}
                      onChange={(val) => {
                        setWardQuery(val);
                        if (
                          val !== selectedWard?.name &&
                          val !== selectedWard?.full_name
                        ) {
                          setWardCode("");
                        }
                      }}
                      open={openDropdown === "ward"}
                      onOpen={() => setOpenDropdown("ward")}
                      onClose={() => setOpenDropdown(null)}
                      options={getFilteredLocationOptions(
                        wards,
                        wardQuery,
                        wardCode
                      )}
                      selectedCode={wardCode}
                      onSelect={handleWardSelect}
                      disabled={wardLoading || !wards.length}
                      emptyText="Không tìm thấy phường/xã"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1 text-[11px]">
                    Địa chỉ cụ thể (Số nhà, tên đường)
                  </label>
                  <input
                    type="text"
                    required
                    value={streetLine}
                    onChange={(e) => setStreetLine(e.target.value)}
                    placeholder="Ví dụ: 137/2 Trần Bá Giao..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {previewFullAddress && (
                  <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-medium text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <span>{previewFullAddress}</span>
                  </div>
                )}
              </div>

              {/* Cấu hình Tiền điện */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                <label className="block font-bold text-foreground">Tiền điện</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={electricityBillingMethod}
                    onChange={(e) => setElectricityBillingMethod(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="PER_KWH">Tính theo số công tơ (kWh)</option>
                    <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
                  </select>

                  {electricityBillingMethod === "PER_KWH" ? (
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={electricityAmount}
                        onChange={(e) => setElectricityAmount(e.target.value)}
                        placeholder="Ví dụ: 3500"
                        className="w-full rounded-xl border border-border bg-background pl-3 pr-16 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        đ/kWh
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-9 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                      Miễn phí tiền điện
                    </div>
                  )}
                </div>
              </div>

              {/* Cấu hình Tiền nước */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                <label className="block font-bold text-foreground">Tiền nước sinh hoạt</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={waterBillingMethod}
                    onChange={(e) => setWaterBillingMethod(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="PER_M3">Tính theo m³ (Khối nước)</option>
                    <option value="PER_PERSON_MONTH">Tính theo người / tháng</option>
                    <option value="PER_MONTH">Khoán theo phòng / tháng</option>
                    <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
                  </select>

                  {waterBillingMethod !== "INCLUDED" ? (
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={waterAmount}
                        onChange={(e) => setWaterAmount(e.target.value)}
                        placeholder={
                          waterBillingMethod === "PER_M3"
                            ? "Ví dụ: 25000"
                            : waterBillingMethod === "PER_PERSON_MONTH"
                            ? "Ví dụ: 100000"
                            : "Ví dụ: 150000"
                        }
                        className="w-full rounded-xl border border-border bg-background pl-3 pr-28 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        {waterBillingMethod === "PER_M3"
                          ? "đ/m³"
                          : waterBillingMethod === "PER_PERSON_MONTH"
                          ? "đ/người/tháng"
                          : "đ/phòng/tháng"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-9 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                      Miễn phí tiền nước
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Nội quy & Quy định chung tòa nhà</label>
                <textarea
                  rows={3}
                  value={buildingRules}
                  onChange={(e) => setBuildingRules(e.target.value)}
                  placeholder="Ví dụ: Giờ đóng cửa 23h00, giữ an ninh trật tự..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 font-bold text-foreground hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : editingBranch ? "Cập nhật" : "Tạo Chi nhánh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
