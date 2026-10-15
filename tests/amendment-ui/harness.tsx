import { createRoot } from "react-dom/client";
import { useState } from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Toaster } from "sonner";
import ContractAmendmentPanel from "../../components/contract/detail/ContractAmendmentPanel";
import Workspace from "../../components/contract/detail/ContractAmendmentWorkspace";
import Financial from "../../components/contract/detail/ContractFinancialSection";
import Parties from "../../components/contract/detail/ContractPartiesSection";
import Amenities from "../../components/contract/detail/ContractAmenitiesSection";
import Equipment from "../../components/contract/detail/ContractEquipmentSection";
import Charges from "../../components/contract/detail/ContractChargesSection";
import Policies from "../../components/contract/detail/ContractPoliciesSection";
import Property from "../../components/contract/detail/ContractPropertySection";
import Lease from "../../components/contract/detail/ContractLeaseSection";
import Documents from "../../components/contract/detail/ContractDocumentSection";
import ContractHeader from "../../components/contract/detail/ContractHeader";
import InitialPayment from "../../components/contract/detail/ContractInitialPaymentSection";
import { ContractFieldLegend } from "../../components/contract/detail/ContractFieldState";
import type { ContractCompletenessResponse, ContractDocumentResponse, ContractResponse, ContractRevisionResponse, ContractStatus } from "../../types/contract.type";

const historyFixture=(window as unknown as {historyFixture?:{contract:ContractResponse;documents:ContractDocumentResponse[]}}).historyFixture;

const role = new URLSearchParams(window.location.search).get("role") === "tenant" ? "tenant" : "owner";
const exportFixture = (window as unknown as {exportFixture?:{status:ContractStatus;smartCaMode:boolean}}).exportFixture;
function ExportHeaderFixture() {
  const [rendering,setRendering]=useState(false), [ready,setReady]=useState(false);
  return <AppRouterContext.Provider value={{back(){},forward(){},refresh(){},push(){},replace(){},prefetch(){},bfcacheId:"fixture"}}>
    <ContractHeader backPath="/contracts" contract={{id:"root",contractNumber:"HD-EXPORT",status:exportFixture!.status,paymentStatus:"PAID"} as ContractResponse}
      revision={{} as ContractRevisionResponse} completeness={{complete:true} as ContractCompletenessResponse} latestDoc={null} hasReadyDoc={ready}
      isLandlord={role==="owner"} isTenant={role==="tenant"} rendering={rendering} sending={false} smartCaMode={exportFixture!.smartCaMode}
      onRender={async()=>{setRendering(true);document.documentElement.dataset.exports=String(Number(document.documentElement.dataset.exports??0)+1);
        await new Promise<void>(resolve=>{(window as unknown as {finishFixtureExport:()=>void}).finishFixtureExport=resolve;});setReady(true);setRendering(false);}}
      onSend={async()=>{}}/>
    <p role="status">{ready?"PDF đã sẵn sàng để ký":"Cần kết xuất PDF trước khi ký"}</p>
  </AppRouterContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<><main className="mx-auto max-w-6xl space-y-6 p-4 pb-52 sm:px-8 sm:pt-8">
  {exportFixture&&<ExportHeaderFixture/>}
  <Workspace contractId="root" actorId={role} perspective={role === "owner" ? "landlord" : "tenant"}>
  {historyFixture&&<AppRouterContext.Provider value={{back(){},forward(){},refresh(){},push(){},replace(){},prefetch(){},bfcacheId:"fixture"}}>
    <ContractHeader backPath="/contracts" contract={historyFixture.contract} revision={{} as ContractRevisionResponse}
      completeness={null} latestDoc={historyFixture.documents.find(d=>d.purpose==="SIGNED_FINAL")??null} hasReadyDoc={true}
      isLandlord={role==="owner"} isTenant={role==="tenant"} rendering={false} sending={false} onRender={async()=>{}} onSend={async()=>{}}/>
  </AppRouterContext.Provider>}
  <ContractAmendmentPanel contractId="root" actorId={role} perspective={role === "owner" ? "landlord" : "tenant"} />
  <ContractFieldLegend/>
  <Parties landlord={{ fullName: "Chủ nhà" }} tenant={{ fullName: "Người thuê" }} />
  <Property property={{}}/><Lease lease={{}}/>
  <Financial financial={{}} /><Amenities /><Charges /><Equipment />
  <InitialPayment/>
  <Policies isDraft={false} isLandlord={role === "owner"} />
  {historyFixture&&<Documents documents={historyFixture.documents} contract={historyFixture.contract}/>}
  </Workspace>
  <Toaster />
</main>
  {/* Like app/layout.tsx, chat sits outside page spacing/scroll containers. No live chat providers. */}
  <button type="button" aria-label="Chat fixture" className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg sm:h-14 sm:w-14">AI</button>
</>);
