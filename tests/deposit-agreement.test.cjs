const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const source=fs.readFileSync(path.join(__dirname,"../lib/deposit-agreement-loader.ts"),"utf8");
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInThisContext(`(function(module,exports){${output}\n})`)(mod,mod.exports);
const {loadDepositAgreement}=mod.exports;
const ready={required:true,signingAllowed:true,agreement:{id:"deposit-doc",status:"DRAFT"},documents:[{id:"pdf",documentType:"PDF",status:"READY",purpose:"PREVIEW"}]};

test("the existing PDF is delivered before the separate signature request finishes",async()=>{
  const events=[];let resolveSignature;
  const pending=loadDepositAgreement("rental",{getAgreement:async()=>ready,getSignatureState:()=>new Promise(resolve=>{resolveSignature=resolve;})},
    {agreement:view=>events.push(view),signature:value=>events.push(value),signatureError:assert.fail});
  await Promise.resolve();assert.equal(events[0],ready);assert.equal(events.length,1);
  resolveSignature({signatureMode:"SMARTCA"});await pending;assert.equal(events.length,2);
});

test("a signature API outage does not discard the already loaded agreement and PDF",async()=>{
  const events=[],failure=new Error("signature unavailable");
  await loadDepositAgreement("rental",{getAgreement:async()=>ready,getSignatureState:async()=>{throw failure;}},
    {agreement:view=>events.push(view),signature:state=>events.push(state),signatureError:error=>events.push(error)});
  assert.equal(events[0].documents[0].id,"pdf");assert.equal(events[1],null);assert.equal(events[2],failure);
});

test("a failed agreement read is not converted into an empty or not-yet-created agreement",async()=>{
  const failure=new Error("core unavailable");let published=false,signatureRequested=false;
  await assert.rejects(loadDepositAgreement("rental",{getAgreement:async()=>{throw failure;},getSignatureState:async()=>{signatureRequested=true;}},
    {agreement:()=>{published=true;},signature:assert.fail,signatureError:assert.fail}),error=>error===failure);
  assert.equal(published,false);assert.equal(signatureRequested,false);
});

test("only a successful response with no agreement is treated as not yet created",async()=>{
  const absent={...ready,agreement:null,documents:[]},events=[];
  await loadDepositAgreement("rental",{getAgreement:async()=>absent,getSignatureState:assert.fail},
    {agreement:view=>events.push(view),signature:state=>events.push(state),signatureError:assert.fail});
  assert.equal(events[0],absent);assert.equal(events[1],null);
});
test("exempt rentals never request a deposit signature, even with a historical document",async()=>{
  for(const agreement of [null,ready.agreement]) {
    const exempt={...ready,required:false,signingAllowed:false,agreement},events=[];
    await loadDepositAgreement("rental",{getAgreement:async()=>exempt,getSignatureState:assert.fail},
      {agreement:view=>events.push(view),signature:state=>events.push(state),signatureError:assert.fail});
    assert.equal(events[0],exempt);assert.equal(events[1],null);
  }
});

test("the UI separates read errors from absent documents and removes the old wait-for-lease message",()=>{
  const panel=fs.readFileSync(path.join(__dirname,"../components/rental-request/DepositAgreementPanel.tsx"),"utf8");
  assert.match(panel,/view && !contract && !error/);assert.match(panel,/view && !error &&/);
  assert.match(panel,/Lỗi tải không có nghĩa hợp đồng chưa được tạo/);assert.match(panel,/Xem PDF hợp đồng cọc/);
  for(const file of ["RentalRequestDetailModal.tsx","RentalRequestsManagement.tsx"]){
    const text=fs.readFileSync(path.join(__dirname,"../components/rental-request",file),"utf8");
    assert.doesNotMatch(text,/Chỉ nhận cọc chưa tạo bản nháp/);assert.match(text,/Hợp đồng cọc|hợp đồng cọc/);
  }
});

