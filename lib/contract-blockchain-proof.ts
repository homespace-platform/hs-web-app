import type { BlockchainProofStatus } from "@/types/blockchain.type";

export const blockchainProofPending = (status?: BlockchainProofStatus | null) => status === "PENDING" || status === "SUBMITTED";

export function supportsLeaseProof(contract: { parentContractId?: string | null; agreementKind?: string | null }): boolean {
  return !contract.parentContractId && (!contract.agreementKind || contract.agreementKind === "LEASE");
}

export function blockchainTransactionUrl(chainId?: number | null, transactionHash?: string | null): string | undefined {
  if (chainId !== 11155111 || !transactionHash || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) return undefined;
  return `https://sepolia.etherscan.io/tx/${transactionHash}`;
}

export async function hashPdfForProof(file: Pick<File, "size" | "arrayBuffer">): Promise<string> {
  if (file.size === 0) throw new Error("Tệp đang trống. Hãy chọn bản PDF đã ký.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Hãy chọn PDF không quá 20 MB để đối chiếu trong trình duyệt.");
  if (!globalThis.crypto?.subtle) throw new Error("Trình duyệt chưa hỗ trợ tính hash ở địa chỉ này. Hãy dùng HTTPS hoặc localhost.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return "0x" + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
