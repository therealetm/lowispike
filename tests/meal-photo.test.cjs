'use strict';
/* Oct 19 2026 (Emmanuel: "people only get to unlock three meals and pictures a day, so that we don't reach that limit"):
   - 3 photo checks per person per day, Snap food and Community together, counted by the food-photo function (durable,
     in the user's auth app_metadata), handed back when Google fails. Typed meals stay unlimited.
   - A meal photo can be shared to Community with its AI meal name, estimated ingredients, nutrition and likely blood
     sugar response underneath, with no caption to type, reusing the read (no second AI request).
   - Optional mealtime reminders (off by default). The blood sugar line is an estimate, never "measured". */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fresh = f => { delete require.cache[require.resolve(path.join(ROOT, f))]; return require(path.join(ROOT, f)); };

function memStore() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; }
global.localStorage = memStore(); global.sessionStorage = memStore();

test('the server function allows 3 photo checks a day, durably, and hands a check back when the read fails', () => {
    const s = src('supabase/functions/food-photo/index.ts');
    assert.match(s, /DAY_MAX = 3\b/, 'three a day');
    assert.match(s, /ROLL_MAX = DAY_MAX \* 2/, 'never more than 6 in 24 hours (time zone hopping buys nothing)');
    assert.match(s, /app_metadata: \{ food_photo: \{ t:/, 'count stored in the user app_metadata');
    assert.match(s, /SUPABASE_SERVICE_ROLE_KEY/, 'written with the service role key the platform gives the function');
    assert.match(s, /error: "limit", limit: DAY_MAX, left: 0/, '429 limit answer carries left: 0');
    assert.match(s, /if \(r\.status !== 200\) \{\s*if \(durable\) await store\(u\.id, c\.recent\)/, 'a failed read is handed back');
    assert.match(s, /return out\(req, 200, \{ \.\.\.r\.body, limit: DAY_MAX, left \}\)/, 'a good read says how many are left');
    assert.doesNotMatch(s, /DAY_MAX = 60/, 'the old 60 a day is gone');
});

test('blood sugar estimate: levels from the meal nutrition, sugary drinks are a likely spike', () => {
    const M = fresh('meal-photo.js');
    const bs = (c, f, s, p, fat, n) => M.bloodSugar({ carbs: c, fiber: f, sugar: s, protein: p, fat }, [{ name: n }]).level;
    assert.strictEqual(bs(30, 10, 8, 8, 10, 'Mixed vegetable bowl'), 'low');
    assert.strictEqual(bs(47, 3, 2, 36, 4, 'Rice, chicken, salad'), 'mid');
    assert.strictEqual(bs(80, 7, 9, 28, 18, 'Spaghetti bolognese'), 'high');
    assert.strictEqual(bs(35, 0, 35, 0, 0, 'Cola'), 'high');
    assert.strictEqual(bs(10, 4, 3, 40, 20, 'Steak and broccoli'), 'low');
    assert.strictEqual(M.bloodSugar(null, null).level, 'low', 'no data never throws');
});

test('the meal card: name, ingredients, six nutrition values, likely blood sugar response, never "measured"', () => {
    const M = fresh('meal-photo.js');
    const m = M.meal({ name: 'Chicken stew', dishes: [{ name: 'Chicken', portion: '150 g', kcal: 250, protein: 40, carbs: 0, sugar: 0, fiber: 0, fat: 9 }, { name: 'Potatoes', portion: '200 g', kcal: 170, protein: 4, carbs: 38, sugar: 2, fiber: 4, fat: 0 }] });
    assert.deepStrictEqual(m.total, { kcal: 420, protein: 44, carbs: 38, sugar: 2, fiber: 4, fat: 9 });
    assert.strictEqual(m.name, 'Chicken stew');
    assert.ok(['low', 'mid', 'high'].includes(m.bs));
    for (const l of ['en', 'de', 'es']) {
        const h = M.cardHTML(m, { lang: l });
        assert.match(h, /Chicken stew/); assert.match(h, /Potatoes/); assert.match(h, /150 g/);
        assert.match(h, /420/); assert.match(h, /ms-bs ms-bs-(low|mid|high)/);
        assert.ok(h.includes(M.t('bsL', l)), l + ': says likely blood sugar response');
        assert.ok(h.includes(M.t('note', l)), l + ': says it is an estimate, not measured');
    }
    assert.match(M.t('note', 'en'), /not measured/);
    assert.match(M.t('note', 'de'), /nicht gemessen/);
    assert.match(M.t('note', 'es'), /no medido/);
    for (const l of ['en', 'de', 'es']) for (const k of Object.keys(M.strings.en)) assert.ok(M.strings[l][k], l + ' has ' + k);
});

test('a meal from someone else\'s post is rebuilt: html escaped, numbers clamped, blood sugar recomputed', () => {
    const M = fresh('meal-photo.js');
    const m = M.clean({ name: '<img src=x onerror=1>', items: [{ name: 'Cake', portion: '"1"' }], total: { kcal: 1e9, carbs: 90, sugar: 60 }, bs: 'low' });
    assert.strictEqual(m.total.kcal, 6000);
    assert.strictEqual(m.bs, 'high', 'the sender\'s bs is not trusted');
    const h = M.cardHTML(m);
    assert.ok(!h.includes('<img'), 'escaped');
    assert.strictEqual(M.clean(null), null);
    assert.strictEqual(M.cardHTML({}), '', 'nothing to show -> nothing');
});

test('a read is remembered by photo, so sharing it never asks the AI again', () => {
    const M = fresh('meal-photo.js');
    const photo = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
    assert.strictEqual(M.recall(photo), null);
    M.remember(photo, { dishes: [{ name: 'Pho', portion: '1 bowl', kcal: 450, carbs: 60, protein: 25 }] });
    assert.strictEqual(M.recall(photo).name, 'Pho');
    assert.strictEqual(M.recall(photo + 'B'), null, 'another photo is not the same read');
    M._reads.clear();
    assert.strictEqual(M.recall(photo).name, 'Pho', 'survives in sessionStorage');
});

test('allowance: today\'s checks left, as the server said; a new day forgets it', () => {
    const M = fresh('meal-photo.js');
    localStorage.clear();
    assert.strictEqual(M.left(), null);
    M.setLeft(2, 3);
    assert.deepStrictEqual(M.left(), { left: 2, limit: 3 });
    assert.strictEqual(M.leftText('en'), '2 of 3 photo checks left today');
    M.setLeft(0, 3);
    assert.match(M.leftText('en'), /No photo checks left today/);
    assert.match(M.leftText('en'), /Typing what you ate always works/);
    localStorage.setItem('lowi.mealsnap.left', JSON.stringify({ day: '2000-01-01', left: 0, limit: 3 }));
    assert.strictEqual(M.left(), null, 'yesterday\'s count does not block today');
});

test('LowiFoodAI sends the time zone, keeps the count, and says "limit" with the typed-meal way out', async () => {
    global.LowiMealSnap = fresh('meal-photo.js');
    localStorage.clear();
    const A = fresh('food-photo-ai.js');
    global.LOWI_CFG = { url: 'https://x.supabase.co', key: 'pk' };
    let sent = null;
    global.fetch = async (url, o) => { sent = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ is_food: true, dishes: [{ name: 'Rice', kcal: 200 }], left: 1, limit: 3 }) }; };
    await A.analyse('data:image/jpeg;base64,QUJD', { token: 't', lang: 'en' });
    assert.ok(typeof sent.tz === 'string', 'tz sent');
    assert.deepStrictEqual(global.LowiMealSnap.left(), { left: 1, limit: 3 });
    global.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: 'limit', limit: 3, left: 0 }) });
    await assert.rejects(A.analyse('data:image/jpeg;base64,QUJD', { token: 't' }), e => e.code === 'limit');
    assert.deepStrictEqual(global.LowiMealSnap.left(), { left: 0, limit: 3 });
    for (const l of ['en', 'de', 'es']) assert.ok(A.strings[l].limit && /3/.test(A.strings[l].limit), l + ' limit text');
    assert.match(A.strings.en.limit, /unlimited/);
    delete global.fetch; delete global.LOWI_CFG; delete global.LowiMealSnap;
});

