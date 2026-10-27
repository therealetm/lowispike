// Oct 22 (Seven: "When the meal is logged, it should save the picture, and also the estimate they received. It should also give
// them an option to share into the community."): saved photo + estimate, the share card, private by default.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = require('../meal-journal.js');
const K = require('../community-chat-core.js');
const idx = R('index.html'), spirit = R('spirit.js'), fpa = R('food-photo-ai.js'), ms = R('meal-photo.js'), chat = R('community-chat.js'), css = R('meal-journal.css'), ccss = R('community-chat.css');

test('the full estimate a photo meal received is kept, cleaned and bounded', () => {
    const ai = J.estimate({ name: 'Chicken salad', items: [{ name: 'Chicken', portion: '120 g' }, { name: 'Lettuce' }, { name: '' }], total: { kcal: 412.6, carbs: 18, protein: 38.44, fiber: 6, sugar: 4, fat: 19, weight: 92 } }, { lvl: 'medium', note: 'Add beans for more fiber', low: true });
    assert.equal(ai.name, 'Chicken salad');
    assert.deepEqual(ai.items, [{ name: 'Chicken', portion: '120 g' }, { name: 'Lettuce', portion: '' }]);
    assert.equal(ai.total.kcal, 413); assert.equal(ai.total.protein, 38.4); assert.equal(ai.total.fiber, 6);
    assert.equal(ai.total.weight, undefined, 'only nutrition keys are kept');
    assert.equal(ai.bs, 'mid'); assert.equal(ai.note, 'Add beans for more fiber'); assert.equal(ai.low, true);
    assert.equal(J.estimate({}), null);
    assert.equal(J.estimate({ items: [{ name: 'x'.repeat(200) }] }).items[0].name.length, 60);
});

test('spirit.js saves log.ai and the photo (1024 px on the device, a small thumbnail on the log) with a photo meal', () => {
    assert.match(fpa, /form\.__lowiMeal = \(\) =>/);
    assert.match(spirit, /seed\.ai = ai/);
    assert.match(spirit, /J\.prepare\(photoFile \|\| photoURL\)/);
    assert.match(spirit, /seed\.photo = pic\.thumb/);
    assert.match(spirit, /J\.keep\(log\.id, pic\)/);
    assert.match(idx, /if\(data\.ai&&typeof data\.ai==="object"\)log\.ai=data\.ai;/);
    const src = R('meal-journal.js');
    assert.match(src, /FULL = 1024, THUMB = 160/);
    assert.match(src, /'image\/jpeg', \.8\)/);
    assert.match(idx, /<script src="meal-journal\.js\?v=/); assert.match(idx, /<link rel="stylesheet" href="meal-journal\.css\?v=/);
    assert.match(R('sw.js'), /"meal-journal\.js"/);
});

