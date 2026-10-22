const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function load(file,resolve=require) {
  const mod={exports:{}};
  const js=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
    jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`)(resolve,mod,mod.exports);return mod.exports;
}
const meters=load('lib/contract-initial-meters.ts');
const MissingFieldsNotice=load('components/contract/detail/ContractMissingFieldsNotice.tsx',name=>{
  if(name==='next/link')return props=>React.createElement('a',props);
  return require(name);
}).default;
const Handover=load('components/contract/detail/ContractHandoverSection.tsx',name=>{
  if(name==='./ContractFieldState')return {ContractEditField:props=>props.children};
  if(name==='./utils')return {FieldRow:({label,value})=>React.createElement('p',null,label,': ',value)};
  return require(name);
}).default;

test('only missing or invalid required saved meter readings are prioritized; zero is valid',()=>{
  assert.deepEqual(meters.missingRequiredInitialMeters(null,true,true),['electricity','water']);
  assert.deepEqual(meters.missingRequiredInitialMeters({electricityInitial:0,waterInitial:'85.5'},true,true),[]);
  assert.deepEqual(meters.missingRequiredInitialMeters({electricityInitial:'0',waterInitial:''},true,false),[]);
  for(const invalid of ['', ' ', '-1', 'NaN','1e3','12,5','Infinity','9'.repeat(21)])
    assert.deepEqual(meters.missingRequiredInitialMeters({electricityInitial:invalid,waterInitial:'0'},true,true),['electricity']);
  assert.equal(meters.validateInitialMeterReading('',false,'Nước'),undefined);
  assert.match(meters.validateInitialMeterReading('',true,'Nước'),/Vui lòng nhập/);
});

function harness({status='DRAFT',parentContractId=null,role='landlord',saved={},charges,failSave=false,missingFields,remainingFields=[]}={}) {
  const initialContract={id:'contract',status,parentContractId,rentalRequestId:'rental',landlordId:'owner',tenantId:'tenant'};
  const initialRevision={id:'revision',meters:saved,charges:charges??[
    {chargeType:'ELECTRICITY',billingMethod:'PER_KWH'}, {chargeType:'WATER',billingMethod:'PER_M3'}]};
  const requiredFields=missingFields??[
    {key:'meters.electricityInitial',label:'Chỉ số điện ban đầu'},
    {key:'meters.waterInitial',label:'Chỉ số nước ban đầu'},
  ];
  const states=[initialContract,null,initialRevision,{complete:requiredFields.length===0,missingFields:requiredFields,filledFields:48,totalFields:50},[],null,null,null,
    false,false,false,false,false,String(saved.electricityInitial??''),String(saved.waterInitial??''),false,{}];
  let cursor=0,captured,patches=[];
  const notices=[];
  const fakeReact={...React,useState:initial=>{
    const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;
    return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];
  },useRef:value=>({current:value}),useEffect(){},useMemo:fn=>fn(),useCallback:fn=>fn};
  const marker=name=>props=>React.createElement('div',{'data-section':name},props.children);
  const service={
    updateRevision:async(id,request)=>{patches.push(request);if(failSave)throw new Error('save unavailable');return {...initialRevision,id:'revision-2',meters:request.meters};},
    getCompleteness:async()=>({complete:remainingFields.length===0,missingFields:remainingFields,filledFields:50-remainingFields.length,totalFields:50}),getDocuments:async()=>[],
  };
  const View=load('components/contract/ContractDetailView.tsx',name=>{
    if(name==='react')return fakeReact;
    if(name==='next/navigation')return {useParams:()=>({id:'contract'}),useRouter:()=>({replace(){},push(){}})};
    if(name==='next/link')return props=>React.createElement('a',props);
    if(name==='sonner')return {toast:{success:message=>notices.push(message),error:message=>notices.push(message)}};
    if(name==='@/features/auth/useAuth')return {useAuth:()=>({profile:{id:role==='landlord'?'owner':'tenant'}})};
    if(name==='@/services/contract.service')return {contractService:service};
    if(name==='@/lib/contract-initial-meters')return meters;
    if(name==='@/lib/contract-routes')return {contractListPath:()=>'/contracts',contractDetailPath:()=>'/contract',invoiceDetailPath:()=>'/invoices'};
    if(name==='@/lib/contract-preview')return {};
    if(name==='@/utils/apiError')return {getApiErrorMessage:error=>error.message};
    if(name.endsWith('/ContractHandoverSection'))return props=>{captured=props;return React.createElement(Handover,props);};
    if(name.endsWith('/ContractMissingFieldsNotice'))return MissingFieldsNotice;
    if(name.endsWith('/ContractFieldState'))return {ContractFieldLegend:marker('legend')};
    if(name.endsWith('/ContractAmendmentWorkspace'))return {__esModule:true,default:props=>props.children,ContractTermsNotice:marker('terms')};
    if(name.startsWith('@/components/'))return marker(name.split('/').pop());
    return require(name);
  }).default;
  return {
    render(){cursor=0;return renderToStaticMarkup(React.createElement(View,{perspective:role}));},
    get section(){return captured;},get patches(){return patches;},notices,
  };
}
const position=(html,name)=>html.indexOf(`data-section="${name}"`);
const assertTop=html=>{
  assert.ok(html.indexOf('id="contract-handover"')>position(html,'ContractHeader'));
  assert.ok(html.indexOf('id="contract-handover"')<position(html,'RentalOnboardingPanel'));
  assert.ok(html.indexOf('id="contract-handover"')<position(html,'ContractPartiesSection'));
  assert.equal((html.match(/id="contract-handover"/g)||[]).length,1);
};
const assertNormal=html=>{
  assert.ok(html.indexOf('id="contract-handover"')>position(html,'ContractPoliciesSection'));
  assert.ok(html.indexOf('id="contract-handover"')<position(html,'ContractDocumentSection'));
  assert.equal((html.match(/id="contract-handover"/g)||[]).length,1);
};

test('draft missing required readings puts one editor and an actionable notice immediately below the header',()=>{
  const h=harness();const html=h.render();assertTop(html);
  assert.match(html,/Hợp đồng còn 2 thông tin bắt buộc/);assert.match(html,/Vui lòng nhập chỉ số thực tế/);
  assert.equal((html.match(/<input/g)||[]).length,2);
  assert.equal((html.match(/data-contract-missing-fields/g)||[]).length,1);
  const start=html.indexOf('id="contract-handover"'),end=html.indexOf('</section>',start);
  const notice=html.indexOf('data-contract-missing-fields');assert.ok(notice>start&&notice<end);
  assert.match(html,/Đã điền 48\/50 trường/);assert.doesNotMatch(html,/meters\.electricityInitial|meters\.waterInitial/);
});
test('typing valid readings never moves the editor; a successful save restores the original position',async()=>{
  const h=harness();h.render();h.section.onElectricityChange('0');h.section.onWaterChange('85.5');
  assertTop(h.render());assert.equal(h.section.isDirty,true);
  await h.section.onSave();const saved=h.render();assertNormal(saved);
  assert.doesNotMatch(saved,/data-contract-missing-fields/);assert.equal(h.patches.length,1);
  assert.deepEqual(h.patches[0].meters,{electricityInitial:'0',waterInitial:'85.5'});
});

test('other missing fields share the same notice and survive after meters return to the normal position',async()=>{
  const other={key:'landlord.permanentAddress',label:'Nơi thường trú của chủ nhà'};
  const h=harness({missingFields:[{key:'meters.electricityInitial',label:'Chỉ số điện ban đầu'},
    {key:'meters.waterInitial',label:'Chỉ số nước ban đầu'},other],remainingFields:[other]});
  let html=h.render();assertTop(html);assert.equal((html.match(/data-contract-missing-fields/g)||[]).length,1);
  assert.match(html,/Thông tin khác cần bổ sung/);assert.match(html,/Nơi thường trú của chủ nhà/);
  assert.match(html,/href="\/settings\/profile"/);assert.doesNotMatch(html,/landlord\.permanentAddress/);
  h.section.onElectricityChange('0');h.section.onWaterChange('0');h.render();await h.section.onSave();
  html=h.render();assertNormal(html);assert.equal((html.match(/data-contract-missing-fields/g)||[]).length,1);
  assert.match(html,/Hợp đồng còn 1 thông tin bắt buộc/);assert.match(html,/Nơi thường trú của chủ nhà/);
  assert.ok(html.indexOf('data-contract-missing-fields')<html.indexOf('id="contract-handover"'));
});
test('failed saves keep both typed values and the editor at the top',async()=>{
  const h=harness({failSave:true});h.render();h.section.onElectricityChange('1250');h.section.onWaterChange('85');h.render();
  await h.section.onSave();const html=h.render();assertTop(html);
  assert.match(html,/value="1250"/);assert.match(html,/value="85"/);assert.ok(h.notices.includes('save unavailable'));
});
test('partial and negative input cannot save or move the editor',async()=>{
  const h=harness();h.render();h.section.onElectricityChange('-2');h.render();await h.section.onSave();
  assertTop(h.render());assert.equal(h.patches.length,0);
  assert.match(h.section.errors.electricity,/số không âm/);assert.match(h.section.errors.water,/Vui lòng nhập/);
});
test('the tenant sees a top notice but receives no edit inputs or save controls',()=>{
  const h=harness({role:'tenant'});const html=h.render();assertTop(html);
  assert.match(html,/Chủ nhà cần bổ sung/);assert.doesNotMatch(html,/<input|<button[^>]*>Lưu chỉ số/);
});
test('complete or non-metered contracts stay in the original position; water per person does not block',()=>{
  for(const options of [{saved:{electricityInitial:'0',waterInitial:'0'}},
    {saved:{electricityInitial:'100'},charges:[{chargeType:'ELECTRICITY',billingMethod:'PER_KWH'},{chargeType:'WATER',billingMethod:'PER_PERSON_MONTH'}]},
    {charges:[{chargeType:'ELECTRICITY',billingMethod:'FIXED_MONTHLY'}]}]) {
    const h=harness(options);const html=h.render();assertNormal(html);assert.doesNotMatch(html,/Cần bổ sung chỉ số/);
  }
});
test('signed contracts and child agreements never move meters or expose root draft editing',()=>{
  for(const options of [{status:'ACTIVE'},{status:'TENANT_SIGNATURE_PENDING'},{parentContractId:'root'}]) {
    const h=harness(options);const html=h.render();assertNormal(html);assert.doesNotMatch(html,/<input|Cần bổ sung chỉ số/);
  }
});
