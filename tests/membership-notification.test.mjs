import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, clock, events, service, deferred, nullComponent, icons, Link, html } from './helpers/notification-runtime.mjs';
const ID='cb856b215fbf4d33b7f7fd54d5ce7867';
const OTHER='82a1fb4128824dc3b6e7eb5fbb9f9d2e';
const membershipLib=load('lib/membership.ts');
const flatten=node=>node==null||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(flatten)];

function fixture() {
  const runtime=hookRuntime(),timers=clock(),notifications=service(),requests=[],logins=[];
  const document=events({visibilityState:'visible'});
  const auth={initialized:true,authenticated:true,userId:'owner',login:path=>logins.push(path)};
  let search=`orderId=${ID}`,cancelCalls=0;
  const window={location:{pathname:'/dashboard/membership/return',search:`?${search}`,hash:'#result'},...timers.globals};
  const mocks={react:runtime.hooks,'next/link':Link,'next/navigation':{useSearchParams:()=>new URLSearchParams(search)},'lucide-react':icons,
    '@/features/auth/useAuth':{useAuth:()=>auth},'@/services/notification.service':notifications,
    '@/lib/membership':{...membershipLib,getPendingMembershipOrderId:()=>null,clearPendingMembershipOrderId(){}},
    '@/services/membership.service':{getOrder(id){const call={...deferred(),id};requests.push(call);return call.promise;},
      getMyMembership:async()=>({tier:'STARTER',remainingUses:10}),cancelOrder:async()=>{cancelCalls++;return {id:ID,status:'CANCELLED'};}}};
  const exports=load('app/dashboard/membership/return/page.tsx',mocks,{...timers.globals,document,window},
    '\nexports.Content=MembershipReturnContent;exports.Body=MembershipReturnBody;');
  return{runtime,timers,document,requests,auth,logins,exports,notifications:notifications.notificationService,get cancelCalls(){return cancelCalls;},
    mountBody(id=ID){runtime.mount(exports.Body,{queryOrderId:id});},
    mountContent(){runtime.mount(exports.Content);},
    setQuery(id){search=`orderId=${id}`;runtime.update();},
    resolve(i,status='PENDING'){requests[i].resolve({id:requests[i].id,status,tier:'STARTER',provider:'SEPAY',amountVnd:49000,
      createdAt:'2026-11-14T00:00:00Z',expiresAt:'2026-11-14T00:15:00Z',paidAt:status==='PAID'?'2026-11-14T00:01:00Z':null});}};
}

test('membership tags distinguish activation/review and old payment schemas retain fallback',()=>{
  const api=service();assert.equal(api.getNotificationTag({category:'PAYMENT',type:'MEMBERSHIP_ACTIVATED'}),'Kích hoạt gói');
  assert.equal(api.getNotificationTag({category:'PAYMENT',type:'MEMBERSHIP_PAYMENT_REVIEW'}),'Chờ đối soát');
  for(const type of ['constructor','__proto__','PAYMENT_SUCCESSFUL'])assert.equal(api.getNotificationTag({category:'PAYMENT',type}),'Thanh toán');
});

test('membership return waits for auth, preserves full login URL, and keys content by account and order',()=>{
  const f=fixture();f.auth.initialized=false;f.mountContent();assert.equal(f.requests.length,0);
  f.auth.initialized=true;f.auth.authenticated=false;f.runtime.update();assert.equal(f.requests.length,0);
  assert.match(html(f.runtime),/Đăng nhập để xem kết quả thanh toán/);
  flatten(f.runtime.tree).find(n=>n.type==='button').props.onClick();
  assert.deepEqual(f.logins,[`/dashboard/membership/return?orderId=${ID}#result`]);
  f.auth.authenticated=true;f.runtime.update();const first=f.runtime.tree.key;
  f.auth.userId='another-owner';f.runtime.update();assert.notEqual(f.runtime.tree.key,first);
  const next=f.runtime.tree.key;f.setQuery(OTHER);assert.notEqual(f.runtime.tree.key,next);f.runtime.unmount();
});

test('late membership notification updates the order after poll budget, with coalescing and id filtering',async()=>{
  const f=fixture();f.mountBody();
  for(let i=0;i<15;i++){f.resolve(i);await f.runtime.settle();if(i<14){await f.timers.advance(2500);await f.runtime.settle();}}
  assert.equal(f.requests.length,15);await f.timers.advance(5000);assert.equal(f.requests.length,15);
  f.notifications.notifyMembershipChanged(OTHER);await f.timers.advance(250);assert.equal(f.requests.length,15);
  for(let i=0;i<12;i++)f.notifications.notifyMembershipChanged(ID);
  await f.timers.advance(250);assert.equal(f.requests.length,16);f.resolve(15,'PAID');await f.runtime.settle();
  assert.match(html(f.runtime),/kích hoạt|thành công/i);assert.doesNotMatch(html(f.runtime),/Chờ xác nhận thanh toán/);
  f.runtime.unmount();assert.equal(f.timers.size,0);assert.equal(f.document.listenerCount,0);
});

test('membership notices share an existing order GET, hidden tabs wait and recovery starts a fresh read',async()=>{
  const f=fixture();f.mountBody();assert.equal(f.requests.length,1);
  f.notifications.notifyMembershipChanged(ID);await f.timers.advance(250);assert.equal(f.requests.length,1);
  f.resolve(0);await f.runtime.settle();assert.equal(f.requests.length,2,'one fresh notice read after older GET');
  f.resolve(1);await f.runtime.settle();
  f.notifications.notifyMembershipChanged(ID);f.document.visibilityState='hidden';await f.timers.advance(250);
  assert.equal(f.requests.length,2);f.document.visibilityState='visible';f.document.fire('visibilitychange');
  await f.timers.advance(250);assert.equal(f.requests.length,3);f.resolve(2,'REVIEW');await f.runtime.settle();
  assert.match(html(f.runtime),/đối soát|xem xét/i);f.runtime.unmount();assert.equal(f.timers.size,0);
});

test('an old order request cannot affect a new keyed instance after unmount',async()=>{
  const f=fixture();f.mountBody();f.runtime.unmount();f.resolve(0,'PAID');await f.runtime.settle();
  // The real keyed parent unmounts on account/order change; cleanup must suppress the old promise.
  assert.equal(f.requests.length,1);assert.equal(f.timers.size,0);
});

test('a membership notice waiting on an older GET does not start a new request after the tab becomes hidden',async()=>{
  const f=fixture();f.mountBody();f.notifications.notifyMembershipChanged(ID);await f.timers.advance(250);
  f.document.visibilityState='hidden';f.resolve(0);await f.runtime.settle();assert.equal(f.requests.length,1);
  f.document.visibilityState='visible';f.document.fire('visibilitychange');await f.timers.advance(250);
  assert.equal(f.requests.length,2);f.runtime.unmount();
});
