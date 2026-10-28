const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const React = require('react');
function load(file, mocks = {}, globals = {}) {
  const filename = path.join(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const module = {exports: {}};
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {URL, AbortController, ...globals}, {filename})
    (name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
const directions = load('lib/nearby-directions.ts');
const presentation = load('lib/nearby-presentation.ts');
const nearbyTypes = load('types/nearby.type.ts');
const places = [
  {id:'school',name:'Trường học',address:'8 Nguyễn Văn Bảo, Hạnh Thông, Hồ Chí Minh',latitude:10.8209,longitude:106.6872,distanceMeters:24,groups:['EDUCATION']},
  {id:'hospital',name:'<img src=x onerror=alert(1)>',address:'<script>alert(1)</script>',latitude:10.823,longitude:106.689,distanceMeters:350,groups:['HEALTHCARE']},
];
function element(tag) {
  return {tag,style:{},attributes:{},children:[],events:{},
    setAttribute(k,v){this.attributes[k]=v;}, append(...nodes){this.children.push(...nodes);},
    addEventListener(k,fn){this.events[k]=fn;}, click(){this.events.click?.();},
  };
}
function mapFixture({style, onRemove, logConsole = console, project = ([lng,lat])=>({x:lng*100000,y:lat*100000})} = {}) {
  const maps=[],markers=[],popups=[],observers=[];
  class MapSdk {
    constructor(options){this.options=options;this.style=style;this.events={};this.sources={};this.layers=[];this.fits=[];this.flights=[];maps.push(this);}
    scrollZoom={disable:()=>{this.scrollDisabled=true;}};
    on(k,fn){this.events[k]=fn;} off(k){delete this.events[k];} addControl(){}
    addSource(id,value){this.sources[id]=value;} addLayer(value){this.layers.push(value);}
    flyTo(value){this.flights.push(value);} fitBounds(bounds,options){this.fits.push({bounds,options});}
    project(value){return project(value);}
    getZoom(){return 14;} resize(){this.resized=true;} remove(){this.removed=true;this.removeCalls=(this.removeCalls??0)+1;onRemove?.(this);}
  }
  class Marker {
    constructor(options){this.options=options;markers.push(this);}
    setLngLat(value){this.coordinates=value;return this;} setPopup(popup){this.popup=popup;return this;}
    addTo(map){this.map=map;return this;} remove(){this.removed=true;}
  }
  class Popup {
    constructor(options){this.options=options;popups.push(this);}
    setText(text){this.text=text;return this;} setLngLat(value){this.coordinates=value;return this;}
    setDOMContent(content){this.content=content;return this;} addTo(map){this.map=map;return this;}
    remove(){this.removed=true;}
  }
  class Bounds {constructor(a,b){this.points=[a,b];}extend(value){this.points.push(value);return this;}}
  class Observer {constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
  const {createNearbyMap} = load('components/nearby/nearby-map-controller.ts', {
    '@/lib/nearby-directions':directions, '@/lib/nearby-presentation':presentation,'@/types/nearby.type':nearbyTypes,
  }, {document:{createElement:element},ResizeObserver:Observer,console:logConsole});
  let ready=0,errors=0;const errorMessages=[];
  const controller=createNearbyMap({Map:MapSdk,Marker,Popup,LngLatBounds:Bounds,NavigationControl:class{}}, element('div'), {
    latitude:10.8209195,longitude:106.6872986,radius:2000,apiKey:'test key',onReady:()=>ready++,onError:message=>{errors++;errorMessages.push(message);},
  });
  const selected=[];
  const data={places,selectedId:null,activeGroup:'',startIndex:0,onSelect:id=>selected.push(id)};
  controller.update(data);
  const liveMarkers=()=>markers.filter(m=>!m.removed&&m.options.element);
  return {controller,data,maps,markers,popups,observers,selected,liveMarkers,errorMessages,ready:()=>ready,errors:()=>errors};
}

test('map uses exact listing coordinates, closes a two km GeoJSON ring and fits listing plus page POIs',()=>{
  const f=mapFixture(),map=f.maps[0];
  assert.deepEqual(Array.from(map.options.center),[106.6872986,10.8209195]);
  assert.equal(new URL(map.options.style).searchParams.get('apikey'),'test key');
  assert.equal(map.scrollDisabled,true);
  map.events.load();assert.equal(f.ready(),1);
  const ring=map.sources['nearby-radius'].data.geometry.coordinates[0];
  assert.equal(ring.length,65);assert.deepEqual(ring[0],ring[64]);
  const [lng,lat]=ring[0];
  assert.ok(Math.abs((lat-10.8209195)*Math.PI/180*6371008.8-2000)<0.01);
  assert.ok(Math.abs(lng-106.6872986)<0.000001);
  assert.equal(map.fits.at(-1).bounds.points.length,4);
});

test('POI markers are numbered and colored by category, and marker clicks select a matching list item',()=>{
  const f=mapFixture(),markers=f.liveMarkers();
  assert.deepEqual(markers.map(m=>m.options.element.textContent),['1','2']);
  assert.equal(markers[0].options.element.style.backgroundColor,'#16a34a');
  assert.equal(markers[1].options.element.style.backgroundColor,'#dc2626');
  markers[1].options.element.click();
  assert.deepEqual(f.selected,['hospital']);
  assert.equal(markers[1].options.element.attributes['aria-pressed'],'true');
  assert.deepEqual(Array.from(f.maps[0].flights.at(-1).center),[106.689,10.823]);
});

test('list selection opens a text-only popup and routes from the map listing coordinates',()=>{
  const f=mapFixture();f.controller.update({...f.data,selectedId:'hospital'});
  const content=f.popups.at(-1).content;
  assert.equal(content.children[0].textContent,places[1].name);
  assert.equal(content.children[1].textContent,places[1].address);
  assert.equal(content.children[0].children.length,0);
  const link=content.children.find(n=>n.tag==='a'),url=new URL(link.href);
  assert.equal(url.searchParams.get('origin'),'10.8209195,106.6872986');
  assert.equal(url.searchParams.get('destination'),'10.823,106.689');
  assert.equal(link.rel,'noopener noreferrer');
  assert.equal(f.maps.length,1);assert.equal(f.liveMarkers().length,2);
});

test('changing category/page clears stale markers and popup without rebuilding the map',()=>{
  const f=mapFixture();f.controller.update({...f.data,selectedId:'school'});
  const oldMarkers=f.liveMarkers(),oldPopup=f.popups.at(-1);
  f.controller.update({...f.data,places:[places[1]],activeGroup:'HEALTHCARE',startIndex:5,selectedId:null});
  assert.ok(oldMarkers.every(m=>m.removed));assert.equal(oldPopup.removed,true);
  assert.equal(f.maps.length,1);assert.equal(f.liveMarkers().length,1);
  assert.equal(f.liveMarkers()[0].options.element.textContent,'6');
  assert.equal(f.liveMarkers()[0].options.element.attributes['aria-pressed'],'false');
  f.controller.update({...f.data,places:[],selectedId:null});
  assert.equal(f.liveMarkers().length,0);
});

test('invalid POI coordinates are skipped and cannot create a popup or directions',()=>{
  const f=mapFixture();f.controller.update({...f.data,places:[places[0],{...places[1],latitude:null}],selectedId:'hospital'});
  assert.equal(f.liveMarkers().length,1);
  assert.equal(f.popups.length,1,'only the listing popup exists');
});

test('unmount cleans map listeners, markers, popup and observer; removed maps ignore late updates',()=>{
  const f=mapFixture();f.controller.update({...f.data,selectedId:'school'});
  f.maps[0].events.error({error:new Error('Tile request failed')});assert.equal(f.errors(),1);
  const lateLoad=f.maps[0].events.load;
  const lateError=f.maps[0].events.error;
  f.controller.remove();
  assert.equal(f.maps[0].removed,true);assert.equal(f.observers[0].disconnected,true);
  assert.ok(f.markers.every(m=>m.removed));assert.ok(f.popups.at(-1).removed);
  assert.equal(Object.keys(f.maps[0].events).length,0);
  lateLoad();assert.equal(f.ready(),0);
  lateError({error:new Error('Late tile failure')});assert.equal(f.errors(),1);
  f.observers[0].fn();assert.equal(f.maps[0].resized,undefined);
  f.controller.update(f.data);assert.equal(f.liveMarkers().length,0);
  f.controller.remove();assert.equal(f.maps[0].removeCalls,1);
});

test('SDK cancellation events do not mark a live map as broken; genuine load failures still do',()=>{
  const f=mapFixture();
  f.maps[0].events.error({error:new DOMException('signal is aborted without reason','AbortError')});
  f.maps[0].events.error({error:new Error('AbortError')});
  assert.equal(f.errors(),0);
  f.maps[0].events.error({error:new Error('401 Invalid map key')});
  assert.equal(f.errors(),1);
});

test('nearby and co-located points form a selectable group and separate when zoomed',()=>{
  let scale=1000;
  const f=mapFixture({project:([lng,lat])=>({x:lng*scale,y:lat*scale})});
  assert.equal(f.liveMarkers().length,1);
  const cluster=f.liveMarkers()[0];
  assert.equal(cluster.options.element.textContent,'2');
  assert.match(cluster.options.element.attributes['aria-label'],/nhóm 2 tiện ích/);
  cluster.options.element.click();
  const content=f.popups.at(-1).content;
  assert.equal(content.children[0].textContent,'2 tiện ích gần nhau');
  assert.equal(content.children[2].textContent,`2. ${places[1].name}`);
  assert.equal(content.children[2].children.length,0);
  content.children[2].click();
  assert.deepEqual(f.selected,['hospital']);
  assert.deepEqual(Array.from(f.maps[0].flights.at(-1).center),[106.689,10.823]);
  scale=100000;f.maps[0].events.moveend();
  assert.equal(f.liveMarkers().length,2);
  f.controller.update({...f.data,places:[places[0],{...places[1],latitude:places[0].latitude,longitude:places[0].longitude}]});
  assert.equal(f.liveMarkers().length,1,'identical coordinates remain one group instead of hiding POIs');
});

test('list selection exposes the selected pin separately from a nearby group',()=>{
  const f=mapFixture({project:()=>({x:10,y:10})});
  assert.equal(f.liveMarkers().length,1);
  f.controller.update({...f.data,selectedId:'school'});
  assert.equal(f.liveMarkers().length,2);
  const selected=f.liveMarkers().find(m=>m.options.element.attributes['aria-pressed']==='true');
  assert.equal(selected.options.element.title,'Trường học');
  assert.equal(f.popups.at(-1).content.children[0].textContent,'Trường học');
});

test('provider limits and authorization failures have safe messages; a later load event cannot hide a failed basemap',()=>{
  for(const [error,expected] of [
    [{status:423,message:'https://maps.vietmap.vn/tile?apikey=secret'},/giới hạn lượt/],
    [{status:429},/giới hạn lượt/],
    [{message:'Your request is limited'},/giới hạn lượt/],
    [{status:403},/quyền sử dụng/],
    [new TypeError('Failed to fetch https://maps.vietmap.vn/tile?apikey=secret'),/Không tải được nền bản đồ/],
  ]) {
    const f=mapFixture();f.maps[0].events.error({error});
    assert.match(f.errorMessages[0],expected);
    assert.doesNotMatch(f.errorMessages[0],/secret|apikey|https:/);
    f.maps[0].events.load();assert.equal(f.ready(),0);
  }
});

// Exercise the pinned SDK's real loadURL/fetch rejection and Evented.fire implementation.
// No WebGL or external HTTP is needed to reproduce its asynchronous teardown error.
function pendingSdkResources() {
  const requests=[],logged=[];
  const logConsole={...console,error:error=>logged.push(error)};
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('@vietmap/vietmap-gl-js/dist/vietmap-gl.js'),'utf8'),{
    module,exports:module.exports,require,AbortController,Request,URL,Blob,setTimeout,clearTimeout,performance,
    console:logConsole,self:{},window:{location:{protocol:'http:',href:'http://localhost/'},performance,URL:{createObjectURL:()=> 'blob:nearby-test'}},
    fetch:request=>new Promise((resolve,reject)=>{
      requests.push({request,reject});
      request.signal.addEventListener('abort',()=>reject(request.signal.reason),{once:true});
    }),
  });
  const sdk=module.exports,style=new sdk.Evented(),cache=new sdk.Evented(),source=new sdk.Evented();
  style.sourceCaches={tiles:cache};cache.setEventedParent(style);source.setEventedParent(cache);
  for(const resource of [style,source]) {
    resource.map={_requestManager:{transformRequest:url=>({url})}};
    sdk.Style.prototype.loadURL.call(resource,'https://maps.example.test/style.json');
  }
  const detach=()=>{style.setEventedParent(null);cache.setEventedParent(null);};
  const abort=()=>{for(const resource of [style,source])resource._loadStyleRequest.abort();};
  return {style,source,requests,logged,logConsole,detach,abort};
}

test('real VietMap 6.0.1 style and source aborts after teardown never reach console.error',async()=>{
  const baseline=pendingSdkResources();baseline.detach();baseline.abort();
  await new Promise(setImmediate);
  assert.equal(baseline.logged.length,2,'reproduce both SDK errors before applying the teardown guard');
  assert.ok(baseline.logged.every(error=>error.name==='AbortError'));

  const resource=pendingSdkResources();
  const f=mapFixture({style:resource.style,logConsole:resource.logConsole,onRemove:()=>{resource.detach();resource.abort();}});
  f.controller.remove();
  assert.ok(resource.requests.every(({request})=>request.signal.aborted));
  await new Promise(setImmediate);
  assert.equal(resource.logged.length,0);
  assert.equal(f.errors(),0);
  assert.equal(f.maps[0].removeCalls,1);
});

test('a non-cancellation SDK error arriving after disposal remains visible',async()=>{
  const resource=pendingSdkResources();
  const f=mapFixture({style:resource.style,logConsole:resource.logConsole,onRemove:resource.detach});
  f.controller.remove();
  const failure=new Error('Unexpected style response');
  resource.requests[0].reject(failure);
  resource.requests[1].reject(new DOMException('Cancelled tile','AbortError'));
  await new Promise(setImmediate);
  assert.equal(resource.logged.length,1);
  assert.equal(resource.logged[0],failure);
});

function panelFixture({key='browser-test-key',latitude=10.82,longitude=106.68}={}) {
  let slots=[],index=0,pending=[],dirty=false,tree;
  const requests=[];
  const MapComponent=()=>null;
  const hooks={...React,useId:()=> 'nearby-test',
    useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
    useRef(initial){const i=index++;return slots[i]??(slots[i]={current:initial});},
    useEffect(fn,deps){const i=index++,old=slots[i];if(!old||deps.some((d,n)=>!Object.is(d,old.deps[n]))){slots[i]={deps,cleanup:old?.cleanup};pending.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn();});}}
  };
  const Component=load('components/nearby/NearbyPlacesPanel.tsx',{
    react:hooks,'next/dynamic':()=>MapComponent,
    '@/types/nearby.type':nearbyTypes,'@/lib/nearby-directions':directions,'@/lib/nearby-presentation':presentation,
    '@/features/auth/useAuth':{useAuth:()=>assert.fail('Nearby map must not depend on account authentication')},
    '@/store/hooks':{useAppSelector:()=>assert.fail('Nearby map must not read account coordinates')},
    '@/services/nearby.service':{getNearbyPlaces:(listing,group,page,signal)=>new Promise((resolve,reject)=>requests.push({listing,group,page,signal,resolve,reject}))},
  },{process:{env:{NEXT_PUBLIC_VIETMAP_MAP_API_KEY:key}},document:{getElementById:()=>({focus(){}})}}).default;
  function render(){let turns=0;do{dirty=false;index=0;tree=Component({listingId:'listing',latitude,longitude});for(const fn of pending.splice(0))fn();assert.ok(++turns<30);}while(dirty);}
  function find(predicate,node=tree){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const match=find(predicate,child);if(match)return match;}return null;}
  const click=node=>{assert.ok(node);node.props.onClick();render();};
  const tab=id=>find(n=>n.props?.id===`nearby-test-tab-${id}`);
  const map=()=>find(n=>n.type===MapComponent);
  const response=(items=places,page=1)=>({enabled:true,items,total:12,page,size:5,coverage:{groups:[]}});
  const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();render();};
  render();return {requests,find,click,tab,map,render,response,settle};
}

