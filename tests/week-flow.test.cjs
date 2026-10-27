/* Oct 27 2026 — the guided week (Shop > From home). Emmanuel sent a viral @herbi.app TikTok ("choose where you shop, your budget,
   your vibe, dietary needs, what's in your kitchen" -> a week of dinners + one list) and said: "improve our app, so that it also has
   this feature. I still feel like our app is so noisy and so confusing." One question per screen, then a calm week, then the list. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../week-basket-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const wb = read('week-basket.js'), css = read('week-basket.css'), core = read('week-basket-core.js');

const beef = { id: 'rb_b', n: 'Nori Smash Burger Stack', ing: [{ g: 'hack', n: 'Beef mince or patties' }, { g: 'kaese', n: 'Cheddar' }, { g: 'salat', n: 'Lettuce' }], make: ['Sear beef mince until browned in a pan.'] };
const salmon = { id: 'rb_s', n: 'Konjak Sushi Bowl', ing: [{ g: 'huhn', n: 'Salmon' }, { g: 'gemuese', n: 'Avocado' }, { g: 'gemuese', n: 'Konjac rice' }], make: ['Dry-fry it.', 'Top with salmon.'] };
const boats = { id: 'rb_p', n: 'Pizza boats', ing: [{ g: 'gemuese', n: 'Zucchini' }, { g: 'kaese', n: 'Mozzarella' }], make: ['Bake or air-fry until golden.'] };
const raw = { id: 'rb_r', n: 'Cucumber salad', ing: [{ g: 'gemuese', n: 'Cucumber' }, { g: 'fett', n: 'Olive oil' }], make: ['Slice and dress.'] };

test('profile: reads meat, fish, beef, dairy and the kitchen a dinner needs', () => {
    const b = C.profile(beef), s = C.profile(salmon), p = C.profile(boats), r = C.profile(raw);
    assert.ok(b.meat && b.beef && b.dairy && !b.veg && b.need === 'hob' && b.fake);
    assert.ok(s.fish && !s.meat && !s.veg && !s.dairy && s.need === 'hob');
    assert.ok(p.veg && p.dairy && p.need === 'oven');
    assert.equal(r.need, 'none'); assert.ok(r.veg && !r.dairy);
    assert.equal(C.profile({ n: 'x', ing: [], make: ['Pan-roast the patties.'] }).need, 'hob', 'pan-roast is the hob, not the oven');
    assert.ok(C.profile(beef, { min: 12 }).quick && !C.profile(beef, { min: 25 }).quick);
});

test('fits: what you don\'t eat and the kitchen you have are hard filters; an air fryer does the oven\'s job', () => {
    const b = C.profile(beef), s = C.profile(salmon), p = C.profile(boats);
    assert.ok(!C.fits(b, ['veg'], []) && !C.fits(s, ['veg'], []) && C.fits(p, ['veg'], []));
    assert.ok(!C.fits(s, ['nofish'], []) && C.fits(b, ['nofish'], []));
    assert.ok(!C.fits(b, ['nobeef'], []) && C.fits(s, ['nobeef'], []));
    assert.ok(!C.fits(p, ['nodairy'], []) && C.fits(s, ['nodairy'], []));
    assert.ok(!C.fits(p, [], ['hob']) && C.fits(p, [], ['hob', 'air']) && C.fits(p, [], ['oven']));
    assert.ok(!C.fits(b, [], ['micro']) && C.fits(C.profile(raw), [], ['micro']));
    assert.ok(C.fits(p, [], []), 'no kitchen ticked never empties the week');
});

test('vibe only ranks: best match first, ties keep this week\'s shuffle, nothing removed', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'], score = id => (id === 'd' ? 2 : id === 'b' ? 1 : 0);
    const r = C.rank(ids, 7, score);
    assert.deepEqual(r.slice(0, 2), ['d', 'b']); assert.equal(r.length, 5);
    const base = C.order(ids, 7).filter(x => x !== 'd' && x !== 'b');
    assert.deepEqual(r.slice(2), base);
    assert.equal(C.vibeScore({ quick: true, fake: true, protein: false }, ['quick', 'protein', 'fake']), 2);
    const p = C.plan(ids, 3, 7, [], () => '', score); assert.deepEqual(p.slice(0, 2), ['d', 'b']);
    assert.deepEqual(C.plan(ids, 3, 7, [], () => ''), C.plan(ids, 3, 7, [], () => '', null), 'no vibe = the old plan');
});

test('fresh first: fish and salad leaves early in the week, pantry dinners last ("food will be gone off by Friday")', () => {
    const per = { a: 3, b: 0, c: 2, d: 1, e: 3 };
    assert.deepEqual(C.freshFirst(['a', 'b', 'c', 'd', 'e'], id => per[id]), ['b', 'd', 'c', 'a', 'e']);
    assert.equal(C.profile(salmon).perish, 0); assert.equal(C.profile(raw).perish, 3);
});

test('days: the dinners fall on the days from the day the week was made', () => {
    const d = C.days('2026-10-27', 5);
    assert.deepEqual(d.map(x => x.date), ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
    assert.equal(d[0].dow, 2);
    assert.equal(C.days('', 2, '2026-12-31T10:00:00')[1].date, '2027-01-01');
});

test('saved answers: setup, vibe, needs, kitchen and the start day load safely; a new week clears the start', () => {
    const s = C.load(JSON.stringify({ wk: '2026-W44', setup: true, vibe: ['quick', 'bogus', 'quick'], diet: ['veg'], kit: ['air'], start: '2026-10-27' }), '2026-W44');
    assert.equal(s.setup, true); assert.deepEqual(s.vibe, ['quick']); assert.deepEqual(s.diet, ['veg']); assert.deepEqual(s.kit, ['air']); assert.equal(s.start, '2026-10-27');
    const d = C.load('{}', '2026-W44'); assert.equal(d.setup, false); assert.deepEqual(d.kit, ['hob', 'oven']); assert.deepEqual(d.vibe, []);
    const n = C.load(JSON.stringify({ wk: '2026-W43', setup: true, start: '2026-10-20' }), '2026-W44'); assert.equal(n.start, ''); assert.equal(n.setup, true, 'your answers stay; only the week renews');
    assert.equal(C.load('{"start":"x"}', '2026-W44').start, '');
});

test('six vegetarian dinners make "Vegetarian" a real week; all low-spike, priced names, recipe-ready', () => {
    assert.equal(C.EXTRA.length, 6);
    assert.equal(C.pool(C.EXTRA).length, 6, 'the UI adds them to the Cook dinners and the usual pool rule takes all six');
    assert.equal(C.pool([]).length, 0, 'the extras never leak into the Cook pool on their own');
    C.EXTRA.forEach(r => {
        const p = C.profile(r);
        assert.ok(p.veg, r.n + ' is vegetarian'); assert.equal(r.r, 'ja'); assert.equal(r.c, 'meal');
        assert.ok(r.ing.length >= 7 && r.prep.length && r.make.length >= 3 && r.min > 0, r.n);
        assert.ok(!/rice|pasta|potato|bread|noodle|flour|sugar/i.test(r.ing.map(i => i.n).join(' ').replace(/No-added-sugar/g, '')), r.n + ' has no starchy staple');
    });
    assert.ok(C.EXTRA.some(r => !C.profile(r).dairy), 'one veggie dinner is also dairy-free');
    const rows = Function('return ' + wb.match(/W\.LowiWeekFlowLang = (\[[\s\S]*?\]);\n/)[1])();
    const en = new Set(rows.filter(x => x[1] && x[2]).map(x => x[0]));
    C.EXTRA.forEach(r => [r.n, r.sub].concat(r.prep, r.make).forEach(t => assert.ok(en.has(t), 'translated to German and Spanish: ' + t)));
});

test('the UI: one question per screen, a tap answers it, and the week is calm', () => {
    assert.match(wb, /const STEPS = \['store', 'people', 'budget', 'vibe', 'diet', 'kit'\]/);
    assert.match(wb, /a === 'a_store' \|\| a === 'a_people'[^\n]*qGo\(1\)/, 'a single answer moves on by itself');
    assert.match(wb, /STEPS\[step\] === 'kit' \? makeWeek\(\)/);
    assert.match(wb, /Leave it with/); assert.match(wb, /prefers-reduced-motion: reduce\)'\)\.matches/);
    assert.match(wb, /'Tonight', 'Heute Abend', 'Esta noche'/);
    assert.match(wb, /function weekHTML[\s\S]*'Shopping list', 'Einkaufsliste'/);
    assert.match(wb, /function listHTML[\s\S]*Put it in my Cart[\s\S]*Copy or share the list[\s\S]*Order it to your door/, 'the list keeps Cart, copy and delivery, on its own page');
    assert.match(wb, /S\.setup \? 'week' : 'q'/, 'answered once, then it opens on the week');
    assert.match(wb, /C\.fits\(prof\[id\], S\.diet, S\.kit\)/); assert.match(wb, /C\.freshFirst/);
    assert.match(wb, /P2\.register\(/, 'the veggie dinners open in the recipe viewer');
    assert.ok(!/Misty/.test(wb), 'the companion name is the user\'s');
    assert.ok(!/insulin/i.test(wb + core));
    assert.ok(!/wbNights|wb-sum|wb-dins/.test(wb.slice(wb.indexOf('function weekHTML'), wb.indexOf('function listHTML'))), 'the week page dropped the old settings, total bar and grocery list');
});

test('the CSS: big calm tiles, 44pt targets, reduced motion respected', () => {
    assert.match(css, /\.wb-tile \{[\s\S]*?min-height: 76px/);
    assert.match(css, /\.wb-swap \{[^}]*width: 44px; height: 44px/);
    assert.match(css, /\.wb-back, \.wb-back-sp \{[^}]*width: 44px; height: 44px/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.wb-orb i \{ animation: none/);
});

test('no meat twice in a week ("same meat every day"): beef, turkey, chicken, salmon, shrimp each once while the pool allows', () => {
    const mk = (id, ...ing) => ({ id, r: 'ja', c: 'meal', ing: ing.concat([['gemuese', 'Zucchini'], ['wuerze', 'Oregano']]).map(([g, n]) => ({ g, n })) });
    assert.deepEqual(C.meats(mk('x', ['hack', 'Lean beef mince'])), ['beef']);
    assert.deepEqual(C.meats(mk('x', ['eier', 'Eggs'], ['huhn', 'Chicken'])), ['chicken'], 'chicken hiding behind eggs still counts');
    assert.deepEqual(C.meats(mk('x', ['eier', 'Eggs'], ['huhn', 'Shrimp'])), ['shrimp']);
    assert.deepEqual(C.meats(mk('x', ['hack', 'Beef mince or patties'])), ['beef']);
    assert.deepEqual(C.meats(mk('x', ['kaese', 'Halloumi'])), []);
    assert.deepEqual(C.weekKeys(mk('x', ['hack', 'Turkey mince'])), ['hack', 'meat:turkey']);
    const P = [mk('b1', ['hack', 'Lean beef mince']), mk('b2', ['hack', 'Beef mince or patties']), mk('b3', ['hack', 'Lean beef mince']), mk('b4', ['hack', 'Lean beef mince']),
        mk('t1', ['hack', 'Turkey mince']), mk('t2', ['hack', 'Turkey mince']), mk('c1', ['huhn', 'Chicken']), mk('c2', ['eier', 'Eggs'], ['huhn', 'Chicken']), mk('c3', ['huhn', 'Chicken']),
        mk('s1', ['huhn', 'Salmon']), mk('e1', ['eier', 'Eggs']), mk('k1', ['kaese', 'Halloumi']), mk('k2', ['kaese', 'Feta']), mk('e2', ['eier', 'Eggs'], ['kaese', 'Feta'])];
    const by = {}; P.forEach(r => { by[r.id] = r; }); const ids = P.map(r => r.id), ko = id => C.weekKeys(by[id]);
    const repeats = p => { const n = {}; return p.some(id => C.meats(by[id]).some(k => (n[k] = (n[k] || 0) + 1) > 1)); };
    for (let s = 0; s < 40; s++) {
        [5, 7].forEach(nights => {
            const p = C.plan(ids, nights, 'w#' + s, null, ko);
            assert.equal(p.length, nights); assert.ok(!repeats(p), 'no meat twice: ' + p);
            for (let i = 0; i < nights; i++) { const q = C.swap(p, i, ids, 'w#' + s, ko); assert.ok(!repeats(q), 'swap keeps every meat once: ' + q); }
        });
    }
    const cheap = { b1: 1, b2: 1, b3: 1, b4: 1 }, build = p => ({ sum: p.reduce((a, id) => a + (cheap[id] || 9), 0), cost: id => cheap[id] || 9 });
    const f = C.fitBudget(['t1', 'c1', 's1', 'e1', 'k1'], ids, 5, build, 0, ko);
    assert.ok(!repeats(f.plan), 'fitting the budget never brings back the same meat: ' + f.plan);
    assert.equal(C.plan(['b1', 'b2', 'b3'], 3, 'x', null, ko).length, 3, 'a pool of only beef still fills the week');
});

test('every veggie dinner has its main ingredient in what you buy (the name\'s food is on the list)', () => {
    const FOODS = [/\begg/i, /feta/i, /halloumi/i, /zucchini/i, /ricotta/i, /mushroom/i, /cauliflower/i, /cabbage/i];
    C.EXTRA.forEach(r => {
        const ing = r.ing.map(i => Array.isArray(i) ? i[1] : i.n).join(' | ');
        FOODS.forEach(rx => { if (rx.test(r.n)) assert.ok(rx.test(ing), r.n + ' lists ' + rx); });
        assert.ok(C.main(r), r.n + ' has a main (eggs or cheese)');
    });
});
