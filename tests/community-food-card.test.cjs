'use strict';
/* Oct 27 2026 (Emmanuel, in German, with a screenshot of the Community chat composer and a photo attached): "Wo bleibt eigentlich
   meine Analyse, wenn ich während oder bevor ich ein Bild in der Community reinposte? Der sollte doch das Essen erkennen, genauso wie
   wenn man bei Mahlzeit sein Essen analysiert ... alles ausgefüllt sein: Titel, was das ist und die ganzen Daten ... damit es dann
   praktisch genauso aussieht wie von dem Bot ... ohne dass man noch was dazu schreiben muss."
   A food photo in the composer is checked right away by the same food-photo function as Log meal; the chip fills itself in (editable
   dish name, spike label, kcal / protein / net carbs, one menu line) and Send posts a meal card with no text needed. Not food, no checks
   left, offline, an error or a timeout: a plain photo post. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fresh = f => { const p = path.join(ROOT, f); delete require.cache[require.resolve(p)]; return require(p); };
const chat = src('community-chat.js');

function withFetch(impl, fn) {
    const old = globalThis.fetch, oldCfg = globalThis.LOWI_CFG;
    globalThis.fetch = impl; globalThis.LOWI_CFG = { url: 'https://example.supabase.co', key: 'sb_publishable_test' };
    return Promise.resolve().then(fn).finally(() => { globalThis.fetch = old; globalThis.LOWI_CFG = oldCfg; });
}
const READ = { is_food: true, confidence: 'high', note: '', title: '  Salat-Wraps   mit Hähnchen ', desc: 'Knackige Salatblätter mit Hähnchen, Tomaten und Joghurtsoße.',
    dishes: [{ name: 'Hähnchen', portion: '120 g', grams: 120, kcal: 200, protein_g: 30, carbs_g: 0, sugar_g: 0, fiber_g: 0, fat_g: 8 },
        { name: 'Salatblätter', portion: '6 Stück', grams: 60, kcal: 10, protein_g: 1, carbs_g: 2, sugar_g: 1, fiber_g: 1, fat_g: 0 }] };
const ok = j => async () => ({ ok: true, status: 200, json: async () => Object.assign({ left: 9, limit: 10 }, j) });

test('the server asks for a dish title and one menu line in the user\'s language (additive, required in the schema)', () => {
    const s = src('supabase/functions/food-photo/index.ts');
    assert.match(s, /title: \{ type: "STRING" \}/);
    assert.match(s, /desc: \{ type: "STRING" \}/);
    assert.match(s, /required: \[[^\]]*"title", "desc"/);
    assert.match(s, /title is the everyday name of the whole meal[^\n]*LANGS\[lang\]/);
    assert.match(s, /no health or medical claims/);
    assert.doesNotMatch(s, /insulin spike/i);
});

test('the client keeps title and desc, cleaned and bounded', () => {
    const A = fresh('food-photo-ai.js');
    const r = A.normalize(READ);
    assert.strictEqual(r.title, 'Salat-Wraps mit Hähnchen');
    assert.ok(r.desc.startsWith('Knackige'));
    assert.strictEqual(A.normalize({ is_food: true, dishes: [{ name: 'x' }], title: 'y'.repeat(300), desc: 'z'.repeat(400) }).title.length, 80);
    assert.strictEqual(A.normalize({ is_food: true, dishes: [{ name: 'x' }], desc: 'z'.repeat(400) }).desc.length, 160);
    assert.strictEqual(A.normalize({ is_food: true, dishes: [{ name: 'x' }] }).title, '', 'older server: empty, the chat falls back to the dish names');
});

test('a good read is reused for the same picture only when the caller asks (Community), so one photo uses one check', async () => {
    const A = fresh('food-photo-ai.js');
    let calls = 0;
    await withFetch(async (u, o) => { calls++; return ok(READ)(); }, async () => {
        const img = 'data:image/jpeg;base64,QUJDREVG';
        const a = await A.analyse(img, { lang: 'de' });          // Log meal
        assert.strictEqual(calls, 1);
        const b = await A.analyse(img, { lang: 'de', reuse: true }); // the same photo in Community
        assert.strictEqual(calls, 1, 'no second request');
        assert.strictEqual(b.cached, true);
        assert.strictEqual(b.title, a.title);
        b.dishes[0].name = 'changed';
        const c = await A.analyse(img, { lang: 'de', reuse: true });
        assert.strictEqual(c.dishes[0].name, 'Hähnchen', 'the kept copy is not shared');
        await A.analyse(img, { lang: 'de' });
        assert.strictEqual(calls, 2, 'callers without reuse (Log meal, retries) always ask');
        await A.analyse(img, { lang: 'es', reuse: true });
        assert.strictEqual(calls, 3, 'another language asks again');
        await A.analyse('data:image/jpeg;base64,WFla', { lang: 'de', reuse: true });
        assert.strictEqual(calls, 4, 'another picture asks again');
    });
    let n2 = 0;
    await withFetch(async () => { n2++; return ok({ is_food: false, dishes: [], confidence: 'high', note: '' })(); }, async () => {
        const img = 'data:image/jpeg;base64,Tk9URk9PRA==';
        await A.analyse(img, { reuse: true }); await A.analyse(img, { reuse: true });
        assert.strictEqual(n2, 2, 'a not-food read is never kept');
    });
});

/* the chip's pure parts, taken from community-chat.js and run against the real modules */
function chipParts(l) {
    const g = (a, b) => { const i = chat.indexOf(a), j = chat.indexOf(b, i); assert.ok(i >= 0 && j > i, a); return chat.slice(i, j); };
    const code = g('const LC=', 'function foodChip') + g('/* a food read ->', 'async function lookFood');
    const COPY = { foodProt: ['protein', 'Eiweiß', 'proteína'], foodNet: ['net carbs', 'Netto-KH', 'HC netos'], mealLow: ['a', 'b', 'c'], mealMid: ['a', 'b', 'c'], mealHigh: ['a', 'b', 'c'] };
    const L = ['en', 'de', 'es'].indexOf(l);
    global.LowiMealSnap = fresh('meal-photo.js'); global.LowiFoodKnowledge = fresh('food-knowledge-core.js');
    const W = { LowiFoodAI: fresh('food-photo-ai.js'), LowiMealSnap: global.LowiMealSnap, LowiMealResult: fresh('meal-result.js'), LowiMealDetailCore: fresh('meal-detail-core.js') };
    const f = new Function('W', 'tr', 'lang', 'esc', code + '\nreturn {foodNums,foodCard,foodDetail,spikePill};');
    return Object.assign(f(W, k => COPY[k][L], () => L, s => String(s)), { W });
}

