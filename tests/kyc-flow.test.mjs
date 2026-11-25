import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/notification-runtime.mjs';

const ret = load('lib/kyc-return.ts');
const flow = load('lib/kyc-flow.ts', { '@/lib/kyc-return': ret });
const { kycFlowReducer: reduce, initialKycFlowState: initial, screenForStatus, canStartKyc, appStatusFor, resolveReturn, classifyKycError, ACCOUNT_MISMATCH_ERROR } = flow;
const STATE = 'abcdEFGH0123_-xy';
const kyc = (status, extra = {}) => ({ status, verifiedAt: null, provider: 'VNPT', sessionId: null, sessionUrl: null, ...extra });
const session = { sessionId: 'sess-1', expiresAt: '2099-01-01', maxImageMb: 5 };
const fail = (over = {}) => ({ code: 'START_FAILED', fatal: false, message: 'm', ...over });
const run = (state, ...actions) => actions.reduce(reduce, state);
const ALL = ['loading', 'needsLogin', 'ready', 'starting', 'capturing', 'finalizing', 'result', 'cancelled', 'error'];
const states = {
  loading: initial,
  needsLogin: { phase: 'needsLogin' },
  ready: { phase: 'ready', kyc: kyc('NOT_VERIFIED') },
  starting: { phase: 'starting', kyc: kyc('NOT_VERIFIED') },
  capturing: { phase: 'capturing', kyc: kyc('PENDING'), session },
  finalizing: { phase: 'finalizing', kyc: kyc('PENDING'), session },
  result: { phase: 'result', kyc: kyc('VERIFIED') },
  cancelled: { phase: 'cancelled', kyc: null },
  error: { phase: 'error', code: 'FORBIDDEN', message: 'x' },
};

test('each backend status maps to its screen after loading', () => {
  for (const status of ['NOT_VERIFIED', 'REJECTED', 'EXPIRED', 'PENDING']) {
    const next = reduce(initial, { type: 'LOADED', kyc: kyc(status) });
    assert.equal(next.phase, 'ready', status);
    assert.equal(next.kyc.status, status);
  }
  for (const status of ['VERIFIED', 'REVIEW_REQUIRED']) assert.equal(reduce(initial, { type: 'LOADED', kyc: kyc(status) }).phase, 'result', status);
  assert.equal(screenForStatus(kyc('SOMETHING_NEW')).phase, 'ready');
  assert.equal(canStartKyc(kyc('VERIFIED')), false);
  assert.equal(canStartKyc(kyc('REVIEW_REQUIRED')), false);
  assert.equal(canStartKyc(kyc('PENDING')), true);
});

test('happy path: loading -> ready -> starting -> capturing -> finalizing -> result', () => {
  let s = reduce(initial, { type: 'LOADED', kyc: kyc('NOT_VERIFIED') });
  s = reduce(s, { type: 'START' });
  assert.equal(s.phase, 'starting');
  s = reduce(s, { type: 'SESSION_CREATED', session });
  assert.equal(s.phase, 'capturing');
  assert.equal(s.kyc.status, 'PENDING');
  assert.equal(s.kyc.sessionId, 'sess-1');
  s = reduce(s, { type: 'FINALIZING' });
  assert.equal(s.phase, 'finalizing');
  assert.equal(s.session, session);
  s = reduce(s, { type: 'RESULT', kyc: kyc('VERIFIED') });
  assert.deepEqual({ ...s }, { phase: 'result', kyc: kyc('VERIFIED') });
  assert.equal(appStatusFor(s), 'VERIFIED');
});

test('login and load failures', () => {
  assert.equal(reduce(initial, { type: 'LOGIN_REQUIRED' }).phase, 'needsLogin');
  assert.equal(reduce(states.needsLogin, { type: 'RETRY' }).phase, 'loading');
  const failed = reduce(initial, { type: 'LOAD_FAILED', error: fail({ code: 'LOAD_FAILED', fatal: true, message: 'down' }) });
  assert.deepEqual({ ...failed }, { phase: 'error', code: 'LOAD_FAILED', message: 'down' });
  assert.equal(reduce(failed, { type: 'RETRY' }).phase, 'loading');
  const forbidden = reduce(initial, { type: 'LOAD_FAILED', error: fail({ code: 'FORBIDDEN', fatal: true }) });
  assert.equal(reduce(forbidden, { type: 'RETRY' }), forbidden, 'only load failures are retryable');
});

