/* world-sci.js — real science names in the cell worlds (Oct 23, 2026).
   E-man's tester (human body science): "When we enter a cellular world, it doesn't even say what cellular world we're entering",
   and the things in it should be labeled so you learn almost passively.
   1. Entering a world: a round living bubble shows where you are, the organ small on top and the tissue as the value
      ("Liver / Liver lobule"). It stays about four seconds, never takes a tap, and comes back on every entry.
   2. Flying around: the one key object nearest to you (cells, organelles, molecules: world-sci-core.js TAGS, found by their
      mesh name 'sci:<kind>' in body-world-regions.js) gets a small glass label pinned to it. Tap the label for one plain
      sentence on what is happening; tap again or wait and it folds back. The first time you meet each kind in a session the
      sentence opens by itself for a few seconds, unless the guide is talking.
   Nothing else changes: no sound, no walls of text, one label at a time, labels never sit under the joystick or the guide.
   Probe: tools/sim/sci-names-probe.cjs. Tests: tests/world-sci.test.cjs. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    const C = W.LowiWorldSciCore;
    if (!C || W.LowiWorldSci) return;
    const me = D.currentScript || D.querySelector('script[src*="world-sci.js"]');
    if (!D.getElementById('wsciCss')) {
        const l = D.createElement('link'); l.id = 'wsciCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('world-sci.js', 'world-sci.css') : 'world-sci.css';
        D.head.appendChild(l);
    }
    const lang = () => { try { return String(W.LowiLang.get() || 'de').slice(0, 2).toLowerCase(); } catch (e) { return String(H.lang || 'de').slice(0, 2).toLowerCase(); } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const NAME_MS = 4200, OPEN_MS = 6000, AUTO_MS = 4800, HOLD_MS = 2600, REACH = 26, EVERY = 160;
    const st = { id: null, nameT: 0, raf: 0, last: 0, tag: null, k: null, since: 0, open: false, openT: 0, auto: {}, pin: null, v: null };

    function host() {
        const full = D.querySelector('.bw3-full'); if (full) return full;
        if (H.classList.contains('wh-home')) return D.getElementById('whHud');
        return null;
    }
    const offView = () => H.classList.contains('gx-out') || H.classList.contains('gx-hold') || D.hidden;

    /* 1. the world's name */
    function showName(id) {
        const w = C.world(id, lang()), h = host();
        if (!w || !h) return;
        let n = D.getElementById('bwrWorldName');
        if (!n) { n = D.createElement('div'); n.id = 'bwrWorldName'; n.className = 'bwr-wn'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); n.setAttribute('data-clean-keep', ''); }
        if (n.parentNode !== h) h.appendChild(n);
        n.innerHTML = '<small>' + esc(w.place) + '</small><b>' + esc(w.name) + '</b>';
        n.classList.remove('on'); void n.offsetWidth; n.classList.add('on');
        clearTimeout(st.nameT); st.nameT = setTimeout(() => n.classList.remove('on'), NAME_MS);
    }
    function hideName() { clearTimeout(st.nameT); const n = D.getElementById('bwrWorldName'); if (n) n.classList.remove('on'); }

    /* 2. the label on the nearest key object */
    function tagEl() {
        const h = host(); if (!h) return null;
        let t = st.tag;
        if (!t) {
            t = D.createElement('button'); t.type = 'button'; t.className = 'bwr-sci'; t.setAttribute('data-clean-keep', '');   /* clean-view-core.js: kept inside worlds */
            t.innerHTML = '<b></b><span></span>';
            t.addEventListener('click', e => { e.stopPropagation(); setOpen(!st.open, OPEN_MS); });
            ['pointerdown', 'touchstart'].forEach(n => t.addEventListener(n, e => e.stopPropagation(), { passive: true }));
            st.tag = t;
        }
        if (t.parentNode !== h) h.appendChild(t);
        return t;
    }
    function setOpen(on, ms) {
        const t = st.tag; if (!t) return;
        st.open = !!on; t.classList.toggle('open', st.open); t.setAttribute('aria-expanded', st.open ? 'true' : 'false');
        clearTimeout(st.openT); if (st.open) st.openT = setTimeout(() => setOpen(false), ms || OPEN_MS);
    }
    function hideTag() { const t = st.tag; st.k = null; st.pin = null; if (t) { t.classList.remove('on'); setOpen(false); } }
    function fill(k) {
        const t = tagEl(), d = C.tag(st.id, k, lang()); if (!t || !d) return false;
        t.querySelector('b').textContent = d.name; t.querySelector('span').textContent = d.say;
        t.setAttribute('aria-label', d.name + '. ' + d.say); t.dataset.k = k;
        return true;
    }
    const guideTalking = () => !!D.querySelector('.rp-pal.rp-talk, .rp-pal.rp-asking');

    /* nearest point of one tagged object that you can actually see (in front, inside the middle of the screen) */
    function nearest(o, k, T, camW, cam) {
        const v = st.v || (st.v = { a: new T.Vector3(), b: new T.Vector3(), c: new T.Vector3(), u: new T.Vector3(), q: new T.Vector3(), m: new T.Matrix4(), inv: new T.Matrix4(), pm: new T.Matrix4() });
        if (o.isSprite) { const p = o.getWorldPosition(new T.Vector3()); const s = p.clone().project(cam); return (s.z < 1 && Math.abs(s.x) < 0.8 && Math.abs(s.y) < 0.8) ? p : null; }
        v.inv.copy(o.matrixWorld).invert(); v.c.copy(camW).applyMatrix4(v.inv);
        v.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(o.matrixWorld);
        let best = Infinity, bx = 0, by = 0, bz = 0;
        const take = (x, y, z) => {
            const dx = x - v.c.x, dy = y - v.c.y, dz = z - v.c.z, d = dx * dx + dy * dy + dz * dz; if (d >= best) return;
            v.q.set(x, y, z).applyMatrix4(v.pm); if (!(v.q.z < 1 && v.q.z > -1 && Math.abs(v.q.x) < 0.8 && Math.abs(v.q.y) < 0.8)) return;
            best = d; bx = x; by = y; bz = z;
        };
        if (o.isInstancedMesh) {
            const n = o.count, step = Math.max(1, Math.floor(n / 240)), hh = (o.geometry && o.geometry.parameters && o.geometry.parameters.height) || 0;
            for (let i = 0; i < n; i += step) {
                o.getMatrixAt(i, v.m); v.a.setFromMatrixPosition(v.m);
                if (k === 'fibre' && hh) {            /* a long fibre: points along its axis */
                    const e = v.m.elements; v.u.set(e[4], e[5], e[6]);
                    for (let j = -4; j <= 4; j++) { const t = hh / 2 * j / 4; take(v.a.x + v.u.x * t, v.a.y + v.u.y * t, v.a.z + v.u.z * t); }
                } else take(v.a.x, v.a.y, v.a.z);
            }
        } else {
            const p = o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!p) return null;
            const n = p.count, step = Math.max(1, Math.floor(n / 300));
            for (let i = 0; i < n; i += step) take(p.getX(i), p.getY(i), p.getZ(i));
        }
        if (best === Infinity) return null;
        return new T.Vector3(bx, by, bz).applyMatrix4(o.matrixWorld);
    }
    function candidates(h) {
        const a = W.LowiWorld3D; if (!a || !a.scene || !a.camera || !a.THREE) return [];
        const g = a.scene.getObjectByName('region:' + st.id); if (!g || !g.visible) return [];
        const T = a.THREE, cam = a.camera, camW = cam.getWorldPosition(new T.Vector3()), r = h.getBoundingClientRect(), out = [];
        const known = {}; C.tags(st.id).forEach(t => { known[t.k] = 1; });
        const best = {};
        g.traverse(o => {
            if (!o.name || o.name.indexOf('sci:') !== 0 || !o.visible) return;
            const k = o.name.slice(4); if (!known[k]) return;
            const p = nearest(o, k, T, camW, cam); if (!p) return;
            const d = p.distanceTo(camW); if (best[k] && best[k].d <= d) return;
            const s = p.clone().project(cam);
            best[k] = { k, d, z: s.z, x: (s.x + 1) / 2 * r.width, y: (1 - s.y) / 2 * r.height };
        });
        for (const k in best) out.push(best[k]);
        return out;
    }
    /* keep labels clear of the guide, Misty's bubble, the joystick and the bottom bar */
    function blocked(x, y, h) {
        const r = h.getBoundingClientRect(), X = x + r.left, Y = y + r.top;
        if (Y > W.innerHeight - 170 || Y < 120) return true;
        const els = D.querySelectorAll('.rp-pal .rp-say, .rp-pal .rp-orb, #whPad, #lpPraise, #mhNudge, #whHint');
        for (const e of els) { const b = e.getBoundingClientRect(); if (b.width && X > b.left - 50 && X < b.right + 50 && Y > b.top - 30 && Y < b.bottom + 30) return true; }
        return false;
    }
    function tick(now) {
        st.raf = 0;
        if (!st.id) return;
        st.raf = requestAnimationFrame(tick);
        if (now - st.last < EVERY) { if (st.pin && st.tag) place(st.pin); return; }
        st.last = now;
        const h = host();
        if (!h || offView()) { hideTag(); return; }
        const nameOn = D.querySelector('#bwrWorldName.on');
        const c = candidates(h);
        const r = h.getBoundingClientRect();
        const pick = C.pick(c.filter(p => !blocked(p.x, p.y, h)), r.width, r.height, REACH, 56);
        if (st.open && st.k) { const same = c.find(p => p.k === st.k); if (same && same.z < 1) { st.pin = same; place(same); return; } }
        if (!pick || nameOn) { if (st.k && now - st.since > HOLD_MS) hideTag(); else if (st.pin) place(st.pin); return; }
        if (pick.k !== st.k) {
            if (st.k && now - st.since < HOLD_MS) { const same = c.find(p => p.k === st.k); if (same) { st.pin = same; place(same); } return; }
            if (!fill(pick.k)) return;
            st.k = pick.k; st.since = now; setOpen(false);
            st.tag.classList.add('on');
            const key = st.id + ':' + pick.k;
            if (!st.auto[key] && !guideTalking()) { st.auto[key] = 1; setOpen(true, AUTO_MS); }
        }
        st.pin = pick; place(pick);
    }
    function place(p) {
        const t = st.tag; if (!t || !p) return;
        t.style.transform = 'translate3d(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px,0)';
    }
    function start() { if (!st.raf) st.raf = requestAnimationFrame(tick); }
    function stop() { cancelAnimationFrame(st.raf); st.raf = 0; hideTag(); }

    function enter(id) {
        if (!C.WORLDS[id]) { st.id = null; hideName(); stop(); return; }
        if (st.id === id) return;
        st.id = id; hideTag();
        setTimeout(() => { if (st.id === id) showName(id); }, 500);
        start();
    }
    W.addEventListener('lowi:world-region', e => { const d = e && e.detail || {}; enter(d.id || null); });
    W.addEventListener('lowi:lang', () => { if (st.k) fill(st.k); });
    D.addEventListener('visibilitychange', () => { if (D.hidden) hideTag(); });
    /* already inside a world when this file arrives */
    try { const cur = W.LowiWorldRegions && W.LowiWorldRegions.current && W.LowiWorldRegions.current(); if (cur && C.WORLDS[cur]) enter(cur); } catch (e) { }
    W.LowiWorldSci = {
        enter, showName, state: () => ({ id: st.id, k: st.k, open: st.open }),
        /* for the probe: what is labelable right now */
        probe: () => { const h = host(); return h ? candidates(h).map(p => ({ k: p.k, d: +p.d.toFixed(1), x: Math.round(p.x), y: Math.round(p.y), z: +p.z.toFixed(3), blocked: blocked(p.x, p.y, h) })) : 'no host'; }
    };
})();
