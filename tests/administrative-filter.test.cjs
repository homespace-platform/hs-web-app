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

function harness(initial, renderPage = false, locations, stored = {}) {
  let index = 0, slots = [], effects = [], dirty = false, tree;
  const window = browser(initial), calls = [], listeners = new EventTarget();
  for (const [key, value] of Object.entries(stored)) window.localStorage.setItem(key, JSON.stringify(value));
  const slice = load('features/location/locationSlice.ts', { '@reduxjs/toolkit': require('@reduxjs/toolkit') }, { window, localStorage: window.localStorage });
  // Header dispatches hydrateLocation on mount; the mocked Header cannot, so hydrate up front.
  let loc = slice.default(undefined, slice.hydrateLocation());
  const dispatch = action => { loc = slice.default(loc, action); dirty = true; return action; };
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
      '@/store/hooks': { useAppSelector: selector => selector({favorite:{ids:[]}, location: loc}), useAppDispatch: () => dispatch },
      '@/features/location/locationSlice': slice,
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
  return { window, calls, hook, render, find, label, dispatch, slice, get loc() { return loc; }, get value() { return tree; },
    click(text) { const button = find(n => n.type === 'button' && label(n) === text); assert.ok(button, text); button.props.onClick(); render(); },
    async settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); render(); },
  };
}