test('mealtime reminders: off by default, within 90 min of the time, twice at most, never after that meal is logged or with 0 checks left', () => {
    const M = fresh('meal-photo.js');
    localStorage.clear();
    assert.strictEqual(M.getRem().on, false, 'off until the user turns it on');
    const set = M.setRem({ on: true });
    const at = (h, m) => new Date(2026, 9, 19, h, m);
    const log = () => ({ day: '2026-10-19', shown: {}, last: {}, meals: [] });
    assert.strictEqual(M.due(at(12, 40), set, log(), 2), 'l');
    assert.strictEqual(M.due(at(12, 10), set, log(), 2), '', 'not before 12:30');
    assert.strictEqual(M.due(at(14, 1), set, log(), 2), '', 'not after the 90 min window');
    assert.strictEqual(M.due(at(12, 40), set, log(), 0), '', 'no photo checks left -> no photo nudge');
    assert.strictEqual(M.due(at(12, 40), set, log(), null), 'l', 'unknown count still nudges');
    const g = log(); g.meals = [at(11, 45).getTime()];
    assert.strictEqual(M.due(at(12, 40), set, g, 2), '', 'lunch already logged');
    const g2 = log(); g2.shown.l = 1; g2.last.l = at(12, 35).getTime();
    assert.strictEqual(M.due(at(12, 50), set, g2, 2), '', '30 min apart');
    assert.strictEqual(M.due(at(13, 10), set, g2, 2), 'l', 'once more after Later');
    g2.shown.l = 2;
    assert.strictEqual(M.due(at(13, 50), set, g2, 2), '', 'at most twice');
    const off = M.setRem({ l: { on: false } });
    assert.strictEqual(M.due(at(12, 40), off, log(), 2), '', 'lunch switched off');
    assert.strictEqual(M.due(at(8, 30), off, log(), 2), 'b');
    assert.strictEqual(M.due(at(8, 30), M.setRem({ on: false }), log(), 2), '', 'all off');
    assert.match(M.rowHTML(), /data-ms="time"/);
});

