const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.join(__dirname, '..');
const provinces = require('../data/vietmap/province.json');
const wards = require('../data/vietmap/ward.json');
function load(file, overrides) {
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${output}\n})`, { Response })(name => {
    assert.ok(Object.hasOwn(overrides, name), `Unexpected runtime dependency: ${name}`);
    return overrides[name];
  }, module, module.exports);
  return module.exports;
}
const catalog = load('lib/server/administrative-catalog.ts', {
  'server-only': {}, '@/data/vietmap/province.json': provinces, '@/data/vietmap/ward.json': wards,
});

test('Next catalog returns all source provinces, not just cities with published listings', async () => {
  assert.equal(catalog.getProvinces().length, Object.keys(provinces).length);
  assert.equal(catalog.getProvinces().length, 34);
  assert.ok(catalog.getProvinces().every(city => typeof city.code === 'string'));
  const route = load('app/api/locations/provinces/route.ts', { '@/lib/server/administrative-catalog': catalog });
  const response = route.GET();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.some(city => city.code === '12' && city.name === provinces['12'].name_with_type));
});

test('Next ward endpoint returns only wards of the selected city with exact source string IDs', async () => {
  const route = load('app/api/locations/provinces/[code]/wards/route.ts', { '@/lib/server/administrative-catalog': catalog });
  for (const code of Object.keys(provinces)) {
    const response = await route.GET(new Request('http://localhost/api/locations'), { params: Promise.resolve({ code }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.length, Object.values(wards).filter(ward => ward.parent_code === code).length);
    assert.ok(result.every(ward => ward.parentCode === code && ward.name === wards[ward.code].name_with_type));
  }
  const missing = await route.GET(new Request('http://localhost/api/locations'), { params: Promise.resolve({ code: '999999' }) });
  assert.equal(missing.status, 404);
  assert.equal(catalog.getWardsByProvince('').length, 0);
});
