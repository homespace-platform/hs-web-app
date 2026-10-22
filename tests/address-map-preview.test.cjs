const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function load(file, overrides = {}) {
  const source = ts.transpileModule(read(file), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`)
    (name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports);
  return module.exports.default;
}

const MapPreview = load('components/address/AddressMapPreview.tsx');
const savedAddress = { id: 'address-1', refId: 'vm:saved', display: 'Đường Nguyễn Văn Bảo, Phường Hạnh Thông, Thành phố Hồ Chí Minh',
  name: 'Đường Nguyễn Văn Bảo', street: 'Nguyễn Văn Bảo', cityId: '12', wardId: '24332', latitude: 10.8337055, longitude: 106.6894342 };
const preview = props => renderToStaticMarkup(React.createElement(MapPreview, props));

function editor(initialAddress = savedAddress) {
  let slots = [], index = 0, pending = [], dirty = false, tree;
  const requests = [], notifications = [], callbacks = [];
  const Picker = () => null;
  const props = { initialAddress, onSaved: () => { callbacks.push('saved'); } };
  const hooks = { ...React,
    useState(initial) {
      const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value;
        if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }];
    },
    useEffect(fn, deps) {
      const i = index++, old = slots[i];
      if (!old || deps.some((d, n) => !Object.is(d, old.deps[n]))) {
        slots[i] = { deps, cleanup: old?.cleanup };
        pending.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const Component = load('components/settings/AddressEditor.tsx', {
    react: hooks,
    '@/components/address/VietmapAddressPicker': { __esModule: true, default: Picker },
    '@/components/address/AddressMapPreview': { __esModule: true, default: MapPreview },
    '@/services/user.service': { __esModule: true, default: {
      saveAddress: data => new Promise((resolve, reject) => requests.push({ data, resolve, reject })),
    } },
    sonner: { toast: { success: text => notifications.push(text), error: text => notifications.push(text) } },
  });
  function render() {
    let turns = 0;
    do { dirty = false; index = 0; tree = Component(props); for (const fn of pending.splice(0)) fn();
      assert.ok(++turns < 30, 'effects settle'); } while (dirty);
  }
  function find(predicate, node = tree) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const result = find(predicate, child); if (result) return result; }
    return null;
  }
  render();
  return { props, requests, notifications, callbacks, render, find,
    mapHtml: () => preview(find(n => n.type === MapPreview).props),
    select(value) { find(n => n.type === Picker).props.onChange(value); render(); },
    save() { find(n => n.type === 'button').props.onClick(); render(); },
    async settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); render(); },
  };
}

test('map embeds and external link use the exact stored coordinates, never an address search', () => {
  const html = preview(savedAddress);
  const encoded = encodeURIComponent('10.8337055,106.6894342');
  assert.ok(html.includes(`https://www.google.com/maps?q=${encoded}&amp;z=16&amp;output=embed`));
  assert.ok(html.includes(`href="https://www.google.com/maps?q=${encoded}"`));
  assert.match(html, /loading="lazy"/); assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /Nguyễn Văn Bảo|api\/v1\/locations|apikey|không lưu tọa độ/);
});

test('missing, malformed and out-of-range coordinates never render a guessed/default map', () => {
  for (const props of [ {}, { latitude: null, longitude: 106 }, { latitude: 10, longitude: undefined },
    { latitude: '', longitude: 106 }, { latitude: '10.7', longitude: 106 }, { latitude: NaN, longitude: 106 },
    { latitude: 10, longitude: Infinity }, { latitude: 91, longitude: 106 }, { latitude: 10, longitude: -181 } ]) {
    assert.equal(preview({ ...props, fullAddress: 'A valid-looking address must not become a fallback' }), '');
  }
  assert.match(preview({ latitude: 0, longitude: 0 }), /q=0%2C0/);
  assert.match(preview({ latitude: -90, longitude: 180 }), /q=-90%2C180/);
});

test('Profile loaded from backend immediately shows its stored position without a lookup or save', () => {
  const app = editor();
  assert.match(app.mapHtml(), /q=10\.8337055%2C106\.6894342/);
  assert.equal(app.requests.length, 0); assert.equal(app.callbacks.length, 0);
  const empty = editor(null); assert.equal(empty.mapHtml(), '');
});

test('editing invalidates the old pin; choosing another result previews only the new coordinates', () => {
  const app = editor(); app.select(null); assert.equal(app.mapHtml(), '');
  const chosen = { ...savedAddress, refId: 'vm:new', latitude: 10.8344664, longitude: 106.7825491 };
  app.select(chosen); assert.match(app.mapHtml(), /q=10\.8344664%2C106\.7825491/);
  assert.doesNotMatch(app.mapHtml(), /10\.8337055/); assert.equal(app.requests.length, 0);
});

test('successful save uses canonical database response coordinates, not the previous Place result', async () => {
  const app = editor(); const chosen = { ...savedAddress, refId: 'vm:new', latitude: 10.83446641234, longitude: 106.78254911234 };
  app.select(chosen); app.save();
  assert.deepEqual(JSON.parse(JSON.stringify(app.requests[0].data)), { refId: 'vm:new' });
  const persisted = { ...chosen, latitude: 10.8344664, longitude: 106.7825491 };
  app.requests[0].resolve(persisted); await app.settle();
  assert.match(app.mapHtml(), /q=10\.8344664%2C106\.7825491/); assert.doesNotMatch(app.mapHtml(), /1234/);
  assert.deepEqual(app.callbacks, ['saved']); assert.ok(app.notifications.includes('Đã lưu địa chỉ.'));
  app.props.initialAddress = persisted; app.render();
  assert.match(app.mapHtml(), /q=10\.8344664%2C106\.7825491/);
  assert.equal(editor(persisted).mapHtml(), app.mapHtml());
});

test('failed save keeps the chosen preview and never reports the position as saved', async () => {
  const app = editor(); app.select({ ...savedAddress, latitude: 11, longitude: 107 }); app.save();
  app.requests[0].reject(new Error('Network unavailable')); await app.settle();
  assert.match(app.mapHtml(), /q=11%2C107/); assert.equal(app.callbacks.length, 0);
  assert.ok(!app.notifications.includes('Đã lưu địa chỉ.'));
});

test('Admin restores the same coordinate preview and save behavior as customer Profile', () => {
  for (const file of ['components/address/AddressMapPreview.tsx', 'components/settings/AddressEditor.tsx']) {
    const admin = fs.readFileSync(path.join(__dirname, '../../hs-admin-portal/src', file), 'utf8');
    assert.equal(admin.replaceAll('\r\n', '\n'), read(file).replaceAll('\r\n', '\n'));
  }
});