const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
let panelStates=[],panelStateIndex=0;
const panelReact={...React,useState(initial){return React.useState(panelStates[panelStateIndex++] ?? initial);}};
const panelSource=fs.readFileSync(path.join(__dirname,"../components/rental-request/DepositAgreementPanel.tsx"),"utf8");
const panelOutput=ts.transpileModule(panelSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const panelModule={exports:{}};
vm.runInThisContext(`(function(require,module,exports){${panelOutput}\n})`)(name=>{
  if(name==="react")return panelReact;
  if(name==="sonner")return {toast:{error(){}}};
  if(name==="@/services/deposit-agreement.service")return {depositAgreementService:{}};
  if(name==="@/services/contract.service")return {contractService:{}};
  if(name==="@/lib/deposit-agreement-loader")return mod.exports;
  if(name==="@/utils/apiError")return {getApiErrorMessage:()=>"error"};
  if(name==="@/components/contract/detail/SmartCaSignaturePanel")return {default:()=>null};
  if(name==="@/components/contract/detail/ContractBlockchainProof")return {default:({document})=>React.createElement("span",{"data-blockchain-document":document.id})};
  if(name==="@/components/contract/detail/ContractPdfViewerModal")return {default:()=>null};
  if(name==="@/hooks/useAgreementChangeSync")return {useAgreementChangeSync(){}};
  if(name==="@/lib/contract-document-history")return {primaryDocument:(rows)=>rows.find(d=>d.status==="READY"&&d.documentType==="PDF")};
  return require(name);
},panelModule,panelModule.exports);
function renderPanel(snapshot,error="",signatureError="") {
  panelStates=[snapshot,null,error,signatureError,false,false];panelStateIndex=0;
  return renderToStaticMarkup(React.createElement(panelModule.exports.default,{rentalRequestId:"rental",isLandlord:false}));
}
test("rendered read failure offers a read retry, never a create-agreement action",()=>{
  const html=renderPanel(null,"Core unavailable");
  assert.match(html,/Lỗi tải không có nghĩa hợp đồng chưa được tạo/);assert.match(html,/Thử tải lại hồ sơ cọc/);
  assert.doesNotMatch(html,/Chưa có hồ sơ hợp đồng cọc|Kiểm tra \/ tạo lại tài liệu cọc/);
});
test("lease-signed obligation shows its precise label without a handover claim",()=>{
  const html=renderPanel({rentalId:"rental",data:{...ready,obligation:"TRANSFERRED_TO_LEASE"}});
  assert.match(html,/Nghĩa vụ giữ chỗ đã chuyển sang HĐ thuê/);assert.doesNotMatch(html,/Đang được theo dõi|xác nhận nhận nhà|biên bản/i);
});
test("rendered PDF stays visible with a signing-service error and without waiting for move-in",()=>{
  const html=renderPanel({rentalId:"rental",data:{...ready,agreement:{...ready.agreement,contractNumber:"DC-TEST"}}},"","Signature unavailable");
  assert.match(html,/DC-TEST/);assert.match(html,/Xem PDF hợp đồng cọc/);assert.match(html,/PDF đã có vẫn xem được/);
  assert.doesNotMatch(html,/Chưa có hồ sơ hợp đồng cọc|Kiểm tra \/ tạo lại tài liệu cọc/);
});
test("switching rental requests does not expose the previous rental's PDF",()=>{
  const html=renderPanel({rentalId:"other-rental",data:ready});
  assert.doesNotMatch(html,/Xem PDF hợp đồng cọc|Kiểm tra \/ tạo lại tài liệu cọc/);
});
test("exemption tells both parties to continue with the lease and offers no deposit actions",()=>{
  const html=renderPanel({rentalId:"rental",data:{...ready,required:false,signingAllowed:false,agreement:null,documents:[]}});
  assert.match(html,/Bỏ qua hợp đồng cọc/);assert.match(html,/ký hợp đồng thuê/);
  assert.doesNotMatch(html,/<button|Chưa có hồ sơ hợp đồng cọc|Đã xác nhận cọc/);
});

test("deposit proof is attached only to its own final signed PDF",()=>{
  const data={...ready,agreement:{...ready.agreement,status:"ACTIVE",signedAt:"2026-11-08T01:00:00Z"},documents:[{id:"final",contractId:"deposit-doc",status:"READY",purpose:"SIGNED_FINAL",documentType:"PDF"}]};
  assert.match(renderPanel({rentalId:"rental",data}),/data-blockchain-document="final"/);
  assert.doesNotMatch(renderPanel({rentalId:"rental",data:{...data,documents:[{...data.documents[0],purpose:"SIGNED_LANDLORD"}]}}),/data-blockchain-document/);
  assert.doesNotMatch(renderPanel({rentalId:"rental",data:{...data,documents:[{...data.documents[0],contractId:"other-contract"}]}}),/data-blockchain-document/);
});
