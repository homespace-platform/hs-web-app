const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const React = require('react');
function load(file, overrides = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { URLSearchParams, URL, Event, console, ...globals })
    (name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports);
  return module.exports;
}
const state = load('lib/rent-filter-state.ts');
const text = load('lib/administrative-location.ts');
const plain = value => JSON.parse(JSON.stringify(value));

function browser(initial = '/rent') {
  let index = 0, entries = [new URL(initial, 'http://localhost:3000')];
  const events = new EventTarget(), storage = new Map();
  const win = { get location() { return entries[index]; },
    addEventListener: (...args) => events.addEventListener(...args), removeEventListener: (...args) => events.removeEventListener(...args),
    dispatchEvent: event => events.dispatchEvent(event),
    history: {
      pushState(data, title, url) { entries = entries.slice(0, index + 1); entries.push(new URL(url, entries[index])); index++; },
      replaceState(data, title, url) { entries[index] = new URL(url, entries[index]); },
      back() { if (index) { index--; events.dispatchEvent(new Event('popstate')); } },
      forward() { if (index + 1 < entries.length) { index++; events.dispatchEvent(new Event('popstate')); } },
    },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  };
  return win;
}

function harness(initial, renderPage = false, locations) {
  let index = 0, slots = [], effects = [], dirty = false, tree;
  const window = browser(initial), calls = [], listeners = new EventTarget();
  const hooks = { ...React,
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value;
        if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }]; },
    useRef(initial) { const i = index++; return slots[i] ?? (slots[i] = { current: initial }); },
    useMemo(fn, deps) { const i = index++, old = slots[i]; if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = index++, old = slots[i]; if (!old || deps.some((v, n) => !Object.is(v, old.deps[n]))) {
      slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); }); } },
    useSyncExternalStore(subscribe, snapshot) { hooks.useEffect(() => subscribe(() => { dirty = true; }), []); return snapshot(); },
  };
  const hook = load('hooks/useRentUrlState.ts', { react: hooks, 'next/navigation': { usePathname: () => window.location.pathname },
    '@/lib/rent-filter-state': state }, { window });
  let Component = hook.useRentUrlState;
  const locationService = locations ?? { getCities: async () => [{code:'12',name:'Thành phố Hồ Chí Minh'}, {code:'11',name:'Thành phố Hà Nội'}],
    getWards: async city => city === '12' ? [{code:'24332',name:'Phường An Nhơn',parentCode:'12'}] : [{code:'14091',name:'Phường Ba Đình',parentCode:'11'}] };
  if (renderPage) {
    const overrides = { react: hooks,
      'next/link': { __esModule: true, default: 'a' },
      '@/hooks/useRentUrlState': hook, '@/lib/rent-filter-state': state, '@/lib/administrative-location': text,
      '@/services/listing-location.service': { __esModule: true, default: locationService },
      '@/services/listing.service': { __esModule: true, default: { getPublicListings: async params => { calls.push(params); return { result: [], totalElements: 0, totalPages: 1 }; } } },
      '@/lib/listing-to-rent-property': { toRentProperty: value => value },
      '@/features/auth/useAuth': { useAuth: () => ({ authenticated: false }) },
      '@/store/hooks': { useAppSelector: selector => selector({favorite:{ids:[]}}) },
      '@/lib/pagination': { getVisiblePages: () => [] },
      'lucide-react': new Proxy({}, {get: () => 'i'}),
      '@/components/ui/button': { Button: 'button' }, '@/components/ui/input': { Input: 'input' }, '@/components/ui/switch': { Switch: 'switch' },
    };
    for (const name of ['layout/Header','layout/Footer','rent/RentCollageCard','rent/RentFilterSidebar'])
      overrides[`@/components/${name}`] = { __esModule: true, default: 'component' };
    Component = load('app/rent/page.tsx', overrides, { window, document: {
      addEventListener: (...args) => listeners.addEventListener(...args), removeEventListener: (...args) => listeners.removeEventListener(...args),
    } }).default;
  }
  function render() { let turns = 0; do { dirty = false; index = 0; tree = Component(); for (const fn of effects.splice(0)) fn();
    assert.ok(++turns < 30, 'effects settle'); } while (dirty); return tree; }
  function label(node) { if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (!node || typeof node !== 'object') return ''; return React.Children.toArray(node.props?.children).map(label).join(''); }
  function find(predicate, node = tree) { if (!node || typeof node !== 'object') return null; if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const result = find(predicate, child); if (result) return result; } return null; }
  render();
  return { window, calls, hook, render, find, label, get value() { return tree; },
    click(text) { const button = find(n => n.type === 'button' && label(n) === text); assert.ok(button, text); button.props.onClick(); render(); },
    async settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); render(); },
  };
}