test('cannot start when already VERIFIED or waiting for review', () => {
  for (const status of ['VERIFIED', 'REVIEW_REQUIRED']) {
    const screen = reduce(initial, { type: 'LOADED', kyc: kyc(status) });
    assert.equal(reduce(screen, { type: 'START' }), screen);
    const forced = { phase: 'ready', kyc: kyc(status) };
    assert.equal(reduce(forced, { type: 'START' }), forced);
  }
  assert.equal(appStatusFor(reduce(initial, { type: 'LOADED', kyc: kyc('VERIFIED') })), 'VERIFIED');
});

test('start failures: fatal ones end in error, recoverable ones return to ready with a notice', () => {
  const soft = reduce(states.starting, { type: 'START_FAILED', error: fail({ message: 'thử lại' }) });
  assert.deepEqual({ ...soft }, { phase: 'ready', kyc: kyc('NOT_VERIFIED'), notice: 'thử lại' });
  const hard = reduce(states.starting, { type: 'START_FAILED', error: fail({ code: 'FORBIDDEN', fatal: true, message: 'cấm' }) });
  assert.deepEqual({ ...hard }, { phase: 'error', code: 'FORBIDDEN', message: 'cấm' });
});

test('cancel and exit end the flow as cancelled', () => {
  assert.equal(reduce(states.capturing, { type: 'CANCEL_DONE', kyc: kyc('EXPIRED') }).phase, 'cancelled');
  assert.equal(reduce(states.finalizing, { type: 'CANCEL_DONE', warning: 'w' }).warning, 'w');
  assert.equal(reduce({ phase: 'ready', kyc: kyc('PENDING') }, { type: 'CANCEL_DONE', kyc: kyc('EXPIRED') }).phase, 'cancelled');
  const exited = reduce(states.ready, { type: 'EXIT' });
  assert.equal(exited.phase, 'cancelled');
  assert.equal(appStatusFor(exited), 'CANCELLED');
});

test('FATAL from any running phase ends in error; account change is an error', () => {
  for (const phase of ['loading', 'ready', 'starting', 'capturing', 'finalizing']) {
    const next = reduce(states[phase], { type: 'FATAL', error: ACCOUNT_MISMATCH_ERROR });
    assert.equal(next.phase, 'error', phase);
    assert.equal(next.code, 'ACCOUNT_MISMATCH');
    assert.equal(appStatusFor(next), 'ERROR');
  }
});

test('invalid transitions are ignored (same state object)', () => {
  const allowed = {
    loading: ['LOGIN_REQUIRED', 'LOADED', 'LOAD_FAILED', 'FATAL'],
    needsLogin: ['RETRY'],
    ready: ['START', 'EXIT', 'CANCEL_DONE', 'FATAL'],
    starting: ['SESSION_CREATED', 'START_FAILED', 'FATAL'],
    capturing: ['FINALIZING', 'RESULT', 'CANCEL_DONE', 'FATAL'],
    finalizing: ['FINALIZING', 'RESULT', 'CANCEL_DONE', 'FATAL'],
    result: [], cancelled: [], error: ['RETRY'],
  };
  const actions = {
    LOGIN_REQUIRED: { type: 'LOGIN_REQUIRED' }, LOADED: { type: 'LOADED', kyc: kyc('NOT_VERIFIED') },
    LOAD_FAILED: { type: 'LOAD_FAILED', error: fail() }, RETRY: { type: 'RETRY' }, START: { type: 'START' },
    SESSION_CREATED: { type: 'SESSION_CREATED', session }, START_FAILED: { type: 'START_FAILED', error: fail() },
    FINALIZING: { type: 'FINALIZING' }, RESULT: { type: 'RESULT', kyc: kyc('VERIFIED') },
    CANCEL_DONE: { type: 'CANCEL_DONE' }, EXIT: { type: 'EXIT' }, FATAL: { type: 'FATAL', error: fail() },
  };
  for (const phase of ALL) {
    for (const [name, action] of Object.entries(actions)) {
      if (allowed[phase].includes(name)) continue;
      assert.equal(reduce(states[phase], action), states[phase], `${phase} ignores ${name}`);
    }
  }
  // terminal states never leave (error only via RETRY on a load failure)
  for (const phase of ['result', 'cancelled']) for (const action of Object.values(actions)) assert.equal(reduce(states[phase], action), states[phase]);
  assert.equal(reduce(states.error, actions.START), states.error);
  // a late success cannot revive a cancelled/failed flow
  assert.equal(run(states.capturing, { type: 'CANCEL_DONE' }, { type: 'RESULT', kyc: kyc('VERIFIED') }).phase, 'cancelled');
  assert.equal(run(states.capturing, { type: 'FATAL', error: fail() }, { type: 'RESULT', kyc: kyc('VERIFIED') }).phase, 'error');
});