test('a food read becomes the card: AI title, the result screen\'s spike level, numbers and the menu line; detail is whitelisted', () => {
    for (const l of ['en', 'de', 'es']) {
        const P = chipParts(l), A = P.W.LowiFoodAI;
        const res = A.normalize(READ);
        const c = P.foodCard(res);
        assert.strictEqual(c.st, 'ok');
        assert.strictEqual(c.title, 'Salat-Wraps mit Hähnchen');
        assert.ok(['low', 'mid', 'high'].includes(c.lvl));
        assert.strictEqual(c.lvl, 'low', 'chicken and lettuce: no likely blood sugar spike');
        const nums = P.foodNums(c.total, c.net);
        assert.ok(nums.startsWith('210 kcal · 31 g '), nums);
        assert.ok(nums.endsWith(' g ' + ['net carbs', 'Netto-KH', 'HC netos'][['en', 'de', 'es'].indexOf(l)]), nums);
        assert.ok(c.desc.startsWith('Knackige'));
        const d = P.foodDetail(c, 'Mein Teller');
        assert.ok(d && d.name === 'Mein Teller' && d.lvl === 'low' && Array.isArray(d.items) && d.items.length === 2, JSON.stringify(d));
        const clean = P.W.LowiMealDetailCore.clean(d);
        assert.ok(clean && Object.keys(clean).every(k => [].concat(P.W.LowiMealDetailCore.WHITE).includes(k)));
        // an older server without title: the dish names
        const c2 = P.foodCard(A.normalize(Object.assign({}, READ, { title: '' })));
        assert.strictEqual(c2.title, A.title(c2.res.dishes, l));
        // a spiky plate gets the strict label
        const c3 = P.foodCard(A.normalize({ is_food: true, confidence: 'high', title: 'Cola und Kuchen', dishes: [{ name: 'Cola', portion: '500 ml', grams: 500, kcal: 210, carbs_g: 53, sugar_g: 53 }, { name: 'Cake', portion: '1 slice', grams: 120, kcal: 420, carbs_g: 55, sugar_g: 35, fat_g: 20 }] }));
        assert.strictEqual(c3.lvl, 'high');
        // not food / nothing / garbage: no card (plain photo)
        assert.strictEqual(P.foodCard(A.normalize({ is_food: false, dishes: [] })), null);
        assert.strictEqual(P.foodCard(null), null);
        assert.strictEqual(P.foodCard({ isFood: true, dishes: [] }), null);
    }
});