test('administrative search handles Vietnamese accents, Đ, case and whitespace', () => {
  assert.ok(text.locationMatches('Thành phố Hồ Chí Minh', 'HO CHI MINH'));
  assert.ok(text.locationMatches('Phường Đa Kao', 'da kao'));
  assert.ok(text.locationMatches('Tỉnh Đắk Lắk', '  dak   lak '));
});
test('URL round trips all existing filters and exact string city/ward codes', () => {
  const filter = {...state.DEFAULT_RENT_FILTER, wardId:'24332', category:'house', minPrice:10, maxPrice:30, hasVideoOnly:true, searchQuery:'ban công', areaRange:'50_80', beds:'2'};
  const query = state.writeRentState('cityId=12', filter, 3), parsed = state.readRentState(query);
  assert.equal(parsed.cityId, '12'); assert.equal(parsed.page, 3); assert.deepEqual(plain(parsed.filter), plain(filter));
  const other = new URLSearchParams(state.changeRentCity(query, '11'));
  assert.equal(other.get('cityId'), '11'); assert.equal(other.has('wardId'), false); assert.equal(other.has('page'), false);
  assert.equal(other.get('minPrice'), '10'); assert.equal(other.get('q'), 'ban công');
  const all = new URLSearchParams(state.changeRentCity(query, ''));
  assert.equal(all.has('cityId'), false); assert.equal(all.has('wardId'), false);
});
test('malformed and legacy URL values do not become location keyword filters', () => {
  const parsed = state.readRentState('wardId=24332&district=Gò+Vấp&city=old&category=bad&minPrice=NaN&page=-2');
  assert.equal(parsed.cityId, ''); assert.equal(parsed.filter.wardId, ''); assert.equal(parsed.filter.searchQuery, ''); assert.equal(parsed.page, 1);
  assert.equal(parsed.filter.category, 'all'); assert.equal(parsed.filter.minPrice, 0);
});
test('real URL hook preserves geo and other filters across refresh and Back/Forward', () => {
  const app = harness('/rent?cityId=12&wardId=24332&minPrice=10&page=3');
  assert.equal(app.value.filter.wardId, '24332'); app.value.setCity('11'); app.render();
  assert.equal(app.value.cityId, '11'); assert.equal(app.value.filter.wardId, ''); assert.equal(app.value.filter.minPrice, 10); assert.equal(app.value.page, 1);
  app.window.history.back(); app.render(); assert.equal(app.value.cityId, '12'); assert.equal(app.value.filter.wardId, '24332'); assert.equal(app.value.page, 3);
  app.window.history.forward(); app.render(); assert.equal(app.value.cityId, '11');
  assert.equal(harness(app.window.location.pathname + app.window.location.search).value.cityId, '11');
});
test('actual rent page requires a city before searching and sends location IDs separately from keyword', async () => {
  const all = harness('/rent', true); await all.settle();
  assert.ok(all.find(n => n.type === 'button' && all.label(n) === 'Chọn tỉnh/thành phố trước').props.disabled);
  assert.equal(all.calls.length, 0, 'No nationwide public search without cityId');
  const selected = harness('/rent?cityId=12&wardId=24332&q=ban+công&minPrice=10&maxPrice=30&category=house', true);
  await selected.settle();
  const request = selected.calls.at(-1);
  assert.equal(request.cityId, '12'); assert.equal(request.wardId, '24332'); assert.equal(request.keyword, 'ban công');
  assert.equal(request.priceMin, 10_000_000); assert.equal(request.priceMax, 30_000_000); assert.equal(request.category, 'HOUSE');
  selected.click('Phường An Nhơn'); selected.click('Tất cả Phường/Xã'); await selected.settle();
  assert.equal(selected.calls.at(-1).cityId, '12'); assert.equal(selected.calls.at(-1).wardId, undefined);
});
test('late ward response from previous city cannot replace the current dropdown', async () => {
  const pending = [];
  const app = harness('/rent?cityId=12', true, { getCities: async () => [{code:'12',name:'TP.HCM'},{code:'11',name:'Hà Nội'}],
    getWards: city => new Promise(resolve => pending.push({city,resolve})) });
  app.hook.updateRentQuery(state.changeRentCity(app.window.location.search, '11')); app.render();
  pending.find(x => x.city === '11').resolve([{code:'14091',name:'Phường Ba Đình',parentCode:'11'}]); await app.settle();
  pending.find(x => x.city === '12').resolve([{code:'24332',name:'Phường An Nhơn',parentCode:'12'}]); await app.settle();
  app.click('Tất cả Phường/Xã (Hà Nội)');
  assert.ok(app.find(n => n.type === 'button' && app.label(n) === 'Phường Ba Đình'));
  assert.equal(app.find(n => n.type === 'button' && app.label(n) === 'Phường An Nhơn'), null);
});
test('catalog client shares pending requests, caches per city and retries failed downloads', async () => {
  let calls = [], fail = false;
  const client = load('services/listing-location.service.ts', {}, { fetch: async url => {
    calls.push(url); if (fail) throw new Error('offline');
    return {ok:true, json:async () => url.endsWith('/provinces') ? [{code:'12',name:'TP.HCM'}] : [{code:'24332',parentCode:'12',name:'Phường An Nhơn'}]};
  } }).default;
  const cities = await Promise.all([client.getCities(), client.getCities()]); assert.equal(calls.length, 1);
  assert.deepEqual(cities[0], [{code:'12',name:'TP.HCM'}], 'Do not invent a nationwide city option');
  await client.getWards(''); assert.equal(calls.length, 1);
  await Promise.all([client.getWards('12'), client.getWards('12')]); assert.equal(calls.length, 2);
  fail = true; await assert.rejects(client.getWards('11')); fail = false; await client.getWards('11'); assert.equal(calls.length, 4);
});
