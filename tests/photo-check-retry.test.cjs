'use strict';
/* Oct 22 2026: a clear iPhone plate photo got "The photo check took too long. Type what it is, or close this and try again."
   Cause: the phone's 30 s clock also ran during the sign-in wait (up to 8 s), while the server may take up to 26 s (Gemini
   answered in 6-21 s when measured, sometimes 504 ai_slow), so the phone gave up just before the answer. Now: token first,
   35 s for the request alone, one automatic retry, "Misty is looking…", a Try again button that reuses the same photo,
   the original photo downscaled to 1024 px JPEG, and Log as meal in the brand blue (not Move's mint). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const load = () => { delete require.cache[require.resolve(path.join(ROOT, 'food-photo-ai.js'))]; return require(path.join(ROOT, 'food-photo-ai.js')); };
const json = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
const DISH = { dishes: [{ name: 'Roasted sweet potato', kcal: 160, protein_g: 3, carbs_g: 37 }], confidence: 'high' };

function withEnv(fn, fetchImpl, extra) {
    const keep = { fetch: globalThis.fetch, cfg: globalThis.LOWI_CFG, cx: globalThis.LOWI_CLOUD_X, doc: globalThis.document };
    globalThis.fetch = fetchImpl; globalThis.LOWI_CFG = { url: 'https://example.supabase.co', key: 'sb_publishable_test' };
    Object.assign(globalThis, extra || {});
    return Promise.resolve().then(fn).finally(() => {
        globalThis.fetch = keep.fetch; globalThis.LOWI_CFG = keep.cfg; globalThis.LOWI_CLOUD_X = keep.cx;
        if (keep.doc === undefined) delete globalThis.document; else globalThis.document = keep.doc;
    });
}

test('a slow sign-in no longer eats the request time: the clock starts after the token', async () => {
    const A = load();
    const cx = { client: async () => ({ auth: { getSession: () => new Promise(ok => setTimeout(() => ok({ data: { session: { access_token: 'late-jwt' } } }), 120)) } }) };
    let auth = '';
    await withEnv(async () => {
        const r = await A.analyse('data:image/jpeg;base64,QUJD', { timeout: 60 });
        assert.strictEqual(r.dishes[0].name, 'Roasted sweet potato');
        assert.strictEqual(auth, 'Bearer late-jwt');
    }, (u, o) => { if (o.signal && o.signal.aborted) return Promise.reject(new Error('aborted')); auth = o.headers.Authorization; return json(200, DISH); }, { LOWI_CLOUD_X: cx });
});

test('timeouts fit the server: 35 s per try, the server answering 504 ai_slow counts as slow (retried), 1024 px photos', async () => {
    const A = load();
    assert.ok(A.TRY_MS >= 32000 && A.TRY_MS <= 40000, 'one try waits past the server budget of 26 s, not forever');
    assert.strictEqual(A.AI_PX, 1024);
    await withEnv(async () => {
        await assert.rejects(A.analyse('data:image/jpeg;base64,QUJD', { token: 't' }), e => e.code === 'slow');
    }, () => json(504, { error: 'ai_slow' }));
    assert.strictEqual(await A.prep('data:image/jpeg;base64,QUJD', null), 'data:image/jpeg;base64,QUJD', 'no file: the sheet photo is sent');
});

function fakeBox() {
    const box = { className: '', innerHTML: '', isConnected: true, on: [], addEventListener(t, f) { this.on.push(f); }, querySelector: () => null };
    box.tap = (sel) => box.on.forEach(f => f({ target: { closest: s => (s === sel ? {} : null) }, preventDefault() { } }));
    return box;
}
function fakeForm() {
    return { kids: [], querySelector: () => null, appendChild(e) { this.kids.push(e); }, parentNode: null };
}

test('mount: "Misty is looking…", one automatic retry, then Try again with the same photo (no new photo needed)', { timeout: 15000 }, async () => {
    const A = load(); A._reset();
    let posts = 0, images = [];
    const box = fakeBox(), form = fakeForm();
    await withEnv(async () => {
        const p = A.mount(box, form, 'data:image/jpeg;base64,UExBVEU=', { lang: 'en' });
        assert.match(box.innerHTML, /Misty is looking/);
        assert.match(box.className, /fai-wait/);
        await p;
        assert.strictEqual(posts, 2, 'first try + one automatic retry');
        assert.match(box.innerHTML, /data-fai-retry/, 'Try again button');
        assert.match(box.innerHTML, /Try again/);
        assert.doesNotMatch(box.innerHTML, /close this/);
        box.tap('[data-fai-retry]');
        await new Promise(ok => setTimeout(ok, 300));
        assert.strictEqual(posts, 3);
        assert.match(box.className, /fai-done/, 'the result shows after Try again');
        assert.ok(images.every(i => i === 'UExBVEU='), 'every try sends the same photo');
    }, (u, o) => {
        if (!o || o.method === 'GET') return json(200, { ok: true, configured: true });
        posts++; images.push(JSON.parse(o.body).image);
        return posts <= 2 ? json(posts === 1 ? 504 : 502, { error: posts === 1 ? 'ai_slow' : 'ai_failed' }) : json(200, DISH);
    }, { document: { createElement: () => ({}) } });
});

test('mount: a daily limit or a switched-off check gets no pointless Try again', { timeout: 10000 }, async () => {
    const A = load(); A._reset();
    let posts = 0;
    const box = fakeBox();
    await withEnv(async () => {
        await A.mount(box, fakeForm(), 'data:image/jpeg;base64,QUJD', { lang: 'de' });
        assert.strictEqual(posts, 1, 'no automatic retry on the limit');
        assert.doesNotMatch(box.innerHTML, /data-fai-retry/);
    }, (u, o) => { if (!o || o.method === 'GET') return json(200, { ok: true, configured: true }); posts++; return json(429, { error: 'limit', left: 0, limit: 3 }); }, { document: { createElement: () => ({}) } });
});

test('strings: waiting and Try again in EN, DE and ES; the misses point at Try again instead of "close this"', () => {
    const S = load().strings;
    for (const l of ['en', 'de', 'es']) {
        for (const k of ['look', 'look2', 'again', 'retry']) assert.ok(S[l][k] && S[l][k].length > 3, l + '.' + k);
        assert.match(S[l].look, /Misty/);
        for (const k of ['slow', 'net', 'fail']) assert.ok(S[l][k].includes(S[l].retry), l + '.' + k + ' names the button');
        for (const k of ['slow', 'net']) assert.doesNotMatch(S[l][k], /close this|schließ das|cierra esto/);
    }
});

test('the photo sheet hands the original file (for the 1024 px copy) and Log as meal is the brand accent (brand blues), not mint', () => {
    assert.match(src('spirit.js'), /LowiFoodAI\.mount\([^;]*file: photoFile/);
    const css = src('scan-screens.css');
    const rule = css.slice(css.indexOf('#spMeal .sp-primary'), css.indexOf('}', css.indexOf('#spMeal .sp-primary')));
    assert.match(rule, /#1668dc, #0b5bbf/, 'the chat brand accent (item 43)');
    assert.doesNotMatch(rule, /mb-go|mint|52, 196, 158/);
    assert.match(css, /\.fai-retry \{[^}]*min-height: 44px/, 'Try again is a real tap target');
});
