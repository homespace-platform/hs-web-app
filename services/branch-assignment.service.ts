import axiosClient from "@/lib/axios-client";
import { PAGE_SIZE, parseAssignments, parseCandidates } from "@/lib/branch-assignment";
import type { ApiResponse } from "@/types/api.type";
import type { AssignmentKind, RoomManualStatus } from "@/types/branch-assignment.type";

const base = (branchId: string) => `/api/v1/branches/${branchId}`;
const listingLink = (branchId: string, roomId: string, listingId: string) => `${base(branchId)}/rooms/${roomId}/listings/${listingId}`;
const contractLink = (branchId: string, contractId: string) => `${base(branchId)}/contracts/${contractId}`;

const branchAssignmentService = {
  async getAssignments(branchId: string, page = 0, size = PAGE_SIZE) {
    const response = await axiosClient.get<ApiResponse<unknown>>(`${base(branchId)}/assignments`, { params: { page, size } });
    return parseAssignments(response.data?.result);
  },

  async getCandidates(branchId: string, kind: AssignmentKind, page = 0, size = PAGE_SIZE) {
    const response = await axiosClient.get<ApiResponse<unknown>>(`${base(branchId)}/assignment-candidates`, { params: { kind, page, size } });
    return parseCandidates(response.data?.result);
  },

  async linkListing(branchId: string, roomId: string, listingId: string): Promise<void> {
    await axiosClient.put(listingLink(branchId, roomId, listingId));
  },

  async unlinkListing(branchId: string, roomId: string, listingId: string): Promise<void> {
    await axiosClient.delete(listingLink(branchId, roomId, listingId));
  },

  /** roomId null = the "Chưa xếp phòng" tray. Also moves a contract between rooms of the branch. */
  async putContract(branchId: string, contractId: string, roomId: string | null): Promise<void> {
    await axiosClient.put(contractLink(branchId, contractId), { roomId });
  },

  async addContractToTray(branchId: string, contractId: string): Promise<void> {
    await axiosClient.put(contractLink(branchId, contractId), { addToTray: true });
  },

  async removeContract(branchId: string, contractId: string): Promise<void> {
    await axiosClient.delete(contractLink(branchId, contractId));
  },

  async setManualStatus(branchId: string, roomId: string, status: RoomManualStatus): Promise<void> {
    await axiosClient.put(`${base(branchId)}/rooms/${roomId}/manual-status`, { status });
  },
};

export default branchAssignmentService;
