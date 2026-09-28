"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  Shield,
  Wifi,
  Sparkles,
  Bike,
  Car,
  Camera,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import branchService, {
  PropertyBranch,
  CreatePropertyBranchPayload,
  BranchCharge,
} from "@/services/branch.service";
import storageService from "@/services/storage.service";
import provinceService from "@/services/province.service";
import type { Province, Ward } from "@/types/province.type";
import AddressMapPreview from "@/components/address/AddressMapPreview";
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
  selectedCode?: string,
) {
  const selected = options.find((o) => String(o.code) === String(selectedCode));
  if (
    selected &&
    (query.trim() === selected.name.trim() ||
      query.trim() === (selected.full_name ?? "").trim())
  ) {
    return options;
  }
  return options.filter((o) => matchesLocation(o, query));
}

export function getChargeDisplay(c: BranchCharge) {
  if (c.billingMethod === "INCLUDED" || c.includedInRent)
    return "Đã bao gồm trong giá thuê";
  if (c.billingMethod === "NOT_APPLICABLE") return "Không áp dụng / Tự túc";
  if (c.billingMethod === "FREE") return "Miễn phí";
  if (c.amount !== undefined && c.amount !== null && c.amount > 0) {
    let unit = c.unit;
    if (!unit) {
      if (c.billingMethod === "PER_KWH") unit = "kWh";
      else if (c.billingMethod === "PER_M3") unit = "m³";
      else if (c.billingMethod === "PER_PERSON_MONTH") unit = "người/tháng";
      else if (c.billingMethod === "PER_M2_MONTH") unit = "m²/tháng";
      else if (c.billingMethod === "PER_VEHICLE_MONTH") unit = "xe/tháng";
      else unit = "tháng";
    }
    return `${c.amount.toLocaleString()} ₫/${unit}`;
  }
  return "Đã bao gồm trong giá";
}

