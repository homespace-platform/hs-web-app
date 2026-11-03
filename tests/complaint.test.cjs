/* eslint-disable @typescript-eslint/no-require-imports -- Real complaint UI handlers with isolated transport and hooks. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
let pollCallbacks=[];
function compile(file,dependencies={}){const loaded={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:loaded,exports:loaded.exports,require:name=>dependencies[name]??require(name),window:{setInterval(fn){pollCallbacks.push(fn);return 1;},clearInterval(){},open(){return null;}}});return loaded.exports;}
const labels=compile("types/complaint.type.ts"),History=compile("components/complaint/ComplaintHistory.tsx",{"@/types/complaint.type":labels}).default;
const example=()=>({id:"case",rentalRequestId:"rental",contractId:"contract",tenantId:"tenant",landlordId:"owner",category:"REPAIR",reason:"Khóa cửa bị hỏng trước khi nhận nhà",openedBy:"tenant",openedAt:"2026-11-03T03:00:00Z",status:"OPEN",stage:"WAITING_RESPONSE",revision:7,respondBy:"2026-11-05T03:00:00Z",responseDueFor:"owner",overdue:false,allowedActions:["COMMENT","PROPOSE","WITHDRAW"],events:[],evidenceIds:[]});
function panel(options={}){pollCallbacks=[];
  const c={...example(),...options.case},states=[true,options.rows??[c],"",options.reason??"Đã đọc và phản hồi đầy đủ hồ sơ",options.category??"OTHER",options.urgent??false,options.files??[],"",false,false,options.creating??false],updates=states.map(()=>[]);
  let index=0,refIndex=0,parentUpdates=0;const refs=[],effects=[],calls=[],errors=[];
  const hooks={...React,useState(initial){const i=index++;return [i<states.length?states[i]:initial,v=>updates[i].push(v)];},useRef(initial){return refs[refIndex++]??(refs[refIndex-1]={current:initial});},useCallback:fn=>fn,useEffect(fn){effects.push(fn);}};
  const api={list:async()=>{calls.push({kind:"list"});return options.nextRows??options.rows??[c];},open:async(...args)=>{calls.push({kind:"open",args});return c;},act:async(...args)=>{calls.push({kind:"act",args});if(options.error)throw options.error;return options.pending??c;}};
  const C=compile("components/complaint/ComplaintPanel.tsx",{react:hooks,"@/features/auth/useAuth":{useAuth:()=>({profile:options.actor===null?null:{id:options.actor??"tenant"}})},"@/services/complaint.service":{complaintService:api},"@/services/storage.service":{default:{uploadComplaintEvidence:async(...args)=>{calls.push({kind:"upload",args});return "file";}}},"@/types/complaint.type":labels,"./ComplaintHistory":{default:History},"@/utils/apiError":{getApiErrorMessage:e=>e.message},sonner:{toast:{success(){},error:e=>errors.push(e)}}}).default;
  const tree=C({rentalRequestId:options.rental??"rental",onUpdated:async()=>{parentUpdates++;}});
  return {tree,html:renderToStaticMarkup(tree),calls,errors,updates,effects,get parentUpdates(){return parentUpdates;},get poll(){return pollCallbacks.at(-1);}};
}
function text(n){if(n==null||typeof n==="boolean")return "";if(Array.isArray(n))return n.map(text).join("");return typeof n==="object"?text(n.props?.children):String(n);}
function find(n,p){if(!n||typeof n!=="object")return;if(Array.isArray(n)){for(const v of n){const f=find(v,p);if(f)return f;}return;}return p(n)?n:find(n.props?.children,p);}
function button(f,label){const n=find(f.tree,n=>n.type==="button"&&text(n)===label);assert.ok(n,"missing button: "+label);return n;}
const tick=()=>new Promise(setImmediate);
test("party sees only server-authorized actions and deadline never implies automatic settlement",()=>{
  const f=panel();assert.ok(button(f,"Phản hồi / bổ sung chứng cứ"));assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Chuyển HomeSpace"),undefined);
  assert.match(f.html,/Quá hạn không tự đồng ý hay xử lý tiền/);
});
test("comment attaches private evidence to the rental and exact reviewed case version",async()=>{
  const f=panel({files:[{name:"photo.jpg",size:100}]});button(f,"Phản hồi / bổ sung chứng cứ").props.onClick();await tick();
  assert.equal(f.calls.find(c=>c.kind==="upload").args[1],"rental");const post=f.calls.find(c=>c.kind==="act");
  assert.equal(post.args[0],"case");assert.equal(post.args[1],"COMMENT");assert.deepEqual(JSON.parse(JSON.stringify(post.args[2])),{expectedRevision:7,reason:"Đã đọc và phản hồi đầy đủ hồ sơ",evidenceIds:["file"]});assert.equal(f.parentUpdates,1);
});
test("stale action keeps entered reason and refreshes without retrying the mutation",async()=>{
  const f=panel({error:new Error("Hồ sơ đã thay đổi")});button(f,"Phản hồi / bổ sung chứng cứ").props.onClick();await tick();
  assert.equal(f.calls.filter(c=>c.kind==="act").length,1);assert.equal(f.updates[3].length,0);assert.equal(f.parentUpdates,0);assert.match(f.errors[0],/đã thay đổi/);
});
test("double click posts only once while the first request is in flight",async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});const f=panel({pending});const click=button(f,"Phản hồi / bổ sung chứng cứ").props.onClick;
  click();click();await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,1);release({});await tick();
});
test("completion and owner agreement never send receipt, money or actor mutations",async()=>{
  const f=panel({actor:"owner",case:{status:"ESCALATED",stage:"FOLLOW_UP",outcome:"REVISE_SETTLEMENT",allowedActions:["APPROVE_SETTLEMENT"]}});
  button(f,"Đồng ý đề xuất quyết toán của admin").props.onClick();await tick();const payload=f.calls.find(c=>c.kind==="act").args[2];
  assert.deepEqual(JSON.parse(JSON.stringify(payload)),{expectedRevision:7,reason:"Đã đọc và phản hồi đầy đủ hồ sơ"});
  assert.match(f.html,/chưa xác nhận đã chuyển tiền/);
});
test("oversized evidence never uploads or opens a case",async()=>{
  const f=panel({creating:true,files:[{name:"large.pdf",size:16*1024*1024}]});button(f,"Gửi khiếu nại").props.onClick();await tick();
  assert.equal(f.calls.filter(c=>["upload","open"].includes(c.kind)).length,0);assert.match(f.errors[0],/15 MB/);
});
test("pending evidence must be sent as comment before a proposal",async()=>{
  const f=panel({files:[{name:"photo.pdf",size:100}]});button(f,"Đề xuất thỏa thuận").props.onClick();await tick();assert.equal(f.calls.length,0);assert.match(f.errors[0],/Gửi chứng cứ/);
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
  const leave=f.effects[0]();const clears=f.updates[3].length;button(f,"Phản hồi / bổ sung chứng cứ").props.onClick();await tick();leave();release({});await tick();
  assert.equal(f.updates[3].length,clears);assert.equal(f.parentUpdates,0);
});
test("unknown legacy settlement amounts render as unknown rather than crash or become zero",()=>{
  const f=panel({case:{category:"DEPOSIT_SETTLEMENT",settlement:{version:1,deduction:null,refund:null,balance:null,ownerApproved:false,accepted:false}}});assert.match(f.html,/Chưa có dữ liệu/);
});
test("automatic polling cannot silently replace the reviewed version while writing a response",async()=>{
  const f=panel({nextRows:[{...example(),revision:99}]});const stop=f.effects[2]();await tick();f.updates[1].length=0;
  find(f.tree,n=>n.type==="textarea").props.onChange({target:{value:"Tôi đang kiểm tra phiên bản đã xem"}});
  f.poll();await tick();assert.equal(f.updates[1].length,0);
  button(f,"Tải lại").props.onClick();await tick();assert.equal(f.updates[1].at(-1)[0].revision,99);stop();
});
test("closed complaint shows its reason and reopen action without pretending a bank receipt",()=>{
  const f=panel({case:{status:"RESOLVED",stage:"WITHDRAWN",closingReason:"Đã rút để trao đổi lại phương án sửa khóa",allowedActions:["REOPEN"]}});
  assert.match(f.html,/Đã rút để trao đổi lại/);assert.ok(button(f,"Mở lại có lý do"));assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Xác nhận đã nhận tiền"),undefined);
});


test("handover complaint with empty rent calculation still renders evidence and PDF context",()=>{const c=example();c.sources=[{workflowId:"w",kind:"MOVE_IN",revision:2,status:"PROPOSED",capturedAt:c.openedAt,proposal:{reason:"Đã kiểm tra biên bản",keys:2,inventory:[{name:"Tủ lạnh",quantity:1,condition:"Đang hoạt động"}]},history:[],evidenceIds:["proof"],rentCalculation:{},documents:[{storageObjectId:"pdf",signingContractId:"doc",purpose:"OFFICIAL",sourceRevision:2}]}];const html=renderToStaticMarkup(React.createElement(History,{complaint:c,onProof(){}}));assert.match(html,/Tủ lạnh/);assert.match(html,/PDF căn cứ 1/);assert.doesNotMatch(html,/Tiền thuê kỳ cuối/);});
