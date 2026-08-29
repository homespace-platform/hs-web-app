"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ImagePlus, LoaderCircle, Save, Search, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import listingService from "@/services/listing.service";
import listingMediaService from "@/services/listing-media.service";
import provinceService from "@/services/province.service";
import type { Province, Ward } from "@/types/province.type";
import type { ListingCategory } from "@/types/listing.type";

const CATEGORIES = [
  ["apartment", "Căn hộ / Chung cư"],
  ["house", "Nhà ở"],
  ["office", "Văn phòng / Studio"],
  ["commercial", "Mặt bằng kinh doanh"],
  ["room", "Nhà trọ"],
] as const;
type CategoryKey = (typeof CATEGORIES)[number][0];
type RentalMode = "WHOLE_PROPERTY" | "SINGLE_UNIT" | "MULTIPLE_UNITS";
const API_CATEGORIES: Record<CategoryKey, ListingCategory> = {
  apartment: "APARTMENT",
  house: "HOUSE",
  office: "STUDIO",
  commercial: "COMMERCIAL",
  room: "ROOM",
};
const AMENITIES = ["WiFi", "Máy lạnh", "Máy nước nóng", "Tủ lạnh", "Máy giặt", "Bếp", "Ban công", "Thang máy", "Chỗ để xe", "Bảo vệ 24/7", "Cho nuôi thú cưng"];
const ROOM_FEATURES = ["Giường", "Tủ quần áo", "Bàn làm việc", "Kệ bếp", "Tủ lạnh", "Máy giặt", "Máy lạnh", "Máy nước nóng", "Rèm cửa"];
const VIEWING_DAYS = [
  ["MONDAY", "Thứ 2"],
  ["TUESDAY", "Thứ 3"],
  ["WEDNESDAY", "Thứ 4"],
  ["THURSDAY", "Thứ 5"],
  ["FRIDAY", "Thứ 6"],
  ["SATURDAY", "Thứ 7"],
  ["SUNDAY", "Chủ nhật"],
] as const;
const VIEWING_SLOTS = [
  ["MORNING", "Buổi sáng (08:00–12:00)"],
  ["AFTERNOON", "Buổi chiều (13:00–17:00)"],
  ["EVENING", "Buổi tối (18:00–21:00)"],
] as const;
const RENTAL_MODES: { value: RentalMode; label: string; description: string }[] = [
  { value: "WHOLE_PROPERTY", label: "Nguyên căn / nguyên mặt bằng", description: "Một tin cho toàn bộ bất động sản" },
  { value: "SINGLE_UNIT", label: "Một phòng / một căn", description: "Một tin cho một đơn vị đang cho thuê" },
  { value: "MULTIPLE_UNITS", label: "Nhiều phòng / nhiều căn", description: "Một tin cho nhiều đơn vị cùng địa điểm" },
];
const ALLOWED_RENTAL_MODES: Record<CategoryKey, RentalMode[]> = {
  apartment: ["WHOLE_PROPERTY"],
  house: ["WHOLE_PROPERTY", "SINGLE_UNIT", "MULTIPLE_UNITS"],
  office: ["WHOLE_PROPERTY"],
  commercial: ["WHOLE_PROPERTY"],
  room: ["SINGLE_UNIT", "MULTIPLE_UNITS"],
};
const MAX_IMAGES = 6;
const MAX_VIDEOS = 3;

