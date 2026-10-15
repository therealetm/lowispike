'use strict';
/* Oct 16, 2026: Home -> Community is one camera (galaxy-zoom.js), the galaxy has unique bots, the water bubble resets on a long press. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const Z = require('../galaxy-zoom.js');
const G = require('../community-galaxy.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function parse(t) { const m = /translate\(([-\d.]+)px,([-\d.]+)px\) scale\(([\d.]+)\)/.exec(t); return { x: +m[1], y: +m[2], s: +m[3] }; }

test('the pull-out keeps Misty and your orb on the same point for every frame', () => {
    const m = { x: 195, y: 388, r: 105 }, y = { x: 120, y: 520, r: 27 }, g = { left: 18, top: 12 };
    const p = Z.plan(m, y, g, 390, 844);
    assert.ok(Math.abs(p.s * p.K - 1) < 1e-9);
    const h0 = parse(p.home.from), h1 = parse(p.home.to), g0 = parse(p.galaxy.from), g1 = parse(p.galaxy.to);
    for (const e of [0, 0.25, 0.5, 0.75, 1]) {
        const lerp = (a, b) => a + (b - a) * e;
        /* Misty's centre is the Home transform origin; your orb's centre is the galaxy transform origin. */
        const hx = m.x + lerp(h0.x, h1.x), hy = m.y + lerp(h0.y, h1.y);
        const gx = y.x + lerp(g0.x, g1.x), gy = y.y + lerp(g0.y, g1.y);
        assert.ok(Math.abs(hx - gx) < 0.2 && Math.abs(hy - gy) < 0.2, 'same anchor at ' + e);
        /* and both layers shrink at the same rate */
        assert.ok(Math.abs(lerp(h0.s, h1.s) * p.K - lerp(g0.s, g1.s)) < 0.01, 'same scale at ' + e);
    }
    assert.match(p.home.clipFrom, /^circle\(\d+px at 195\.0px 388\.0px\)$/);
    assert.match(p.home.clipTo, /^circle\(109\.2px at/);
    assert.equal(p.galaxy.origin, '102.0px 508.0px');
});

test('no boxed snapshot of Home is left in the galaxy; the zoom script is shipped and cached', () => {
    const chat = read('community-chat.js'), css = read('community-galaxy.css'), html = read('index.html'), sw = read('sw.js');
    assert.ok(!chat.includes('cg-intro') && !css.includes('.cg-intro'), 'the fake Home gradient card is gone');
    assert.ok(html.includes('<script src="galaxy-zoom.js?v=gx-1"></script>'));
    assert.ok(sw.includes('"galaxy-zoom.js"'));
    assert.ok(css.includes('html.gx-hold #tab-home') && css.includes('#tab-foryou.nm-solo{background:'), 'Home held on top, Community is one space with no card');
    const wh = read('world-home.js');
    assert.ok(wh.includes("H.classList.contains('gx-hold')") && wh.includes('W.LowiWorldHome = { pullOut, settle, waterReset,'));
});

