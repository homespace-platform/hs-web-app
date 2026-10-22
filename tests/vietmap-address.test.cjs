const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const React = require('react');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const place = {refId:'geocode:selected',display:'197 Trần Phú, Phường Chợ Quán, Thành phố Hồ Chí Minh',cityId:'12',city:'Thành phố Hồ Chí Minh',wardId:'18700',ward:'Phường Chợ Quán',houseNumber:'197',street:'Trần Phú',address:'Phường Chợ Quán, Thành phố Hồ Chí Minh',latitude:10.7592229,longitude:106.6759027};
const suggestion = {refId:place.refId,display:place.display,name:'197 Trần Phú',address:place.address};

function picker(initialValue=null) {
  let slots=[],index=0,pending=[],dirty=false,tree;
  const timers=new Set(),requests=[];
  const props={value:initialValue,onChange(value){props.value=value;dirty=true;}};
  const hooks={...React,
    useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
    useRef(initial){const i=index++;return slots[i]??(slots[i]={current:initial});},
    useEffect(fn,deps){const i=index++,old=slots[i];if(!old||deps.some((d,n)=>!Object.is(d,old.deps[n]))){
      slots[i]={deps,cleanup:old?.cleanup};pending.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn();});}}
  };
  const api=Object.fromEntries(['autocomplete','geocode','place','reverse'].map(kind=>[kind,(...args)=>new Promise((resolve,reject)=>requests.push({kind,args,signal:args.at(-1),resolve,reject}))]));
  const source=ts.transpileModule(read('components/address/VietmapAddressPicker.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`,{setTimeout:fn=>{timers.add(fn);return fn;},clearTimeout:fn=>timers.delete(fn),AbortController})
    (name=>name==='react'?hooks:name==='@/services/vietmap.service'?{vietmapService:api}:require(name),module,module.exports);
  const Component=module.exports.default;
  function render(){let turns=0;do{dirty=false;index=0;tree=Component(props);for(const fn of pending.splice(0))fn();assert.ok(++turns<30,'effects settle');}while(dirty);}
  function find(predicate,node=tree){if(!node||typeof node!=='object')return null;if(predicate(node))return node;
    for(const child of React.Children.toArray(node.props?.children)){const result=find(predicate,child);if(result)return result;}return null;}
  render();
  return {props,requests,render,find,
    edit(value){find(n=>n.type==='input'&&n.props['aria-label']==='Địa chỉ').props.onChange({target:{value}});render();},
    input(label,value){find(n=>n.type==='input'&&n.props['aria-label']===label).props.onChange({target:{value}});render();},
    click(label){const button=find(n=>n.type==='button'&&n.props.children===label);assert.ok(button,label);button.props.onClick();render();},
    timers(){for(const job of [...timers]){timers.delete(job);job();}render();},
    async settle(){for(let i=0;i<8;i++)await Promise.resolve();render();},
    unmount(){for(const slot of slots)slot?.cleanup?.();}
  };
}

test('autocomplete is debounced and stale results cannot overwrite the newest query',async()=>{
  const app=picker();app.edit('197 Trần');assert.equal(app.requests.length,0);app.timers();const old=app.requests[0];
  app.edit('198 Trần');app.timers();const current=app.requests[1];assert.equal(old.signal.aborted,true);
  current.resolve([{...suggestion,display:'Newest address'}]);await app.settle();old.resolve([{...suggestion,display:'Stale address'}]);await app.settle();
  assert.ok(app.find(n=>n.type==='button'&&n.props.children==='Newest address'));
  assert.equal(app.find(n=>n.type==='button'&&n.props.children==='Stale address'),null);assert.equal(app.props.value,null);
});
test('selecting resolves Place once and editing invalidates the selected address and coordinates',async()=>{
  const app=picker();app.edit('197 Trần');app.timers();app.requests[0].resolve([suggestion]);await app.settle();
  app.click(suggestion.display);assert.equal(app.requests[1].kind,'place');assert.equal(app.requests[1].args[0],suggestion.refId);
  app.requests[1].resolve(place);await app.settle();assert.equal(app.props.value,place);
  app.timers();assert.equal(app.requests.length,2);app.edit('Another street');assert.equal(app.props.value,null);
});
test('customer UI only requires typing and choosing without technical search or coordinate controls',()=>{
  const app=picker(place);
  assert.equal(app.find(n=>n.type==='button'),null);
  for(const label of ['Vĩ độ','Kinh độ'])assert.equal(app.find(n=>n.type==='input'&&n.props['aria-label']===label),null);
  assert.equal(app.find(n=>n.type==='details'),null);
  assert.ok(app.find(n=>n.type==='input'&&n.props.value===place.display));
  assert.ok(app.find(n=>n.props?.role==='status'&&n.props.children==='Đã chọn địa chỉ. Bạn có thể lưu thay đổi.'));
  assert.doesNotMatch(read('components/address/VietmapAddressPicker.tsx'),/Tìm địa chỉ đầy đủ|Tìm từ tọa độ|Vĩ độ:|Kinh độ:|vietmapService\.(geocode|reverse)/);
});
test('a concrete Place with empty parsed street completes selection without requesting coordinates',async()=>{
  const app=picker();app.edit('194 Đình Phong Phú');app.timers();
  const address={...place,display:'194 Đình Phong Phú, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh',name:'194 Đình Phong Phú',street:'',houseNumber:null};
  const item={...suggestion,display:address.display};
  app.requests[0].resolve([item]);await app.settle();app.click(item.display);
  assert.equal(app.find(n=>n.type==='button'&&n.props.children===item.display).props.disabled,true);
  app.requests[1].resolve(address);await app.settle();
  assert.equal(app.props.value,address);assert.equal(app.find(n=>n.props?.role==='alert'),null);
  assert.deepEqual(app.requests.map(r=>r.kind),['autocomplete','place']);
});
test('an unmounted request is cancelled',async()=>{
  const app=picker();app.edit('197 Trần');app.timers();app.unmount();assert.equal(app.requests[0].signal.aborted,true);
  app.requests[0].resolve([suggestion]);await app.settle();assert.equal(app.props.value,null);
});
test('empty suggestions give simple guidance and clear when another search starts',async()=>{
  const app=picker();assert.equal(app.find(n=>n.props?.role==='status'),null);
  app.edit('Unknown street');app.timers();app.requests[0].resolve([]);await app.settle();
  assert.ok(app.find(n=>n.props?.role==='status'&&n.props.children==='Chưa tìm thấy địa chỉ. Thử thêm số nhà hoặc tên khu vực.'));
  app.edit('Another street');assert.equal(app.find(n=>n.props?.role==='status'),null);
});
test('editing during Place lookup cancels it and cannot restore an outdated selection',async()=>{
  const app=picker();app.edit('197 Trần');app.timers();app.requests[0].resolve([suggestion]);await app.settle();
  app.click(suggestion.display);const lookup=app.requests[1];app.edit('Another street');
  assert.equal(lookup.signal.aborted,true);lookup.resolve(place);await app.settle();
  assert.equal(app.props.value,null);assert.ok(app.find(n=>n.type==='input'&&n.props.value==='Another street'));
});

test('Web and Admin share the same provider contract; form saves send refs, not client-fabricated components',()=>{
  const service=read('services/vietmap.service.ts'),editor=read('components/settings/AddressEditor.tsx');
  for(const endpoint of ['autocomplete','geocode','place','reverse'])assert.ok(service.includes(`"${endpoint}"`));
  assert.ok(editor.includes('refId: selected.refId'));assert.ok(editor.includes('!selected'));
  const admin=fs.readFileSync(path.join(__dirname,'../../hs-admin-portal/src/components/address/VietmapAddressPicker.tsx'),'utf8');
  assert.equal(admin.replaceAll('\r\n','\n'),read('components/address/VietmapAddressPicker.tsx').replaceAll('\r\n','\n'));
  assert.doesNotMatch(service,/apikey|NEXT_PUBLIC_LOCATION_SERVICE|localhost:9999/);
  assert.doesNotMatch(read('app/dashboard/properties/new/components/LocationSection.tsx'),/provinceService|SearchableLocationDropdown/);
});

test('a failed lookup keeps suggestions retryable and never treats unverified text as a saved selection',async()=>{
  const app=picker();app.edit('197 Trần');app.timers();app.requests[0].resolve([suggestion]);await app.settle();
  app.click(suggestion.display);app.requests[1].reject(new Error('provider unavailable'));await app.settle();
  assert.equal(app.props.value,null);assert.ok(app.find(n=>n.props?.role==='alert'));
  assert.equal(app.find(n=>n.type==='button'&&n.props.children===suggestion.display).props.disabled,false);
  app.click(suggestion.display);app.requests[2].resolve(place);await app.settle();
  assert.equal(app.props.value,place);assert.equal(app.find(n=>n.props?.role==='alert'),null);
});
