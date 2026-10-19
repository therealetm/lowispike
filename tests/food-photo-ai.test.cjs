'use strict';
/* Oct 19 2026: Scan > Snap food took a photo and nothing looked at it (Emmanuel: "no AI analyses it").
   Now: photo -> Supabase Edge Function food-photo -> Gemini (free tier) -> dishes with portion, kcal, protein, carbs,
   sugar, fiber, fat -> shown in the photo sheet and saved by Log as meal. The Gemini key lives only in the function's
   Supabase secret. Until the function is deployed, the sheet keeps the plain "What is it?" form plus one note. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const has = f => fs.existsSync(path.join(ROOT, f));
const load = () => { delete require.cache[require.resolve(path.join(ROOT, 'food-photo-ai.js'))]; return require(path.join(ROOT, 'food-photo-ai.js')); };

test('the food photo module and the server function exist', () => {
    assert.ok(has('food-photo-ai.js'), 'food-photo-ai.js exists');
    assert.ok(has('supabase/functions/food-photo/index.ts'), 'supabase/functions/food-photo/index.ts exists');
});

test('normalize keeps named dishes, clamps wild numbers, maps the *_g fields to the meal log keys', () => {
    const A = load();
    const r = A.normalize({ is_food: true, confidence: 'high', note: 'ok', dishes: [
        { name: '  Spaghetti   bolognese ', portion: '1 plate', grams: 350, kcal: 612.4, protein_g: 28.26, carbs_g: 80, sugar_g: 9, fiber_g: 7, fat_g: 18 },
        { name: '', kcal: 100 },
        { name: 'Cola', portion: '1 can', grams: 330, kcal: 99999, protein_g: -5, carbs_g: 'x', sugar_g: '35', fiber_g: null, fat_g: 0 }
    ] });
    assert.strictEqual(r.dishes.length, 2);
    assert.deepStrictEqual(r.dishes[0], { name: 'Spaghetti bolognese', portion: '1 plate', grams: 350, kcal: 612, protein: 28.3, carbs: 80, sugar: 9, fiber: 7, fat: 18 });
    assert.strictEqual(r.dishes[1].kcal, 3000, 'kcal capped');
    assert.strictEqual(r.dishes[1].protein, 0, 'negative -> 0');
    assert.strictEqual(r.dishes[1].carbs, 0, 'text -> 0');
    assert.strictEqual(r.dishes[1].sugar, 35, 'numeric string read');
    assert.strictEqual(r.isFood, true);
    assert.strictEqual(A.normalize({ is_food: false, dishes: [] }).isFood, false);
    assert.strictEqual(A.normalize(null).dishes.length, 0);
    assert.strictEqual(A.normalize({ dishes: Array.from({ length: 12 }, (_, i) => ({ name: 'd' + i })) }).dishes.length, 8, 'at most 8 dishes');
});

test('totals and the meal name', () => {
    const A = load();
    const d = [{ name: 'Rice', kcal: 200, protein: 4, carbs: 44, sugar: 0, fiber: 1, fat: 0.5 }, { name: 'Chicken', kcal: 165.6, protein: 31, carbs: 0, sugar: 0, fiber: 0, fat: 3.6 }, { name: 'Salad', kcal: 20, protein: 1, carbs: 3, sugar: 2, fiber: 2, fat: 0 }];
    assert.deepStrictEqual(A.totals(d), { kcal: 386, protein: 36, carbs: 47, sugar: 2, fiber: 3, fat: 4.1 });
    assert.strictEqual(A.title(d, 'en'), 'Rice, Chicken and Salad');
    assert.strictEqual(A.title(d, 'de'), 'Rice, Chicken und Salad');
    assert.strictEqual(A.title(d.slice(0, 1), 'es'), 'Rice');
    assert.deepStrictEqual(A.KEYS.slice().sort(), ['carbs', 'fat', 'fiber', 'kcal', 'protein', 'sugar'], 'same keys as spirit-core macros()');
});

function withFetch(fn, impl) {
    const old = globalThis.fetch, oldCfg = globalThis.LOWI_CFG;
    globalThis.fetch = impl; globalThis.LOWI_CFG = { url: 'https://example.supabase.co', key: 'sb_publishable_test' };
    return Promise.resolve().then(fn).finally(() => { globalThis.fetch = old; globalThis.LOWI_CFG = oldCfg; });
}
const json = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

test('available() is false while the function is not deployed or has no key, true once configured', async () => {
    const A = load();
    assert.strictEqual(A.endpoint(), '', 'no config -> no endpoint');
    await withFetch(async () => {
        A._reset(); assert.strictEqual(A.endpoint(), 'https://example.supabase.co/functions/v1/food-photo');
        assert.strictEqual(await A.available(), false);
    }, () => json(404, { code: 'NOT_FOUND' }));
    await withFetch(async () => { A._reset(); assert.strictEqual(await A.available(), false); }, () => json(200, { ok: true, configured: false }));
    await withFetch(async () => { A._reset(); assert.strictEqual(await A.available(), false); }, () => Promise.reject(new Error('offline')));
    await withFetch(async () => { A._reset(); assert.strictEqual(await A.available(), true); }, () => json(200, { ok: true, configured: true }));
});

test('analyse() sends the photo with the user token (never a Gemini key) and returns dishes + total', async () => {
    const A = load();
    let sent = null;
    await withFetch(async () => {
        const r = await A.analyse('data:image/jpeg;base64,QUJD', { token: 'user-jwt', lang: 'de' });
        assert.strictEqual(r.dishes[0].name, 'Apfel');
        assert.strictEqual(r.total.kcal, 95);
        assert.strictEqual(r.total.fiber, 4.4);
    }, (url, opt) => { sent = { url, opt }; return json(200, { is_food: true, confidence: 'high', note: '', model: 'gemini-x', dishes: [{ name: 'Apfel', portion: '1 Apfel', grams: 180, kcal: 95, protein_g: 0.5, carbs_g: 25, sugar_g: 19, fiber_g: 4.4, fat_g: 0.3 }] }); });
    assert.strictEqual(sent.url, 'https://example.supabase.co/functions/v1/food-photo');
    assert.strictEqual(sent.opt.method, 'POST');
    assert.strictEqual(sent.opt.headers.Authorization, 'Bearer user-jwt');
    const body = JSON.parse(sent.opt.body);
    assert.deepStrictEqual(body, { image: 'QUJD', mime: 'image/jpeg', lang: 'de', tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '' } /* Oct 19: tz for the user's own day (3 a day) */);
    for (const [status, err, code] of [[503, { error: 'not_configured' }, 'off'], [401, { error: 'sign_in' }, 'sign_in'], [429, { error: 'limit' }, 'limit'], [429, { error: 'busy' }, 'busy'], [502, { error: 'ai_failed' }, 'failed']]) {
        await withFetch(async () => {
            await assert.rejects(A.analyse('data:image/jpeg;base64,QUJD', { token: 't' }), e => e.code === code);
        }, () => json(status, err));
    }
});

