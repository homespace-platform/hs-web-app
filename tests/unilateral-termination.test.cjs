const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const source=fs.readFileSync(path.join(__dirname,"../components/contract/detail/UnilateralTerminationPanel.tsx"),"utf8");
const notice={id:"notice",invoiceId:"invoice",version:4,status:"NOTICE",reason:"Quá hạn tiền thuê, chủ nhà chọn chấm dứt",notifiedAt:"2026-11-11T03:00:00Z",respondBy:"2026-11-12T03:00:00Z"};
function panel(options={}){
  const states=[options.reason??"Xin đợi tiền lương về để thanh toán",options.decisionReason??"Chủ nhà đã xem xét hồ sơ mới nhất",options.option??"PAYMENT_EXTENSION",options.days??5,options.handover??false,false];
  let index=0,refIndex=0,refreshes=0;const refs=[],effects=[],calls=[],errors=[],confirmations=[],timers=[];
  const hooks={...React,useState:initial=>{const i=index++;return [i<states.length?states[i]:initial,()=>{}];},useRef:initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial}),useEffect:fn=>effects.push(fn)};
  const api=Object.fromEntries(["issueUnilateralTermination","requestTerminationReview","decideTerminationReview","withdrawUnilateralTermination","completeUnilateralHandover"].map(kind=>[kind,async(...args)=>{calls.push({kind,args});if(options.error)throw options.error;return options.pending??{};}]));
  const mod={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {module:mod,exports:mod.exports,require:name=>name==="react"?hooks:name==="@/services/monthly-invoice.service"?{monthlyInvoiceService:api}:name==="@/utils/apiError"?{getApiErrorMessage:e=>e.message}:name==="sonner"?{toast:{success(){},error:e=>errors.push(e)}}:require(name),
      window:{confirm:text=>{confirmations.push(text);return options.confirm!==false;}},setInterval:(fn,delay)=>{timers.push({fn,delay});return 1;},clearInterval:()=>{timers.push({cleared:true});}});
  const invoice={id:"invoice",canDeferToNextPeriod:true,unilateralTermination:notice,...options.invoice};
  const tree=mod.exports.default({invoice,isLandlord:options.role==="owner",isTenant:options.role!=="owner"&&options.role!=="outsider",canIssue:!!options.canIssue,refresh:async()=>{refreshes++;}});
  const nodes=[];function visit(node){if(!node||typeof node!=="object")return;nodes.push(node);React.Children.forEach(node.props?.children,visit);}visit(tree);
  const html=tree?renderToStaticMarkup(tree):"";const button=text=>nodes.find(n=>n.type==="button"&&renderToStaticMarkup(n).includes(text));
  return {tree,html,button,calls,errors,effects,timers,refs,confirmations,get refreshes(){return refreshes;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test("owner issues a reasoned notice and does not declare tenant consent",async()=>{
  const f=panel({role:"owner",canIssue:true,invoice:{unilateralTermination:null}});
  f.button("Thông báo đơn phương chấm dứt").props.onClick();await tick();
  assert.equal(f.calls[0].kind,"issueUnilateralTermination");assert.deepEqual(f.calls[0].args,["invoice","Xin đợi tiền lương về để thanh toán"]);
  assert.match(f.html,/24 giờ/);assert.doesNotMatch(f.html,/Tôi đồng ý chấm dứt/);
});
test("tenant review sends the exact notice identity, version and chosen days",async()=>{
  const f=panel({invoice:{canRequestTerminationReview:true}});f.button("Khiếu nại — xin đổi phương án").props.onClick();await tick();
  const call=f.calls[0];assert.equal(call.kind,"requestTerminationReview");assert.equal(call.args[1],"notice");
  assert.equal(call.args[2].expectedVersion,4);assert.equal(call.args[2].option,"PAYMENT_EXTENSION");assert.equal(call.args[2].days,5);
  assert.doesNotMatch(JSON.stringify(call),/acceptDepositRetention|acceptEarlyTermination/);
});
test("rollover omits extension days and an unavailable next period falls back to extension",async()=>{
  const f=panel({option:"ROLLOVER",invoice:{canRequestTerminationReview:true}});f.button("Khiếu nại — xin đổi phương án").props.onClick();await tick();
  assert.equal(f.calls[0].args[2].option,"ROLLOVER");assert.equal("days" in f.calls[0].args[2],false);
  const noNext=panel({option:"ROLLOVER",invoice:{canRequestTerminationReview:true,canDeferToNextPeriod:false}});noNext.button("Khiếu nại — xin đổi phương án").props.onClick();await tick();
  assert.equal(noNext.calls[0].args[2].option,"PAYMENT_EXTENSION");assert.equal(noNext.calls[0].args[2].days,5);
});
test("only the owner receives decision buttons and rejection clearly ends the contract",async()=>{
  const invoice={unilateralTermination:{...notice,status:"REVIEW_REQUESTED",requestedOption:"PAYMENT_EXTENSION",requestedDays:5},canDecideTerminationReview:true};
  assert.equal(panel({invoice}).button("Từ chối — chấm dứt ngay"),undefined);
  const f=panel({role:"owner",invoice});f.button("Từ chối — chấm dứt ngay").props.onClick();await tick();
  assert.equal(f.calls[0].kind,"decideTerminationReview");assert.equal(f.calls[0].args[2],4);assert.equal(f.calls[0].args[3],false);assert.match(f.confirmations[0],/chấm dứt hợp đồng ngay/);
});
test("approval, duplicate clicks and stale failures never trigger an automatic retry",async()=>{
  let release;const pending=new Promise(r=>{release=r;});const invoice={unilateralTermination:{...notice,status:"REVIEW_REQUESTED"},canDecideTerminationReview:true};
  const f=panel({role:"owner",invoice,pending});const click=f.button("Đồng ý đổi phương án").props.onClick;click();click();assert.equal(f.calls.length,1);assert.equal(f.calls[0].args[3],true);release({});await tick();assert.equal(f.refreshes,1);
  const stale=panel({role:"owner",invoice,error:new Error("Quyết định đã thay đổi")});stale.button("Đồng ý đổi phương án").props.onClick();await tick();assert.equal(stale.calls.length,1);assert.equal(stale.refreshes,1);assert.match(stale.errors[0],/đã thay đổi/);
});
test("server permissions and input bounds hide or disable unavailable operations",()=>{
  assert.equal(panel({role:"outsider"}).html,"");assert.equal(panel().button("Khiếu nại — xin đổi phương án"),undefined);
  assert.equal(panel({role:"owner",canIssue:true,reason:"ngắn",invoice:{unilateralTermination:null}}).button("Thông báo đơn phương chấm dứt").props.disabled,true);
  for(const days of [0,31,1.5])assert.equal(panel({days,invoice:{canRequestTerminationReview:true}}).button("Khiếu nại — xin đổi phương án").props.disabled,true);
});
test("ending and handover are separate and the owner must explicitly confirm possession",async()=>{
  const invoice={unilateralTermination:{...notice,status:"ENDED",endedAt:"2026-11-12T03:00:00Z"},canCompleteTerminationHandover:true};
  assert.equal(panel({role:"owner",invoice}).button("Xác nhận đã nhận lại phòng").props.disabled,true);
  const f=panel({role:"owner",invoice,handover:true});assert.match(f.html,/tin đăng chưa được mở lại/);f.button("Xác nhận đã nhận lại phòng").props.onClick();await tick();
  assert.equal(f.calls[0].kind,"completeUnilateralHandover");assert.equal(f.calls[0].args[2],4);
  assert.equal(panel({invoice}).button("Xác nhận đã nhận lại phòng"),undefined);
});
test("pending notice polls read-only state and unmount prevents late updates",async()=>{
  let release;const pending=new Promise(r=>{release=r;});const f=panel({role:"owner",canIssue:true,pending});const leave=f.effects[0](),stop=f.effects[1]();
  assert.equal(f.timers[0].delay,30000);f.timers[0].fn();assert.equal(f.refreshes,1);
  f.button("Rút quyết định đơn phương").props.onClick();f.timers[0].fn();assert.equal(f.refreshes,1);
  leave();stop();release({});await tick();assert.equal(f.refreshes,1);assert.equal(f.calls.length,1);assert.equal(f.timers.at(-1).cleared,true);
});
