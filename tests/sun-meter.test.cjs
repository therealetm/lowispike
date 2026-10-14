// Sun meter: points only from counted ledger entries, one full reward per local day, garden trip + countdown, hooks present.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const SUN = require('../sun-meter.js');
const root = path.join(__dirname, '..');
const now = new Date(2026, 9, 15, 12, 0).getTime(), day = SUN.dayKey(now), yday = SUN.dayKey(now - 864e5);
const e = (src, amt, extra) => Object.assign({ ts: now - 6e5, day, amt, src, label: 'x' }, extra || {});

test('classifies the app\'s real ledger sources', () => {
    assert.equal(SUN.classify({ src: 'meal:spirit', label: 'Meal logged' }), 'meal');
    assert.equal(SUN.classify({ src: 'meal:plan', eventId: 'plan-meal:x' }), 'meal');
    assert.equal(SUN.classify({ src: 'water', label: 'Water logged' }), 'water');
    assert.equal(SUN.classify({ src: 'macro-goal', eventId: 'macro-goal:' + day + ':protein' }), 'macro');
    assert.equal(SUN.classify({ src: 'herb-care:dance', label: 'Walk done' }), 'move');
    assert.equal(SUN.classify({ src: 'scan:product', label: 'Product scanned' }), 'scan');
    assert.equal(SUN.classify({ src: 'fast:16', label: 'Fasting milestone' }), 'fast');
    assert.equal(SUN.classify({ src: 'sun-full', eventId: 'sun-full:' + day }), 'sun');
});

test('counted actions add points, the sun-full bonus and other days add nothing', () => {
    const ledger = [e('meal:spirit', 15), e('water', 2), e('water', 2), e('sun-full', 10, { eventId: 'sun-full:' + yday, day: yday }), e('meal:spirit', 15, { day: yday, ts: now - 864e5 })];
    const v = SUN.model({ now, ledger });
    assert.equal(v.raw, 3 + 1 + 1);
    assert.deepEqual(v.parts.meal, { n: 1, pts: 3 });
    assert.deepEqual(v.parts.water, { n: 2, pts: 2 });
    assert.equal(v.full, false);
    assert.equal(v.fullDone, false, 'yesterday\'s sun does not block today');
});

test('duplicate and capped meals never reach the ledger, so they add no points', () => {
    // the bridge returns xp 0 for dup/cap and pushes no ledger entry; a zero-amount entry would also count nothing
    const v = SUN.model({ now, ledger: [e('meal:spirit', 15), e('meal:spirit', 0)] });
    assert.equal(v.raw, 3);
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /const xp=n<this\.MEAL_CAP\?award\(15/, 'cap still gates the meal award');
    assert.match(html, /const twin=this\.mealDup\(data\);if\(twin\)return \{log:null,xp:0/, 'dup returns before any award');
});

test('full at the goal, capped display, and the day\'s reward is recorded once', () => {
    const ledger = [e('meal:spirit', 15), e('meal:spirit', 15), e('herb-care:dance', 10, { label: 'Move' }), e('water', 2), e('water', 2), e('macro-goal', 20)];
    let v = SUN.model({ now, ledger });
    assert.equal(v.raw, 3 + 3 + 4 + 1 + 1 + 2);
    assert.equal(v.points, SUN.GOAL);
    assert.equal(v.ratio, 1);
    assert.equal(v.full, true);
    assert.equal(v.fullDone, false);
    ledger.push(e('sun-full', 10, { eventId: 'sun-full:' + day }));
    v = SUN.model({ now, ledger });
    assert.equal(v.fullDone, true);
    assert.equal(v.raw, 14, 'the bonus itself is not a sunbeam');
});

test('garden trip: away with an h:mm countdown, then pending with one item', () => {
    const trip = { start: now - 10 * 60000, back: now + 50 * 60000, item: 'seed', got: false };
    let v = SUN.model({ now, ledger: [], garden: { trips: { [day]: trip }, items: [] } });
    assert.ok(v.away);
    assert.equal(SUN.fmtLeft(v.left), '0:50');
    assert.equal(SUN.fmtLeft(SUN.AWAY_MS), '1:00');
    assert.equal(SUN.fmtLeft(15000), '0:01', 'never shows 0:00 while still away');
    assert.equal(SUN.fmtLeft(125 * 60000), '2:05');
    v = SUN.model({ now: now + 51 * 60000, ledger: [], garden: { trips: { [day]: trip }, items: [] } });
    assert.equal(v.away, null);
    assert.equal(v.pending.length, 1);
    assert.equal(v.pending[0].item, 'seed');
    v = SUN.model({ now: now + 51 * 60000, ledger: [], garden: { trips: { [day]: Object.assign({}, trip, { got: true }) }, items: [{ id: 'seed', day }] } });
    assert.equal(v.pending.length, 0, 'collected trips do not come back twice');
});

test('the find is stable for a day and prefers new items', () => {
    assert.equal(SUN.pickItem(day, []), SUN.pickItem(day, []));
    const owned = SUN.ITEMS.slice(0, 9).map(i => ({ id: i.id }));
    assert.equal(SUN.pickItem(day, owned), SUN.ITEMS[9].id);
    assert.ok(SUN.ITEMS.every(i => i.n.length === 3 && i.n.every(Boolean)), 'every find is named in en/de/es');
});

test('runtime uses the ledger eventId, perDay award, one sheet per day and a non-blocking pop', () => {
    const src = fs.readFileSync(path.join(root, 'sun-meter.js'), 'utf8');
    assert.match(src, /eventId: 'sun-full:' \+ v\.key, perDay: 1/);
    assert.match(src, /lowi\.sun\.sheet/);
    assert.match(src, /if \(!got\) return;/, 'no sheet unless the award really happened');
    const css = fs.readFileSync(path.join(root, 'sun-meter.css'), 'utf8');
    assert.match(css, /\.ls-pop \{[^}]*pointer-events: none/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    new Function(src);
});

test('loader, service worker and build strings include the sun meter', () => {
    const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.match(ui, /'living-home\.js','sun-meter\.js','praise\.js'/);
    for (const f of ['sun-meter.js', 'sun-meter.css', 'praise.js']) assert.equal(sw.split('"' + f + '"').length - 1, 2, f + ' in both sw lists');
    const build = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).build;
    assert.ok(sw.includes('SHELL_BUILD = "' + build + '"') && sw.includes('lowispike-updates-' + build));
    assert.ok(ui.includes("const v='" + build + "'"));
});
