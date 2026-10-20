'use strict';
/* Oct 20 2026 food audit (journey B, simulated iPhone with every server blocked): Log meal > Snap > choose a photo said
   "Photo recognition isn't switched on yet, so type what it is." The feature IS on; the phone just could not reach it.
   That answer was also kept for 10 minutes, so photo checks stayed "off" after the connection came back.
   Now: no connection -> an honest "can't reach" line, asked again next photo; a time out -> "took too long";
   an expired sign-in -> its own line; a session refresh that never answers no longer spins forever. */
const test = require('node:test'), assert = require('node:assert'), path = require('path');
const ROOT = path.join(__dirname, '..');
const load = () => { delete require.cache[require.resolve(path.join(ROOT, 'food-photo-ai.js'))]; return require(path.join(ROOT, 'food-photo-ai.js')); };
function withFetch(fn, impl, extra) {
    const old = globalThis.fetch, oldCfg = globalThis.LOWI_CFG, oldX = globalThis.LOWI_CLOUD_X;
    globalThis.fetch = impl; globalThis.LOWI_CFG = { url: 'https://example.supabase.co', key: 'sb_publishable_test' };
    if (extra && extra.cloud) globalThis.LOWI_CLOUD_X = extra.cloud;
    return Promise.resolve().then(fn).finally(() => { globalThis.fetch = old; globalThis.LOWI_CFG = oldCfg; globalThis.LOWI_CLOUD_X = oldX; });
}
const json = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

test('every language has the honest lines', () => {
    const A = load();
    for (const l of ['en', 'de', 'es']) for (const k of ['net', 'slow', 'sign_in', 'off', 'fail']) assert.ok(A.strings[l][k] && A.strings[l][k].length > 20, l + '.' + k);
    assert.doesNotMatch(A.strings.en.net, /switched on/, 'no connection is not "not switched on"');
});

test('a network miss is remembered as "net" and asked again on the next photo; "not configured" stays "off"', async () => {
    const A = load();
    let calls = 0;
    await withFetch(async () => {
        A._reset();
        assert.strictEqual(await A.available(), false);
        assert.strictEqual(A._why(), 'net');
        assert.strictEqual(await A.available(), true, 'asked again, not cached for 10 minutes');
        assert.strictEqual(calls, 2);
    }, () => { calls++; return calls === 1 ? Promise.reject(new TypeError('Load failed')) : json(200, { ok: true, configured: true }); });
    await withFetch(async () => { A._reset(); assert.strictEqual(await A.available(), false); assert.strictEqual(A._why(), 'off'); }, () => json(200, { ok: true, configured: false }));
});

test('analyse: a failed request is "net", an aborted (timed out) one is "slow"', async () => {
    const A = load();
    await withFetch(async () => {
        await assert.rejects(A.analyse('data:image/jpeg;base64,QUJD', { token: 't' }), e => e.code === 'net');
    }, () => Promise.reject(new TypeError('Load failed')));
    await withFetch(async () => {
        await assert.rejects(A.analyse('data:image/jpeg;base64,QUJD', { token: 't', timeout: 30 }), e => e.code === 'slow');
    }, (u, o) => new Promise((ok, no) => o.signal.addEventListener('abort', () => no(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
});

test('a session that never answers does not hold the photo check forever', async () => {
    const A = load();
    const never = { client: () => new Promise(() => { }) };
    let sentAuth = null;
    const t0 = Date.now();
    await withFetch(async () => {
        await assert.rejects(A.analyse('data:image/jpeg;base64,QUJD', { timeout: 20000 }), e => e.code === 'failed');
    }, (u, o) => { sentAuth = o.headers.Authorization; return json(502, { error: 'ai_failed' }); }, { cloud: never });
    assert.ok(Date.now() - t0 < 12000, 'gave up waiting for the token');
    assert.strictEqual(sentAuth, 'Bearer sb_publishable_test', 'fell back to the public key; the server then answers sign_in or works');
});

test('the photo sheet says the honest line for each failure', () => {
    const s = require('fs').readFileSync(path.join(ROOT, 'food-photo-ai.js'), 'utf8');
    const m = s.slice(s.indexOf('function mount('));
    assert.match(m, /why\(\) === 'net'/, 'the probe reason picks the line');
    assert.match(m, /\['limit', 'busy', 'off', 'net', 'slow', 'sign_in'\]/, 'each error code has its own line');
});
