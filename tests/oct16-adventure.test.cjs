/* Oct 16: companion adventures (adventure.js core + misty-flight.js gravity pull / fall-in) and anti-cheat rules */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const A = require('../adventure.js');
const F = require('../misty-flight.js');
const ROOT = path.join(__dirname, '..');
const NOW = new Date(2026, 9, 16, 21, 0, 0).getTime();

test('a watched, completed visit earns exactly one find with a fixed id', () => {
    const r = A.award({}, { world: 'gut', stay: 30, adventure: true, now: NOW });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.find.id, 'adv:2026-10-16:gut');
    assert.ok(A.ITEMS.some(i => i.id === r.find.item));
    const again = A.award(r.state, { world: 'gut', stay: 300, adventure: true, now: NOW + 1000 });
    assert.deepStrictEqual([again.ok, again.why], [false, 'already-today'], 'stop/start or a second loop through the same world pays nothing');
});

test('anti-cheat: too short, not adventuring, the hub, junk ids and the day cap pay nothing', () => {
    assert.strictEqual(A.award({}, { world: 'gut', stay: A.RULES.minStay - 1, adventure: true, now: NOW }).why, 'too-short');
    assert.strictEqual(A.award({}, { world: 'gut', stay: 99, adventure: false, now: NOW }).why, 'not-adventuring');
    assert.strictEqual(A.award({}, { world: 'hub', stay: 99, adventure: true, now: NOW }).why, 'no-world');
    assert.strictEqual(A.award({}, { world: 'gut', stay: NaN, adventure: true, now: NOW }).why, 'too-short');
    let st = {};
    ['gut', 'liver', 'muscle', 'brain', 'pancreas', 'heart', 'extra'].forEach((w, i) => { const r = A.award(st, { world: w, stay: 40, adventure: true, now: NOW + i }); if (r.ok) st = r.state; });
    assert.strictEqual(A.today(st, NOW).length, A.RULES.perDay, 'at most ' + A.RULES.perDay + ' a day');
    assert.strictEqual(A.award(st, { world: 'heart', stay: 40, adventure: true, now: NOW }).why, 'day-cap');
    const tomorrow = A.award(st, { world: 'gut', stay: 40, adventure: true, now: NOW + 864e5 });
    assert.strictEqual(tomorrow.ok, true, 'a new day, new finds');
    const dup = A.norm({ finds: [st.finds[0], st.finds[0], { id: 'hack' }, null] });
    assert.strictEqual(dup.finds.length, 1, 'duplicated/synced/forged entries collapse');
    assert.strictEqual(A.award({}, { world: 'gu<t>', stay: 40, adventure: true, now: NOW }).find.world, 'gut');
});

test('finds are collectibles only: no XP, sunbeams, ledger or energy (no loops into other systems)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'adventure.js'), 'utf8');
    assert.ok(!/ledger|addXP|reward\(|lowi:reward|grantXp|xp\s*\+=/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'adventure.js never touches XP or the ledger');
    assert.ok(!/setInterval|getUserMedia|Notification|serviceWorker\.register/.test(src), 'no background timers, camera or notifications');
    const r = A.award({}, { world: 'gut', stay: 30, adventure: true, now: NOW });
    assert.deepStrictEqual(Object.keys(r.state), ['finds']);
});

test('gravity pull: slow start, accelerating fall, continuous shrink, she circles in', () => {
    const a = F.pullAt(0), m = F.pullAt(0.5), b = F.pullAt(1);
    assert.deepStrictEqual([a.size, a.rad, a.ang], [1, 1, 0]);
    assert.ok(m.size > 0.75 && m.size < 1, 'halfway she has only begun to shrink (gravity accelerates)');
    assert.ok(Math.abs(b.size - 0.25) < 1e-9 && Math.abs(b.rad - 0.25) < 1e-9 && b.ang > 2);
    let prev = 2; for (let t = 0; t <= 1.0001; t += 0.05) { const p = F.pullAt(t); assert.ok(p.size <= prev + 1e-12, 'never pops bigger'); prev = p.size; }
    const f0 = F.fallAt(0), f1 = F.fallAt(1);
    assert.deepStrictEqual([f0.size, f0.drop, f1.size, f1.drop], [0.3, 1, 1, 0], 'falls in small from above and grows as she lands');
    assert.ok(F.K.PULL >= 4 && F.K.ADV_SPEED <= 0.6 && F.K.ADV_STAY > F.K.STAY_IN, 'aquarium pace: slow pull, slower flight, longer stays');
    assert.ok(F.K.RECALL > 1, 'calling her back is quicker than her normal flight home');
    assert.strictEqual(F.autoLeave('auto', 35, 9, F.K.ADV_STAY), false, 'on an adventure she stays longer');
    assert.strictEqual(F.autoLeave('auto', 45, 9, F.K.ADV_STAY), true);
});

test('wiring: no button of its own (started from the controller), other companions and arrival cards stay quiet on an adventure, she never fully vanishes', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(/<script src="adventure\.js\?v=/.test(html));
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    assert.ok(/"adventure\.js"/.test(sw));
    /* Oct 16, E-man: no pill crammed next to the controller. No Adventure button, no adventure.css, nothing new on Today */
    assert.ok(!/adventure\.css/.test(html) && !/adventure\.css/.test(sw) && !fs.existsSync(path.join(ROOT, 'adventure.css')));
    const adv = fs.readFileSync(path.join(ROOT, 'adventure.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/createElement|lw-adv-btn|appendChild|innerHTML/.test(adv), 'adventure.js builds no UI');
    assert.ok(!/lw-adv-btn/.test(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')), 'What\'s New does not point at a button that is gone');
    /* the existing controller starts and ends it: double-tap = autopilot = adventure, touch = you steer, empty cell = recall */
    const pad = fs.readFileSync(path.join(ROOT, 'misty-pad.js'), 'utf8');
    assert.ok(/if \(m === 'auto'\) A\.start\(\); else if \(A\.on\) A\.stop\('abort'\)/.test(pad));
    assert.ok(/userMode\(st\.mode === 'auto' \? 'drive' : 'auto'\)/.test(pad), 'double-tap toggles through userMode');
    assert.ok(/A\.stop\('recall'\)/.test(pad), 'tapping her empty cell calls her back');
    /* Oct 17 (E-man): the explainer cell comes along as Misty's sidekick (it follows LowiMistyFlight.screen()), also on an adventure */
    assert.ok(/MF\.screen \? MF\.screen\(\)/.test(fs.readFileSync(path.join(ROOT, 'region-pals.js'), 'utf8')));
    assert.ok(/classList\.contains\('lw-adv'\)\) return null;/.test(fs.readFileSync(path.join(ROOT, 'arrival-cards.js'), 'utf8')));
    const mf = fs.readFileSync(path.join(ROOT, 'misty-flight.js'), 'utf8');
    /* Oct 18 (E-man: "when it move we don't see its eyes bc it's transparent"): tightened from "at least 45% visible" to fully solid */
    assert.ok(/S\.advWarp \? 1 : 1 - q/.test(mf), 'during the warp she stays fully visible (never see-through, so her face stays readable)');
    assert.ok(/W\.LowiAdventure\.stop\('steer'\)/.test(mf), 'steering the controller ends the adventure');
    assert.ok(/W\.LowiAdventure\.visited\(S\.flew, S\.advIn/.test(mf), 'finds come only from completed watched visits');
    assert.ok(/prefers-reduced-motion/.test(adv), 'reduced motion: no adventure');
});
