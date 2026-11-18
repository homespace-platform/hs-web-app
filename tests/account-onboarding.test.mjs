import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load, hookRuntime, icons } from './helpers/notification-runtime.mjs';

const nodes=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(nodes)];
function fixture({authenticated=true,onboarding}={}, calls=[]) {
 const runtime=hookRuntime();
 const state={auth:{authenticated,userId:'actor'},user:{onboarding}};
 const Component=load('features/onboarding/OnboardingInitializer.tsx',{
  react:runtime.hooks,'lucide-react':icons,
  '@/services/user.service':{__esModule:true,default:{setInitialPassword:async r=>{calls.push(['password',r]);}}},
  '@/features/user/userSlice':{fetchOnboardingStatus:()=>({type:'fetchOnboardingStatus'})},
  '@/store/hooks':{useAppDispatch:()=>action=>{calls.push(['dispatch',action.type]);return {unwrap:async()=>{}};},useAppSelector:fn=>fn(state)},
  sonner:{toast:{success(){},error(){}}},
 },{},'\nmodule.exports.AccountOnboarding=AccountOnboarding;').AccountOnboarding;
 runtime.mount(Component);
 return runtime;
}
const gate=(passwordSet,missing=[])=>({passwordSet,missing,serviceReady:missing.length===0});

test('a missing password blocks with the password step only',()=>{
 const runtime=fixture({onboarding:gate(false,['PROFILE','ADDRESS','BANK_ACCOUNT'])});
 const names=nodes(runtime.tree).map(n=>n.type?.name);
 assert.ok(names.includes('PasswordStep'));
 for(const old of ['ProfileStep','AddressStep','BankStep','StepIndicator']) assert.ok(!names.includes(old));
 assert.equal(runtime.tree.props.role,'dialog');
 runtime.unmount();
});

for(const [name,options] of [
 ['password set with other items missing',{onboarding:gate(true,['PROFILE','ADDRESS','BANK_ACCOUNT','KYC'])}],
 ['status not loaded',{onboarding:null}],
 ['anonymous user',{authenticated:false,onboarding:gate(false)}],
]) test(`no blocking modal: ${name}`,()=>{
 const runtime=fixture(options);assert.equal(runtime.tree,null);runtime.unmount();
});

test('setting the password sets it then refetches the status',async()=>{
 const calls=[];
 const runtime=fixture({onboarding:gate(false)},calls);
 const step=nodes(runtime.tree).find(n=>n.type?.name==='PasswordStep');
 await step.props.onSubmit('Secret123');
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['password',{newPassword:'Secret123'}],['dispatch','fetchOnboardingStatus']]);
 runtime.unmount();
});