test('map is the first/default tab and switching views shares the same page without another HTTP call',async()=>{
  const f=panelFixture();f.requests[0].resolve(f.response());await f.settle();
  const tablist=f.find(n=>n.props?.role==='tablist');
  assert.equal(React.Children.toArray(tablist.props.children)[0].props.id,'nearby-test-tab-map');
  assert.equal(f.tab('map').props['aria-selected'],true);assert.equal(f.map().props.places,places);
  assert.equal(f.map().props.radius,2000);
  assert.equal(f.map().props.latitude,10.82);assert.equal(f.map().props.longitude,106.68);
  assert.equal(Object.hasOwn(f.map().props,'origin'),false,'map directions are derived from the listing coordinates');
  f.click(f.tab('list'));
  assert.equal(f.tab('list').props['aria-selected'],true);assert.equal(f.map(),null);
  f.tab('list').props.onKeyDown({key:'Home',preventDefault(){}});f.render();
  assert.equal(f.tab('map').props['aria-selected'],true);
  f.tab('map').props.onKeyDown({key:'End',preventDefault(){}});f.render();
  assert.equal(f.tab('list').props['aria-selected'],true);
  f.tab('list').props.onKeyDown({key:'ArrowLeft',preventDefault(){}});f.render();
  assert.equal(f.tab('map').props['aria-selected'],true);
  assert.equal(f.requests.length,1);
});

