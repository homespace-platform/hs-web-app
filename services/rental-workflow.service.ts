import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { RentalWorkflow,WorkflowKind,WorkflowDocument,FinalRentCalculation } from "@/types/rental-workflow.type";
const route=(id:string,kind:WorkflowKind)=>`/api/v1/rental-requests/${encodeURIComponent(id)}/workflow/${kind}`;
export const rentalWorkflowService={
  async calculate(id:string,endExclusive:string,policy:string){return(await axiosClient.get<ApiResponse<FinalRentCalculation>>(`${route(id,"early-exit")}/calculation`,{params:{endExclusive,policy}})).data.result;},
  async documents(id:string,kind:WorkflowKind){return(await axiosClient.get<ApiResponse<WorkflowDocument[]>>(`${route(id,kind)}/documents`)).data.result;},
  async prepareDocument(id:string,kind:WorkflowKind,expectedRevision:number){return(await axiosClient.post<ApiResponse<WorkflowDocument>>(`${route(id,kind)}/documents`,{expectedRevision,reason:"Lập PDF từ đúng nội dung biên bản hoặc thỏa thuận đang xem",acknowledged:false,tenantContacted:false})).data.result;},
  async get(id:string,kind:WorkflowKind){return (await axiosClient.get<ApiResponse<RentalWorkflow>>(route(id,kind))).data.result;},
  async propose(id:string,kind:WorkflowKind,payload:unknown){return (await axiosClient.post<ApiResponse<RentalWorkflow>>(route(id,kind),payload)).data.result;},
  async act(id:string,kind:WorkflowKind,action:string,payload:{expectedRevision:number;reason:string;acknowledged:boolean;tenantContacted:boolean}){
    return (await axiosClient.post<ApiResponse<RentalWorkflow>>(`${route(id,kind)}/${encodeURIComponent(action)}`,payload)).data.result;
  },
};