test('administrative search handles Vietnamese accents, Đ, case and whitespace', () => {
  assert.ok(text.locationMatches('Thành phố Hồ Chí Minh', 'HO CHI MINH'));
  assert.ok(text.locationMatches('Phường Đa Kao', 'da kao'));
  assert.ok(text.locationMatches('Tỉnh Đắk Lắk', '  dak   lak '));
});
const HCM = {homespace_selected_city_vietmap: {code:'12', name:'Thành phố Hồ Chí Minh'}, homespace_selected_ward_vietmap: {code:'24332', name:'Phường An Nhơn', cityId:'12'}};
test('first sign-in without a location selects all of Ho Chi Minh City and saves it', async () => {
  const app = harness('/rent', true);
  await app.settle();
  assert.equal(app.loc.cityId, '');
  assert.equal(app.calls.length, 0);

  app.dispatch(app.slice.hydrateLocation(true));
  await app.settle();
  assert.equal(app.loc.cityId, '12');
  assert.equal(app.loc.wardId, '');
  assert.deepEqual(JSON.parse(app.window.localStorage.getItem(app.slice.CITY_STORAGE_KEY)), HCM.homespace_selected_city_vietmap);
  assert.equal(app.window.localStorage.getItem(app.slice.WARD_STORAGE_KEY), null);
  assert.equal(app.calls.at(-1).cityId, '12');
  assert.equal(app.calls.at(-1).wardId, undefined);
});
test('sign-in keeps an existing city and ward selection', () => {
  const app = harness('/rent', false, undefined, {
    homespace_selected_city_vietmap: { code: '11', name: 'Thành phố Hà Nội' },
    homespace_selected_ward_vietmap: { code: '14091', name: 'Phường Ba Đình', cityId: '11' },
  });
  app.dispatch(app.slice.hydrateLocation(true));
  assert.equal(app.loc.cityId, '11');
  assert.equal(app.loc.wardId, '14091');
});
test('URL round trips filters but never carries cityId/wardId', () => {
  const filter = {...state.DEFAULT_RENT_FILTER, wardId:'24332', category:'house', minPrice:10, maxPrice:30, hasVideoOnly:true, searchQuery:'ban công', areaRange:'50_80', beds:'2', sortBy:'price_asc'};
  const query = state.writeRentState('cityId=12&wardId=24332', filter, 3), params = new URLSearchParams(query), parsed = state.readRentState(query);
  assert.equal(params.has('cityId'), false); assert.equal(params.has('wardId'), false);
  assert.equal(params.get('areaRange'), '50_80'); assert.equal(params.get('category'), 'house'); assert.equal(params.get('sortBy'), 'price_asc');
  assert.equal(params.get('q'), 'ban công'); assert.equal(params.get('minPrice'), '10'); assert.equal(params.get('page'), '3');
  assert.equal(parsed.legacy, null); assert.equal(parsed.page, 3); assert.deepEqual(plain(parsed.filter), plain({...filter, wardId:''}));
});
test('malformed URL values do not become location keyword filters', () => {
  const parsed = state.readRentState('district=Gò+Vấp&city=old&category=bad&minPrice=NaN&page=-2');
  assert.equal(parsed.filter.wardId, ''); assert.equal(parsed.filter.searchQuery, ''); assert.equal(parsed.page, 1);
  assert.equal(parsed.filter.category, 'all'); assert.equal(parsed.filter.minPrice, 0);
});
test('legacy cityId/wardId are parsed for one-time import only and validated', () => {
  assert.equal(state.legacyLocationFromSearch('minPrice=10'), null);
  assert.deepEqual(plain(state.legacyLocationFromSearch('cityId=12&wardId=24332')), {cityId:'12', wardId:'24332'});
  assert.deepEqual(plain(state.legacyLocationFromSearch('cityId=12')), {cityId:'12', wardId:''});
  assert.deepEqual(plain(state.legacyLocationFromSearch('wardId=24332')), {cityId:'', wardId:''}, 'ward without city is dropped');
  assert.deepEqual(plain(state.legacyLocationFromSearch('cityId=abc&wardId=0')), {cityId:'', wardId:''});
  assert.deepEqual(plain(state.readRentState('cityId=12&wardId=24332').legacy), {cityId:'12', wardId:'24332'});
  assert.equal(state.readRentState('cityId=12&wardId=24332').filter.wardId, '', 'URL ward never reaches the filter');
  assert.equal(state.stripLegacyLocation('cityId=12&wardId=1&category=house&page=2'), 'category=house&page=2');
});
test('real URL hook preserves filters and page across refresh and Back/Forward', () => {
  const app = harness('/rent?areaRange=50_80&minPrice=10&page=3');
  assert.equal(app.value.page, 3); app.value.setPage(1); app.render();
  assert.equal(app.value.page, 1); assert.equal(app.value.filter.minPrice, 10); assert.equal(app.value.filter.areaRange, '50_80');
  app.window.history.back(); app.render(); assert.equal(app.value.page, 3);
  app.window.history.forward(); app.render(); assert.equal(app.value.page, 1);
  assert.equal(harness(app.window.location.pathname + app.window.location.search).value.filter.minPrice, 10);
});
test('rent page needs a stored city, then sends store city/ward separately from keyword with URL-only filters', async () => {
  const all = harness('/rent', true); await all.settle();
  assert.equal(all.calls.length, 0, 'No nationwide public search without a stored city');
  assert.equal(all.find(n => n.type === 'button' && /Phường\/Xã/.test(all.label(n))), null, 'ward picker lives in global header');
  const selected = harness('/rent?q=ban+công&minPrice=10&maxPrice=30&category=house&areaRange=50_80', true, undefined, HCM);
  await selected.settle();
  const request = selected.calls.at(-1);
  assert.equal(request.cityId, '12'); assert.equal(request.wardId, '24332'); assert.equal(request.keyword, 'ban công');
  assert.equal(request.priceMin, 10_000_000); assert.equal(request.priceMax, 30_000_000); assert.equal(request.category, 'HOUSE'); assert.equal(request.areaMin, 50);
  assert.equal(selected.window.location.search.includes('cityId'), false);
  assert.ok(/Phường An Nhơn, Thành phố Hồ Chí Minh/.test(selected.label(selected.value)), 'copy follows the store location name');
  selected.dispatch(selected.slice.setGlobalWard(null)); await selected.settle();
  assert.equal(selected.calls.at(-1).cityId, '12'); assert.equal(selected.calls.at(-1).wardId, undefined);
});
test('store location change re-queries, drops page and switching city clears ward', async () => {
  const app = harness('/rent?category=house&page=3', true, undefined, HCM); await app.settle();
  assert.equal(app.calls.at(-1).page, 3);
  app.dispatch(app.slice.setGlobalCity({code:'11', name:'Thành phố Hà Nội'})); await app.settle();
  assert.equal(app.window.location.search, '?category=house', 'page dropped, other params kept');
  const request = app.calls.at(-1);
  assert.equal(request.cityId, '11'); assert.equal(request.wardId, undefined); assert.equal(request.page, 1); assert.equal(request.category, 'HOUSE');
});
test('legacy /rent?cityId&wardId links are imported once into the store and stripped from the URL', async () => {
  const app = harness('/rent?cityId=11&wardId=14091&category=house&page=2', true); await app.settle();
  assert.equal(app.window.location.search, '?category=house&page=2');
  assert.deepEqual(plain({c:app.loc.cityId, cn:app.loc.cityName, w:app.loc.wardId, wn:app.loc.wardName}), {c:'11', cn:'Thành phố Hà Nội', w:'14091', wn:'Phường Ba Đình'});
  assert.equal(JSON.parse(app.window.localStorage.getItem('homespace_selected_city_vietmap')).code, '11');
  assert.equal(app.calls.length, 1, 'no query with stale location before the import');
  assert.equal(app.calls[0].cityId, '11'); assert.equal(app.calls[0].wardId, '14091'); assert.equal(app.calls[0].page, 2, 'import does not reset page');
  const offline = harness('/rent?cityId=99&wardId=77', true, { getCities: async () => { throw new Error('x'); }, getWards: async () => { throw new Error('x'); } });
  await offline.settle();
  assert.equal(offline.window.location.search, ''); assert.equal(offline.loc.cityName, '99'); assert.equal(offline.loc.wardName, '77');
  const orphan = harness('/rent?wardId=24332&category=room', true, undefined, HCM); await orphan.settle();
  assert.equal(orphan.window.location.search, '?category=room'); assert.equal(orphan.loc.cityId, '12'); assert.equal(orphan.loc.wardId, '24332', 'ward without city leaves store untouched');
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
