/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the actual TS components with isolated HTTP and browser dependencies. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
function load(file,imports,globals={}){
  const source=fs.readFileSync(path.join(__dirname,"..",file),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}};vm.runInNewContext(`(function(require,module,exports){${output}\n})`,{...globals})(imports,mod,mod.exports);return mod.exports;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(service){
  const slots=[],messages=[],revoked=[],downloads=[];let index=0,tree;
  const hooks={...React,useState(initial){const i=index++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==="function"?v(slots[i]):v;}];},useRef(value){const i=index++;return slots[i]??(slots[i]={current:value});},useEffect(effect,deps){const i=index++,previous=slots[i];if(!previous||!deps||deps.some((value,n)=>!Object.is(value,previous.deps[n]))){previous?.cleanup?.();slots[i]={deps,cleanup:effect()};}}};
  const dialog=Object.fromEntries(["Root","Portal","Overlay","Content","Title","Description","Close"].map(key=>[key,`dialog-${key}`]));
  const doc={body:{appendChild(){}},createElement(){const a={click(){downloads.push({href:a.href,name:a.download});},remove(){}};return a;}};
  const mod=load("components/payment/PaymentReceiptActions.tsx",name=>name==="react"?hooks:name==="@radix-ui/react-dialog"?dialog:name==="@/services/payment-receipt.service"?{paymentReceiptService:service}:name==="sonner"?{toast:{info:m=>messages.push(m),error:m=>messages.push(m)}}:name==="@/utils/apiError"?{getApiErrorMessage:(_e,fallback)=>fallback}:require(name),{document:doc,URL:{createObjectURL:()=>"blob:receipt",revokeObjectURL:url=>revoked.push(url)},setTimeout:fn=>fn()});
  function render(props={paymentId:"payment"}){index=0;const wrapper=mod.default(props);tree=wrapper.type(wrapper.props);return tree;}
  function nodes(node,type){if(!node||typeof node!=="object")return[];return[...(node.type===type?[node]:[]),...React.Children.toArray(node.props?.children).flatMap(child=>nodes(child,type))];}
  return {render,buttons:()=>nodes(tree,"button"),nodes:type=>nodes(tree,type),messages,downloads,revoked,unmount:()=>slots.forEach(value=>value?.cleanup?.())};
}
test("receipt controls never fetch before a click and pending PDF never downloads",async()=>{
  let lookups=0,pdfs=0;const h=harness({byPayment:async()=>{lookups++;return{pdfStatus:"PENDING"};},pdf:async()=>{pdfs++;}});h.render();assert.equal(lookups,0);
  h.buttons()[0].props.onClick({currentTarget:{focus(){}}});await tick();assert.equal(lookups,1);assert.equal(pdfs,0);assert.equal(h.messages.length,1);h.unmount();
});
test("ready receipt downloads the authenticated PDF with its own receipt filename",async()=>{
  const calls=[];const h=harness({byPayment:async()=>({id:"receipt-id",receiptNumber:"HS-TT-123",pdfStatus:"READY"}),pdf:async(...args)=>{calls.push(args);return new Blob(["pdf"]);}});
  h.render();h.buttons()[1].props.onClick();await tick();assert.deepEqual(calls,[["receipt-id"]]);assert.deepEqual(h.downloads,[{href:"blob:receipt",name:"HS-TT-123.pdf"}]);assert.deepEqual(h.revoked,["blob:receipt"]);h.unmount();
});
test("repeated clicks share one in-flight request and unmount drops stale responses",async()=>{
  let resolve,calls=0;const pending=new Promise(r=>{resolve=r;});const h=harness({byPayment:async()=>{calls++;return pending;},pdf:async()=>new Blob(["pdf"])});
  h.render();h.buttons()[1].props.onClick();h.buttons()[1].props.onClick();assert.equal(calls,1);h.unmount();resolve({id:"receipt",receiptNumber:"HS",pdfStatus:"READY"});await tick();assert.equal(h.downloads.length,0);
});
test("PDF errors show a useful message and do not offer a fake successful download",async()=>{
  const h=harness({byPayment:async()=>({id:"receipt",pdfStatus:"READY"}),pdf:async()=>{throw new Error("403");}});h.render();h.buttons()[1].props.onClick();await tick();assert.equal(h.downloads.length,0);assert.match(h.messages[0],/Chưa mở được/);h.unmount();
});
test("preview closes with URL cleanup and restores focus without scrolling the page",async()=>{
  let focusOptions;const h=harness({byPayment:async()=>({id:"receipt",receiptNumber:"HS",pdfStatus:"READY"}),pdf:async()=>new Blob(["pdf"])});
  h.render();h.buttons()[0].props.onClick({currentTarget:{focus:options=>{focusOptions=options;}}});await tick();h.render();
  assert.equal(h.nodes("iframe")[0].props.src,"blob:receipt");
  h.nodes("dialog-Content")[0].props.onCloseAutoFocus({preventDefault(){}});assert.equal(focusOptions.preventScroll,true);
  h.nodes("dialog-Root")[0].props.onOpenChange(false);h.render();assert.equal(h.nodes("iframe").length,0);assert.deepEqual(h.revoked,["blob:receipt"]);h.unmount();
});
test("receipt service reconstructs the original PDF from authenticated JSON without requesting a download URL",async()=>{
  const bytes=Buffer.concat([Buffer.from("%PDF-"),Buffer.from([0,127,128,255])]);
  let payload={result:bytes.toString("base64")};
  const calls=[],client={get:async(...args)=>{calls.push(args);return{data:payload};},post:async(...args)=>{calls.push(args);return{data:{result:{id:"r"}}};}};
  const {paymentReceiptService:s}=load("services/payment-receipt.service.ts",name=>name==="@/lib/axios-client"?{default:client}:require(name),{Blob,atob});
  await s.list({role:"TENANT",contractId:"lease",page:2,size:12});await s.byPayment("payment/id");
  const pdf=await s.pdf("r");await s.retry("r");
  assert.equal(calls[0][1].params.role,"TENANT");assert.equal(calls[0][1].params.contractId,"lease");assert.match(calls[1][0],/payment%2Fid$/);
  assert.deepEqual(calls[2],["/api/v1/payment-receipts/r/content"]);assert.match(calls[3][0],/\/r\/retry$/);
  assert.equal(pdf.type,"application/pdf");assert.deepEqual(Buffer.from(await pdf.arrayBuffer()),bytes);
  for(const invalid of ["",{result:"%%%"},{result:Buffer.from("not PDF").toString("base64")}]){
    payload=invalid;await assert.rejects(s.pdf("r"),/Không nhận được nội dung hóa đơn PDF/);
  }
});
test("the confirmed-receipts page explains the confirmation boundary",()=>{
  const Component=load("components/dashboard/invoices/PaymentReceiptsPanel.tsx",name=>name==="@/services/payment-receipt.service"?{paymentReceiptService:{}}:name==="@/components/payment/PaymentReceiptActions"?{default:()=>null}:name==="@/utils/apiError"?{getApiErrorMessage:()=>"error"}:require(name)).default;
  const html=renderToStaticMarkup(React.createElement(Component,{role:"tenant"}));assert.match(html,/Mỗi khoản tiền đã được bên nhận xác nhận/);assert.match(html,/Chứng từ đã thanh toán/);
});
