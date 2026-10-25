// Oct 25 2026 (Emmanuel: "Didn't we say that when you send a picture of your food into the community, that also actually analyzes it
// with the AI, gives you all the estimates, creates everything for you, you don't even have to type anything."): a photo picked in
// the Chat/Circles composer is read by the Snap food AI; food posts as a meal post with its details, anything else stays a plain
// photo with one honest line. Task 14eeb544.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
global.LowiMealSnap = require('../meal-photo.js');
global.LowiFoodKnowledge = require('../food-knowledge-core.js');
global.LowiMealResult = require('../meal-result.js');
global.LowiMealDetailCore = require('../meal-detail-core.js');
const FA_REAL = require('../food-photo-ai.js');
const K = require('../community-chat-core.js');
const MD = global.LowiMealDetailCore;
const chat = R('community-chat.js'), idx = R('index.html'), sw = R('sw.js');
const exists = fs.existsSync(path.join(__dirname, '..', 'community-photo-meal.js'));
const CM = exists ? require('../community-photo-meal.js') : null;

const bowl = FA_REAL.normalize({ is_food: true, confidence: 'high', note: 'Plenty of protein and fat.', dishes: [
    { name: 'Salmon', portion: '150 g', grams: 150, kcal: 310, protein_g: 31, carbs_g: 0, sugar_g: 0, fiber_g: 0, fat_g: 20 },
    { name: 'Avocado', portion: '1/2', grams: 70, kcal: 112, protein_g: 1.4, carbs_g: 6, sugar_g: 0.5, fiber_g: 4.7, fat_g: 10 },
    { name: 'Cucumber', portion: '80 g', grams: 80, kcal: 12, protein_g: 0.5, carbs_g: 2.9, sugar_g: 1.3, fiber_g: 0.4, fat_g: 0.1 }] });
bowl.total = FA_REAL.totals(bowl.dishes);
const toast = FA_REAL.normalize({ is_food: true, confidence: 'medium', dishes: [
    { name: 'White toast', portion: '3 slices', grams: 90, kcal: 240, protein_g: 7, carbs_g: 45, sugar_g: 4, fiber_g: 2, fat_g: 3 },
    { name: 'Strawberry jam', portion: '3 tbsp', grams: 60, kcal: 150, protein_g: 0, carbs_g: 38, sugar_g: 36, fiber_g: 0.5, fat_g: 0 }] });
toast.total = FA_REAL.totals(toast.dishes);
const selfie = FA_REAL.normalize({ is_food: false, dishes: [] });
selfie.total = FA_REAL.totals([]);

test('the module exists and is loaded after the meal details, cached offline', () => {
    assert.ok(exists, 'community-photo-meal.js');
    const a = idx.indexOf('meal-detail-core.js?v='), b = idx.indexOf('community-photo-meal.js?v=');
    assert.ok(a > 0 && b > a, 'script tag after meal-detail-core.js');
    assert.ok(idx.indexOf('food-photo-ai.js?v=') < b && idx.indexOf('meal-result.js?v=') < b);
    assert.match(sw, /STATIC\.push\("community-photo-meal\.js"\)/);
});

test('a food read becomes a meal post: name, spike level, foods and numbers (the meal-detail shape)', () => {
    const m = CM.fromRead(bowl, 'en');
    assert.ok(m && m.name, 'a meal');
    assert.match(m.name, /Salmon/);
    assert.equal(m.lvl, 'low');
    assert.ok(m.detail, 'details for the spike label');
    assert.equal(m.detail.v, 1);
    assert.deepEqual(m.detail.items.map(x => x.name), ['Salmon', 'Avocado', 'Cucumber']);
    assert.equal(m.detail.items[0].portion, '150 g');
    assert.ok(m.detail.total && m.detail.total.kcal > 400 && m.detail.total.protein > 30, 'estimated totals travel');
    assert.ok(JSON.stringify(m.detail).length <= 4096, 'fits the messages.meal 4 KB check');
    assert.deepEqual(MD.clean(m.detail), m.detail, 'already clean');
    const uid = 'u1234567';
    const body = K.mealBody('https://abcdefghij.supabase.co/storage/v1/object/public/media/' + uid + '/meal-p1234abcd.jpg', m.name, m.lvl, 'Lunch!');
    const back = K.meal(body, uid);
    assert.ok(back, 'a valid meal post body');
    assert.equal(back.lvl, 'low'); assert.equal(back.caption, 'Lunch!'); assert.match(back.name, /Salmon/);
});

test('sugary toast reads as a likely spike; a low-confidence read is marked low', () => {
    const m = CM.fromRead(toast, 'de');
    assert.equal(m.lvl, 'high');
    const lowc = Object.assign({}, bowl, { confidence: 'low' });
    assert.equal(CM.fromRead(lowc, 'en').detail.low, true);
});

