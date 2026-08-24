export interface DepositTransaction {
  id: string;
  amount: number;
  transactionCode: string;
  description: string;
  status: "success" | "pending" | "failed";
  createdAt: string;
  bankName?: string;
  accountNumber?: string;
}

export const MIN_DEPOSIT_AMOUNT = 10000;

export const PRESET_AMOUNTS = [
  10000,
  20000,
  50000,
  100000,
  200000,
  500000,
  1000000,
  2000000,
  5000000,
];

export const MOCK_DEPOSIT_HISTORY: DepositTransaction[] = [
  {
    id: "#2163",
    amount: 20000,
    transactionCode: "PB20000202607311345482",
    description:
      "MBVCB.15360164510.NGUYEN VAN MINH PB chuyen tien.CT tu 9353999798 NGUYEN VAN MINH toi 0141000780830 PHAM QUANG HUY",
    status: "success",
    createdAt: "31-07-2026 13:45",
    bankName: "Vietcombank",
  },
  {
    id: "#1920",
    amount: 10000,
    transactionCode: "PB10000202607171729482",
    description:
      "MBVCB.15164749501.NGUYEN VAN MINH PB chuyen tien.CT tu 9353999798 NGUYEN VAN MINH toi 0141000780830 PHAM QUANG HUY",
    status: "success",
    createdAt: "17-07-2026 17:29",
    bankName: "Vietcombank",
  },
  {
    id: "#1718",
    amount: 10000,
    transactionCode: "PB10000202607081104482",
    description:
      "MBVCB.15018448848.NGUYEN VAN MINH PB chuyen tien.CT tu 9353999798 NGUYEN VAN MINH toi 0141000780830 PHAM QUANG HUY",
    status: "success",
    createdAt: "08-07-2026 11:04",
    bankName: "Vietcombank",
  },
  {
    id: "#1643",
    amount: 10000,
    transactionCode: "PB10000202607051258482",
    description:
      "MBVCB.14976340881.NGUYEN VAN MINH PB chuyen tien.CT tu 9353999798 NGUYEN VAN MINH toi 0141000780830 PHAM QUANG HUY",
    status: "success",
    createdAt: "05-07-2026 12:58",
    bankName: "Vietcombank",
  },
  {
    id: "#1365",
    amount: 10000,
    transactionCode: "PB10000202606211912482",
    description:
      "MBVCB.14780686442.NGUYEN VAN MINH PB chuyen tien.CT tu 9353999798 NGUYEN VAN MINH toi 0141000780830 PHAM QUANG HUY",
    status: "success",
    createdAt: "21-06-2026 19:12",
    bankName: "Vietcombank",
  },
  {
    id: "#642",
    amount: 10000,
    transactionCode: "PB10000202605102126482",
    description:
      "MBVCB.14162319949.NGUYEN VAN MINH PB chuyen tien.CT tu 9353999798 NGUYEN VAN MINH toi 0141000780830 PHAM QUANG HUY",
    status: "success",
    createdAt: "10-05-2026 21:26",
    bankName: "Vietcombank",
  },
];
