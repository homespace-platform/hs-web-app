"use client";

import {Suspense} from "react";
import {useSearchParams} from "next/navigation";
import {useAuth} from "@/features/auth/useAuth";
import ComplaintPanel from "@/components/complaint/ComplaintPanel";

function ComplaintNotificationPage(){
  const params=useSearchParams();
  const {initialized,authenticated,profile}=useAuth();
  const rentalId=params.get("requestId")??"",caseId=params.get("complaintId")??"";
  if(!initialized)return <p>Đang tải tài khoản…</p>;
  if(!authenticated||!profile)return <p>Vui lòng đăng nhập để xem hồ sơ khiếu nại.</p>;
  if(![rentalId,caseId].every(id=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(id)))return <p role="alert">Đường dẫn hồ sơ khiếu nại không hợp lệ.</p>;
  return <ComplaintPanel key={`${profile.id}:${rentalId}:${caseId}`} rentalRequestId={rentalId} initialComplaintId={caseId}/>;
}
export default function Page(){return <Suspense fallback={<p>Đang tải hồ sơ…</p>}><ComplaintNotificationPage/></Suspense>;}
