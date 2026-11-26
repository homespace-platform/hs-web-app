// Server only: imported by app/api/listing-description/route.ts. Swap this for a real AI call later.
import type { ListingDescriptionRequest } from "@/types/listing-description.type";
import { contractPropertyFeatureValue } from "@/lib/contract-property-feature-labels";
import { formatVndInput } from "@/lib/vnd-input";
import { CLOSINGS, GREETINGS, TEMPLATES } from "./templates";

/** Same limit as CreateListingRequest.description in the listing service. */
export const MAX_DESCRIPTION_LENGTH = 5000;

const PRICE_UNITS = { MONTH: "tháng", ROOM_MONTH: "phòng/tháng", PERSON_MONTH: "người/tháng", M2_MONTH: "mét vuông/tháng" };
const PRIVATE_SHARED = ["PRIVATE", "SHARED"];
const DIRECTIONS = ["EAST", "WEST", "SOUTH", "NORTH", "SOUTH_EAST", "NORTH_EAST", "SOUTH_WEST", "NORTH_WEST"];
const ENUMS: Record<string, string[]> = {
  priceUnit: Object.keys(PRICE_UNITS),
  depositType: ["NONE", "FIXED_AMOUNT", "MONTH_COUNT"],
  furnishingStatus: ["UNFURNISHED", "BASIC", "PARTIALLY_FURNISHED", "FULLY_FURNISHED", "LUXURY"],
  doorDirection: DIRECTIONS,
  balconyDirection: DIRECTIONS,
  accessType: PRIVATE_SHARED,
  restroomType: PRIVATE_SHARED,
  kitchenType: [...PRIVATE_SHARED, "NONE"],
  balconyType: [...PRIVATE_SHARED, "NONE"],
  accessHoursType: ["FLEXIBLE", "CURFEW"],
  electricMeterType: PRIVATE_SHARED,
  waterMeterType: PRIVATE_SHARED,
  parkingPolicy: ["FREE", "PAID", "NONE"],
};
const NUMBERS = ["areaM2", "price", "depositAmount", "depositMonths", "minimumLeaseMonths", "maxOccupants", "maxVehicles",
  "totalFloors", "floorNumber", "bedrooms", "bathrooms", "livingRooms", "kitchens", "landAreaM2", "frontageWidthM",
  "lengthM", "roadWidthM", "frontageCount"];
const STRINGS = ["availableFrom", "street", "ward", "city", "projectName", "buildingBlock", "view", "roomCode", "previousTemplateId"];
const BOOLEANS = ["negotiable", "hasRooftop", "hasGarage", "hasWindow", "hasMezzanine"];

const blank = (v: unknown) => v === undefined || v === null || v === "";
const isNumber = (v: unknown) => (typeof v === "number" || (typeof v === "string" && /^\d+(\.\d+)?$/.test(v.trim())))
  && Number(v) >= 0 && Number(v) <= 1e13;
const isText = (v: unknown, max = 255) => typeof v === "string" && v.length <= max;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Returns a short Vietnamese error message, or null when the body is usable. */
export function validateRequest(body: unknown): string | null {
  if (!isObject(body)) return "Dữ liệu gửi lên không hợp lệ.";
  if (!["ROOM", "APARTMENT", "HOUSE"].includes(body.category as string)) return "Loại hình không hợp lệ.";
  const invalid = (field: string) => `Trường ${field} không hợp lệ.`;
  for (const k of NUMBERS) if (!blank(body[k]) && !isNumber(body[k])) return invalid(k);
  for (const k of STRINGS) if (!blank(body[k]) && !isText(body[k])) return invalid(k);
  for (const k of BOOLEANS) if (body[k] != null && typeof body[k] !== "boolean") return invalid(k);
  for (const k in ENUMS) if (!blank(body[k]) && !ENUMS[k].includes(body[k] as string)) return invalid(k);
  const list = (key: string, max: number, ok: (item: unknown) => boolean) => {
    const v = body[key];
    return v == null || (Array.isArray(v) && v.length <= max && v.every(ok));
  };
  if (!list("amenities", 50, (a) => isText(a))) return invalid("amenities");
  if (!list("furnishings", 100, (f) => isObject(f) && isText(f.name) && (blank(f.quantity) || isNumber(f.quantity)))) return invalid("furnishings");
  if (!list("charges", 40, (c) => isObject(c) && isText(c.type, 40) && isText(c.method, 40)
    && (blank(c.amount) || isNumber(c.amount)) && (blank(c.name) || isText(c.name)))) return invalid("charges");

  const required = ["priceUnit", "depositType", "furnishingStatus"];
  const positive = ["areaM2", "price", "minimumLeaseMonths"];
  if (body.depositType === "FIXED_AMOUNT") positive.push("depositAmount");
  if (body.depositType === "MONTH_COUNT") positive.push("depositMonths");
  if (body.category === "ROOM") { required.push("roomCode", "restroomType"); positive.push("maxOccupants"); }
  if (body.category === "APARTMENT") { required.push("projectName", "floorNumber", "bedrooms"); positive.push("bathrooms"); }
  if (body.category === "HOUSE") positive.push("totalFloors", "bedrooms", "bathrooms");
  const missing = required.find((k) => blank(body[k]) || !String(body[k]).trim())
    ?? positive.find((k) => !(Number(body[k]) > 0));
  return missing ? `Thiếu thông tin bắt buộc: ${missing}.` : null;
}

