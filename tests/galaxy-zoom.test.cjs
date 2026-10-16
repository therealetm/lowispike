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

test('Home -> Community never scales a flat box: Home only fades over the 3D camera move, only the companions settle', () => {
    /* E-man (Oct 16, with screenshots): "that rectangle box ... coming closer and getting bigger ... not the same as when I click on a
       glowing place to travel" */
    for (const dir of ['out', 'in']) {
        let prev = null;
        for (let i = 0; i <= 40; i++) {
            const L = Z.look(dir, i / 40);
            assert.ok(L.home >= 0 && L.home <= 1 && L.fieldO >= 0 && L.fieldO <= 1);
            assert.ok(L.field >= 1 && L.field <= Z.FIELD0 + 1e-9, 'companions only ever move between 1x and FIELD0, never below 1');
            if (prev) assert.ok(Math.abs(L.home - prev.home) < 0.12 && Math.abs(L.field - prev.field) < 0.05, 'no jump between frames (' + dir + ' ' + i + ')');
            prev = L;
        }
    }
    const o0 = Z.look('out', 0), o1 = Z.look('out', 1), i0 = Z.look('in', 0), i1 = Z.look('in', 1);
    assert.ok(o0.home === 1 && o1.home === 0 && Math.abs(o0.field - Z.FIELD0) < 1e-9 && o1.field === 1, 'out: Home fades away, the companions settle onto you');
    assert.ok(i0.home === 0 && i1.home === 1 && i0.field === 1 && i1.fieldO === 0, 'in: Home fades in over the dive, the companions rush past');
    assert.ok(Z.DUR >= 800 && Z.DUR < 1000, 'a cinematic pull-back, still under a second');
    const src = read('galaxy-zoom.js'), css = read('community-galaxy.css');
    assert.ok(!/clipPath/.test(src));
    assert.ok(!/\.animate\(/.test(src), 'no Web Animations that can wait for a first frame and leave Home shrunk and untappable');
    assert.ok(!/gal\.style\.transform = 'scale/.test(src) && !/home\.style\.transform = 'scale/.test(src), 'the page boxes are never scaled');
    assert.ok(src.includes('b.timer = setTimeout(finish, DUR + 350)'), 'the move always ends on time');
    assert.ok(css.includes('html.gx-in #tab-home{opacity:0}') && css.includes('transform:none!important;will-change:opacity}'));
});

test('pinch: past Home\'s widest view you land in the galaxy, spreading on the galaxy dives back home', () => {
    assert.equal(Z.overPull(200, 100), 2);
    assert.ok(Z.overPull(200, 150) < Z.PINCH_GO && Z.overPull(200, 130) >= Z.PINCH_GO);
    const src = read('galaxy-zoom.js'), wh = read('world-home.js'), ac = read('arrival-cards.js');
    assert.ok(src.includes("if (r.dist < r.maxD * 0.995) { gest.ref = 0; return; }") && src.includes("if (over >= PINCH_GO) cross('foryou');"));
    assert.ok(src.includes("cross('home');") && src.includes("t.closest('#cgGalaxy')"));
    assert.ok(wh.includes('syncX, rig };'), 'Home exposes the camera rig');
    assert.ok(ac.includes('if (!opts.force && !rideOpen() && offHome()) return null;'), 'no arrival card over the galaxy');
});

test('no boxed snapshot of Home is left in the galaxy; the zoom script is shipped and cached', () => {
    const chat = read('community-chat.js'), css = read('community-galaxy.css'), html = read('index.html'), sw = read('sw.js');
    assert.ok(!chat.includes('cg-intro') && !css.includes('.cg-intro'), 'the fake Home gradient card is gone');
    assert.ok(/<script src="galaxy-zoom.js\?v=[0-9-]+"><\/script>/.test(html), 'cache-busted with the build');
    assert.ok(sw.includes('"galaxy-zoom.js"'));
    assert.ok(css.includes('html.gx-hold #tab-home') && css.includes('#tab-foryou.nm-solo{background:'), 'Home held on top, Community is one space with no card');
    const wh = read('world-home.js');
    assert.ok(wh.includes("H.classList.contains('gx-hold')") && wh.includes('W.LowiWorldHome = { pullOut, diveIn, settle, waterReset,'));
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

test('back from the galaxy the 3D camera flies down into Misty instead of Home just growing back', () => {
    const wh = read('world-home.js'), src = read('galaxy-zoom.js');
    assert.ok(wh.includes('function diveIn()') && wh.includes('W.LowiWorldHome = { pullOut, diveIn, settle,'));
    assert.ok(wh.includes("st.zoomAnim = { to: home.dist, rel: home.dist / baseDist(r), pitch: home.pitch, t: 0, rate: 4.2 };"), 'camera glides back to Misty\'s usual view');
    assert.ok(wh.includes('dt * (z.rate || 3.2)'));
    assert.ok(src.includes("if (dir === 'in') { try { if (W.LowiWorldHome && W.LowiWorldHome.diveIn) W.LowiWorldHome.diveIn(); } catch (e) {} }"));
});

test('the Community warp reuses the brain-cell warp from Home and starts where a finger swipe left it', () => {
    const src = read('galaxy-zoom.js');
    assert.ok(src.includes('R.buildWarp(A.THREE') && src.includes('s.follow(cam)') && src.includes('cam.updateProjectionMatrix()'), 'the same light streaks and widening view as the places on Home');
    assert.ok(src.includes("detail: { phase: 'start', id: 'community'"), 'the warp sound fires too');
    assert.ok(src.includes("c.id = 'gxWarp'"), 'the streaks carry on over the galaxy');
    /* a swipe pull: the warp's first frame is exactly where the finger let go, not a jump back */
    const so = Z.swipeLook('out', 0.5), si = Z.swipeLook('in', 0.5);
    assert.ok(so.k === 1 && so.o < 1 && so.fov > 0, 'out of Home the finger widens the 3D view and dims Home, no shrinking box');
    assert.ok(Math.abs(Z.look('out', 0, so).home - so.o) < 1e-9);
    assert.ok(Math.abs(Z.look('in', 0, si).field - si.k) < 1e-9 && Math.abs(Z.look('in', 0, si).fieldO - si.o) < 1e-9);
    assert.equal(Z.swipeLook('out', 0).o, 1); assert.ok(Z.swipeLook('in', 1).k > 1);
    assert.ok(src.includes('fov0 = cam.fov - fovX') && src.includes('fovX * (1 - ease(k))'), 'the lens carries on from the swipe');
    assert.ok(Z.warpAmt(0) === 0 && Z.warpAmt(0.4) > 0.8 && Z.warpAmt(1) < 0.01, 'streaks rise and are gone as the view settles');
});

test('spirit world stays smooth: nothing re-measures hidden Home every second or two, the warp streaks keep their GPU program', () => {
    /* E-man (Oct 16): "in the spirit world, every two to three seconds everything freezes for a moment" */
    const html = read('index.html'), fe = read('fast-edit.js'), fx = read('finch-extras.js'), b3 = read('body-world-3d.js'), sc = read('body-world-3d-scene.js'), gz = read('galaxy-zoom.js');
    assert.ok(html.includes('function homeShown(h){ return h.classList.contains("active")') && html.includes('if (!homeShown(h)) { busy = true; try { tagOnly(h); }') && /if \(!homeShown\(h\)\) \{[^\n]*return; \}/.test(html), 'the Today fit only runs while Home is the page you see');
    /* E-man (Oct 16, iPad): back from Community the old meals / fasting / 1-2-3 steps flashed for a second */
    const t0 = html.indexOf('function tagOnly(h){'), tag = html.slice(t0, html.indexOf('function pass(){', t0));
    assert.ok(tag.includes('groups(h)') && tag.includes('setAttribute("data-g2h", k)') && !/getBoundingClientRect|offsetHeight|fit\(/.test(tag), 'hidden Home still tags its fresh Today steps into their tiles, without measuring anything');
    assert.ok(html.includes('moH = new MutationObserver(() => { if (busy) return; busy = true; try { tagOnly(h); }'), 'a step re-rendered on landing is tagged before the browser can paint it');
    assert.ok(html.includes('observe(h, {attributes:true, attributeFilter:["class"]})'), 'and catches up when Home is back');
    assert.ok(fe.includes('if (!D.hidden && homeOn()) ensurePill();'));
    assert.ok(b3.includes('homeSeen()) { mountHome(); syncGlow(); }'));
    assert.ok(sc.includes('if (nw !== W || nh !== H) { W = nw; H = nh; renderer.setSize(W, H, false); }'), 'same size never wipes the WebGL buffer');
    assert.ok(fx.includes("if (spot && spot.key === key && spot.el === el)") && fx.includes('if (layer.textContent !== x.txt[L()])'));
    assert.ok(gz.includes('function keptWarp(A, R)') && !/s\.dispose\(\)/.test(gz) && gz.includes('A.renderer.compile(A.scene, A.camera)'), 'one warp, warmed up, never thrown away');
});
