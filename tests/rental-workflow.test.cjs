/* eslint-disable @typescript-eslint/no-require-imports -- Exercise real UI handlers with isolated transport. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
function compile(file,deps={},globals={}){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>deps[n]??require(n),window:{open(){return null;}},...globals});return m.exports;}
const labels=compile("types/rental-workflow.type.ts");
const Calendar=()=>React.createElement("div",{"data-calendar":true});
function fixture(options={}){
 const data={kind:"CANCELLATION",status:"PROPOSED",revision:7,role:"TENANT",serverNow:"2026-11-03T03:00:00Z",contractId:"contract",proposal:{reason:"Đề nghị hoàn toàn bộ khoản đã nhận"},history:[],allowedActions:["ACCEPT","REJECT"],depositObligation:"RESERVATION_PENDING",refundPayments:[],terminationOptions:{currentEndExclusive:"2027-02-12",choices:[{lastOccupiedDay:"2026-12-11",endExclusive:"2026-12-12"},{lastOccupiedDay:"2027-01-11",endExclusive:"2027-01-12"}]},...options.data};
 const states=[options.expanded??true,data,"",false,options.creating??false,"Đã kiểm tra nội dung và đồng ý thỏa thuận",options.ack??true,options.contacted??true,options.files??[],options.end??"2026-12-12",options.paymentId,null,options.selectedAction??null];
 let i=0,ri=0,parents=0;const changes=states.map(()=>[]),refs=[],effects=[],calls=[],errors=[],initials=[];
 const hooks={...React,useState(v){initials.push(v);const n=i++;return[n<states.length?states[n]:v,value=>changes[n].push(value)];},useRef(v){return refs[ri++]??(refs[ri-1]={current:v});},useEffect(fn){effects.push(fn);},useCallback:fn=>fn};
 const service={calculate:async(...args)=>{calls.push({kind:"calculate",args});return options.quote;},get:async(...args)=>{calls.push({kind:"get",args});return data;},act:async(...args)=>{calls.push({kind:"act",args});if(options.error)throw options.error;return options.pending??data;},propose:async(...args)=>{calls.push({kind:"propose",args});if(options.error)throw options.error;return data;}};
 const dom={visibilityState:"visible",body:{style:{overflow:"auto"}},getElementById(){return null;}};
 const compiled=compile("components/rental-request/RentalWorkflowPanel.tsx",{react:hooks,"@/components/common/PolicyDialog":{ PolicyNotice: ({ summary, children, text }) => require("react").createElement("div", null, summary, children, text), PolicyConsent: () => null },"@/components/ui/calendar":{Calendar},"@/features/auth/useAuth":{useAuth:()=>({profile:options.actor===null?null:{id:options.actor??"tenant"}})},"@/services/rental-workflow.service":{rentalWorkflowService:service},"@/services/notification.service":{default:{subscribe:()=>()=>{}}},"@/services/storage.service":{default:{uploadComplaintEvidence:async(...args)=>{calls.push({kind:"upload",args});return "file";}}},"@/services/payment-request.service":{default:{getContractPayments:async()=>[]}},"@/utils/apiError":{getApiErrorMessage:e=>e.message},"@/lib/contract-routes":{invoiceDetailPath:id=>`/dashboard/invoices/${id}`},"@/types/rental-workflow.type":labels,"./WorkflowDocumentsPanel":{default:()=>null},"./RentalPaymentModal":{default:()=>null},sonner:{toast:{success(){},error:e=>errors.push(e)}}},{document:dom});
 const outer=compiled.default({rentalRequestId:options.rental??"rental",kind:options.kind??"cancellation",focusRequest:options.focusRequest,onUpdated:async()=>{parents++;if(options.parentError)throw options.parentError;}});
 const tree=outer?outer.type(outer.props):null;
 return {tree,outer,dom,html:renderToStaticMarkup(tree),calls,changes,refs,effects,errors,initials,get parents(){return parents;}};
}
function text(n){if(n==null||typeof n==="boolean")return "";if(Array.isArray(n))return n.map(text).join("");return typeof n==="object"?text(n.props?.children):String(n);}
function find(n,p){if(!n||typeof n!=="object")return;if(Array.isArray(n)){for(const v of n){const f=find(v,p);if(f)return f;}return;}return p(n)?n:find(n.props?.children,p);}
function button(f,label){const b=find(f.tree,n=>n.type==="button"&&text(n)===label);assert.ok(b,"missing button "+label);return b;}
const tick=()=>new Promise(setImmediate),plain=v=>JSON.parse(JSON.stringify(v));
test("anonymous cannot load private workflow and scope key changes for rental and identity",()=>{assert.equal(fixture({actor:null}).tree,null);assert.notEqual(fixture().outer.key,fixture({rental:"other"}).outer.key);assert.notEqual(fixture().outer.key,fixture({actor:"owner"}).outer.key);});
test("server controls available mutations and silence does not imply money receipt",()=>{const f=fixture({data:{allowedActions:[]}});assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Đồng ý nội dung đang xem"),undefined);assert.match(f.html,/không tự mất cọc/);});
test("accept uses reviewed version and explicit acknowledgements without mutating money or identity",async()=>{const f=fixture();button(f,"Đồng ý nội dung đang xem").props.onClick();await tick();assert.deepEqual(plain(f.calls.find(c=>c.kind==="act").args),["rental","cancellation","ACCEPT",{expectedRevision:7,reason:"Đã kiểm tra nội dung và đồng ý thỏa thuận",acknowledged:true,tenantContacted:true}]);assert.equal(f.parents,1);});
test("full refund after silence requires the owner contact acknowledgement",async()=>{const f=fixture({contacted:false,data:{allowedActions:["FULL_REFUND_EXIT"]}});const b=button(f,"Kết thúc và hoàn toàn bộ tiền");assert.equal(b.props.disabled,true);b.props.onClick();await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,0);});
test("acknowledgement cannot be preselected by action handlers",async()=>{const f=fixture({ack:false});const b=button(f,"Đồng ý nội dung đang xem");assert.equal(b.props.disabled,true);b.props.onClick();await tick();assert.equal(f.calls.length,0);});
test("concurrent double click creates one mutation",async()=>{let release;const pending=new Promise(r=>release=r),f=fixture({pending});const click=button(f,"Đồng ý nội dung đang xem").props.onClick;click();click();await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,1);release({});await tick();});
test("stale version keeps the note and only GET refreshes rather than retrying POST",async()=>{const f=fixture({error:new Error("Nội dung đã đổi")});button(f,"Đồng ý nội dung đang xem").props.onClick();await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,1);assert.equal(f.calls.filter(c=>c.kind==="get").length,1);assert.equal(f.changes[5].length,0);assert.equal(f.parents,0);assert.match(f.errors[0],/đã đổi/);});
test("early exit sends only the allowed cutoff, reason and reviewed revision",async()=>{
 const f=fixture({kind:"early-exit",creating:true,ack:false,data:{allowedActions:["PROPOSE"]}});button(f,"Gửi đề nghị cho chủ nhà").props.onClick();await tick();
 assert.deepEqual(plain(f.calls.find(c=>c.kind==="propose").args[2]),{expectedRevision:7,reason:"Đã kiểm tra nội dung và đồng ý thỏa thuận",evidenceIds:[],endExclusive:"2026-12-12"});
});

test("oversized or unsupported selected evidence is rejected before mutation",()=>{const f=fixture({creating:true,data:{allowedActions:["PROPOSE"]}});const picker=find(f.tree,n=>n.type==="input"&&n.props.type==="file");const target={files:[{name:"bad.exe",size:10}],value:"bad"};picker.props.onChange({target});assert.equal(target.value,"");assert.equal(f.errors.length,1);assert.deepEqual(plain(f.changes[8].at(-1)),[]);});
test("late response after account or rental unmount cannot clear the next draft",async()=>{let release;const pending=new Promise(r=>release=r),f=fixture({pending});button(f,"Đồng ý nội dung đang xem").props.onClick();const cleanup=f.effects[0]();cleanup();release({});await tick();assert.equal(f.parents,0);assert.equal(f.changes[5].length,0);assert.equal(f.calls.filter(c=>c.kind==="get").length,0);});
test("refund pending is visible as a separate real payment action",()=>{const f=fixture({data:{status:"REFUND_PENDING",allowedActions:[],depositObligation:"REFUND_PENDING",refundPayments:[{id:"refund",totalAmount:20000000,status:"TRANSFER_REPORTED"}]}});assert.match(f.html,/Chờ xác nhận hoàn tiền/);assert.match(f.html,/Chưa hoàn tất xác nhận/);assert.ok(button(f,"Mở thanh toán / đối soát"));assert.doesNotMatch(f.html,/Đã xác nhận thực nhận|Đã hoàn tất ghi nhận/);});

for(const action of ["REQUEST_RESUME","RESUME"])test(action+" requires a separate explicit consent for the reviewed source",async()=>{const f=fixture({ack:false,data:{status:"DISPUTED",allowedActions:[action]}});const b=button(f,labels.workflowActions[action]);assert.equal(b.props.disabled,true);b.props.onClick();await tick();assert.equal(f.calls.length,0);const agreed=fixture({data:{status:"RESUME_PROPOSED",allowedActions:[action]}});button(agreed,labels.workflowActions[action]).props.onClick();await tick();assert.equal(agreed.calls.find(c=>c.kind==="act").args[3].expectedRevision,7);assert.equal(agreed.calls.find(c=>c.kind==="act").args[3].acknowledged,true);});
test("calendar disables every day outside backend choices and submits mapped cutoff without date arithmetic",()=>{
 const f=fixture({kind:"early-exit",creating:true,data:{allowedActions:["PROPOSE"]}}),calendar=find(f.tree,n=>n.type===Calendar);
 assert.ok(calendar);assert.equal(calendar.props.disabled(new Date(2026,11,11)),false);assert.equal(calendar.props.disabled(new Date(2026,11,12)),true);assert.equal(calendar.props.disabled(new Date(2026,10,30)),true);
 calendar.props.onSelect(new Date(2026,11,12));assert.equal(f.changes[9].length,0);
 calendar.props.onSelect(new Date(2027,0,11));assert.equal(f.changes[9].at(-1),"2027-01-12");
 assert.equal(calendar.props.labels.labelDayButton(new Date(2027,0,11)),"Ngày 11/01/2027");
});

test("lease-signed deposit obligation keeps its precise label",()=>{const f=fixture({kind:"early-exit",data:{allowedActions:[],depositObligation:"TRANSFERRED_TO_LEASE"}});assert.match(f.html,/Nghĩa vụ giữ chỗ đã chuyển sang thuê/);assert.equal(labels.workflowObligations.HANDOVER_PENDING,undefined);});
test("completion renders authoritative financial state even after physical return",()=>{const f=fixture({kind:"early-exit",data:{status:"RETURNED",depositObligation:"COMPLETED",allowedActions:[]}});assert.match(f.html,/Đã hoàn tất/);assert.doesNotMatch(f.html,/Đang chờ quyết toán/);});

test("empty or stale date choices disable sending and never fall back to arbitrary dates",async()=>{
 for(const terminationOptions of [undefined,{currentEndExclusive:"2027-02-12",choices:[]}]){
  const f=fixture({kind:"early-exit",creating:true,data:{allowedActions:["PROPOSE"],terminationOptions}});const submit=button(f,"Gửi đề nghị cho chủ nhà");assert.equal(submit.props.disabled,true);submit.props.onClick();await tick();assert.equal(f.calls.length,0);assert.match(f.html,/Không còn ngày cuối kỳ hợp lệ/);
 }
 const stale=fixture({kind:"early-exit",creating:true,end:"2026-12-20",data:{allowedActions:["PROPOSE"]}});button(stale,"Gửi đề nghị cho chủ nhà").props.onClick();await tick();assert.equal(stale.calls.length,0);
});

test("new early-exit modal removes policy, refund, proof and handover-term inputs",()=>{
 const f=fixture({kind:"early-exit",creating:true,data:{allowedActions:["PROPOSE"]}});
 assert.ok(find(f.tree,n=>n.type==="dialog"));assert.ok(find(f.tree,n=>n.type===Calendar));
 assert.equal(find(f.tree,n=>n.type==="input"&&["date","radio","number","file"].includes(n.props.type)),undefined);
 assert.equal(find(f.tree,n=>n.type==="select"),undefined);assert.doesNotMatch(f.html,/Đối chiếu phép tính kỳ cuối|Thêm khoản hoàn|Cách trả nhà, chìa khóa/);
});

test("choosing an early-exit decision only opens its confirmation form",()=>{
 const f=fixture({kind:"early-exit",data:{allowedActions:["ACCEPT","REJECT"]}});
 button(f,"Đồng ý và tạo phụ lục").props.onClick();
 assert.equal(f.calls.length,0);assert.equal(f.changes[12].at(-1),"ACCEPT");assert.equal(f.changes[6].at(-1),false);
 assert.equal(button(f,"Không đồng ý").props.disabled,false);
});
test("either party can open cancellation of an approved annex without a handover acknowledgement",()=>{
 const f=fixture({kind:"early-exit",data:{status:"APPROVED",allowedActions:["CANCEL"]}});
 button(f,"Hủy đề nghị chờ ký").props.onClick();
 assert.equal(f.changes[12].at(-1),"CANCEL");
 assert.equal(find(f.tree,n=>n.type==="input"&&n.props?.type==="checkbox"),undefined);
});

test("early-exit confirmation uses only the chosen server-authorized action and reviewed version",async()=>{
 const f=fixture({kind:"early-exit",selectedAction:"REJECT",data:{allowedActions:["ACCEPT","REJECT"]}});
 button(f,"Xác nhận thao tác").props.onClick();await tick();
 assert.equal(f.calls.filter(c=>c.kind==="act").length,1);assert.equal(f.calls.find(c=>c.kind==="act").args[2],"REJECT");
 assert.equal(f.calls.find(c=>c.kind==="act").args[3].expectedRevision,7);
 const stale=fixture({kind:"early-exit",selectedAction:"ACCEPT",data:{allowedActions:["REJECT"]}});
 assert.equal(find(stale.tree,n=>n.type==="button"&&text(n)==="Xác nhận thao tác"),undefined);
});

test("editing date or feedback clears the content acknowledgement",()=>{
 const f=fixture({kind:"early-exit",creating:true,data:{allowedActions:["PROPOSE"]}});
 find(f.tree,n=>n.type===Calendar).props.onSelect(new Date(2027,0,11));
 find(f.tree,n=>n.type==="textarea"&&n.props["aria-label"]==="Nội dung thao tác").props.onChange({target:{value:"Lý do cập nhật trong đề nghị mới"}});
 assert.deepEqual(plain(f.changes[6]),[false,false]);
});

test("agreed and returned early exits point to final billing and deposit settlement",()=>{
 for(const status of ["AGREED","RETURNED"]){const f=fixture({kind:"early-exit",data:{status,allowedActions:[]}});
 assert.equal(find(f.tree,n=>n.type==="a"&&n.props.href==="/dashboard/invoices/contract").props.children,"Mở hồ sơ thanh toán & quyết toán →");}
});


test("early-exit save followed by parent refresh failure never reports a failed mutation",async()=>{
 const f=fixture({kind:"early-exit",selectedAction:"REJECT",parentError:new Error("parent offline"),data:{allowedActions:["REJECT"]}});
 button(f,"Xác nhận thao tác").props.onClick();await tick();
 assert.equal(f.calls.filter(c=>c.kind==="act").length,1);assert.equal(f.parents,1);
 assert.match(f.errors[0],/đã được ghi nhận/);assert.match(f.errors[0],/không cần gửi lại/);
});

test("withdraw and rejection do not ask for a handover or money acknowledgement",()=>{
 for(const action of ["REJECT","WITHDRAW"]){
  const f=fixture({kind:"early-exit",selectedAction:action,ack:false,data:{allowedActions:[action]}});
  assert.equal(find(f.tree,n=>n.type==="input"&&n.props.type==="checkbox"),undefined);
  assert.equal(button(f,"Xác nhận thao tác").props.disabled,false);
 }
});

test("early exit stays compact until the modal opens and signing links can start it open",()=>{
 const closed=fixture({kind:"early-exit",expanded:false});assert.ok(button(closed,"Xem / đề nghị chấm dứt sớm"));assert.equal(find(closed.tree,n=>n.type==="textarea"),undefined);
 button(closed,"Xem / đề nghị chấm dứt sớm").props.onClick();assert.equal(closed.changes[0].at(-1),true);
 const open=fixture({kind:"early-exit",focusRequest:true,data:{proposal:{endExclusive:"2026-12-12"},terminationOptions:{currentEndExclusive:"2027-02-12",proposedLastOccupiedDay:"2026-12-11",choices:[]}}});assert.equal(open.initials[0],true);assert.match(open.html,/Ngày ở cuối cùng/);assert.match(open.html,/11\/12\/2026/);
});
test("landlord awaiting a tenant proposal has no create form and cannot post a new proposal",()=>{
 const f=fixture({kind:"early-exit",actor:"owner",data:{role:"LANDLORD",status:"EMPTY",revision:0,allowedActions:[]}});
 assert.equal(find(f.tree,n=>n.type==="button"&&text(n)==="Lập đề nghị chấm dứt sớm"),undefined);assert.equal(find(f.tree,n=>n.type==="textarea"),undefined);
});
test("saved historical partial-period refunds stay visible but cannot be edited as a new custom refund",()=>{
 const f=fixture({kind:"early-exit",data:{proposal:{endExclusive:"2026-12-20",handoverTerms:"Trả chìa khóa tại căn hộ",finalRentPolicy:"DAILY_PRORATED",rentRefunds:[{paymentId:"paid",amount:1000000}]},allowedActions:[]}});
 assert.match(f.html,/Theo số ngày|theo ngày thực tế/);assert.match(f.html,/1.000.000 đ/);assert.match(f.html,/Trả chìa khóa/);assert.equal(find(f.tree,n=>n.type==="input"&&n.props.type==="number"),undefined);
});

test("native early-exit modal opens once, locks scrolling and restores it on close",()=>{
 const f=fixture({kind:"early-exit"}),dialog=find(f.tree,n=>n.type==="dialog"),calls=[];
 const element={open:false,showModal(){this.open=true;calls.push("show");},close(){this.open=false;calls.push("close");}};
 dialog.props.ref.current=element;const cleanup=f.effects[2]();
 assert.deepEqual(calls,["show"]);assert.equal(f.dom.body.style.overflow,"hidden");
 assert.equal(dialog.props["aria-labelledby"],"workflow-title-rental");
 let prevented=false;dialog.props.onCancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(f.changes[0].at(-1),false);
 cleanup();assert.deepEqual(calls,["show","close"]);assert.equal(f.dom.body.style.overflow,"auto");
});
test("native modal cannot be dismissed during an action and leaves reviewed payload intact",async()=>{
 let release;const f=fixture({kind:"early-exit",selectedAction:"REJECT",pending:new Promise(resolve=>release=resolve),data:{allowedActions:["REJECT"]}});
 button(f,"Xác nhận thao tác").props.onClick();await tick();
 find(f.tree,n=>n.type==="dialog").props.onCancel({preventDefault(){}});assert.equal(f.changes[0].length,0);
 release({});await tick();assert.equal(f.calls.filter(c=>c.kind==="act").length,1);
});
test("legacy payment dialog stays inside the native workflow dialog and Escape closes only that child",()=>{
 const f=fixture({kind:"early-exit",paymentId:"legacy-refund"}),dialog=find(f.tree,n=>n.type==="dialog");
 assert.ok(find(dialog,n=>n.props?.paymentId==="legacy-refund"));
 dialog.props.onCancel({preventDefault(){}});assert.equal(f.changes[10].at(-1),undefined);assert.equal(f.changes[0].length,0);
});
test("a late signing focus request opens a previously closed early-exit modal",()=>{
 const f=fixture({kind:"early-exit",expanded:false,focusRequest:true});f.effects[4]();assert.equal(f.changes[0].at(-1),true);
});

test("approved early exit clearly retains current end until the annex is signed",()=>{
 const f=fixture({kind:"early-exit",data:{status:"APPROVED",proposal:{endExclusive:"2026-12-12"},allowedActions:[]}});
 assert.match(f.html,/Chưa đủ hai chữ ký hợp lệ thì ngày kết thúc hiện tại vẫn giữ nguyên/);assert.match(f.html,/12\/02\/2027/);
 assert.equal(find(f.tree,n=>n.type==="a"&&n.props.href==="/dashboard/invoices/contract"),undefined);
});
test("landlord approval remains explicit consent and only posts ACCEPT",async()=>{
 const f=fixture({kind:"early-exit",selectedAction:"ACCEPT",data:{role:"LANDLORD",allowedActions:["ACCEPT"]}});
 assert.match(f.html,/hạn thuê cũ vẫn áp dụng cho đến khi đủ hai chữ ký số hợp lệ/);
 button(f,"Xác nhận thao tác").props.onClick();await tick();
 const call=f.calls.find(c=>c.kind==="act");assert.equal(call.args[2],"ACCEPT");assert.equal(call.args[3].acknowledged,true);assert.equal(call.args[3].agreedEarlyEndExclusive,undefined);
});
