import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const source={storageObjectId:"stored-signed-pdf",signingContractId:"workflow/a",purpose:"SIGNED_FINAL",sourceRevision:3};
const row={id:"doc/a",contractId:"workflow/a",storageObjectId:source.storageObjectId,purpose:"SIGNED_FINAL",documentType:"PDF",status:"READY"};
function fixture(rows=[row],failure){
 const calls=[],module={exports:{}};
 const client={get:async(...args)=>{calls.push(["metadata",...args]);return {data:{result:rows}};},post:async(...args)=>{calls.push(["content",...args]);if(failure)throw failure;return {data:new Blob(["verified PDF"])};}};
 const code=ts.transpileModule(fs.readFileSync(new URL("../services/complaint.service.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name==="@/lib/axios-client"?{default:client}:require(name),Blob});
 return {service:module.exports.complaintService,calls};
}

test("signed source resolves its exact historical PDF then reads only verified bytes",async()=>{
 const newer={...row,id:"new-pdf",storageObjectId:"newer-storage"};const f=fixture([newer,row]);
 const bytes=await f.service.sourcePdf(source);
 assert.equal(await bytes.text(),"verified PDF");assert.equal(bytes.type,"application/pdf");
 assert.equal(f.calls[0][1],"/api/v1/contracts/workflow%2Fa/documents");
 assert.equal(f.calls[1][1],"/api/v1/contracts/documents/doc%2Fa/content");assert.equal(f.calls[1][3].responseType,"blob");
});

test("missing or ambiguous source identity never falls back to a newer PDF or direct storage",async()=>{
 for(const rows of [[],[{...row,storageObjectId:"newer"}],[{...row,contractId:"other-contract"}],[{...row,purpose:"OFFICIAL"}],[{...row,status:"FAILED"}],[row,row]]){
   const f=fixture(rows);await assert.rejects(f.service.sourcePdf(source),/Không tìm thấy đúng PDF/);
   assert.equal(f.calls.filter(c=>c[0]==="content").length,0);
 }
 const f=fixture();await assert.rejects(f.service.sourcePdf({...source,signingContractId:""}),/Thiếu định danh/);assert.equal(f.calls.length,0);
});

test("integrity failure is surfaced and never retried through an unverified URL",async()=>{
 const f=fixture([row],{response:{data:new Blob([JSON.stringify({message:"PDF không khớp bản đã ký."})])}});
 await assert.rejects(f.service.sourcePdf(source),/không khớp/);assert.equal(f.calls.length,2);
});
