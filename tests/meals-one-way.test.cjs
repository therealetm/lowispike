/* Oct 17 (E-man): the Meals bubble opened only an X and moved on its own, and the Daily Quest and Meals both asked to log a meal.
   One way to log a meal: the Meals bubble owns it on Home, the quest still counts the same log, and the bubble holds its spot. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../sym-home.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html'), js = read('sym-home.js');
const f3 = html.slice(html.indexOf('<script id="f3js">'), html.indexOf('</script>', html.indexOf('<script id="f3js">')));

/* next() from the real board, with a stand-in for "is the Meals bubble on Home" */
function nextWith(bubble) {
    const src = f3.match(/function next\(L\)\{[^\n]*\n/)[0];
    return new Function('mealsBub', 'state', src + 'return next;')(() => (bubble ? {} : null), () => []);
}
const Q = (open) => ['checkin', 'water', 'fast', 'eat', 'move', 'post'].map(id => ({ id, done: open.indexOf(id) < 0 }));

test('Daily Quest: with the Meals bubble on Home the meal quest is never the glowing Next while another quest is open', () => {
    const next = nextWith(true);
    assert.strictEqual(next(Q(['eat', 'move', 'post'])).id, 'move');
    assert.strictEqual(next(Q(['checkin', 'eat'])).id, 'checkin');
    assert.strictEqual(next(Q(['eat'])).id, 'eat', 'the last open quest still shows, pointing at the bubble');
    assert.strictEqual(next(Q([])), undefined);
});

test('Daily Quest: without the bubble (another tab, older layout) the order is unchanged', () => {
    const next = nextWith(false);
    assert.strictEqual(next(Q(['eat', 'move'])).id, 'eat');
    assert.strictEqual(next(Q(['water', 'eat'])).id, 'water');
});

test('one way to log a meal: the quest opens the Meals bubble sheet, the board, lead line and reminders use the same Next', () => {
    assert.ok(/else if \(id === "eat"\) \{ if \(mealsBub\(\) && window\.LowiMealsBubble && LowiMealsBubble\.log\) LowiMealsBubble\.log\(\);/.test(f3), 'quest button = Meals bubble sheet');
    assert.ok(f3.includes('else if (window.LowiF2 && LowiF2.start) LowiF2.start({});'), 'old flow kept when there is no bubble');
    assert.ok(f3.includes('cur = next(L)') && f3.includes('window.LowiF3 = {paint, state, next,'));
    assert.ok(html.includes('cur = LowiF3.next ? LowiF3.next(L) : L.find(q => !q.done);'), 'lead line');
    assert.ok(html.includes('nx = (window.LowiF3 && LowiF3.next && LowiF3.next(L)) || open[0];'), 'bubble reminders');
});

test('honest tracking: the meal quest still reads the same log (one meal counts once), says so in EN/DE/ES', () => {
    assert.ok(f3.includes('{id:"eat", t:w("eat"), s:w(mealsBub() ? "eatB" : "eatS"), go:w("goEat"), done:!!q.eat || logs.some(l => l && l.day === t)}'));
    assert.ok(f3.includes('eatB:"Same as your Meals bubble: one meal counts for both."'));
    assert.ok(f3.includes('eatB:"Dasselbe wie deine Essen-Blase: eine Mahlzeit zählt für beide."'));
    assert.ok(f3.includes('eatB:"Igual que tu burbuja de Comidas: una comida cuenta para las dos."'));
    assert.ok(f3.includes('QXP = 10, BONUS = 50'), 'quest XP unchanged');
});

test('Meals bubble holds still: 1-3 px of drift never moves its spot, a real layout change does', () => {
    assert.strictEqual(C.moved(NaN, NaN, 54, 199), true, 'first placement');
    assert.strictEqual(C.moved(54, 199, 56, 201), false);
    assert.strictEqual(C.moved(54, 199, 51, 196), false);
    assert.strictEqual(C.moved(54, 199, 58, 199), true);
    assert.strictEqual(C.moved(54, 199, 54, 140), true, 'rotation or Move found a new spot');
    assert.ok(js.includes('if (!CORE.moved(ox, oy, X, Y)) return;'));
});

test('Einkaufen bubble (the old Meals bubble, Oct 28 food plan): a hold only squishes, a tap opens Einkaufen, never both', () => {
    assert.ok(js.includes("W.LowiLivingBubble.attach(b, { kind: 'meals', onLong: () => { longAt = performance.now(); return true; } })"), 'a hold only squishes and swallows its release');
    assert.ok(js.includes("b.addEventListener('pointerdown', () => { downAt = performance.now(); });"));
    assert.ok(/if \(longAt && longAt >= downAt\) \{ longAt = 0; return; \}[^\n]*\n\s*openShop\(\);/.test(js));
});
