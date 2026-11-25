import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/notification-runtime.mjs';

const api = load('lib/kyc-return.ts');
const { parseKycParams, safeReturnTo, isValidState, toAppStatus, buildAppReturnUrl, isKycTerminal, DEFAULT_RETURN_TO } = api;
const STATE = 'abcdEFGH0123_-xy'; // 16 chars
const BACKEND = ['NOT_VERIFIED', 'PENDING', 'REVIEW_REQUIRED', 'VERIFIED', 'REJECTED', 'EXPIRED'];
const ch = code => String.fromCharCode(code);

test('default return path is account security', () => assert.equal(DEFAULT_RETURN_TO, '/settings/account-security'));

test('isValidState accepts 16..128 chars of [A-Za-z0-9_-] only', () => {
  for (const ok of [STATE, 'a'.repeat(16), 'a'.repeat(128), 'A-b_C-d_E-f_G-h-1234']) assert.equal(isValidState(ok), true, ok);
  const bad = ['', 'a'.repeat(15), 'a'.repeat(129), STATE + '!', STATE + ' ', ' ' + STATE, STATE + ch(10), 'abcd/EFGH0123_-xy',
    'abcdEFGH0123_-x.', ch(225) + 'bcdEFGH0123_-xy', 'abcdEFGH0123_-x%', null, undefined, 123, [STATE], { a: 1 }];
  for (const value of bad) assert.equal(isValidState(value), false, String(value));
});

test('parseKycParams: client defaults to web and unknown values mean web', () => {
  for (const search of ['', '?', 'foo=bar', 'client=', 'client=WEB', 'client=APP', 'client=ios', 'client=app%20', '?client=desktop&state=' + STATE]) {
    const result = parseKycParams(search);
    assert.equal(result.client, 'web', search);
    assert.equal(result.returnTo, DEFAULT_RETURN_TO, search);
    assert.equal('state' in result, false);
  }
  assert.equal(parseKycParams(null).client, 'web');
  assert.equal(parseKycParams(undefined).client, 'web');
  assert.equal(parseKycParams('client=web').client, 'web');
});

test('parseKycParams: client=app requires a valid state, never redirects on a bad one', () => {
  assert.deepEqual({ ...parseKycParams('client=app&state=' + STATE) }, { client: 'app', state: STATE });
  assert.deepEqual({ ...parseKycParams('?state=' + STATE + '&client=app') }, { client: 'app', state: STATE });
  assert.deepEqual({ ...parseKycParams(new URLSearchParams({ client: 'app', state: STATE })) }, { client: 'app', state: STATE });
  for (const search of ['client=app', 'client=app&state=', 'client=app&state=short', 'client=app&state=' + 'a'.repeat(129),
    'client=app&state=' + 'a'.repeat(15), 'client=app&state=' + STATE + '%21', 'client=app&state=' + STATE + '%0A',
    'client=app&state=%3Cscript%3Ealert(1)%3C%2Fscript%3E', 'client=app&state=a b c d e f g h i j k l']) {
    assert.deepEqual({ ...parseKycParams(search) }, { client: 'app', state: null }, search);
  }
});

test('parseKycParams: returnTo is ignored for app and unknown params are ignored', () => {
  const app = parseKycParams('client=app&state=' + STATE + '&returnTo=%2Fx&foo=1');
  assert.deepEqual({ ...app }, { client: 'app', state: STATE });
  const web = parseKycParams('returnTo=%2Fsettings%2Fprofile&state=' + STATE + '&foo=1');
  assert.deepEqual({ ...web }, { client: 'web', returnTo: '/settings/profile' });
});

test('safeReturnTo accepts same-origin relative paths with query and hash', () => {
  for (const ok of ['/', '/settings/profile', '/settings/account-security', '/rent?city=hn&page=2', '/rent/abc#gallery',
    '/search?q=a%20b', '/a//b', '/dashboard/contracts/1?tab=pay#x', '/' + 'a'.repeat(299), '/kycx']) {
    assert.equal(safeReturnTo(ok), ok, ok);
  }
});

test('safeReturnTo rejects open redirects and tricks (falls back to default)', () => {
  const bad = ['//evil.com', '///evil.com', 'https://evil.com', 'http://evil.com/x', 'javascript:alert(1)', 'data:text/html,x',
    'homespace://kyc/result', '\\\\evil', '/\\evil', '\\evil', '/\\/evil.com', '%2F%2Fevil.com', '%2f%2fevil.com', '%5Cevil', '%5cevil',
    '/%2Fevil.com', '/%2fevil.com', '/%5Cevil', '/%5cevil.com', '/ok' + ch(10) + 'Location:x', '/ok' + ch(13) + ch(10) + 'Set-Cookie:a=b',
    '/ok%0d%0aLocation:x', '/a' + ch(9) + 'b', '/a' + ch(0) + 'b', '/a' + ch(127) + 'b', '/a' + ch(0x85) + 'b', '/a' + ch(0x2028) + 'b',
    ' /ok', ch(10) + '/ok', 'ok', 'settings/profile', '', ' ',
    '/' + 'a'.repeat(300), '/%', '/%E0%A4%A', '/kyc', '/kyc?client=app', '/kyc/', '/kyc#x', '/KYC?x=1',
    null, undefined, 42, {}, ['/ok'], ['//evil.com'], true];
  for (const value of bad) assert.equal(safeReturnTo(value), DEFAULT_RETURN_TO, JSON.stringify(value));
});

