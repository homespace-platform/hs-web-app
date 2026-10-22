const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const React=require('react');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function load(file,resolve=require,globals={}) {
  const code=ts.transpileModule(read(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{...globals})(resolve,module,module.exports);
  return module.exports;
}
const limits=load('lib/rental-occupant-limit.ts');
test('capacity is listing-scoped, supports valid limits above 20 and rejects malformed limits',()=>{
  assert.equal(limits.resolveOccupantLimit('a',4,null),4);
  assert.equal(limits.resolveOccupantLimit('a',4,{listingId:'a',limit:3}),3);
  assert.equal(limits.resolveOccupantLimit('b',2,{listingId:'a',limit:4}),2);
  assert.equal(limits.clampOccupants(60,40),40);
  for(const value of [0,-1,NaN,Infinity,1.5,'4',null,undefined])assert.equal(limits.normalizeOccupantLimit(value),null);
  for(const value of [15,1e6,4.5])assert.equal(limits.clampOccupants(value,4),4);
  for(const value of [NaN,Infinity,-1,0])assert.equal(limits.clampOccupants(value,4),1);
});

// Exercise the real modal's handlers and effects with a deterministic hook/timer harness.
// No browser session, rental creation or payment endpoint is used.
function modal(initial={}) {
  let slots=[],index=0,pending=[],microtasks=[],timers=new Set(),dirty=false,tree;
  let props={isOpen:true,listingId:'a',listingTitle:'Test',listingMaxOccupants:4,onClose(){},...initial};
  const requests=[];
  const hooks={...React,
    useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
    useRef(initial){const i=index++;return slots[i]??(slots[i]={current:initial});},
    useMemo(fn){index++;return fn();},
    useEffect(fn,deps){const i=index++,old=slots[i];if(!old||deps.some((d,n)=>!Object.is(d,old.deps[n]))){
      pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}
  };
  const helpers=load('components/rental-request/rental-request.helper.ts');
  const es=val=>({__esModule:true,default:val});
  const resolve=name=>{
    if(name==='react')return {...hooks,__esModule:true,default:hooks};
    if(name==='@/lib/rental-occupant-limit')return limits;
    if(name==='@/features/auth/useAuth')return {useAuth:()=>({profile:null,username:'test'})};
    if(name==='@/services/rental-request.service')return es({estimateRentalCost(input){return new Promise((resolve,reject)=>requests.push({input,resolve,reject}));}});
    if(name==='@/lib/axios-client')return es({get:async()=>({data:{result:{holdMinutes:60}}})});
    if(name==='next/image')return es('img');
    if(name==='@/components/ui/calendar')return {Calendar:'calendar'};
    if(name==='./rental-request.helper')return helpers;
    if(name==='./RentalCostSummary')return {RentalCostSummary:'cost-summary'};
    return require(name);
  };
  const Component=load('components/rental-request/RentalRequestModal.tsx',resolve,{
    queueMicrotask:fn=>microtasks.push(fn),setTimeout:fn=>{timers.add(fn);return fn;},clearTimeout:fn=>timers.delete(fn)
  }).default;
  function render(next={}) {props={...props,...next};let turns=0;do{dirty=false;index=0;tree=Component(props);
    for(const fn of pending.splice(0))fn();for(const fn of microtasks.splice(0))fn();assert.ok(++turns<20,'effects settle');}while(dirty);return tree;}
  function find(predicate,node=tree){if(!node||typeof node!=='object')return null;if(predicate(node))return node;
    for(const child of React.Children.toArray(node.props?.children)){const result=find(predicate,child);if(result)return result;}return null;}
  render();
  return {render,requests,input:()=>find(n=>n.type==='input'&&n.props.placeholder?.startsWith('Nhập số người')),
    plus:()=>find(n=>n.type==='button'&&n.props.title==='Tăng 1 người'),
    timers(){const jobs=[...timers];timers.clear();jobs.forEach(fn=>fn());render();},
    async settle(){await Promise.resolve();await Promise.resolve();render();}
  };
}
const quote={occupantLimit:4,depositAmount:100,effectiveMonthlyRent:100,predictableCharges:[],excludedCharges:[],
  motorbike:{allowed:false,available:0},car:{allowed:false,available:0}};

test('real modal blocks rapid increments and manual overflow before the first quote returns',()=>{
  const app=modal();
  for(let n=0;n<20;n++){app.plus().props.onClick();app.render();}
  assert.equal(app.input().props.value,4);assert.equal(app.plus().props.disabled,true);assert.equal(app.input().props.max,4);
  app.input().props.onChange({target:{value:'15'}});app.render();assert.equal(app.input().props.value,4);
  app.input().props.onChange({target:{value:''}});app.render();app.input().props.onBlur();app.render();assert.equal(app.input().props.value,1);
});
test('real modal retains the server limit across stale/loading/error price quotes',async()=>{
  const app=modal({listingMaxOccupants:null});app.timers();app.requests[0].resolve(quote);await app.settle();
  assert.equal(app.input().props.max,4);
  app.plus().props.onClick();app.render(); // This invalidates the displayed quote, not the capacity.
  assert.equal(app.input().props.max,4);
  app.timers();app.requests[1].reject({response:{data:{message:'Temporary estimate error'}}});await app.settle();
  for(let n=0;n<20;n++){app.plus().props.onClick();app.render();}
  assert.equal(app.input().props.value,4);assert.equal(app.plus().props.disabled,true);
});
test('switching listings rejects the previous listing response and closing/reopening clears its cache',async()=>{
  const app=modal();app.timers();const stale=app.requests[0];
  app.render({listingId:'b',listingMaxOccupants:2});stale.resolve(quote);await app.settle();
  assert.equal(app.input().props.max,2);
  app.render({isOpen:false});app.render({isOpen:true,listingId:'a',listingMaxOccupants:3});
  assert.equal(app.input().props.max,3);assert.equal(app.input().props.value,1);
});
