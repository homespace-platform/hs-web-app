import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, icons } from './helpers/notification-runtime.mjs';

const nodes=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];
function fixture(role, getStatus) {
 const runtime=hookRuntime();
 const state={auth:{authenticated:true,userId:'actor'},user:{status:'succeeded',profile:{id:'actor',role,onBoarded:false}}};
 const Component=load('features/onboarding/OnboardingInitializer.tsx',{
  react:runtime.hooks,'lucide-react':icons,
  '@/services/user.service':{__esModule:true,default:{getOnboardingStatus:getStatus}},
  '@/services/bank-account.service':{__esModule:true,default:{}},
  '@/features/user/userSlice':{fetchCurrentUser:args=>args},
  '@/store/hooks':{useAppDispatch:()=>()=>({unwrap:async()=>{}}),useAppSelector:fn=>fn(state)},
  '@/data/banks':{VIETNAMESE_BANKS:[]},
  '@/components/settings/AddressEditor':{__esModule:true,default:()=>null},
  sonner:{toast:{success(){},error(){}}},
 },{},'\nmodule.exports.AccountOnboarding=AccountOnboarding;').AccountOnboarding;
 runtime.mount(Component);
 return runtime;
}
const status=(nextStep,completedSteps=[])=>({completed:nextStep==='COMPLETED',nextStep,completedSteps,requiredSteps:['PROFILE','ADDRESS','PASSWORD','BANK_ACCOUNT'],version:2});

for(const role of ['ADMIN','USER']) {
 for(const [nextStep,component] of [['PROFILE','ProfileStep'],['ADDRESS','AddressStep'],['PASSWORD','PasswordStep'],['BANK_ACCOUNT','BankStep']]) {
  test(`${role} resumes the server-selected ${nextStep} step`,async()=>{
   const runtime=fixture(role,async()=>status(nextStep));
   await runtime.settle();
   assert.ok(nodes(runtime.tree).some(n=>n.type?.name===component));
   runtime.unmount();
  });
 }
 test(`${role} does not reopen completed onboarding from a stale profile flag`,async()=>{
  const runtime=fixture(role,async()=>status('COMPLETED',['PROFILE','ADDRESS','PASSWORD','BANK_ACCOUNT']));
  await runtime.settle();assert.equal(runtime.tree,null);runtime.unmount();
 });
}

test('an onboarding status failure is visible and retry uses the server result',async()=>{
 let attempts=0;
 const runtime=fixture('ADMIN',async()=>{if(++attempts===1)throw Error('Status unavailable');return status('COMPLETED');});
 await runtime.settle();
 const retry=nodes(runtime.tree).find(n=>n.type==='button');
 assert.ok(retry);retry.props.onClick();await runtime.settle();
 assert.equal(attempts,2);assert.equal(runtime.tree,null);runtime.unmount();
});
