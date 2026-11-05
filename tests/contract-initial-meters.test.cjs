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
  vm.runInThisContext(`(function(require,module,exports,window,document){${js}\n})`)(resolve,mod,mod.exports,
    {scrollTo(){}},{getElementById:()=>null});return mod.exports;
}
const meters=load('lib/contract-initial-meters.ts');
const draftEditor=load('components/contract/detail/ContractDraftEditor.tsx');
const utils={FieldRow:({label,value})=>React.createElement('p',null,label,': ',value),ContractSnapshotReadOnly:React.createContext(false)};
const sectionDeps=name=>{
  if(name==='./ContractFieldState')return {ContractEditField:props=>props.children};
  if(name==='./utils')return utils;
  if(name==='./ContractDraftEditor')return draftEditor;
  if(name==='./ContractAmendmentWorkspace')return {useAmendmentWorkspace:()=>null,amendmentInput:''};
  if(name==='@/components/ui/vnd-money-input')return ()=>null;
  if(name==='@/data/banks')return load('data/banks.ts');
  if(name.startsWith('@/lib/'))return load(name.slice(2)+'.ts');
  return require(name);
};
const inline=load('components/contract/detail/InlineAmendmentFields.tsx',sectionDeps);
const MissingFieldsNotice=load('components/contract/detail/ContractMissingFieldsNotice.tsx',name=>{
  if(name==='next/link')return props=>React.createElement('a',props);
  return require(name);
}).default;
const Handover=load('components/contract/detail/ContractHandoverSection.tsx',name=>{
  if(name==='./ContractFieldState')return {ContractEditField:props=>props.children};
  if(name==='./utils')return {FieldRow:({label,value})=>React.createElement('p',null,label,': ',value)};
  return require(name);
}).default;
const section=name=>load('components/contract/detail/'+name+'.tsx',key=>key==='./InlineAmendmentFields'?inline:sectionDeps(key)).default;
const Parties=section('ContractPartiesSection'), Property=section('ContractPropertySection');

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
  const initialRevision={id:'revision',landlord:{fullName:'Chủ nhà',phone:'0901234567',email:'owner@example.com'},
    tenant:{fullName:'Người thuê'},property:{fullAddress:'12 Nguyễn Văn Bảo',areaText:'30 mét vuông'},meters:saved,charges:charges??[
    {chargeType:'ELECTRICITY',billingMethod:'PER_KWH'}, {chargeType:'WATER',billingMethod:'PER_M3'}]};
  const requiredFields=missingFields??[
    {key:'meters.electricityInitial',label:'Chỉ số điện ban đầu'},
    {key:'meters.waterInitial',label:'Chỉ số nước ban đầu'},
  ];
  const states=[initialContract,null,initialRevision,{complete:requiredFields.length===0,missingFields:requiredFields,filledFields:48,totalFields:50},[],null,null,null,
    false,false,false,false,false,String(saved.electricityInitial??''),String(saved.waterInitial??''),false,{},undefined,false,false,{}];
  let cursor=0,captured,header,patches=[];
  const notices=[];
  const fakeReact={...React,useState:initial=>{
    const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;
    return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];
  },useRef:value=>({current:value}),useEffect(){},useMemo:fn=>fn(),useCallback:fn=>fn};
  const marker=name=>props=>React.createElement('div',{'data-section':name},props.children);
  const service={
    updateRevision:async(id,request)=>{patches.push(request);if(failSave)throw new Error('save unavailable');return {...initialRevision,id:'revision-2',meters:request.meters};},
    getCompleteness:async()=>({revisionId:'revision-2',complete:remainingFields.length===0,missingFields:remainingFields,filledFields:50-remainingFields.length,totalFields:50}),getDocuments:async()=>[],
  };
  const View=load('components/contract/ContractDetailView.tsx',name=>{
    if(name==='react')return fakeReact;
    if(name==='next/navigation')return {useParams:()=>({id:'contract'}),useRouter:()=>({replace(){},push(){}})};
    if(name==='next/link')return props=>React.createElement('a',props);
    if(name==='sonner')return {toast:{success:message=>notices.push(message),error:message=>notices.push(message)}};
    if(name==='@/features/auth/useAuth')return {useAuth:()=>({profile:{id:role==='landlord'?'owner':'tenant'}})};
    if(name==='@/services/contract.service')return {contractService:service};
    if(name==='@/lib/contract-initial-meters')return meters;
    if(name==='@/validation/user.schema')return load('validation/user.schema.ts');
    if(name==='@/lib/contract-routes')return {contractListPath:()=>'/contracts',contractDetailPath:()=>'/contract',invoiceDetailPath:()=>'/invoices'};
    if(name==='@/lib/contract-preview')return {generateContractPreview:async()=>({id:'pdf',revisionId:'revision-2',documentType:'PDF',status:'READY',storageObjectId:'object'})};
    if(name==='@/utils/apiError')return {getApiErrorMessage:error=>error.message};
    if(name.endsWith('/ContractHandoverSection'))return props=>{captured=props;return React.createElement(Handover,props);};
    if(name.endsWith('/ContractPartiesSection'))return props=>React.createElement(marker('ContractPartiesSection'),null,React.createElement(Parties,props));
    if(name.endsWith('/ContractPropertySection'))return Property;
    if(name.endsWith('/ContractDraftEditor'))return draftEditor;
    if(name.endsWith('/ContractHeader'))return props=>{header=props;return React.createElement('div',{'data-section':'ContractHeader'});};
    if(name.endsWith('/detail/utils'))return {ContractSnapshotReadOnly:React.createContext(false)};
    if(name.endsWith('/ContractMissingFieldsNotice'))return MissingFieldsNotice;
    if(name.endsWith('/ContractFieldState'))return {ContractFieldLegend:marker('legend')};
    if(name==='./AgreementDocumentActions')return {default:()=>null};
    if(name.endsWith('/ContractAmendmentWorkspace'))return {__esModule:true,default:props=>props.children,ContractTermsNotice:marker('terms')};
    if(name.startsWith('@/components/'))return marker(name.split('/').pop());
    return require(name);
  }).default;
  return {
    render(){cursor=0;return renderToStaticMarkup(React.createElement(View,{perspective:role}));},
    get section(){return captured;},get header(){return header;},get patches(){return patches;},notices,
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
  assert.equal((html.match(/<input/g)||[]).length,19);
  assert.match(html,/<form id="lease-draft-form"/);
  assert.match(html,/<input type="tel"[^>]*value="0901234567"/);
  assert.match(html,/<input type="email"[^>]*value="owner@example.com"/);
  assert.match(html,/<input[^>]*aria-label="Họ và tên Bên B"[^>]*value="Người thuê"/);
  assert.match(html,/Địa chỉ tài sản: 12 Nguyễn Văn Bảo/);
  assert.doesNotMatch(html,/<input[^>]*aria-label="Địa chỉ tài sản"/);
  assert.match(html,/<input[^>]*aria-label="Số CCCD \/ Định danh Bên A"/);
    assert.match(html,/<select[^>]*aria-label="Ngân hàng Bên A"/);
  assert.equal(h.header.draftReview.formId,'lease-draft-form');
  assert.equal((html.match(/data-contract-missing-fields/g)||[]).length,1);
  const start=html.indexOf('id="contract-handover"'),end=html.indexOf('</section>',start);
  const notice=html.indexOf('data-contract-missing-fields');assert.ok(notice>start&&notice<end);
  assert.match(html,/Đã điền 48\/50 trường/);assert.doesNotMatch(html,/meters\.electricityInitial|meters\.waterInitial/);
});
test('the owner keeps the meter editor in one position while typing and after save and export',async()=>{
  const h=harness();h.render();h.section.onElectricityChange('0');h.section.onWaterChange('85.5');
  const edited=h.render();assertTop(edited);
  assert.doesNotMatch(edited,/data-contract-missing-fields/);
  assert.match(edited,/Có thay đổi chưa lưu/);
  await h.header.onRender();const saved=h.render();assertTop(saved);
  assert.doesNotMatch(saved,/data-contract-missing-fields/);assert.equal(h.patches.length,1);
  assert.doesNotMatch(saved,/Có thay đổi chưa lưu/);
  assert.deepEqual(h.patches[0].meters,{electricityInitial:'0',waterInitial:'85.5'});
});

