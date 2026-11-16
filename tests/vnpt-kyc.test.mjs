import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { load, hookRuntime, clock, events, icons, html } from './helpers/notification-runtime.mjs';
const flatten=node=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(flatten)];
const detailsPanel=()=>null;
const loadKyc=(mocks,globals={})=>load('components/settings/sections/KycSection.tsx',mocks,globals,'\nmodule.exports.default=AccountKycSection;');

test('SDK bridge pins origin/source and routes capture without provider credentials or callback PII',async()=>{
 const messages=[],listeners=new Map(),config=[],parent={postMessage:(data,origin)=>messages.push({data,origin})};
 const win={parent,location:{origin:'http://localhost:3000'},fetch:async()=>new Response('asset'),navigator:{mediaDevices:{getUserMedia:async()=>{throw Error('denied');}}},SDK:{launch:value=>config.push(value)},addEventListener:(name,callback)=>listeners.set(name,callback)};
 vm.runInNewContext(fs.readFileSync('public/kyc/vnpt-frame.js','utf8'),{window:win,URL,Response,FormData,crypto,setTimeout,clearTimeout});
 const send=(data,over={})=>listeners.get('message')({origin:win.location.origin,source:parent,data,...over});
 send({type:'vnpt:init',nonce:'nonce',maxImageMb:1},{origin:'https://evil.test'});assert.equal(config.length,0);
 send({type:'vnpt:init',nonce:'nonce',maxImageMb:1});
 assert.equal(config[0].USE_METHOD,'PHOTO');
 assert.equal(config[0].ACCESS_TOKEN,'');assert.equal(config[0].TOKEN_ID,'');assert.equal(config[0].TOKEN_KEY,'');
 await assert.rejects(win.navigator.mediaDevices.getUserMedia({video:true}),/denied/);assert.equal(messages.at(-1).data.type,'vnpt:camera-error');
 assert.equal(config[0].ENABLE_API_LIVENESS_FACE,true);assert.equal(config[0].ENABLE_API_LIVENESS_DOCUMENT,true);assert.equal(config[0].DOCUMENT_TYPE_START,-1);
 config[0].CALL_BACK_END_FLOW({id:'PRIVATE_ID',base64:'PRIVATE_PHOTO',success:true});assert.doesNotMatch(JSON.stringify(messages),/PRIVATE_ID|PRIVATE_PHOTO/);
 const response=win.fetch('http://localhost:3000/__homespace_vnpt__/ocr',{method:'POST',body:JSON.stringify({img_front:'front',img_back:'back',type:-1})});
 const request=messages.at(-1).data;assert.equal(request.step,'ocr');
 send({type:'vnpt:response',nonce:'wrong',id:request.id,result:{success:true}});
 send({type:'vnpt:response',nonce:'nonce',id:request.id,result:{message:'IDG-00000000',object:{id:'001234567890'}}});
 assert.equal((await(await response).json()).object.id,'001234567890');
 assert.equal(await (await win.fetch(new URL('http://localhost:3000/vendor/vnpt/lib/web-oval.json'))).text(),'asset');
 await assert.rejects(win.fetch('https://api.idg.vnpt.vn/ai/v1/web/ocr/id',{method:'POST'}),/Unapproved/);
 await assert.rejects(win.fetch('http://localhost:3000/__homespace_vnpt__/arbitrary',{method:'POST',body:'{}'}),/Invalid/);
});

test('SDK permits image upload only when development parent enables it',()=>{
 const parent={postMessage(){}},listeners=new Map(),configs=[];
 const win={parent,location:{origin:'http://localhost:3000'},fetch:async()=>new Response('asset'),navigator:{mediaDevices:{getUserMedia:async()=>{}}},SDK:{launch:value=>configs.push(value)},addEventListener:(name,callback)=>listeners.set(name,callback)};
 vm.runInNewContext(fs.readFileSync('public/kyc/vnpt-frame.js','utf8'),{window:win,URL,Response,FormData,crypto,setTimeout,clearTimeout});
 listeners.get('message')({origin:win.location.origin,source:parent,data:{type:'vnpt:init',nonce:'nonce',maxImageMb:1,allowUpload:true}});
 assert.equal(configs[0].USE_METHOD,'PHOTO_AND_UPLOAD');
});

