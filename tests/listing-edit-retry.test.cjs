const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function harness(error) {
  const source=fs.readFileSync(require.resolve('../app/dashboard/properties/new/page.tsx'),'utf8');
  const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const membership=ts.createSourceFile('membership.ts',fs.readFileSync(require.resolve('../lib/membership.ts'),'utf8'),ts.ScriptTarget.Latest,true);
  const quotaCheck=membership.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='isListingQuotaExhaustedError');
  assert.ok(quotaCheck);
  let save;
  function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='handleSaveListing')save=node;ts.forEachChild(node,visit);}
  visit(ast);assert.ok(save);
  const requests=[],messages=[],routes=[];let rejected=true;
  const noop=()=>{};
  const context={isSubmitting:false,isEditMode:true,isDuplicateMode:false,loadedListingStatus:'RESERVED',rentedLockListing:null,
    profile:{id:'owner'},router:{push:path=>routes.push(path)},requireKyc:()=>true,validateAllFields:()=>true,
    listingOptions:{amenities:[],policies:[{code:'petPolicy',valueType:'TEXT',required:true}]},policyCatalogError:null,
    listingPolicies:[{code:'petPolicy',value:'Giữ vệ sinh'}],selectedBranch:null,
    basicInfo:{title:'Nội dung đang sửa',images:[{storageObjectId:'existing-photo'}],videos:[]},
    editId:'listing',duplicateFrom:null,apartmentDetails:{},houseDetails:{},roomDetails:{roomCode:'P0200'},furnishingAssets:[],
    selectedAmenities:[],monthlyExpenses:{},vehicleLimits:null,chargeBaseline:null,pricing:{},addressMode:'new',savedUserAddress:null,selectedAddress:{refId:'map-ref'},selectedViewingDays:[],selectedViewingSlots:[],
    buildCreateListingPayload:values=>({id:values.id,title:values.basicInfo.title,roomCode:values.roomDetails.roomCode}),policyInputs:values=>values,
    toast:{error:message=>messages.push(message),success:noop,loading:noop},getApiErrorMessage:e=>e.response.data.message,
    axios:{isAxiosError:()=>true},console:{error:noop},
    listingService:{upsert:async body=>{requests.push(body);if(rejected){rejected=false;throw error;}return {pendingEditId:'review-new'};}},
    setIsSubmitting:value=>context.isSubmitting=value,setSubmittingAction:noop,
    setQuotaExhaustedModalOpen:noop,setQuotaExhaustedBanner:noop,
    setLoadedListingStatus:value=>context.loadedListingStatus=value,setRentedLockListing:value=>context.rentedLockListing=value,
  };
  vm.runInNewContext(ts.transpileModule(quotaCheck.getText(membership).replace(/^export\s+/,'')+'\n'+save.getText(ast)+';globalThis.save=handleSaveListing;',{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
  return {context,requests,messages,routes};
}
test('a validation/stale conflict keeps the edit form and entered fields available for a successful retry',async()=>{
  for(const code of [409,4008,4005]) {
    const h=harness({response:{status:409,data:{code,message:'Kiểm tra lại trường vừa sửa'}}});
    await h.context.save('SUBMIT_FOR_REVIEW');
    assert.equal(h.context.rentedLockListing,null);assert.equal(h.context.loadedListingStatus,'RESERVED');
    assert.equal(h.context.basicInfo.title,'Nội dung đang sửa');assert.equal(h.context.roomDetails.roomCode,'P0200');
    assert.deepEqual(h.messages,['Kiểm tra lại trường vừa sửa']);
    await h.context.save('SUBMIT_FOR_REVIEW');
    assert.equal(h.requests.length,2);assert.deepEqual(h.routes,['/dashboard/properties']);
  }
});
test('the actual externally rented error still locks the form and prevents resubmission',async()=>{
  const h=harness({response:{status:409,data:{code:4012,message:'Tin đã cho thuê ngoài'}}});
  await h.context.save('SUBMIT_FOR_REVIEW');
  assert.equal(h.context.loadedListingStatus,'RENTED_EXTERNALLY');assert.equal(h.context.rentedLockListing.isExternal,true);
  await h.context.save('SUBMIT_FOR_REVIEW');assert.equal(h.requests.length,1);
});