/** Free text is published as is, so anything that looks like contact data is dropped. */
function clean(value: unknown, max = 100): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max).replace(/[\s.,;:!?]+$/, "");
  return /(\d[\s.\-()]*){9,}|\S@\S|https?:|www\.|zalo/i.test(text) ? "" : text;
}
const decimal = (v: unknown) => Number(v).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const money = (v: unknown) => `${formatVndInput(Math.round(Number(v)))} đ`;
const count = (v: unknown, unit: string) => (Number(v) > 0 ? `${decimal(v)} ${unit}` : "");
const join = (items: (string | false | null | undefined)[], separator = ", ") => items.filter(Boolean).join(separator);
const lowerFirst = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) ? s[0].toLocaleLowerCase("vi-VN") + s.slice(1) : s);
const pick = (map: Record<string, string>, key: unknown) => map[String(key)] ?? "";

const PARKING_AMENITY = /để xe|gửi xe|giữ xe|đỗ xe|đậu xe|bãi xe|parking/i;
type Charge = NonNullable<ListingDescriptionRequest["charges"]>[number];
const isFree = (c: Charge) => c.includedInRent || c.method === "INCLUDED" || c.method === "FREE";

function chargeText(r: ListingDescriptionRequest): string {
  const room = r.category === "ROOM";
  const noParking = room && r.parkingPolicy === "NONE";
  const hasParkingElsewhere = (r.category === "HOUSE" && r.hasGarage) || (r.amenities ?? []).some((a) => PARKING_AMENITY.test(a));
  const units: Record<string, string> = {
    PER_KWH: "kWh", PER_M3: "m³", PER_PERSON_MONTH: "người/tháng", PER_MONTH: room ? "phòng/tháng" : "tháng",
    PER_M2_MONTH: "mét vuông/tháng", PER_VEHICLE_MONTH: "xe/tháng", PER_HOUR: "giờ",
  };
  const names: Record<string, string> = {
    ELECTRICITY: "tiền điện", WATER: "tiền nước", MANAGEMENT: "phí quản lý", INTERNET: "internet",
    SERVICE_OR_GARBAGE: "phí vệ sinh/rác", MOTORBIKE_PARKING: "phí gửi xe máy", CAR_PARKING: "phí gửi ô tô",
  };
  return join((r.charges ?? []).slice(0, 20).map((c) => {
    if (c.type === "MANAGEMENT" && r.category !== "APARTMENT") return "";
    const vehicle = c.type === "MOTORBIKE_PARKING" ? "xe máy" : c.type === "CAR_PARKING" ? "ô tô" : "";
    if (vehicle) {
      if (noParking) return "";
      if (isFree(c)) return room && r.parkingPolicy === "PAID" && vehicle === "xe máy" ? "" : `giữ ${vehicle} miễn phí`;
      // A room parking policy, a garage or a parking amenity contradicts "not accepted": say nothing.
      if (c.method === "NOT_APPLICABLE") return (room && r.parkingPolicy) || hasParkingElsewhere ? "" : `không nhận giữ ${vehicle}`;
    }
    const name = c.type === "OTHER" ? lowerFirst(clean(c.name, 60)) : names[c.type];
    if (!name) return "";
    if (isFree(c)) return `${name} đã gồm trong giá thuê`;
    if (c.method === "NOT_APPLICABLE") return c.type === "INTERNET" ? "internet do người thuê tự đăng ký" : "";
    if (c.method === "STATE_WATER_RATE") return `${name} theo giá nhà nước`;
    return units[c.method] && Number(c.amount) > 0 ? `${name} ${money(c.amount)}/${units[c.method]}` : "";
  }), "; ");
}