test('the AI verdict can only make it stricter: a "fine" block on toast stays a likely spike', () => {
    const t2 = Object.assign({}, toast, { verdictBlock: { verdict: 'JA', reason: 'fine' } });
    assert.equal(CM.fromRead(t2, 'en').lvl, 'high');
});

test('no food, nothing to post as a meal', () => {
    assert.equal(CM.fromRead(selfie, 'en'), null);
    assert.equal(CM.fromRead(null, 'en'), null);
    assert.equal(CM.fromRead({ isFood: true, dishes: [{ name: '' }] }, 'en'), null);
});

function fakeAI(behave) {
    const calls = [];
    return { calls, api: Object.assign({}, FA_REAL, {
        available: async () => true, _why: () => '',
        prep: async () => 'data:image/jpeg;base64,AAAA',
        analyse: async (data, o) => { calls.push({ data, o }); const b = behave(); if (b instanceof Error) throw b; return b; }
    }) };
}
const err = c => { const e = new Error(c); e.code = c; return e; };
const blob = { size: 10, type: 'image/jpeg' };
function reset() { CM._jobs.clear(); try { global.localStorage && global.localStorage.clear(); } catch (e) {} }

test('picked photo: read once, finished read is a meal; Send gets the same answer without a second AI call', async () => {
    reset();
    const f = fakeAI(() => bowl); global.LowiFoodAI = f.api;
    let changed = null;
    assert.equal(CM.start('p1', blob, { lang: 'en', onChange: s => { changed = s; } }).phase, 'look');
    CM.start('p1', blob, { lang: 'en' });
    const st = await CM.settle('p1', blob, { lang: 'en' });
    assert.equal(st.phase, 'meal'); assert.equal(st.meal.lvl, 'low');
    assert.equal(changed && changed.phase, 'meal');
    assert.equal(f.calls.length, 1, 'one AI call per photo');
    assert.equal(f.calls[0].o.lang, 'en');
    const bar = CM.bar(st, 'en');
    assert.match(bar[0], /Salmon/); assert.match(bar[0], /Low spike/); assert.match(bar[1], /Estimate/);
    assert.equal(CM.postedNote(st, 'en'), '', 'nothing extra after a meal post');
});

test('Send on a photo that was never read starts the read and waits for it', async () => {
    reset();
    const f = fakeAI(() => toast); global.LowiFoodAI = f.api;
    const st = await CM.settle('p2', blob, { lang: 'es' });
    assert.equal(st.phase, 'meal'); assert.equal(st.meal.lvl, 'high'); assert.equal(f.calls.length, 1);
});

test('no food: plain photo, quietly', async () => {
    reset();
    global.LowiFoodAI = fakeAI(() => selfie).api;
    const st = await CM.settle('p3', blob, { lang: 'en' });
    assert.deepEqual(st, { phase: 'plain', code: 'notFood' });
    assert.equal(CM.postedNote(st, 'en'), '');
    assert.match(CM.bar(st, 'de').join(' '), /normales Foto/);
});

for (const [c, want, re] of [['limit', 'limit', /No photo checks left today/], ['net', 'net', /No connection/], ['slow', 'slow', /too long/], ['sign_in', 'sign_in', /Sign in/], ['off', 'off', /switched off/], ['busy', 'failed', /didn’t work/], ['failed', 'failed', /didn’t work/]]) {
    test('AI says ' + c + ': the photo still goes, as a normal photo, with one line saying why', async () => {
        reset();
        global.LowiFoodAI = fakeAI(() => err(c)).api;
        const st = await CM.settle('e-' + c, blob, { lang: 'en' });
        assert.equal(st.phase, 'plain'); assert.equal(st.code, want);
        const n = CM.postedNote(st, 'en');
        assert.match(n, /^Posted as a normal photo\./); assert.match(n, re);
    });
}

test('no photo checks left today (known on the phone): no AI call is spent', async () => {
    reset();
    const f = fakeAI(() => bowl); global.LowiFoodAI = f.api;
    const left = global.LowiMealSnap.left;
    global.LowiMealSnap.left = () => ({ left: 0, limit: 3 });
    try {
        const st = await CM.settle('q0', blob, { lang: 'de' });
        assert.deepEqual(st, { phase: 'plain', code: 'limit' });
        assert.equal(f.calls.length, 0);
        assert.match(CM.postedNote(st, 'de'), /Heute keine Foto-Checks mehr/);
    } finally { global.LowiMealSnap.left = left; }
});

