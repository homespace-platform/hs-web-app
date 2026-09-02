import type { RentPropertyItem } from "@/types/rent.type";

export type RentDetailItem = { label: string; value: string };
export type RentDetailSection = { title: string; items: RentDetailItem[] };

const DIRECTION_LABELS: Record<string, string> = {
  EAST: "Đông",
  WEST: "Tây",
  SOUTH: "Nam",
  NORTH: "Bắc",
  SOUTH_EAST: "Đông Nam",
  NORTH_EAST: "Đông Bắc",
  SOUTH_WEST: "Tây Nam",
  NORTH_WEST: "Tây Bắc",
};

const FURNISHING_LABELS: Record<string, string> = {
  UNFURNISHED: "Không nội thất (Bàn giao thô)",
  BASIC: "Nội thất cơ bản",
  PARTIALLY_FURNISHED: "Nội thất bán phần",
  FULLY_FURNISHED: "Đầy đủ nội thất",
  LUXURY: "Nội thất cao cấp",
};

const LEGAL_LABELS: Record<string, string> = {
  NONE: "Chưa cập nhật",
  PINK_BOOK: "Sổ hồng / Sổ đỏ",
  CONTRACT: "Hợp đồng mua bán",
  PENDING: "Đang chờ cấp sổ",
  OTHER: "Giấy tờ hợp lệ khác",
};

const CHARGE_TYPE_LABELS: Record<string, string> = {
  ELECTRICITY: "Tiền điện",
  WATER: "Tiền nước",
  MANAGEMENT: "Phí quản lý",
  INTERNET: "Internet / Wifi",
  SERVICE_OR_GARBAGE: "Phí dịch vụ & rác",
  MOTORBIKE_PARKING: "Phí gửi xe máy",
  CAR_PARKING: "Phí gửi ô tô",
  OVERTIME_AIR_CONDITIONING: "Điều hòa ngoài giờ",
  OTHER: "Chi phí khác",
};

const BILLING_METHOD_LABELS: Record<string, string> = {
  PER_KWH: "đ/kWh",
  STATE_WATER_RATE: "Theo giá nhà nước",
  PER_M3: "đ/m³",
  PER_PERSON_MONTH: "đ/người/tháng",
  PER_MONTH: "đ/tháng",
  PER_M2_MONTH: "đ/m²/tháng",
  PER_VEHICLE_MONTH: "đ/xe/tháng",
  PER_HOUR: "đ/giờ",
  FREE: "Miễn phí",
  INCLUDED: "Đã gồm trong giá thuê",
  NOT_APPLICABLE: "Không áp dụng",
  NEGOTIABLE: "Thỏa thuận",
  CUSTOM: "Theo thực tế",
};

const PAYMENT_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "1 tháng/lần (Hàng tháng)",
  EVERY_2_MONTHS: "2 tháng/lần",
  QUARTERLY: "3 tháng/lần (Theo quý)",
  EVERY_6_MONTHS: "6 tháng/lần",
  NEGOTIABLE: "Thỏa thuận với chủ nhà",
};

const DEPOSIT_TYPE_LABELS: Record<string, string> = {
  NONE: "Không cần đặt cọc",
  FIXED_AMOUNT: "Số tiền cố định",
  MONTH_COUNT: "Theo số tháng thuê",
  NEGOTIABLE: "Thỏa thuận",
};