test('web defaults to VNPT and keeps upcoming providers disabled',async()=>{
 const runtime=hookRuntime(),calls=[],capture=()=>null;
 const Component=loadKyc({
 react:runtime.hooks,'lucide-react':icons,sonner:{toast:{error(){},message(){},success(){}}},
 '@/services/kyc.service':{__esModule:true,default:{getStatus:async()=>({status:'NOT_VERIFIED',provider:'VNPT'}),createVnptSession:async()=>{calls.push('vnpt');return{sessionId:'attempt',expiresAt:'2099-01-01',maxImageMb:1};}}},
 './VnptKycCapture':{__esModule:true,default:capture},'@/components/settings/KycVerifiedDetailsPanel':{__esModule:true,default:detailsPanel},'@/features/user/userSlice':{fetchCurrentUser:args=>args},
 '@/store/hooks':{useAppDispatch:()=>()=>{},useAppSelector:fn=>fn({auth:{userId:'alice'},user:{profile:{id:'alice',role:'ADMIN',kycOptional:true}}})},
 },{window:{clearInterval(){},setInterval(){}}}).default;
 runtime.mount(Component);await runtime.settle();assert.doesNotMatch(html(runtime),/Didit|backend|webhook|Tùy chọn|không bắt buộc/);
 const providers=flatten(runtime.tree).filter(n=>n.type==='input'&&n.props.name==='kyc-provider');
 assert.deepEqual(providers.map(n=>n.props.value),['VNPT','FPT','VIETTEL']);
 assert.equal(providers[0].props.checked,true);assert.equal(providers[0].props.disabled,false);
 assert.equal(providers[1].props.disabled,true);assert.equal(providers[2].props.disabled,true);
 assert.match(html(runtime),/FPT AI eKYC/);assert.match(html(runtime),/Viettel AI eKYC/);
 flatten(runtime.tree).find(n=>n.type==='button'&&n.props.className.includes('bg-primary')).props.onClick();await runtime.settle();
 assert.deepEqual(calls,['vnpt']);assert.equal(flatten(runtime.tree).find(n=>n.type===capture).props.session.sessionId,'attempt');assert.equal(flatten(runtime.tree).find(n=>n.type==='fieldset').props.disabled,true);runtime.unmount();
});

test('parent rejects foreign frames and arbitrary steps; failed capture does not finalize',async()=>{
 const runtime=hookRuntime(),timers=clock(),posts=[],calls=[],win=events({location:{origin:'http://localhost:3000'},...timers.globals});
 const child={postMessage:(data,origin)=>posts.push({data,origin})};let resolved;
 const Component=load('components/settings/sections/VnptKycCapture.tsx',{
 react:runtime.hooks,'lucide-react':icons,sonner:{toast:{error(){}}},'@/types/kyc.type':load('types/kyc.type.ts'),
 '@/services/kyc.service':{__esModule:true,default:{vnptStep:async(...args)=>{calls.push(args);return{message:'IDG-00000000'};},finalizeVnpt:async id=>{calls.push(['finalize',id]);return{status:'PENDING'};}}},
 },{window:win,crypto,Blob,process:{env:{NODE_ENV:'development'}}}).default;
 runtime.mount(Component,{session:{sessionId:'attempt',maxImageMb:1},onResult:value=>{resolved=value;},onCancel(){}});
 flatten(runtime.tree).find(n=>n.type==='iframe').props.ref.current={contentWindow:child};
 const fire=(data,extra={})=>win.fire('message',{origin:win.location.origin,source:child,data,...extra});
 fire({type:'vnpt:ready'});const nonce=posts[0].data.nonce;assert.equal(posts[0].data.allowUpload,true);
 fire({type:'vnpt:camera-error',nonce});await runtime.settle();assert.match(html(runtime),/Không mở được camera/);
 fire({type:'vnpt:request',nonce,id:'one',step:'ocr',body:{}},{origin:'https://evil.test'});
 fire({type:'vnpt:request',nonce,id:'two',step:'arbitrary',body:{}});assert.equal(calls.length,0);
 fire({type:'vnpt:request',nonce,id:'three',step:'ocr',body:{img_front:'front'}});await runtime.settle();assert.equal(calls[0][0],'attempt');assert.equal(calls[0][1],'ocr');
 fire({type:'vnpt:request',nonce,id:'oversize',step:'upload',file:new Blob([new Uint8Array(1048577)])});await runtime.settle();
 assert.match(html(runtime),/Ảnh vượt quá 1 MB/);assert.match(html(runtime),/upload, local/);
 fire({type:'vnpt:complete',nonce,success:true});fire({type:'vnpt:complete',nonce,success:true});await runtime.settle();
 assert.equal(calls.filter(x=>x[0]==='finalize').length,0);assert.equal(resolved,undefined);assert.match(html(runtime),/upload, local/);runtime.unmount();assert.equal(win.listenerCount,0);assert.equal(timers.size,0);
});