test('other missing fields stay visible after the meter readings are saved',async()=>{
  const other={key:'landlord.permanentAddress',label:'Nơi thường trú của chủ nhà'};
  const h=harness({missingFields:[{key:'meters.electricityInitial',label:'Chỉ số điện ban đầu'},
    {key:'meters.waterInitial',label:'Chỉ số nước ban đầu'},other],remainingFields:[other]});
  let html=h.render();assertTop(html);assert.equal((html.match(/data-contract-missing-fields/g)||[]).length,1);
  assert.match(html,/Thông tin khác cần bổ sung/);assert.match(html,/Nơi thường trú của chủ nhà/);
  assert.match(html,/href="\/settings\/profile"/);assert.doesNotMatch(html,/landlord\.permanentAddress/);
  h.section.onElectricityChange('0');h.section.onWaterChange('0');h.render();await h.header.onRender();
  html=h.render();assertTop(html);assert.equal((html.match(/data-contract-missing-fields/g)||[]).length,1);
  assert.match(html,/Hợp đồng còn 1 thông tin bắt buộc/);assert.match(html,/Nơi thường trú của chủ nhà/);
});
test('failed saves keep both typed values and the editor at the top',async()=>{
  const h=harness({failSave:true});h.render();h.section.onElectricityChange('1250');h.section.onWaterChange('85');h.render();
  await h.header.onRender();const html=h.render();assertTop(html);
  assert.match(html,/value="1250"/);assert.match(html,/value="85"/);assert.ok(h.notices.includes('save unavailable'));
});
test('partial and negative input cannot save or move the editor',async()=>{
  const h=harness();h.render();h.section.onElectricityChange('-2');h.render();await h.header.onRender();
  assertTop(h.render());assert.equal(h.patches.length,0);
  assert.match(h.section.errors.electricity,/số không âm/);assert.match(h.section.errors.water,/Vui lòng nhập/);
});
test('the tenant sees a top notice but receives no edit inputs or save controls',()=>{
  const h=harness({role:'tenant'});const html=h.render();assertTop(html);
  assert.match(html,/Chủ nhà cần bổ sung/);assert.doesNotMatch(html,/<input|<button[^>]*>Lưu chỉ số/);
});
test('complete or non-metered drafts keep their form at the top without a meter warning',()=>{
  for(const options of [{saved:{electricityInitial:'0',waterInitial:'0'}},
    {saved:{electricityInitial:'100'},charges:[{chargeType:'ELECTRICITY',billingMethod:'PER_KWH'},{chargeType:'WATER',billingMethod:'PER_PERSON_MONTH'}]},
    {charges:[{chargeType:'ELECTRICITY',billingMethod:'FIXED_MONTHLY'}]}]) {
    const h=harness({...options,missingFields:[]});const html=h.render();assertTop(html);assert.doesNotMatch(html,/Cần bổ sung chỉ số/);
  }
});
test('signed contracts and child agreements never move meters or expose root draft editing',()=>{
  for(const options of [{status:'ACTIVE'},{status:'TENANT_SIGNATURE_PENDING'},{parentContractId:'root'}]) {
    const h=harness(options);const html=h.render();assertNormal(html);assert.doesNotMatch(html,/<input|Cần bổ sung chỉ số/);
  }
});