function parkingText(r: ListingDescriptionRequest): string {
  if (r.parkingPolicy === "NONE") return "không có chỗ để xe, cần gửi bãi ngoài";
  const stated = pick({ FREE: "chỗ để xe miễn phí", PAID: "chỗ để xe có thu phí hằng tháng" }, r.parkingPolicy);
  const moto = r.charges?.find((c) => c.type === "MOTORBIKE_PARKING");
  if (!moto) return stated;
  const agrees = r.parkingPolicy === "FREE" ? isFree(moto) : !isFree(moto) && moto.method !== "NOT_APPLICABLE";
  return agrees ? stated : ""; // the room's parking policy and its parking fee disagree
}

/** Every value is a phrase built only from the request; "" means "not stated" and drops the sentence using it. */
function facts(r: ListingDescriptionRequest): Record<string, string> {
  const noParking = r.category === "ROOM" && r.parkingPolicy === "NONE";
  const direction = (field: string, code: unknown) => (code ? contractPropertyFeatureValue(field, code) : "");
  const door = direction("hướng cửa chính", r.doorDirection);
  const balcony = direction("hướng ban công", r.balconyDirection);
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r.availableFrom ?? "");
  const street = clean(r.street);
  return {
    area: `${decimal(r.areaM2)} mét vuông`,
    price: `${money(r.price)}/${PRICE_UNITS[r.priceUnit]}`,
    depositClause: r.depositType === "NONE" ? "không cần đặt cọc"
      : r.depositType === "MONTH_COUNT" ? `đặt cọc ${Number(r.depositMonths)} tháng tiền thuê`
      : `đặt cọc ${money(r.depositAmount)}`,
    lease: `${Number(r.minimumLeaseMonths)} tháng`,
    furnishing: r.furnishingStatus === "UNFURNISHED" ? "bàn giao thô, chưa có nội thất"
      : lowerFirst(contractPropertyFeatureValue("tình trạng nội thất", r.furnishingStatus)),
    date: date ? `${date[3]}/${date[2]}/${date[1]}` : "",
    location: join([street.replace(/^Đường /, "đường "), clean(r.ward), clean(r.city)]),
    assets: join((r.furnishings ?? []).slice(0, 20).map((f) => {
      const name = lowerFirst(clean(f.name, 60));
      return name && Number(f.quantity) > 1 ? `${name} (số lượng ${Number(f.quantity)})` : name;
    })),
    amenities: join((r.amenities ?? []).slice(0, 20).map((a) => {
      const name = clean(a, 60);
      // Raw catalog codes are never published.
      return /^[A-Z0-9]+(_[A-Z0-9]+)+$/.test(name) || (noParking && PARKING_AMENITY.test(name)) ? "" : name;
    })),
    fees: chargeText(r),
    occupants: count(r.maxOccupants, "người"),
    vehicles: noParking ? "" : count(r.maxVehicles, "xe"),
    rooms: join([count(r.bedrooms, "phòng ngủ"), count(r.bathrooms, "phòng tắm/WC"),
      count(r.livingRooms, "phòng khách"), count(r.kitchens, "phòng bếp")]),
    // apartment
    project: clean(r.projectName),
    block: clean(r.buildingBlock).replace(/^(tòa|toà|block)\s+/i, ""),
    buildingFloors: count(r.totalFloors, "tầng"),
    directions: join([door && `cửa chính hướng ${door}`, balcony && `ban công hướng ${balcony}`]),
    view: clean(r.view).replace(/^(view|tầm nhìn)\s+/i, ""),
    // apartment and room
    floor: blank(r.floorNumber) ? "" : Number(r.floorNumber) === 0 ? "tầng trệt" : `tầng ${Number(r.floorNumber)}`,
    // house
    floors: count(r.totalFloors, "tầng"),
    dimensions: join([
      Number(r.landAreaM2) > 0 && `diện tích đất ${decimal(r.landAreaM2)} mét vuông`,
      Number(r.frontageWidthM) > 0 && `chiều ngang ${decimal(r.frontageWidthM)} m`,
      Number(r.lengthM) > 0 && `chiều dài ${decimal(r.lengthM)} m`,
      Number(r.roadWidthM) > 0 && `đường/hẻm phía trước rộng ${decimal(r.roadWidthM)} m`,
      Number(r.frontageCount) > 1 && `${Number(r.frontageCount)} mặt tiền`,
    ]),
    extras: join([r.hasRooftop && "sân thượng", r.hasGarage && "garage/sân để xe"], " và "),
    access: pick({ PRIVATE: "lối đi riêng", SHARED: "lối đi chung" }, r.accessType),
    // room
    code: clean(r.roomCode, 60),
    sanitary: pick({ PRIVATE: "nhà vệ sinh riêng khép kín trong phòng", SHARED: "nhà vệ sinh chung ở ngoài phòng" }, r.restroomType),
    kitchen: pick({ PRIVATE: "kệ bếp riêng trong phòng", SHARED: "khu bếp dùng chung", NONE: "không có bếp nấu ăn" }, r.kitchenType),
    comfort: join([
      r.hasWindow === true ? "có cửa sổ" : r.hasWindow === false && "không có cửa sổ",
      pick({ PRIVATE: "có ban công riêng", SHARED: "dùng chung ban công/sân phơi", NONE: "không có ban công" }, r.balconyType),
      r.hasMezzanine && "có gác lửng",
    ]),
    routine: join([
      pick({ PRIVATE: "lối đi riêng", SHARED: "lối đi chung với chủ nhà" }, r.accessType),
      pick({ FLEXIBLE: "giờ giấc tự do", CURFEW: "có giờ đóng cửa buổi tối" }, r.accessHoursType),
    ]),
    meters: join([
      pick({ PRIVATE: "đồng hồ điện riêng", SHARED: "đồng hồ điện dùng chung" }, r.electricMeterType),
      pick({ PRIVATE: "đồng hồ nước riêng", SHARED: "đồng hồ nước dùng chung" }, r.waterMeterType),
    ]),
    parking: parkingText(r),
  };
}

