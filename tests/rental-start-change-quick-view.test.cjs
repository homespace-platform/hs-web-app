const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const {loadTs}=require("./helpers/ts-loader.cjs");
const load=file=>loadTs(file);
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
  const list=read('components/rental-request/RentalRequestsManagement.tsx'),card=read('components/rental-request/RentalRequestCard.tsx');
  assert.match(card,/<StartChangeNotice request=\{req\} mode=\{mode\} onOpen=\{\(\) => actions\.openStartChange\(req\)\}/);
  assert.match(list,/<RentalStartChangeQuickModal/);assert.match(list,/onUpdated=\{fetchRequests\}/);
  const modal=read('components/rental-request/RentalStartChangeQuickModal.tsx');
  assert.match(modal,/lock\.current=true;setBusy\(true\)/);assert.match(modal,/service\.refresh\(request\.id\)/);
  assert.match(modal,/next\.askerRole!==/);assert.match(modal,/Promise\.allSettled/);
  assert.doesNotMatch(modal,/setDetailRequestId|RentalRequestDetailModal|window\.(prompt|confirm)/);
});
test('modal and panel share ONE earlier-start form, review list and date bounds',()=>{
  const panel=read('components/rental-request/RentalOnboardingPanel.tsx'),modal=read('components/rental-request/RentalStartChangeQuickModal.tsx');
  for(const source of [panel,modal]){assert.match(source,/<EarlierStartForm/);assert.match(source,/<StartChangeReview/);assert.match(source,/confirmStartChange/);assert.doesNotMatch(source,/type="date"/);}
  const {earlierStartBounds,isValidEarlierStart}=load('lib/rental-start-change-quick-view.ts');
  const v={serverNow:'2026-10-22T03:00:00Z',startsOn:'2026-11-01'};
  assert.deepEqual({...earlierStartBounds(v)},{min:'2026-10-22',max:'2026-10-31'});
  const reason='Muốn dọn vào ở sớm hơn';
  assert.equal(isValidEarlierStart('2026-10-22',reason,v),true);assert.equal(isValidEarlierStart('2026-10-31',reason,v),true);
  assert.equal(isValidEarlierStart('2026-10-21',reason,v),false);assert.equal(isValidEarlierStart('2026-11-01',reason,v),false);
  assert.equal(isValidEarlierStart('2026-10-25','ngắn',v),false);assert.equal(isValidEarlierStart('',reason,v),false);
});
