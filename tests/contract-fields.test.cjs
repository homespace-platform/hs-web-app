/* eslint-disable @typescript-eslint/no-require-imports -- Contract schema/UI regression against local source. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const root=path.resolve(__dirname,".."),workspace=path.resolve(root,".."),read=p=>fs.readFileSync(path.join(workspace,p),"utf8");
const prompt=read("hs-infra/prompts/CONTRACT_PROMPT.md"),catalog=read("hs-core-api/hs-contract-service/src/main/java/com/hs/contract/service/engine/ContractFieldCatalog.java");
const known=[...catalog.matchAll(/\badd\("([#\w.]+)"/g)].map(m=>m[1]);
const markers=s=>[...new Set([...s.matchAll(/\{\{([#\w.]+)\}\}/g)].map(m=>m[1]))].sort();

test("prompt bodies have exactly 56/57/57 supported unique markers, with six bank fields and six dynamic tables",()=>{
  assert.equal(known.length,64);const parts=prompt.split(/### PROMPT \d:/).slice(1);assert.equal(parts.length,3);
  const required=[...catalog.matchAll(/\badd\("([^"\n]+)"[^\n]+, ALL\);/g)].map(m=>m[1]);assert.equal(required.length,27);
  for(const [i,part] of parts.entries()) {
    const body=part.split("III. CẤU TRÚC ĐIỀU KHOẢN CHI TIẾT")[1].split("```")[0],codes=markers(body);
    assert.equal(codes.length,i===0?56:57);assert.deepEqual(codes.filter(c=>!known.includes(c)),[]);
    for(const key of [...required,...(i===0?[]:["property.unitNumber"])])assert.ok(codes.includes(key),key);
    for(const who of ["landlord","tenant"])for(const key of ["bankName","bankAccountNumber","bankAccountHolder"])assert.ok(codes.includes(`${who}.${key}`));
    for(const key of known.filter(c=>c.startsWith("#")))assert.equal([...body.matchAll(new RegExp("\\{\\{"+key+"\\}\\}","g"))].length,1,key);
  }
  const catalogSection=prompt.split("## II. DANH MỤC 64")[1].split("## III.")[0];assert.deepEqual(markers(catalogSection),[...known].sort());
});

test("all catalog fields route to a view and amendment editor or an explicitly protected/derived record",()=>{
  const protectedCodes=new Set(["contract.number","contract.signingDate","contract.signingCity","contract.schemaVersion","contract.revisionNumber","rent.paymentDueDay","meters.electricityInitial","meters.waterInitial","#initialPaymentTable",...known.filter(k=>k.startsWith("payment.initial."))]);
  const derived=new Set(["rent.amountWords","deposit.amountWords"]);
  assert.equal(protectedCodes.size,18);assert.equal(derived.size,2);assert.equal(known.filter(k=>!protectedCodes.has(k)&&!derived.has(k)).length,44);
  const files={landlord:"ContractPartiesSection",tenant:"ContractPartiesSection",property:"ContractPropertySection",lease:"ContractLeaseSection",rent:"ContractFinancialSection",deposit:"ContractFinancialSection",payment:"ContractInitialPaymentSection",meters:"ContractHandoverSection",contract:"ContractHeader"};
  const dynamic={"#chargesTable":"ContractChargesSection","#equipmentTable":"ContractEquipmentSection","#amenitiesTable":"ContractAmenitiesSection","#policiesTable":"ContractPoliciesSection","#propertyFeaturesTable":"ContractPropertySection","#initialPaymentTable":"ContractInitialPaymentSection"};
  const aliases={"deposit.amountNumber":"depositAmountNumber","deposit.amountWords":"depositAmountWords","deposit.description":"depositDescription","contract.number":"contractNumber","contract.signingDate":"signedAt"};
  for(const code of known) {
    const section=dynamic[code]??(code==="contract.specialTerms"?"ContractPoliciesSection":files[code.split(".")[0]]);
    assert.ok(section,code);const source=fs.readFileSync(path.join(root,"components/contract/detail",section+".tsx"),"utf8");
    if(!code.startsWith("#"))assert.ok(source.includes(aliases[code]??code.split(".").at(-1)),`${code} missing from ${section}`);
  }
  const main=fs.readFileSync(path.join(root,"components/contract/ContractDetailView.tsx"),"utf8");
  for(const section of new Set([...Object.values(files),...Object.values(dynamic)]))assert.ok(main.includes(`<${section}`),section+" is not mounted");
});

function loader(w) {
  const cache=new Map();
  function load(file) {
    file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;
    const mod={exports:{}};cache.set(file,mod);
    const source=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    const resolve=name=>{
      if(name.endsWith("ContractAmendmentWorkspace"))return {useAmendmentWorkspace:()=>w,amendmentInput:"input"};
      if(name.startsWith(".")||name.startsWith("@/")) {
        const base=name.startsWith("@/")?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name);
        const target=[base,base+".tsx",base+".ts"].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());return load(target);
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(resolve,mod,mod.exports);return mod.exports;
  }
  return load;
}
for(const type of ["Nhà nguyên căn","Căn hộ chung cư","Phòng trọ"])test(`${type}: both bank snapshots render in view/edit; initial ledger stays read-only and unchanged`,()=>{
  const a={fullName:"Owner",bankName:"Ngân hàng A",bankAccountNumber:"000123456",bankAccountHolder:"CHU TAI KHOAN A"},b={fullName:"Tenant",bankName:"Ngân hàng B",bankAccountNumber:"000987654",bankAccountHolder:"CHU TAI KHOAN B",occupantCount:2};
  const initialPayment={status:"CONFIRMED",monthlyRent:12345,depositAmount:67890,totalAmount:80235,payerReportedAt:"2026-10-15T01:00:00Z",payeeConfirmedAt:"2026-10-15T01:05:00Z",confirmedAt:"2026-10-15T01:05:00Z",transferReference:"REF-ORIGINAL",bankTransactionReference:"BANK-ORIGINAL",paidAt:"2026-10-15T01:05:00Z",transactionCode:"LEGACY-ORIGINAL",rows:[{itemName:"Khoản đã chốt",amountText:"80.235 VNĐ",note:"Xác nhận gốc"}]};
  const terms={landlord:a,tenant:b,property:{propertyType:type},financial:{amountValue:"999999999",depositAmountValue:"999999999"},initialPayment};
  const w={editing:false,data:{currentTerms:terms},values:structuredClone(terms),busy:false,patch(){}};
  const load=loader(w),Parties=load("components/contract/detail/ContractPartiesSection.tsx").default,Initial=load("components/contract/detail/ContractInitialPaymentSection.tsx").default;
  const props={landlord:{bankAccountNumber:"LIVE-PROFILE-DO-NOT-USE"},tenant:{}};
  let html=renderToStaticMarkup(React.createElement(Parties,props));
  for(const person of [a,b])for(const key of ["bankName","bankAccountNumber","bankAccountHolder"])assert.ok(html.includes(person[key]),key);
  assert.doesNotMatch(html,/LIVE-PROFILE-DO-NOT-USE/);
  w.editing=true;html=renderToStaticMarkup(React.createElement(Parties,props));
  for(const person of [a,b])for(const key of ["bankName","bankAccountNumber","bankAccountHolder"])assert.ok(html.includes(`value="${person[key]}"`),key);
  html=renderToStaticMarkup(React.createElement(Initial,{initialPayment:{totalAmount:999999999}}));
  for(const value of ["REF-ORIGINAL","BANK-ORIGINAL","LEGACY-ORIGINAL","Khoản đã chốt","80.235 VNĐ"])assert.ok(html.includes(value),value);
  assert.doesNotMatch(html,/999999999|<input|<textarea|<select/);assert.equal(initialPayment.totalAmount,80235);
});
