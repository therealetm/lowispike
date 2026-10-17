/* Cell guide (Oct 17, 2026). E-man: in a world the top toast ("Got one", "I am almost in", "Warmer") covered the Daily Quest
   and wasn't the app's look, and the little cell beside Misty said two or three things and then nothing. Now the CELL guide says
   the hunt lines itself in its own bubble, placed clear of the Daily Quest / controls / Misty, and keeps teaching. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../region-pals-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('the guide says every hunt line in its own voice, in all three languages, with Misty named', () => {
    for (const key of Object.keys(C.HUNT)) for (const li of [0, 1, 2]) {
        const L = C.huntLine(key, li, { n: 'Clover Leaf', left: 3, L: 4, k: 5, d: [0.5, 0.5] });
        assert.ok(L && L.text, key + ' ' + li);
        assert.ok(!/\{\w\}/.test(L.text), 'no leftover placeholder: ' + L.text);
        assert.ok(L.prio >= 1 && L.prio <= 3);
    }
    assert.strictEqual(C.huntLine('found', 'en', { n: 'Clover Leaf', left: 3 }).text, 'Clover Leaf got one! 3 left in this world.');
    assert.strictEqual(C.huntLine('found', 'en', { n: 'Misty', left: 1 }).text, 'Misty got one! Just one left here.');
    assert.strictEqual(C.huntLine('level', 'de', { n: 'Misty', L: 4 }).text, 'Level up! Misty ist jetzt Level 4 und ein bisschen st\u00e4rker.');
    assert.ok(C.huntLine('sense', 'es', { n: 'Misty', k: 6 }).text.includes('6 migas'));
    assert.strictEqual(C.huntLine('bounce', 'en', {}), null, 'the bounce happens before you are in a world: not the guide\'s line');
    assert.ok(C.huntLine('clean', 'en').prio > C.huntLine('warm', 'en').prio, 'the last crumb matters more than "warmer"');
    for (const k of Object.keys(C.GUIDE)) assert.strictEqual(C.GUIDE[k].length, 3, k);
});

test('game, not body: the guide says so plainly and never claims playing changes your health', () => {
    assert.ok(/only exist in the game/.test(C.GUIDE.real[0]) && /nichts in deinem echten K\u00f6rper/.test(C.GUIDE.real[1]) && /solo existen en el juego/.test(C.GUIDE.real[2]));
    const all = JSON.stringify([C.GUIDE, C.MORE]).toLowerCase();
    for (const w of ['cure', 'heal', 'heil', 'treat', 'diagnos', 'medic', 'prevent', 'lowers your blood', 'removes sugar', 'burns sugar from your', 'xp']) assert.ok(!all.includes(w), w);
    const js = read('region-pals.js');
    assert.ok(/key === 'found' && !realSaid/.test(js), 'said once a session, after the first catch');
});

test('it keeps teaching: three more facts per place, said once each, then quiet', () => {
    for (const id of C.IDS) {
        assert.strictEqual(C.MORE[id].length, 3, id);
        for (const f of C.MORE[id]) { assert.strictEqual(f.length, 3); f.forEach(t => assert.ok(t.length > 20 && t.length < 130, t)); }
    }
    assert.strictEqual(C.nextFact(5, new Set([1, 2]), 1), 3);
    assert.strictEqual(C.nextFact(3, new Set([1, 2]), 1), null, 'all said: nothing new, so it stays quiet');
    const js = read('region-pals.js');
    assert.ok(/st\.visit <= 1 \? 7000 : 26000\) \|\| st\.visit >= 7/.test(js), 'only after a quiet spell, a few per visit');
    assert.ok(/if \(!greeted\[id\]\)/.test(js), 'one hello per place per session; coming back starts with something new');
    assert.ok(!/localStorage/.test(js), 'session memory only');
});

test('direction words: screen x right / y up into eight directions', () => {
    assert.strictEqual(C.dirIndex(0, 1), 0); assert.strictEqual(C.dirIndex(1, 1), 1); assert.strictEqual(C.dirIndex(1, 0), 2);
    assert.strictEqual(C.dirIndex(0, -1), 4); assert.strictEqual(C.dirIndex(-1, 0), 6); assert.strictEqual(C.dirIndex(-1, 1), 7);
    assert.strictEqual(C.guide('dir', 'en', { d: [-1, 0.1] }), 'Try to the left. The fog looks thicker over there.');
});

test('placement: never on the Daily Quest, the controls or Misty; stays on screen; does not flap', () => {
    const view = { w: 390, h: 844, top: 6, bottom: 6 }, b = { w: 240, h: 80 };
    const quest = { l: 60, t: 55, r: 330, b: 139, w: 3 }, pad = { l: 100, t: 690, r: 290, b: 800, w: 2 };
    /* guide just under the quest: above would cover it, so it goes below */
    let r = C.place({ x: 140, y: 190 }, b, [quest, pad], view, null);
    assert.strictEqual(r.spot[0], 'b'); assert.strictEqual(C.overlap(r, quest), 0);
    /* guide near the controls: above */
    r = C.place({ x: 200, y: 640 }, b, [quest, pad], view, null);
    assert.strictEqual(r.spot[0], 'a'); assert.strictEqual(C.overlap(r, pad), 0);
    /* right edge: slides in, never off screen */
    r = C.place({ x: 380, y: 400 }, b, [], view, null);
    assert.ok(r.l >= 10 && r.r <= 380, JSON.stringify(r));
    /* small gain: keeps its spot */
    const a = C.place({ x: 200, y: 400 }, b, [], view, null), k = C.place({ x: 200, y: 400 }, b, [], view, 'al');
    assert.strictEqual(a.spot, 'ar'); assert.strictEqual(k.spot, 'al');
    /* phone sideways: the quest band at the top still wins over a little overlap elsewhere */
    r = C.place({ x: 420, y: 150 }, { w: 300, h: 60 }, [{ l: 280, t: 10, r: 560, b: 90, w: 3 }], { w: 844, h: 390, top: 6, bottom: 6 }, null);
    assert.strictEqual(C.overlap(r, { l: 280, t: 10, r: 560, b: 90 }), 0);
});

