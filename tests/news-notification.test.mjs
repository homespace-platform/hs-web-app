import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const moduleRef = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console })(
    name => Object.hasOwn(mocks, name) ? mocks[name] : nodeRequire(name), moduleRef, moduleRef.exports);
  return moduleRef.exports;
}

test('news notifications have a filter, article link, and default-on opt-out channels', async () => {
  const types = load('../types/notification.type.ts');
  const calls = [];
  const axios = {
    get: async (path, config) => {
      calls.push({ path, config });
      return { data: { result: { items: [], hasMore: false } } };
    },
    put: async (path, body) => {
      calls.push({ path, body });
      return { data: { result: { items: body.items } } };
    },
    patch: async (path, body) => {
      calls.push({ path, body });
      return { data: { result: { items: [{ category: body.category, push: false, email: false }] } } };
    },
  };
  const api = load('../services/notification.service.ts', {
    '@/lib/axios-client': axios,
    '@/types/notification.type': types,
  });

  assert.ok(types.NOTIFICATION_CATEGORIES.includes('NEWS'));
  assert.ok(api.NOTIFICATION_FILTER_TABS.some(tab => tab.id === 'NEWS' && tab.label === 'Tin tức'));
  assert.equal(api.getCategoryMeta('NEWS').tag, 'Tin tức');
  assert.equal(api.getNotificationTag({ category: 'NEWS', type: 'NEWS_PUBLISHED' }), 'Tin tức');
  assert.equal(api.getSafeActionPath('/news/market-update'), '/news/market-update');
  assert.ok(fs.existsSync(new URL('../app/news/[slug]/page.tsx', import.meta.url)));

  const defaults = api.withDefaultPreferences([]).find(item => item.category === 'NEWS');
  assert.equal(defaults.push, true);
  assert.equal(defaults.email, true);
  const optedOut = api.withDefaultPreferences([{ category: 'NEWS', push: false, email: false }]).find(item => item.category === 'NEWS');
  assert.equal(optedOut.push, false);
  assert.equal(optedOut.email, false);

  await api.notificationService.getFeed({ category: 'NEWS' });
  assert.equal(calls[0].config.params.category, 'NEWS');
  await api.notificationService.updatePreferences(api.withDefaultPreferences([{ category: 'NEWS', push: false, email: false }]));
  const saved = calls[1].body.items.find(item => item.category === 'NEWS');
  assert.equal(saved.push, false);
  assert.equal(saved.email, false);
  const updated = await api.notificationService.patchPreference('NEWS', 'email', false);
  assert.equal(calls[2].path, '/api/v1/notifications/preferences');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[2].body)), { category: 'NEWS', channel: 'email', enabled: false });
  assert.equal(updated.find(item => item.category === 'NEWS').push, false, 'changing email preserves the server push opt-out');
});
