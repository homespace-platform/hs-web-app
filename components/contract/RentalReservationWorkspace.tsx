"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";

/** Also usable before a deposit PDF exists, including missing templates and zero-deposit rentals. */
export default function RentalReservationWorkspace({perspective}:{perspective:"tenant"|"landlord"}) {
  const params=useParams();
  const rentalId=String(params?.rentalId||"");
  return <div className="mx-auto max-w-4xl space-y-4 pb-8">
    <Link href={`/dashboard/${perspective}/contracts?kind=DEPOSIT`} className="text-sm font-semibold text-primary">← Danh sách hợp đồng</Link>
    <div className="rounded-2xl border bg-card p-4"><h1 className="text-xl font-bold">Hồ sơ cọc & nhận nhà</h1>
      <p className="mt-2 text-sm text-muted-foreground">Theo dõi khoản cọc, ký hợp đồng và hoàn tất thanh toán trước khi nhận nhà. Hồ sơ không đặt cọc sẽ bỏ qua bước ký cọc.</p>
    </div>
    {rentalId && <RentalOnboardingPanel rentalRequestId={rentalId} isLandlord={perspective==="landlord"}/>}
  </div>;
}