type Random = () => number;
const choose = <T,>(items: readonly T[], random: Random) => items[Math.floor(random() * items.length)];

export function templateIds(category: ListingDescriptionRequest["category"]): string[] {
  return TEMPLATES[category].map((_, i) => `${category}-${String(i + 1).padStart(2, "0")}`);
}

/**
 * Template format: blank line = new paragraph, line = sentence. A sentence with an empty {slot} is dropped.
 * {?negotiable} only gates its sentence; [[a|b]] picks one wording.
 */
export function renderDescription(request: ListingDescriptionRequest, templateId: string, random: Random = Math.random): string {
  const template = TEMPLATES[request.category][templateIds(request.category).indexOf(templateId)];
  const values: Record<string, string> = {
    ...facts(request),
    greet: choose(GREETINGS[request.category], random),
    cta: choose(CLOSINGS, random),
  };
  const sentence = (line: string): string => {
    let dropped = false;
    const text = line
      .replace(/\[\[([^\]]+)\]\]/g, (_, options: string) => choose(options.split("|"), random))
      .replace(/\{\?negotiable\}/g, () => {
        if (!request.negotiable) dropped = true;
        return "";
      })
      .replace(/\{(\w+)\}/g, (_, key: string) => {
        if (!values[key]) dropped = true;
        return values[key] ?? "";
      });
    return dropped ? "" : text.charAt(0).toLocaleUpperCase("vi-VN") + text.slice(1);
  };
  const paragraphs = template.trim().split(/\n\s*\n/)
    .map((paragraph) => join(paragraph.split("\n").map((line) => sentence(line.trim())), " "))
    .filter(Boolean);
  // Only extreme free-text input gets here: drop whole paragraphs before the closing one.
  while (paragraphs.length > 2 && paragraphs.join("\n\n").length > MAX_DESCRIPTION_LENGTH) paragraphs.splice(-2, 1);
  return paragraphs.join("\n\n").slice(0, MAX_DESCRIPTION_LENGTH);
}

export function generateDescription(request: ListingDescriptionRequest, random: Random = Math.random) {
  const templateId = choose(templateIds(request.category).filter((id) => id !== request.previousTemplateId), random);
  return { templateId, description: renderDescription(request, templateId, random) };
}
