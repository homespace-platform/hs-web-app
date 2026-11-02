/* eslint-disable @typescript-eslint/no-require-imports -- Exercise real panel handlers and markup with isolated API and hooks. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const root=path.join(__dirname,"..");
function compile(file,dependencies){const loaded={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:loaded,exports:loaded.exports,require:name=>dependencies[name]??require(name),window:{setInterval(){return 1;},clearInterval(){},open(){return null;}},setTimeout,clearTimeout});return loaded.exports;}
const labels=compile("types/payment-dispute.type.ts",{});
const reviewedCase=()=>({id:"case",paymentId:"payment",payerId:"tenant",payeeId:"owner",openedBy:"tenant",reason:"Chứng từ cần kiểm tra lại",openedAt:"2026-11-03T03:00:00Z",status:"OPEN",previousPaymentStatus:"REJECTED",paymentStatus:"DISPUTED",paymentType:"MONTHLY_RENT",direction:"TENANT_TO_LANDLORD",amount:3000000,currency:"VND",revision:7,allowedActions:["COMMENT","PROPOSE","ESCALATE"],events:[],evidences:[{storageId:"proof",uploadedBy:"tenant"}]});
function panel(options={}){
  const c={...reviewedCase(),...options.case},payment={id:"payment",payerId:"tenant",payeeId:"owner",status:"DISPUTED",type:"MONTHLY_RENT",direction:"TENANT_TO_LANDLORD",...options.payment};
  const states=[true,options.rows??[c],"",options.reason??"Đã kiểm tra đủ chứng cứ liên quan",options.file??null,options.resolution??"REVIEW_TRANSFER",false,"",false],updates=states.map(()=>[]);
  let index=0,refIndex=0;const refs=[],calls=[],errors=[],effects=[];let parentUpdates=0,uploads=0;
  const api={list:async()=>options.rows??[c],adopt:async(...args)=>{calls.push({kind:"adopt",args});return c;},act:async(...args)=>{calls.push({kind:"act",args});if(options.actError)throw options.actError;return options.pending?options.pending:c;}};
  const hooks={...React,useState(initial){const i=index++;return [i<states.length?states[i]:typeof initial==="function"?initial():initial,value=>updates[i].push(value)];},useRef(initial){const i=refIndex++;return refs[i]??(refs[i]={current:initial});},useEffect(fn){effects.push(fn);},useCallback(fn){return fn;}};
  const C=compile("components/payment/PaymentDisputePanel.tsx",{
    react:hooks,"@/features/auth/useAuth":{useAuth:()=>({profile:{id:options.actor??"tenant"}})},
    "@/services/payment-dispute.service":{paymentDisputeService:api},
    "@/services/payment-request.service":{default:{dispute:async(...args)=>calls.push({kind:"open",args})}},
    "@/services/storage.service":{default:{uploadPaymentProof:async()=>{uploads++;return "new-proof";}}},
    "@/utils/apiError":{getApiErrorMessage:e=>e.message},"@/types/payment-dispute.type":labels,
    sonner:{toast:{success(){},error:e=>errors.push(e)}},
  }).default;
  const tree=C({payment,onUpdated:async()=>{parentUpdates++;}});
  return {tree,html:renderToStaticMarkup(tree),calls,errors,updates,effects,get parentUpdates(){return parentUpdates;},get uploads(){return uploads;}};
}
function text(node){if(node===null||node===undefined||typeof node==="boolean")return "";if(typeof node!=="object")return String(node);if(Array.isArray(node))return node.map(text).join("");return text(node.props?.children);}
function find(node,predicate){if(!node||typeof node!=="object")return undefined;if(Array.isArray(node)){for(const child of node){const found=find(child,predicate);if(found)return found;}return;}if(predicate(node))return node;return find(node.props?.children,predicate);}
function button(f,label){const node=find(f.tree,n=>n.type==="button"&&text(n)===label);assert.ok(node,`button ${label} rendered`);return node;}
const tick=()=>new Promise(setImmediate);

test("payer sees only backend-authorized case actions, never a receipt confirmation action",()=>{
  const f=panel();assert.ok(button(f,"Gửi đề xuất"));assert.ok(button(f,"Chuyển quản trị viên"));
  assert.equal(find(f.tree,n=>n.type==="button"&&/Xác nhận.*nhận tiền/.test(text(n))),undefined);
  assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Đồng ý hướng xử lý"),undefined);
});
test("a proposer waits for the other party and cannot accept their own proposal",()=>{
  const f=panel({case:{proposedBy:"tenant",proposedResolution:"REOPEN_TRANSFER",allowedActions:["COMMENT","ESCALATE"]}});
  assert.match(f.html,/chờ bên còn lại phản hồi/);assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Đồng ý hướng xử lý"),undefined);
});
test("accept sends exact reviewed case revision and reason without money, actor or receipt mutations",async()=>{
  const f=panel({actor:"owner",case:{proposedBy:"tenant",proposedResolution:"REVIEW_TRANSFER",allowedActions:["COMMENT","ACCEPT","DECLINE","ESCALATE"]}});
  button(f,"Đồng ý hướng xử lý").props.onClick();await tick();
  assert.equal(f.calls.length,1);const [id,action,payload]=f.calls[0].args;
  assert.equal(id,"case");assert.equal(action,"ACCEPT");assert.deepEqual(JSON.parse(JSON.stringify(payload)),{expectedRevision:7,reason:"Đã kiểm tra đủ chứng cứ liên quan"});assert.equal(f.parentUpdates,1);
});
test("a stale failed decision reloads data, keeps the note and never retries a POST automatically",async()=>{
  const f=panel({actor:"owner",case:{proposedBy:"tenant",allowedActions:["ACCEPT"]},actError:new Error("Hồ sơ đã thay đổi")});
  button(f,"Đồng ý hướng xử lý").props.onClick();await tick();
  assert.equal(f.calls.length,1);assert.equal(f.updates[3].length,0);assert.equal(f.parentUpdates,0);assert.match(f.errors[0],/đã thay đổi/);
});
test("mutex prevents duplicate decisions before the first response arrives",async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const f=panel({actor:"owner",case:{proposedBy:"tenant",allowedActions:["ACCEPT"]},pending});
  const click=button(f,"Đồng ý hướng xử lý").props.onClick;click();click();assert.equal(f.calls.length,1);release({});await tick();assert.equal(f.parentUpdates,1);
});

test("late action response after changing payment or unmounting cannot clear a new note or update the old parent",async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const f=panel({actor:"owner",case:{proposedBy:"tenant",allowedActions:["ACCEPT"]},pending});
  const leave=f.effects[0](),clears=f.updates[3].length;
  button(f,"Đồng ý hướng xử lý").props.onClick();leave();release({});await tick();
  assert.equal(f.calls.length,1);assert.equal(f.parentUpdates,0);assert.equal(f.updates[3].length,clears);
});
test("evidence is uploaded for the payment then attached to the reviewed case, without declaring a transfer",async()=>{
  const f=panel({file:{size:100,name:"proof.pdf"}});button(f,"Gửi phản hồi / chứng cứ").props.onClick();await tick();
  assert.equal(f.uploads,1);assert.equal(f.calls.length,1);assert.equal(f.calls[0].args[1],"COMMENT");
  assert.equal(f.calls[0].args[2].evidenceStorageId,"new-proof");assert.equal(f.calls[0].args[2].expectedRevision,7);
});
test("oversized evidence never uploads or mutates a case",async()=>{
  const f=panel({file:{size:16*1024*1024,name:"large.pdf"}});button(f,"Gửi phản hồi / chứng cứ").props.onClick();await tick();assert.equal(f.uploads,0);assert.equal(f.calls.length,0);assert.match(f.errors[0],/15 MB/);
});
test("review cannot be proposed without evidence and explains the missing step",()=>{
  const f=panel({case:{evidences:[]}});assert.equal(button(f,"Gửi đề xuất").props.disabled,true);assert.match(f.html,/Bổ sung chứng cứ/);
});
test("legacy disputed payment gets explicit adoption rather than pretending it has no problem",async()=>{
  const f=panel({rows:[]});button(f,"Tiếp nhận khoản đang đối soát").props.onClick();await tick();assert.equal(f.calls[0].kind,"adopt");assert.equal(f.calls[0].args[0],"payment");
});
test("resolved cases state the next real payment step and do not still ask for agreement",()=>{
  const f=panel({case:{status:"RESOLVED",resolution:"REVIEW_TRANSFER",proposedBy:"tenant",proposedResolution:"REVIEW_TRANSFER",allowedActions:[]},payment:{status:"TRANSFER_REPORTED"}});
  assert.match(f.html,/Bên nhận cần kiểm tra tài khoản/);assert.doesNotMatch(f.html,/chờ bên còn lại phản hồi/);assert.match(f.html,/Chưa có xác nhận thực nhận/);
});
test("switching payment identity never renders the old case history and outsiders see no panel",()=>{
  const f=panel({payment:{id:"new-payment"}});assert.doesNotMatch(f.html,/Chứng từ cần kiểm tra lại/);
  assert.equal(panel({actor:"outsider"}).html,"");
});
test("history resolution metadata is rendered safely and unknown values are never treated as receipt decisions",()=>{
  assert.match(labels.disputeEventResolution('{"resolution":"REVIEW_TRANSFER"}'),/Kiểm tra chứng từ/);
  assert.equal(labels.disputeEventResolution('{"resolution":"CONFIRMED"}'),undefined);assert.equal(labels.disputeEventResolution("broken json"),undefined);
});
