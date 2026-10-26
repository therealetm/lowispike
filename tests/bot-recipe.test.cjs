// Oct 26 2026 (Emmanuel, voice message with two Community > Chat screenshots of a "Nibblo - bot" recipe post):
// "The bot messages, they are so useless. Where is all the things that I said? We should be able to click on it and then it
// opens... You know how when you go on Shuffle and you pick a food, that page that opens? That's what's supposed to happen. ...
// let's have the button be in a way where people understand that they can click on it to save, or to cook, or to open, or to
// add into their kitchen. When I add to kitchen, the products are then added to the kitchen wardrobe. You need to fix that logic."
// Task "Community bot recipe cards open the recipe page", branch bot-recipe-open, MAYA-HANDOFF 0.18.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const KC = require('../kitchen-core.js');
global.LowiKitchenCore = KC;
const B = require('../bot-recipe-core.js');
const N = require('../nibblo-core.js');
const idx = R('index.html'), chat = R('community-chat.js'), dom = R('bot-recipe.js'), sw = R('sw.js');

const ING = [{ k: 'lettuce', n: 'Lettuce' }, { k: 'chicken', n: 'Chicken' }, { k: 'greek yogurt', n: 'Greek yogurt' }, { k: 'ice', n: 'Ice' }, { k: 'cold water', n: 'Cold water' }, { k: 'chicken', n: 'Chicken' }];

test('the recipe products: every ingredient once, never tap water or ice', () => {
    assert.deepEqual(B.foods(ING).map(f => f.n), ['Lettuce', 'Chicken', 'Greek yogurt']);
    assert.deepEqual(B.foods(null), []);
});

test('Add to kitchen puts every product into the Kitchen "At home" list, once, and says what was already there', () => {
    let st = KC.add(KC.parse(null), 'Hähnchen', 1, 'me');                      /* already at home, typed in German */
    const tr = s => ({ Chicken: 'Hähnchen', Lettuce: 'Salat', 'Greek yogurt': 'Griechischer Joghurt' })[s] || s;
    const r = B.addAll(st, B.foods(ING), 1000, tr);
    assert.deepEqual(r.added.map(x => x.n), ['Salat', 'Griechischer Joghurt'], 'stored in the phone language');
    assert.deepEqual(r.had, ['Hähnchen']);
    assert.equal(KC.count(r.state), 3);
    assert.equal(r.state.items.every(i => i.from === 'me'), true);
    const again = B.addAll(r.state, B.foods(ING), 2000, tr);
    assert.equal(again.added.length, 0, 'a second tap adds nothing twice'); assert.equal(KC.count(again.state), 3);
    assert.equal(B.status(r.state, B.foods(ING), tr), 'have');
    assert.equal(B.status(st, B.foods(ING), tr), 'add');
    const back = B.undo(r.state, r.added.map(x => x.id));
    assert.deepEqual(KC.view(back).map(i => i.n), ['Hähnchen'], 'Undo takes out only what that tap put in');
});

test('an English name in the Kitchen counts for the German recipe too (either spelling matches)', () => {
    const st = KC.add(KC.parse(null), 'Greek Yogurt', 1, 'me');
    assert.equal(B.inKitchen(st, { n: 'Greek yogurt' }, s => s === 'Greek yogurt' ? 'Griechischer Joghurt' : s), true);
    assert.equal(B.inKitchen(st, { n: 'Lettuce' }, s => s), false);
});

test('the action row: four labelled buttons (Open recipe, Cook it, Save, Add to kitchen) in EN, DE and ES; no bare "+"', () => {
    const want = { en: ['Open recipe', 'Cook it', 'Save', 'Add to kitchen'], de: ['Rezept öffnen', 'Kochen', 'Merken', 'In die Küche'], es: ['Abrir receta', 'Cocinar', 'Guardar', 'A mi cocina'] };
    for (const l of Object.keys(want)) {
        const h = B.rowHTML({ key: 'nb-20261026-n', id: 'rb_tandoori_lettuce_wrap_plate', name: 'Tandoori Lettuce Wrap Plate', kitchen: 'add', count: 5 }, l);
        for (const w of want[l]) assert.ok(h.includes('>' + w + '<'), l + ': ' + w);
        for (const a of ['open', 'cook', 'save', 'kitchen']) assert.ok(h.includes('data-br="' + a + '"'), a);
        assert.ok(h.includes('data-id="rb_tandoori_lettuce_wrap_plate"'));
        assert.ok(!/>\s*\+\s*</.test(h), 'no bare +');
    }
    const saved = B.rowHTML({ key: 'k', id: 'rb_x', saved: true, kitchen: 'done', added: 3, undo: true }, 'en');
    assert.ok(saved.includes('>Saved<') && saved.includes('aria-pressed="true"'));
    assert.ok(saved.includes('3 in your kitchen') && saved.includes('data-br="undo"'));
    assert.ok(B.rowHTML({ key: 'k', id: 'rb_x', kitchen: 'have' }, 'de').includes('Alles in deiner Küche'));
    assert.ok(B.rowHTML({ key: 'k', id: '<x"' }, 'en').indexOf('<x"') < 0, 'escaped');
    assert.equal(B.rowHTML({ key: 'k' }, 'en'), '', 'no recipe, no row');
});

