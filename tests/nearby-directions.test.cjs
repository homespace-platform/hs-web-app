const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks = {}) {
  const filename = path.join(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })
    (name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}

const directions = load('lib/nearby-directions.ts');
const nearbyTypes = load('types/nearby.type.ts');
const listing = { latitude: 10.8209195, longitude: 106.6872986 };
const poi = { id: 'poi', name: 'Nearby school', latitude: 16.0625755, longitude: 108.2178987,
  address: '8 Đường Nguyễn Văn Bảo, Hồ Chí Minh', distanceMeters: 51, groups: ['EDUCATION'] };

test('Google Maps receives the exact listing origin and POI destination, preserving their order and precision', () => {
  const url = new URL(directions.nearbyDirectionsUrl(listing, poi));
  assert.equal(url.origin + url.pathname, 'https://www.google.com/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('origin'), '10.8209195,106.6872986');
  assert.equal(url.searchParams.get('destination'), '16.0625755,108.2178987');
  assert.equal(url.searchParams.has('key'), false);
});

test('missing or invalid listing/POI coordinates never produce a route with guessed coordinates', () => {
  for (const invalid of [undefined, null, {}, {latitude: null, longitude: 106}, {latitude: '', longitude: 106},
    {latitude: '10.8', longitude: 106}, {latitude: NaN, longitude: 106}, {latitude: 10, longitude: Infinity},
    {latitude: 91, longitude: 106}, {latitude: 10, longitude: -181}]) {
    assert.equal(directions.nearbyDirectionsUrl(invalid, poi), null);
    assert.equal(directions.nearbyDirectionsUrl(listing, invalid), null);
  }
  assert.equal(new URL(directions.nearbyDirectionsUrl({latitude: 0, longitude: 0}, poi)).searchParams.get('origin'), '0,0');
});

function panel({total = 1, currentPage = 1, latitude = 11, longitude = 107, items = [poi]} = {}) {
  const page = {enabled: true, items, total, page: currentPage, size: 5, coverage: {groups: [
    {code: 'EDUCATION', coverageStatus: 'COMPLETE_PROVIDER_RESPONSE', radiusCoveredMeters: 2000},
  ]}};
  const Component = load('components/nearby/NearbyPlacesPanel.tsx', {
    // These assertions inspect the list view; map-default behavior is covered in nearby-map.test.cjs.
    react: {...React, useState: initial => [initial?.key === '' ? {key: JSON.stringify(['listing', 2000, '', currentPage, 0]), data: page, error: ''} : initial === 1 ? currentPage : initial === 'map' ? 'list' : initial, () => {}], useEffect: () => {}},
    'next/dynamic': () => () => null,
    '@/features/auth/useAuth': {useAuth: () => assert.fail('Nearby directions must work without an account or login')},
    '@/store/hooks': {useAppSelector: () => assert.fail('Nearby directions must not read an account address')},
    '@/lib/nearby-directions': directions,
    '@/lib/nearby-presentation': load('lib/nearby-presentation.ts'),
    '@/services/nearby.service': {getNearbyPlaces: () => assert.fail('Rendering must not call a map provider')},
    '@/types/nearby.type': nearbyTypes,
  }).default;
  return renderToStaticMarkup(React.createElement(Component, {listingId: 'listing', latitude, longitude}));
}

test('Nearby only shows two km and routes from the listing without consulting an account', () => {
  const html = panel();
  assert.match(html, /Trong 2 km/);
  assert.doesNotMatch(html, /<select|Trong 3 km|Trong 5 km/);
  assert.match(html, /origin=11%2C107/);
  assert.match(html, /destination=16\.0625755%2C108\.2178987/);
  assert.match(html, /Chỉ đường từ vị trí bài đăng đến tiện ích/);
  assert.doesNotMatch(html, /Đăng nhập|Cập nhật địa chỉ|\/settings\/profile/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
});

test('Nearby requests always use two km and five items, with the selected category and page', async () => {
  const calls = [], expected = {items: [], total: 0, size: 5, page: 2};
  const service = load('services/nearby.service.ts', {
    '@/types/nearby.type': nearbyTypes,
    '@/lib/axios-client': {get: async (...args) => {calls.push(args); return {data: {result: expected}};}},
  });
  const controller = new AbortController();
  assert.equal(await service.getNearbyPlaces('listing', 'EDUCATION', 2, controller.signal), expected);
  assert.deepEqual(calls[0][1].params, {radiusMeters: 2000, groups: 'EDUCATION', page: 2, size: 5});
  assert.equal(calls[0][1].signal, controller.signal);
  await service.getNearbyPlaces('listing', '', 1);
  assert.deepEqual(calls[1][1].params, {radiusMeters: 2000, page: 1, size: 5});
});

test('pagination uses the server page size and disables navigation at the first and last pages', () => {
  const first = panel({total: 12});
  assert.match(first, /Trang 1 \/ 3/);
  assert.match(first, /<button[^>]*disabled=""[^>]*>.*?Trước/);
  const last = panel({total: 12, currentPage: 3});
  assert.match(last, /Trang 3 \/ 3/);
  assert.match(last, /<button[^>]*disabled=""[^>]*>Tiếp/);
  assert.doesNotMatch(panel({total: 5}), /Trang 1 \/ 1/);
});

test('invalid listing or POI coordinates disable directions without an account fallback', () => {
  for (const options of [{latitude: null}, {latitude: 91}, {longitude: NaN}, {items: [{...poi, latitude: null}]}]) {
    const html = panel(options);
    assert.doesNotMatch(html, /google\.com\/maps\/dir|origin=/);
  }
  assert.match(panel({latitude: null}), /Tin đăng chưa có tọa độ hợp lệ để chỉ đường/);
  assert.match(panel({latitude: null}), /<button[^>]*disabled=""[^>]*title="Chưa có tọa độ hợp lệ/);
});
