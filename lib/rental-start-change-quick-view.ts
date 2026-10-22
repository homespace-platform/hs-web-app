import type { RentalOnboarding, RentalStartChange } from "@/services/rental-onboarding.service";
import type { RentalRequestResponse } from "@/types/rental-request.type";

export const startChangeStatus: Record<RentalStartChange["status"],string> = {
  REQUESTED:"Chờ chủ nhà duyệt",APPROVED:"Đã đồng ý",REJECTED:"Không đồng ý",WITHDRAWN:"Đã rút",EXPIRED:"Đã hết hạn"
};
export const calendarDate=(value:string)=>value.split("T")[0].split("-").reverse().join("/");
export const vietnamTime=(value:string)=>new Date(value).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"});

export function canHandleStartChange(request:RentalRequestResponse,view:RentalOnboarding,change:RentalStartChange,actorId:string|null,mode:"RECEIVED"|"SENT") {
  return request.status==="ACCEPTED" && change.status==="REQUESTED" && !view.cancellationRequestedAt
    && !["PENDING","CANCELLATION_REQUESTED","COMPLETED","CANCELLED_BY_SYSTEM","CANCELLED_BY_OWNER","CANCELLED_BY_RENTER","EXPIRED","REJECTED"].includes(view.stage)
    && new Date(view.serverNow).getTime()<new Date(change.respondBy).getTime()
    && (mode==="RECEIVED" ? view.askerRole==="LANDLORD" && actorId===request.ownerId
      : view.askerRole==="TENANT" && actorId===request.renterId);
}
