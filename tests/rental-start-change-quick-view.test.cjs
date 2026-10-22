const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const cache=new Map();
function load(file) {
  if(cache.has(file))return cache.get(file);
  const code=ts.transpileModule(read(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  const resolve=name=>name==='@/lib/rental-start-change-quick-view'?load('lib/rental-start-change-quick-view.ts'):
    name.startsWith('@/')?{}:require(name);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(resolve,module,module.exports);
  cache.set(file,module.exports);return module.exports;
}
const {canHandleStartChange}=load('lib/rental-start-change-quick-view.ts');
const {StartChangeNotice,StartChangeReview}=load('components/rental-request/RentalStartChangeQuickModal.tsx');
const change={id:'change',previousDate:'2026-11-01',requestedDate:'2026-10-25',reason:'Muốn dọn vào ở sớm hơn',status:'REQUESTED',
  requestedAt:'2026-10-22T03:00:00Z',respondBy:'2026-10-23T03:00:00Z'};
const request={id:'rental',status:'ACCEPTED',ownerId:'owner',renterId:'tenant',latestStartChange:change};
const view={serverNow:'2026-10-22T03:00:00Z',stage:'WAITING_START',askerRole:'LANDLORD',startChanges:[change]};
const notice=(mode='RECEIVED',r=request)=>renderToStaticMarkup(React.createElement(StartChangeNotice,{request:r,mode,onOpen(){}}));
const review=(extra={})=>renderToStaticMarkup(React.createElement(StartChangeReview,{request,view,mode:'RECEIVED',actorId:'owner',busy:false,onAction(){},...extra}));

test('list notice exposes pending request, dates, deadline and a quick processing action for each role',()=>{
  const owner=notice();assert.match(owner,/Có đề nghị bắt đầu sớm cần xử lý|Xử lý đề nghị/);
  assert.match(owner,/01\/11\/2026/);assert.match(owner,/25\/10\/2026/);assert.match(owner,/Hạn phản hồi/);
  const tenant=notice('SENT');assert.match(tenant,/Chờ chủ nhà duyệt|Xem đề nghị/);assert.doesNotMatch(tenant,/Xử lý đề nghị/);
  assert.equal(notice('SENT',{...request,latestStartChange:null}),'');
});
test('quick review gives owners approve/reject and tenants only withdraw',()=>{
  const owner=review();assert.match(owner,/Đồng ý đổi ngày|Không đồng ý/);assert.doesNotMatch(owner,/Rút đề nghị/);
  const tenant=review({actorId:'tenant',mode:'SENT',view:{...view,askerRole:'TENANT'}});
  assert.match(tenant,/Rút đề nghị/);assert.doesNotMatch(tenant,/Đồng ý đổi ngày|Không đồng ý/);
});
test('wrong participant, wrong role, deadline boundary, cancellation and closed lifecycle cannot act',()=>{
  assert.equal(canHandleStartChange(request,view,change,'owner','RECEIVED'),true);
  for(const patch of [{actorId:'tenant'},{actorId:null},{view:{...view,askerRole:'TENANT'}},
    {view:{...view,serverNow:change.respondBy}},{view:{...view,cancellationRequestedAt:view.serverNow}},
    {view:{...view,stage:'COMPLETED'}},{view:{...view,stage:'PENDING'}},{request:{...request,status:'CANCELLED_BY_OWNER'}}]) {
    assert.doesNotMatch(review(patch),/Đồng ý đổi ngày|Không đồng ý|Rút đề nghị/);
  }
  assert.match(review({busy:true}),/disabled=""[^>]*>Đồng ý đổi ngày/);
});
test('decided and expired history is readable and never exposes actionable pending controls or raw enum',()=>{
  for(const status of ['APPROVED','REJECTED','WITHDRAWN','EXPIRED']) {
    const c={...change,status};const html=review({view:{...view,startChanges:[c]}});
    assert.doesNotMatch(html,/Đồng ý đổi ngày|Rút đề nghị|REQUESTED|APPROVED|REJECTED|WITHDRAWN|EXPIRED/);
    assert.doesNotMatch(notice('RECEIVED',{...request,latestStartChange:c}),/cần xử lý|Xử lý đề nghị/);
  }
});
test('quick flow is independent of detail, refreshes list and blocks double submit and uncertain outcomes',()=>{
  const list=read('components/rental-request/RentalRequestsManagement.tsx');
  assert.match(list,/<StartChangeNotice request=\{req\} mode=\{mode\} onOpen=\{\(\)=>setStartChangeTarget\(req\)\}/);
  assert.match(list,/<RentalStartChangeQuickModal/);assert.match(list,/onUpdated=\{fetchRequests\}/);
  const modal=read('components/rental-request/RentalStartChangeQuickModal.tsx');
  assert.match(modal,/lock.current=true;setBusy\(true\)/);assert.match(modal,/await service.refresh\(request.id\)/);
  assert.match(modal,/next.askerRole!==/);assert.match(modal,/Promise.allSettled/);assert.match(modal,/max=\{maxDate\}/);
  assert.doesNotMatch(modal,/setDetailRequestId|RentalRequestDetailModal/);
});
