export type RentalRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED_BY_SYSTEM"
  | "CANCELLED_BY_RENTER"
  | "EXPIRED"
  | "COMPLETED";

export interface CreateRentalRequestPayload {
  listingId: string;
  moveInDate: string; // "YYYY-MM-DD"
  leaseMonths: number;
  occupantCount?: number;
  renterName: string;
  renterPhone: string;
  renterEmail?: string;
  depositAmount?: number | null;
  renterNote?: string;
}

export interface RentalRequestResponse {
  id: string;
  listingId: string;
  listingTitle: string;
  listingAddress: string;
  listingThumbnail: string | null;
  listingPrice: number | null;
  ownerId: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterEmail: string | null;
  moveInDate: string;
  leaseMonths: number;
  occupantCount: number;
  monthlyRentPrice: number;
  depositAmount: number | null;
  renterNote: string | null;
  status: RentalRequestStatus;
  rejectReason: string | null;
  acceptedAt: string | null;
  holdExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