test('photos are private by default: kept in IndexedDB on this phone, never sent unless the user shares that one meal', () => {
    const src = R('meal-journal.js');
    assert.match(src, /DB = 'lowi-meal-photos'/);
    assert.doesNotMatch(src, /storage\.from|supabase|fetch\(/i, 'the journal itself never uploads');
    assert.doesNotMatch(ms, /data-ms="share"/, 'no pre-checked or pre-log share box');
    assert.match(src, /btn\.addEventListener\('click', post\)/, 'posting needs a tap on Post every time');
    // deleting the account wipes the device copy
    assert.match(R('home-settings-sleep-v2.js'), /deleteDatabase\('lowi-meal-photos'\)/);
});

test('a share carries only that meal: name, spike rating, caption; never weight or other health data', () => {
    const log = { id: 'm1', t: 'Pasta bake', lvl: 'high', photo: 'data:image/jpeg;base64,AA', macros: { kcal: 900 }, ai: { name: 'Pasta bake', total: { kcal: 900 } }, weight: 88, bmi: 27 };
    const s = J.shareOf(log, '  so   good ');
    assert.deepEqual(s, { name: 'Pasta bake', lvl: 'high', caption: 'so good' });
    assert.equal(J.shareOf({ t: 'x' }), null, 'no spike rating, no share');
    assert.equal(J.levelOf({ lvl: 'medium' }), 'mid');
    assert.equal(J.shareOf(log, 'y'.repeat(300)).caption.length, 140);
});

test('the Community meal card message: photo, dish name, spike rating, caption; only its owner\'s photo', () => {
    const uid = 'user_12345678', src = 'https://abcdefghijkl.supabase.co/storage/v1/object/public/media/' + uid + '/meal-p0123456789abcdef.jpg';
    const body = K.mealBody(src, 'Chicken & rice (bowl)!', 'medium', 'Lunch  after the gym');
    assert.ok(body.startsWith('\u{1F37D} ' + src + '#l=mid&n='));
    assert.ok(body.length <= 600);
    assert.deepEqual(K.meal(body, uid), { src, lvl: 'mid', name: 'Chicken & rice (bowl)!', caption: 'Lunch after the gym' });
    assert.equal(K.meal(body, 'someone_else'), null, 'a meal card must use the sender\'s own folder');
    assert.equal(K.photo(body, uid), null, 'it is not read as a plain photo');
    assert.equal(K.mealBody(src, 'X', 'weird', ''), '');
    assert.equal(K.mealBody('https://evil.example/x.jpg', 'X', 'low', ''), '');
    assert.equal(K.meal('\u{1F37D} ' + src + '#l=low&n=%E0%A4', uid), null, 'broken names are dropped');
});

test('the chat renders the meal card and accepts it through the photo outbox; report/block work like any message', () => {
    assert.match(chat, /const ml=K\.meal\?K\.meal\(m\.t,u\):null;return ml\?\{src:ml\.src,caption:ml\.caption,meal:ml\}:null;/);
    assert.match(chat, /\(ph\.meal\?mealHtml\(ph\.meal(?:,m\.md)?\)(?:\+\(W\.LowiBotRecipe[^:]*:''\))?:''\)/); /* Oct 26: + the recipe card buttons (bot-recipe.js) */
    assert.match(chat, /async function shareMeal\(o\)/);
    assert.match(chat, /scope\+'\/meal-'\+id\+'\.jpg'/);
    assert.match(chat, /W\.LowiCommunity=\{mount,refresh,send,comment,[^\n]*,shareMeal\};/);
    assert.match(R('community-chat-core.js'), /function submitPhoto\(by,text,id,reply\)\{if\(!photo\(text,scope\)&&!voice\(text,scope\)&&!meal\(text,scope\)\)/);
    for (const l of ['Low spike', 'Kleiner Spike', 'Pico bajo', 'Meal from {n}', 'Mahlzeit von {n}', 'Comida de {n}']) assert.ok(chat.includes(l), l);
});

test('meal card and journal use theme tokens, no hard-coded teal or green', () => {
    const block = ccss.slice(ccss.indexOf('.cs-meal{'));
    for (const c of [block, css]) {
        assert.doesNotMatch(c, /#(?:2dd4bf|14b8a6|0d9488|5eead4|34d399|10b981|22c55e)\b/i);
        assert.doesNotMatch(c, /\bteal\b/i);
    }
    assert.match(block, /currentColor/); assert.match(css, /var\(--text\)/);
});

test('Fuel\'s today list shows thumbnails that open the meal; delete removes the meal, its XP and its photo', () => {
    assert.match(R('sym-home.js'), /J\.thumbHTML\(l\)/);
    assert.match(idx, /deleteMeal\(id\)\{[^\n]*S\.logs\.splice\(i,1\);[^\n]*this\.unaward\(log\.eventId\)/);
    const src = R('meal-journal.js');
    assert.match(src, /v\.deleteMeal\(id\)[\s\S]{0,80}await delPhoto\(log\.id\)/);
    const html = J.thumbHTML({ id: 'a"b', t: '<b>x</b>', photo: 'data:image/jpeg;base64,AAA' }, 'en');
    assert.match(html, /data-mj-open="a&quot;b"/); assert.doesNotMatch(html, /<b>x/);
    assert.match(J.thumbHTML({ id: 'z', photo: 'javascript:1' }), /mj-thumb-none/);
});

test('every string is in English, German and Spanish', () => {
    const en = Object.keys(J.STR.en);
    for (const l of ['de', 'es']) { assert.deepEqual(Object.keys(J.STR[l]).sort(), en.slice().sort(), l); for (const k of en) assert.ok(String(J.STR[l][k]).trim(), l + ':' + k); }
    assert.equal(J.t('share', 'de'), 'In der Community teilen');
    assert.equal(J.t('share', 'es'), 'Compartir en la Comunidad');
});