test('the app wires it: Snap extras, composer meal card, meta.meal on the post, cards in the feed, Reminders row', () => {
    const A = src('food-photo-ai.js'), H = src('index.html'), S = src('sw.js');
    assert.match(A, /MS\.remember\(dataURL/, 'Snap remembers its read');
    assert.match(A, /MS\.snapExtras\(/, 'Snap shows left / share / reminder offer');
    assert.match(A, /q && q\.left === 0\) \{ say\('fai-err fai-limit'/, 'no request when the day is used up');
    assert.match(H, /setMeal:m =>/, 'TRIBE.setMeal for the share');
    assert.match(H, /meta:meal \? \{meal\} : null, cap:\(C\.cap\.trim\(\) \|\| \(meal \? meal\.name : ""\)\)/, 'post carries the meal, caption optional');
    assert.match(H, /known = M\.recall\(ph\);\s*if \(known\) \{ C\.meal = known/, 'composer reuses a read photo for free');
    assert.match(H, /LowiMealSnap\.cardHTML\(p\.meta\.meal\)/, 'card under the photo (list)');
    assert.match(H, /LowiMealSnap\.cardHTML\(p\.meta\.meal, \{compact:true/, 'card on the For You slide');
    assert.match(H, /LowiMealSnap \? LowiMealSnap\.rowHTML\(\)/, 'row in Reminders');
    assert.match(H, /<script src="meal-photo\.js\?v=[^"]+"><\/script>\s*<script src="food-photo-ai\.js/, 'loaded before food-photo-ai.js');
    assert.match(S, /"meal-photo\.js", "meal-photo\.css"/);
    assert.doesNotMatch(src('spirit.js'), /photoLimit|DAY_MAX/, 'typed meal logging is not limited');
});