test('composer: the photo is checked when it is added, with a calm looking line, and falls back to a plain photo', () => {
    assert.match(chat, /pendingPhoto=\{id:newPhotoId\(\),[^\n]*lookFood\(pendingPhoto,file\);/);
    assert.match(chat, /async function lookFood\(pin,file\)\{if\(!pin\|\|!file\|\|!foodWanted\(\)\)return;/);
    assert.match(chat, /A\.analyse\(img,\{lang:LC\(\),timeout:FOOD_MS,reuse:true\}\)/);
    assert.match(chat, /const FOOD_MS=25000;/);
    assert.match(chat, /pin\.ai=card\|\|\{st:'plain'\}/, 'anything else is a plain photo');
    assert.match(chat, /if\(pendingPhoto!==pin\)return;/, 'a removed photo is dropped quietly');
    assert.match(chat, /function foodWanted\(\)\{if\(sel&&botOf\(sel\)\)return false;/, 'bots get a plain photo');
    assert.match(chat, /navigator\.onLine!==false/);
    // copy in three languages, with the companion's own name, never a hard-coded name
    for (const k of ['foodLook', 'foodWait', 'foodName', 'foodProt', 'foodNet', 'foodComp']) assert.match(chat, new RegExp(k + ":\\['[^']+','[^']+','[^']+'\\]"), k);
    assert.match(chat, /foodLook:\['\{c\} is looking at your food…','\{c\} schaut sich dein Essen an…','\{c\} está mirando tu comida…'\]/);
    assert.match(chat, /\.replace\('\{c\}',compName\(\)\)/);
    assert.match(chat, /function compName\(\)\{try\{const B=W\.LowiBirthCompanion/);
    const block = chat.slice(chat.indexOf('const FOOD_MS'), chat.indexOf('async function lookFood'));
    assert.doesNotMatch(block, /Misty/);
    assert.doesNotMatch(chat, /insulin/i);
});

test('composer chip: editable dish name (16px, 44pt, Enter sends), spike label, numbers, menu line; privacy line stays', () => {
    assert.match(chat, /<input class="cs-food-t" type="text" maxlength="80" enterkeyhint="send"/);
    assert.match(chat, /ti\.addEventListener\('input',\(\)=>\{if\(pin\.ai\)pin\.ai\.title=ti\.value;\}\)/);
    assert.match(chat, /if\(e\.key==='Enter'\)\{e\.preventDefault\(\);send\(\);\}/);
    assert.match(chat, /foodChip\(pin\)\+'<small>'\+tr\('photoNote'\)\+'<\/small>/, 'the location/camera data line is always shown');
    const css = src('community-chat.css');
    assert.match(css, /#csPhoto \.cs-food-t\{[^}]*min-height:44px[^}]*font-size:16px/);
    assert.match(css, /prefers-reduced-motion:reduce\)\{#csPhoto \.cs-food-l i\{animation:none/);
});

test('send: no text needed; waits while the check runs; posts the meal card (meal- path, mealBody, detail) or the plain photo', () => {
    assert.match(chat, /if\(!bot&&pin\.ai&&pin\.ai\.st==='look'\)\{pin\.wait=true;refresh\(\);return;\}/);
    assert.match(chat, /if\(pin\.wait\)\{pin\.wait=false;notice='';refresh\(\);sendPhoto\(\);return;\}/);
    assert.match(chat, /mediaUpload\(scope\+'\/meal-'\+pin\.id\+'\.jpg',pin\.blob,\['image\/jpeg'\]\)/);
    assert.match(chat, /K\.mealBody\(src,title,food\.lvl,cap\|\|food\.desc\)/, 'typed text replaces the menu line');
    assert.match(chat, /md=MD&&d\?MD\.clean\(d\):null/);
    assert.match(chat, /store\.submitPhoto\(name,body,pin\.id,ds\.draft\.reply\|\|null,md\)/);
    assert.match(chat, /if\(!body\)\{const path=scope\+'\/chat-'\+pin\.id\+'\.jpg'/, 'plain photo path unchanged');
    // the meal body the composer builds parses back as a meal card for everyone, with the caption
    const K = fresh('community-chat-core.js');
    const scope = 'a'.repeat(32), url = 'https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/' + scope + '/meal-p1abc.jpg';
    const body = K.mealBody(url, 'Salat-Wraps mit Hähnchen', 'low', 'Knackige Salatblätter mit Hähnchen.');
    const m = K.meal(body, scope);
    assert.ok(m && m.name === 'Salat-Wraps mit Hähnchen' && m.lvl === 'low', JSON.stringify(m));
    assert.ok(K.meal('@Antje ' + body, scope), 'a direct @tag in front still parses');
});

test('everyone sees the key numbers on a meal card that carries its photo check', () => {
    assert.match(chat, /function mealNums\(md\)\{/);
    assert.match(chat, /\(ph\.meal\?mealHtml\(ph\.meal,m\.md\)/);
    assert.match(chat, /MD\.hintHTML\(\)\+'<\/button>'\+nums\+'<\/div>';\}/);
});