test('the photo sheet hands the photo to the AI, and still has the plain name form', () => {
    const s = src('spirit.js');
    const sheet = s.slice(s.indexOf('function photoSheet()'), s.indexOf('function photoAsFile()'));
    assert.match(sheet, /class="sp-ai"/, 'photo sheet has the AI box');
    assert.match(sheet, /LowiFoodAI\.mount\(/, 'photo sheet calls LowiFoodAI.mount');
    assert.match(sheet, /name="title" required/, 'the typed name still works without AI');
    assert.match(src('index.html'), /<script src="food-photo-ai\.js\?v=[^"]+"><\/script>/, 'index.html loads food-photo-ai.js');
    assert.match(src('sw.js'), /"food-photo-ai\.js"/, 'offline cache has food-photo-ai.js');
});

test('no AI secret or direct Gemini call in anything the browser loads', () => {
    const client = fs.readdirSync(ROOT).filter(f => /\.(js|html|css|json)$/.test(f));
    for (const f of client) {
        const t = src(f);
        assert.doesNotMatch(t, /AIza[0-9A-Za-z_-]{20,}/, f + ' has no Google API key');
        assert.doesNotMatch(t, /generativelanguage\.googleapis\.com/, f + ' does not call Gemini from the browser');
        assert.doesNotMatch(t, /GEMINI_API_KEY\s*[:=]\s*['"]/, f + ' has no Gemini key value');
    }
    const fn = src('supabase/functions/food-photo/index.ts');
    assert.match(fn, /Deno\.env\.get\("GEMINI_API_KEY"\)/, 'key comes from the Supabase secret');
    assert.match(fn, /\/auth\/v1\/user/, 'needs a signed-in LOWiSPIKE session');
    assert.match(fn, /therealetm\\\.github\\\.io/, 'only the app origin');
    assert.match(fn, /MAX_B64/, 'image size cap');
    assert.match(fn, /configured: !!key/, 'GET tells the app whether it is switched on');
    assert.doesNotMatch(fn, /console\.(log|error)\([^)]*(image|key)\b\s*\)/, 'never logs the image or the key');
});
