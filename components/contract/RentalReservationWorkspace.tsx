"use client";

import { PolicyNotice } from "@/components/common/PolicyDialog";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import NextActionCard from "@/components/rental/NextActionCard";
import { describeNextAction } from "@/lib/rental-labels";
import { readOnboarding } from "@/lib/rental-onboarding-read";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";

/** Also usable before a deposit PDF exists, including missing templates and zero-deposit rentals. */
export default function RentalReservationWorkspace({perspective}:{perspective:"tenant"|"landlord"}) {
  const params=useParams();
  const rentalId=String(params?.rentalId||"");
  const [view,setView]=useState<RentalOnboarding|null>(null);
  // Read-only (readOnboarding).
  const load=useCallback(async()=>{
    if(!rentalId)return;
    try{
      const next=await readOnboarding(rentalId);
      setView(next);
    }catch{/* the panel below shows the load error; the card simply stays hidden */}
  },[rentalId]);
  useEffect(()=>{void load();},[load]);
  const role=perspective==="tenant"?"TENANT":"LANDLORD";
  const next=describeNextAction(view?.nextAction,role);
  return <div className="mx-auto max-w-4xl space-y-4 pb-8">
    <Link href={`/dashboard/${perspective}/contracts?kind=DEPOSIT`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"><ChevronLeft className="h-4 w-4"/>Hợp đồng {perspective==="tenant"?"đi thuê":"cho thuê"}</Link>
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"><h1 className="text-xl font-bold">Hồ sơ cọc & nhận nhà</h1>
      <PolicyNotice tone="neutral" className="mt-2" title="Hồ sơ cọc & nhận nhà" summary="Theo dõi khoản cọc, ký hợp đồng và hoàn tất thanh toán trước khi nhận nhà."><p>Theo dõi khoản cọc, ký hợp đồng và hoàn tất thanh toán trước khi nhận nhà. Hồ sơ không đặt cọc sẽ bỏ qua bước ký cọc.</p></PolicyNotice>
    </div>
    {view&&<NextActionCard role={role} nextAction={view.nextAction} fallbackMessage={view.message} primary={next?.mine?{label:"Xử lý ngay",href:"#reservation-panel"}:undefined}/>}
    <div id="reservation-panel" className="scroll-mt-24">
      {rentalId&&<RentalOnboardingPanel rentalRequestId={rentalId} isLandlord={perspective==="landlord"} onSnapshot={setView} onUpdated={load}/>}
    </div>
  </div>;
}