test('appStatusFor: null while running, status when finished (no session NOT_VERIFIED result stays PENDING)', () => {
  for (const phase of ['loading', 'needsLogin', 'ready', 'starting', 'capturing', 'finalizing']) assert.equal(appStatusFor(states[phase]), null, phase);
  for (const status of ['VERIFIED', 'REJECTED', 'REVIEW_REQUIRED', 'EXPIRED', 'PENDING']) assert.equal(appStatusFor({ phase: 'result', kyc: kyc(status) }), status);
  assert.equal(appStatusFor({ phase: 'result', kyc: kyc('NOT_VERIFIED') }), 'PENDING');
  assert.equal(appStatusFor(states.cancelled), 'CANCELLED');
  assert.equal(appStatusFor(states.error), 'ERROR');
});

test('resolveReturn: app builds the scheme URL only for a valid state; web uses returnTo', () => {
  const app = { client: 'app', state: STATE };
  const done = { phase: 'result', kyc: kyc('REJECTED') };
  assert.deepEqual({ ...resolveReturn(app, done) }, { href: `homespace://kyc/result?state=${STATE}&status=REJECTED`, external: true, autoMs: 1500 });
  assert.equal(resolveReturn(app, states.cancelled).href, `homespace://kyc/result?state=${STATE}&status=CANCELLED`);
  assert.equal(resolveReturn(app, states.error).href, `homespace://kyc/result?state=${STATE}&status=ERROR`);
  assert.equal(resolveReturn(app, states.ready), null, 'no redirect while the flow is running');
  assert.equal(resolveReturn(app, states.capturing), null);
  assert.equal(resolveReturn({ client: 'app', state: null }, done), null, 'invalid state never redirects');
  const web = { client: 'web', returnTo: '/settings/account-security' };
  assert.deepEqual({ ...resolveReturn(web, { phase: 'result', kyc: kyc('VERIFIED') }) }, { href: '/settings/account-security', external: false, autoMs: 3000 });
  assert.equal(resolveReturn(web, done).autoMs, null);
  assert.equal(resolveReturn(web, states.cancelled).autoMs, null);
  assert.equal(resolveReturn(web, states.error).href, '/settings/account-security');
  assert.equal(resolveReturn(web, states.loading), null);
});

test('classifyKycError: 401/403/2501 are fatal; other start errors are recoverable; messages keep server text', () => {
  assert.equal(classifyKycError({ status: 401 }, 'load').code, 'UNAUTHORIZED');
  const forbidden = classifyKycError({ status: 403, message: 'ignored' }, 'start');
  assert.equal(forbidden.code, 'FORBIDDEN');
  assert.equal(forbidden.fatal, true);
  assert.match(forbidden.message, /không có quyền|không khớp/);
  assert.equal(classifyKycError({ status: 500, code: 2501 }, 'start').code, 'NOT_CONFIGURED');
  assert.match(classifyKycError({ code: 2501 }, 'start').message, /VNPT eKYC chưa được cấu hình/);
  assert.deepEqual({ ...classifyKycError({ status: 500, message: 'Lỗi máy chủ' }, 'start') }, { code: 'START_FAILED', fatal: false, message: 'Lỗi máy chủ' });
  assert.equal(classifyKycError({}, 'start').message, 'Không thể mở phiên KYC. Vui lòng thử lại sau.');
  assert.equal(classifyKycError({ message: '   ' }, 'start').message, 'Không thể mở phiên KYC. Vui lòng thử lại sau.');
  assert.deepEqual({ ...classifyKycError({}, 'load') }, { code: 'LOAD_FAILED', fatal: true, message: 'Không tải được trạng thái KYC.' });
  assert.equal(classifyKycError({ message: 42 }, 'load').message, 'Không tải được trạng thái KYC.');
});