test('offline: no AI call; once back online, Send tries the read again', async () => {
    reset();
    const f = fakeAI(() => bowl); global.LowiFoodAI = f.api;
    const nav = Object.getOwnPropertyDescriptor(global, 'navigator');
    Object.defineProperty(global, 'navigator', { value: { onLine: false }, configurable: true, writable: true });
    try {
        CM.start('o1', blob, { lang: 'en' });
        assert.equal((await CM.settle('o1', blob, { lang: 'en' })).code, 'net');
        assert.equal(f.calls.length, 0);
        global.navigator.onLine = true;
        const st = await CM.settle('o1', blob, { lang: 'en' });
        assert.equal(st.phase, 'meal'); assert.equal(f.calls.length, 1);
    } finally { if (nav) Object.defineProperty(global, 'navigator', nav); else delete global.navigator; }
});

test('a read that never answers never holds the post: after the wait it goes as a normal photo', async () => {
    reset();
    global.LowiFoodAI = Object.assign({}, fakeAI(() => bowl).api, { analyse: () => new Promise(() => {}) });
    const st = await CM.settle('s1', blob, { lang: 'en', ms: 60 });
    assert.deepEqual(st, { phase: 'plain', code: 'slow' });
    assert.ok(CM.WAIT_MS >= FA_REAL.TRY_MS, 'the guard is never shorter than one AI try');
});

test('photo check switched off or unreachable: plain photo, says so', async () => {
    reset();
    global.LowiFoodAI = Object.assign({}, fakeAI(() => bowl).api, { available: async () => false, _why: () => 'off' });
    assert.equal((await CM.settle('f1', blob, { lang: 'en' })).code, 'off');
    reset();
    global.LowiFoodAI = null;
    assert.equal((await CM.settle('f2', blob, { lang: 'en' })).code, 'off');
});

test('every line exists in English, German and Spanish; estimates say so; no blood-sugar promises', () => {
    const keys = Object.keys(CM.STR.en);
    for (const l of ['de', 'es']) assert.deepEqual(Object.keys(CM.STR[l]).sort(), keys.slice().sort(), l);
    const all = JSON.stringify(CM.STR);
    assert.doesNotMatch(all, /steady|stay stable|ruhig bleiben|stabil|estable|guaranteed|garantiert/i);
    assert.match(CM.STR.en.est, /Estimate/); assert.match(CM.STR.de.est, /Schätzung/); assert.match(CM.STR.es.est, /Estimación/);
    for (const l of ['en', 'de', 'es']) for (const lv of ['low', 'mid', 'high']) assert.ok(CM.label(lv, l), l + lv);
});

test('composer wiring: pick starts the read, Send posts a meal with details or the plain photo, bots are left alone', () => {
    assert.match(chat, /pendingPhoto=\{id:newPhotoId\(\)[^}]*\};notice='';aiStart\(\);/, 'takePhoto starts the read');
    assert.match(chat, /function aiStart\(\)\{const pin=pendingPhoto,CM=W\.LowiChatMeal;if\(!pin\|\|!CM\|\|\(sel&&botOf\(sel\)\)\)return;/);
    const send = chat.slice(chat.indexOf('async function sendPhoto'), chat.indexOf('/* ---- Oct 16 (E-man on iPad): shared media upload'));
    assert.match(send, /const CM=!bot&&W\.LowiChatMeal/);
    assert.match(send, /await CM\.settle\(pin\.id,pin\.blob/);
    assert.match(send, /mediaUpload\(scope\+'\/meal-'\+pin\.id\+'\.jpg'/);
    assert.match(send, /K\.mealBody\(pin\.msrc,ml\.name,ml\.lvl,cap\)/);
    assert.match(send, /store\.submitPhoto\(name,body,pin\.id,ds\.draft\.reply\|\|null,md\)/);
    assert.match(send, /if\(!body\)\{const path=scope\+'\/chat-'\+pin\.id\+'\.jpg'/, 'plain photo stays the fallback');
    assert.match(send, /K\.photoBody\(pin\.src,cap\)/);
    assert.match(send, /CM\.postedNote\(ai,lc\)/);
    assert.match(send, /catch\(e\)\{photoBusy=false;notice=tr\('photoFailed'\);\}/, 'a failed upload keeps the photo for another try');
    assert.match(chat, /<span class="cs-ai" role="status" aria-live="polite" hidden><\/span>/);
});

test('the meal details sheet makes no blood-sugar promise on a low-spike meal (Emmanuel: no \'should stay steady\')', () => {
    for (const l of ['en', 'de', 'es']) {
        const w = MD.t('whyLow', l);
        assert.ok(w, l);
        assert.doesNotMatch(w, /steady|ruhig bleiben|estable/i, l);
        assert.match(w, /\{net\}|estimate|gesch\u00e4tzt|estimado/i, l);
    }
});