test('a person\'s meal with foods gets only Add to kitchen (no recipe to open)', () => {
    const h = B.rowHTML({ key: 'm1', foods: ['Salmon', 'Avocado'], kitchen: 'add' }, 'en');
    assert.ok(h.includes('data-br="kitchen"') && !h.includes('data-br="open"') && !h.includes('data-br="cook"'));
    assert.deepEqual(B.foodsOfDetail({ items: [{ name: 'Salmon · 150 g' }, { name: '🥑 Avocado' }, { name: 'Water' }, { name: 'salmon' }] }).map(f => f.n), ['Salmon', 'Avocado']);
});

test('every Nibblo dish is a Recipe Book recipe, so the tap always lands on the Shuffle recipe page', () => {
    const book = idx.slice(idx.indexOf('const RECIPE_BOOK = ['), idx.indexOf('const bookId = n =>'));
    const ids = new Set((book.match(/\bn:"([^"]+)"/g) || []).map(s => N.bookId(s.slice(3, -1))));
    const dishes = [].concat(N.MENU.m, N.MENU.n, N.MENU.e);
    assert.ok(dishes.length >= 6);
    for (const d of dishes) assert.ok(ids.has(N.bookId(d.r)), d.r + ' is in the Recipe Book');
});

test('the bot route opens the SAME recipe page Shuffle opens (LowiP2.open), and Cook it opens it in cook mode', () => {
    assert.match(dom, /LowiMealDetail\.routeBot\(/);
    assert.match(dom, /LowiP2\.open\(\s*id\s*\)/);
    assert.match(dom, /LowiP2\.open\(\s*id\s*,\s*\{\s*cook:\s*true\s*\}\s*\)/);
    assert.match(dom, /LowiBook\.toggle\(/);
    assert.ok(!/class="p2-rec"|R2\.sheet\(/.test(dom), 'no second recipe page');
    /* the Shuffle pick opens openRecipe, the same function LowiP2.open is */
    assert.match(idx, /window\.LowiP2 = \{open:openRecipe/);
    assert.match(idx, /if \(pc && !t\.closest\(\"button,a\"\)\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); openRecipe\(pc\.dataset\.id\)/);
});

test('Chat draws the action row under a bot recipe card, and the dish name opens the recipe too', () => {
    assert.match(chat, /LowiBotRecipe\.chatRow\(m/);
    assert.match(chat, /<button type="button" class="cs-meal-n" data-chat="meal-detail" data-id="'\+esc\(id\)/);
});

test('the reaction button says React in words, not a bare "+" that reads like Add', () => {
    assert.ok(!chat.includes("button('pick','＋'"), 'no bare + on the pick button');
    assert.match(chat, /reactShort:\['React','Reagieren','Reaccionar'\]/);
});

test('the recipe page counts what is in your Kitchen as at home, and has its own Add to kitchen', () => {
    const p2 = idx.slice(idx.indexOf('function haveMap()'), idx.indexOf('function storeId()'));
    assert.match(p2, /kitHas\(i\)/);
    assert.match(idx, /function kitHas\(i\)/);
    assert.match(idx, /data-br="kitchen" data-id="' \+ esc\(r\.id\)/);
    assert.match(idx, /homeClear:/);
});

test('the files load and are cached for offline', () => {
    assert.match(idx, /<script src="bot-recipe-core\.js\?v=[^"]+"><\/script>\s*<script src="bot-recipe\.js\?v=/);
    assert.ok(idx.indexOf('src="bot-recipe.js') > idx.indexOf('src="meal-detail.js'), 'after meal-detail.js (routeBot)');
    assert.match(idx, /href="bot-recipe\.css\?v=/);
    assert.match(sw, /"bot-recipe-core\.js", "bot-recipe\.js", "bot-recipe\.css"/);
});

test('never "Misty" in the new words', () => {
    assert.ok(!/Misty/.test(R('bot-recipe-core.js')) && !/Misty/.test(dom));
});
