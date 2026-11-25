import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load } from './helpers/notification-runtime.mjs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const walk = dir => fs.readdirSync(new URL('../' + dir, import.meta.url), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? (['node_modules', '.next', 'tests'].includes(entry.name) ? [] : walk(path.posix.join(dir, entry.name)))
    : /\.(ts|tsx)$/.test(entry.name) ? [path.posix.join(dir, entry.name)] : []);

test('/kyc route exists, is a client page wrapped in Suspense and not indexable', () => {
  const page = read('app/kyc/page.tsx');
  assert.match(page, /^"use client"/);
  assert.match(page, /<Suspense/);
  assert.match(page, /useSearchParams/);
  assert.match(page, /parseKycParams/);
  assert.match(page, /<KycFlow/);
  assert.match(page, /Liên kết không hợp lệ/);
  const layout = read('app/kyc/layout.tsx');
  assert.match(layout, /index: false/);
  assert.match(layout, /referrer: "no-referrer"/);
});

test('app mode hides the regular Header/Footer, web mode keeps them', () => {
  const page = read('app/kyc/page.tsx');
  const app = page.slice(page.indexOf('params.client === "app"'), page.indexOf('return (\n    <div className="flex min-h-screen'));
  assert.doesNotMatch(app, /<Header|<Footer/);
  assert.match(page, /<Header \/>[\s\S]*<Footer \/>/);
  assert.match(read('components/chat/FloatingChatButton.tsx'), /pathname === "\/kyc"/);
});

test('/kyc requires login and the login keeps the full URL (query)', () => {
  const routes = load('features/auth/protectedRoutes.ts');
  for (const route of ['/kyc', '/kyc/x']) assert.equal(routes.isProtectedRoute(route), true, route);
  assert.equal(routes.isProtectedRoute('/kycx'), false);
  assert.equal(routes.isLoginInPlaceRoute('/kyc'), true);
  assert.equal(routes.isLoginInPlaceRoute('/settings'), false);
  const guard = read('components/auth/AuthGuard.tsx');
  assert.match(guard, /isLoginInPlaceRoute\(pathname\)/);
  assert.match(guard, /keycloak\.login\(\{ redirectUri: window\.location\.href \}\)/);
  // the old behaviour (go home and remember the path) stays for the other protected routes
  assert.match(guard, /router\.replace\("\/"\)/);
  assert.match(guard, /hs:return-url/);
});

test('Settings KycSection only navigates to /kyc?returnTo= and embeds no capture', () => {
  const section = read('components/settings/sections/KycSection.tsx');
  assert.match(section, /\/kyc\?returnTo=\$\{encodeURIComponent\(pathname\)\}/);
  assert.doesNotMatch(section, /VnptKycCapture|createVnptSession|<dialog/);
  assert.match(section, /<KycVerifiedDetailsPanel/);
});

test('KYC links point to /kyc', () => {
  const gate = read('lib/profile-gate.ts');
  assert.match(gate, /code: "KYC", label: "Xác minh danh tính \(KYC\)", href: "\/kyc"/);
  const kycGate = read('lib/kyc-gate.ts');
  assert.match(kycGate, /const KYC_PATH = "\/kyc"/);
  assert.doesNotMatch(kycGate, /account-security/);
  const toasts = [];
  const pushed = [];
  const mod = load('lib/kyc-gate.ts', { sonner: { toast: { error: (_m, o) => toasts.push(o), info() {} } } }, { window: { location: { pathname: '/rent/abc', search: '?x=1' } } });
  mod.requireKyc({ kycVerified: false }, { router: { push: href => pushed.push(href) } });
  assert.deepEqual(pushed, ['/kyc?returnTo=%2Frent%2Fabc%3Fx%3D1']);
  toasts[0].action.onClick();
  assert.equal(pushed[1], pushed[0]);
});

test('only KycFlow creates a VNPT session; the capture keeps camera permission and origin checks', () => {
  const users = walk('.').concat(walk('app')).filter((file, i, all) => all.indexOf(file) === i)
    .filter(file => /createVnptSession/.test(read(file)));
  assert.deepEqual(users.sort(), ['components/kyc/KycFlow.tsx', 'services/kyc.service.ts']);
  const capture = read('components/settings/sections/VnptKycCapture.tsx');
  assert.match(capture, /allow="camera"/);
  assert.match(capture, /event\.origin !== window\.location\.origin/);
  assert.match(capture, /event\.source !== frame\.current\?\.contentWindow/);
  assert.match(capture, /data\.nonce !== nonce/);
  assert.match(capture, /variant === "page"/);
  assert.match(capture, /h-dvh/);
  assert.match(read('components/kyc/KycFlow.tsx'), /variant="page"/);
});

test('flow never logs or exposes state/status/token', () => {
  for (const file of ['components/kyc/KycFlow.tsx', 'app/kyc/page.tsx', 'lib/kyc-flow.ts', 'lib/kyc-return.ts']) {
    assert.doesNotMatch(read(file), /console\.|localStorage|sessionStorage|token/i, file);
  }
  // the scheme redirect only goes through the validated builder
  assert.doesNotMatch(read('components/kyc/KycFlow.tsx'), /homespace:\/\//);
});

test('/kyc cannot be framed by another site, but its own same-origin VNPT iframe still can', () => {
  const config = read('next.config.ts');
  assert.match(config, /source:\s*"\/kyc\/:path\*"/);
  assert.match(config, /frame-ancestors 'self'/);
  assert.match(config, /X-Frame-Options[\s\S]{0,40}SAMEORIGIN/);
  // The capture iframe is same-origin (/kyc/vnpt-frame.html), so 'self' keeps it working.
  assert.match(read('components/settings/sections/VnptKycCapture.tsx'), /src="\/kyc\/vnpt-frame\.html"/);
});
