// Oct 25 2026, Emmanuel (voice note): "after they log their meal and also if they just ate it ... one of those instant
// reduction tips checklist which they get extra points for ... Secret achievement." Right after a meal logged as eaten just now,
// a small glass card offers four quick spike-lowering actions. Each tick inside 60 minutes pays XP once through the normal
// award() ledger, capped per meal and per day; the first full checklist unlocks a hidden achievement. One tap skips it, it never
// blocks logging, and it sends no push, no Community post and no What's New. These tests keep that behavior.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require(path.join(root, 'after-meal-checklist-core.js'));
const ui = fs.readFileSync(path.join(root, 'after-meal-checklist.js'), 'utf8');
const coreSrc = fs.readFileSync(path.join(root, 'after-meal-checklist-core.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'after-meal-checklist.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const MIN = 60000, T0 = Date.UTC(2026, 9, 25, 11, 0, 0);
const day = C.dayKey(T0);
const meal = (o) => Object.assign({ id: 'meal:abc', title: 'Chicken salad', ts: T0, ateSet: false, via: 'spirit', spike: false, xp: 15 }, o || {});

test('four evidence-based actions, in order, each with a label and a short why in English, German and Spanish', () => {
    /* Oct 25 evening (Emmanuel): the glass of water was removed and replaced by stairs up and down (tests/after-meal-honest.test.cjs) */
    assert.deepStrictEqual(C.ITEMS.map(i => i.id), ['walk', 'muscle', 'stairs', 'upright']);
    for (const it of C.ITEMS) for (const f of ['l', 's']) {
        assert.strictEqual(it[f].length, 3, it.id + '.' + f + ' has en/de/es');
        it[f].forEach((v, k) => { assert.ok(typeof v === 'string' && v.trim().length > 2, it.id + '.' + f + '[' + k + ']'); assert.ok(v.length <= 30, it.id + '.' + f + '[' + k + '] fits a tile: ' + v); });
        assert.notStrictEqual(it[f][1], it[f][0], it.id + '.' + f + ' German is translated');
        assert.notStrictEqual(it[f][2], it[f][0], it.id + '.' + f + ' Spanish is translated');
    }
    for (const it of C.ITEMS) assert.ok(it.src && it.src.length > 8, it.id + ' names its source');
    assert.match(coreSrc, /Reynolds/); assert.match(coreSrc, /Buffey/); assert.match(coreSrc, /Hamilton/); assert.match(coreSrc, /Dempsey/);
});

test('every UI string exists in English, German and Spanish', () => {
    for (const k of Object.keys(C.STR.en)) for (const l of ['de', 'es']) assert.ok(typeof C.STR[l][k] === 'string' && C.STR[l][k].trim(), l + '.' + k);
    for (const k of ['title', 'sub', 'subSpike', 'skip', 'left', 'cap', 'done', 'achHead', 'achName', 'achText']) assert.ok(C.STR.en[k], k);
    assert.strictEqual(C.t('de', 'left', { m: 12 }), 'noch 12 Min.');
    assert.strictEqual(C.t('es', 'left', { m: 5 }), 'quedan 5 min');
    assert.strictEqual(C.t('xx', 'left', { m: 5 }), '5 min left');
});

test('only a meal eaten just now opens it: not a backdated meal, not a plan, not a log without a time', () => {
    assert.ok(C.justAte(meal(), T0 + 2000));
    assert.ok(C.justAte(meal({ ateSet: true, ts: T0 - 60000 }), T0), 'tapping "Now" again is still now');
    assert.ok(C.justAte(meal({ spike: true, xp: 0 }), T0), 'a spiky meal gets it too: that is when it helps most');
    assert.ok(!C.justAte(meal({ ateSet: true, ts: T0 - 30 * MIN }), T0), '30 min ago is not just now');
    assert.ok(!C.justAte(meal({ ts: T0 - 6 * MIN }), T0));
    assert.ok(!C.justAte(meal({ ts: T0 + 3 * 3600000 }), T0), 'a meal set in the future');
    assert.ok(!C.justAte(meal({ via: 'plan' }), T0));
    assert.ok(!C.justAte(meal({ ts: undefined }), T0));
    assert.ok(!C.justAte(meal({ id: '' }), T0));
    assert.ok(!C.justAte(null, T0));
});

test('ticks pay 3 XP each, once per action and meal, only inside 60 minutes of the meal', () => {
    const p = C.pending(meal(), T0);
    assert.deepStrictEqual(C.decide([], p, 'walk', T0 + 15 * MIN), { ok: true, xp: 3, why: 'ok', eventId: 'pmc:meal:abc:walk' });
    const L = [{ day, ts: T0 + 15 * MIN, amt: 3, src: C.SRC, eventId: 'pmc:meal:abc:walk' }];
    assert.strictEqual(C.decide(L, p, 'walk', T0 + 16 * MIN).why, 'dup');
    assert.strictEqual(C.decide(L, p, 'stairs', T0 + 59 * MIN).xp, 3);
    assert.deepStrictEqual(C.decide(L, p, 'stairs', T0 + 61 * MIN), { ok: false, xp: 0, why: 'late', eventId: 'pmc:meal:abc:stairs' });
    assert.strictEqual(C.decide(L, p, 'nap', T0).why, 'unknown');
    assert.strictEqual(C.decide(L, null, 'walk', T0).why, 'unknown');
    assert.strictEqual(C.XP_EACH * C.ITEMS.length, 12, 'a meal pays at most 12 XP');
    assert.ok(C.XP_EACH < 15, 'less than the meal itself');
});

test('a day pays checklists for three meals at most, so logging more meals cannot farm points', () => {
    const L = [];
    for (const m of ['meal:a', 'meal:b', 'meal:c']) for (const it of C.ITEMS) L.push({ day, ts: T0, amt: 3, src: C.SRC, eventId: C.eventId(m, it.id) });
    assert.strictEqual(C.paidMeals(L, day).length, 3);
    const p4 = C.pending(meal({ id: 'meal:d' }), T0);
    assert.deepStrictEqual(C.decide(L, p4, 'walk', T0 + MIN), { ok: false, xp: 0, why: 'cap', eventId: 'pmc:meal:d:walk' });
    const L2 = L.slice(0, -1);
    assert.strictEqual(C.decide(L2, C.pending(meal({ id: 'meal:c' }), T0), 'upright', T0 + MIN).xp, 3, 'a meal that already paid today keeps paying its own items');
    assert.strictEqual(C.paidMeals(L, '2026-10-26').length, 0, 'a new day starts again');
    const old = L.map(e => Object.assign({}, e, { day: '2026-10-24', ts: T0 - 86400000 }));
    assert.strictEqual(C.decide(old, p4, 'walk', T0 + MIN).xp, 3);
});

test('the secret achievement unlocks once, on the first full checklist, and is hidden before', () => {
    assert.ok(!C.achEarned([]));
    assert.ok(!C.shouldUnlock([], ['walk', 'muscle', 'stairs']));
    assert.ok(C.shouldUnlock([], ['walk', 'muscle', 'stairs', 'upright']));
    assert.ok(C.shouldUnlock([], ['upright', 'stairs', 'walk', 'muscle', 'walk']));
    const L = [{ day, ts: T0, amt: C.ACH.xp, src: C.SRC, eventId: C.ACH.eventId }];
    assert.ok(C.achEarned(L));
    assert.ok(!C.shouldUnlock(L, ['walk', 'muscle', 'stairs', 'upright']), 'only once');
    assert.strictEqual(C.ACH.eventId, 'pmc:ach:spike-tamer');
    assert.ok(C.ACH.xp > 0 && C.ACH.xp <= 25);
    /* the card never names or hints the achievement until it is earned */
    assert.doesNotMatch(ui, /achLocked|\?\?\?|lock-hint/);
    assert.match(ui, /shouldUnlock\(/);
});

test('the ledger labels count as "other" for the sun meter, not as a second walk, water or meal', () => {
    for (const l of [C.LABEL, C.ACH.label]) {
        assert.doesNotMatch(l.toLowerCase(), /water|wasser|agua|hydrat|move|walk|workout|steps|dance|yoga|stretch|fast|scan|capture|product|dex/);
    }
    assert.doesNotMatch(C.SRC, /^meal|^tap$|^combo$/);
});

test('the time left and the window close: shown in minutes, the card ends after 60 minutes', () => {
    const p = C.pending(meal(), T0);
    assert.strictEqual(C.minsLeft(p, T0), 60);
    assert.strictEqual(C.minsLeft(p, T0 + 59.5 * MIN), 1);
    assert.strictEqual(C.minsLeft(p, T0 + 61 * MIN), 0);
    assert.ok(C.open(p, T0 + 30 * MIN));
    assert.ok(!C.open(p, T0 + 61 * MIN));
    assert.ok(!C.open(Object.assign({}, p, { skip: true }), T0 + MIN), 'skipped stays closed');
    assert.ok(!C.open(Object.assign({}, p, { done: ['walk', 'muscle', 'water', 'upright'], fin: true }), T0 + MIN), 'finished closes');
    assert.ok(!C.open(null, T0));
});

test('wired in quietly: listens to the logged meal, awards through the ledger, no push, no post, no What\'s New', () => {
    assert.match(html, /<script src="after-meal-checklist-core\.js\?v=[\w-]+"><\/script>/);
    assert.match(html, /<script src="after-meal-checklist\.js\?v=[\w-]+"><\/script>/);
    assert.match(html, /<link rel="stylesheet" id="pmcCss" href="after-meal-checklist\.css\?v=[\w-]+">/);
    for (const f of ['after-meal-checklist-core.js', 'after-meal-checklist.js', 'after-meal-checklist.css']) assert.ok(sw.includes('"' + f + '"'), 'sw caches ' + f);
    assert.match(ui, /addEventListener\('lowi:meal-logged'/);
    assert.match(ui, /addEventListener\('lowi:meal-removed'/);
    assert.match(ui, /awardWith\(/);
    assert.match(ui, /unaward\(/);
    assert.doesNotMatch(ui, /showNotification|Notification\.|pushManager|LowiPush|postMessage\(|sendMessage|news\.json|LowiNews|community/i);
    const news = fs.readFileSync(path.join(root, 'version.json'), 'utf8');   /* What's New lives in version.json (scripts/bump-build.cjs --news) */
    assert.doesNotMatch(news, /spike tamer|after-meal checklist|Spike-B\u00e4ndiger/i);
});

test('the card is light: non-modal, one tap skips, every target is at least 44 pt, it hides behind sheets', () => {
    assert.doesNotMatch(ui, /setAttribute\(\s*'aria-modal'/, 'the card itself is never a modal dialog');
    assert.match(ui, /data-pmc="skip"/);
    assert.match(ui, /role="checkbox"/);
    assert.match(ui, /aria-checked/);
    assert.match(ui, /\.r2-ov\.on/);
    assert.match(css, /\.pmc-x\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/);
    assert.match(css, /\.pmc-it\s*\{[^}]*min-height:\s*(4[4-9]|[5-9]\d)px/);
    assert.match(css, /backdrop-filter/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /prefers-reduced-motion/);
});