test('returnTo is validated end to end through the query string', () => {
  const enc = value => 'returnTo=' + encodeURIComponent(value);
  assert.equal(parseKycParams(enc('//evil.com')).returnTo, DEFAULT_RETURN_TO);
  assert.equal(parseKycParams(enc('%2F%2Fevil.com')).returnTo, DEFAULT_RETURN_TO);
  assert.equal(parseKycParams(enc('/ok' + ch(10) + 'Location:x')).returnTo, DEFAULT_RETURN_TO);
  assert.equal(parseKycParams('returnTo=%2F%2Fevil.com').returnTo, DEFAULT_RETURN_TO);
  assert.equal(parseKycParams('returnTo=%5Cevil').returnTo, DEFAULT_RETURN_TO);
  assert.equal(parseKycParams(enc('/rent?city=hn&page=2#top')).returnTo, '/rent?city=hn&page=2#top');
  assert.equal(parseKycParams('returnTo=&x=1').returnTo, DEFAULT_RETURN_TO);
});

test('toAppStatus maps every backend enum value and the app-only values', () => {
  assert.equal(toAppStatus('VERIFIED'), 'VERIFIED');
  assert.equal(toAppStatus('REJECTED'), 'REJECTED');
  assert.equal(toAppStatus('REVIEW_REQUIRED'), 'REVIEW_REQUIRED');
  assert.equal(toAppStatus('EXPIRED'), 'EXPIRED');
  assert.equal(toAppStatus('PENDING'), 'PENDING');
  assert.equal(toAppStatus('CANCELLED'), 'CANCELLED');
  assert.equal(toAppStatus('ERROR'), 'ERROR');
  // not started / unknown: PENDING only while a session exists, otherwise no automatic redirect
  assert.equal(toAppStatus('NOT_VERIFIED'), null);
  assert.equal(toAppStatus('NOT_VERIFIED', true), 'PENDING');
  for (const odd of ['verified', 'DIDIT', '', null, undefined, 5, {}]) {
    assert.equal(toAppStatus(odd), null);
    assert.equal(toAppStatus(odd, true), 'PENDING');
  }
  for (const status of BACKEND.filter(s => s !== 'NOT_VERIFIED')) assert.equal(toAppStatus(status, true), status);
});

test('buildAppReturnUrl has a fixed scheme/host/path and exactly state+status', () => {
  assert.equal(buildAppReturnUrl(STATE, 'VERIFIED'), `homespace://kyc/result?state=${STATE}&status=VERIFIED`);
  for (const status of ['VERIFIED', 'REJECTED', 'REVIEW_REQUIRED', 'EXPIRED', 'PENDING', 'CANCELLED', 'ERROR']) {
    const url = new URL(buildAppReturnUrl(STATE, status));
    assert.equal(url.protocol, 'homespace:');
    assert.equal(url.hostname, 'kyc');
    assert.equal(url.pathname, '/result');
    assert.deepEqual([...url.searchParams.keys()], ['state', 'status']);
    assert.equal(url.searchParams.get('state'), STATE);
    assert.equal(url.searchParams.get('status'), status);
  }
});

test('buildAppReturnUrl never builds a URL from an unchecked state or status', () => {
  for (const state of ['', 'short', STATE + '&status=VERIFIED', STATE + '#x', STATE + '/..', 'https://evil.com/aaaaaaaaaaaa', '%0d%0a' + STATE,
    STATE + ch(10), null, undefined, 1, [STATE]]) {
    assert.equal(buildAppReturnUrl(state, 'VERIFIED'), null, String(state));
  }
  for (const status of ['', 'verified', 'NOT_VERIFIED', 'VERIFIED&x=1', 'VERIFIED' + ch(10), null, undefined, 1]) {
    assert.equal(buildAppReturnUrl(STATE, status), null, String(status));
  }
});

test('isKycTerminal: flow is over for final statuses only', () => {
  for (const status of ['VERIFIED', 'REJECTED', 'REVIEW_REQUIRED', 'EXPIRED', 'CANCELLED', 'ERROR']) assert.equal(isKycTerminal(status), true, status);
  for (const status of ['PENDING', 'NOT_VERIFIED', '', null, undefined, 'x']) assert.equal(isKycTerminal(status), false, String(status));
});
