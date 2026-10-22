/* Oct 19 (E-man, walking through the companion card): "Don't use the word spirit." Adventure places "should only be unlocked
   if the person went there themselves ... and also depending on ... at what level their companion is." "How do you feel? Why is
   that there?" Forms and Collection were "hidden". Collection: "I don't even understand what collection is for" (he let Maya
   decide: a food journal, never needed to evolve). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const A = require('../adventure-tiers.js');
const HQ = require('../herb-quests-core.js');

test('no place name or description says spirit, in any language', () => {
    for (const t of A.TIERS) for (const s of t.n.concat(t.d)) assert.doesNotMatch(s, /spirit|geist|esp[ií]ritu/i, s);
    assert.deepEqual(A.TIERS.map(t => t.n[0]), ['Home world', 'Cell worlds', 'Galaxy', 'Other worlds', 'Streams']);
});

test('user-visible copy elsewhere no longer says spirit (Community title, onboarding, tutorial, a herb line)', () => {
    assert.doesNotMatch(R('community-chat.js').match(/square:\[[^\]]*\]/)[0], /spirit|geist|esp[ií]ritu/i);
    assert.doesNotMatch(R('herb-start.js'), /spirit world|Geisterwelt|mundo espiritual/);
    const tut = R('tutorial-steps.js'); const st = tut.slice(tut.indexOf("id: 'spirit'"), tut.indexOf("id: 'spirit'") + 700);
    assert.doesNotMatch(st, /spirit world|Geisterwelt|mundo espiritual|The spirit/);
    assert.doesNotMatch(R('herb-tamagotchi-core.js'), /travel in spirit/);
});

test('a place needs BOTH her level and your own visit; level alone is not enough', () => {
    assert.equal(A.tierOf(6, {}), 0, 'level 6 but never went anywhere: home world only');
    assert.equal(A.tierOf(2, { cells: 1, atmos: 1, bubbles: 1, streams: 1 }), 0, 'went everywhere but level 2: home world only');
    assert.equal(A.tierOf(3, { cells: 1 }), 1);
    assert.equal(A.tierOf(6, { cells: 1, atmos: 1 }), 2, 'stops where you have not been');
    assert.equal(A.tierOf(4, { cells: 1, atmos: 1, bubbles: 1 }), 2, 'stops where her level stops');
    assert.equal(A.tierOf(6, { cells: 1, streams: 1 }), 2, 'riding a stream means you were out in the galaxy (atmos), not inside the other worlds');
});

test('autopilot and your own flying are never gated (no lock that stops a first visit)', () => {
    assert.equal(A.capsFor('auto', 1, {}).streams, true);
    assert.equal(A.capsFor('trip', 6, {}).cells, false);
    assert.equal(A.capsFor('trip', 6).streams, true, 'old callers without visits keep level-only behaviour');
});

test('only your own flying marks a visit: autopilot or her trip never does, and a visit is never lost', () => {
    assert.equal(A.mark({}, 'atmos', 'auto').added, false);
    assert.equal(A.mark({}, 'atmos', 'trip').added, false);
    const r = A.mark({}, 'atmos', '', 500); assert.equal(r.added, true); assert.equal(r.seen.atmos, 500);
    assert.equal(A.mark(r.seen, 'atmos', '', 900).seen.atmos, 500, 'the first visit is kept');
    assert.equal(A.mark({}, 'local', '').added, false, 'home world needs no visit');
});

test('existing progress: a cell-world arrival already in the ledger counts as your visit', () => {
    assert.ok(A.seedFromLedger({}, [{ eventId: 'discover:region-liver', ts: 42 }]).cells);
    assert.equal(A.seedFromLedger({}, [{ eventId: 'meal:1' }]).cells, undefined);
});

test('the card shows what each place still needs and whether you have been there', () => {
    const l = A.list(5, { cells: 1 });
    assert.equal(l[1].status, 'on'); assert.equal(l[1].been, true);
    assert.equal(l[2].status, 'locked'); assert.deepEqual(l[2].need, { level: false, visit: true, before: false });
    assert.deepEqual(A.list(3, {})[2].need, { level: true, visit: true, before: false });
    const js = R('adventure-tiers.js');
    assert.match(js, /Go there yourself/); assert.match(js, /You have been there/); assert.match(js, /Autopilot \(three taps on the controller\) always goes everywhere/);
    for (const ev of ['lowi:world-region', 'lowi:galaxy', 'lowi:galaxy-bubble', 'lowi:galaxy-stream']) assert.ok(js.includes("'" + ev + "'"), ev);
    assert.match(R('galaxy-bubbles.js'), /new CustomEvent\('lowi:galaxy-stream'/);
});

test('companion card: Forms and Glow come first, the mood check-in says what it does and comes last', () => {
    const js = R('misty-hub.js'), h = js.slice(js.indexOf('function html('), js.indexOf('function advHtml'));
    const doors = h.indexOf('mh-doors'), say = h.indexOf('mh-say');
    assert.ok(doors > 0 && doors < say, 'doors come before her words, right under the name');
    const scale = h.indexOf('scaleHtml()'), adv = h.indexOf('advHtml()'), mood = h.indexOf('mh-mood"');
    assert.ok(doors > 0 && doors < scale && scale < adv && adv < mood, 'doors, then energy, level, adventures, mood');
    assert.match(h, /data-mh="forms"/); assert.match(h, /data-mh="glow"/); assert.doesNotMatch(h, /Your scanned cards/);
    assert.match(h, /mirrors it: tired or unwell brings a calm, resting look/); assert.doesNotMatch(h.match(/'Optional\. For the next 8 hours ' \+ name\(\) \+ '[^']*'/)[0], /\b(she|her)\b/i, 'gender-neutral'); assert.match(h, /No XP/);
});

test('the foods tally (kept for XP and fair play): foods you logged or scanned, newest first, with how those meals went', () => {
    const rows = HQ.journal([{ t: 'Broccoli and salmon', ts: 10, lvl: 'low' }, { t: 'Broccoli pasta', ts: 20, lvl: 'high' }, { t: 'Hello there', ts: 30 }], [{ name: 'Oat flakes', ts: 15 }]);
    assert.deepEqual(rows.map(r => r.id), ['broccoli', 'pasta', 'oats', 'salmon']);
    const b = rows[0]; assert.equal(b.times, 2); assert.equal(b.first, 10); assert.equal(b.last, 20); assert.deepEqual(b.res, { low: 1, mild: 0, spike: 1 });
    assert.equal(rows.find(r => r.id === 'oats').scans, 1);
    assert.equal(HQ.resultOf({ r: 'nein' }), 'spike'); assert.equal(HQ.resultOf({ r: 'ja' }), 'low'); assert.equal(HQ.resultOf({ lvl: 'mild' }), 'mild'); assert.equal(HQ.resultOf({}), '');
});

test('foods and the journal are never needed to evolve', () => {
    const src = R('herb-quests-core.js'), steps = src.slice(src.indexOf('const STEPS'), src.indexOf('const STEPS') + 2500);
    assert.doesNotMatch(steps, /discover|journal|FOODS/);
    const sq = src.slice(src.indexOf('function specialQuests'), src.indexOf('function specialQuests') + 2500);
    assert.doesNotMatch(sq, /discover\(|journal\(/);
});

test('Oct 22: the Food journal is gone from the UI: Misty has two equal doors, nothing links to it, the tally stays', () => {
    const js = R('misty-hub.js'), h = js.slice(js.indexOf('function html('), js.indexOf('function advHtml'));
    const doors = h.slice(h.indexOf('mh-doors'), h.indexOf('</nav>'));
    assert.equal((doors.match(/<button /g) || []).length, 2, 'two doors: Forms and Glow');
    assert.doesNotMatch(js, /data-mh="collection"|k === 'collection'/);
    assert.match(R('misty-hub.css'), /\.mh-doors \{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
    for (const f of ['misty-hub.js', 'herb-quests.js', 'spirit.js', 'world-home.js', 'tutorial-steps.js', 'tutorial-voice-data.js'])
        assert.doesNotMatch(R(f).replace(/\/\*[\s\S]*?\*\//g, ''), /Food journal|food journal|Essens-Tagebuch|diario de comidas/i, f);
    const hq = R('herb-quests.js');
    assert.doesNotMatch(hq, /function dexHTML|function collectionHTML|hq-dexlink/);
    assert.equal(typeof HQ.journal, 'function'); assert.equal(typeof HQ.discover, 'function'); assert.equal(typeof HQ.newFoods, 'function');
});
