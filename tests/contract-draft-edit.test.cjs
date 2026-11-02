/* eslint-disable @typescript-eslint/no-require-imports -- Execute real editor handlers with isolated service/state dependencies. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const source=fs.readFileSync(path.join(__dirname,"../components/contract/ContractDetailView.tsx"),"utf8");
const ast=ts.createSourceFile("view.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function handler(name,overrides={}) {
  let declaration;
  function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)declaration=node;ts.forEachChild(node,visit);}
  visit(ast);assert.ok(declaration,`Editor handler ${name} exists`);
  const calls=[],errors=[],saved=[];
  const revision={id:"revision-viewed",landlord:{idNumber:"000123"},tenant:{occupantCount:2},lease:{durationMonths:12},
    financial:{depositAmountValue:"999999999"},meters:{electricityInitial:"0",waterInitial:"0"},specialTerms:"Thỏa thuận cũ",policies:{petPolicy:"Không nuôi"}};
  const context={contractId:"contract",revision,electricityInitial:"100.125",waterInitial:"25",electricityRequired:true,waterRequired:true,isWaterPerPerson:false,
    validateInitialMeterReading:(value)=>Number.isFinite(Number(value))&&Number(value)>=0?undefined:"Chỉ số không hợp lệ",
    setMeterErrors:()=>{},setSavingMeters:()=>{},setElectricityInitial:()=>{},setWaterInitial:()=>{},setCompleteness:()=>{},setDocuments:()=>{},
    setRevision:(value)=>saved.push(value),toast:{success:()=>{},error:(e)=>errors.push(e)},getApiErrorMessage:(e)=>e.message,
    contractService:{updateRevision:async(id,payload)=>{calls.push({id,payload});return {...revision,id:"new-revision",meters:payload.meters??revision.meters};},
      getCompleteness:async()=>({complete:true}),getDocuments:async()=>[]},...overrides};
  const compiled=ts.transpileModule(declaration.getText(ast)+`;globalThis.run=${name};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(compiled,context);
  return {run:context.run,calls,errors,saved};
}
test("saving a meter sends the viewed revision and readings, never poisoned document identity, rent, dates or receipt",async()=>{
  const f=handler("handleSaveMeters");await f.run();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,"contract");
  const body=JSON.parse(JSON.stringify(f.calls[0].payload));
  assert.deepEqual(body,{baseRevisionId:"revision-viewed",meters:{electricityInitial:"100.125",waterInitial:"25"},revisionNote:"Cập nhật chỉ số điện nước ban đầu."});
  assert.equal(f.saved[0].id,"new-revision");
});
test("invalid meter input never calls the update API",async()=>{
  const f=handler("handleSaveMeters",{electricityInitial:"-1"});await f.run();assert.equal(f.calls.length,0);
});
test("special terms are saved independently of all operational fields",async()=>{
  const f=handler("handleSaveSpecialTerms");await f.run("Nội dung mới");
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].payload)),{baseRevisionId:"revision-viewed",specialTerms:"Nội dung mới",revisionNote:"Cập nhật điều khoản thỏa thuận riêng."});
});
test("late-fee editing sends only its two editable controls and the viewed revision",async()=>{
  const f=handler("handleSaveLateFee");await f.run({latePaymentFeeMode:"FIXED_ONCE",latePaymentFeeAmount:50000});
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].payload)),{baseRevisionId:"revision-viewed",policies:{latePaymentFeeMode:"FIXED_ONCE",latePaymentFeeAmount:50000},revisionNote:"Cập nhật điều khoản phí chậm thanh toán."});
});
test("stale/locked save errors remain errors and do not replace the reviewed revision or report success",async()=>{
  let successes=0;const error=new Error("Bản nháp đã có phiên bản mới");
  for(const name of ["handleSaveSpecialTerms","handleSaveLateFee"]){
    const f=handler(name,{contractService:{updateRevision:async()=>{throw error;}},toast:{error:()=>{},success:()=>{successes++;}}});
    await assert.rejects(f.run(name==="handleSaveLateFee"?{latePaymentFeeMode:"NONE"}:"Giữ lại nội dung"),/phiên bản mới/);
    assert.equal(f.saved.length,0);
  }
  assert.equal(successes,0);
});
