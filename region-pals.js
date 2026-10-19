/* LOWiSPIKE region companions (Oct 16, 2026; handoff task 10). Needs region-pals-core.js (+ arrival-core.js for the facts).
   Inside a region (Brain, Lungs, Heart, Liver, Pancreas, Gut, Muscles) a small glass creature of that place swims along with
   you and talks in a Misty-style speech bubble: a greeting, the place's facts, today's line. Tap it for the next line.
   It replaces the leftover info surfaces in regions (the gold arrival card and the region label line): arrival-cards.js asks
   LowiRegionPals.takes(id) before it shows one.
   Moving with you: it follows your drag anywhere in the world with a soft spring and drifts back to its spot; a steering module can
   push it too (window event 'lowi:region-steer' {vx, vy} in -1..1, or LowiRegionPals.steer(vx, vy)).
   No XP, no collection, no microbe buddies. It never touches the camera or the 3D scene (DOM overlay on the world host),
   draws only while visible, and holds still with reduced motion. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    const C = W.LowiRegionPalsCore;
    if (!C || W.LowiRegionPals) return;
    const me = D.currentScript || D.querySelector('script[src*="region-pals.js"]');
    function css() {
        if (D.getElementById('lowiRegionPalsCss')) return;
        const l = D.createElement('link'); l.id = 'lowiRegionPalsCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('region-pals.js', 'region-pals.css') : 'region-pals.css';
        D.head.appendChild(l);
    }
    if (D.head) css(); else D.addEventListener('DOMContentLoaded', css, { once: true });
    const lang = () => { try { return String(W.LowiLang.get() || 'de').slice(0, 2).toLowerCase(); } catch (e) { return String(H.lang || 'de').slice(0, 2).toLowerCase(); } };
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function host() {
        const full = D.querySelector('.bw3-full'); if (full) return full;
        if (H.classList.contains('wh-home')) return D.getElementById('whHud');
        return null;
    }
    const offView = () => H.classList.contains('gx-out') || H.classList.contains('gx-hold');

    /* the creatures: a glass orb with the place's motif inside and two little eyes */
    const SHAPES = {
        spark: '<g fill="none" stroke="rgb(var(--rgb))" stroke-width="2.2" stroke-linecap="round"><path d="M32 32 L32 14 M32 32 L48 24 M32 32 L46 44 M32 32 L18 45 M32 32 L16 24"/></g><g fill="#fff"><circle cx="32" cy="14" r="2.6"/><circle cx="48" cy="24" r="2.6"/><circle cx="46" cy="44" r="2.6"/><circle cx="18" cy="45" r="2.6"/><circle cx="16" cy="24" r="2.6"/></g>',
        puff: '<g fill="rgba(var(--rgb),.38)" stroke="rgba(255,255,255,.8)" stroke-width="1.4"><circle cx="25" cy="26" r="9"/><circle cx="40" cy="24" r="8"/><circle cx="33" cy="39" r="10"/><circle cx="21" cy="41" r="6"/><circle cx="45" cy="39" r="6"/></g>',
        beat: '<path d="M32 48 C18 38 13 30 17 22 C21 15 29 16 32 23 C35 16 43 15 47 22 C51 30 46 38 32 48 Z" fill="rgba(var(--rgb),.5)" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/><path d="M14 33 h9 l3 -6 l4 11 l3 -5 h17" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" opacity=".8"/>',
        hex: '<path d="M32 13 L48 22.5 L48 41.5 L32 51 L16 41.5 L16 22.5 Z" fill="rgba(var(--rgb),.4)" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/><g fill="rgba(255,255,255,.75)"><circle cx="27" cy="27" r="2.2"/><circle cx="37" cy="29" r="2.2"/><circle cx="30" cy="37" r="2.2"/><circle cx="39" cy="39" r="1.8"/></g>',
        islet: '<circle cx="32" cy="32" r="15" fill="rgba(var(--rgb),.36)" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/><g fill="#fff" opacity=".85"><circle cx="27" cy="27" r="2.4"/><circle cx="36" cy="26" r="2"/><circle cx="38" cy="35" r="2.4"/><circle cx="28" cy="37" r="2"/><circle cx="32" cy="31" r="1.6"/></g>',
        villus: '<path d="M20 50 C20 36 22 20 32 14 C42 20 44 36 44 50 Z" fill="rgba(var(--rgb),.4)" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/><path d="M26 46 C26 36 28 26 32 21 M38 46 C38 36 36 26 32 21" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>',
        fibre: '<rect x="14" y="23" width="36" height="18" rx="9" fill="rgba(var(--rgb),.4)" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/><g stroke="rgba(255,255,255,.7)" stroke-width="1.4"><path d="M22 24 v16 M28 24 v16 M34 24 v16 M40 24 v16"/></g>'
    };
    const st = { id: null, el: null, host: null, lines: [], i: 0, p: C.FOLLOW.home.slice(), v: [0, 0], off: [0, 0], drag: null, steerT: 0, raf: 0, t0: 0, sayT: 0, nextT: 0, shown: 0,
        /* cell-guide: what is showing now, one waiting line, quiet time, this visit's count, where the bubble sits */
        cur: null, wait: null, waitT: 0, endT: 0, visit: 0, spot: 'ar', placeT: 0, obs: null, obsT: 0, size: null, lastKind: '' };
    /* this session only (no storage): which lines each place has already said, and the places greeted this session */
    const seen = {}, greeted = {};
    /* on this device (Oct 18, 2026): which guides you have met, so each says hello only the very first time
       (shape in region-pals-core.js memory(); key in DATA_CONTRACTS.md) */
    const MEM_KEY = 'lowi.guides.v1';
    let mem = null;
    function memLoad() { if (!mem) { let raw = null; try { raw = JSON.parse(localStorage.getItem(MEM_KEY) || 'null'); } catch (e) { } mem = C.memory(raw); } return mem; }
    function memSave() { try { localStorage.setItem(MEM_KEY, JSON.stringify(memLoad())); } catch (e) { } }
    const metYet = id => C.met(memLoad(), id);
    const said = (id, i) => { (seen[id] = seen[id] || new Set()).add(i); };

    function todayText(id) { try { const A = W.LowiArrival; const d = A && A.data ? A.data(id) : null; return d && d.today ? d.today : ''; } catch (e) { return ''; } }
    function takes(id) { return !!(C.pid(id) && host() && !offView()); }
    function build(id) {
        const p = C.pal(id, lang()); if (!p) return null;
        const el = D.createElement('div'); el.className = 'rp-pal'; el.id = 'rpPal'; el.dataset.pal = p.id; el.style.setProperty('--rgb', p.rgb);
        el.innerHTML = '<button type="button" class="rp-body" aria-label="' + esc(C.tr('aria', lang(), p.name)) + '"><span class="rp-orb"><svg viewBox="0 0 64 64" aria-hidden="true">' + SHAPES[p.shape] + '</svg><i class="rp-eye"></i><i class="rp-eye rp-r"></i></span></button>' +
            '<div class="rp-say" role="status" aria-live="polite"><b>' + esc(p.name) + '</b><span class="rp-tx"></span><small>' + esc(C.tr('tap', lang())) + '</small></div>';
        ['pointerdown', 'touchstart', 'mousedown'].forEach(t => el.addEventListener(t, e => e.stopPropagation(), { passive: true }));
        el.querySelector('.rp-body').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); next(true); });
        el.querySelector('.rp-say').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); quiet(); });
        return el;
    }
    /* one bubble, one voice. A line: {text, prio, kind ('hunt' | 'fact' | 'tip'), i (index into lines for facts)}.
       A new line replaces the one showing only once that one has been up its reading time (a more important one: at least the floor);
       otherwise it waits in a single slot (a newer or more important line takes the slot). Nothing piles up, nothing goes stale. */
    function speak(line, user) {
        if (!st.el || !line || !line.text) return false;
        const now = performance.now(), c = st.cur && st.el.classList.contains('rp-talk') ? st.cur : null;
        if (c && !user) {
            const until = c.t + C.minRead(c.text, c.prio, line.prio);
            if (now < until) {
                if (!st.wait || line.prio >= st.wait.prio) { st.wait = line; clearTimeout(st.waitT); st.waitT = setTimeout(flush, Math.max(60, until - now)); }
                return true;
            }
        }
        if (st.wait && st.wait.prio <= line.prio) { st.wait = null; clearTimeout(st.waitT); }
        show1(line, user);
        return true;
    }
    function flush() { const w = st.wait; st.wait = null; if (w && st.el) show1(w, false); }
    function show1(line, user) {
        const b = st.el.querySelector('.rp-say'), tx = b.querySelector('.rp-tx');
        tx.textContent = line.text;
        st.el.classList.toggle('rp-hunt', line.kind === 'hunt');
        st.cur = { text: line.text, prio: line.prio || 0, kind: line.kind || 'fact', t: performance.now() };
        st.lastKind = line.kind || 'fact';
        if (line.i != null) { st.i = line.i; said(st.id, line.i); }
        st.el.classList.add('rp-talk'); st.shown++; st.visit++;
        st.size = null; st.obsT = 0; placeSay(true);
        clearTimeout(st.sayT); clearTimeout(st.nextT);
        const ms = C.showMs(line.text, line.kind === 'hunt' ? 'hunt' : 'fact') + (user ? 1500 : 0); /* reading time, read-time-core.js */
        st.sayT = setTimeout(quiet, ms);
        try { W.dispatchEvent(new CustomEvent('lowi:region-pal', { detail: { id: st.id, line: line.i != null ? line.i : -1, kind: st.lastKind, text: line.text, user: !!user, prio: line.prio || 0 } })); } catch (e) { }
    }
    function sayLine(i, user) {
        if (!st.el || !st.lines.length) return;
        i = C.cycle(i, st.lines.length, metYet(st.id)); /* round and round, but the hello only once, ever */
        speak({ text: st.lines[i], prio: user ? 3 : 0, kind: 'fact', i }, user);
    }
    function quiet() {
        clearTimeout(st.sayT); clearTimeout(st.nextT);
        if (st.el) st.el.classList.remove('rp-talk');
        st.cur = null; st.endT = performance.now();
        if (st.wait) { clearTimeout(st.waitT); st.waitT = setTimeout(flush, 380); }
    }
    /* tap: the next line in order (greeting, facts, today), then round again */
    function next(user) { if (st.el) sayLine(st.shown && st.cur && st.cur.kind === 'fact' ? st.i + 1 : nextUnseen(), !!user); }
    function nextUnseen() { const k = C.nextFact(st.lines.length, seen[st.id], 1); return k == null ? (st.i + 1) % st.lines.length : k; }

    /* ---------- the bubble never sits on the Daily Quest, the top row, the controls, the tab bar or Misty ---------- */
    const AVOID = '#f3Board, #hcLine.on, #hqSlot.arr-on, #tab-home .sp-top, #whHud button, #whHud .wh-water, #spFast, #whPad, #tabbar, .wh-hint.wh-say, #lpPraise.on, .bw3-full button, [data-guide-avoid]';
    /* clean flight view (Oct 17, handoff item 7): while Misty flies, the Daily Quest band and the controller only fade (layout
       stays) and one tap brings them back. So the bubble keeps clear of where they are even while they are faded: a reveal tap
       never finds the bubble sitting on the Daily Quest. */
    const FADED_KEEP_CLEAR = '#f3Board, #hcLine.on:not(.hc-away), #hqSlot.arr-on, #whPad';
    const cleanOn = () => H.classList.contains('lw-clean');
    function visible(e) {
        try { if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; } catch (x) { }
        const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05;
    }
    function obstacles() {
        const now = performance.now(); if (st.obs && now - st.obsT < 600) return st.obs;
        const vw = W.innerWidth, vh = W.innerHeight, out = [];
        D.querySelectorAll(AVOID).forEach(e => {
            if (st.el && st.el.contains(e)) return;
            const q = e.getBoundingClientRect(); if (q.width < 4 || q.height < 4 || q.bottom < 0 || q.top > vh || q.right < 0 || q.left > vw) return;
            if (!visible(e) && !(cleanOn() && e.matches && e.matches(FADED_KEEP_CLEAR))) return;
            out.push({ l: q.left - 6, t: q.top - 6, r: q.right + 6, b: q.bottom + 6, w: C.QUEST_IDS.indexOf(e.id) >= 0 ? C.QUEST_W : 2, k: e.id || '' });
        });
        st.obs = out; st.obsT = now; return out;
    }
    function hostRect() { const now = performance.now(); if (!st.rect || now - st.rectT > 1000) { st.rect = st.host.getBoundingClientRect(); st.rectT = now; } return st.rect; }
    function placeSay(force) {
        const el = st.el; if (!el || !st.host || !el.classList.contains('rp-talk')) return;
        const now = performance.now(); if (!force && now - st.placeT < 160) return; st.placeT = now;
        const b = el.querySelector('.rp-say'); if (!b) return;
        if (!st.size) st.size = { w: b.offsetWidth || 220, h: b.offsetHeight || 80 };
        const q = hostRect(), w = st.host.clientWidth || W.innerWidth, hh = st.host.clientHeight || W.innerHeight;
        const pal = { x: q.left + st.p[0] * w, y: q.top + st.p[1] * hh };
        const obs = obstacles().slice();
        const MF = W.LowiMistyFlight, m = MF && MF.screen ? MF.screen() : null;
        if (m) obs.push({ l: m.x - 46, t: m.y - 46, r: m.x + 46, b: m.y + 46, w: 4 });
        const orb = st.side ? C.ORB_R.side : C.ORB_R.full;
        obs.push({ l: pal.x - orb - 3, t: pal.y - orb - 3, r: pal.x + orb + 3, b: pal.y + orb + 3, w: 2 }); /* never over the guide that is talking */
        const view = { w: W.innerWidth, h: W.innerHeight, top: 6, bottom: 6 };
        /* the tail ends right at the orb's rim, for the full guide and the small sidekick alike: it visibly comes out of it */
        const r = C.place(pal, st.size, obs, view, force ? null : st.spot, C.gapFor(orb));
        if (!r) return;
        if (r.spot !== st.spot) { el.classList.remove('rp-s-' + st.spot.slice(0, 2)); st.spot = r.spot; }
        el.classList.add('rp-placed');
        el.classList.add('rp-s-' + r.spot.slice(0, 2));
        b.style.left = Math.round(r.l - pal.x) + 'px'; b.style.top = Math.round(r.t - pal.y) + 'px';
        b.style.setProperty('--tail', Math.round(r.tail) + 'px'); /* the tail always points back at the guide that is talking */
        st.bx = r.l - pal.x; st.btail = r.tail; st.bvert = r.spot[0] !== 's';
    }
    /* between placements (every frame, numbers only, no layout reads): slide the bubble so a fast guide never drags it off screen */
    function keepOn(x0) {
        const el = st.el; if (!el || !st.size || st.bx == null || !el.classList.contains('rp-talk')) return;
        const vw = W.innerWidth, q = hostRect(), x = q.left + x0, w = st.size.w;
        const l = Math.max(10, Math.min(vw - 10 - w, x + st.bx)), dx = l - (x + st.bx);
        if (Math.abs(dx) < 0.5) return;
        const b = el.querySelector('.rp-say'); b.style.left = Math.round(l - x) + 'px';
        if (st.bvert) b.style.setProperty('--tail', Math.round(Math.max(18, Math.min(w - 18, x - l))) + 'px');
    }

    function place() {
        const el = st.el, h = st.host; if (!el || !h) return;
        const w = h.clientWidth || W.innerWidth, hh = h.clientHeight || W.innerHeight;
        const x = st.p[0] * w, y = st.p[1] * hh;
        el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        el.style.setProperty('--tilt', C.tilt(st.v) + 'deg');
        placeSay(false); keepOn(x);
    }
    /* Misty's sidekick: a little above her and to her side (the side with more room), in host fractions; null = she is not in.
       cell-guide: it keeps below the Daily Quest and above the controls, so the guide itself never parks on them either. */
    function sidekickAt() {
        const MF = W.LowiMistyFlight, m = MF && MF.screen ? MF.screen() : null, h = st.host; if (!m || !h) return null;
        const q = hostRect(); if (!q || !q.width || !q.height) return null;
        const fx = (m.x - q.left) / q.width, fy = (m.y - q.top) / q.height;
        if (fx < -0.1 || fx > 1.1 || fy < -0.1 || fy > 1.1) return null;
        const side = fx > 0.5 ? -1 : 1;
        let lo = 0.12, hi = 0.74;
        const qb = C.questBottom(st.obs);   /* the whole Daily Quest band: board, crumb line, arrival slot (faded or not) */
        /* while it talks it keeps low enough that its bubble fits between the Daily Quest and itself */
        if (qb != null) lo = Math.max(lo, Math.min(0.55, (qb + 34 + (st.cur && st.size ? st.size.h + 12 : 0) - q.top) / q.height));
        return [Math.max(0.08, Math.min(0.8, fx + side * 0.13 - 0.06)), Math.max(lo, Math.min(hi, fy - 0.1))];
    }
    function loop() {
        st.raf = 0;
        if (!st.el || !st.el.isConnected || D.hidden) return;
        const red = reduced(), t = (performance.now() - st.t0) / 1000;
        if (!st.drag && performance.now() > st.steerT) st.off = C.relax(st.off);
        /* frame-rate independent: a slow phone takes up to three spring steps per frame */
        const now = performance.now(), n = Math.max(1, Math.min(3, Math.round((now - (st.lastF || now - 16.7)) / 16.7))); st.lastF = now;
        const ska = sidekickAt(), home = ska || C.FOLLOW.home;
        /* Oct 17: beside Misty it is clearly her small helper (smaller orb, same tap target), never a stand-in for her */
        if (!!ska !== !!st.side) { st.side = !!ska; st.el.classList.toggle('rp-side', st.side); st.placeT = 0; }
        for (let k = 0; k < n; k++) { const r = C.step(st.p, st.v, C.target(home, st.off), red ? 0 : t, red); st.p = r.p; st.v = r.v; }
        place();
        st.raf = requestAnimationFrame(loop);
    }
    function kick() { if (!st.raf && st.el && !D.hidden) { st.lastF = 0; st.raf = requestAnimationFrame(loop); } }

    /* following your drag in the world (passive listeners on the host: the world keeps its own drag) */
    function onDown(e) { if (!st.el || !st.host || (e.target && e.target.closest && e.target.closest('.rp-pal, button, a, input, textarea, [role=dialog], .wa-panel, .bw3-card, #tabbar, nav'))) return; const h = st.host; st.drag = { x: e.clientX, y: e.clientY, w: h.clientWidth || W.innerWidth || 1, hh: h.clientHeight || W.innerHeight || 1 }; }
    function onMove(e) { const d = st.drag; if (!d) return; st.off = [(e.clientX - d.x) / d.w * 1.6, (e.clientY - d.y) / d.hh * 1.6]; kick(); }
    function onUp() { st.drag = null; }
    function steer(vx, vy) { if (!st.el) return false; st.off = [Math.max(-1, Math.min(1, +vx || 0)), Math.max(-1, Math.min(1, +vy || 0))]; st.steerT = performance.now() + 250; kick(); return true; }

    function hide() {
        quiet(); clearTimeout(st.waitT); st.wait = null; cancelAnimationFrame(st.raf); st.raf = 0;
        const el = st.el, h = st.host; st.el = null; st.id = null; st.drag = null; st.cur = null; st.obs = null;
        if (h) h.classList.remove('rp-on');
        W.removeEventListener('pointerdown', onDown, true); W.removeEventListener('pointermove', onMove, true);
        if (el) { el.classList.remove('rp-in'); setTimeout(() => el.remove(), reduced() ? 0 : 320); }
    }
    function show(id) {
        id = C.pid(id); const h = host();
        if (!id || !h) { hide(); return null; }
        /* Oct 17 (E-man): the explainer cell is Misty's sidekick now, "like an elf flying next to her": it comes along on an
           adventure too and flies beside her (sidekickAt), instead of popping up at a fixed spot */
        if (st.el && st.id === id && st.host === h && st.el.isConnected) return st.el;
        hide();
        const el = build(id); if (!el) return null;
        st.id = id; st.el = el; st.host = h; st.i = 0; st.shown = 0; st.visit = 0; st.off = [0, 0]; st.v = [0, 0]; st.t0 = performance.now(); st.endT = performance.now();
        st.p = [C.FOLLOW.home[0] - 0.12, C.FOLLOW.home[1] + 0.08];   /* swims in from the lower left */
        st.lines = C.lines(id, lang(), W.LowiArrivalCore, todayText(id));
        h.appendChild(el); h.classList.add('rp-on');
        /* the 3D canvas sits under the HUD host on Home, so drags are watched on the window (passive, capture: never blocks the world) */
        W.addEventListener('pointerdown', onDown, { passive: true, capture: true }); W.addEventListener('pointermove', onMove, { passive: true, capture: true });
        place();
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('rp-in')));
        kick();
        /* the very first meeting (remembered on this device): hello. Every visit after that: a short welcome back from a pool,
           never the same one twice in a row, then something it hasn't told you yet. */
        clearTimeout(st.nextT); st.nextT = setTimeout(() => {
            if (st.el !== el) return;
            greeted[id] = 1;
            const o = C.opening(memLoad(), id, lang(), st.lines, seen[id]); memSave();
            if (o.intro) { speak({ text: o.text, prio: 0, kind: 'fact', i: 0 }, false); return; }
            speak(o.i != null ? { text: o.text, prio: 0, kind: 'fact', i: o.i } : { text: o.text, prio: 0, kind: 'back' }, false);
        }, reduced() ? 200 : 900);
        return el;
    }

    /* ---------- the hunt, told by the guide ----------
       misty-hunt.js calls hunt(key, vars, world): the guide says it in its own voice, next to itself. Returns false when no
       guide is in that world (the hunt then falls back to its own short line). */
    let realSaid = false;
    function hunt(key, v, world) {
        if (!st.el || !st.el.isConnected || offView()) return false;
        if (world && C.pid(world) !== st.id) return false;
        v = v || {}; v = Object.assign({}, v, { n: mistyName(), k: v.k != null ? v.k : v.n });
        const L = C.huntLine(key, lang(), v); if (!L) return false;
        speak({ text: L.text, prio: L.prio, kind: 'hunt' }, false);
        /* once per session, after the first catch: the crumbs are a game, not your body */
        if (key === 'found' && !realSaid) { realSaid = true; const R = C.huntLine('real', lang(), v); if (R) setTimeout(() => { if (st.el) speak({ text: R.text, prio: R.prio, kind: 'hunt' }, false); }, 400); }
        return true;
    }
    function mistyName() { try { const T = W.LowiHerbTamagotchi, c = T && T.current ? T.current() : null; const n = c && T.name ? T.name(c.p, c.m) : ''; return n ? String(n).slice(0, 24) : 'Misty'; } catch (e) { return 'Misty'; } }
    /* keeps teaching while you're in a world, without chatter: only after a quiet spell, only something new, a few per visit.
       While you steer and crumbs are left: a nudge towards the nearest one. Otherwise: the next fact it hasn't told you yet. */
    function teach() {
        if (!st.el || st.cur || st.wait || D.hidden) return;
        const now = performance.now();
        if (now - st.endT < (st.visit <= 1 ? 7000 : 26000) || st.visit >= 7) return;
        const Hn = W.LowiMistyHunt, tw = Hn && Hn.toward ? Hn.toward() : null;
        const steering = tw && tw.steerAgo < 5000;
        if (steering && tw.left > 0 && st.lastKind !== 'tip') {
            const L = C.huntLine(tw.behind ? 'behind' : 'dir', lang(), { d: [tw.x, tw.y] });
            if (L) { speak({ text: L.text, prio: L.prio, kind: 'tip' }, false); st.lastKind = 'tip'; return; }
        }
        const k = C.nextFact(st.lines.length, seen[st.id], 1);
        if (k != null) speak({ text: st.lines[k], prio: 0, kind: 'fact', i: k }, false);
        else if (steering && tw.left > 0) { const L = C.huntLine('dir', lang(), { d: [tw.x, tw.y] }); if (L) speak({ text: L.text, prio: L.prio, kind: 'tip' }, false); }
    }
    W.addEventListener('pointerup', onUp, { passive: true }); W.addEventListener('pointercancel', onUp, { passive: true });
    W.addEventListener('lowi:world-region', e => { try { const id = e && e.detail && e.detail.id; if (C.pid(id) && takes(id)) show(id); else hide(); } catch (err) { } });
    W.addEventListener('lowi:region-steer', e => { const d = e && e.detail || {}; steer(d.vx, d.vy); });
    W.addEventListener('lowi:lang', () => { if (st.id) { const id = st.id; hide(); show(id); } });
    W.addEventListener('resize', () => { st.rect = null; st.obs = null; st.size = null; if (st.el) placeSay(true); }, { passive: true });
    /* the menus faded or came back: look again at once (the guide itself stays; clean-view-core keeps #rpPal) */
    W.addEventListener('lowi:clean-view', () => { st.obs = null; if (st.el) { obstacles(); placeSay(true); } });
    D.addEventListener('visibilitychange', () => { if (!D.hidden) kick(); });
    /* the world closed, the host changed or Community zoomed out: the companion leaves with it */
    setInterval(() => {
        if (!st.el) return;
        const R = W.LowiWorldRegions, cur = R && R.current ? R.current() : st.id;
        if (!st.el.isConnected || host() !== st.host || offView() || !C.pid(cur)) { hide(); return; }
        obstacles(); /* keeps the guide itself below the Daily Quest (sidekickAt) */
        teach();
    }, 1200);

    W.LowiRegionPals = {
        takes, show, hide, steer, hunt, next: () => next(true),
        say: text => { if (!st.el || !text) return false; return speak({ text: String(text), prio: 1, kind: 'tip' }, false); },
        current: () => st.id, get line() { return st.el && st.el.classList.contains('rp-talk') && st.cur ? st.cur.text : null; }, get pos() { return st.p.slice(); },
        get spot() { return st.spot; }, get lines() { return st.lines.slice(); }, core: C
    };
})();
