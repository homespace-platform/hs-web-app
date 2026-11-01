const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');

function fixture() {
  const timers = new Map(); let id = 0;
  const module = {exports:{}};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/nearby-sync.ts'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  vm.runInNewContext(`(function(module,exports){${source}\n})`,{
    setTimeout(fn,ms){assert.equal(ms,3000);timers.set(++id,fn);return id;},
    clearTimeout(id){timers.delete(id);},
  })(module,module.exports);
  return {...module.exports,timers,tick:async()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);await fn();}};
}
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
const page=status=>({enabled:true,syncStatus:status,items:[],coverage:{groups:[]}});

test('reads pending/current-location job until ready, then stops instead of keeping an empty screen',async()=>{
  const f=fixture(),controller=new AbortController(),seen=[];
  const responses=[page('PENDING'),page('RUNNING'),{...page('SUCCESS'),items:[{id:'school'}]}];let calls=0;
  f.watchNearbySync(async()=>responses[calls++],p=>seen.push(p),()=>assert.fail('unexpected error'),controller.signal);
  await flush();await f.tick();await f.tick();
  assert.equal(calls,3);assert.equal(seen.at(-1).items[0].id,'school');assert.equal(f.timers.size,0);
});
test('terminal/disabled/legacy responses do not poll or trigger any rescan',async()=>{
  for(const status of ['SUCCESS','PARTIAL','FAILED','CANCELLED','SUPERSEDED','DISABLED',undefined]) {
    const f=fixture();let calls=0;
    f.watchNearbySync(async()=>{calls++;return page(status);},()=>{},()=>assert.fail(),new AbortController().signal);
    await flush();assert.equal(calls,1);assert.equal(f.timers.size,0);
  }
});
test('pending reads are bounded and unmount/changed address cancels the next read',async()=>{
  const f=fixture(),controller=new AbortController();let calls=0,watching;
  f.watchNearbySync(async()=>{calls++;return page('RETRY_WAIT');},(_,value)=>{watching=value;},()=>assert.fail(),controller.signal);
  await flush();while(f.timers.size)await f.tick();assert.equal(calls,21);assert.equal(watching,false);
  const g=fixture(),c=new AbortController();
  g.watchNearbySync(async()=>page('PENDING'),()=>{},()=>assert.fail(),c.signal);
  await flush();assert.equal(g.timers.size,1);c.abort();assert.equal(g.timers.size,0);
});
test('an old address response arriving after cancellation never replaces the new result',async()=>{
  const f=fixture(),c=new AbortController();let resolve,seen=0;
  f.watchNearbySync(()=>new Promise(r=>{resolve=r;}),()=>seen++,()=>assert.fail(),c.signal);
  c.abort();resolve(page('SUCCESS'));await flush();assert.equal(seen,0);assert.equal(f.timers.size,0);
});
