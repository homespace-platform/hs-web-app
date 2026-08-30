export type PropertyCategoryKey = "apartment" | "house" | "office" | "commercial" | "room";

export type ApartmentSubtype =
  | "apartment_normal"
  | "studio"
  | "duplex"
  | "penthouse"
  | "officetel"
  | "other";

export type HouseSubtype =
  | "townhouse"
  | "alley_house"
  | "villa"
  | "level4_house"
  | "other";

export type OfficeSubtype =
  | "traditional_office"
  | "serviced_office"
  | "coworking"
  | "shared_office"
  | "other";

export type CommercialSubtype =
  | "shop"
  | "kiosk"
  | "showroom"
  | "shophouse"
  | "mall_space"
  | "other";

export type RoomSubtype =
  | "boarding_room"
  | "house_room"
  | "serviced_apartment"
  | "dormitory"
  | "other";

export type SelectedMediaImage = {
  name: string;
  dataUrl: string;
  file: File;
};

export type SelectedMediaVideo = {
  name: string;
  file: File;
};

export type DepositType = "NONE" | "AMOUNT" | "MONTHS" | "NEGOTIATE";
export type PaymentCycleType = "MONTHLY" | "TWO_MONTHS" | "QUARTERLY" | "HALF_YEAR" | "NEGOTIATE";

export type CustomMonthlyFee = {
  id: string;
  name: string;
  amount: number | string;
  unit: string;
};

// Section 1: Basic Info
export interface BasicInfoData {
  title: string;
  images: SelectedMediaImage[];
  videos: SelectedMediaVideo[];
  category: PropertyCategoryKey;
  subtype: string;
  rentalType: string;
  availableDate: string;
  description: string;
}

// Section 2A: Apartment Details
export interface ApartmentDetailsData {
  projectName: string;
  buildingBlock?: string;
  unitNumber?: string;
  areaM2?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  livingRooms?: number | string;
  kitchens?: number | string;
  floor?: number | string;
  totalFloors?: number | string;
  furnishing: string;
  doorOrientation?: string;
  balconyOrientation?: string;
  view?: string;
  maxOccupants?: number | string;
  legalStatus?: string;
}

// Section 2B: House Details
export interface HouseDetailsData {
  landAreaM2?: number | string;
  totalUsableAreaM2?: number | string;
  facadeWidthM?: number | string;
  lengthM?: number | string;
  streetWidthM?: number | string;
  frontageCount?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  livingRooms?: number | string;
  kitchens?: number | string;
  totalFloors?: number | string;
  hasRooftopTerrace?: boolean;
  privateEntrance?: string;
  hasGarage?: boolean;
  maxOccupants?: number | string;
  maxVehicles?: number | string;
  furnishing: string;
  legalStatus?: string;
  // Conditional when renting a part of house
  rentalScope?: string;
  rentalFloor?: string;
  sharedEntrance?: string;
}

// Section 2C: Office Details
export interface OfficeDetailsData {
  buildingName?: string;
  officeGrade?: string;
  rentalAreaM2?: number | string;
  isSubdivisible?: boolean;
  rentalFloor?: number | string;
  handoverCondition: string;
  seatsCount?: number | string;
  toiletsCount?: number | string;
  toiletType?: string;
  pantry?: string;
  operatingHours?: string;
  carParkingSlots?: number | string;
  motorbikeParkingSlots?: number | string;
}

// Section 2D: Commercial Details
export interface CommercialDetailsData {
  areaM2?: number | string;
  spacePosition: string;
  facadeWidthM?: number | string;
  lengthM?: number | string;
  frontageCount?: number | string;
  streetWidthM?: number | string;
  rentalFloorsCount?: number | string;
  hasLoft?: boolean;
  toiletsCount?: number | string;
  privateEntrance?: string;
  parkingOption?: string;
  handoverCondition: string;
  hasThreePhasePower?: boolean;
  hasFireSafety?: boolean;
  operatingHours?: string;
  restrictedIndustries?: string;
  loadingArea?: string;
}

// Section 2E: Room Details
export interface RoomDetailsData {
  roomCode?: string;
  areaM2?: number | string;
  roomFloor?: number | string;
  toiletType: string;
  kitchenType?: string;
  hasWindow?: string;
  hasBalcony?: string;
  hasLoft?: boolean;
  furnishing: string;
  selectedFurniture: string[];
  entranceType?: string;
  curfewType?: string;
  electricityMeter?: string;
  waterMeter?: string;
  maxOccupants?: number | string;
  maxVehicles?: number | string;
  parkingPolicy?: string;
}

// Section 4: Monthly Expenses
export interface MonthlyExpensesData {
  electricityType: "KWH" | "STATE_PRICE" | "INCLUDED" | "NEGOTIATE";
  electricityPrice?: number | string;
  waterType: "M3" | "PER_PERSON" | "FLAT_ROOM" | "INCLUDED";
  waterPrice?: number | string;
  managementFeeType: "MONTHLY" | "PER_M2" | "INCLUDED" | "NONE";
  managementFee?: number | string;
  internetType: "MONTHLY" | "INCLUDED" | "SELF_PAY";
  internetFee?: number | string;
  garbageFeeType: "MONTHLY" | "INCLUDED";
  garbageFee?: number | string;
  motorbikeParkingType: "PER_VEHICLE" | "INCLUDED" | "NONE";
  motorbikeParkingFee?: number | string;
  carParkingType: "PER_VEHICLE" | "INCLUDED" | "NONE";
  carParkingFee?: number | string;
  overtimeAcFee?: number | string;
  customFees: CustomMonthlyFee[];
}

// Section 5: Pricing & Conditions
export interface PricingData {
  priceMonthly?: number | string;
  priceUnit: string;
  isNegotiable: boolean;
  depositType: DepositType;
  depositAmount?: number | string;
  depositMonths?: number | string;
  paymentCycle: PaymentCycleType;
  minimumLeaseMonths: number | string;
  includeManagementFee?: boolean;
  includeVat: boolean;
}

// Validation errors mapping
export type FormErrors = Record<string, string>;