test('map/list selection is shared; category and page changes cancel old requests and cannot retain stale pins',async()=>{
  const f=panelFixture();f.requests[0].resolve(f.response());await f.settle();f.click(f.tab('map'));
  f.map().props.onSelect('school');f.render();assert.equal(f.map().props.selectedId,'school');
  f.click(f.find(n=>n.type==='button'&&n.props.children==='Y tế'));
  assert.equal(f.requests[1].group,'HEALTHCARE');assert.equal(f.map().props.selectedId,null);assert.equal(f.map().props.places.length,0);
  f.click(f.find(n=>n.type==='button'&&n.props.children==='Giáo dục'));
  assert.equal(f.requests[1].signal.aborted,true);
  f.requests[2].resolve(f.response([places[0]]));await f.settle();
  f.requests[1].resolve(f.response([places[1]]));await f.settle();assert.equal(f.map().props.places[0].id,'school');
  f.click(f.find(n=>n.type==='button'&&React.Children.toArray(n.props.children).some(c=>c==='Tiếp')));
  assert.equal(f.requests.at(-1).page,2);assert.equal(f.requests.at(-1).group,'EDUCATION');
  f.requests.at(-1).resolve(f.response([places[0]],2));await f.settle();assert.equal(f.map().props.startIndex,5);
});

test('a missing browser map key or listing coordinates never loads the SDK and keeps the list usable',async()=>{
  for(const options of [{key:''},{latitude:undefined},{latitude:91}]) {
    // Destructuring defaults are bypassed explicitly for malformed coordinates.
    const f=panelFixture(options.latitude===undefined&&Object.hasOwn(options,'latitude')?{latitude:null}:options);
    f.requests[0].resolve(f.response());await f.settle();f.click(f.tab('map'));
    assert.equal(f.map(),null);assert.equal(f.requests.length,1);
    f.click(f.tab('list'));assert.ok(f.find(n=>n.props?.['aria-label']==='Danh sách tiện ích'));
  }
});
