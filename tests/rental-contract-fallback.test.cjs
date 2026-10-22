const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function load(file) {
  if(cache.has(file))return cache.get(file);
  const mod={exports:{}};
  const js=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const resolve=name=>name==='@/lib/rental-contract-fallback'?load('lib/rental-contract-fallback.ts'):
    name==='@/lib/contract-preview'?load('lib/contract-preview.ts'):require(name);
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`)(resolve,mod,mod.exports);
  cache.set(file,mod.exports);return mod.exports;
}
const {canOfferContractFallback,createRentalContractFallback}=load('lib/rental-contract-fallback.ts');
const Button=load('components/rental-request/RentalContractFallbackButton.tsx').default;
const request={id:'rental',status:'ACCEPTED',initialPayment:{type:'INITIAL',status:'CONFIRMED'}};
const view={askerRole:'LANDLORD',canPrepareContract:true,serverNow:'2026-11-01T03:00:00Z',paymentOpensAt:'2026-10-31T17:00:00Z'};
const contract={id:'draft',currentRevisionId:'rev',status:'DRAFT'};
const pdf={id:'pdf',revisionId:'rev',status:'READY',storageObjectId:'private-file',documentType:'PDF'};
function fixture(overrides={}) {
  const calls=[];
  const transport={refresh:async()=>{calls.push('refresh');return view;},create:async()=>{calls.push('create');return contract;},
    find:async()=>{calls.push('find');return contract;},completeness:async id=>{calls.push(`complete:${id}`);return {complete:true};},
    preview:async id=>{calls.push(`preview:${id}`);return pdf;},previewStatus:async()=>{calls.push('status');return pdf;},...overrides};
  return {transport,calls,run:()=>createRentalContractFallback(transport,new AbortController().signal,()=>{})};
}

test('owner fallback appears only for an accepted rental with first rent confirmed and no existing contract',()=>{
  assert.equal(canOfferContractFallback(request,'RECEIVED'),true);
  assert.equal(canOfferContractFallback(request,'SENT'),false);
  assert.equal(canOfferContractFallback(request,'RECEIVED',contract),false);
  for(const status of ['PENDING','COMPLETED','CANCELLED_BY_OWNER','EXPIRED'])
    assert.equal(canOfferContractFallback({...request,status},'RECEIVED'),false);
  for(const initialPayment of [null,{type:'RESERVATION_DEPOSIT',status:'CONFIRMED'},
    {type:'INITIAL',status:'TRANSFER_REPORTED'},{type:'INITIAL',status:'DISPUTED'},{status:'CONFIRMED'}])
    assert.equal(canOfferContractFallback({...request,initialPayment},'RECEIVED'),false);
  assert.equal(canOfferContractFallback(request,'RECEIVED',null,{...view,cancellationRequestedAt:view.serverNow}),false);
});
test('button is visible on owner surfaces, disabled while busy and hidden from the tenant',()=>{
  const render=props=>renderToStaticMarkup(React.createElement(Button,{request,mode:'RECEIVED',busy:false,disabled:false,onCreate(){},...props}));
  assert.match(render({}),/Tạo hợp đồng/);assert.match(render({busy:true}),/disabled=""/);
  assert.match(render({busy:true}),/Đang tạo hợp đồng/);assert.equal(render({mode:'SENT'}),'');
});
test('explicit fallback refreshes, creates through the old endpoint and exports only after completeness',async()=>{
  const f=fixture();const result=await f.run();assert.equal(result.contract,contract);assert.equal(result.fileState,'READY');
  assert.deepEqual(f.calls,['refresh','create','complete:draft','preview:draft']);
});
test('fresh authorization, funds, cancellation and business date block POST even when list data was stale',async()=>{
  for(const patch of [{askerRole:'TENANT'},{canPrepareContract:false},{cancellationRequestedAt:view.serverNow},
    {serverNow:'2026-10-30T03:00:00Z'},{paymentOpensAt:'invalid'}]) {
    const f=fixture({refresh:async()=>({...view,...patch})});await assert.rejects(f.run(),/Chưa đủ điều kiện/);
    assert.deepEqual(f.calls,[]);
  }
});
test('missing admin template surfaces its original error and never bypasses checks or generates files',async()=>{
  const missing={response:{status:409,data:{code:6040,message:'Chưa có mẫu hợp đồng đã phát hành.'}}};
  const f=fixture({create:async()=>{throw missing;}});await assert.rejects(f.run(),error=>error===missing);
  assert.deepEqual(f.calls,['refresh']);
});
test('uncertain create result reconciles once by GET and uses the existing draft without another POST',async()=>{
  let creates=0;const f=fixture({create:async()=>{creates++;throw {code:'ERR_NETWORK'};}});
  const result=await f.run();assert.equal(creates,1);assert.equal(result.contract.id,'draft');
  assert.deepEqual(f.calls,['refresh','find','complete:draft','preview:draft']);
});
test('an unresolved create timeout remains explicitly unknown and never causes a second create',async()=>{
  let creates=0;const f=fixture({create:async()=>{creates++;throw {response:{status:504}};},find:async()=>null});
  await assert.rejects(f.run(),/Chưa xác định được kết quả/);assert.equal(creates,1);
  assert.deepEqual(f.calls,['refresh']);
});
test('a contract already beyond draft is reused without export or signing',async()=>{
  const f=fixture({create:async()=>({...contract,status:'TENANT_SIGNATURE_PENDING'})});
  assert.equal((await f.run()).fileState,'EXISTING');assert.deepEqual(f.calls,['refresh']);
});
test('missing information or a failed file export keeps the committed draft available for review',async()=>{
  const incomplete=fixture({completeness:async()=>({complete:false})});
  assert.equal((await incomplete.run()).fileState,'INCOMPLETE');assert.deepEqual(incomplete.calls,['refresh','create']);
  const failure=new Error('conversion unavailable');const f=fixture({preview:async()=>{throw failure;}});
  const result=await f.run();assert.equal(result.contract,contract);assert.equal(result.fileState,'UNAVAILABLE');
  assert.equal(result.fileError,failure);assert.deepEqual(f.calls,['refresh','create','complete:draft']);
});
test('unmount cancellation stops follow-up POST and file requests',async()=>{
  const controller=new AbortController();const f=fixture({refresh:async()=>{controller.abort();return view;}});
  await assert.rejects(createRentalContractFallback(f.transport,controller.signal,()=>{}),{name:'AbortError'});
  assert.deepEqual(f.calls,[]);
});
test('list and detail use the same guarded handler with a synchronous lock and private contract route',()=>{
  const list=read('components/rental-request/RentalRequestsManagement.tsx');const detail=read('components/rental-request/RentalRequestDetailModal.tsx');
  assert.match(list,/contractCreationLock\.current=true/);assert.match(list,/if \(contractCreationLock\.current/);
  assert.match(list,/onCreate=\{handleCreateDraft\}/);assert.match(list,/onCreateDraft=\{handleCreateDraft\}/);
  assert.match(detail,/onCreate=\{onCreateDraft\}/);assert.match(list,/contractDetailPath\("landlord",result\.contract\.id\)/);
});