test('successful SDK callback asks the backend to finalize once',async()=>{
 const runtime=hookRuntime(),timers=clock(),posts=[],win=events({location:{origin:'http://localhost:3000'},...timers.globals});
 const child={postMessage:data=>posts.push(data)},calls=[];let result;
 const Component=load('components/settings/sections/VnptKycCapture.tsx',{
  react:runtime.hooks,'lucide-react':icons,sonner:{toast:{error(){}}},'@/types/kyc.type':load('types/kyc.type.ts'),
  '@/services/kyc.service':{__esModule:true,default:{finalizeVnpt:async id=>{calls.push(id);return{status:'VERIFIED'};}}},
 },{window:win,crypto,Blob,process:{env:{NODE_ENV:'development'}}}).default;
 runtime.mount(Component,{session:{sessionId:'attempt',maxImageMb:1},onResult:value=>{result=value;},onCancel(){}});
 flatten(runtime.tree).find(n=>n.type==='iframe').props.ref.current={contentWindow:child};
 win.fire('message',{origin:win.location.origin,source:child,data:{type:'vnpt:ready'}});
 const nonce=posts[0].nonce;
 for(let i=0;i<2;i++)win.fire('message',{origin:win.location.origin,source:child,data:{type:'vnpt:complete',nonce}});
 await runtime.settle();assert.deepEqual(calls,['attempt']);assert.equal(result.status,'VERIFIED');runtime.unmount();
});


test('a session response from a previous account cannot reopen its capture',async()=>{
 const runtime=hookRuntime(),capture=()=>null;let actor='alice',resolve;
 const Component=loadKyc({
 react:runtime.hooks,'lucide-react':icons,sonner:{toast:{error(){},message(){},success(){}}},
 '@/services/kyc.service':{__esModule:true,default:{getStatus:async()=>({status:'NOT_VERIFIED',provider:'VNPT'}),createVnptSession:()=>new Promise(done=>{resolve=done;})}},
 './VnptKycCapture':{__esModule:true,default:capture},'@/components/settings/KycVerifiedDetailsPanel':{__esModule:true,default:detailsPanel},'@/features/user/userSlice':{fetchCurrentUser:args=>args},
 '@/store/hooks':{useAppDispatch:()=>()=>{},useAppSelector:fn=>fn({auth:{userId:actor},user:{profile:{id:actor}}})},
 },{window:{clearInterval(){},setInterval(){}}}).default;
 runtime.mount(Component);await runtime.settle();
 flatten(runtime.tree).find(n=>n.type==='button'&&n.props.className.includes('bg-primary')).props.onClick();await runtime.settle();
 actor='bob';runtime.update();await runtime.settle();resolve({sessionId:'alice-attempt',expiresAt:'2099-01-01',maxImageMb:1});await runtime.settle();
 assert.equal(flatten(runtime.tree).find(n=>n.type===capture),undefined);assert.doesNotMatch(html(runtime),/alice-attempt/);runtime.unmount();
});