export function getChargeMeta(chargeType: string) {
  switch (chargeType) {
    case "ELECTRICITY":
      return { label: "Điện", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" };
    case "WATER":
      return { label: "Nước", icon: Droplet, color: "text-blue-500", bg: "bg-blue-500/10" };
    case "MANAGEMENT":
      return { label: "Quản lý", icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "INTERNET":
      return { label: "Wifi", icon: Wifi, color: "text-purple-500", bg: "bg-purple-500/10" };
    case "SERVICE_OR_GARBAGE":
    case "GARBAGE":
    case "CLEANING":
      return { label: "Vệ sinh", icon: Sparkles, color: "text-indigo-500", bg: "bg-indigo-500/10" };
    case "MOTORBIKE_PARKING":
      return { label: "Xe máy", icon: Bike, color: "text-orange-500", bg: "bg-orange-500/10" };
    case "CAR_PARKING":
      return { label: "Ô tô", icon: Car, color: "text-sky-500", bg: "bg-sky-500/10" };
    default:
      return { label: "Khác", icon: Layers, color: "text-slate-500", bg: "bg-slate-500/10" };
  }
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

interface CustomFeeRow {
  id: string;
  name: string;
  amount: number | string;
  unit: string;
}

export default function BranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<PropertyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<PropertyBranch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false);

  // Section 1: Basic & Address
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<PropertyCategoryKey>("house");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState("79");
  const [provinceQuery, setProvinceQuery] = useState("Thành phố Hồ Chí Minh");
  const [wardCode, setWardCode] = useState("");
  const [wardQuery, setWardQuery] = useState("");
  const [streetLine, setStreetLine] = useState("");
  const [wardLoading, setWardLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"province" | "ward" | null>(null);

  // Section 2: Cover Image
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Section 3: Monthly Expenses (Single source of truth)
  const [electricityBillingMethod, setElectricityBillingMethod] = useState<string>("PER_KWH");
  const [electricityAmount, setElectricityAmount] = useState<number | string>(3500);

  const [waterBillingMethod, setWaterBillingMethod] = useState<string>("PER_PERSON_MONTH");
  const [waterAmount, setWaterAmount] = useState<number | string>(100000);

  const [managementBillingMethod, setManagementBillingMethod] = useState<string>("NOT_APPLICABLE");
  const [managementAmount, setManagementAmount] = useState<number | string>("");

  const [internetBillingMethod, setInternetBillingMethod] = useState<string>("NOT_APPLICABLE");
  const [internetAmount, setInternetAmount] = useState<number | string>("");

  const [cleaningBillingMethod, setCleaningBillingMethod] = useState<string>("INCLUDED");
  const [cleaningAmount, setCleaningAmount] = useState<number | string>("");

  // Parking & Capacity
  const [motorbikeParkingCapacity, setMotorbikeParkingCapacity] = useState<number | string>(0);
  const [motorbikeBillingMethod, setMotorbikeBillingMethod] = useState<string>("FREE");
  const [motorbikeAmount, setMotorbikeAmount] = useState<number | string>("");

  const [carParkingCapacity, setCarParkingCapacity] = useState<number | string>(0);
  const [carBillingMethod, setCarBillingMethod] = useState<string>("NOT_APPLICABLE");
  const [carAmount, setCarAmount] = useState<number | string>("");

  // Custom Fees
  const [customFees, setCustomFees] = useState<CustomFeeRow[]>([]);

  // Section 4: Rules & Description
  const [description, setDescription] = useState("");
  const [buildingRules, setBuildingRules] = useState("");

  // Fetch provinces
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

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await branchService.getMyBranches();
      setBranches(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Clean up object URL when modal closes or image changes
  const cleanupCoverPreview = useCallback(() => {
    if (coverPreviewUrl && coverPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
  }, [coverPreviewUrl]);

  useEffect(() => {
    return () => {
      cleanupCoverPreview();
    };
  }, [cleanupCoverPreview]);

  const handleOpenCreateModal = () => {
    cleanupCoverPreview();
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
    setBuildingRules("");

    setCoverImageFile(null);
    setCoverPreviewUrl(null);
    setRemoveCoverImage(false);

    setElectricityBillingMethod("PER_KWH");
    setElectricityAmount(3500);
    setWaterBillingMethod("PER_PERSON_MONTH");
    setWaterAmount(100000);
    setManagementBillingMethod("NOT_APPLICABLE");
    setManagementAmount("");
    setInternetBillingMethod("NOT_APPLICABLE");
    setInternetAmount("");
    setCleaningBillingMethod("INCLUDED");
    setCleaningAmount("");

    setMotorbikeParkingCapacity(10);
    setMotorbikeBillingMethod("FREE");
    setMotorbikeAmount("");
    setCarParkingCapacity(0);
    setCarBillingMethod("NOT_APPLICABLE");
    setCarAmount("");

    setCustomFees([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: PropertyBranch) => {
    cleanupCoverPreview();
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

    setCoverImageFile(null);
    setCoverPreviewUrl(branch.coverImageUrl || null);
    setRemoveCoverImage(false);

    // Electricity
    const eleCharge = branch.defaultCharges?.find((c) => c.chargeType === "ELECTRICITY");
    if (eleCharge) {
      setElectricityBillingMethod(eleCharge.billingMethod || "PER_KWH");
      setElectricityAmount(eleCharge.amount ?? "");
    } else {
      setElectricityBillingMethod("PER_KWH");
      setElectricityAmount(3500);
    }

    // Water
    const waterCharge = branch.defaultCharges?.find((c) => c.chargeType === "WATER");
    if (waterCharge) {
      setWaterBillingMethod(waterCharge.billingMethod || "PER_PERSON_MONTH");
      setWaterAmount(waterCharge.amount ?? "");
    } else {
      setWaterBillingMethod("PER_PERSON_MONTH");
      setWaterAmount(100000);
    }

    // Management
    const mgmtCharge = branch.defaultCharges?.find((c) => c.chargeType === "MANAGEMENT");
    if (mgmtCharge) {
      setManagementBillingMethod(mgmtCharge.billingMethod || "PER_MONTH");
      setManagementAmount(mgmtCharge.amount ?? "");
    } else {
      setManagementBillingMethod(branch.category === "apartment" ? "PER_MONTH" : "NOT_APPLICABLE");
      setManagementAmount("");
    }

    // Internet
    const netCharge = branch.defaultCharges?.find((c) => c.chargeType === "INTERNET");
    if (netCharge) {
      setInternetBillingMethod(netCharge.billingMethod || "PER_MONTH");
      setInternetAmount(netCharge.amount ?? "");
    } else {
      setInternetBillingMethod("NOT_APPLICABLE");
      setInternetAmount("");
    }

    // Cleaning / Service
    const cleanCharge = branch.defaultCharges?.find(
      (c) => c.chargeType === "SERVICE_OR_GARBAGE" || c.chargeType === "CLEANING"
    );
    if (cleanCharge) {
      setCleaningBillingMethod(cleanCharge.billingMethod || "INCLUDED");
      setCleaningAmount(cleanCharge.amount ?? "");
    } else {
      setCleaningBillingMethod("INCLUDED");
      setCleaningAmount("");
    }

    // Motorbike parking
    const motoCharge = branch.defaultCharges?.find((c) => c.chargeType === "MOTORBIKE_PARKING");
    const motoMethod = motoCharge?.billingMethod || ((branch.motorbikeParkingCapacity ?? 0) > 0 ? "FREE" : "NOT_APPLICABLE");
    setMotorbikeBillingMethod(motoMethod);
    setMotorbikeAmount(motoCharge?.amount ?? "");
    setMotorbikeParkingCapacity(motoMethod === "NOT_APPLICABLE" ? 0 : (branch.motorbikeParkingCapacity ?? 10));

    // Car parking
    const carCharge = branch.defaultCharges?.find((c) => c.chargeType === "CAR_PARKING");
    const carMethod = carCharge?.billingMethod || ((branch.carParkingCapacity ?? 0) > 0 ? "PER_VEHICLE_MONTH" : "NOT_APPLICABLE");
    setCarBillingMethod(carMethod);
    setCarAmount(carCharge?.amount ?? "");
    setCarParkingCapacity(carMethod === "NOT_APPLICABLE" ? 0 : (branch.carParkingCapacity ?? 2));

    // Custom other fees
    const others = (branch.defaultCharges || [])
      .filter((c) => c.chargeType === "OTHER")
      .map((c, i) => ({
        id: c.id || `custom-${i}`,
        name: c.customName || "Phí dịch vụ khác",
        amount: c.amount ?? "",
        unit: c.unit || "tháng",
      }));
    setCustomFees(others);

    setIsModalOpen(true);
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("Dung lượng ảnh bìa không được vượt quá 15MB.");
      return;
    }

    cleanupCoverPreview();
    setCoverImageFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setRemoveCoverImage(false);
  };

  const handleRemoveCover = () => {
    cleanupCoverPreview();
    setCoverImageFile(null);
    setCoverPreviewUrl(null);
    setRemoveCoverImage(true);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
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

  const handleAddCustomFee = () => {
    setCustomFees((prev) => [
      ...prev,
      {
        id: `fee-${Date.now()}`,
        name: "",
        amount: "",
        unit: "tháng",
      },
    ]);
  };

  const handleRemoveCustomFee = (id: string) => {
    setCustomFees((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateCustomFee = (id: string, field: keyof CustomFeeRow, val: any) => {
    setCustomFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: val } : f))
    );
  };

  const executeSaveBranch = async () => {
    setSubmitting(true);
    try {
      let finalCoverImageId: string | null = editingBranch?.coverImageId || null;

      // Handle Cover Image Upload
      if (coverImageFile) {
        finalCoverImageId = await storageService.uploadBranchCoverImage(
          coverImageFile,
          editingBranch?.id || "branch"
        );
      } else if (removeCoverImage) {
        finalCoverImageId = null;
      }

      // Build Charges
      const charges: BranchCharge[] = [
        {
          chargeType: "ELECTRICITY",
          billingMethod: electricityBillingMethod,
          amount: electricityBillingMethod === "PER_KWH" ? Number(electricityAmount) || 0 : undefined,
          currency: "VND",
          unit: electricityBillingMethod === "PER_KWH" ? "kWh" : "",
          includedInRent: electricityBillingMethod === "INCLUDED",
          sortOrder: 1,
        },
        {
          chargeType: "WATER",
          billingMethod: waterBillingMethod,
          amount: waterBillingMethod !== "INCLUDED" ? Number(waterAmount) || 0 : undefined,
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

      // Management fee
      if (managementBillingMethod !== "NOT_APPLICABLE") {
        charges.push({
          chargeType: "MANAGEMENT",
          billingMethod: managementBillingMethod,
          amount: managementBillingMethod !== "INCLUDED" ? Number(managementAmount) || 0 : undefined,
          currency: "VND",
          unit: managementBillingMethod === "PER_M2_MONTH" ? "m²/tháng" : "phòng/tháng",
          includedInRent: managementBillingMethod === "INCLUDED",
          sortOrder: 3,
        });
      }

      // Internet fee
      if (internetBillingMethod !== "NOT_APPLICABLE") {
        charges.push({
          chargeType: "INTERNET",
          billingMethod: internetBillingMethod,
          amount: internetBillingMethod !== "INCLUDED" ? Number(internetAmount) || 0 : undefined,
          currency: "VND",
          unit: "phòng/tháng",
          includedInRent: internetBillingMethod === "INCLUDED",
          sortOrder: 4,
        });
      }

      // Cleaning / garbage fee
      if (cleaningBillingMethod !== "NOT_APPLICABLE") {
        charges.push({
          chargeType: "SERVICE_OR_GARBAGE",
          billingMethod: cleaningBillingMethod,
          amount: cleaningBillingMethod !== "INCLUDED" ? Number(cleaningAmount) || 0 : undefined,
          currency: "VND",
          unit: "phòng/tháng",
          includedInRent: cleaningBillingMethod === "INCLUDED",
          sortOrder: 5,
        });
      }

      const finalMotorbikeCap =
        motorbikeBillingMethod === "NOT_APPLICABLE"
          ? 0
          : Math.max(0, Number(motorbikeParkingCapacity) || 0);

      const finalCarCap =
        carBillingMethod === "NOT_APPLICABLE"
          ? 0
          : Math.max(0, Number(carParkingCapacity) || 0);

      // Motorbike parking
      charges.push({
        chargeType: "MOTORBIKE_PARKING",
        billingMethod: motorbikeBillingMethod,
        amount:
          motorbikeBillingMethod === "PER_VEHICLE_MONTH"
            ? Number(motorbikeAmount) || 0
            : undefined,
        currency: "VND",
        unit: "xe/tháng",
        includedInRent: motorbikeBillingMethod === "FREE" || motorbikeBillingMethod === "INCLUDED",
        sortOrder: 6,
      });

      // Car parking
      charges.push({
        chargeType: "CAR_PARKING",
        billingMethod: carBillingMethod,
        amount:
          carBillingMethod === "PER_VEHICLE_MONTH"
            ? Number(carAmount) || 0
            : undefined,
        currency: "VND",
        unit: "xe/tháng",
        includedInRent: carBillingMethod === "FREE" || carBillingMethod === "INCLUDED",
        sortOrder: 7,
      });

      // Other custom fees
      customFees.forEach((fee, idx) => {
        if (fee.name.trim()) {
          charges.push({
            chargeType: "OTHER",
            billingMethod: "PER_MONTH",
            amount: Number(fee.amount) || 0,
            currency: "VND",
            unit: fee.unit.trim() || "tháng",
            customName: fee.name.trim(),
            includedInRent: false,
            sortOrder: 10 + idx,
          });
        }
      });

      const pName = selectedProvince?.name || provinceQuery;
      const wName = selectedWard?.name || wardQuery;

      const payload: CreatePropertyBranchPayload = {
        name: name.trim(),
        code: code.trim() || undefined,
        category,
        streetLine: streetLine.trim(),
        wardCode,
        wardName: wName,
        provinceCode,
        provinceName: pName,
        fullAddress: previewFullAddress,
        description: description.trim() || undefined,
        buildingRules: buildingRules.trim() || undefined,
        motorbikeParkingCapacity: finalMotorbikeCap,
        carParkingCapacity: finalCarCap,
        defaultCharges: charges,
        coverImageId: finalCoverImageId,
      };

      if (editingBranch) {
        await branchService.updateBranch(editingBranch.id, payload);
      } else {
        await branchService.createBranch(payload);
      }

      cleanupCoverPreview();
      setIsModalOpen(false);
      setShowSyncConfirmModal(false);
      loadBranches();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi lưu chi nhánh.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !previewFullAddress.trim()) {
      alert("Vui lòng nhập tên chi nhánh và đầy đủ địa chỉ.");
      return;
    }

    if (motorbikeBillingMethod !== "NOT_APPLICABLE" && (!motorbikeParkingCapacity || Number(motorbikeParkingCapacity) <= 0)) {
      alert("Vui lòng nhập sức chứa xe máy (> 0) hoặc chọn 'Không nhận giữ xe máy'.");
      return;
    }
    if (motorbikeBillingMethod === "PER_VEHICLE_MONTH" && (!motorbikeAmount || Number(motorbikeAmount) <= 0)) {
      alert("Vui lòng nhập biểu phí giữ xe máy theo xe/tháng (> 0 đ).");
      return;
    }
    if (carBillingMethod !== "NOT_APPLICABLE" && (!carParkingCapacity || Number(carParkingCapacity) <= 0)) {
      alert("Vui lòng nhập sức chứa ô tô (> 0) hoặc chọn 'Không nhận giữ ô tô'.");
      return;
    }
    if (carBillingMethod === "PER_VEHICLE_MONTH" && (!carAmount || Number(carAmount) <= 0)) {
      alert("Vui lòng nhập biểu phí giữ ô tô theo xe/tháng (> 0 đ).");
      return;
    }

    // Check if editing a branch with active listings
    if (editingBranch && (editingBranch.activeListingsCount || 0) > 0) {
      setShowSyncConfirmModal(true);
      return;
    }

    executeSaveBranch();
  };

  const handleDelete = async (b: PropertyBranch) => {
    const units = b.totalUnits || 0;
    if (units > 0) {
      alert(
        `Chi nhánh "${b.name}" đang có ${units} phòng/căn hộ. Không thể xóa chi nhánh khi vẫn còn phòng!\nVui lòng chuyển hoặc xóa các phòng thuộc chi nhánh này trước.`
      );
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa chi nhánh "${b.name}"?`)) return;
    try {
      await branchService.deleteBranch(b.id);
      loadBranches();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Không thể xóa chi nhánh.";
      alert(msg);
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
            Nguồn dữ liệu chuẩn tập trung cho Địa chỉ, Ảnh bìa, Biểu phí dịch vụ hàng tháng và Nội quy tòa nhà.
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

      {/* Branch List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Đang tải danh sách chi nhánh...
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">
            Chưa có Chi nhánh / Tòa nhà nào
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Tạo chi nhánh đầu tiên để cố định địa chỉ, ảnh bìa, toàn bộ biểu phí dịch vụ và quy định chung cho dãy phòng trọ hoặc tòa nhà của bạn.
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
              {/* Left: Thumbnail & Info */}
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                {/* Branch Cover Thumbnail */}
                <div className="relative h-20 w-24 sm:h-22 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                  {b.coverImageUrl ? (
                    <Image
                      src={b.coverImageUrl}
                      alt={b.name}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                      <Building2 className="h-8 w-8 opacity-60" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary shrink-0">
                      {getCategoryLabel(b.category)}
                    </span>
                    {b.code && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground shrink-0">
                        {b.code}
                      </span>
                    )}
                    {b.isComplete === false && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertTriangle className="h-3 w-3" />
                        Chưa hoàn thiện biểu phí
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {b.name}
                  </h3>

                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span>{b.fullAddress}</span>
                  </p>
                </div>
              </div>

              {/* Middle: Biểu phí cơ bản Điện & Nước */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                {(() => {
                  const coreCharges = (b.defaultCharges || []).filter(
                    (c) => c.chargeType === "ELECTRICITY" || c.chargeType === "WATER"
                  );
                  if (coreCharges.length === 0) {
                    return (
                      <span className="text-xs text-muted-foreground italic">
                        Chưa có biểu phí
                      </span>
                    );
                  }
                  return coreCharges.map((c, i) => {
                    const meta = getChargeMeta(c.chargeType);
                    const IconComponent = meta.icon;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 rounded-xl border border-border/60 ${meta.bg} px-3 py-1.5 text-xs`}
                      >
                        <IconComponent className={`h-3.5 w-3.5 ${meta.color} shrink-0`} />
                        <span className="text-muted-foreground text-[11px] font-medium">
                          {meta.label}:
                        </span>
                        <span className="font-bold text-foreground text-xs">
                          {getChargeDisplay(c)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Right: Stats & Actions */}
              <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  <Layers className="h-3.5 w-3.5" />
                  {b.totalUnits || 0} phòng/căn
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground">
                  <span>🏍️ {b.motorbikeParkingCapacity ?? 0}</span>
                  <span className="text-muted-foreground/50">|</span>
                  <span>🚗 {b.carParkingCapacity ?? 0}</span>
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
                    onClick={() => handleDelete(b)}
                    title={
                      (b.totalUnits || 0) > 0
                        ? `Chi nhánh đang có ${b.totalUnits} phòng/căn, không thể xóa!`
                        : "Xóa chi nhánh"
                    }
                    className={
                      (b.totalUnits || 0) > 0
                        ? "rounded-xl p-2 text-muted-foreground/40 cursor-not-allowed transition-colors"
                        : "rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Redesigned 5-Section Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {editingBranch ? "Chỉnh sửa Chi nhánh / Tòa nhà" : "Tạo Chi nhánh / Tòa nhà mới"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thiết lập chuẩn hóa địa chỉ, ảnh bìa và biểu phí hàng tháng áp dụng cho các tin đăng
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6 text-xs">
              {/* SECTION 1: BASIC INFO & ADDRESS */}
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    1
                  </span>
                  <h4 className="text-sm font-bold text-foreground">
                    Thông tin cơ bản &amp; Địa chỉ
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-foreground mb-1">
                      Tên Chi nhánh / Tòa nhà <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Tòa nhà Căn hộ Dịch vụ SkyHome Thảo Điền"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Mã Chi nhánh (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="VD: CN-Q2-01"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
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
                    {PROPERTY_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Selection */}
                <div className="space-y-3 pt-2">
                  <label className="block font-bold text-foreground">
                    Địa chỉ tòa nhà / chi nhánh <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          if (val !== selectedProvince?.name && val !== selectedProvince?.full_name) {
                            setProvinceCode("");
                            setWardCode("");
                            setWardQuery("");
                            setWards([]);
                          }
                        }}
                        open={openDropdown === "province"}
                        onOpen={() => setOpenDropdown("province")}
                        onClose={() => setOpenDropdown(null)}
                        options={getFilteredLocationOptions(provinces, provinceQuery, provinceCode)}
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
                          if (val !== selectedWard?.name && val !== selectedWard?.full_name) {
                            setWardCode("");
                          }
                        }}
                        open={openDropdown === "ward"}
                        onOpen={() => setOpenDropdown("ward")}
                        onClose={() => setOpenDropdown(null)}
                        options={getFilteredLocationOptions(wards, wardQuery, wardCode)}
                        selectedCode={wardCode}
                        onSelect={handleWardSelect}
                        disabled={wardLoading || !wards.length}
                        emptyText="Không tìm thấy phường/xã"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-muted-foreground mb-1 text-[11px]">
                      Địa chỉ cụ thể (Số nhà, ngõ, tên đường)
                    </label>
                    <input
                      type="text"
                      required
                      value={streetLine}
                      onChange={(e) => setStreetLine(e.target.value)}
                      placeholder="Ví dụ: 45 Đường số 12, Khu phố 4..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {previewFullAddress && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-medium text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span>{previewFullAddress}</span>
                      </div>
                      <AddressMapPreview fullAddress={previewFullAddress} />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: COVER IMAGE (OPTIONAL) */}
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      Ảnh bìa Chi nhánh / Tòa nhà (Tùy chọn)
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Tối đa 15MB (JPG, PNG, WebP)</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Preview Box */}
                  <div className="relative h-32 w-full sm:w-56 shrink-0 overflow-hidden rounded-xl border border-dashed border-border bg-card flex items-center justify-center">
                    {coverPreviewUrl ? (
                      <>
                        <Image
                          src={coverPreviewUrl}
                          alt="Ảnh bìa chi nhánh"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveCover}
                          className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black transition-colors"
                          title="Xóa ảnh bìa"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/60 p-4 text-center">
                        <Camera className="h-8 w-8 mb-1.5" />
                        <span className="text-[11px]">Chưa có ảnh bìa</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 flex-1 w-full sm:w-auto">
                    <p className="text-xs text-muted-foreground">
                      Ảnh đại diện giúp tăng độ nhận diện thương hiệu cho tòa nhà, hiển thị nổi bật trên danh sách chi nhánh và trang chi tiết.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="branch-cover-upload"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition-colors hover:bg-primary/90"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        {coverPreviewUrl ? "Thay đổi ảnh bìa" : "Tải ảnh bìa lên"}
                      </label>
                      <input
                        id="branch-cover-upload"
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleCoverFileChange}
                        className="sr-only"
                      />
                      {coverPreviewUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveCover}
                          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa ảnh
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: MONTHLY CHARGES (THE SINGLE SOURCE OF TRUTH) */}
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      3
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      Biểu phí dịch vụ hàng tháng (Nguồn dữ liệu chuẩn)
                    </h4>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p>
                    Toàn bộ biểu phí được cấu hình dưới đây là <strong>nguồn dữ liệu chuẩn</strong>. Mọi tin đăng gán vào chi nhánh này sẽ tự động đọc biểu phí này và chỉ đọc (read-only) trên form đăng tin.
                  </p>
                </div>

                {/* Tiền điện & Nước */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Electricity */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3.5">
                    <label className="flex items-center gap-1.5 font-bold text-foreground">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Tiền điện sinh hoạt <span className="text-destructive">*</span>
                    </label>
                    <div className="space-y-2">
                      <select
                        value={electricityBillingMethod}
                        onChange={(e) => setElectricityBillingMethod(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="PER_KWH">Tính theo số công tơ (kWh)</option>
                        <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
                      </select>

                      {electricityBillingMethod === "PER_KWH" && (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            required
                            value={electricityAmount}
                            onChange={(e) => setElectricityAmount(e.target.value)}
                            placeholder="Ví dụ: 3500"
                            className="w-full rounded-xl border border-border bg-background pl-3 pr-16 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            đ/kWh
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Water */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3.5">
                    <label className="flex items-center gap-1.5 font-bold text-foreground">
                      <Droplet className="h-4 w-4 text-blue-500" />
                      Tiền nước sinh hoạt <span className="text-destructive">*</span>
                    </label>
                    <div className="space-y-2">
                      <select
                        value={waterBillingMethod}
                        onChange={(e) => setWaterBillingMethod(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="PER_M3">Tính theo khối (m³)</option>
                        <option value="PER_PERSON_MONTH">Tính theo người / tháng</option>
                        <option value="PER_MONTH">Khoán theo phòng / tháng</option>
                        <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
                      </select>

                      {waterBillingMethod !== "INCLUDED" && (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            required
                            value={waterAmount}
                            onChange={(e) => setWaterAmount(e.target.value)}
                            placeholder="Ví dụ: 25000"
                            className="w-full rounded-xl border border-border bg-background pl-3 pr-24 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            {waterBillingMethod === "PER_M3"
                              ? "đ/m³"
                              : waterBillingMethod === "PER_PERSON_MONTH"
                              ? "đ/người"
                              : "đ/phòng"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phí quản lý & Internet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Management */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3.5">
                    <label className="flex items-center gap-1.5 font-bold text-foreground">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      Phí quản lý tòa nhà
                    </label>
                    <div className="space-y-2">
                      <select
                        value={managementBillingMethod}
                        onChange={(e) => setManagementBillingMethod(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="NOT_APPLICABLE">Không áp dụng</option>
                        <option value="PER_MONTH">Cố định theo phòng / tháng</option>
                        <option value="PER_M2_MONTH">Tính theo diện tích (m²/tháng)</option>
                        <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
                      </select>

                      {managementBillingMethod !== "NOT_APPLICABLE" &&
                        managementBillingMethod !== "INCLUDED" && (
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="5000"
                              value={managementAmount}
                              onChange={(e) => setManagementAmount(e.target.value)}
                              placeholder="Ví dụ: 150000"
                              className="w-full rounded-xl border border-border bg-background pl-3 pr-24 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                              {managementBillingMethod === "PER_M2_MONTH" ? "đ/m²/tháng" : "đ/tháng"}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Internet */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3.5">
                    <label className="flex items-center gap-1.5 font-bold text-foreground">
                      <Wifi className="h-4 w-4 text-purple-500" />
                      Internet / Wifi
                    </label>
                    <div className="space-y-2">
                      <select
                        value={internetBillingMethod}
                        onChange={(e) => setInternetBillingMethod(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="NOT_APPLICABLE">Người thuê tự đăng ký</option>
                        <option value="PER_MONTH">Cố định theo phòng / tháng</option>
                        <option value="INCLUDED">Miễn phí / Đã bao gồm</option>
                      </select>

                      {internetBillingMethod === "PER_MONTH" && (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={internetAmount}
                            onChange={(e) => setInternetAmount(e.target.value)}
                            placeholder="Ví dụ: 100000"
                            className="w-full rounded-xl border border-border bg-background pl-3 pr-20 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            đ/tháng
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vệ sinh & Dịch vụ */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                  <label className="flex items-center gap-1.5 font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    Phí vệ sinh / Thu gom rác
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={cleaningBillingMethod}
                      onChange={(e) => setCleaningBillingMethod(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
                      <option value="PER_MONTH">Cố định theo phòng / tháng</option>
                      <option value="NOT_APPLICABLE">Không áp dụng</option>
                    </select>

                    {cleaningBillingMethod === "PER_MONTH" && (
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="5000"
                          value={cleaningAmount}
                          onChange={(e) => setCleaningAmount(e.target.value)}
                          placeholder="Ví dụ: 50000"
                          className="w-full rounded-xl border border-border bg-background pl-3 pr-20 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          đ/tháng
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parking Capacity & Parking Charges */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                  <label className="block font-bold text-foreground">
                    Chỗ để xe &amp; Biểu phí gửi xe
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Motorbike */}
                    <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Bike className="h-3.5 w-3.5 text-orange-500" /> Chỗ để xe máy
                        </span>
                        {motorbikeBillingMethod === "NOT_APPLICABLE" && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            Không nhận giữ
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">
                          Biểu phí gửi xe máy
                        </label>
                        <select
                          value={motorbikeBillingMethod}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMotorbikeBillingMethod(val);
                            if (val === "NOT_APPLICABLE") {
                              setMotorbikeParkingCapacity(0);
                              setMotorbikeAmount("");
                            } else if (!motorbikeParkingCapacity || Number(motorbikeParkingCapacity) <= 0) {
                              setMotorbikeParkingCapacity(10);
                            }
                          }}
                          className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="FREE">Miễn phí giữ xe máy</option>
                          <option value="PER_VEHICLE_MONTH">Thu phí theo xe / tháng</option>
                          <option value="NOT_APPLICABLE">Không nhận giữ xe máy</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">
                          Sức chứa xe máy (chi nhánh/tòa nhà)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={motorbikeBillingMethod === "NOT_APPLICABLE"}
                          value={motorbikeBillingMethod === "NOT_APPLICABLE" ? 0 : motorbikeParkingCapacity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMotorbikeParkingCapacity(val);
                            if (Number(val) === 0 && val !== "") {
                              setMotorbikeBillingMethod("NOT_APPLICABLE");
                              setMotorbikeAmount("");
                            }
                          }}
                          placeholder={motorbikeBillingMethod === "NOT_APPLICABLE" ? "0 (Không nhận giữ)" : "Ví dụ: 20"}
                          className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/40"
                        />
                        {motorbikeBillingMethod === "NOT_APPLICABLE" && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Chi nhánh không nhận giữ xe máy nên sức chứa cố định là 0 chỗ.
                          </p>
                        )}
                      </div>
                      {motorbikeBillingMethod === "PER_VEHICLE_MONTH" && (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={motorbikeAmount}
                            onChange={(e) => setMotorbikeAmount(e.target.value)}
                            placeholder="Ví dụ: 120000"
                            className="w-full rounded-xl border border-border bg-background pl-3 pr-20 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            đ/xe/tháng
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Car */}
                    <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Car className="h-3.5 w-3.5 text-sky-500" /> Chỗ để ô tô
                        </span>
                        {carBillingMethod === "NOT_APPLICABLE" && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            Không nhận giữ
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">
                          Biểu phí gửi ô tô
                        </label>
                        <select
                          value={carBillingMethod}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCarBillingMethod(val);
                            if (val === "NOT_APPLICABLE") {
                              setCarParkingCapacity(0);
                              setCarAmount("");
                            } else if (!carParkingCapacity || Number(carParkingCapacity) <= 0) {
                              setCarParkingCapacity(2);
                            }
                          }}
                          className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="NOT_APPLICABLE">Không nhận giữ ô tô</option>
                          <option value="PER_VEHICLE_MONTH">Thu phí theo xe / tháng</option>
                          <option value="FREE">Miễn phí giữ ô tô</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">
                          Sức chứa xe ô tô (chi nhánh/tòa nhà)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={carBillingMethod === "NOT_APPLICABLE"}
                          value={carBillingMethod === "NOT_APPLICABLE" ? 0 : carParkingCapacity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCarParkingCapacity(val);
                            if (Number(val) === 0 && val !== "") {
                              setCarBillingMethod("NOT_APPLICABLE");
                              setCarAmount("");
                            }
                          }}
                          placeholder={carBillingMethod === "NOT_APPLICABLE" ? "0 (Không nhận giữ)" : "Ví dụ: 5"}
                          className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/40"
                        />
                        {carBillingMethod === "NOT_APPLICABLE" && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Chi nhánh không nhận giữ ô tô nên sức chứa cố định là 0 chỗ.
                          </p>
                        )}
                      </div>
                      {carBillingMethod === "PER_VEHICLE_MONTH" && (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="50000"
                            value={carAmount}
                            onChange={(e) => setCarAmount(e.target.value)}
                            placeholder="Ví dụ: 1200000"
                            className="w-full rounded-xl border border-border bg-background pl-3 pr-20 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            đ/xe/tháng
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Other Charges */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground">Phí dịch vụ khác</span>
                      <p className="text-[11px] text-muted-foreground">
                        Các khoản chi phí riêng biệt khác như thang máy, hồ bơi, dịch vụ tiện ích...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomFee}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm khoản phí
                    </button>
                  </div>

                  {customFees.length > 0 && (
                    <div className="space-y-2">
                      {customFees.map((fee) => (
                        <div key={fee.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={fee.name}
                            onChange={(e) => handleUpdateCustomFee(fee.id, "name", e.target.value)}
                            placeholder="Tên phí (VD: Thang máy)"
                            className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={fee.amount}
                            onChange={(e) => handleUpdateCustomFee(fee.id, "amount", e.target.value)}
                            placeholder="Số tiền (đ)"
                            className="w-32 rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            type="text"
                            value={fee.unit}
                            onChange={(e) => handleUpdateCustomFee(fee.id, "unit", e.target.value)}
                            placeholder="Đơn vị (tháng/người)"
                            className="w-28 rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomFee(fee.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: RULES & DESCRIPTION */}
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    4
                  </span>
                  <h4 className="text-sm font-bold text-foreground">
                    Nội quy &amp; Mô tả chung
                  </h4>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nội quy tòa nhà / chi nhánh
                  </label>
                  <textarea
                    rows={3}
                    value={buildingRules}
                    onChange={(e) => setBuildingRules(e.target.value)}
                    placeholder="Ví dụ: Giờ mở cửa 05h00 - Đóng cửa 23h30. Không nuôi thú cưng. Giữ gìn an ninh trật tự sau 22h..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Mô tả tiện ích chung &amp; Môi trường xung quanh
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ví dụ: Tòa nhà gồm 5 tầng thang máy, có bảo vệ 24/7, gần chợ và trạm xe buýt..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-5 py-2.5 font-bold text-foreground hover:bg-muted transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting
                    ? "Đang lưu..."
                    : editingBranch
                    ? "Lưu thay đổi"
                    : "Tạo Chi nhánh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Active Listings Impact */}
      {showSyncConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-500/10 p-2.5 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">
                  Xác nhận cập nhật biểu phí chi nhánh
                </h4>
                <p className="text-xs text-muted-foreground">
                  Chi nhánh này hiện có{" "}
                  <strong className="text-primary font-bold">
                    {editingBranch?.activeListingsCount || 0} tin đăng đang hoạt động
                  </strong>
                  .
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Đồng bộ tự động sang tất cả các tin đăng đang hoạt động.
              </p>
              <p className="text-[11px]">
                Biểu phí mới sẽ có hiệu lực cho các khách thuê mới. Các hợp đồng đã ký hoặc yêu cầu thuê đã gửi trước đó vẫn giữ nguyên ảnh chụp (snapshot) lịch sử bất biến.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSyncConfirmModal(false)}
                className="rounded-xl border border-border px-4 py-2 font-bold text-foreground hover:bg-muted"
              >
                Xem lại
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={executeSaveBranch}
                className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {submitting ? "Đang cập nhật..." : "Xác nhận & Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
