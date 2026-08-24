export interface WithdrawTransaction {
  id: string;
  amount: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transactionCode: string;
  status: "success" | "pending" | "cancelled" | "rejected";
  createdAt: string;
  fee?: number;
}

export interface BankInfo {
  code: string;
  shortName: string;
  name: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  { code: "VCB", shortName: "Vietcombank", name: "Ngân hàng Ngoại thương Việt Nam" },
  { code: "MB", shortName: "MB Bank", name: "Ngân hàng Quân Đội" },
  { code: "TCB", shortName: "Techcombank", name: "Ngân hàng Kỹ thương Việt Nam" },
  { code: "ACB", shortName: "ACB", name: "Ngân hàng Á Châu" },
  { code: "BIDV", shortName: "BIDV", name: "Ngân hàng Đầu tư và Phát triển Việt Nam" },
  { code: "CTG", shortName: "VietinBank", name: "Ngân hàng Công thương Việt Nam" },
  { code: "VPB", shortName: "VPBank", name: "Ngân hàng Việt Nam Thịnh Vượng" },
  { code: "TPB", shortName: "TPBank", name: "Ngân hàng Tiên Phong" },
  { code: "STB", shortName: "Sacombank", name: "Ngân hàng Sài Gòn Thương Tín" },
  { code: "HDB", shortName: "HDBank", name: "Ngân hàng Phát triển TP.HCM" },
  { code: "VIB", shortName: "VIB", name: "Ngân hàng Quốc tế" },
  { code: "SHB", shortName: "SHB", name: "Ngân hàng Sài Gòn - Hà Nội" },
  { code: "MSB", shortName: "MSB", name: "Ngân hàng Hàng Hải" },
  { code: "OCB", shortName: "OCB", name: "Ngân hàng Phương Đông" },
  { code: "LPB", shortName: "LPBank", name: "Ngân hàng Lộc Phát Việt Nam" },
  { code: "SEAB", shortName: "SeABank", name: "Ngân hàng Đông Nam Á" },
  { code: "NAB", shortName: "Nam A Bank", name: "Ngân hàng Nam Á" },
  { code: "BAB", shortName: "Bac A Bank", name: "Ngân hàng Bắc Á" },
  { code: "VAB", shortName: "VietBank", name: "Ngân hàng Việt Nam Thương Tín" },
  { code: "BVB", shortName: "BaoViet Bank", name: "Ngân hàng Bảo Việt" },
  { code: "KLB", shortName: "Kienlongbank", name: "Ngân hàng Kiên Long" },
  { code: "NCB", shortName: "NCB", name: "Ngân hàng Quốc Dân" },
  { code: "PVCB", shortName: "PVcomBank", name: "Ngân hàng Đại Chúng Việt Nam" },
  { code: "ABB", shortName: "ABBank", name: "Ngân hàng An Bình" },
  { code: "SGB", shortName: "Saigonbank", name: "Ngân hàng Sài Gòn Công Thương" },
  { code: "SHBVN", shortName: "Shinhan Bank", name: "Ngân hàng Shinhan Việt Nam" },
  { code: "HSBC", shortName: "HSBC", name: "Ngân hàng HSBC Việt Nam" },
  { code: "SCB", shortName: "SCB", name: "Ngân hàng Sài Gòn" },
  { code: "WOO", shortName: "Woori Bank", name: "Ngân hàng Woori Việt Nam" },
];

export const POPULAR_BANKS = VIETNAM_BANKS.slice(0, 8);

export const MOCK_WITHDRAW_HISTORY: WithdrawTransaction[] = [
  {
    id: "#WD-8921",
    amount: 2000000,
    bankCode: "VCB",
    bankName: "Vietcombank",
    accountNumber: "9353999798",
    accountName: "NGUYEN VAN MINH",
    transactionCode: "WD20260824153041",
    status: "success",
    createdAt: "24-08-2026 15:30",
    fee: 0,
  },
  {
    id: "#WD-8452",
    amount: 500000,
    bankCode: "VCB",
    bankName: "Vietcombank",
    accountNumber: "9353999798",
    accountName: "NGUYEN VAN MINH",
    transactionCode: "WD20260819101522",
    status: "success",
    createdAt: "19-08-2026 10:15",
    fee: 0,
  },
  {
    id: "#WD-7810",
    amount: 5000000,
    bankCode: "MB",
    bankName: "MB Bank",
    accountNumber: "0141000780830",
    accountName: "NGUYEN VAN MINH",
    transactionCode: "WD20260812090014",
    status: "success",
    createdAt: "12-08-2026 09:00",
    fee: 0,
  },
  {
    id: "#WD-7124",
    amount: 1000000,
    bankCode: "TCB",
    bankName: "Techcombank",
    accountNumber: "19036789123456",
    accountName: "NGUYEN VAN MINH",
    transactionCode: "WD20260728142033",
    status: "success",
    createdAt: "28-07-2026 14:20",
    fee: 0,
  },
  {
    id: "#WD-6532",
    amount: 10000000,
    bankCode: "VCB",
    bankName: "Vietcombank",
    accountNumber: "9353999798",
    accountName: "NGUYEN VAN MINH",
    transactionCode: "WD20260715164508",
    status: "success",
    createdAt: "15-07-2026 16:45",
    fee: 0,
  },
];