export function getRentDetailSections(
  property: Pick<RentPropertyItem, "category" | "details">,
): RentDetailSection[] {
  const details = property.details ?? {};
  const pricing = (details.pricing as Record<string, unknown>) ?? {};
  const charges = Array.isArray(details.charges) ? (details.charges as Record<string, unknown>[]) : [];

  // 1. Category-specific specification section
  const categoryItems: Record<string, RentDetailItem[]> = {
    apartment: [
      detail("Tên dự án / Chung cư", details.projectName),
      detail("Tòa nhà / Block", details.buildingBlock),
      detail("Mã căn hộ", details.unitCode),
      detail("Tầng số", details.floorNumber),
      detail("Tổng số tầng tòa nhà", details.buildingTotalFloors, " tầng"),
      detail("Số phòng ngủ", details.bedroomCount, " phòng"),
      detail("Số phòng vệ sinh", details.bathroomCount, " phòng"),
      detail("Phòng khách", details.livingRoomCount, " phòng"),
      detail("Phòng bếp", details.kitchenCount, " phòng"),
      detail("Tình trạng nội thất", label(details.furnishingStatus, FURNISHING_LABELS)),
      detail("Hướng cửa chính", label(details.mainDoorDirection, DIRECTION_LABELS)),
      detail("Hướng ban công", label(details.balconyDirection, DIRECTION_LABELS)),
      detail("Tầm nhìn / View", details.viewDescription),
      detail("Số người ở tối đa", details.maxOccupants, " người"),
      detail("Giấy tờ pháp lý", label(details.legalStatus, LEGAL_LABELS)),
    ],
    house: [
      detail("Diện tích đất", details.landAreaM2, " m²"),
      detail("Mặt tiền", details.frontageWidthM, " m"),
      detail("Chiều dài", details.lengthM, " m"),
      detail("Độ rộng đường/hẻm", details.accessRoadWidthM, " m"),
      detail("Số mặt tiền", details.frontageCount, " mặt tiền"),
      detail("Tổng số tầng", details.totalFloors, " tầng"),
      detail("Số phòng ngủ", details.bedroomCount, " phòng"),
      detail("Số phòng tắm / WC", details.bathroomCount, " phòng"),
      detail("Phòng khách", details.livingRoomCount, " phòng"),
      detail("Phòng bếp", details.kitchenCount, " phòng"),
      detail("Sân thượng", booleanLabel(details.hasRooftop)),
      detail("Garage để xe", booleanLabel(details.hasGarage)),
      detail("Lối đi", label(details.accessType, { PRIVATE: "Riêng biệt", SHARED: "Chung" })),
      detail("Tình trạng nội thất", label(details.furnishingStatus, FURNISHING_LABELS)),
      detail("Số người ở tối đa", details.maxOccupants, " người"),
      detail("Số xe máy tối đa", details.maxVehicles, " xe"),
      detail("Pháp lý", label(details.legalStatus, LEGAL_LABELS)),
      detail("Phạm vi cho thuê", details.rentalScopeDescription),
      detail(
        "Tầng cho thuê",
        details.rentedFloorFrom && details.rentedFloorTo
          ? `Từ tầng ${details.rentedFloorFrom} đến tầng ${details.rentedFloorTo}`
          : ""
      ),
    ],
    office: [
      detail("Tên tòa nhà", details.buildingName),
      detail(
        "Hạng văn phòng",
        label(details.officeGrade, {
          GRADE_A: "Văn phòng Hạng A",
          GRADE_B: "Văn phòng Hạng B",
          GRADE_C: "Văn phòng Hạng C",
          ECONOMY: "Văn phòng Tiết kiệm / Tư nhân",
        })
      ),
      detail("Tầng cho thuê", details.floorNumber),
      detail(
        "Tình trạng bàn giao",
        label(details.handoverStatus, {
          RAW: "Bàn giao thô",
          BASIC: "Hoàn thiện cơ bản",
          FULL: "Đầy đủ nội thất",
        })
      ),
      detail("Số chỗ ngồi dự kiến", details.expectedSeats, " chỗ"),
      detail("Diện tích chia nhỏ tối thiểu", details.minimumDivisibleAreaM2, " m²"),
      detail("Số phòng vệ sinh", details.restroomCount, " phòng"),
      detail(
        "Hệ thống vệ sinh",
        label(details.restroomType, { PRIVATE: "Riêng từng khu vực", SHARED: "Dùng chung cả tầng" })
      ),
      detail(
        "Khu vực Pantry",
        label(details.pantryType, { PRIVATE: "Riêng biệt", SHARED: "Dùng chung", NONE: "Không có" })
      ),
      detail("Chỗ gửi ô tô", details.carParkingCapacity, " xe"),
      detail("Chỗ gửi xe máy", details.motorbikeParkingCapacity, " xe"),
      detail(
        "Chế độ hoạt động",
        label(details.operatingMode, { ALWAYS_OPEN: "Tự do 24/7", CUSTOM_SCHEDULE: "Theo giờ quy định" })
      ),
    ],
    commercial: [
      detail(
        "Vị trí mặt bằng",
        label(details.positionType, {
          GROUND_FLOOR: "Mặt đất / Tầng trệt",
          UPPER_FLOOR: "Tầng lầu",
          SHOPPING_MALL: "Trong trung tâm thương mại",
          OTHER: "Khác",
        })
      ),
      detail("Chiều ngang mặt tiền", details.frontageWidthM, " m"),
      detail("Chiều dài", details.lengthM, " m"),
      detail("Độ rộng mặt đường", details.roadWidthM, " m"),
      detail("Số mặt tiền", details.frontageCount, " mặt tiền"),
      detail("Số tầng cho thuê", details.rentedFloorCount, " tầng"),
      detail("Gác lửng", booleanLabel(details.hasMezzanine)),
      detail("Số phòng vệ sinh", details.restroomCount, " phòng"),
      detail("Lối đi", label(details.accessType, { PRIVATE: "Riêng biệt", SHARED: "Chung" })),
      detail(
        "Chỗ để xe",
        label(details.parkingType, {
          NONE: "Không có",
          MOTORBIKE: "Xe máy",
          CAR: "Ô tô",
          MOTORBIKE_AND_CAR: "Cả xe máy & ô tô",
        })
      ),
      detail("Tình trạng bàn giao", details.handoverStatus),
      detail("Điện 3 pha", booleanLabel(details.hasThreePhasePower)),
      detail("PCCC tiêu chuẩn", booleanLabel(details.hasStandardFireSafety)),
      detail("Ngành nghề hạn chế", details.restrictedBusinesses),
      detail("Khu vực bốc xếp hàng", details.loadingAreaDescription),
      detail("Giờ hoạt động", details.operatingHoursDescription),
    ],
    room: [
      detail("Mã / Tên phòng", details.roomCode),
      detail("Tầng", details.floorNumber),
      detail(
        "Nhà vệ sinh",
        label(details.restroomType, {
          PRIVATE: "Khép kín trong phòng (Riêng)",
          SHARED: "Dùng chung ngoài phòng",
        })
      ),
      detail(
        "Khu bếp",
        label(details.kitchenType, {
          PRIVATE: "Bếp riêng trong phòng",
          SHARED: "Bếp dùng chung",
          NONE: "Không nấu ăn",
        })
      ),
      detail("Cửa sổ thoáng", booleanLabel(details.hasWindow)),
      detail("Ban công riêng", booleanLabel(details.hasBalcony)),
      detail("Gác lửng", booleanLabel(details.hasMezzanine)),
      detail("Nội thất phòng", label(details.furnishingStatus, FURNISHING_LABELS)),
      detail("Lối đi", label(details.accessType, { PRIVATE: "Lối đi riêng", SHARED: "Chung chủ" })),
      detail(
        "Giờ giấc",
        label(details.accessHoursType, { FLEXIBLE: "Tự do 24/7", CURFEW: "Có giờ giới nghiêm" })
      ),
      detail(
        "Đồng hồ điện",
        label(details.electricMeterType, { PRIVATE: "Công tơ riêng", SHARED: "Tính chung theo đầu người" })
      ),
      detail(
        "Đồng hồ nước",
        label(details.waterMeterType, { PRIVATE: "Đồng hồ riêng", SHARED: "Tính chung theo đầu người" })
      ),
      detail("Số người ở tối đa", details.maxOccupants, " người"),
      detail("Số xe tối đa", details.maxVehicles, " xe"),
      detail(
        "Chính sách gửi xe",
        label(details.parkingPolicy, {
          FREE: "Miễn phí gửi xe",
          PAID: "Có thu phí gửi xe",
          NONE: "Không nhận giữ xe",
        })
      ),
    ],
  };

  const sections: RentDetailSection[] = [];

  // 1. Add specific category section
  const currentCategoryItems = categoryItems[property.category] || [];
  const cleanedCatItems = clean(currentCategoryItems);
  if (cleanedCatItems.length > 0) {
    sections.push({
      title: categoryTitle(property.category),
      items: cleanedCatItems,
    });
  }

  // 2. Chi phí hàng tháng (Dynamic charges from DB)
  if (charges.length > 0) {
    const chargeItems: RentDetailItem[] = charges.map((c) => {
      const typeLabel = c.customName || CHARGE_TYPE_LABELS[String(c.chargeType)] || String(c.chargeType);
      if (c.includedInRent) {
        return { label: String(typeLabel), value: "Đã bao gồm trong giá thuê" };
      }
      const method = BILLING_METHOD_LABELS[String(c.billingMethod)] || String(c.billingMethod);
      if (c.amount != null) {
        const formattedMoney = new Intl.NumberFormat("vi-VN").format(Number(c.amount));
        return { label: String(typeLabel), value: `${formattedMoney} ${method}` };
      }
      return { label: String(typeLabel), value: method };
    });

    sections.push({
      title: "Bảng chi phí hàng tháng",
      items: clean(chargeItems),
    });
  }

  // 3. Giá & Điều kiện thuê (From pricing)
  const leaseItems: RentDetailItem[] = [
    detail(
      "Hình thức đặt cọc",
      label(pricing.depositType, DEPOSIT_TYPE_LABELS)
    ),
    detail(
      "Tiền cọc",
      pricing.depositAmount ? pricing.depositAmount : details.depositAmount,
      "",
      true
    ),
    detail(
      "Số tháng đặt cọc",
      pricing.depositMonths ? `${pricing.depositMonths} tháng` : ""
    ),
    detail(
      "Chu kỳ thanh toán",
      label(pricing.paymentCycle, PAYMENT_CYCLE_LABELS)
    ),
    detail("Thời hạn thuê tối thiểu", pricing.minimumLeaseMonths, " tháng"),
    detail(
      "Giá thuê có thương lượng",
      pricing.negotiable === true ? "Có thể thương lượng" : pricing.negotiable === false ? "Không thương lượng" : ""
    ),
    detail(
      "Phí quản lý",
      pricing.managementFeeIncluded === true ? "Đã bao gồm trong tiền thuê" : pricing.managementFeeIncluded === false ? "Chưa bao gồm" : ""
    ),
    detail(
      "Thuế VAT",
      pricing.vatIncluded === true ? "Đã bao gồm thuế VAT" : pricing.vatIncluded === false ? "Chưa bao gồm thuế VAT" : ""
    ),
    detail("Ngày có thể dọn vào", details.availableFrom),
  ];

  const cleanedLease = clean(leaseItems);
  if (cleanedLease.length > 0) {
    sections.push({
      title: "Giá & Điều kiện thuê",
      items: cleanedLease,
    });
  }

  return sections;
}

function categoryTitle(category: RentPropertyItem["category"]) {
  return {
    apartment: "Thông tin chi tiết căn hộ",
    house: "Thông tin nhà ở & kiến trúc",
    room: "Thông tin phòng trọ & sinh hoạt",
    studio: "Thông tin căn hộ studio",
    commercial: "Thông tin mặt bằng kinh doanh",
    office: "Thông số văn phòng & tòa nhà",
    villa: "Thông tin biệt thự",
  }[category] || "Thông số bất động sản";
}

function detail(labelText: string, value: unknown, suffix = "", money = false): RentDetailItem {
  if (value === undefined || value === null || value === "") return { label: labelText, value: "" };
  if (money) return { label: labelText, value: `${new Intl.NumberFormat("vi-VN").format(Number(value))} VNĐ${suffix}` };
  return { label: labelText, value: `${value}${suffix}` };
}

function booleanLabel(value: unknown) {
  if (value === true) return "Có";
  if (value === false) return "Không";
  return "";
}

function label(value: unknown, labels: Record<string, string>) {
  return typeof value === "string" ? labels[value] ?? value : "";
}

function clean(items: RentDetailItem[]) {
  return items.filter((item) => item.value && item.value.trim() !== "");
}