type SelectedImage = { name: string; dataUrl: string; file: File };
type SelectedVideo = { name: string; file: File };

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject();
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreateMockListingPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [landlordName, setLandlordName] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("room");
  const [rentalMode, setRentalMode] = useState<RentalMode>("SINGLE_UNIT");
  const [unitLabel, setUnitLabel] = useState("phòng");
  const [spacePosition, setSpacePosition] = useState("GROUND_LEVEL");
  const [parkingPolicy, setParkingPolicy] = useState("NONE");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRoomFeatures, setSelectedRoomFeatures] = useState<string[]>([]);
  const [selectedViewingDays, setSelectedViewingDays] = useState<string[]>([]);
  const [selectedViewingSlots, setSelectedViewingSlots] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [createdListingId, setCreatedListingId] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<SelectedVideo[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState("79");
  const [wardCode, setWardCode] = useState("");
  const [provinceQuery, setProvinceQuery] = useState("");
  const [wardQuery, setWardQuery] = useState("");
  const [openLocation, setOpenLocation] = useState<"province" | "ward" | null>(null);
  const [wardLoading, setWardLoading] = useState(true);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let cancelled = false;

    provinceService.getCurrentProvinces()
      .then((data) => {
        if (cancelled) return;
        setProvinces(data);
        const defaultProvince = data.find((province) => String(province.code) === "79") ?? data[0];
        setProvinceCode(String(defaultProvince?.code ?? ""));
        setProvinceQuery(defaultProvince?.name ?? "");
      })
      .catch(() => {
        if (!cancelled) setLocationError("Không tải được danh sách tỉnh/thành. Hãy kiểm tra location-service.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!provinceCode) return;
    let cancelled = false;

    provinceService.getCurrentWardsByProvince(provinceCode)
      .then((data) => {
        if (cancelled) return;
        setWards(data);
        setWardLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWards([]);
        setWardLoading(false);
        setLocationError("Không tải được danh sách phường/xã. Hãy kiểm tra location-service.");
      });

    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  const selectedProvince = provinces.find((province) => String(province.code) === provinceCode);
  const selectedWard = wards.find((ward) => String(ward.code) === wardCode);
  const profileDisplayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || profile?.username;
  const categoryLabel = CATEGORIES.find(([value]) => value === selectedCategory)?.[1] ?? "Nhà cho thuê";
  const availableRentalModes = RENTAL_MODES.filter((mode) => ALLOWED_RENTAL_MODES[selectedCategory].includes(mode.value));
  const isUnitRental = rentalMode !== "WHOLE_PROPERTY";
  const isMultipleUnits = rentalMode === "MULTIPLE_UNITS";

  function defaultUnitLabel(category: CategoryKey) {
    return category === "room" || category === "house" ? "phòng" : category === "commercial" ? "mặt bằng" : category === "apartment" ? "căn" : "đơn vị";
  }

  function handleCategoryChange(category: CategoryKey) {
    setSelectedCategory(category);
    setRentalMode(ALLOWED_RENTAL_MODES[category][0]);
    setUnitLabel(defaultUnitLabel(category));
    setSpacePosition("GROUND_LEVEL");
    setParkingPolicy("NONE");
  }

  function addCustomAmenity() {
    const value = customAmenity.trim();
    if (!value || selectedAmenities.includes(value)) return;
    setSelectedAmenities((current) => [...current, value]);
    setCustomAmenity("");
  }

  function handleProvinceSelect(province: Province) {
    setProvinceCode(String(province.code));
    setProvinceQuery(province.name);
    setWardCode("");
    setWardQuery("");
    setWards([]);
    setWardLoading(true);
    setLocationError("");
    setOpenLocation(null);
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const files = Array.from(event.target.files ?? []).slice(0, remainingSlots);
    event.target.value = "";
    if (!files.length) {
      if (remainingSlots === 0) toast.info(`Bạn đã chọn đủ ${MAX_IMAGES} ảnh.`);
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(readImage));
      setSelectedImages((current) => [
        ...current,
        ...files.map((file, index) => ({ name: file.name, dataUrl: dataUrls[index], file })),
      ]);
    } catch {
      toast.error("Không thể đọc ảnh đã chọn.");
    }
  }

  async function handleVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const remainingSlots = MAX_VIDEOS - selectedVideos.length;
    const files = Array.from(event.target.files ?? []).slice(0, remainingSlots);
    event.target.value = "";
    if (!files.length) {
      if (remainingSlots === 0) toast.info(`Bạn đã chọn đủ ${MAX_VIDEOS} video.`);
      return;
    }

    setSelectedVideos((current) => [
      ...current,
      ...files.map((file) => ({ name: file.name, file })),
    ]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    if (!selectedProvince || !selectedWard) {
      toast.error("Vui lòng chọn tỉnh/thành và phường/xã.");
      setSubmitting(false);
      return;
    }

    if (!selectedViewingDays.length || !selectedViewingSlots.length) {
      toast.error("Vui lòng chọn ngày và buổi có thể xem nhà.");
      setSubmitting(false);
      return;
    }

    if (!ALLOWED_RENTAL_MODES[selectedCategory].includes(rentalMode)) {
      toast.error("Hình thức cho thuê không phù hợp với loại bất động sản đã chọn.");
      setSubmitting(false);
      return;
    }

    const totalUnits = optionalNumber(form, "totalUnits");
    const availableUnits = optionalNumber(form, "availableUnits");
    if (isMultipleUnits && (totalUnits === undefined || availableUnits === undefined || availableUnits > totalUnits)) {
      toast.error("Số phòng/căn còn trống không được lớn hơn tổng số phòng/căn.");
      setSubmitting(false);
      return;
    }

    let listingId = "";
    try {
      const imageUrls: string[] = [];
      for (const image of selectedImages) {
        imageUrls.push(await listingMediaService.uploadImage(image.file));
      }

      const videoUrls: string[] = [];
      for (const video of selectedVideos) {
        videoUrls.push(await listingMediaService.uploadVideo(video.file));
      }

      const listing = await listingService.createDraft({
        title: String(form.get("title") ?? ""),
        category: API_CATEGORIES[selectedCategory],
        priceMonthly: Number(form.get("priceMillion")) * 1_000_000,
        depositAmount: optionalNumber(form, "depositAmount"),
        areaM2: Number(form.get("areaM2")),
        bedrooms: optionalNumber(form, "beds"),
        bathrooms: optionalNumber(form, "baths"),
        address: String(form.get("address") ?? ""),
        provinceCode,
        wardCode,
        description: String(form.get("description") ?? "").trim() || undefined,
        details: {
          provinceName: selectedProvince.name,
          wardName: selectedWard.name,
          landlordName: String(form.get("landlordName") ?? ""),
          phone: String(form.get("phone") ?? ""),
          livingRooms: optionalNumber(form, "livingRooms"),
          kitchens: optionalNumber(form, "kitchens"),
          balconies: optionalNumber(form, "balconies"),
          floor: optionalNumber(form, "floor"),
          totalFloors: optionalNumber(form, "totalFloors"),
          apartmentFloor: optionalNumber(form, "apartmentFloor"),
          buildingTotalFloors: optionalNumber(form, "buildingTotalFloors"),
          hasBalcony: selectedCategory === "apartment" ? form.get("hasBalcony") === "on" : undefined,
          furnishing: optionalText(form, "furnishing"),
          legalStatus: optionalText(form, "legalStatus"),
          parkingPolicy: optionalText(form, "parkingPolicy"),
          parkingFee: parkingPolicy === "PAID" ? optionalNumber(form, "parkingFee") : undefined,
          maxOccupants: optionalNumber(form, "maxOccupants"),
          maxVehicles: optionalNumber(form, "maxVehicles"),
          managementFee: optionalNumber(form, "managementFee"),
          electricityPrice: optionalNumber(form, "electricityPrice"),
          waterPrice: optionalNumber(form, "waterPrice"),
          depositAmount: optionalNumber(form, "depositAmount"),
          minimumLeaseMonths: optionalNumber(form, "minimumLeaseMonths"),
          amenities: selectedAmenities,
          rentalMode,
          unitLabel: optionalText(form, "unitLabel") ?? defaultUnitLabel(selectedCategory),
          totalUnits,
          availableUnits,
          roomFloor: optionalNumber(form, "roomFloor"),
          privateBathroom: selectedCategory === "room" ? "PRIVATE" : optionalText(form, "privateBathroom"),
          hasLoft: selectedCategory === "room" ? form.get("hasLoft") === "on" : undefined,
          roomFurnishing: optionalText(form, "roomFurnishing"),
          roomHasWindow: optionalText(form, "roomHasWindow"),
          roomFeatures: selectedRoomFeatures,
          sharedWithOwner: optionalText(form, "sharedWithOwner"),
          hasRooftopTerrace: selectedCategory === "house" ? form.get("hasRooftopTerrace") === "on" : undefined,
          spacePosition: optionalText(form, "spacePosition"),
          elevator: optionalText(form, "elevator"),
          openingHours: optionalText(form, "openingHours"),
          curfew: optionalText(form, "curfew"),
          sharedKitchen: optionalText(form, "sharedKitchen"),
          sharedParking: optionalText(form, "sharedParking"),
          hasKitchen: optionalText(form, "hasKitchen"),
          viewingDays: selectedViewingDays,
          viewingSlots: selectedViewingSlots,
        },
        imageUrls,
        videoUrls,
      });
      listingId = listing.id;
      await listingService.publish(listing.id);
      setCreatedListingId(listing.id);
      toast.success("Đã tạo và publish tin qua API.");
      setSubmitting(false);
    } catch (error) {
      if (listingId) setCreatedListingId(listingId);
      const message = listingId
        ? `Đã tạo draft ${listingId} nhưng upload ảnh hoặc publish thất bại.`
        : error instanceof Error
          ? error.message
          : "Không thể tạo và publish tin qua API.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Đăng tin cho thuê</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Tin đăng sẽ được tạo và publish trực tiếp qua API.</p>
      </div>

      {createdListingId && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Đã publish tin API với ID: <code className="font-semibold">{createdListingId}</code>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">Thông tin cơ bản</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tiêu đề tin đăng" className="sm:col-span-2">
              <input name="title" required minLength={10} placeholder="Ví dụ: Phòng trọ đầy đủ nội thất gần đại học" className={inputClass} />
            </Field>

            <Field label={`Hình ảnh (${selectedImages.length}/${MAX_IMAGES})`} className="sm:col-span-2">
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                <label
                  htmlFor="listing-images"
                  className="inline-flex cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {selectedImages.length ? "Thêm ảnh" : "Chọn ảnh"}
                </label>
                <input
                  id="listing-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="sr-only"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Tối đa {MAX_IMAGES} ảnh.
                </p>
                {selectedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedImages.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="group relative overflow-hidden rounded-xl border border-border bg-card">
                        <Image src={image.dataUrl} alt={image.name} width={240} height={160} unoptimized className="h-28 w-full object-cover" />
                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                            Ảnh bìa
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={`Xoá ảnh ${index + 1}`}
                          onClick={() => setSelectedImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                          className="absolute right-2 top-2 rounded-full bg-black/65 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label={`Video (${selectedVideos.length}/${MAX_VIDEOS})`} className="sm:col-span-2">
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                <label
                  htmlFor="listing-videos"
                  className="inline-flex cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  {selectedVideos.length ? "Thêm video" : "Chọn video"}
                </label>
                <input
                  id="listing-videos"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={handleVideoChange}
                  className="sr-only"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Video là tùy chọn. Hỗ trợ MP4, WebM, MOV. Tối đa {MAX_VIDEOS} video.
                </p>
                {selectedVideos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedVideos.map((video, index) => (
                      <div key={`${video.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Video className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate text-xs font-medium text-foreground">{video.name}</span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Xoá video ${index + 1}`}
                          onClick={() => setSelectedVideos((current) => current.filter((_, videoIndex) => videoIndex !== index))}
                          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Loại hình">
              <select name="category" value={selectedCategory} onChange={(event) => handleCategoryChange(event.target.value as CategoryKey)} className={inputClass}>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">Hình thức cho thuê</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {availableRentalModes.length === 1 ? "Loại bất động sản này chỉ phù hợp với một hình thức cho thuê." : "Một tin có thể đại diện cho toàn bộ căn nhà hoặc nhiều phòng cùng địa điểm."}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {availableRentalModes.map((mode) => {
              const selected = rentalMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setRentalMode(mode.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-muted/20 hover:border-primary/60"}`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-bold text-foreground">
                    {mode.label}
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{mode.description}</span>
                </button>
              );
            })}
          </div>
          {rentalMode !== "WHOLE_PROPERTY" && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Đơn vị cho thuê">
                <input name="unitLabel" value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)} placeholder="phòng, căn, mặt bằng..." className={inputClass} />
              </Field>
              {rentalMode === "MULTIPLE_UNITS" && <>
                <Field label="Tổng số đơn vị">
                  <input name="totalUnits" required min="1" step="1" type="number" placeholder="Ví dụ: 20 phòng" className={inputClass} />
                </Field>
                <Field label="Số đơn vị còn trống">
                  <input name="availableUnits" required min="0" step="1" type="number" placeholder="Ví dụ: 8 phòng" className={inputClass} />
                </Field>
              </>}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">Tiện ích</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {AMENITIES.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => setSelectedAmenities((current) => selected ? current.filter((item) => item !== amenity) : [...current, amenity])}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-primary"}`}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {amenity}
                </button>
              );
            })}
            {selectedAmenities.filter((amenity) => !AMENITIES.includes(amenity)).map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => setSelectedAmenities((current) => current.filter((item) => item !== amenity))}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Check className="h-3 w-3" />{amenity} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={customAmenity}
              onChange={(event) => setCustomAmenity(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomAmenity(); } }}
              placeholder="Nhập tiện ích khác"
              className={inputClass}
            />
            <button type="button" onClick={addCustomAmenity} className="shrink-0 rounded-xl bg-muted px-4 text-xs font-bold text-foreground hover:bg-muted/80">Thêm</button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">
            {selectedCategory === "house" && isUnitRental ? "Thông tin chi tiết phòng trong nhà" : selectedCategory === "room" ? "Thông tin chi tiết phòng trọ" : `Thông tin chi tiết - ${categoryLabel}`}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Diện tích (m²)">
              <input name="areaM2" required min="1" step="1" type="number" placeholder="Nhập diện tích" className={inputClass} />
            </Field>
            {selectedCategory === "office" && <>
              <Field label="Số nhà vệ sinh">
                <input name="baths" required min="0" step="1" type="number" placeholder="Ví dụ: 1" className={inputClass} />
              </Field>
              <Field label="Khu bếp">
                <select name="hasKitchen" defaultValue="NO" className={inputClass}>
                  <option value="YES">Có khu bếp</option>
                  <option value="NO">Không có khu bếp</option>
                </select>
              </Field>
            </>}
            {(selectedCategory === "apartment" || (selectedCategory === "house" && !isUnitRental)) && <>
              <Field label="Số phòng ngủ">
                <input name="beds" required min="0" step="1" type="number" placeholder="Số phòng ngủ" className={inputClass} />
              </Field>
              <Field label="Số phòng tắm">
                <input name="baths" required min="0" step="1" type="number" placeholder="Số phòng tắm" className={inputClass} />
              </Field>
            </>}
            {selectedCategory === "house" && isUnitRental && <>
              <Field label="Ở chung với chủ nhà">
                <select name="sharedWithOwner" defaultValue="NO" className={inputClass}>
                  <option value="YES">Có</option>
                  <option value="NO">Không</option>
                </select>
              </Field>
            </>}
            {(selectedCategory === "apartment" || (selectedCategory === "house" && !isUnitRental)) && <>
              <Field label="Số phòng khách">
                <input name="livingRooms" min="0" step="1" type="number" placeholder="Số phòng khách" className={inputClass} />
              </Field>
              <Field label="Số phòng bếp">
                <input name="kitchens" min="0" step="1" type="number" placeholder="Số phòng bếp" className={inputClass} />
              </Field>
              {selectedCategory === "apartment" ? <Field label="Ban công">
                <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground">
                  <input name="hasBalcony" type="checkbox" className="h-4 w-4 accent-primary" />
                  Có ban công
                </label>
              </Field> : <Field label="Sân thượng">
                <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground">
                  <input name="hasRooftopTerrace" type="checkbox" className="h-4 w-4 accent-primary" />
                  Có sân thượng
                </label>
              </Field>}
              <Field label={selectedCategory === "apartment" ? "Tầng căn hộ" : "Tầng số"}>
                <input name={selectedCategory === "apartment" ? "apartmentFloor" : "floor"} min="0" step="1" type="number" placeholder="Ví dụ: 5" className={inputClass} />
              </Field>
              <Field label={selectedCategory === "apartment" ? "Tổng số tầng chung cư" : "Tổng số tầng"}>
                <input name={selectedCategory === "apartment" ? "buildingTotalFloors" : "totalFloors"} min="0" step="1" type="number" placeholder="Ví dụ: 20" className={inputClass} />
              </Field>
            </>}
            {(selectedCategory === "apartment" || (selectedCategory === "house" && !isUnitRental)) && <Field label="Tình trạng nội thất">
              <select name="furnishing" defaultValue="NONE" className={inputClass}>
                <option value="NONE">Chưa nội thất</option>
                <option value="BASIC">Nội thất cơ bản</option>
                <option value="FULL">Đầy đủ nội thất</option>
              </select>
            </Field>}
            {(selectedCategory === "apartment" || (selectedCategory === "house" && !isUnitRental)) && <Field label="Giấy tờ pháp lý">
              <select name="legalStatus" defaultValue="NONE" className={inputClass}>
                <option value="NONE">Chưa cập nhật</option>
                <option value="PINK_BOOK">Sổ hồng / sổ đỏ</option>
                <option value="CONTRACT">Hợp đồng mua bán</option>
              </select>
            </Field>}
            {(selectedCategory === "room" || (selectedCategory === "house" && isUnitRental)) && <>
              <Field label="Tầng của phòng">
                <input name="roomFloor" min="0" step="1" type="number" placeholder="Ví dụ: 2" className={inputClass} />
              </Field>
              {selectedCategory === "house" && <Field label="WC của phòng">
                <select name="privateBathroom" defaultValue="PRIVATE" className={inputClass}>
                  <option value="PRIVATE">WC riêng trong phòng</option>
                  <option value="SHARED">WC dùng chung</option>
                </select>
              </Field>}
              <Field label="Nội thất trong phòng">
                <select name="roomFurnishing" defaultValue="BASIC" className={inputClass}>
                  <option value="NONE">Không nội thất</option>
                  <option value="BASIC">Nội thất cơ bản</option>
                  <option value="FULL">Đầy đủ nội thất</option>
                </select>
              </Field>
              <Field label="Phòng có cửa sổ / ban công">
                <select name="roomHasWindow" defaultValue="YES" className={inputClass}>
                  <option value="YES">Có</option>
                  <option value="NO">Không</option>
                </select>
              </Field>
              <Field label="Nội thất có sẵn trong phòng" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {ROOM_FEATURES.map((feature) => {
                    const selected = selectedRoomFeatures.includes(feature);
                    return (
                      <button
                        key={feature}
                        type="button"
                        onClick={() => setSelectedRoomFeatures((current) => selected ? current.filter((item) => item !== feature) : [...current, feature])}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-primary"}`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {feature}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>}
            {(selectedCategory === "office" || selectedCategory === "commercial") && <>
              <Field label="Vị trí không gian">
                <select name="spacePosition" value={spacePosition} onChange={(event) => setSpacePosition(event.target.value)} className={inputClass}>
                  <option value="GROUND_LEVEL">Mặt đất / tầng trệt</option>
                  <option value="BUILDING_FLOOR">Một tầng trong tòa nhà</option>
                </select>
              </Field>
              {spacePosition === "BUILDING_FLOOR" && <>
                <Field label="Tầng đang cho thuê">
                  <input name="floor" min="0" step="1" type="number" placeholder="Ví dụ: 5" className={inputClass} />
                </Field>
                <Field label="Tổng số tầng tòa nhà">
                  <input name="totalFloors" min="0" step="1" type="number" placeholder="Ví dụ: 12" className={inputClass} />
                </Field>
                <Field label="Tòa nhà có thang máy">
                  <select name="elevator" defaultValue="YES" className={inputClass}>
                    <option value="YES">Có</option>
                    <option value="NO">Không</option>
                  </select>
                </Field>
              </>}
            </>}
            {(selectedCategory === "house" || selectedCategory === "room") ? <>
              <Field label="Chính sách phí gửi xe">
                <select name="parkingPolicy" value={parkingPolicy} onChange={(event) => setParkingPolicy(event.target.value)} className={inputClass}>
                  <option value="NONE">Không thu phí gửi xe</option>
                  <option value="PAID">Có thu phí gửi xe</option>
                </select>
              </Field>
              {parkingPolicy === "PAID" && <Field label="Phí gửi xe (VNĐ/tháng)">
                <input name="parkingFee" min="0" step="1000" type="number" placeholder="Ví dụ: 150000" className={inputClass} />
              </Field>}
              <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {selectedCategory === "room" && <Field label="Gác lửng">
                  <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground">
                    <input name="hasLoft" type="checkbox" className="h-4 w-4 accent-primary" />
                    Có gác lửng
                  </label>
                </Field>}
                <Field label={isUnitRental ? "Số người tối đa / phòng" : "Số người tối đa"}>
                  <input name="maxOccupants" min="1" step="1" type="number" placeholder={isUnitRental ? "Ví dụ: 2 người" : "Ví dụ: 6 người"} className={inputClass} />
                </Field>
              </div>
              <Field label={isUnitRental ? "Số xe tối đa / phòng" : "Số xe tối đa"}>
                <input name="maxVehicles" min="0" step="1" type="number" placeholder={isUnitRental ? "Ví dụ: 2 xe" : "Ví dụ: 4 xe"} className={inputClass} />
              </Field>
            </> : <Field label="Phí gửi xe (VNĐ/tháng)">
              <input name="parkingFee" min="0" step="1000" type="number" placeholder="Ví dụ: 150000" className={inputClass} />
            </Field>}
            {(selectedCategory === "apartment" || selectedCategory === "office" || selectedCategory === "commercial") && <Field label={selectedCategory === "apartment" ? "Phí quản lý chung cư (VNĐ/tháng)" : "Phí quản lý (VNĐ/tháng)"}>
              <div>
                <input name="managementFee" min="0" step="1000" type="number" placeholder="Ví dụ: 500000" className={inputClass} />
                {selectedCategory === "apartment" && <p className="mt-1.5 text-[11px] text-muted-foreground">Khoản phí tòa nhà thu hàng tháng, không bao gồm trong giá thuê.</p>}
              </div>
            </Field>}
            <Field label="Giá điện (VNĐ/kWh)">
              <input name="electricityPrice" min="0" step="100" type="number" placeholder="Ví dụ: 3500" className={inputClass} />
            </Field>
            <Field label="Giá nước (VNĐ/m³)">
              <input name="waterPrice" min="0" step="100" type="number" placeholder="Ví dụ: 25000" className={inputClass} />
            </Field>
          </div>
        </section>

        {selectedCategory === "house" && isUnitRental && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
            <h2 className="text-base font-bold text-foreground">Thông tin tổng thể căn nhà</h2>
            <p className="mt-1 text-xs text-muted-foreground">Các thông tin dùng chung cho những phòng đang cho thuê trong căn nhà.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Số phòng khách dùng chung">
                <input name="livingRooms" min="0" step="1" type="number" placeholder="Ví dụ: 1" className={inputClass} />
              </Field>
              <Field label="Số phòng bếp dùng chung">
                <input name="kitchens" min="0" step="1" type="number" placeholder="Ví dụ: 1" className={inputClass} />
              </Field>
              <Field label="Sân thượng">
                <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground">
                  <input name="hasRooftopTerrace" type="checkbox" className="h-4 w-4 accent-primary" />
                  Có sân thượng
                </label>
              </Field>
              <Field label="Tổng số tầng căn nhà">
                <input name="totalFloors" min="0" step="1" type="number" placeholder="Ví dụ: 3" className={inputClass} />
              </Field>
              <Field label="Tình trạng nội thất chung">
                <select name="furnishing" defaultValue="NONE" className={inputClass}>
                  <option value="NONE">Không nội thất</option>
                  <option value="BASIC">Nội thất cơ bản</option>
                  <option value="FULL">Đầy đủ nội thất</option>
                </select>
              </Field>
              <Field label="Giấy tờ pháp lý">
                <select name="legalStatus" defaultValue="NONE" className={inputClass}>
                  <option value="NONE">Chưa cập nhật</option>
                  <option value="PINK_BOOK">Sổ hồng / sổ đỏ</option>
                  <option value="CONTRACT">Hợp đồng mua bán</option>
                </select>
              </Field>
            </div>
          </section>
        )}

        {selectedCategory === "room" && isMultipleUnits && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
            <h2 className="text-base font-bold text-foreground">Thông tin tổng thể dãy trọ</h2>
            <p className="mt-1 text-xs text-muted-foreground">Thông tin áp dụng chung cho toàn bộ khu trọ, không lặp lại ở từng phòng.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tổng số tầng dãy trọ">
                <input name="totalFloors" min="0" step="1" type="number" placeholder="Ví dụ: 3" className={inputClass} />
              </Field>
              <Field label="Giờ mở cửa / ra vào">
                <input name="openingHours" placeholder="Ví dụ: Tự do 24/7" className={inputClass} />
              </Field>
              <Field label="Giờ giới nghiêm">
                <input name="curfew" placeholder="Ví dụ: Không giới nghiêm" className={inputClass} />
              </Field>
              <Field label="Khu trọ có bếp dùng chung">
                <select name="sharedKitchen" defaultValue="NO" className={inputClass}>
                  <option value="YES">Có</option>
                  <option value="NO">Không</option>
                </select>
              </Field>
              <Field label="Khu trọ có chỗ để xe chung">
                <select name="sharedParking" defaultValue="YES" className={inputClass}>
                  <option value="YES">Có</option>
                  <option value="NO">Không</option>
                </select>
              </Field>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">Giá &amp; điều kiện thuê</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Giá thuê (triệu/tháng)">
              <input name="priceMillion" required min="0.1" step="0.1" type="number" placeholder="Nhập giá thuê" className={inputClass} />
            </Field>
            <Field label="Số tiền cọc (VNĐ)">
              <input name="depositAmount" min="0" step="100000" type="number" placeholder="Ví dụ: 7000000" className={inputClass} />
            </Field>
            <Field label="Thời hạn thuê tối thiểu (tháng)">
              <input name="minimumLeaseMonths" min="1" step="1" type="number" defaultValue="6" className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">Vị trí</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Địa chỉ">
              <input name="address" required placeholder="12 Nguyễn Huệ" className={inputClass} />
            </Field>
            <Field label="Tỉnh / Thành phố">
              <SearchableLocationField
                name="provinceName"
                placeholder="Tìm tỉnh/thành phố..."
                value={provinceQuery}
                onChange={(value) => {
                  setProvinceQuery(value);
                  if (value !== selectedProvince?.name) {
                    setProvinceCode("");
                    setWardCode("");
                    setWardQuery("");
                    setWards([]);
                  }
                }}
                open={openLocation === "province"}
                onOpen={() => {
                  setOpenLocation("province");
                  setProvinceQuery("");
                }}
                options={provinces.filter((province) => matchesLocation(province, provinceQuery))}
                selectedCode={provinceCode}
                onSelect={handleProvinceSelect}
                disabled={!provinces.length}
                emptyText="Không tìm thấy tỉnh/thành phố"
              />
            </Field>
            <Field label="Phường / Xã">
              <SearchableLocationField
                name="wardCode"
                placeholder={wardLoading ? "Đang tải phường/xã..." : "Tìm phường/xã..."}
                value={wardQuery}
                onChange={setWardQuery}
                open={openLocation === "ward"}
                onOpen={() => {
                  setOpenLocation("ward");
                  setWardQuery("");
                }}
                options={wards.filter((ward) => matchesLocation(ward, wardQuery))}
                selectedCode={wardCode}
                onSelect={(ward) => {
                  setWardCode(String(ward.code));
                  setWardQuery(ward.name);
                  setOpenLocation(null);
                }}
                disabled={wardLoading || !wards.length}
                emptyText="Không tìm thấy phường/xã"
              />
            </Field>
            {locationError && <p className="sm:col-span-2 text-xs text-destructive">{locationError}</p>}
            <Field label="Mô tả chi tiết" className="sm:col-span-2">
              <textarea name="description" rows={5} placeholder="Mô tả nội thất, tiện ích, điều kiện thuê..." className={`${inputClass} h-auto py-3`} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Thông tin liên hệ</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tên người đăng">
              <input name="landlordName" value={landlordName ?? profileDisplayName ?? "Bạn"} onChange={(event) => setLandlordName(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Số điện thoại">
              <input name="phone" inputMode="tel" placeholder="0901234567" className={inputClass} />
            </Field>
          </div>
          <div className="mt-6 space-y-4 border-t border-border pt-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Lịch xem nhà</h3>
              <p className="mt-1 text-xs text-muted-foreground">Chọn các ngày và buổi bạn thường sẵn sàng để người thuê chủ động hẹn lịch.</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Ngày trong tuần</p>
              <div className="flex flex-wrap gap-2">
                {VIEWING_DAYS.map(([value, label]) => {
                  const selected = selectedViewingDays.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedViewingDays((current) => selected ? current.filter((item) => item !== value) : [...current, value])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-primary"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Buổi có thể xem</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {VIEWING_SLOTS.map(([value, label]) => {
                  const selected = selectedViewingSlots.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedViewingSlots((current) => selected ? current.filter((item) => item !== value) : [...current, value])}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-primary"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-foreground hover:bg-muted">Hủy</button>
          <button type="submit" disabled={submitting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? "Đang publish..." : "Tạo & publish API"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background";

function optionalNumber(form: FormData, name: string) {
  const raw = String(form.get(name) ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function optionalText(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value || undefined;
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`space-y-1.5 ${className ?? ""}`}><span className="block text-xs font-semibold text-foreground">{label}</span>{children}</label>;
}

type LocationOption = { code: string | number; name: string; full_name?: string };

function matchesLocation(option: LocationOption, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${option.name} ${option.full_name ?? ""}`.toLowerCase().includes(normalizedQuery);
}

function SearchableLocationField({
  name,
  placeholder,
  value,
  onChange,
  open,
  onOpen,
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
  options: LocationOption[];
  selectedCode: string;
  onSelect: (option: LocationOption) => void;
  disabled: boolean;
  emptyText: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name={name}
        value={value}
        required
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={onOpen}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-9 pr-9`}
      />
      <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
          {options.length ? options.map((option) => (
            <button
              key={option.code}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-muted ${String(option.code) === selectedCode ? "bg-primary/10 text-primary" : "text-foreground"}`}
            >
              <span className="truncate">{option.name}</span>
              {String(option.code) === selectedCode && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          )) : (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">{emptyText}</p>
          )}
        </div>
      )}
    </div>
  );
}