test('bots: unique people, unique companions, real birth dates, every stage', () => {
    const now = new Date('2026-10-16T12:00:00').getTime(), b = G.bots({ now });
    assert.ok(b.length >= 24);
    assert.equal(new Set(b.map(x => x.n)).size, b.length);
    assert.equal(new Set(b.map(x => x.mate)).size, b.length);
    assert.equal(new Set(b.map(x => x.uid)).size, b.length);
    for (const x of b) {
        assert.match(x.bday, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(x.age, G.ageOn(x.bday, now));
        assert.ok(x.age >= 19 && x.age <= 69);
        assert.equal(x.stage, G.stageForLevel(x.lv));
        assert.equal(x.sign, G.signOf(+x.bday.slice(5, 7), +x.bday.slice(8, 10))[0]);
        assert.ok(x.bot && x.uid.startsWith('bot:'));
    }
    assert.deepEqual([...new Set(b.map(x => x.stage))].sort(), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(G.bots({ now }).map(x => x.n + x.bday), b.map(x => x.n + x.bday), 'same galaxy on every phone');
    assert.equal(G.signOf(3, 21)[0], 'Aries'); assert.equal(G.signOf(12, 25)[0], 'Capricorn'); assert.equal(G.signOf(1, 5)[0], 'Capricorn');
});

test('names: duplicates collapse to the most recent one, own name excluded, bots avoid real names', () => {
    const last = new Map([['x1', 5], ['x3', 9]]);
    const u = G.uniqueNames([{ uid: 'x1', n: 'Emmanuel', lv: 3 }, { uid: 'x2', n: 'Emmanuel', lv: 9 }, { uid: 'x3', n: 'EMMANUEL', lv: 1 }, { uid: 'x4', n: 'Me', lv: 2 }, { uid: 'x5', n: 'Gatey' }], 'me', last);
    assert.deepEqual(u.map(x => x.uid).sort(), ['x3', 'x5']);
    const bots = G.withBots([{ n: 'Amara' }], G.bots(), 'Jonas');
    assert.ok(!bots.some(x => x.n === 'Amara' || x.n === 'Jonas'));
    assert.equal(G.uniqueNames([{ uid: 'a', n: 'Bo', lv: 2 }, { uid: 'b', n: 'Bo', lv: 7 }], '', new Map()).map(x => x.uid)[0], 'b', 'no activity: highest level');
});

test('bot replies use who they are and the language', () => {
    const b = G.bots()[0];
    assert.match(G.botReply(b, 'hi', 0), new RegExp(b.n));
    assert.match(G.botReply(b, 'what level is your misty?', 0), new RegExp('level ' + b.lv));
    assert.match(G.botReply(b, 'Fasten ist hart', 1), /faste/i);
});

test('the one line ends in an arrow at the person being talked to, and its label sits on the curve middle', () => {
    const q = G.curveOf({ x: 0, y: 0 }, { x: 100, y: 0 }), mid = G.midOf({ x: 0, y: 0 }, { x: 100, y: 0 });
    const p = G.pointOn(q, 0.5);
    assert.deepEqual(mid, p);
    assert.ok(read('community-galaxy.js').includes('if(L.arrow){'));
});

test('water: press and hold resets today, the tap that ends the hold adds nothing; Edit sits above Fasting; bubbles moved out', () => {
    const wh = read('world-home.js'), css = read('world-home.css');
    assert.ok(wh.includes("const sel = '.wh-water[data-sp=\"water\"], #lvDash .lv-water';"));
    assert.ok(wh.includes('}, 600);') && wh.includes("W.dispatchEvent(new CustomEvent('lowi:water'"));
    assert.ok(wh.includes('lp.fired = false; e.preventDefault(); e.stopPropagation();'));
    assert.ok(css.includes('--wh-sx: min(calc(var(--wh-bs) / 2 + var(--wh-fs) * .42), calc(50vw - var(--wh-fs) / 2 - 8px)); --wh-sy: calc(var(--wh-bs) * .5);'));
    assert.ok(css.includes('left: calc(50% - var(--wh-sx)) !important; top: calc(var(--wh-cy) + var(--wh-sy)) !important;'));
    assert.ok(css.includes('left: calc(50% + var(--wh-sx)); top: calc(var(--wh-cy) + var(--wh-sy));'));
});

test('chat privacy & quiet hours have a home in Profile > Community', () => {
    const nm = read('nav-moves.js'), html = read('index.html');
    assert.ok(nm.includes("c.className = 'card nm-privacy'") && nm.includes('W.LowiCommunity.settings()'));
    assert.ok(html.includes('c.contains("nm-privacy")) return "comm"'));
    assert.ok(read('community-chat.js').includes('W.LowiCommunity={mount,refresh,send,comment,isQuiet,unread,messageHTML:renderMessage,mentions,fit,settings,'));
});