test('a real speech bubble: the tail always points back at the guide that is talking', () => {
    const view = { w: 390, h: 844, top: 6, bottom: 6 }, b = { w: 240, h: 80 };
    for (const pal of [{ x: 40, y: 400 }, { x: 200, y: 400 }, { x: 370, y: 400 }]) for (const s of C.SPOTS) {
        const q = C.spotRect(s, pal, b, view);
        if (s[0] === 's') assert.ok(Math.abs(q.t + q.tail - pal.y) < 1, s);
        else if (pal.x - q.l >= 18 && pal.x - q.l <= b.w - 18) assert.ok(Math.abs(q.l + q.tail - pal.x) < 1, s + ' ' + pal.x);
    }
    /* the guide sits between the Daily Quest and Misty (it keeps that low while it talks): clear of both */
    const quest = { l: 60, t: 55, r: 330, b: 139, w: 3 }, misty = { l: 104, t: 338, r: 196, b: 430, w: 4 };
    const r = C.place({ x: 200, y: 300 }, b, [quest, misty], view, null);
    assert.ok(/st\.cur && st\.size \? st\.size\.h \+ 12/.test(read('region-pals.js')), 'keeps room for its bubble under the quest');
    assert.strictEqual(C.overlap(r, quest) + C.overlap(r, misty), 0, JSON.stringify(r));
    /* short landscape phone: the Daily Quest still stays clear */
    const lq = { l: 200, t: 61, r: 640, b: 133, w: 5 }, lm = { l: 348, t: 210, r: 440, b: 302, w: 4 };
    const lr = C.place({ x: 284, y: 217 }, { w: 300, h: 72 }, [lq, lm], { w: 844, h: 390, top: 6, bottom: 6 }, null);
    assert.strictEqual(C.overlap(lr, lq) + C.overlap(lr, lm), 0, JSON.stringify(lr));
    const css = read('region-pals.css');
    assert.ok(/\.rp-say::before \{[^}]*left: calc\(var\(--tail\) - 7px\)/.test(css) && /\.rp-s-sl \.rp-say::before/.test(css));
    assert.ok(/setProperty\('--tail'/.test(read('region-pals.js')));
});

test('Misty\'s own line is a speech bubble coming out of her, never on the Daily Quest', () => {
    const P = require('../praise.js'), v = { w: 390, h: 844, top: 8 }, b = { w: 230, h: 40 };
    const quest = { left: 60, top: 55, right: 330, bottom: 139 };
    const low = P.place({ x: 195, top: 420, bottom: 520 }, b, quest, v);
    assert.ok(low.up && low.t + b.h <= 420 && Math.abs(low.l + low.tail - 195) < 1);
    const high = P.place({ x: 195, top: 150, bottom: 250 }, b, quest, v);
    assert.ok(!high.up && high.t >= 250, 'drops below her instead of covering the quest');
    const edge = P.place({ x: 30, top: 150, bottom: 250 }, b, null, v);
    assert.ok(edge.l >= 10 && edge.tail >= 18 && edge.tail <= b.w - 18);
    const css = read('sun-meter.css'), js = read('praise.js');
    assert.ok(/\.lp-praise\.lp-up::after/.test(css) && /\.lp-praise\.lp-said \{ transform: none !important; \}/.test(css));
    assert.ok(/getElementById\('spBubble'\)/.test(js) && /LowiMistyFlight/.test(js));
});

test('timing: readable, never forever; a more important line can cut in sooner', () => {
    assert.ok(C.showMs('Warmer! One is close, keep going.', 'hunt') >= 3000 && C.showMs('x'.repeat(400), 'hunt') <= 7000);
    assert.ok(C.showMs('x'.repeat(400), 'fact') <= 11000);
    assert.ok(C.minRead('a line here', 1, 3) < C.minRead('a line here', 1, 1));
});

test('wiring: hunt lines go to the guide first; the toast is only the fallback, and drops below the Daily Quest', () => {
    const hunt = read('misty-hunt.js'), pals = read('region-pals.js'), praise = read('praise.js'), css = read('region-pals.css'), sm = read('sun-meter.css');
    assert.ok(/G\.hunt\(key, v \|\| \{\}, world \|\| H\.id\)\) return;/.test(hunt), 'guide first');
    assert.ok(/if \(!STR\[key\]\) return;/.test(hunt), 'guide-only lines never become a toast');
    for (const k of ['sense', 'level', 'clean', 'full', 'found', 'warm', 'bounce', 'entered']) assert.ok(new RegExp("say\\('" + k + "'").test(hunt), k);
    assert.ok(!/(^|[^.\w])say\(tr\(/m.test(hunt), 'no pre-translated toast text left');
    assert.ok(/toward,\s*(tally,\s*)?state:/.test(hunt) && /function toward\(\)/.test(hunt));
    assert.ok(/H\.t - H\.autoChk > 2/.test(hunt), 'autopilot check every 2 s, not per frame');
    assert.ok(/if \(steer && d < eatR\) eatBit/.test(hunt), 'hunt rule kept: she only eats while you steer');
    assert.ok(/#f3Board/.test(pals) && /\[data-guide-avoid\]/.test(pals) && /#tabbar/.test(pals) && /#whPad/.test(pals));
    assert.ok(/now - st\.obsT < 600/.test(pals) && /now - st\.placeT < 160/.test(pals), 'layout reads cached / throttled');
    assert.ok(/if \(world && C\.pid\(world\) !== st\.id\) return false;/.test(pals), 'no stale line from another world');
    assert.ok(/getElementById\('f3Board'\)/.test(praise) && /quest\.bottom \+ 8/.test(praise));
    assert.ok(/\.rp-say \{[^}]*top: -120px; bottom: auto;/.test(css) && /\.rp-s-bl \.rp-say/.test(css) && /-webkit-line-clamp: 6/.test(css));
    assert.ok(/\.lp-praise \{ background: radial-gradient[^}]*linear-gradient\(160deg, rgba\(60,140,240,\.42\), rgba\(14,40,104,\.82\)\)/.test(sm), 'toast in the same blue glass');
    assert.ok(/const orb = \(g, rgb, rim\)/.test(hunt), 'crumbs drawn as glass bubbles');
});
