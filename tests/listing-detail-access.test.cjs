const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const output=ts.transpileModule(read("lib/listing-detail-access.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInThisContext(`(function(module,exports){${output}\n})`)(mod,mod.exports);
const {listingDetailPath,fetchListingForViewer}=mod.exports;
test("rental request list and details link to the full listing page, not the preview modal",()=>{
  assert.equal(listingDetailPath("listing-id"),"/rent/listing-id");
  assert.equal(listingDetailPath("a/b?next=x"),"/rent/a%2Fb%3Fnext%3Dx");
  const list=read("components/rental-request/RentalRequestsManagement.tsx");
  const detail=read("components/rental-request/RentalRequestDetailModal.tsx");
  assert.match(list,/href=\{listingDetailPath\(req.listingId\)\}/);
  assert.match(detail,/href=\{listingDetailPath\(detail.listingId\)\}/);
  assert.equal((list.match(/href=\{listingDetailPath\(req.listingId\)\}/g)||[]).length,3);
  assert.doesNotMatch(list,/ListingPreviewModal|[pP]reviewListingId|onViewListing/);
  assert.doesNotMatch(detail,/onViewListing/);
});
test("authenticated viewers use server access checks; guests use public endpoint",async()=>{
  const calls=[];
  const detail={ownerId:"owner",status:"RENTED"};
  const api={async getAccessibleById(id){calls.push(["authenticated",id]);return detail;},
    async getById(id){calls.push(["public",id]);return {status:"PUBLISHED"};}};
  assert.equal(await fetchListingForViewer("listing",true,api),detail);
  assert.equal((await fetchListingForViewer("listing",false,api)).status,"PUBLISHED");
  assert.deepEqual(calls,[["authenticated","listing"],["public","listing"]]);
});
test("access denial or network failure is not silently retried as public/owner access",async()=>{
  for(const status of [401,403,404,500,undefined]) {
    let publicCalls=0;
    const error={response:{status}};
    await assert.rejects(fetchListingForViewer("private",true,{async getAccessibleById(){throw error;},
      async getById(){publicCalls++;}}),actual=>actual===error);
    assert.equal(publicCalls,0);
  }
  const page=read("app/rent/[id]/page.tsx");
  assert.match(page,/userId === property.ownerId/);
  assert.doesNotMatch(page,/isOwnerView = true/);
  assert.match(page,/loadedFor !== requestKey/);
  assert.match(page,/if \(!id \|\| !initialized\) return/);
});
