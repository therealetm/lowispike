/* LOWiSPIKE · one camera from Home to Community (Oct 16, 2026).
   E-man: "it's not seamless going from home to the community". The old hand-off painted a fake gradient picture of Home inside the
   galaxy card and shrank it, which read as a box flying away. Now the real, live Home (Misty's bloodstream, still rendering) stays on
   screen while the 3D camera backs out of it, and the whole view shrinks into your own body in the galaxy: Misty's cell becomes the
   "You" orb, the galaxy opens up around it. Both layers move with the same easing and the same anchor, so for every frame the point
   that was Misty is exactly the point that becomes You (one continuous pull-out, Stargate style). Going back to Home runs the same
   camera the other way: the galaxy dives into You and Home opens out of it.
   Pure frame maths is in look(); the DOM part only runs in a browser, skips with reduced motion and gives up quietly if anything is missing. */
(function (root) {
    'use strict';
    /* Oct 16, round 2 (E-man's screenshots): the old move shrank Home through a clip circle and blew the galaxy up 4-8x, which on the
       phone showed a dark screen with a stray teal ring, then a giant "You" filling the screen, after a ~1 s wait. Now it is a short
       zoom-and-crossfade with gentle scales: Home falls away into Misty's point while the galaxy settles in from just in front of you,
       both anchored on the same moving point (Misty -> You). No clip, no huge scale, 760 ms.
       And you can get there with your fingers: keep pinching out past Home's widest view and you land in the galaxy; spread two fingers
       on the galaxy and you dive back into Home. */
    /* Oct 16, round 3 (E-man: "when you click on community, we get warped out", "use the zoom from the brain cell"): the move is the
       same warp the places on Home use (body-world-regions.js): its light streaks rush past the 3D camera and the view widens while
       the camera backs out, and the streaks carry on over the galaxy until it settles. A little slower, so it reads as a pull-back. */
    /* Oct 16, round 4 (E-man's screenshots: "do you not see that rectangle box ... coming closer and getting bigger ... that's not
       the same as the animation when I click on a glowing place to travel"): the old move scaled two flat boxes, the Home page down to
       0.42 and the 352 x 571 galaxy box up to 2.4, so a rectangle flew at you. And it ran on Web Animations that could sit waiting for
       their first frame, leaving Home shrunk, see-through and untappable (no glowing places) until a 4 s safety net snapped it back.
       Now nothing flat is ever scaled. Exactly like travelling to a place: the real 3D camera moves (pullOut / diveIn) with the warp
       streaks and the widening view, and the pages only cross-fade, full screen, driven frame by frame from the clock. In the galaxy
       only the companions (the field has no box or background) settle onto you, or rush past as you dive home. */
    /* Oct 16 (handoff task 1, E-man: "a sped-up warp" Today -> Community, "realistic, we're zooming out of our world, not opening a new page") */
    const DUR = 640, FIELD0 = 1.22;
    const clamp = k => Math.max(0, Math.min(1, k || 0));
    const smooth = (a, b, k) => { const t = clamp((k - a) / (b - a)); return t * t * (3 - 2 * t); };
    const ease = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    /* One frame of the move, k = 0..1 of DUR. home = Home's opacity (never a transform), field = scale of the companions only,
       fieldO = their opacity. pv: where a finger swipe already pulled things, so letting go never jumps back first. */
    function look(dir, k, pv) {
        const p = pv && pv.dir === dir ? pv : null;
        if (dir === 'out') {
            const h0 = p ? p.o : 1;
            return { home: h0 * (1 - smooth(0.25, 0.8, k)), field: FIELD0 + (1 - FIELD0) * ease(k), fieldO: 1 };
        }
        const f0 = p ? p.k : 1, o0 = p ? p.o : 1;
        return { home: smooth(0.3, 0.82, k), field: f0 + (FIELD0 - f0) * ease(k), fieldO: o0 * (1 - smooth(0.15, 0.7, k)) };
    }
    /* A sideways swipe between Home and Community does not slide and does not shrink a box: out of Home the 3D view widens (fov) and
       Home dims a little with the finger; out of the galaxy the companions start to rush past you. f = 0..1 of the screen width. */
    function swipeLook(dir, f) {
        f = clamp(f);
        return dir === 'out' ? { dir, k: 1, o: 1 - 0.3 * f, fov: 14 * f } : { dir, k: 1 + 0.22 * f, o: 1 - 0.3 * f, fov: 0 };
    }
    /* warp streak strength over the move: up fast, gone as the view settles */
    function warpAmt(k) { k = Math.max(0, Math.min(1, k)); return Math.sin(Math.PI * Math.pow(k, 0.8)); }
    /* Pinch past the edge: how far the fingers kept closing (Home, at its widest) or opening (galaxy) before we cross over. */
    const PINCH_GO = 1.45;
    function overPull(d0, d) { return d0 > 0 && d > 0 ? d0 / d : 1; }
    const api = { look, swipeLook, DUR, FIELD0, overPull, PINCH_GO, warpAmt };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const W = window, D = document, H = D.documentElement;
    root.LowiGalaxyZoom = api;
    let busy = null, inCall = false;
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const activeTab = () => { const t = D.querySelector('.tab.active'); return t ? t.id.replace(/^tab-/, '') : ''; };
    const worldHome = () => H.classList.contains('wh-on');
    function mistyBox() {
        const b = D.getElementById('spBubble'), r = b && b.getBoundingClientRect();
        if (r && r.width > 40) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
        return { x: innerWidth / 2, y: innerHeight * 0.46, r: Math.min(innerWidth, innerHeight) * 0.27 };
    }
    function youBox() {
        const o = D.querySelector('#cgField .cg-body.me .cg-orb') || D.querySelector('#cgField .cg-body.me'), r = o && o.getBoundingClientRect();
        if (r && r.width > 8) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
        return null;
    }
    /* ---------- the brain-cell warp, reused: LowiWorldRegions.buildWarp streaks on the 3D camera + a 2D echo over the galaxy ---------- */
    /* One set of 3D streaks, built once and kept: building and disposing them for every move threw away the GPU program, so the
       first frame of every Home <-> Community move had to compile a shader (the hitch right as the move starts). Warmed up while idle. */
    let warpKeep = null;
    function keptWarp(A, R) {
        if (warpKeep && warpKeep.scene === A.scene) return warpKeep.s;
        const s = R.buildWarp(A.THREE, 150, 0x9cdac7); A.scene.add(s.group); warpKeep = { scene: A.scene, s, warm: false }; return s;
    }
    function prewarm() {
        try {
            const A = W.LowiWorld3D, R = W.LowiWorldRegions;
            if (!A || !A.scene || !A.camera || !A.THREE || !R || !R.buildWarp) return;
            if (warpKeep && warpKeep.scene === A.scene && warpKeep.warm) return;
            const s = keptWarp(A, R);
            if (A.renderer && A.renderer.compile) { s.tick(0, 0.016, 0.05); s.follow(A.camera); A.renderer.compile(A.scene, A.camera); s.tick(0, 0.016, 0); }
            warpKeep.warm = true;
        } catch (e) { }
    }
    /* Oct 19 (bug hunt run 14, CS-001 sibling): the streak canvas is made per warp, so it is kept within ~1.4 megapixels (a normal
       iPhone keeps 2x; an iPad drops from 22 MB to ~5.6 MB) and its bitmap is handed back (width = height = 0) when the warp ends.
       Leaving it to the garbage collector piled up canvas memory on iPhone/iPad until iOS killed the page. */
    const WARP_PX = 1.4e6;
    function warpFx(dir, m, y, pv) {
        const fx = { offs: [] }, out = dir === 'out', t0 = performance.now(), fovX = pv && pv.dir === dir && pv.fov > 0 ? pv.fov : 0;
        try { W.dispatchEvent(new CustomEvent('lowi:world-warp', { detail: { phase: 'start', id: 'community', from: out ? 'hub' : 'community' } })); } catch (e) { }
        const A = W.LowiWorld3D, R = W.LowiWorldRegions;
        try {
            if (A && A.scene && A.camera && A.THREE && R && R.buildWarp && A.onFrame) {
                const s = keptWarp(A, R), cam = A.camera, fov0 = cam.fov - fovX;   /* a swipe already widened the view by fovX: carry on from there */
                const off = A.onFrame(dt => {
                    const k = (performance.now() - t0) / DUR, amt = k >= 1 ? 0 : warpAmt(k);
                    s.tick((out ? -1 : 1) * 26 * amt, dt, amt); s.follow(cam);
                    const fov = fov0 + 16 * amt + fovX * (1 - ease(k)); if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
                });
                fx.offs.push(() => { try { off(); } catch (e) { } try { s.tick(0, 0.016, 0); } catch (e) { } if (Math.abs(cam.fov - fov0) > 0.001) { cam.fov = fov0; cam.updateProjectionMatrix(); } });
            }
        } catch (e) { }
        /* the same streaks in 2D over the galaxy layer, centred on the point that travels from Misty to You */
        const main = D.getElementById('main'), c = D.createElement('canvas'), ctx = c.getContext && c.getContext('2d');
        if (main && ctx) {
            c.id = 'gxWarp'; c.setAttribute('aria-hidden', 'true'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6'; main.appendChild(c);
            const w = main.clientWidth || innerWidth, h = main.clientHeight || innerHeight, mr = main.getBoundingClientRect();
            const dpr = Math.min(Math.min(2, W.devicePixelRatio || 1), Math.sqrt(WARP_PX / Math.max(1, w * h)));
            c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
            const st = []; let seed = 9173; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            for (let i = 0; i < 110; i++) st.push({ a: rnd() * 6.283, z: 0.15 + rnd() * 0.85, w: 0.6 + rnd() * 0.8 });
            let raf = 0, last = t0;
            const draw = now => {
                const k = (now - t0) / DUR; if (k >= 1.05) { raf = 0; ctx.clearRect(0, 0, c.width, c.height); return; }
                const dt = Math.min(0.05, (now - last) / 1000); last = now;
                const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, from = out ? m : y, to = out ? y : m;
                const cx = from.x + (to.x - from.x) * e - mr.left, cy = from.y + (to.y - from.y) * e - mr.top, amt = warpAmt(k), R0 = Math.hypot(w, h) * 0.09;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
                for (const p of st) {
                    p.z += (out ? 1 : -1) * dt * 1.9 * p.w * (0.3 + amt); if (p.z > 1) p.z -= 0.85; else if (p.z < 0.15) p.z += 0.85;
                    const r1 = R0 / p.z, r2 = R0 / Math.min(1.2, p.z + 0.05 + 0.18 * amt), ca = Math.cos(p.a), sa = Math.sin(p.a);
                    ctx.strokeStyle = 'rgba(214,246,236,' + (0.75 * amt * Math.min(1, (1.05 - p.z) * 3)).toFixed(3) + ')'; ctx.lineWidth = 0.8 + 1.1 * p.w * (1 - p.z);
                    ctx.beginPath(); ctx.moveTo(cx + ca * r1, cy + sa * r1); ctx.lineTo(cx + ca * r2, cy + sa * r2); ctx.stroke();
                }
                ctx.globalCompositeOperation = 'source-over';
                raf = requestAnimationFrame(draw);
            };
            raf = requestAnimationFrame(draw);
            fx.offs.push(() => { if (raf) cancelAnimationFrame(raf); raf = 0; c.remove(); c.width = 0; c.height = 0; });
        }
        fx.stop = () => { fx.offs.splice(0).forEach(f => { try { f(); } catch (e) { } }); try { W.dispatchEvent(new CustomEvent('lowi:world-warp', { detail: { phase: 'arrive', id: out ? 'community' : 'hub', from: out ? 'hub' : 'community' } })); } catch (e) { } };
        return fx;
    }
    /* inline styles the move and the fingers put on; cleared so the stylesheet owns every page again */
    function clean() {
        const home = D.getElementById('tab-home'), gal = D.getElementById('cgGalaxy'), field = D.getElementById('cgField');
        [home, gal, field].forEach(el => { if (el) { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; el.style.transformOrigin = ''; } });
        try { if (W.LowiSpiritWorld) W.LowiSpiritWorld.clear(); } catch (e) { }
    }
    function finish() {
        if (!busy) return;
        const b = busy; busy = null; clearTimeout(b.timer); if (b.raf) cancelAnimationFrame(b.raf);
        if (b.fx) b.fx.stop();
        clean();
        H.classList.remove('gx-hold', 'gx-out', 'gx-in', 'gx-keep');
        if (b.dir === 'out') { try { if (W.LowiArrival && W.LowiArrival.current && W.LowiArrival.current()) W.LowiArrival.close(); } catch (e) {} }
        /* Oct 16: Community is Home's world zoomed out (the canvas now lives under every page): after the pull-out the camera STAYS out */
        const keepOut = b.dir === 'out' && W.LowiWorld3D && W.LowiWorld3D.inBack && W.LowiWorld3D.inBack();
        if (!keepOut) { try { if (W.LowiWorldHome && W.LowiWorldHome.settle) W.LowiWorldHome.settle(); } catch (e) {} }
        try { if (W.LowiCommunity && W.LowiCommunity.refresh) W.LowiCommunity.refresh(); } catch (e) {}
    }
    /* Driven from the clock every frame (no Web Animations waiting for a first frame): a slow frame only skips ahead, and the move
       always ends on time, with Home tappable again (glowing places included). */
    function paint(dir, k, pv) {
        const home = D.getElementById('tab-home'), field = D.getElementById('cgField'), L = look(dir, k, pv);
        if (home) { home.style.transform = ''; home.style.opacity = L.home >= 0.999 ? '' : L.home.toFixed(3); }
        if (field) { field.style.transform = Math.abs(L.field - 1) < 0.0005 ? '' : 'scale(' + L.field.toFixed(4) + ')'; field.style.opacity = L.fieldO >= 0.999 ? '' : L.fieldO.toFixed(3); }
        /* the Metabolic Spirit World picture behind Community comes into view from far away (out) and falls away behind you (in) */
        try { if (W.LowiSpiritWorld) W.LowiSpiritWorld.paint(dir, k); } catch (e) { }
    }
    function run(dir) {
        const home = D.getElementById('tab-home'), gal = D.getElementById('cgGalaxy');
        if (!home || !gal) { finish(); return; }
        const m = mistyBox(), y = youBox() || { x: innerWidth / 2, y: innerHeight * 0.62, r: 24 }, b = busy, t0 = performance.now();
        gal.style.transform = ''; gal.style.opacity = '';
        b.fx = warpFx(dir, m, y, b.pv);
        const step = () => {
            if (busy !== b) return;
            const k = Math.min(1, (performance.now() - t0) / DUR);
            paint(dir, k, b.pv);
            if (k >= 1) { finish(); return; }
            b.raf = requestAnimationFrame(step);
        };
        step();
        clearTimeout(b.timer); b.timer = setTimeout(finish, DUR + 350);
    }
    let pending = null;   /* a finger swipe's pull, handed to the next start() */
    function start(dir) {
        if (busy) finish();
        busy = { dir, raf: 0, timer: 0, pv: pending && pending.dir === dir ? pending : null }; pending = null;
        if (dir === 'out') { H.classList.add('gx-hold', 'gx-out'); try { if (W.LowiWorldHome && W.LowiWorldHome.pullOut) W.LowiWorldHome.pullOut(); } catch (e) {} }
        else H.classList.add('gx-in', 'gx-keep');
        busy.timer = setTimeout(finish, DUR + 800);   /* run() starts within a frame and resets this */
    }
    function wrap() {
        const orig = W.goTab;
        if (typeof orig !== 'function' || orig.__gx) return !!(orig && orig.__gx);
        const firstIsRoom = () => { try { const T = W.LowiCommunityTabs; return !T || !T.order || T.order()[0] === 'room' || /^#community\//i.test(W.location.hash || ''); } catch (e) { return true; } };
        const g = function (t) {
            if (inCall) return orig.apply(this, arguments);
            const from = activeTab();
            let dir = '';
            /* Oct 21: closing Community with the X / back is instant and puts Home back exactly as it was: no zoom in */
            if (!reduced() && worldHome() && !D.hidden && !(W.LowiSections && W.LowiSections.instant)) {
                /* Oct 22 (item 33): the warp lands in the galaxy (Room). When the first Community tab is something else, Community
                   opens straight on that tab with no warp into a galaxy you are not going to see. */
                if (from === 'home' && t === 'foryou' && firstIsRoom()) dir = 'out';
                else if (from === 'foryou' && t === 'home' && D.querySelector('#cgField .cg-body.me')) dir = 'in';
            }
            if (dir) start(dir); else if (busy) finish();
            let r; inCall = true;
            try { r = orig.apply(this, arguments); } finally { inCall = false; }
            if (dir === 'in') { try { if (W.LowiWorldHome && W.LowiWorldHome.diveIn) W.LowiWorldHome.diveIn(); } catch (e) {} }
            if (dir) {
                try { if (W.LowiCommunity && W.LowiCommunity.refresh) W.LowiCommunity.refresh(); } catch (e) {}
                /* after the galaxy laid out (one frame), or 70 ms at most when frames are slow */
                const go = () => { if (busy && busy.dir === dir && !busy.ran) { busy.ran = true; run(dir); } };
                requestAnimationFrame(go); setTimeout(go, 70);
            }
            return r;
        };
        g.__gx = 1; g.__orig = orig;
        W.goTab = g;
        try { if (typeof goTab !== 'undefined' && goTab !== g) goTab = g; } catch (e) {}
        return true;
    }
    /* ---------- fingers: pinch out past Home's widest view -> galaxy; spread on the galaxy -> back into Home ---------- */
    const rigNow = () => { try { return W.LowiWorldHome && W.LowiWorldHome.rig ? W.LowiWorldHome.rig() : null; } catch (e) { return null; } };
    const atHub = () => { try { const R = W.LowiWorldRegions, s = R && R.state; return !(s && (s.busy || (s.cur && s.cur !== 'hub'))); } catch (e) { return true; } };
    function homePinchOk(t) {
        const r = rigNow();
        return !!(r && r.mode === 'home' && worldHome() && activeTab() === 'home' && !busy && atHub() && !D.querySelector('.bw3-full') && t && t.closest && t.closest('#tab-home') && !t.closest('button, .wh-sheet, .sheet, input, textarea'));
    }
    const gest = { on: '', d0: 0, ref: 0, el: null };
    const tdist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    /* fingers never scale a page box either: Home only dims, in the galaxy only the companions (the field) move */
    function feel(el, k, o) { if (!el) return; el.style.transition = 'none'; el.style.transform = el.id === 'tab-home' || k === 1 ? '' : 'scale(' + k.toFixed(3) + ')'; el.style.opacity = o == null || o === 1 ? '' : String(o.toFixed(3)); }
    function release() {
        const el = gest.el; gest.on = ''; gest.el = null; gest.ref = 0;
        if (el) { el.style.transition = 'transform .25s ease, opacity .25s ease'; el.style.transform = ''; el.style.opacity = ''; setTimeout(() => { if (!gest.el) el.style.transition = ''; }, 300); }
    }
    function cross(to) {
        const el = gest.el; gest.on = ''; gest.el = null; gest.ref = 0;
        if (el) { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; }
        try { (W.goTab || goTab)(to); } catch (e) {}
    }
    D.addEventListener('touchstart', e => {
        if (e.touches.length !== 2) { if (e.touches.length > 2) release(); return; }
        const t = e.target;
        if (homePinchOk(t)) { gest.on = 'home'; gest.el = D.getElementById('tab-home'); gest.d0 = tdist(e); gest.ref = 0; }
        else if (activeTab() === 'foryou' && !busy && t && t.closest && t.closest('#cgGalaxy') && !t.closest('#cmPaneChat .cm-compose, input, textarea') && (!W.LowiCgMap || W.LowiCgMap.atMax())) { gest.on = 'gal'; gest.el = D.getElementById('cgField'); gest.d0 = tdist(e); e.preventDefault(); }
    }, { capture: true, passive: false });
    D.addEventListener('touchmove', e => {
        if (!gest.on || e.touches.length !== 2) return;
        const d = tdist(e);
        if (gest.on === 'home') {
            const r = rigNow(); if (!r) return release();
            /* only counts once the camera is already at its widest; the fingers' distance there is the reference */
            if (r.dist < r.maxD * 0.995) { gest.ref = 0; return; }
            /* Oct 16 (task 3): the world itself goes on past the World Map now (the camera keeps pulling out into the spirit world and
               world-home.js hands over to Community at its far edge), so the fingers are not counted here any more */
            if (r.outer) { gest.ref = 0; feel(gest.el, 1, 1); return; }
            if (!gest.ref) gest.ref = d;
            const over = overPull(gest.ref, d);
            if (over <= 1) { feel(gest.el, 1, 1); return; }
            const f = Math.min(1, (over - 1) / (PINCH_GO - 1));
            feel(gest.el, 1 - 0.12 * f, 1 - 0.25 * f);
            if (over >= PINCH_GO) cross('foryou');
        } else {
            e.preventDefault();
            const open = d / gest.d0;
            if (open <= 1) { feel(gest.el, 1, 1); return; }
            const f = Math.min(1, (open - 1) / (PINCH_GO - 1));
            feel(gest.el, 1 + 0.25 * f, 1 - 0.2 * f);
            if (open >= PINCH_GO && D.querySelector('#cgField .cg-body.me')) cross('home');
        }
    }, { capture: true, passive: false });
    const tend = e => { if (gest.on && e.touches.length < 2) release(); };
    D.addEventListener('touchend', tend, true); D.addEventListener('touchcancel', tend, true);
    /* iOS Safari's own page zoom would fight the galaxy pinch */
    D.addEventListener('gesturestart', e => { if (gest.on === 'gal') e.preventDefault(); }, { passive: false });
    /* trackpad / mouse wheel: keep scrolling out at Home's widest view (or in on the galaxy) to cross over */
    let wheelOver = 0, wheelT = 0;
    D.addEventListener('wheel', e => {
        if (busy) return;
        const now = Date.now(); if (now - wheelT > 450) wheelOver = 0; wheelT = now;
        if (e.deltaY > 0 && homePinchOk(e.target)) { const r = rigNow(); if (!r.outer && r.dist >= r.maxD * 0.995 && ++wheelOver >= 5) { wheelOver = 0; (W.goTab || goTab)('foryou'); } }
        else if (e.deltaY < 0 && activeTab() === 'foryou' && e.target && e.target.closest && e.target.closest('#cgGalaxy') && D.querySelector('#cgField .cg-body.me') && (!W.LowiCgMap || W.LowiCgMap.atMax())) { e.preventDefault(); if (++wheelOver >= 5) { wheelOver = 0; (W.goTab || goTab)('home'); } }
    }, { capture: true, passive: false });
    /* ---------- sideways swipe Home <-> Community (driven by liquid-glass.js): the page pulls back with the finger, letting go warps ---------- */
    function swipeOk(from, to) {
        if (reduced() || !worldHome() || busy) return '';
        if (from === 'home' && to === 'foryou') return 'out';
        if (from === 'foryou' && to === 'home' && D.querySelector('#cgField .cg-body.me')) return 'in';
        return '';
    }
    function swipeEl(dir) { return dir === 'out' ? D.getElementById('tab-home') : D.getElementById('cgField'); }
    /* Home's 3D view widens with the finger (the same lens the warp uses), nothing flat shrinks */
    let fovBase = 0;
    function setFov(extra) {
        try {
            const cam = W.LowiWorld3D && W.LowiWorld3D.camera; if (!cam) return;
            if (!fovBase) fovBase = cam.fov;
            const v = fovBase + extra; if (Math.abs(cam.fov - v) > 0.01) { cam.fov = v; cam.updateProjectionMatrix(); }
            if (extra <= 0) fovBase = 0;
        } catch (e) { }
    }
    function swipe(dir, f) {
        const el = swipeEl(dir); if (!el) return;
        const L = swipeLook(dir, f);
        el.style.transition = 'none';
        el.style.transform = dir === 'out' ? '' : 'scale(' + L.k.toFixed(3) + ')';
        el.style.opacity = L.o.toFixed(3);
        if (dir === 'out') setFov(L.fov);
        return L;
    }
    function swipeEnd(dir, f, commit) {
        const el = swipeEl(dir); if (!el) return false;
        const L = swipeLook(dir, f);
        if (commit) {
            /* the warp takes over from exactly this frame: its paint() and lens start where the finger left them */
            pending = L; fovBase = 0;
            try { (W.goTab || goTab)(dir === 'out' ? 'foryou' : 'home'); } catch (e) { }
            const ok = !!(busy && busy.dir === dir); pending = null;
            if (!ok) { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; setFov(0); }
            return ok;
        }
        /* let go too early: ease back */
        const t0 = performance.now(), T = reduced() ? 1 : 260;
        const back = () => {
            const k = Math.min(1, (performance.now() - t0) / T), e = 1 - Math.pow(1 - k, 3), r = swipeLook(dir, (f || 0) * (1 - e));
            el.style.transform = dir === 'out' || k >= 1 ? '' : 'scale(' + r.k.toFixed(3) + ')';
            el.style.opacity = k >= 1 ? '' : r.o.toFixed(3);
            if (dir === 'out') setFov(k >= 1 ? 0 : r.fov);
            if (k < 1) requestAnimationFrame(back); else el.style.transition = '';
        };
        back();
        return false;
    }
    Object.assign(api, { swipeOk, swipe, swipeEnd, busy: () => !!busy });
    let tries = 0;
    (function boot() { if (!wrap() && tries++ < 80) setTimeout(boot, 150); else setInterval(() => { wrap(); if (!busy) { const ric = W.requestIdleCallback || (f => setTimeout(f, 1)); ric(prewarm); } }, 2000); })();
})(typeof window !== 'undefined' ? window : globalThis);
