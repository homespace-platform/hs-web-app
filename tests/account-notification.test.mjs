import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const moduleRef = { exports: {} };
const filename = new URL('../services/notification.service.ts', import.meta.url);
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console })(
  name => name === '@/lib/axios-client' ? {} : name === '@/types/notification.type'
    ? { NOTIFICATION_CATEGORIES: ['ACCOUNT'] } : require(name), moduleRef, moduleRef.exports);
const api = moduleRef.exports;

test('account tags distinguish committed transitions and reject prototype lookups', () => {
  const expected = { ACCOUNT_ROLE_CHANGED: 'Đổi vai trò', ACCOUNT_DISABLED: 'Đã vô hiệu hóa', ACCOUNT_ENABLED: 'Đã kích hoạt lại' };
  for (const [type, tag] of Object.entries(expected)) {
    const item = { category: 'ACCOUNT', type, metadata: null };
    assert.equal(api.getNotificationTag(item), tag);
    assert.equal(api.getNotificationRecipientSideLabel(item), null);
  }
  for (const type of ['unknown', 'constructor', '__proto__', 'toString'])
    assert.equal(api.getNotificationTag({ category: 'ACCOUNT', type }), 'Tài khoản');
  assert.equal(api.getNotificationTag({ category: 'SYSTEM', type: 'ACCOUNT_DISABLED' }), 'Hệ thống');
});

test('account notification action points to existing own-account page and preserves opt-out preferences', () => {
  assert.equal(api.getSafeActionPath('/settings/account-security'), '/settings/account-security');
  assert.equal(api.getSafeActionPath('//evil.test/settings'), null);
  assert.ok(fs.existsSync(new URL('../app/settings/account-security/page.tsx', import.meta.url)));
  const configured = api.withDefaultPreferences([{ category: 'ACCOUNT', push: false, email: false }]);
  assert.equal(configured[0].push, false); assert.equal(configured[0].email, false);
});
