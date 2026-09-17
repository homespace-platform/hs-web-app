/**
 * Contract Feature Flags
 * Helper duy nhất để kiểm tra cấu hình chữ ký số hợp đồng trên frontend.
 * Tuyệt đối không đọc trực tiếp biến môi trường rải rác trong các component.
 */
export const isContractESignatureEnabled =
  process.env.NEXT_PUBLIC_CONTRACT_E_SIGNATURE_ENABLED === "true";
