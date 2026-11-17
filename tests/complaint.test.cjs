/* eslint-disable @typescript-eslint/no-require-imports -- Real complaint UI handlers with isolated transport and hooks. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
let pollCallbacks=[];
function compile(file,dependencies={}){const loaded={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:loaded,exports:loaded.exports,require:name=>dependencies[name]??require(name),document:{visibilityState:"visible"},window:{setInterval(fn){pollCallbacks.push(fn);return 1;},clearInterval(){},open(){return null;}}});return loaded.exports;}
const labels=compile("types/complaint.type.ts"),History=compile("components/complaint/ComplaintHistory.tsx",{"@/types/complaint.type":labels}).default;
const example=()=>({id:"case",rentalRequestId:"rental",contractId:"contract",tenantId:"tenant",landlordId:"owner",category:"REPAIR",reason:"Khóa cửa bị hỏng trước khi nhận nhà",openedBy:"tenant",openedAt:"2026-11-03T03:00:00Z",status:"OPEN",stage:"WAITING_RESPONSE",revision:7,respondBy:"2026-11-05T03:00:00Z",responseDueFor:"owner",overdue:false,adminReviewCount:0,adminReviewLimit:2,finalClosed:false,allowedActions:["COMMENT","ESCALATE","CLOSE"],events:[],evidenceIds:[]});
function panel(options={}){pollCallbacks=[];
  const c={...example(),...options.case},states=[options.rows??[c],"",options.reason??"Đã đọc và phản hồi đầy đủ hồ sơ",options.category??"OTHER",options.urgent??false,options.files??[],"",false,false,options.creating??false,options.action??"",options.modalOpen??true],updates=states.map(()=>[]);
  let index=0,refIndex=0,parentUpdates=0;const refs=[],effects=[],calls=[],errors=[];
  const hooks={...React,useId:()=>"test-complaint-actions",useState(initial){const i=index++;return [i<states.length?states[i]:initial,v=>updates[i].push(v)];},useRef(initial){return refs[refIndex++]??(refs[refIndex-1]={current:initial});},useCallback:fn=>fn,useEffect(fn){effects.push(fn);}};
  const api={list:async()=>{calls.push({kind:"list"});return options.nextRows??options.rows??[c];},open:async(...args)=>{calls.push({kind:"open",args});return c;},act:async(...args)=>{calls.push({kind:"act",args});if(options.error)throw options.error;return typeof options.pending==="function"?options.pending():options.pending??c;}};
  const C=compile("components/complaint/ComplaintPanel.tsx",{react:hooks,"@/features/auth/useAuth":{useAuth:()=>({profile:options.actor===null?null:{id:options.actor??"tenant"}})},"@/services/complaint.service":{complaintService:api},"@/services/storage.service":{default:{uploadComplaintEvidence:async(...args)=>{calls.push({kind:"upload",args});return "file";}}},"@/types/complaint.type":labels,"./ComplaintHistory":{default:History},"@/utils/apiError":{getApiErrorMessage:e=>e.message},sonner:{toast:{success(){},error:e=>errors.push(e)}}}).default;
  const tree=C({rentalRequestId:options.rental??"rental",onUpdated:async()=>{parentUpdates++;if(options.parentError)throw options.parentError;}});
  return {tree,html:renderToStaticMarkup(tree),calls,errors,updates,effects,get parentUpdates(){return parentUpdates;},get poll(){return pollCallbacks.at(-1);}};
}
function text(n){if(n==null||typeof n==="boolean")return "";if(Array.isArray(n))return n.map(text).join("");return typeof n==="object"?text(n.props?.children):String(n);}
function find(n,p){if(!n||typeof n!=="object")return;if(Array.isArray(n)){for(const v of n){const f=find(v,p);if(f)return f;}return;}return p(n)?n:find(n.props?.children,p);}
function button(f,label){const n=find(f.tree,n=>n.type==="button"&&text(n)===label);assert.ok(n,"missing button: "+label);return n;}
const tick=()=>new Promise(setImmediate);
test("party sees only server-authorized actions and deadline never implies automatic settlement",()=>{
  const f=panel();assert.ok(button(f,"Gửi trao đổi"));assert.ok(button(f,"Chuyển HomeSpace"));
  assert.match(f.html,/Quá hạn không tự đồng ý hay xử lý tiền/);
});
test("comment attaches private evidence to the rental and exact reviewed case version",async()=>{
  const f=panel({files:[{name:"photo.jpg",size:100}]});button(f,"Gửi trao đổi").props.onClick();await tick();
  assert.equal(f.calls.find(c=>c.kind==="upload").args[1],"rental");const post=f.calls.find(c=>c.kind==="act");
  assert.equal(post.args[0],"case");assert.equal(post.args[1],"COMMENT");assert.deepEqual(JSON.parse(JSON.stringify(post.args[2])),{expectedRevision:7,reason:"Đã đọc và phản hồi đầy đủ hồ sơ",evidenceIds:["file"]});assert.equal(f.parentUpdates,1);
});
test("stale action keeps entered reason and refreshes without retrying the mutation",async()=>{
  const f=panel({error:new Error("Hồ sơ đã thay đổi")});button(f,"Gửi trao đổi").props.onClick();await tick();
  assert.equal(f.calls.filter(c=>c.kind==="act").length,1);assert.equal(f.updates[2].length,0);assert.equal(f.parentUpdates,0);assert.match(f.errors[0],/đã thay đổi/);
});
test("double click posts only once while the first request is in flight",async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});const f=panel({pending});const click=button(f,"Gửi trao đổi").props.onClick;
  click();click();await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,1);release({});await tick();
});
test("legacy settlement actions are not offered or submitted",()=>{
  const f=panel({actor:"owner",case:{status:"ESCALATED",stage:"FOLLOW_UP",outcome:"REVISE_SETTLEMENT",allowedActions:["APPROVE_SETTLEMENT"]}});
  assert.equal(find(f.tree,n=>n.type==="textarea"),undefined);assert.doesNotMatch(f.html,/Đồng ý đề xuất quyết toán của admin/);
});

test("oversized evidence never uploads or opens a case",async()=>{
  const f=panel({creating:true,files:[{name:"large.pdf",size:16*1024*1024}]});button(f,"Gửi khiếu nại").props.onClick();await tick();
  assert.equal(f.calls.filter(c=>["upload","open"].includes(c.kind)).length,0);assert.match(f.errors[0],/15 MB/);
});
test("secondary actions require sending selected evidence first",()=>{
  const f=panel({files:[{name:"photo.pdf",size:100}]});assert.equal(button(f,"Chuyển HomeSpace").props.disabled,true);
});

test("opening sends category and leaves urgency off for ordinary issues",async()=>{
  const f=panel({creating:true,category:"REPAIR",urgent:true});button(f,"Gửi khiếu nại").props.onClick();await tick();
  const post=f.calls.find(c=>c.kind==="open");assert.equal(post.args[0],"rental");assert.equal(post.args[1].category,"REPAIR");assert.equal(post.args[1].urgent,false);
});
test("closing history from another rental or logged-in account is not rendered",()=>{
  assert.doesNotMatch(panel({rental:"another"}).html,/Khóa cửa bị hỏng/);assert.doesNotMatch(panel({actor:"stranger"}).html,/Khóa cửa bị hỏng/);assert.equal(panel({actor:null}).html,"");
});
test("late response after identity change cannot clear the next note or refresh old parent",async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});const f=panel({pending});
  const leave=f.effects[0]();const clears=f.updates[2].length;button(f,"Gửi trao đổi").props.onClick();await tick();leave();release({});await tick();
  assert.equal(f.updates[2].length,clears);assert.equal(f.parentUpdates,0);
});
test("financial details are left to settlement pages even for old complaints",()=>{
  const f=panel({case:{category:"DEPOSIT_SETTLEMENT",settlement:{version:1,deduction:null,refund:null,balance:null,ownerApproved:false,accepted:false}}});assert.doesNotMatch(f.html,/Quyết toán phiên bản|Khấu trừ .*Hoàn/);
});

test("automatic polling cannot silently replace the reviewed version while writing a response",async()=>{
  const f=panel({nextRows:[{...example(),revision:99}]});const stop=f.effects[1]();await tick();f.updates[0].length=0;
  find(f.tree,n=>n.type==="textarea").props.onChange({target:{value:"Tôi đang kiểm tra phiên bản đã xem"}});
  f.poll();await tick();assert.equal(f.updates[0].length,0);
  button(f,"Tải lại").props.onClick();await tick();assert.equal(f.updates[0].at(-1)[0].revision,99);stop();
});
test("closed complaint shows its reason and reopen action without pretending a bank receipt",()=>{
  const f=panel({case:{status:"RESOLVED",stage:"WITHDRAWN",closingReason:"Đã rút để trao đổi lại phương án sửa khóa",allowedActions:["REOPEN"]}});
  assert.match(f.html,/Đã rút để trao đổi lại/);assert.ok(button(f,"Mở lại có lý do"));assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Xác nhận đã nhận tiền"),undefined);
});


test("early-exit complaint with empty rent calculation still renders evidence and PDF context",()=>{const c=example();c.sources=[{workflowId:"w",kind:"EARLY_EXIT",revision:2,status:"PROPOSED",capturedAt:c.openedAt,proposal:{reason:"Đã kiểm tra thỏa thuận",endExclusive:"2026-12-20",handoverTerms:"Trả chìa khóa"},history:[],evidenceIds:["proof"],rentCalculation:{},documents:[{storageObjectId:"pdf",signingContractId:"doc",purpose:"OFFICIAL",sourceRevision:2}]}];const html=renderToStaticMarkup(React.createElement(History,{complaint:c,onProof(){}}));assert.match(html,/Thỏa thuận chấm dứt sớm/);assert.match(html,/Trả chìa khóa/);assert.match(html,/PDF căn cứ 1/);assert.doesNotMatch(html,/Tiền thuê kỳ cuối/);});


test("contract page stays compact until a modal is opened",()=>{
  const f=panel({modalOpen:false});assert.ok(button(f,"Xem trao đổi (1)"));
  assert.equal(find(f.tree,n=>n.type==="textarea"),undefined);assert.doesNotMatch(f.html,/Khóa cửa bị hỏng/);
  button(f,"Xem trao đổi (1)").props.onClick();assert.equal(f.updates[11].at(-1),true);
});
test("modal uses one composer and no agreement controls",()=>{
  const f=panel();assert.ok(find(f.tree,n=>n.type==="dialog"));assert.ok(button(f,"Gửi trao đổi"));
  assert.equal(find(f.tree,n=>n.props?.role==="radiogroup"),undefined);assert.doesNotMatch(f.html,/Đề xuất thỏa thuận|Đồng ý thỏa thuận|Các bước xử lý/);
});
test("escalation sends only reason and the reviewed version",async()=>{
  const f=panel({action:"ESCALATE"});button(f,"Chuyển HomeSpace").props.onClick();await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls.find(c=>c.kind==="act").args)),["case","ESCALATE",{expectedRevision:7,reason:"Đã đọc và phản hồi đầy đủ hồ sơ"}]);
});
test("modal cannot close while a submission is running",async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});const f=panel({pending});button(f,"Gửi trao đổi").props.onClick();await tick();
  button(f,"Đóng").props.onClick();assert.equal(f.updates[11].length,0);release({});await tick();
});

test("evidence selection alone freezes the reviewed version during automatic refresh",async()=>{
  const f=panel({reason:"",nextRows:[{...example(),revision:99}]});const stop=f.effects[1]();await tick();f.updates[0].length=0;
  find(f.tree,n=>n.type==="input"&&n.props.type==="file").props.onChange({target:{files:[{name:"evidence.jpg",size:100}],value:"evidence.jpg"}});
  f.poll();await tick();assert.equal(f.updates[0].length,0);stop();
});

test("a parent refresh failure after save does not report the mutation as failed or retry it",async()=>{
  const f=panel({parentError:new Error("Parent is offline")});button(f,"Gửi trao đổi").props.onClick();await tick();
  assert.equal(f.calls.filter(c=>c.kind==="act").length,1);assert.equal(f.calls.filter(c=>c.kind==="list").length,1);
  assert.equal(f.updates[2].at(-1),"");assert.match(f.errors[0],/Hồ sơ đã được lưu/);
});

test("an old identity's completion cannot unlock a new scope's in-flight action",async()=>{
  let first,second;let count=0;const promises=[new Promise(resolve=>{first=resolve;}),new Promise(resolve=>{second=resolve;})];
  const f=panel({pending:()=>promises[count++]??{}}),leave=f.effects[0](),click=button(f,"Gửi trao đổi").props.onClick;
  click();await tick();leave();click();await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,2);
  first({});await tick();click();await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,2);
  second({});await tick();
});


test("workflow source history correctly attributes admin and system actions",()=>{
  const c=example();c.sources=[{workflowId:"w",kind:"EARLY_EXIT",revision:3,status:"AGREED",capturedAt:c.openedAt,proposal:{},history:[{revision:1,role:"ADMIN",at:c.openedAt,reason:"Đã kiểm tra hồ sơ"},{revision:2,role:"SYSTEM",at:c.openedAt,reason:"Đã đồng bộ trạng thái"}],evidenceIds:[]}];
  const html=renderToStaticMarkup(React.createElement(History,{complaint:c}));assert.match(html,/HomeSpace: Đã kiểm tra hồ sơ/);assert.match(html,/Hệ thống: Đã đồng bộ trạng thái/);
});

test("either party sees the self-resolution close button before admin intervention",()=>{
  for(const actor of ["tenant","owner"]){const f=panel({actor});assert.ok(button(f,"Đã giải quyết · Đóng hồ sơ"));}
});
test("self-resolution close sends only its reason and reviewed revision",async()=>{
  const f=panel({actor:"owner",action:"CLOSE"});button(f,"Đã giải quyết · Đóng hồ sơ").props.onClick();await tick();
  const post=f.calls.find(c=>c.kind==="act");assert.equal(post.args[1],"CLOSE");assert.equal(post.args[2].expectedRevision,7);assert.equal(post.args[2].adminReviewCount,undefined);
});
test("first admin finding keeps discussion and clearly offers the last review",()=>{
  const f=panel({case:{stage:"FOLLOW_UP",adminReviewCount:1,decision:"Chủ nhà kiểm tra và sửa khóa phòng"}});
  assert.ok(button(f,"Gửi trao đổi"));assert.ok(button(f,"Yêu cầu admin xem xét lần 2"));assert.ok(button(f,"Đã giải quyết · Đóng hồ sơ"));
  assert.match(f.html,/Kết luận lần 2 sẽ kết thúc hồ sơ/);assert.match(f.html,/Admin đã kết luận 1\/2 lần/);
});
test("second review request posts escalation without a client-controlled review count",async()=>{
  const f=panel({action:"ESCALATE",case:{stage:"FOLLOW_UP",adminReviewCount:1}});button(f,"Yêu cầu admin xem xét lần 2").props.onClick();await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls.find(c=>c.kind==="act").args)),["case","ESCALATE",{expectedRevision:7,reason:"Đã đọc và phản hồi đầy đủ hồ sơ"}]);
});
test("final second conclusion is read-only even if an older action list was retained",()=>{
  const f=panel({case:{status:"RESOLVED",stage:"CLOSED",adminReviewCount:2,finalClosed:true,allowedActions:["COMMENT","REOPEN"]}});
  assert.equal(find(f.tree,n=>n.type==="textarea"),undefined);assert.equal(find(f.tree,n=>n.type==="input"&&n.props.type==="file"),undefined);
  assert.match(f.html,/Admin đã kết luận lần 2 và đóng hồ sơ/);assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Mở lại có lý do"),undefined);
});
