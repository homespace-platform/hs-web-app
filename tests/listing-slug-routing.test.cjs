const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const src=fs.readFileSync(path.join(__dirname,"..","lib/listing-detail-access.ts"),"utf8");
const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInThisContext(`(function(module,exports){${out}\n})`)(mod,mod.exports);
const {listingDetailPath,stripHtmlSuffix,isUuid,fetchListingBySlugForViewer}=mod.exports;
const id="3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";
test("slug path building with id fallback",()=>{
  assert.equal(listingDetailPath({id,slug:"phong-tro-22m2-k7x9q2ab"}),"/rent/phong-tro-22m2-k7x9q2ab.html");
  assert.equal(listingDetailPath(id,"abc"),"/rent/abc.html");
  assert.equal(listingDetailPath({id,slug:null}),`/rent/${id}`);
  assert.equal(listingDetailPath({id}),`/rent/${id}`);
  assert.equal(listingDetailPath(id),`/rent/${id}`);
});
test("html suffix stripping and uuid detection",()=>{
  assert.equal(stripHtmlSuffix("abc-k7x9.html"),"abc-k7x9");
  assert.equal(stripHtmlSuffix("abc-k7x9"),"abc-k7x9");
  assert.equal(stripHtmlSuffix("a.html.html"),"a.html");
  assert.ok(isUuid(id)&&isUuid(stripHtmlSuffix(`${id}.html`)));
  assert.ok(!isUuid("phong-tro-22m2-k7x9q2ab")&&!isUuid(`${id}x`));
});
test("slug fetch picks the authenticated endpoint only for signed-in viewers",async()=>{
  const api={getAccessibleBySlug:async s=>["auth",s],getBySlug:async s=>["public",s]};
  assert.deepEqual(await fetchListingBySlugForViewer("s",true,api),["auth","s"]);
  assert.deepEqual(await fetchListingBySlugForViewer("s",false,api),["public","s"]);
});
