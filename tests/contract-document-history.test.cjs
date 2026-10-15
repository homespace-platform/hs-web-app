/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript helper regression tests. */
const {test}=require("node:test"),assert=require("node:assert/strict"),ts=require("typescript"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const mod={exports:{}};
const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/contract-document-history.ts"),"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInThisContext(`(function(exports){${source}\n})`)(mod.exports);
const h=mod.exports;
const doc=(id,purpose,status="READY",type="PDF",at="2026-10-15T06:29:39Z",revisionId="signed")=>({id,contractId:"root",revisionId,purpose,status,documentType:type,generatedAt:at});
const proposal=(status,extra={})=>({id:status,status,effectiveOn:"2026-11-15",submittedAt:"2026-10-16T00:00:00Z",comparison:[],...extra});
test("signed PDF is picked by purpose, type, state and revision, never file name or newest export",()=>{
  const rows=[doc("new-preview","PREVIEW"),doc("signed","SIGNED_FINAL","READY","PDF","2026-10-14T00:00:00Z"),doc("failed","SIGNED_FINAL","FAILED"),doc("wrong-revision","SIGNED_FINAL","READY","PDF",undefined,"other"),doc("word","SIGNED_FINAL","READY","DOCX")];
  const original=JSON.stringify(rows);assert.equal(h.primaryDocument(rows,true,"signed").id,"signed");assert.equal(JSON.stringify(rows),original);
  assert.equal(h.primaryDocument([rows[0]],true),undefined);assert.equal(h.primaryDocument(rows,false,"signed").id,"new-preview");
});
test("all historical files remain sorted without mutation; stale files never become primary",()=>{
  const rows=[doc("word","PREVIEW","STALE","DOCX"),doc("older","PREVIEW","READY","PDF","2026-10-14T00:00:00Z")];
  assert.equal(h.sortedDocuments(rows).length,2);assert.equal(h.primaryDocument(rows,false).id,"older");assert.match(h.documentStage(rows[0]),/Không phải bản ký/);
});
test("only applied verified amendments count, using Vietnam server time rather than browser time",()=>{
  assert.equal(h.appliedAmendment(proposal("APPLIED",{signedAt:"2026-10-20T00:00:00Z"}),"2026-11-14T17:00:00Z"),true);
  for(const status of ["REQUESTED","APPROVED","SCHEDULED","REJECTED","WITHDRAWN","EXPIRED","SUPERSEDED"])assert.equal(h.appliedAmendment(proposal(status,{signedAt:"2026-10-20T00:00:00Z"}),"2026-12-15T00:00:00Z"),false);
  assert.equal(h.appliedAmendment(proposal("APPLIED"),"2026-12-15T00:00:00Z"),false);
  assert.equal(h.appliedAmendment(proposal("APPLIED",{signedAt:"2026-10-20T00:00:00Z"}),"2026-11-14T16:59:59Z"),false);
  assert.equal(h.appliedAmendment(proposal("APPLIED",{signedAt:"2026-10-20T00:00:00Z"}),"bad"),false);
});
test("waiting signature, signed scheduled and rejected proposals have distinct labels",()=>{
  assert.equal(h.amendmentDocumentStatus(proposal("APPROVED",{agreementStatus:"TENANT_SIGNATURE_PENDING"}),"2026-10-15T00:00:00Z"),"Chờ người thuê ký");
  assert.match(h.amendmentDocumentStatus(proposal("SCHEDULED",{signedAt:"2026-10-20T00:00:00Z"}),"2026-10-21T00:00:00Z"),/Chờ áp dụng/);
  assert.match(h.amendmentDocumentStatus(proposal("REJECTED"),"2026-10-21T00:00:00Z"),/Không áp dụng/);
  const replaced=proposal("SUPERSEDED",{signedAt:"2026-10-20T00:00:00Z"});
  assert.equal(h.signedAmendment(replaced),true);assert.match(h.amendmentDocumentStatus(replaced,"2026-10-21T00:00:00Z"),/Đã được thay thế/);
});
test("negotiations and private draft counters do not become numbered signed amendments",()=>{
  const rows=[proposal("TENANT_REQUESTED"),proposal("REQUESTED"),proposal("APPLIED",{signedAt:"2026-10-20T00:00:00Z"}),proposal("TENANT_FULFILLED")];
  assert.equal(h.concreteProposals(rows).length,2);assert.equal(rows.filter(h.signedAmendment).length,1);
});
test("adjustment numbering preserves server audit order even with repeated/backwards simulated timestamps",()=>{
  const first=proposal("APPLIED",{id:"z-first",signedAt:"2026-11-15T00:00:00Z"});
  const next=proposal("APPLIED",{id:"a-next",signedAt:"2026-10-15T00:00:00Z"});
  assert.deepEqual(h.concreteProposals([next,first]).filter(h.signedAmendment).map(p=>p.id),["z-first","a-next"]);
});
test("signature timeline only reports verified SIGNED requests for the matching revision",()=>{
  const request=(role,status,revisionId,confirmedAt)=>({signerRole:role,status,revisionId,confirmedAt});
  assert.deepEqual(h.verifiedSignatureTimes([request("LANDLORD","SIGNED","r","2026-10-20T00:00:00Z"),request("TENANT","PROVIDER_SIGNED","r","2026-10-20T01:00:00Z"),request("TENANT","SIGNED","old","2026-10-19T00:00:00Z")],"r"),{landlord:"2026-10-20T00:00:00Z",tenant:undefined});
});
test("human labels summarize fields and format timestamps in Vietnam time without raw ISO strings",()=>{
  assert.equal(h.amendmentDocumentTitle(proposal("REQUESTED",{comparison:[{field:"policies.latePaymentFeeMode",label:"Mode"},{field:"policies.latePaymentFeeCap",label:"Cap"}]})),"Phí chậm trả");
  assert.match(h.documentTime("2026-10-15T06:29:39.869215Z"),/13:29/);assert.equal(h.documentDate("2026-11-15"),"15/11/2026");
});
test("actual header hides schema and draft revision counters and names signed-document actions clearly",()=>{
  const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../components/contract/detail/ContractHeader.tsx"),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const header={exports:{}};
const resolve=name=>name==="./utils"?{FieldRow:({label,value})=>React.createElement("div",null,label,String(value??""))}:name==="next/navigation"?{useRouter:()=>({push(){}})}:name==="./ContractAmendmentWorkspace"?{useAmendmentWorkspace:()=>null}:name==="@/lib/contract-document-history"?h:name==="@/services/contract.service"?{contractService:{}}:name==="./ContractPdfViewerModal"?{__esModule:true,default:()=>null}:require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(resolve,header,header.exports);
  const html=renderToStaticMarkup(React.createElement(header.exports.default,{backPath:"/contracts",contract:{id:"root",contractNumber:"HD-TEST",status:"ACTIVE",paymentStatus:"PAID"},revision:{schemaVersion:2,revisionNumber:3},latestDoc:{...doc("signed","SIGNED_FINAL"),viewUrl:"https://files.example/view",downloadUrl:"https://files.example/download"},completeness:null,hasReadyDoc:true,isLandlord:true,isTenant:false,rendering:false,sending:false,onRender:async()=>{},onSend:async()=>{}}));
  assert.doesNotMatch(html,/Schema|Bản sửa đổi/);assert.match(html,/Xem hợp đồng đang áp dụng/);assert.match(html,/Tải PDF đang áp dụng/);assert.match(html,/#contract-document-history/);
});

function clickableHeader(service,props={}) {
  const React=require("react"),state=[],errors=[];
  const react={...React,useState(initial){const index=state.length;state.push(initial);return [initial,value=>{state[index]=value;}];}};
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../components/contract/detail/ContractHeader.tsx"),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  const resolve=name=>name==="react"?react:name==="./utils"?{FieldRow:()=>null}:name==="next/navigation"?{useRouter:()=>({push(){}})}:name==="./ContractAmendmentWorkspace"?{useAmendmentWorkspace:()=>null}:name==="@/lib/contract-document-history"?h:name==="@/services/contract.service"?{contractService:service}:name==="sonner"?{toast:{error:value=>errors.push(value)}}:name==="./ContractPdfViewerModal"?{__esModule:true,default:()=>null}:require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(resolve,module,module.exports);
  const tree=module.exports.default({backPath:"/contracts",contract:{id:"root",status:"ACTIVE",paymentStatus:"PAID"},revision:{},latestDoc:{...doc("root-signed","SIGNED_FINAL"),viewUrl:"https://files.example/old",downloadUrl:"https://files.example/old-download"},completeness:null,hasReadyDoc:true,isLandlord:true,isTenant:false,rendering:false,sending:false,onRender:async()=>{},onSend:async()=>{},...props});
  const text=node=>node==null?"":typeof node!=="object"?String(node):Array.isArray(node)?node.map(text).join(""):text(node.props?.children);
  const buttons=[];const visit=node=>{if(!node||typeof node!=="object")return;if(Array.isArray(node)){node.forEach(visit);return;}if(node.type==="button")buttons.push(node);visit(node.props?.children);};visit(tree);
  return {state,errors,button:label=>buttons.find(b=>text(b).includes(label))};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test("header resolves the effective PDF on every view click, including an appendix owned by another contract id",async()=>{
  let current={...doc("november-signed","SIGNED_FINAL"),contractId:"appendix-november",viewUrl:"https://files.example/november"};
  const calls=[];
  const header=clickableHeader({getEffectiveDocument:async id=>{calls.push(id);return current;},getDocument:()=>assert.fail("must not refresh the old root file")});
  const view=header.button("Xem hợp đồng đang áp dụng");assert.ok(view);
  view.props.onClick();await flush();assert.equal(header.state[1].id,"november-signed");assert.deepEqual(header.errors,[]);
  current={...current,id:"december-signed",contractId:"appendix-december"};
  view.props.onClick();await flush();assert.equal(header.state[1].id,"december-signed");assert.deepEqual(calls,["root","root"]);
});
test("current document actions remain available without stale root URLs and downloads use the effective PDF",async()=>{
  const previous=global.window,tab={location:{href:""},opener:{},close(){assert.fail("successful download must stay open");}};
  global.window={open:()=>tab};
  try {
    const header=clickableHeader({getEffectiveDocument:async()=>({...doc("appendix-final","SIGNED_FINAL"),contractId:"appendix",downloadUrl:"https://files.example/effective-download"})},{latestDoc:null});
    assert.ok(header.button("Xem hợp đồng đang áp dụng"));
    header.button("Tải PDF đang áp dụng").props.onClick();await flush();
    assert.equal(tab.location.href,"https://files.example/effective-download");assert.equal(tab.opener,null);assert.deepEqual(header.errors,[]);
  } finally {global.window=previous;}
});
test("missing, unsigned, stale or failed effective PDFs never silently open the old root PDF",async()=>{
  for(const current of [null,{...doc("unsigned","SIGNED_LANDLORD"),viewUrl:"url"},{...doc("stale","SIGNED_FINAL","STALE"),viewUrl:"url"},{...doc("failed","SIGNED_FINAL","FAILED"),viewUrl:"url"},{...doc("word","SIGNED_FINAL","READY","DOCX"),viewUrl:"url"},{...doc("no-url","SIGNED_FINAL")}]) {
    const header=clickableHeader({getEffectiveDocument:async()=>current,getDocument:()=>assert.fail("must not fall back to the old root PDF")});
    header.button("Xem hợp đồng đang áp dụng").props.onClick();await flush();
    assert.equal(header.state[1],null);assert.equal(header.errors.length,1);assert.match(header.errors[0],/không mở thay bằng bản cũ/);
  }
});
test("viewing an individual appendix still opens that exact file, not whichever appendix is effective on root",async()=>{
  const current={...doc("appendix-preview","PREVIEW"),contractId:"appendix",viewUrl:"https://files.example/appendix"};
  let calls=0;
  const header=clickableHeader({getEffectiveDocument:()=>assert.fail("must preserve explicit history/signing view"),getDocument:async id=>{calls++;assert.equal(id,current.id);return current;}},{contract:{id:"appendix",parentContractId:"root",agreementKind:"AMENDMENT",status:"DRAFT"},latestDoc:current});
  header.button("Xem bản soạn thảo").props.onClick();await flush();assert.equal(header.state[1].id,current.id);assert.equal(calls,1);
});
function effectiveServiceFixture() {
  const module={exports:{}},calls=[];
  const root={id:"root",currentRevisionId:"r0",status:"ACTIVE"},pl2={id:"pl2",parentContractId:"root",currentRevisionId:"r2",status:"ACTIVE"};
  const state={serverNow:"2026-11-15T03:00:00Z",currentTermsRevisionId:"r1",proposals:[
    proposal("SCHEDULED",{id:"pl2",effectiveOn:"2026-12-15",signedAt:"2026-11-15T03:00:00Z",agreementContractId:"pl2"}),
    proposal("APPLIED",{id:"pl1",signedAt:"2026-10-20T00:00:00Z",agreementContractId:"pl1"})]};
  const files={root:[{...doc("original","SIGNED_FINAL","READY","PDF",undefined,"r0"),storageObjectId:"root-file"}],
    pl1:[{...doc("november","SIGNED_FINAL","READY","PDF",undefined,"r1"),contractId:"pl1",storageObjectId:"pl1-file"}],
    pl2:[{...doc("december","SIGNED_FINAL","READY","PDF","2099-01-01T00:00:00Z","r2"),contractId:"pl2",storageObjectId:"pl2-file"}]};
  let freshOverride;
  const get=async url=>{
    calls.push(url);let result;
    if(url==="/api/v1/contracts/root")result=root;
    else if(url==="/api/v1/contracts/pl2")result=pl2;
    else if(url==="/api/v1/contracts/root/amendments")result=state;
    else if(/\/contracts\/(root|pl1|pl2)\/documents$/.test(url))result=files[url.split("/")[4]];
    else if(url.startsWith("/api/v1/contracts/documents/")){
      const found=Object.values(files).flat().find(d=>d.id===url.split("/").pop());
      result={...found,viewUrl:"https://files.example/fresh/"+found.id,downloadUrl:"https://files.example/download/"+found.id,...freshOverride};
    }else assert.fail("unexpected API, including unavailable effective-document route: "+url);
    return {data:{result}};
  };
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../services/contract.service.ts"),"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const resolve=name=>name==="@/lib/axios-client"?{__esModule:true,default:{get}}:name==="@/lib/contract-document-history"?h:require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(resolve,module,module.exports);
  return {api:module.exports.contractService,state,files,calls,override:value=>{freshOverride=value;}};
}
test("15 November selects PL1 rather than already-signed PL2, without requiring a newly deployed endpoint",async()=>{
  const f=effectiveServiceFixture();
  for(const id of ["root","pl2"]) {
    const result=await f.api.getEffectiveDocument(id);assert.equal(result.id,"november");assert.equal(result.contractId,"pl1");assert.equal(result.revisionId,"r1");
  }
  assert.equal(f.calls.some(p=>p.includes("effective-document")||p==="/api/v1/contracts/pl2/documents"),false);
});
test("current-file selection uses Vietnam server date and exact revision across both monthly boundaries",async()=>{
  const f=effectiveServiceFixture();
  for(const [serverNow,revision,id] of [["2026-11-14T16:59:59Z","r0","original"],["2026-11-14T17:00:00Z","r1","november"],["2026-12-14T16:59:59Z","r1","november"],["2026-12-14T17:00:00Z","r2","december"]]) {
    f.state.serverNow=serverNow;f.state.currentTermsRevisionId=revision;
    assert.equal((await f.api.getEffectiveDocument("pl2")).id,id);
  }
});
test("missing effective files cannot fall back to original, future, unsigned, wrong revision or stale PDFs",async()=>{
  for(const override of [{purpose:"SIGNED_LANDLORD"},{status:"STALE"},{documentType:"DOCX"},{revisionId:"r2"},{storageObjectId:null}]) {
    const f=effectiveServiceFixture();Object.assign(f.files.pl1[0],override);
    assert.equal(await f.api.getEffectiveDocument("root"),null);
    assert.equal(f.calls.includes("/api/v1/contracts/root/documents"),false);assert.equal(f.calls.includes("/api/v1/contracts/pl2/documents"),false);
  }
});
test("bad server time, excluded proposals and changed authorized file identity fail closed",async()=>{
  const f=effectiveServiceFixture();f.state.serverNow="invalid";await assert.rejects(f.api.getEffectiveDocument("root"),/phiên bản/);
  for(const status of ["SUPERSEDED","WITHDRAWN","REJECTED","EXPIRED","APPROVED"]) {
    const f=effectiveServiceFixture();f.state.proposals[1].status=status;
    assert.equal(await f.api.getEffectiveDocument("root"),null);
  }
  for(const override of [{contractId:"another-root"},{revisionId:"r2"},{id:"another-file"},{purpose:"PREVIEW"}]) {
    const f=effectiveServiceFixture();f.override(override);await assert.rejects(f.api.getEffectiveDocument("root"),/không khớp/);
  }
});
test("signed future appendix header distinguishes currently effective terms from opening that particular appendix",async()=>{
  let effectiveReads=0,ownReads=0;
  const own={...doc("december-file","SIGNED_FINAL"),contractId:"pl2",storageObjectId:"pl2-object"};
  const header=clickableHeader({getEffectiveDocument:async id=>{effectiveReads++;assert.equal(id,"pl2");return {...own,id:"november-file",contractId:"pl1",viewUrl:"https://files.example/pl1"};},getDocument:async id=>{ownReads++;assert.equal(id,own.id);return {...own,viewUrl:"https://files.example/pl2"};}},
    {contract:{id:"pl2",parentContractId:"root",agreementKind:"AMENDMENT",status:"ACTIVE"},latestDoc:own});
  header.button("Xem hợp đồng đang áp dụng").props.onClick();await flush();assert.equal(header.state[1].id,"november-file");
  header.button("Xem riêng phụ lục này").props.onClick();await flush();assert.equal(header.state[1].id,"december-file");
  assert.equal(effectiveReads,1);assert.equal(ownReads,1);assert.deepEqual(header.errors,[]);
});