for(const provider of ['DIDIT','ADMIN'])test(`${provider} verified users stay verified without provider selection or a new session`,async()=>{
 const runtime=hookRuntime(),calls=[];
 const Component=loadKyc({
 react:runtime.hooks,'lucide-react':icons,sonner:{toast:{error(){},success(){}}},
 '@/services/kyc.service':{__esModule:true,default:{getStatus:async()=>({status:'VERIFIED',provider,sessionId:'legacy',verifiedAt:null}),createVnptSession:async()=>calls.push('start')}},
 './VnptKycCapture':{__esModule:true,default:()=>null},'@/components/settings/KycVerifiedDetailsPanel':{__esModule:true,default:detailsPanel},'@/features/user/userSlice':{fetchCurrentUser:args=>args},
 '@/store/hooks':{useAppDispatch:()=>()=>{},useAppSelector:fn=>fn({auth:{userId:'alice'},user:{profile:{id:'alice'}}})},
 }).default;
 runtime.mount(Component);await runtime.settle();
 assert.match(html(runtime),/Danh tính đã được xác minh/);assert.doesNotMatch(html(runtime),/Didit|Xác minh ngay|Nhà cung cấp xác minh/);
 assert.equal(flatten(runtime.tree).find(n=>n.type==='fieldset'),undefined);assert.deepEqual(calls,[]);runtime.unmount();
});

test('a pending VNPT session can be cancelled using the backend result',async()=>{
 const runtime=hookRuntime(),calls=[],capture=()=>null;
 const Component=loadKyc({
 react:runtime.hooks,'lucide-react':icons,sonner:{toast:{error(){},success(){}}},
 '@/services/kyc.service':{__esModule:true,default:{getStatus:async()=>({status:'PENDING',provider:'VNPT',sessionId:'attempt'}),cancelSession:async()=>{calls.push('cancel');return{status:'EXPIRED',provider:'VNPT'};}}},
 './VnptKycCapture':{__esModule:true,default:capture},'@/components/settings/KycVerifiedDetailsPanel':{__esModule:true,default:detailsPanel},'@/features/user/userSlice':{fetchCurrentUser:args=>args},
 '@/store/hooks':{useAppDispatch:()=>()=>{},useAppSelector:fn=>fn({auth:{userId:'alice'},user:{profile:{id:'alice'}}})},
 }).default;
 runtime.mount(Component);await runtime.settle();
 flatten(runtime.tree).find(n=>n.type==='button'&&n.props.className.includes('border-rose')).props.onClick();await runtime.settle();
 assert.deepEqual(calls,['cancel']);assert.match(html(runtime),/Phiên xác minh đã hết hạn/);
 assert.equal(flatten(runtime.tree).find(n=>n.type===capture),undefined);runtime.unmount();
});

test('verified KYC panel shows CCCD and vendor checks from the owner-only API',async()=>{
 const runtime=hookRuntime(),calls=[];
 const Component=load('components/settings/KycVerifiedDetailsPanel.tsx',{
  react:runtime.hooks,'lucide-react':icons,
  '@/services/kyc.service':{__esModule:true,default:{getVerifiedDetails:async()=>{calls.push('details');return{cccd:'001234567890',fullName:'NGUYEN VAN A',faceMatchPercent:97.654,documentValid:true,eyesOpen:false};}}},
 }).default;
 runtime.mount(Component,{cccd:'001234567890',verified:true});await runtime.settle();
 assert.deepEqual(calls,['details']);assert.match(html(runtime),/Thông tin xác thực KYC/);
 assert.match(html(runtime),/001234567890/);assert.match(html(runtime),/97.65%/);
 assert.match(html(runtime),/Khuôn mặt hợp lệ|Mắt mở/);assert.match(html(runtime),/Không đạt/);
 runtime.unmount();
});

test('KYC details appear only in Account & Security',()=>{
 const profile=fs.readFileSync('components/settings/sections/ProfileSection.tsx','utf8');
 const security=fs.readFileSync('components/settings/sections/KycSection.tsx','utf8');
 assert.doesNotMatch(profile,/KycVerifiedDetailsPanel/);
 assert.match(security,/<KycVerifiedDetailsPanel/);
});


test('KYC gate never trusts role or the retired optional flag',()=>{
 const {isKycSatisfied}=load('lib/kyc-gate.ts',{sonner:{toast:{error(){},info(){}}}});
 for(const role of ['ADMIN','USER']) {
  assert.equal(isKycSatisfied({role,kycVerified:false,kycOptional:true}),false);
  assert.equal(isKycSatisfied({role,kycVerified:true}),true);
 }
 assert.equal(isKycSatisfied(null),false);
});
