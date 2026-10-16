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
    const st = { id: null, el: null, host: null, lines: [], i: 0, p: C.FOLLOW.home.slice(), v: [0, 0], off: [0, 0], drag: null, steerT: 0, raf: 0, t0: 0, sayT: 0, nextT: 0, shown: 0 };

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
    function sayLine(i, user) {
        if (!st.el || !st.lines.length) return;
        st.i = ((i % st.lines.length) + st.lines.length) % st.lines.length;
        const text = st.lines[st.i], b = st.el.querySelector('.rp-say');
        b.querySelector('.rp-tx').textContent = text;
        st.el.classList.add('rp-talk'); st.shown++;
        clearTimeout(st.sayT); clearTimeout(st.nextT);
        const ms = Math.min(12000, 4000 + text.length * 45);
        st.sayT = setTimeout(quiet, ms);
        /* after the greeting, the first fact follows by itself once; after that, taps lead */
        if (!user && st.i === 0 && st.lines.length > 1) st.nextT = setTimeout(() => sayLine(1, false), Math.min(ms, 5200));
        try { W.dispatchEvent(new CustomEvent('lowi:region-pal', { detail: { id: st.id, line: st.i, text, user: !!user } })); } catch (e) { }
    }
    function quiet() { clearTimeout(st.sayT); clearTimeout(st.nextT); if (st.el) st.el.classList.remove('rp-talk'); }
    function next(user) { if (st.el) sayLine(st.shown ? st.i + 1 : 0, !!user); }

    function place() {
        const el = st.el, h = st.host; if (!el || !h) return;
        const w = h.clientWidth || W.innerWidth, hh = h.clientHeight || W.innerHeight;
        const x = st.p[0] * w, y = st.p[1] * hh;
        el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        el.style.setProperty('--tilt', C.tilt(st.v) + 'deg');
        el.classList.toggle('rp-flip', st.p[0] > 0.55);
    }
    function loop() {
        st.raf = 0;
        if (!st.el || !st.el.isConnected || D.hidden) return;
        const red = reduced(), t = (performance.now() - st.t0) / 1000;
        if (!st.drag && performance.now() > st.steerT) st.off = C.relax(st.off);
        /* frame-rate independent: a slow phone takes up to three spring steps per frame */
        const now = performance.now(), n = Math.max(1, Math.min(3, Math.round((now - (st.lastF || now - 16.7)) / 16.7))); st.lastF = now;
        for (let k = 0; k < n; k++) { const r = C.step(st.p, st.v, C.target(C.FOLLOW.home, st.off), red ? 0 : t, red); st.p = r.p; st.v = r.v; }
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
        quiet(); cancelAnimationFrame(st.raf); st.raf = 0;
        const el = st.el, h = st.host; st.el = null; st.id = null; st.drag = null;
        if (h) h.classList.remove('rp-on');
        W.removeEventListener('pointerdown', onDown, true); W.removeEventListener('pointermove', onMove, true);
        if (el) { el.classList.remove('rp-in'); setTimeout(() => el.remove(), reduced() ? 0 : 320); }
    }
    function show(id) {
        id = C.pid(id); const h = host();
        if (!id || !h) { hide(); return null; }
        if (st.el && st.id === id && st.host === h && st.el.isConnected) { sayLine(st.i, false); return st.el; }
        hide();
        const el = build(id); if (!el) return null;
        st.id = id; st.el = el; st.host = h; st.i = 0; st.shown = 0; st.off = [0, 0]; st.v = [0, 0]; st.t0 = performance.now();
        st.p = [C.FOLLOW.home[0] - 0.12, C.FOLLOW.home[1] + 0.08];   /* swims in from the lower left */
        st.lines = C.lines(id, lang(), W.LowiArrivalCore, todayText(id));
        h.appendChild(el); h.classList.add('rp-on');
        /* the 3D canvas sits under the HUD host on Home, so drags are watched on the window (passive, capture: never blocks the world) */
        W.addEventListener('pointerdown', onDown, { passive: true, capture: true }); W.addEventListener('pointermove', onMove, { passive: true, capture: true });
        place();
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('rp-in')));
        kick();
        clearTimeout(st.nextT); st.nextT = setTimeout(() => { if (st.el === el) sayLine(0, false); }, reduced() ? 200 : 900);
        return el;
    }
    W.addEventListener('pointerup', onUp, { passive: true }); W.addEventListener('pointercancel', onUp, { passive: true });
    W.addEventListener('lowi:world-region', e => { try { const id = e && e.detail && e.detail.id; if (C.pid(id) && takes(id)) show(id); else hide(); } catch (err) { } });
    W.addEventListener('lowi:region-steer', e => { const d = e && e.detail || {}; steer(d.vx, d.vy); });
    W.addEventListener('lowi:lang', () => { if (st.id) { const id = st.id; hide(); show(id); } });
    D.addEventListener('visibilitychange', () => { if (!D.hidden) kick(); });
    /* the world closed, the host changed or Community zoomed out: the companion leaves with it */
    setInterval(() => {
        if (!st.el) return;
        const R = W.LowiWorldRegions, cur = R && R.current ? R.current() : st.id;
        if (!st.el.isConnected || host() !== st.host || offView() || !C.pid(cur)) hide();
    }, 1200);

    W.LowiRegionPals = {
        takes, show, hide, steer, next: () => next(true), say: text => { if (!st.el || !text) return false; st.lines.push(String(text)); sayLine(st.lines.length - 1, false); return true; },
        current: () => st.id, get line() { return st.el && st.el.classList.contains('rp-talk') ? st.lines[st.i] : null; }, get pos() { return st.p.slice(); },
        get lines() { return st.lines.slice(); }, core: C
    };
})();
