/* LOWiSPIKE world-first Home (Oct 15, Pokémon GO / Finch).
   The living 3D world IS the Home: full-bleed behind everything, Misty in her cell in the middle, the fasting cell and the
   water cell floating next to her. Everything else (today's log, tiles, quests) lives in a see-through sheet that slides
   over the still-running world. Every sheet closes with the same round X at the bottom centre (one thumb).
   A bottom-right button zooms out to the whole world and back in. Tapping Misty opens her own sheet over the world:
   Auras (a cell wears light, not clothes), Growth and Discovered, all in one calm, fixed layout.
   In the 3D world: arriving in a region turns you towards its prettiest part, and Misty floats inside her cell in the hub.
   Moves existing Home nodes (.sp-status, .sp-log) into one wrapper inside #spHome (node identity is kept, every
   module that looks them up via #spHome still finds them). Loads world-home.css itself. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement, C = W.LowiWorldHomeCore;
    if (!C || W.LowiWorldHome) return;
    const AKEY = 'lowi.aura';
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'de').slice(0, 2); } catch (e) { return 'de'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const P = arr => C.pick(arr, lang());
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const w3 = () => W.LowiWorld3D || null;
    if (!D.getElementById('whCss')) {
        const me = D.currentScript || D.querySelector('script[src*="world-home.js"]'), l = D.createElement('link'); l.id = 'whCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('world-home.js', 'world-home.css') : 'world-home.css';
        D.head.appendChild(l);
    }
    const ICO = {
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        out: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8.6" stroke-dasharray="2.4 2.6"/><path d="M3 3l3.2 3.2M21 3l-3.2 3.2M3 21l3.2-3.2M21 21l-3.2-3.2"/></svg>',
        inn: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M4 4l4 4M20 4l-4 4M4 20l4-4M20 20l-4-4M8 4.6V8H4.6M16 4.6V8h3.4M8 19.4V16H4.6M16 19.4V16h3.4"/></svg>',
        vr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16a2 2 0 0 1 2 2v5a2.5 2.5 0 0 1-2.5 2.5h-3.3l-2-2.4a2.8 2.8 0 0 0-4.4 0l-2 2.4H4.5A2.5 2.5 0 0 1 2 15v-5a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="12.4" r="1.5"/><circle cx="16.5" cy="12.4" r="1.5"/></svg>',
        today: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4M8 14h3M8 17h6"/></svg>',
        aura: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="8.5" opacity=".55"/></svg>',
        home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6.5 8 6.5V20H4z"/><path d="M10 20v-5h4v5"/></svg>',
        lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
        sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
    };
    const st = { today: false, x: null, hud: null, zoomAnim: null, heroAnim: null, off: null, misty: null, mistyKey: '', sheetTab: 'aura', wired: false, lastHome: null, zf: 0, mz: '', hintUntil: 0 };

    /* ---------- herb/cell state ---------- */
    function cur() { try { return W.LowiHerbTamagotchi && W.LowiHerbTamagotchi.current ? W.LowiHerbTamagotchi.current() : null; } catch (e) { return null; } }
    function xpNow() { const c = cur(); return c && c.m ? +c.m.xp || 0 : 0; }
    /* BH-006: the companion's name = own companion's name, else a name the user typed, else Misty; never the old herb auto name ("Moss Leaf") */
    function companionName() { const w = typeof window !== 'undefined' ? window : globalThis; const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(w.LowiHerbIdentity && w.LowiHerbIdentity.autoName && w.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = w.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = w.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = w.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n || 'Misty'; }
    function mistyName() { return companionName(); }
    function auraId() { let v = ''; try { v = localStorage.getItem(AKEY) || ''; } catch (e) { } return C.cleanAura(v, xpNow()); }
    function applyAura() {
        const a = C.aura(auraId());
        /* Oct 18 game-perf: tick() calls this every 700 ms; a write with the same value still wakes every <html>/<body> observer,
           so write only when the aura changes */
        if (H.style.getPropertyValue('--wh-aura-a') !== a.a) H.style.setProperty('--wh-aura-a', a.a);
        if (H.style.getPropertyValue('--wh-aura-b') !== a.b) H.style.setProperty('--wh-aura-b', a.b);
        if (H.dataset.whAura !== a.id) H.dataset.whAura = a.id;
    }

    /* ---------- Home: wrap today's log into the sheet, build the HUD ---------- */
    function home() { return D.getElementById('spHome'); }
    /* gx-hold: Home stays the live world for the one second the camera pulls out into the Community galaxy (galaxy-zoom.js). */
    function homeActive() { const t = D.getElementById('tab-home'); return !!(t && (t.classList.contains('active') || H.classList.contains('gx-hold'))); }
    function ensureToday() {
        const h = home(); if (!h) return null;
        let box = D.getElementById('whToday');
        if (box && box.parentNode !== h) { box.remove(); box = null; }
        const status = h.querySelector(':scope > .sp-status'), log = h.querySelector(':scope > .sp-log');
        if (!box) {
            box = D.createElement('div'); box.id = 'whToday'; box.className = 'wh-today';
            box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'false'); box.setAttribute('aria-hidden', 'true');
            box.setAttribute('aria-label', T('Today', 'Heute', 'Hoy'));
            box.innerHTML = '<div class="wh-today-grab" aria-hidden="true"></div>';
            h.appendChild(box);
        }
        if (status && status.parentNode !== box) box.appendChild(status);
        if (log && log.parentNode !== box) box.appendChild(log);
        if (box.querySelector('.sp-status') && box.querySelector('.sp-log') && box.querySelector('.sp-status').compareDocumentPosition(box.querySelector('.sp-log')) & Node.DOCUMENT_POSITION_PRECEDING) box.insertBefore(box.querySelector('.sp-status'), box.querySelector('.sp-log'));
        return box;
    }
    function btn(cls, label, html, attrs) {
        const b = D.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.setAttribute('data-noi18n', '');
        Object.keys(attrs || {}).forEach(k => b.setAttribute(k, attrs[k])); b.innerHTML = html; return b;
    }
    function ensureHud() {
        const tab = D.getElementById('spHome'); if (!tab) return null; /* inside #spHome: Home v2 hides anything new it finds loose in #tab-home */
        let hud = D.getElementById('whHud');
        if (hud && hud.isConnected) return hud;
        hud = D.createElement('div'); hud.id = 'whHud'; hud.className = 'wh-hud';
        const water = btn('wh-cell wh-water', T('Water, add a cup', 'Wasser, ein Glas dazu', 'Agua, un vaso más'), '<span class="wh-cell-fill" aria-hidden="true"></span><span class="wh-cell-tx"><small></small><b><span class="wh-num"></span> <u class="wh-unit"></u></b></span>', { 'data-sp': 'water' });
        const today = btn('wh-todaybtn', T('Open today', 'Heute öffnen', 'Abrir hoy'), ICO.today + '<span><b></b><small></small></span>', { 'data-wh': 'today', 'aria-expanded': 'false', 'aria-controls': 'whToday' });
        const zoom = btn('wh-zoom', T('World map: show the whole world', 'Weltkarte: ganze Welt zeigen', 'Mapa del mundo: ver todo el mundo'), ICO.out + '<span class="wh-zoom-tx"></span>', { 'data-wh': 'zoom' });
        wireStick(zoom);
        /* the gesture / world map hint has its own line above the thumb row, never under the Weltkarte button */
        const hint = D.createElement('p'); hint.className = 'wh-hint'; hint.id = 'whHint'; hint.setAttribute('aria-live', 'polite'); hint.setAttribute('data-noi18n', '');
        ['pointerdown', 'touchstart'].forEach(n => hint.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        const scrim = D.createElement('div'); scrim.className = 'wh-scrim'; scrim.setAttribute('data-wh', 'scrim'); scrim.setAttribute('aria-hidden', 'true');
        hud.append(scrim, water, today, zoom, hint);
        tab.appendChild(hud);
        return hud;
    }
    /* One world (Oct 15): VR / motion viewing right on Home, no extra window. A compact button stacked above the World map
       button, so the thumb row (Klang | Today | World map) keeps its room; it only exists on devices with a motion sensor. */
    function ensureVr() {
        const hud = D.getElementById('whHud'), a = w3(); if (!hud || !a || !a.gyro) return;
        let b = hud.querySelector('.wh-vr');
        let kind = 'none'; try { kind = a.gyro.kind(); } catch (e) { }
        if (kind === 'none') { if (b) b.remove(); return; }
        if (b) { if ((b.dataset.state === 'on') !== !!a.gyro.on()) a.gyro.paint(b); return; }
        b = btn('wh-vr', 'VR', ICO.vr + '<span class="wh-vr-tx">VR</span>', { 'data-wh': 'vr', 'data-short': '1', 'aria-pressed': 'false' });
        ['pointerdown', 'touchstart'].forEach(n => b.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        const hint = hud.querySelector('.wh-hint'); if (hint) hud.insertBefore(b, hint); else hud.appendChild(b);
        a.gyro.paint(b); placeVr();
    }
    function vrHits(b) {
        const r = b.getBoundingClientRect(); if (!r.width) return false;
        let hit = false;
        D.querySelectorAll('#spFast, #whHud .wh-water, #spBubble, .fe-bub').forEach(el => {
            let q = el.getBoundingClientRect(); if (!q.width || !q.height || getComputedStyle(el).display === 'none') return;
            if (el.id === 'spBubble' && H.classList.contains('mf-roam')) {   /* her home cell, not where it drifts with the camera */
                const dx = parseFloat(el.style.getPropertyValue('--mf-bx')) || 0, dy = parseFloat(el.style.getPropertyValue('--mf-by')) || 0;
                q = { left: q.left - dx, right: q.right - dx, top: q.top - dy, bottom: q.bottom - dy };
            }
            if (q.left < r.right + 4 && q.right > r.left - 4 && q.top < r.bottom + 4 && q.bottom > r.top - 4) hit = true;
        });
        return hit;
    }
    /* above World map by default; on a very small phone where Misty's water cell reaches down there, above Klang instead */
    function placeVr() {
        const b = D.querySelector('#whHud .wh-vr'); if (!b || !H.classList.contains('wh-home')) return;
        const was = b.classList.contains('vr-left');
        b.classList.remove('vr-left');
        let left = false;
        if (vrHits(b)) { b.classList.add('vr-left'); left = !vrHits(b); }
        b.classList.toggle('vr-left', left); void was;
    }
    function paintHud() {
        const hud = D.getElementById('whHud'); if (!hud) return;
        const xp = xpNow(), s = C.stage(xp), l = lang();
        void xp; void s;
        /* Misty's bubble itself is her name card: no second "Misty · stage · XP" pill on Home */
        const oldName = hud.querySelector('.wh-name'); if (oldName) oldName.remove();
        paintZoom(); paintHint();
        /* the water cell mirrors the water tile (same data, same +1 glass action) */
        const tile = D.querySelector('#lvDash .lv-water'), wc = hud.querySelector('.wh-water');
        if (tile && wc) {
            const f = parseFloat(tile.style.getPropertyValue('--lv-fill')) || 0;
            { const fv = String(Math.max(0, Math.min(1, f))); if (wc.style.getPropertyValue('--wh-fill') !== fv) wc.style.setProperty('--wh-fill', fv); }
            const lab = tile.getAttribute('aria-label') || '', m = lab.match(/(\d+)\s*\/\s*(\d+)/);
            /* Oct 17 (Emmanuel): the count says its unit, "0/6 cups", in the same n/goal form as Meals and Move */
            const small = wc.querySelector('small'), b = wc.querySelector('b');
            let num = b.querySelector('.wh-num'), unit = b.querySelector('.wh-unit');
            if (!num || !unit) { b.innerHTML = '<span class="wh-num"></span> <u class="wh-unit"></u>'; num = b.querySelector('.wh-num'); unit = b.querySelector('.wh-unit'); }
            const sm = T('Water', 'Wasser', 'Agua'), bv = m ? m[1] + '/' + m[2] : '+1', uv = m ? T('cups', 'Gläser', 'vasos') : '';
            if (small.textContent !== sm) small.textContent = sm;
            if (num.textContent !== bv) num.textContent = bv;
            if (unit.textContent !== uv) unit.textContent = uv;
            { const al = (lab || sm) + ''; if (wc.getAttribute('aria-label') !== al) wc.setAttribute('aria-label', al); }
        }
        const tb = hud.querySelector('.wh-todaybtn b'), ts = hud.querySelector('.wh-todaybtn small');
        const head = D.querySelector('#whToday .sp-status b'), tt = T('Today', 'Heute', 'Hoy');
        if (tb && tb.textContent !== tt) tb.textContent = tt;
        const hint = head ? (head.textContent || '').trim() : '';
        if (ts && ts.textContent !== hint) ts.textContent = hint;
        mirrorTiles();
        void l;
    }
    /* Oct 16: the six Today shortcuts (Check-ins, Meals, Your plate, Medicine, Shopping, Extras) never float over the world as
       bare words. On the world Home #g2hTiles is hidden (world-home.css); the same shortcuts live as a row inside the Today sheet. */
    function mirrorTiles() {
        const box = D.getElementById('whToday'), src = D.getElementById('g2hTiles'); if (!box) return;
        let row = box.querySelector(':scope > .wh-tiles');
        const html = src ? src.innerHTML : '';
        if (!html) { if (row) row.remove(); return; }
        if (!row) { row = D.createElement('div'); row.className = 'wh-tiles'; row.setAttribute('data-noi18n', ''); }
        const st0 = box.querySelector(':scope > .sp-status');
        if (st0 && row.previousElementSibling !== st0) st0.insertAdjacentElement('afterend', row); else if (!st0 && row.parentNode !== box) box.appendChild(row);
        if (row.__h !== html) { row.__h = html; row.innerHTML = html; }
    }
    /* ---------- the today sheet ---------- */
    function openToday(on) {
        const box = ensureToday(); if (!box) return;
        if (on) mirrorTiles();
        st.today = !!on;
        /* Today blooms out of the Today pill like Move's choices, and folds back into it (misty-bloom.js) */
        if (st.today) { try { W.LowiBloom && W.LowiBloom.prep(box); } catch (e) { } }
        H.classList.toggle('wh-today-open', st.today);
        box.setAttribute('aria-hidden', st.today ? 'false' : 'true');
        const b = D.querySelector('#whHud .wh-todaybtn'); b && b.setAttribute('aria-expanded', String(st.today));
        if (st.today) { box.scrollTop = 0; setTimeout(() => { try { box.focus({ preventScroll: true }); } catch (e) { } }, 30); }
        syncX();
    }
    /* ---------- one bottom-centre X for every sheet ---------- */
    function topR2() { try { const t = W.LowiR2 && W.LowiR2.top && W.LowiR2.top(); return t && t.isConnected && !t.classList.contains('full') && t.querySelector('.r2-x') ? t : null; } catch (e) { return null; } }
    function topWorld() { return D.querySelector('.sp-world.on'); }
    function ensureX() {
        let x = D.getElementById('whX');
        if (x && x.isConnected) return x;
        x = btn('wh-x', T('Close', 'Schließen', 'Cerrar'), ICO.x, { id: 'whX' });
        x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); closeTop(); });
        D.body.appendChild(x);
        return x;
    }
    function topHost() { const w = D.getElementById('sheetwrap'); return w && w.classList.contains('open') ? w : null; }
    function closeTop() {
        if (topHost()) { try { W.LowiHost.closeSheet(); } catch (e) { const w = topHost(); w && w.click(); } setTimeout(syncX, 30); return true; }
        const r = topR2();
        if (r) {
            try { W.LowiR2.close(r); } catch (e) { const b = r.querySelector('.r2-x'); b && b.click(); }
            /* the close spring runs on animation frames; if the device is busy and it stalls, the closed sheet must not linger over the world */
            setTimeout(() => { if (r.isConnected && r.classList.contains('off')) r.remove(); syncX(); }, 900);
            setTimeout(syncX, 30); return true;
        }
        if (st.today) { openToday(false); return true; }
        /* One world: travelling in Home's own world, the X flies back to Misty's cell (same warp, reversed) */
        if (H.classList.contains('wh-away')) { try { W.LowiWorldRegions.travel('hub'); } catch (e) { } setTimeout(syncX, 30); return true; }
        const w = topWorld(); if (w) { const b = w.querySelector('[data-sp="close"]'); b && b.click(); setTimeout(syncX, 30); return true; }
        return false;
    }
    function glassSheet(ov) {
        if (!ov || ov.dataset.whGlass) return;
        const sh = ov.querySelector('.r2-sh'); if (!sh) return;
        ov.dataset.whGlass = '1';
        const bg = getComputedStyle(sh).backgroundColor || '', m = bg.match(/rgba?\(([^)]+)\)/);
        if (m) { const p = m[1].split(',').map(s => s.trim()); if (p.length >= 3) sh.style.setProperty('--wh-sheet-bg', 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',0.86)'); }
    }
    function syncX() {
        const x = ensureX(), r = topR2(), w = topWorld(), hs = topHost();
        const on = !!(r || st.today || w || hs); /* a place on Home is no window: no X. World map flies you back (Esc / back gesture too) */
        H.classList.toggle('wh-host-on', !!hs);
        H.classList.toggle('wh-x-on', on);
        H.classList.toggle('wh-r2-on', !!r);
        if (r) glassSheet(r);
        if (x.hidden !== !on) x.hidden = !on; /* Oct 18 game-perf: runs every 700 ms, write only on change */
    }

    /* ---------- zoom: whole world <-> back in ---------- */
    function rig() { const a = w3(); return a && a.rig ? a.rig : null; }
    function animateDist(to, pitch) {
        const a = w3(), r = rig(); if (!a || !r) return;
        hook();
        if (reduced()) { r.dist = to; if (pitch != null) r.pitch = pitch; st.zoomAnim = null; return; }
        /* from out in the spirit world the glide is even in scale (log), so it never leaps through our membrane in one frame */
        st.zoomAnim = { to, pitch, t: 0, log: Math.max(to, r.dist) > (r.maxD || 13) * 1.05 };
        r.idle = 0;
    }
    /* The Home -> Community zoom: the camera backs out of the bloodstream while the galaxy opens around it; settle() puts it back. */
    function pullOut() {
        const r = rig(); if (!r || r.mode !== 'home') return;
        if (reduced()) { if (!st.pull) st.pull = { dist: Math.min(r.dist, r.maxD || 13), pitch: r.pitch }; r.dist = outerD(r); r.pitch = 0.3; return; }
        /* Oct 16 (task 3): Community is the far end of the same camera: the pull keeps going out past the World Map, through our
           own membrane, until our bubble hangs among everyone else's (body-world-3d-scene.js draws that spirit world). The way back
           lands on the view Home had; if the fingers had already taken the camera out past the World Map, it lands on Misty. */
        if (!st.pull) st.pull = r.dist > (r.maxD || 13) * 1.01 ? { dist: baseDist(r), pitch: 0.42 } : { dist: r.dist, pitch: r.pitch };
        hook(); st.zoomAnim = { to: outerD(r), pitch: 0.3, t: 0, log: true, rate: 5.2 }; r.idle = 0;
    }
    /* Galaxy -> Home (Oct 16, E-man: "the camera should fly back down into Misty"): the camera starts out where pullOut() left it, high
       above the bloodstream, and glides back down to Misty's usual view. Misty's bubble grows with it (--wh-mz follows the distance). */
    function diveIn() {
        const r = rig(); if (!r || r.mode !== 'home') return;
        if (reduced()) { settle(); return; }
        /* Oct 16: the camera now stays pulled out while Community (or any other page) shows the world, so aim for the view saved by pullOut() */
        const home = st.pull ? { dist: st.pull.dist, pitch: st.pull.pitch } : { dist: r.dist, pitch: r.pitch };
        st.pull = null;
        r.dist = Math.max(r.dist, Math.min(r.maxD || 13, baseDist(r) * 2.4)); if (r.dist < (r.maxD || 13) * 1.01) r.pitch = 0.34; r.vy = 0; r.idle = 0;
        /* the target is kept as a share of Misty's framing distance: Home re-measures that framing while its layer settles.
           From the spirit world it is one log-even glide back through our membrane and down to Misty (task 3) */
        hook(); st.zoomAnim = { to: home.dist, rel: home.dist / baseDist(r), pitch: home.pitch, t: 0, rate: 4.2, log: true };
        try { frame(1 / 60); } catch (e) { }
    }
    function settle() {
        const r = rig();
        if (st.pull) { if (r) { r.dist = st.pull.dist; r.pitch = st.pull.pitch; } st.zoomAnim = null; st.pull = null; }
        try { tick(); } catch (e) {}
    }
    /* Oct 17 (handoff 6): Home's usual view is the zoomed-out rest view (scene rig.homeRest), not Misty's close-up */
    function baseDist(r) { return r && r.mode === 'home' ? (r.homeRest || r.homeDist || 3.2) : 6.5; }
    function outerD(r) { return r && r.outerD ? r.outerD : 300; }
    /* Oct 16 (task 3): the zoom stick. A rate control like Google Earth's: the farther the knob is pushed, the faster the one camera
       moves, evenly in scale (x per second), from Misty's close-up through the World map and out past our bubble; the far edge hands
       over to Community (frame() above), exactly where a pinch hands over. Let go and the knob springs back and the camera stays.
       Pinch, wheel and double-tap are untouched. */
    const STICK = { MAX: 17, RATE: 1.45, DEAD: 5 };
    function wireStick(b) {
        if (!b || b._stick) return; b._stick = 1;
        let id = null, y0 = 0, v = 0, on = false, raf = 0, last = 0;
        const knob = () => b.querySelector('.wh-stk-knob');
        const put = dy => { const k = knob(); if (k) k.style.transform = dy ? 'translateY(' + dy.toFixed(1) + 'px)' : ''; b.style.setProperty('--stk', (dy / STICK.MAX).toFixed(3)); };
        function tick(ts) {
            raf = 0; if (!on) return;
            const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016); last = ts;
            const r = rig();
            if (r && r.mode === 'home' && v) {
                st.zoomAnim = null; r.vy = 0; r.idle = 0;
                const hi = r.outer ? outerD(r) : (r.maxD || 13), lo = r.minD || 1;
                r.dist = Math.max(lo, Math.min(hi, r.dist * Math.exp(v * STICK.RATE * dt * (r.dist > (r.maxD || 13) ? 1.6 : 1))));
                try { paintZoom(); } catch (e) { }
            }
            raf = requestAnimationFrame(tick);
        }
        b.addEventListener('pointerdown', e => {
            if (id != null || (e.button != null && e.button > 0)) return;
            id = e.pointerId; y0 = e.clientY; v = 0; on = false; last = 0; st.stickDown = Date.now();
            try { b.setPointerCapture(id); } catch (x) { }
            e.stopPropagation();
        });
        b.addEventListener('pointermove', e => {
            if (e.pointerId !== id) return;
            const dy = Math.max(-STICK.MAX, Math.min(STICK.MAX, e.clientY - y0));
            if (!on && Math.abs(e.clientY - y0) < STICK.DEAD) return;
            if (!on) { on = true; b.classList.add('is-held'); if (st.today) openToday(false); hook(); }
            e.preventDefault(); e.stopPropagation();
            put(dy);
            const n = -dy / STICK.MAX; v = Math.sign(n) * Math.pow(Math.abs(n), 1.4);
            if (!raf) raf = requestAnimationFrame(tick);
        });
        const end = e => {
            if (e.pointerId !== id) return; id = null;
            if (on) { st.stickUsed = Date.now(); e.stopPropagation(); }
            /* a plain tap (no drag) is handled right here on pointerup, so it works even where the browser drops the click after
               pointer capture (iOS); the click that may follow is then ignored */
            else if (e.type === 'pointerup' && Date.now() - st.stickDown < 700) { st.stickTap = Date.now(); e.stopPropagation(); try { zoomTap(); } catch (x) { } }
            on = false; v = 0; b.classList.remove('is-held'); put(0);
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
        };
        b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
        ['touchstart', 'touchmove'].forEach(n => b.addEventListener(n, e => e.stopPropagation(), { passive: true }));
    }
    /* World map <-> Misty: the same toggle for a tap on the stick, a click or Enter */
    function zoomTap() { if (st.today) openToday(false); if (homeWorld()) toggleZoom(); else zoomOutWhole(); }
    function homeWorld() { const r = rig(); return !!(r && r.mode === 'home' && homeActive() && !D.querySelector('.bw3-full')); }
    function zoomState() {
        const r = rig(); if (!r || (r.mode !== 'full' && r.mode !== 'home')) return null;
        return C.zoomTarget(r.dist, r.minD, r.maxD, baseDist(r));
    }
    function inRegion() { try { const R = W.LowiWorldRegions; return !!(R && R.current && R.current() !== 'hub'); } catch (e) { return false; } }
    function awayHome() { try { const r = rig(), s = W.LowiWorldRegions && W.LowiWorldRegions.state; if (s && s.warp && s.warp.reveal) return false; /* the warp back out is landing: Misty fades in as her cell slides into place */ return !!(r && r.mode === 'home' && homeActive() && s && (s.busy || (s.cur && s.cur !== 'hub')) && !D.querySelector('.bw3-full')); } catch (e) { return false; } }
    function zoomOutWhole() {
        const a = w3(); if (!a || a.state === 'fallback' || !a.open) return;
        /* Oct 16 (E-man): from inside a place, World map is the fly-to played backwards, ending on the whole world in one move
           (it used to drop the place under a flash and snap to Misty, then zoom out a second later) */
        if (homeWorld()) { const r = rig(); if (inRegion()) { let ok = false; try { const R = W.LowiWorldRegions; ok = R.travel('hub', false, 0, { wide: true }) || (R.state.busy && R.state.next === 'hub'); } catch (e) { } if (!ok || reduced()) setTimeout(() => animateDist(r.maxD, 0.42), 1900); } else animateDist(r.maxD, 0.42); st.hintUntil = Date.now() + 7000; setTimeout(() => { paintZoom(); paintHint(); }, 50); return; }
        if (!a.isOpen || !a.isOpen()) a.open();
        let n = 0;
        const go = () => {
            const r = rig();
            if (!r || r.mode !== 'full' || r.fly) { if (++n < 150) return setTimeout(go, 80); return; } /* a busy device can take a few seconds to open the world */
            if (inRegion()) { try { W.LowiWorldRegions.travel('hub'); } catch (e) { } setTimeout(() => animateDist(r.maxD, 0.42), 1500); }
            else animateDist(r.maxD, 0.42);
            paintZoom();
        };
        setTimeout(go, 120);
    }
    function toggleZoom() {
        const z = zoomState();
        if (!z || inRegion()) return zoomOutWhole();
        const r = rig();
        if (z.out) animateDist(r.maxD, 0.42); else animateDist(baseDist(r), 0.12);
        if (r.mode === 'home') st.hintUntil = Date.now() + 7000;
        setTimeout(() => { paintZoom(); paintHint(); }, 50);
    }
    function isZoomedOut() {
        const r = rig(); if (!r) return false;
        const target = st.zoomAnim ? st.zoomAnim.to : r.dist;
        return !inRegion() && target > (baseDist(r) + (r.maxD || 13)) / 2;
    }
    function paintZoom() {
        const isOut = isZoomedOut();
        const b = D.querySelector('.bw3-full .wh-zoom');
        if (b && b.classList.contains('is-out') !== !!isOut || b && !b.dataset.p) {
            b.dataset.p = '1'; b.innerHTML = isOut ? ICO.inn : ICO.out;
            b.setAttribute('aria-label', isOut ? T('Zoom back in', 'Wieder reinzoomen', 'Volver a acercar') : T('Show the whole world', 'Ganze Welt zeigen', 'Ver todo el mundo'));
            b.classList.toggle('is-out', !!isOut);
        }
        const hb = D.querySelector('#whHud .wh-zoom'); if (!hb) return;
        const out = homeWorld() && isOut, tx = out ? 'Misty' : T('World map', 'Weltkarte', 'Mapa');
        const key = (out ? 'o' : 'i') + tx;
        if (hb.dataset.k !== key) {
            /* Oct 16 (task 3): the World map button is a small glass zoom stick now (Google Earth style). Push the knob up to fly out
               (Misty -> World map -> out through our bubble -> Community), down to come back to Misty; a plain tap still toggles. */
            hb.dataset.k = key; hb.innerHTML = '<span class="wh-stk-track" aria-hidden="true"><i class="wh-stk-up"></i><i class="wh-stk-dn"></i></span><span class="wh-stk-knob" aria-hidden="true">' + (out ? ICO.inn : ICO.out) + '</span><span class="wh-zoom-tx">' + tx + '</span>';
            hb.classList.add('wh-stick', 'no-page-swipe');
            hb.setAttribute('aria-label', (out ? T('Back to Misty', 'Zurück zu Misty', 'Volver a Misty') : T('World map: show the whole world', 'Weltkarte: ganze Welt zeigen', 'Mapa del mundo: ver todo el mundo')) + '. ' + T('Zoom stick: push up to zoom out to Community, down to zoom in to Misty', 'Zoom-Stick: nach oben schieben zoomt bis zur Community, nach unten zurück zu Misty', 'Palanca de zoom: hacia arriba aleja hasta Comunidad, hacia abajo vuelve a Misty'));
            hb.classList.toggle('is-out', out);
        }
    }
    const HINT_KEY = 'lowi.wh.hint.v1';
    function hintState() { try { return JSON.parse(localStorage.getItem(HINT_KEY) || '{}') || {}; } catch (e) { return {}; } }
    function firstTimer() { const h = hintState(); return !h.travelled && (h.opens || 0) <= 3; }
    function hintNote(k) { try { const h = hintState(); if (k === 'open') { if (st.hintOpenCounted) return; st.hintOpenCounted = true; h.opens = (h.opens || 0) + 1; } else h.travelled = 1; localStorage.setItem(HINT_KEY, JSON.stringify(h)); } catch (e) { } }
    W.addEventListener('lowi:world-warp', ev => { if (ev && ev.detail && ev.detail.phase === 'arrive' && ev.detail.id && ev.detail.id !== 'hub') hintNote('travel'); });
    /* one short hint line with its own spot; shown when Home opens and right after the world map zooms */
    function paintHint() {
        const h = D.getElementById('whHint'); if (!h) return;
        const live = H.classList.contains('wh-world-live') && homeWorld();
        const tip = st.vrTip && Date.now() < st.vrTip.until ? st.vrTip.text : '';
        const tx = tip ? tip : isZoomedOut()
            ? T('Tap a glowing place to travel there', 'Tippe auf ein Leuchten, um hinzureisen', 'Toca un brillo para viajar allí')
            : T('Drag to look around · two fingers to zoom', 'Ziehen zum Umsehen · zwei Finger zum Zoomen', 'Arrastra para mirar · dos dedos para hacer zoom');
        if (h.textContent !== tx) h.textContent = tx;
        /* Oct 16 (E-man): the "tap a glowing place" / "drag to look around" lines are for first-timers only: once you have travelled
           somewhere (or seen them on 3 app opens) they stay away. The VR tip (an answer to a button you pressed) still shows. */
        const newbie = firstTimer();
        const on = live && !st.today && (!!tip || (newbie && !H.classList.contains('wh-away') && (Date.now() < (st.hintUntil || 0) || isZoomedOut()))); /* on the world map it stays: tap a glow to travel */
        if (h.classList.contains('on') !== on) h.classList.toggle('on', on);
        /* never on top of Misty's water / fasting cells or the start pill: on tight screens it simply stays out */
        let blk = false;
        if (on) {
            /* its own spot: in the open sky between the header / quest card and Misty, far from the thumb row buttons */
            let top = 0;
            D.querySelectorAll('#spHome .sp-top, #spHome .f3-board, #f3Board').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(el).visibility !== 'hidden') top = Math.max(top, r.bottom); });
            /* Oct 16 (E-man: "Misty is the guide"): the hint is Misty talking, a speech bubble right above her head with its tail on her */
            const mb = D.getElementById('spBubble'), mr = mb && mb.getBoundingClientRect();
            const say = !!(mr && mr.width > 40 && getComputedStyle(mb).opacity !== '0');
            if (h.classList.contains('wh-say') !== say) h.classList.toggle('wh-say', say);
            const tv = Math.round(say ? mr.top - h.offsetHeight - 10 : Math.max(top + 10, 70)) + 'px'; if (h.style.top !== tv) h.style.top = tv;
            const lv = say ? Math.round(mr.left + mr.width / 2) + 'px' : ''; if (h.style.left !== lv) h.style.left = lv;
            if (h.classList.contains('wh-dock')) h.classList.remove('wh-dock');
            const OBS = '#spFast, #whHud .wh-water, #whHud .wh-zoom, #whHud .wh-vr, #whHud .wa-btn, #whHud .wh-todaybtn, .fe-bub, #spHome .sp-top, #spHome .f3-board, #f3Board, [data-orbit], #whPad, #mhNudge.on, ' + (say ? '' : '#spBubble, ') + '#tabbar';
            const hits = hr => { let n = false; D.querySelectorAll(OBS).forEach(el => {
                const r = el.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
                if (r.left < hr.right - 1 && r.right > hr.left + 1 && r.top < hr.bottom - 1 && r.bottom > hr.top + 1) n = true;
            }); return n; };
            blk = hits(h.getBoundingClientRect());
            /* Oct 19 (new-user walkthrough): on the ring Home the spot above Misty's head is always on the Settings / Water / Fuel bubbles,
               so first-timers never saw "Drag to look around". Like Misty's notes (BH-002), it now docks to the top or bottom of the
               screen with no tail when the head spot is taken; it only stays hidden when neither spot is clear. */
            if (blk && say) {
                const hh = h.offsetHeight || 34;
                for (const t of [Math.max(56, top + 10), innerHeight - hh - 28]) {
                    h.style.top = Math.round(t) + 'px'; h.style.left = ''; h.classList.add('wh-dock');
                    if (!hits(h.getBoundingClientRect())) { blk = false; break; }
                }
                if (blk) { h.classList.remove('wh-dock'); h.style.top = tv; h.style.left = lv; }
            }
        }
        if (h.classList.contains('blk') !== blk) h.classList.toggle('blk', blk);
    }
    function ensureFullZoom() {
        const host = D.querySelector('.bw3-full'); if (!host) return;
        if (host.querySelector('.wh-zoom')) return;
        const b = btn('wh-zoom wh-zoom-full', T('Show the whole world', 'Ganze Welt zeigen', 'Ver todo el mundo'), ICO.out, { 'data-wh': 'zoomfull' });
        ['pointerdown', 'touchstart'].forEach(n => b.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleZoom(); });
        host.appendChild(b); paintZoom();
        /* the drag / zoom hint gets its own spot (it used to sit in the header, under the Weltkarte button) */
        const sm = host.querySelector('.bw3-top small'), fh = D.createElement('p'); fh.className = 'wh-fhint'; fh.setAttribute('data-noi18n', '');
        const fs = D.createElement('span'); fs.textContent = (sm && sm.textContent.trim()) || T('Drag to look around · two fingers to zoom', 'Ziehen zum Umsehen · zwei Finger zum Zoomen', 'Arrastra para mirar · dos dedos para hacer zoom');
        fh.appendChild(fs); host.appendChild(fh);
        setTimeout(() => fh.classList.add('off'), 9000);
        /* the day & night slider (atmosphere.js mounts its card into any .r2-look) right here in the world */
        if (W.LowiAtmos) {
            const ab = btn('wh-atmbtn', T('Day & night', 'Tag & Nacht', 'D\u00eda y noche'), ICO.sun, { 'data-wh': 'atm', 'aria-expanded': 'false' });
            const pop = D.createElement('div'); pop.className = 'wh-atm-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', T('Day & night', 'Tag & Nacht', 'D\u00eda y noche'));
            pop.innerHTML = '<div class="r2-look"></div>';
            [ab, pop].forEach(el => ['pointerdown', 'touchstart', 'pointermove', 'touchmove', 'wheel'].forEach(n => el.addEventListener(n, e => e.stopPropagation(), { passive: true })));
            ab.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); pop.hidden = !pop.hidden; ab.setAttribute('aria-expanded', String(!pop.hidden)); ab.classList.toggle('on', !pop.hidden); });
            host.append(ab, pop);
        }
    }

    /* ---------- hero view on arrival in a region ---------- */
    function regionGroup(id) {
        const a = w3(); if (!a || !a.scene) return null;
        return a.scene.children.find(c => c.name === 'region:' + id) || null;
    }
    function samplesOf(g) {
        const a = w3(), THREE = a.THREE, out = [], m4 = new THREE.Matrix4(), v = new THREE.Vector3();
        g.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
        g.traverse(o => {
            if (o === g || !o.visible) return;
            const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
            if (o.isInstancedMesh) {
                const n = Math.min(o.count, 400), step = Math.max(1, Math.floor(o.count / n));
                for (let i = 0; i < o.count; i += step) { o.getMatrixAt(i, m4); v.setFromMatrixPosition(m4).applyMatrix4(rel); out.push([v.x, v.y, v.z, 1.2]); }
            } else if (o.isPoints && o.geometry && o.geometry.attributes.position) {
                const p = o.geometry.attributes.position, size = o.material && o.material.size || 1, w = size >= 1.5 ? 0.9 : size >= 0.5 ? 0.35 : 0.1;
                const step = Math.max(1, Math.floor(p.count / 300));
                for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(rel); out.push([v.x, v.y, v.z, w]); }
            } else if (o.isMesh && o.geometry && o.geometry.attributes.position) {
                const p = o.geometry.attributes.position, step = Math.max(1, Math.floor(p.count / 260));
                for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(rel); out.push([v.x, v.y, v.z, 0.6]); }
            }
        });
        return out;
    }
    function heroTurn(id) {
        const a = w3(), r = rig(); if (!a || !r || !a.THREE || id === 'hub') return;
        const g = regionGroup(id); if (!g) return;
        let hv = null;
        try { hv = C.heroView(samplesOf(g), { camDist: r.dist, want: 5.2 }); } catch (e) { hv = null; }
        if (!hv) return;
        const ang = C.rigAngles(hv.dir, Math.min(0.5, r.pMax || 1.2));
        const toT = g.position.clone().add(new a.THREE.Vector3(hv.dir[0], hv.dir[1], hv.dir[2]).multiplyScalar(hv.shift));
        const q = { id, t: 0, dur: reduced() ? 0 : 1.25, fromT: r.target.clone(), toT, fromY: r.yaw, toY: C.nearAngle(r.yaw, ang.yaw), fromP: r.pitch, toP: ang.pitch };
        st.lastHero = { id, dir: hv.dir, shift: hv.shift, score: hv.score, yaw: q.toY, pitch: q.toP };
        if (!q.dur) { r.target.copy(toT); r.yaw = q.toY; r.pitch = q.toP; r.vy = r.vp = 0; return; }
        st.heroAnim = q; hook();
    }
    function onRegion(e) {
        const id = e && e.detail && e.detail.id;
        /* back from a place on Home: settle on Misty's own framing, exactly the Home view you left */
        /* (the warp played backwards, World map / X, lands on its own framing: Misty's, or the whole world for World map) */
        const rs = W.LowiWorldRegions && W.LowiWorldRegions.state, revTrip = !!(rs && rs.warp && rs.warp.rev);
        if (id === 'hub' && !revTrip) { const r0 = rig(); if (r0 && r0.mode === 'home' && homeActive()) setTimeout(() => { const r = rig(); if (r && r.mode === 'home' && !r.fly && !inRegion() && !st.zoomAnim) animateDist(baseDist(r), 0.12); }, reduced() ? 0 : 1600); }
        if (!id || id === 'hub') { st.heroAnim = null; return; }
        /* wait for the warp to settle (regions: dive -> settle 640 ms), then glide the view to the pretty side */
        let n = 0;
        const go = () => {
            const R = W.LowiWorldRegions, busy = R && R.state && (R.state.warp || R.state.busy);
            if (busy && ++n < 170) return setTimeout(go, 90);
            if (R && R.current && R.current() !== id) return;
            if (!regionGroup(id) && ++n < 170) return setTimeout(go, 90); /* region still mounting on a slow frame */
            heroTurn(id);
        };
        setTimeout(go, reduced() ? 0 : 120);
    }

    /* ---------- Misty inside her cell in the 3D hub ---------- */
    function mistySvg() {
        const s = D.querySelector('#spBubble .tmg-plant') || D.querySelector('.sp-home-herb svg');
        if (!s) return null;
        const c = s.cloneNode(true);
        /* an <img> has no page CSS: keep only the face parts the page shows right now (smile / neutral / sad, open or sleepy eyes) */
        try {
            const F = '.lh-smile,.lh-flat,.lh-calm,.lh-frown,.lh-eyes,.lh-sleep-eyes,.lh-dizzy-eyes,.lh-ooh', os = [...s.querySelectorAll(F)], cs = [...c.querySelectorAll(F)];
            os.forEach((o, i) => {
                if (!cs[i]) return;
                const cs0 = getComputedStyle(o);
                if (cs0.display === 'none') { cs[i].remove(); return; }
                if (o.classList.contains('lh-eyes') && cs0.animationName === 'none' && cs0.transform && cs0.transform !== 'none') cs[i].setAttribute('style', 'transform-box:fill-box;transform-origin:center;transform:' + cs0.transform);
            });
        } catch (e) { }
        c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        c.removeAttribute('class'); c.setAttribute('width', '260'); c.setAttribute('height', '310');
        c.querySelectorAll('.lh-acc,.lh-pot-fx,.lh-constellation,.lh-reflection').forEach(n => n.remove()); /* Oct 19: no oval "ground shadow" baked into the 3D sprite, flight body or face */
        /* the live markup can carry a stray attribute (e.g. a lone quote) that HTML tolerates and XML does not: drop it or the image never loads */
        [c, ...c.querySelectorAll('*')].forEach(n => [...n.attributes].forEach(at => { if (!/^[A-Za-z_][-A-Za-z0-9_.:]*$/.test(at.name)) { try { n.removeAttributeNode(at); } catch (e) { } } }));
        const sty = s.getAttribute('style') || '';
        let txt = new XMLSerializer().serializeToString(c);
        /* CSS variables do not resolve inside an <img>: inline the two herb colours */
        const va = (sty.match(/--tmg-a:\s*([^;]+)/) || [])[1], vb = (sty.match(/--tmg-b:\s*([^;]+)/) || [])[1];
        if (va) txt = txt.split('var(--tmg-a)').join(va.trim());
        if (vb) txt = txt.split('var(--tmg-b)').join(vb.trim());
        return txt;
    }
    function ensureMisty3D() {
        const a = w3(); if (!a || !a.ready || !a.THREE || !a.hub) return;
        const txt = mistySvg(); if (!txt) return;
        const key = txt.length + ':' + auraId();
        if (st.misty && st.misty.parent === a.hub && st.mistyKey === key) return;
        const THREE = a.THREE;
        if (!st.misty || st.misty.parent !== a.hub) {
            if (st.misty && st.misty.parent) st.misty.parent.remove(st.misty);
            const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0.98 });
            st.misty = new THREE.Sprite(mat); st.misty.name = 'wh-misty'; st.misty.renderOrder = 60; st.misty.scale.set(1.25, 1.25 * 310 / 260, 1);
            st.misty.userData.wh = true; st.misty.visible = false; a.hub.add(st.misty);
        }
        st.mistyKey = key;
        const img = new Image(), url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt), sp = st.misty;
        img.onload = () => {
            try {
                const cv = D.createElement('canvas'); cv.width = 260; cv.height = 310; const x = cv.getContext('2d');
                const au = C.aura(auraId()), g = x.createRadialGradient(130, 150, 10, 130, 150, 128);
                g.addColorStop(0, au.a + '55'); g.addColorStop(1, au.a + '00'); x.fillStyle = g; x.fillRect(0, 0, 260, 310);
                x.drawImage(img, 0, 0, 260, 310);
                const old = sp.material.map; sp.material.map = new THREE.CanvasTexture(cv); sp.material.needsUpdate = true; if (old) old.dispose();
            } catch (e) { }
        };
        img.onerror = () => { st.mistyKey = ''; };
        img.src = url;
    }

    /* ---------- per-frame: zoom glide, hero turn, Misty visibility ---------- */
    function hook() {
        if (st.off) return true;
        const a = w3(); if (!a || !a.onFrame) return false;
        st.off = a.onFrame(dt => frame(Math.max(1 / 240, Math.min(0.05, dt || 0.016))));
        return true;
    }
    function frame(dt) {
        const r = rig(); if (!r) return;
        if (st.zoomAnim) {
            const z = st.zoomAnim; z.t += dt; if (z.rel) z.to = z.rel * baseDist(r);
            if ((r.mode !== 'full' && r.mode !== 'home') || Math.abs(r.vy) > 0.02) st.zoomAnim = null;
            else if (z.t > 2.5) { r.dist = z.to; if (z.pitch != null) r.pitch = z.pitch; st.zoomAnim = null; paintZoom(); }
            else {
                const k = Math.min(1, dt * (z.rate || 3.2));
                /* log: even in scale, so a pull from Misty to the spirit world (x30) never jumps in its first frames */
                if (z.log && r.dist > 0 && z.to > 0) r.dist = Math.exp(Math.log(r.dist) + (Math.log(z.to) - Math.log(r.dist)) * k);
                else r.dist += (z.to - r.dist) * k;
                if (z.pitch != null) r.pitch += (z.pitch - r.pitch) * k; r.idle = 0;
                if (Math.abs(z.to - r.dist) < (z.log ? Math.max(0.02, z.to * 0.003) : 0.02)) { r.dist = z.to; st.zoomAnim = null; paintZoom(); }
            }
        }
        if (st.heroAnim) {
            const q = st.heroAnim; q.t += dt;
            const k = Math.min(1, q.t / q.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            if (r.fly || (r.mode !== 'full' && r.mode !== 'home')) st.heroAnim = null;
            else {
                r.target.lerpVectors(q.fromT, q.toT, e); r.yaw = q.fromY + (q.toY - q.fromY) * e; r.pitch = q.fromP + (q.toP - q.fromP) * e;
                r.vy = r.vp = 0; r.idle = 0;
                if (k >= 1) st.heroAnim = null;
            }
        }
        if (r.mode === 'home') {
            /* Oct 17 (handoff 6, E-man: zoomed-out Home by default, "like physically pulling back"): the first time Home's world shows,
               the one camera starts at Misty's close-up and glides back to the zoomed-out rest view. Once per session, never with reduced motion. */
            if (!st.restIntro && r.homeRest && homeActive() && H.classList.contains('wh-world-live')) {
                st.restIntro = true;
                if (!reduced() && !st.zoomAnim && !st.pull && !r.fly && !inRegion() && Math.abs(r.dist - r.homeRest) < r.homeRest * 0.02) {
                    r.dist = r.homeDist; st.zoomAnim = { to: r.homeRest, rel: 1, t: 0, rate: 1.8, log: true };
                }
            }
            /* Oct 16 (task 3): past the World Map the world opens into the spirit world (pinch, wheel or the zoom stick). Misty's
               cell, the place names and the hints step aside out there; at its far edge the camera hands over to Community. */
            r.outer = !reduced();
            const gx = H.classList.contains('mf-galaxy'); /* galaxy breakout (misty-galaxy.js): Misty flies out there herself, Home stays Home */
            const far = r.dist > (r.maxD || 13) * 1.06 && !gx && !inRegion(); /* Oct 17: inside a world the camera's distance is the world's own, not past Home's World Map */ if (H.classList.contains('wh-cosmos') !== far) H.classList.toggle('wh-cosmos', far);
            const fk = Math.max(0, Math.min(1, Math.log(Math.max(1, r.dist / (r.maxD || 13))) / Math.log(outerD(r) / (r.maxD || 13))));
            /* Oct 18 game-perf: this runs every frame; an inherited variable written on <html> restyles the whole page and wakes the
               <html> observers, so write it only when the value moves */
            { const fv = fk.toFixed(3); if (H.style.getPropertyValue('--wh-far') !== fv) H.style.setProperty('--wh-far', fv); }
            if (fk > 0.9 && !gx && !st.zoomAnim && !st.pull && homeActive() && !H.classList.contains('gx-out') && !H.classList.contains('gx-in') && Date.now() - (st.farGo || 0) > 2500) {
                st.farGo = Date.now(); try { if (W.goTab) W.goTab('foryou'); } catch (e) { }
            }
            /* One world: while Home travels to a place (and stays there), Misty's cell, water and fasting step aside */
            const aw = awayHome(); if (H.classList.contains('wh-away') !== aw) {
                H.classList.toggle('wh-away', aw);
                /* Oct 17 (Emmanuel: no Home panels inside a cell world): Today never rides along into a world */
                if (aw && st.today) { try { openToday(false); } catch (e) { } }
                syncX();
            }
            const k = Math.max(0.12, Math.min(1.4, (r.homeDist || 3.2) / Math.max(0.1, r.dist))), kv = k.toFixed(3);
            if (kv !== st.mz) { st.mz = kv; const b = D.getElementById('spBubble'); if (b) b.style.setProperty('--wh-mz', kv); H.classList.toggle('wh-mapview', k < 0.6); }
            if (++st.zf % 20 === 0) { paintZoom(); paintHint(); }
        }
        adventure(dt, r);
        { const wd = st.adv.wand, pf = !!(st.pad.mode && wd && wd.visible && wd.material.opacity > 0.3); if (H.classList.contains('wh-padfly') !== pf) H.classList.toggle('wh-padfly', pf); }
        if (st.misty) {
            const show = r.mode === 'full' && !inRegion() && !st.adv.away;
            if (st.misty.visible !== show) st.misty.visible = show;
            if (show && !reduced()) { const t = performance.now() / 1000; st.misty.position.set(0, Math.sin(t * 1.3) * 0.06, 0); }
        }
    }

    /* ---------- Oct 16: Misty's adventures + how strong she looks ----------
       E-man: no "In the garden 1:00" label. When Misty goes out (full sun, LowiSun away), you SEE her floating through the world,
       stopping to tend things: each stop sends a ring of light and sparkles into the world around her.
       Vigor 0..1 comes from today only: sun meter ratio (tracking) up, world mood level (spiky food, no Move) down.
       Thriving: bright, quick, generous sparkles. Weak: slow, drooping, faded, sparse grey sparkles, and her bubble turns reddish
       (membrane colour in 3D, a red rim on the DOM bubble via #spHome[data-misty="weak"]). */
    st.adv = { away: false, vigor: 0.6, chk: 9, t: 0, slow: 0, next: 3, wand: null, pts: null, ring: null, ringT: 9, red: null, tier: '' };
    function advRead() {
        let mood = 0, ratio = 0, away = false;
        try { mood = +(W.LowiWorldMood && W.LowiWorldMood.level) || 0; } catch (e) { }
        try { const v = W.LowiSun && W.LowiSun.live && W.LowiSun.live(); if (v) { ratio = +v.ratio || 0; away = !!v.away; } } catch (e) { }
        const A = st.adv; A.away = away;
        /* Oct 16: one energy for face, flight and travel: LowiSun.energyNow() (tracked meals by verdict, water, Move).
           Fallback only if sun-meter.js is missing. */
        let en = null;
        try { en = W.LowiSun && W.LowiSun.energyNow && W.LowiSun.energyNow(); } catch (e) { }
        A.vigor = en ? en.value : Math.max(0, Math.min(1, 0.55 + 0.45 * ratio - 0.75 * mood));
        const tier = en ? en.tier : A.vigor < 0.4 ? 'weak' : A.vigor > 0.75 ? 'thriving' : 'ok';
        const home = D.getElementById('spHome');
        if (home) { if (home.dataset.misty !== tier) home.dataset.misty = tier; if (away) home.dataset.mistyOut = '1'; else delete home.dataset.mistyOut; }
        A.tier = tier;
    }
    function ringTex(THREE) {
        const cv = D.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
        const g = x.createRadialGradient(64, 64, 34, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv);
    }
    function advBuild(a) {
        const THREE = a.THREE, A = st.adv;
        const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0 });
        A.wand = new THREE.Sprite(mat); A.wand.name = 'wh-misty-out'; A.wand.userData.lwKeep = true; A.wand.renderOrder = 61; A.wand.visible = false; a.scene.add(A.wand);
        const N = 48, pos = new Float32Array(N * 3).fill(-999), geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        A.pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.11, color: '#a8ffd8', transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
        A.pts.name = 'wh-misty-sparkles'; A.pts.userData.lwKeep = true; A.pts.renderOrder = 59; A.pts.frustumCulled = false; A.pts.visible = false; A.pts.userData.v = new Float32Array(N * 3); A.pts.userData.life = new Float32Array(N); a.scene.add(A.pts);
        A.ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(THREE), transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0, blending: THREE.AdditiveBlending }));
        A.ring.name = 'wh-misty-ring'; A.ring.userData.lwKeep = true; A.ring.renderOrder = 58; A.ring.visible = false; a.scene.add(A.ring);
        A.c = new THREE.Vector3(); A.rt = new THREE.Vector3(); A.up = new THREE.Vector3(); A.fw = new THREE.Vector3(); A.tmp = new THREE.Vector3();
    }
    function burst(A, p, n, spread) {
        const pos = A.pts.geometry.attributes.position, v = A.pts.userData.v, life = A.pts.userData.life;
        for (let i = 0, made = 0; i < life.length && made < n; i++) {
            if (life[i] > 0) continue; made++;
            life[i] = 1.2 + Math.random() * 0.8;
            pos.setXYZ(i, p.x, p.y, p.z);
            const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI, sp = spread * (0.4 + Math.random() * 0.6);
            v[i * 3] = Math.cos(th) * Math.sin(ph) * sp; v[i * 3 + 1] = Math.cos(ph) * sp + 0.15; v[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * sp;
        }
        pos.needsUpdate = true;
    }
    function adventure(dt, r) {
        const a = w3(), A = st.adv; if (!a || !a.THREE || !a.scene || !a.camera) return;
        if ((A.chk += dt) > 1) { A.chk = 0; advRead(); }
        /* Oct 19 (E-man: "at a hundred percent ... really fast, really strong, the world should be moving ... when their power goes
           down, they notice"): how her energy FEELS (LowiSun.feel: world pace 0.8 resting .. 1.6 at the peak, peak 0..1 above ~82%),
           eased over ~1 s so it never jumps, published once for the world (body-world-3d-scene.js) and misty-bump.js. */
        { const LS = W.LowiSun, f = LS && LS.feel ? LS.feel(A.vigor, reduced()) : null;
            if (f) { const q = Math.min(1, dt * 0.9), F = A.feel || (A.feel = { k: f.k, pace: f.pace, peak: f.peak });
                F.k = f.k; F.pace += (f.pace - F.pace) * q; F.peak += (f.peak - F.peak) * q; W.LowiVigorFeel = F; } }
        /* her bubble turns reddish when she is weak (and goes back to the brand blue when she is not) */
        const mu = a.memU;
        if (mu && !A.red) { A.red = new a.THREE.Color('#c4505f'); A.redRim = new a.THREE.Color('#e08a96'); A.rim0 = mu.uRim.value.clone(); }
        if (mu) {
            const want = A.tier === 'weak' ? Math.min(0.7, Math.max(0, 0.4 - A.vigor) / 0.4 * 0.5 + 0.2) : 0;
            A.redK = (A.redK || 0) + (want - (A.redK || 0)) * Math.min(1, dt * 1.5);
            if (A.redK > 0.002 || A.redWas) {
                const base = H.getAttribute('data-theme') === 'light' ? '#2e8fd6' : '#3a9fe0';
                { mu.uIn.value.set(base).lerp(A.red, A.redK); mu.uRim.value.copy(A.rim0).lerp(A.redRim, A.redK); }
                A.redWas = A.redK > 0.002;
            }
        }
        /* Oct 16: the bubble controller (misty-pad.js) can take Misty out of her cell at any time: drive = you steer, auto = she
           flies her own adventure (a slow, sleepy drift when her energy is low), home = she glides back into her cell */
        const PD = st.pad, padOn = !!PD.mode;
        const show = (A.away || padOn) && (r.mode === 'home' || r.mode === 'full') && !inRegion() && !awayHome() && !D.hidden;
        /* Oct 16 (E-man): misty-flight.js takes over the steering at Home: out of her bubble (it stretches, never pops), across the
           whole world at her real size, and into a place by flying (the tap's warp), still steerable inside. Old path = fallback. */
        const MF = W.LowiMistyFlight, mfx = MF && MF.wants ? { a, r, A, PD, dt, k: A.vigor, wand: A.wand, reduced: reduced(), inRegion: inRegion(), awayHome: awayHome(), burst: (p, n, sp) => burst(A, p, n, sp) } : null;
        let mf = false; try { mf = !!(mfx && MF.wants(mfx)); } catch (e) { mf = false; }
        if (!A.wand) { if (!show && !mf) return; advBuild(a); if (mfx) mfx.wand = A.wand; }
        const wand = A.wand, pm = A.pts.material, k = A.vigor;
        /* misty-face: while her face is drawn on its own (she turns in 3D), the wand carries her faceless body; never bake the face back on */
        if (st.misty && st.misty.material.map && wand.material.map !== st.misty.material.map && !(wand.userData.mfFaceT > performance.now() - 400)) { wand.material.map = st.misty.material.map; wand.material.needsUpdate = true; }
        if (!wand.material.map) ensureMisty3D3();
        const fade = (show || mf) && wand.material.map ? 1 : 0;
        wand.material.opacity += ((fade ? 0.55 + 0.43 * k : 0) - wand.material.opacity) * Math.min(1, dt * 2.5);
        /* Oct 18 evening: her body keeps its energy look; her face (misty-face) follows only her fade in / out, solid once she is there */
        { const pr = Math.min(1, wand.material.opacity / (0.55 + 0.43 * k)), p2 = fade && pr > 0.99 ? 1 : +pr.toFixed(3); if (wand.userData.mfPresence !== p2) wand.userData.mfPresence = p2; }
        wand.visible = wand.material.opacity > 0.01;
        /* sparkles keep falling even while she fades out */
        const pos = A.pts.geometry.attributes.position, v = A.pts.userData.v, life = A.pts.userData.life; let alive = 0;
        for (let i = 0; i < life.length; i++) {
            if (life[i] <= 0) continue;
            life[i] -= dt; if (life[i] <= 0) { pos.setXYZ(i, -999, -999, -999); continue; }
            alive++; v[i * 3 + 1] -= dt * 0.25;
            pos.setXYZ(i, pos.getX(i) + v[i * 3] * dt, pos.getY(i) + v[i * 3 + 1] * dt, pos.getZ(i) + v[i * 3 + 2] * dt);
        }
        if (alive) pos.needsUpdate = true;
        A.pts.visible = alive > 0;
        if (A.ring.visible) {
            A.ringT += dt; const q = Math.min(1, A.ringT / 1.6);
            const sc = 0.3 + q * (1.4 + 1.2 * k); A.ring.scale.set(sc, sc, 1); A.ring.material.opacity = (1 - q) * (0.35 + 0.55 * k);
            if (q >= 1) A.ring.visible = false;
        }
        if (mf) { try { MF.frame(mfx); return; } catch (e) { if (!A.mfErr) { A.mfErr = 1; console.error('misty-flight', e); } } }
        if (!wand.visible) return;
        /* where: a slow loop around Misty's cell, in the plane facing the camera, a little in front of it */
        const cam = a.camera; cam.updateMatrixWorld();
        A.rt.setFromMatrixColumn(cam.matrixWorld, 0).normalize(); A.up.setFromMatrixColumn(cam.matrixWorld, 1).normalize(); A.fw.setFromMatrixColumn(cam.matrixWorld, 2).normalize();
        if (a.hub) a.hub.getWorldPosition(A.c); else A.c.set(0, 0, 0);
        const sleepy = PD.mode === 'auto' && k < 0.4;
        const speed = (0.45 + 0.75 * k) * (A.slow > 0 ? 0.12 : 1) * (sleepy ? 0.5 : 1);
        if (!reduced()) A.t += dt * speed; else if (PD.mode === 'auto') A.t += dt * speed * 0.4;
        if (A.slow > 0) A.slow -= dt;
        const t = A.t, spanX = (r.mode === 'home' ? 2.05 : 3.2) * (sleepy ? 0.65 : 1), droop = (1 - k) * 0.55;
        let x = spanX * Math.sin(t * 0.42), y = 1.05 * (sleepy ? 0.6 : 1) * Math.sin(t * 0.67 + 1.1) + 0.35 - droop + (k < 0.35 ? Math.sin(t * 5) * 0.04 : 0), z = 0.6 + 0.4 * Math.cos(t * 0.42);
        if (padOn || PD.blend > 0) {
            const span = r.mode === 'home' ? 2.1 : 3.2, bob = reduced() ? 0 : Math.sin(performance.now() / 1000 * 1.6) * 0.05;
            let tx = x, ty = y, tz = z, rate = 2.4;
            if (PD.mode === 'drive') {
                /* tired Misty is slower and sinks a little; full of energy she is quick */
                const vmax = 0.7 + 1.5 * k;
                PD.x = Math.max(-span, Math.min(span, PD.x + PD.vx * vmax * dt));
                PD.y = Math.max(-1.25, Math.min(1.6, PD.y + PD.vy * vmax * dt));
                const moving = Math.abs(PD.vx) + Math.abs(PD.vy) > 0.05;
                PD.idle = moving ? 0 : PD.idle + dt;
                if (PD.idle > 20) { PD.mode = 'home'; try { W.dispatchEvent(new CustomEvent('lowi:pad', { detail: { mode: 'home' } })); } catch (e) { } }
                tx = PD.x; ty = PD.y - droop * 0.5 + bob; tz = 0.6; rate = 7;
                if (moving && (PD.trail = (PD.trail || 0) - dt) <= 0) {
                    PD.trail = 0.14 / (0.5 + k); pm.color.set(A.tier === 'weak' || A.tier === 'tired' ? '#9aa3b2' : '#9fe3ff'); pm.opacity = 0.45 + 0.4 * k;
                    A.tmp.copy(wand.position).addScaledVector(A.up, -0.2); burst(A, A.tmp, 1 + Math.round(2 * k), 0.12);
                }
                A.next = Math.max(A.next, moving ? 2.5 : 0);
            } else if (PD.mode === 'home') {
                tx = PD.homeX; ty = PD.homeY; tz = 0.6; rate = 3;
                if (A.away) PD.mode = '';
                else if (Math.abs(PD.cx - tx) + Math.abs(PD.cy - ty) < 0.06) { PD.mode = ''; PD.blend = 0; try { W.dispatchEvent(new CustomEvent('lowi:pad', { detail: { mode: '' } })); } catch (e) { } }
            }
            if (PD.mode === 'auto' || (!PD.mode && A.away)) { PD.x = PD.cx; PD.y = PD.cy; }
            const q = Math.min(1, dt * rate);
            PD.cx += (tx - PD.cx) * q; PD.cy += (ty - PD.cy) * q; PD.cz += (tz - PD.cz) * q;
            x = PD.cx; y = PD.cy; z = PD.cz;
            if (!padOn) PD.blend = A.away ? Math.max(0, PD.blend - dt * 0.5) : 0;
        } else if (A.away) { PD.cx = x; PD.cy = y; PD.cz = z; } else { x = PD.cx; y = PD.cy; z = PD.cz; }
        wand.position.copy(A.c).addScaledVector(A.rt, x).addScaledVector(A.up, y).addScaledVector(A.fw, z);
        const s0 = r.mode === 'home' ? 0.95 : 1.1, s = s0 * (0.82 + 0.18 * k) * (1 + (reduced() ? 0 : Math.sin(t * 2.2) * 0.03));
        wand.scale.set(s, s * 310 / 260, 1);
        wand.material.rotation = reduced() ? 0 : Math.sin(t * 0.9) * 0.12 - (1 - k) * 0.18;
        if (wand.material.color) wand.material.color.setRGB(1, 0.78 + 0.22 * k, 0.78 + 0.22 * k);
        /* she tends something: slows down, a ring of light opens around her, sparkles spill into the world */
        if ((A.next -= dt) <= 0) {
            A.next = (3.2 + Math.random() * 2) / (0.6 + 0.6 * k); A.slow = 1.4;
            pm.color.set(A.tier === 'weak' || A.tier === 'tired' ? '#9aa3b2' : A.tier === 'thriving' ? '#bfffe0' : '#9fe3ff'); pm.opacity = 0.5 + 0.45 * k;
            A.tmp.copy(wand.position).addScaledVector(A.up, -0.25 * s);
            burst(A, A.tmp, Math.round(5 + 19 * k), 0.35 + 0.45 * k);
            if (!reduced()) { A.ring.position.copy(A.tmp); A.ring.material.color.set(A.tier === 'weak' ? '#c98a92' : '#a8ffd8'); A.ringT = 0; A.ring.visible = true; }
        }
    }
    /* the bubble controller's way in: pad({ mode, vx, vy }); vx/vy -1..1 (right / up). Returns what the world is doing now. */
    st.pad = { mode: '', vx: 0, vy: 0, x: 0, y: 0, cx: 0, cy: 0, cz: 0.6, homeX: 0, homeY: 0, idle: 0, blend: 0 };
    function pad(cmd) {
        const PD = st.pad, A = st.adv;
        if (cmd && typeof cmd === 'object') {
            if ('mode' in cmd && cmd.mode !== PD.mode) {
                const m = ['', 'drive', 'auto', 'home'].indexOf(cmd.mode) >= 0 ? cmd.mode : '';
                if (!PD.mode && m) { if (!A.away) { PD.cx = PD.homeX; PD.cy = PD.homeY; PD.cz = 0.6; } PD.x = PD.cx; PD.y = PD.cy; A.next = 2.5; }
                if (m === 'home' && A.away) { PD.mode = ''; PD.blend = 1; }
                else { PD.mode = m; if (!m && A.away) PD.blend = 1; }
                PD.idle = 0; if (PD.mode !== 'drive') PD.vx = PD.vy = 0;
            }
            if ('vx' in cmd) PD.vx = Math.max(-1, Math.min(1, +cmd.vx || 0));
            if ('vy' in cmd) PD.vy = Math.max(-1, Math.min(1, +cmd.vy || 0));
            if (PD.vx || PD.vy) PD.idle = 0;
        }
        const out = { mode: PD.mode, away: !!A.away, tier: A.tier || '', vigor: +(A.vigor || 0).toFixed(2), x: +PD.cx.toFixed(2), y: +PD.cy.toFixed(2), flying: H.classList.contains('wh-padfly'), visible: !!(A.wand && A.wand.visible) };
        const a = w3();
        if (a && a.camera && A.wand) { const v = A.wand.position.clone().project(a.camera); out.sx = Math.round((v.x + 1) / 2 * innerWidth); out.sy = Math.round((1 - v.y) / 2 * innerHeight); }
        return out;
    }
    function ensureMisty3D3() { if (!st.misty) { try { ensureMisty3D(); } catch (e) { } } }

    /* ---------- Misty's sheet: Aura / Growth / Discovered ---------- */
    function mistyArt() {
        const c = cur();
        try { if (c && W.LowiHerbTamagotchi.plantHTML) return W.LowiHerbTamagotchi.plantHTML(c.m, 'preview', c.p, { label: mistyName() }); } catch (e) { }
        const s = D.querySelector('#spBubble .tmg-plant'); return s ? s.outerHTML : '';
    }
    function dexItems() { try { return Object.values((W.LowiDex && W.LowiDex.state && W.LowiDex.state().mine) || {}); } catch (e) { return []; } }
    function panelAura(xp) {
        const items = C.auraItems(xp, auraId());
        return '<p class="wh-ms-lead">' + esc(T('A cell doesn\u2019t wear clothes. It wears light. Pick the glow of your membrane.', 'Eine Zelle tr\u00e4gt keine Kleidung. Sie tr\u00e4gt Licht. W\u00e4hl das Leuchten deiner Membran.', 'Una c\u00e9lula no lleva ropa. Lleva luz. Elige el brillo de tu membrana.')) + '</p>' +
            '<div class="wh-auras" role="radiogroup" aria-label="' + esc(T('Aura', 'Aura', 'Aura')) + '">' + items.map(a => '<button type="button" role="radio" class="wh-aura wh-aura-' + a.status + '" data-wh="aura" data-id="' + a.id + '" aria-checked="' + (a.status === 'on') + '"' + (a.status === 'locked' ? ' aria-disabled="true"' : '') + ' style="--a:' + a.a + ';--b:' + a.b + '" aria-label="' + esc(P(a.n) + ', ' + (a.status === 'locked' ? T('from ' + a.xp + ' XP', 'ab ' + a.xp + ' XP', 'desde ' + a.xp + ' XP') : a.status === 'on' ? T('active', 'aktiv', 'activa') : T('ready', 'bereit', 'lista'))) + '"><span class="wh-aura-orb" aria-hidden="true">' + (a.status === 'locked' ? ICO.lock : a.status === 'on' ? ICO.check : '') + '</span><b>' + esc(P(a.n)) + '</b><small>' + esc(a.status === 'locked' ? a.xp + ' XP' : a.status === 'on' ? T('Active', 'Aktiv', 'Activa') : T('Ready', 'Bereit', 'Lista')) + '</small></button>').join('') + '</div>' +
            (W.LowiCellRoom && W.LowiCellRoom.openRoom ? '<button type="button" class="wh-ms-room" data-wh="room">' + ICO.home + '<span><b>' + esc(T('Misty\u2019s home', 'Mistys Zuhause', 'La casa de Misty')) + '</b><small>' + esc(T('Decorate the room in your bloodstream', 'Das Zimmer in deinem Blutkreislauf einrichten', 'Decora su cuarto en tu sangre')) + '</small></span></button>' : '');
    }
    function panelGrowth(xp) {
        const s = C.stage(xp);
        return '<p class="wh-ms-lead">' + esc(T('Misty grows with what you do: log a meal, drink water, scan, move. Each one gives XP.', 'Misty w\u00e4chst mit dem, was du tust: Essen eintragen, Wasser trinken, scannen, bewegen. Jedes gibt XP.', 'Misty crece con lo que haces: registrar comida, beber agua, escanear, moverte. Todo da XP.')) + '</p>' +
            '<ol class="wh-steps">' + C.STAGES.map((g, i) => '<li class="' + (i < s.index ? 'done' : i === s.index ? 'now' : 'next') + '"><i aria-hidden="true"></i><span><b>' + esc(P(g.n)) + (i === s.index ? ' \u00b7 ' + esc(T('you are here', 'du bist hier', 'est\u00e1s aqu\u00ed')) : '') + '</b><small>' + esc(g.xp + ' XP \u00b7 ' + P(g.d)) + '</small></span></li>').join('') + '</ol>';
    }
    function panelFound() {
        const items = dexItems(), n = items.length;
        return '<p class="wh-ms-lead">' + esc(T('Everything you have scanned so far. Every new product is a new discovery for Misty.', 'Alles, was du bisher gescannt hast. Jedes neue Produkt ist eine neue Entdeckung f\u00fcr Misty.', 'Todo lo que has escaneado. Cada producto nuevo es un descubrimiento para Misty.')) + '</p>' +
            '<div class="wh-found"><b class="wh-found-n">' + n + '</b><span>' + esc(n === 1 ? T('discovery', 'Entdeckung', 'descubrimiento') : T('discoveries', 'Entdeckungen', 'descubrimientos')) + '</span></div>' +
            (n ? '<div class="wh-found-row">' + items.slice(-6).reverse().map(p => '<span class="wh-found-it">' + (p.img ? '<img alt="" src="' + esc(p.img) + '">' : '<i aria-hidden="true"></i>') + '<small>' + esc(String(p.name || p.barcode || '').slice(0, 18)) + '</small></span>').join('') + '</div>' : '') +
            '<div class="wh-ms-acts">' + (n ? '<button type="button" class="wh-ms-btn" data-sp="collection">' + esc(T('See all', 'Alle ansehen', 'Ver todo')) + '</button>' : '') + '<button type="button" class="wh-ms-btn wh-ms-pri" data-wh="scan">' + esc(T('Scan something', 'Etwas scannen', 'Escanear algo')) + '</button></div>';
    }
    function mistyHTML(tab, preview) {
        const xp = xpNow(), s = C.stage(xp), a = C.aura(preview || auraId());
        const tabs = [['aura', T('Aura', 'Aura', 'Aura')], ['grow', T('Growth', 'Wachstum', 'Crecimiento')], ['found', T('Discovered', 'Entdeckt', 'Descubierto')]];
        return '<div class="wh-ms" id="whMs">' +
            '<div class="wh-ms-stage" style="--a:' + a.a + ';--b:' + a.b + '"><span class="wh-ms-glow" aria-hidden="true"></span><div class="wh-ms-art">' + mistyArt() + '</div></div>' +
            '<div class="wh-ms-id"><h2>' + esc(mistyName()) + '</h2><small>' + esc(P(s.cur.n) + ' \u00b7 ' + xp + ' XP') + '</small>' +
            '<i class="wh-ms-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(s.pct * 100) + '" aria-label="' + esc(T('Progress to the next stage', 'Fortschritt zur n\u00e4chsten Stufe', 'Progreso a la siguiente etapa')) + '"><i style="width:' + Math.round(s.pct * 100) + '%"></i></i>' +
            '<small class="wh-ms-next">' + esc(s.next ? T(s.left + ' XP to ' + P(s.next.n), 'Noch ' + s.left + ' XP bis ' + P(s.next.n), 'Faltan ' + s.left + ' XP para ' + P(s.next.n)) : T('Top stage reached', 'H\u00f6chste Stufe erreicht', 'Etapa m\u00e1xima alcanzada')) + '</small></div>' +
            (W.LowiCompanion ? '<button type="button" class="cf-entry wh-ms-forms" data-cf="open"><span><b>' + esc(T('Your companion\u2019s forms', 'Formen deines Begleiters', 'Formas de tu compa\u00f1ero')) + '</b></span></button>' : '') +
            '<div class="wh-ms-tabs" role="tablist">' + tabs.map(t => '<button type="button" role="tab" data-wh="mstab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + esc(t[1]) + '</button>').join('') + '</div>' +
            '<div class="wh-ms-panel" role="tabpanel">' + (tab === 'grow' ? panelGrowth(xp) : tab === 'found' ? panelFound() : panelAura(xp)) + '</div></div>';
    }
    function openMisty(tab) {
        st.sheetTab = tab || 'aura';
        /* Oct 16 (E-man: "nuke that and redesign it"): holding Misty opens her one clear card (misty-hub.js); her forms,
           collection and glow are doors inside it */
        try { if (W.LowiMistyHub && W.LowiMistyHub.open && W.LowiMistyHub.open()) return true; } catch (e) { }
        /* Oct 15 evening: tapping Misty opens her evolution view (same Misty as here, her six forms, XP to the next one) */
        try { if (W.LowiCompanion && W.LowiCompanion.open && W.LowiCompanion.open()) return true; } catch (e) { }
        return openDetails(st.sheetTab);
    }
    /* the aura / growth / discoveries sheet, opened from the Glow door in Misty's card */
    function openDetails(tab) {
        st.sheetTab = tab || 'aura';
        const R2 = W.LowiR2; if (!R2 || !R2.sheet) return false;
        const ex = D.getElementById('whMs'); if (ex) { repaintMisty(); return true; }
        R2.sheet(mistyHTML(st.sheetTab), { cls: 'wh-ms-ov' });
        setTimeout(syncX, 20);
        return true;
    }
    function repaintMisty(preview) {
        const ex = D.getElementById('whMs'); if (!ex) return;
        const t = D.createElement('div'); t.innerHTML = mistyHTML(st.sheetTab, preview);
        ex.replaceWith(t.firstChild);
    }
    function pickAura(id) {
        const xp = xpNow(), a = C.AURAS.find(x => x.id === id); if (!a) return;
        if (xp < a.xp) {
            repaintMisty(id);
            try { W.LowiR2.toast(T(P(a.n) + ' unlocks at ' + a.xp + ' XP', P(a.n) + ' gibt es ab ' + a.xp + ' XP', P(a.n) + ' se desbloquea con ' + a.xp + ' XP')); } catch (e) { }
            return;
        }
        try { localStorage.setItem(AKEY, id); } catch (e) { }
        applyAura(); repaintMisty(); st.mistyKey = '';
        try { W.LowiR2.toast(T('Misty glows in ' + P(a.n), 'Misty leuchtet jetzt in ' + P(a.n), 'Misty brilla en ' + P(a.n))); } catch (e) { }
    }

    /* ---------- clicks ---------- */
    /* long press on Misty's bubble (~0.5 s, finger still) opens her sheet; the click that follows is swallowed */
    function wireMistyHold() {
        let t = 0, sx = 0, sy = 0;
        const stop = () => { clearTimeout(t); t = 0; };
        D.addEventListener('pointerdown', e => {
            const b = e.target && e.target.closest && e.target.closest('#spBubble'); if (!b || !H.classList.contains('wh-on')) return;
            sx = e.clientX; sy = e.clientY; stop(); st.lpOpened = false;
            t = setTimeout(() => { t = 0; st.lpOpened = true; try { navigator.vibrate && navigator.vibrate(14); } catch (err) { } openMisty('aura'); setTimeout(() => { st.lpOpened = false; }, 900); }, 520);
        }, true);
        D.addEventListener('pointermove', e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) stop(); }, true);
        D.addEventListener('pointerup', stop, true); D.addEventListener('pointercancel', stop, true);
        D.addEventListener('contextmenu', e => { if (e.target && e.target.closest && e.target.closest('#spBubble')) e.preventDefault(); }, true);
    }
    /* a tap = a pet: a little heart floats up from Misty (the squish itself is herb-touch.js) */
    function pet() {
        const b = D.getElementById('spBubble'); if (!b) return;
        const r = b.getBoundingClientRect(); if (!r.width) return;
        const h = D.createElement('span'); h.className = 'wh-pet'; h.setAttribute('aria-hidden', 'true');
        h.textContent = ['\u2665', '\u2726', '\u2665'][Math.floor(Math.random() * 3)];
        h.style.left = (r.left + r.width * (0.35 + Math.random() * 0.3)) + 'px'; h.style.top = (r.top + r.height * 0.3) + 'px';
        D.body.appendChild(h); setTimeout(() => h.remove(), 1200);
        petLine();
    }
    /* Oct 16 (E-man): petting gets an answer. Misty speaks in her own bubble above her head (the same spot as the VR tip):
       a quick "hey", a giggle when tickled (several taps fast), "slow down" if you keep poking, and lines that follow her energy. */
    const PET = {
        hey: [['Hey!', 'Hey!', '¡Hola!'], ['Hi you', 'Hallo du', 'Hola, tú'], ['Oh, hello!', 'Oh, hallo!', '¡Oh, hola!']],
        tickle: [['Hihi, that tickles!', 'Hihi, das kitzelt!', '¡Jiji, me haces cosquillas!'], ['Hahaha, stop it!', 'Hahaha, hör auf!', '¡Jajaja, para!']],
        slow: [['Slow down!', 'Langsam!', '¡Más despacio!'], ['Whoa, easy there', 'Hey, sachte', 'Eh, con calma']],
        thriving: [['I feel amazing today', 'Ich fühl mich heute super', 'Hoy me siento genial'], ['Let us go explore!', 'Lass uns was entdecken!', '¡Vamos a explorar!']],
        ok: [['That feels nice', 'Das tut gut', 'Qué agradable'], ['A bit of water would help', 'Ein Schluck Wasser wär gut', 'Un poco de agua me vendría bien']],
        weak: [['That meal made me wobbly', 'Das Essen macht mich wackelig', 'Esa comida me dejó flojita'], ['Something green next?', 'Als Nächstes was Grünes?', '¿Algo verde después?']],
        tired: [['So sleepy...', 'So müde...', 'Qué sueño...'], ['A glass of water, please?', 'Ein Glas Wasser, bitte?', '¿Un vaso de agua, por favor?']]
    };
    function petLine() {
        const now = Date.now(); st.pets = (st.pets || []).filter(t => now - t < 2200); st.pets.push(now);
        const n = st.pets.length;
        let tier = 'ok'; try { const en = W.LowiSun && W.LowiSun.energyNow && W.LowiSun.energyNow(); if (en && en.tier) tier = en.tier; } catch (e) { }
        const set = n >= 7 ? PET.slow : n >= 4 ? PET.tickle : (n === 1 && (now - (st.petSaidAt || 0) > 20000)) ? PET.hey : (PET[tier] || PET.ok);
        if (n > 1 && n < 4 && now - (st.petSaidAt || 0) < 1500) return;   /* don't chatter on every single tap */
        const l = set[Math.floor(Math.random() * set.length)];
        st.vrTip = { text: T(l[0], l[1], l[2]), until: now + 2600 }; st.petSaidAt = now;
        try { paintHint(); } catch (e) { }
    }
    function onClick(e) {
        const t = e.target;
        if (!H.classList.contains('wh-on')) return;
        const b = t.closest && t.closest('[data-wh]');
        /* a Today shortcut opens its own sheet: the Today sheet steps aside first (g2h's own listener opens the panel) */
        if (t.closest && t.closest('#whToday .wh-tiles [data-g2h-open]')) { if (st.today) openToday(false); return; }
        /* Misty herself, the wardrobe and the old evolution path all open Misty's sheet over the world now */
        const sp = t.closest && t.closest('[data-sp]');
        if (!b && sp) {
            const a = sp.dataset.sp;
            /* Oct 16 (E-man): a TAP on Misty is for playing / petting (she squishes, see herb-touch.js, and a heart pops); her
               sheet (levels, info) opens on a LONG PRESS instead, so petting never gets interrupted by a sheet */
            if (a === 'open' && sp.id === 'spBubble') {
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                if (st.lpOpened) { st.lpOpened = false; return; }
                pet(); return;
            }
            if (a === 'wardrobe' || a === 'path') {
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                openMisty(a === 'path' ? 'grow' : 'aura'); return;
            }
            return;
        }
        if (!b) return;
        const k = b.dataset.wh;
        if (k === 'misty') { e.preventDefault(); openMisty('aura'); }
        /* VR: motion viewing only (tilt to look around). It never warps; travelling stays on the glowing places and the World map */
        if (k === 'vr') { e.preventDefault(); e.stopPropagation(); const a = w3(); try { a && a.gyro && a.gyro.tap(b); } catch (x) { } return; }
        else if (k === 'today') { e.preventDefault(); openToday(!st.today); }
        else if (k === 'scrim') { e.preventDefault(); openToday(false); }
        else if (k === 'zoom') { e.preventDefault(); if (Date.now() - (st.stickUsed || 0) < 450 || Date.now() - (st.stickTap || 0) < 700) return; zoomTap(); }
        else if (k === 'mstab') { e.preventDefault(); st.sheetTab = b.dataset.tab; repaintMisty(); const nb = D.querySelector('#whMs [data-tab="' + st.sheetTab + '"]'); nb && nb.focus({ preventScroll: true }); }
        else if (k === 'aura') { e.preventDefault(); pickAura(b.dataset.id); }
        else if (k === 'room') { e.preventDefault(); try { W.LowiR2.close(W.LowiR2.top()); } catch (x) { } setTimeout(() => { try { W.LowiCellRoom.openRoom(); } catch (x) { } }, 200); }
        else if (k === 'scan') { e.preventDefault(); try { W.LowiR2.closeAll(); } catch (x) { } const s = D.querySelector('#tabbar [data-tab="scan"]'); s && s.click(); }
    }
    function onKey(e) {
        if (e.key !== 'Escape' || !H.classList.contains('wh-on')) return;
        if (st.today && !topR2()) { e.preventDefault(); openToday(false); }
    }

    /* ---------- layout + lifecycle ---------- */
    function layout() {
        /* iPad landscape: the tab bar is a side rail, so left-hand Home buttons start where Home starts */
        /* Oct 16 (iPad portrait): only a real side rail pushes them in; with the tab bar at the bottom they sit 16 px from the screen edge, mirroring World map */
        const th = D.getElementById('tab-home'), tbr = D.getElementById('tabbar'), tr0 = tbr && tbr.getBoundingClientRect(), rail = !!(tr0 && tr0.height > tr0.width && tr0.left < W.innerWidth / 3);
        const lv = (rail && th ? Math.max(0, Math.round(th.getBoundingClientRect().left)) : 0) + 'px';
        if (st.wl !== lv) { st.wl = lv; H.style.setProperty('--wh-l', lv); }
        const tb = D.getElementById('tabbar');
        let top = W.innerHeight;
        /* only a bar along the bottom (phone) lifts the thumb row; the iPad side rail does not */
        const tr = tb ? tb.getBoundingClientRect() : null, bottomBar = !!(tr && tr.height && tr.width > tr.height && tr.top > W.innerHeight * .5);
        if (bottomBar) { if (!H.classList.contains('wh-today-open') && !H.classList.contains('wh-r2-on')) top = Math.min(top, tr.top); else top = Math.min(top, W.innerHeight - (parseFloat(H.style.getPropertyValue('--wh-tb')) || 0)); }
        else top = W.innerHeight - 8;
        /* banners that float above the tab bar (add to Home Screen, offline, update) push the thumb row up */
        D.querySelectorAll('#lcA2hs, .lc-banner').forEach(b => { const r = b.getBoundingClientRect(); if (r.height && r.bottom > W.innerHeight * .6 && getComputedStyle(b).display !== 'none' && getComputedStyle(b).visibility !== 'hidden') top = Math.min(top, r.top); });
        H.style.setProperty('--wh-tb', Math.max(0, Math.round(W.innerHeight - top)) + 'px');
        placeVr();
    }
    function tick() {
        const h = home(); if (!h || !h.querySelector('.sp-heroes')) return;
        if (!H.classList.contains('wh-on')) H.classList.add('wh-on');
        ensureToday(); ensureHud(); ensureVr(); ensureX(); applyAura();
        const act = homeActive();
        if (act !== st.lastHome) {
            /* Oct 15: arriving on Today shows the world in its resting state at once (no sheet sliding away, no HUD fading in) */
            if (act) { H.classList.add('wh-snap'); clearTimeout(st.snapT); st.snapT = setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => H.classList.remove('wh-snap'))), 80); }
            st.lastHome = act; H.classList.toggle('wh-home', act);
            if (!act && st.today) openToday(false);
            /* leaving Home switches motion viewing off (the world pauses on other tabs) */
            if (!act) { const a = w3(), vb = D.querySelector('#whHud .wh-vr'); try { if (a && a.gyro && a.gyro.on() && vb) a.gyro.tap(vb); } catch (e) { } }
            /* back on Home: make sure the world is running again (it pauses on other tabs) */
            if (act) { st.hintUntil = Date.now() + 8000; const a = w3(); try { if (a && a.state !== 'fallback' && a.mountHome) a.mountHome(); } catch (e) { } W.dispatchEvent(new Event('resize')); }
        }
        /* Oct 16 (E-man: paging must glide like iPhone home screens): Home keeps its world layout while it slides out sideways;
           dropping wh-home at the tap flipped the outgoing page to the old card layout mid-slide */
        { const th = D.getElementById('tab-home'), out = !act && !!(th && th.classList.contains('lg-out')); H.classList.toggle('wh-home', act || out); H.classList.toggle('wh-leave', out); }
        layout(); paintHud(); syncX();
        const a3 = w3(), live = !!(a3 && a3.state === 'ready' && D.querySelector('#spHome .bw3-stage.bw3-live'));
        if (H.classList.contains('wh-world-live') !== live) { H.classList.toggle('wh-world-live', live); if (live) { st.hintUntil = Date.now() + 8000; hintNote('open'); } }
        if (live) hook();
        if (D.querySelector('.bw3-full')) { ensureFullZoom(); hook(); ensureMisty3D(); }
    }
    /* ---------- water: press and hold the water cell to set today back to 0 (Oct 16, E-man: it showed 12/8 with no way back) ----------
       A normal tap still adds a glass. Holding ~0.6 s resets today's count, buzzes once and says so; the tap that ends the hold adds nothing. */
    const lp = { t: 0, el: null, x: 0, y: 0, fired: false, until: 0 };
    function waterReset() {
        try {
            const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {};
            if (f.water && typeof f.water === 'object') Object.keys(f.water).forEach(k => { f.water[k] = 0; }); else f.water = {};
            localStorage.setItem('lowi_fast_v1', JSON.stringify(f));
        } catch (e) { }
        try { if (W.LowiFast && W.LowiFast.refresh) W.LowiFast.refresh(); } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:water', { detail: { reset: true } })); } catch (e) { }
        try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { }
        const msg = T('Water reset to 0 for today', 'Wasser für heute auf 0 gesetzt', 'Agua de hoy puesta a 0');
        try { if (W.LowiR2 && W.LowiR2.toast) W.LowiR2.toast(msg); else if (W.toast) W.toast(msg); } catch (e) { }
        const wc = D.querySelector('#whHud .wh-water');
        if (wc) { const b = wc.querySelector('b'); if (b && /\//.test(b.textContent)) b.textContent = '0/' + b.textContent.split('/')[1]; wc.style.setProperty('--wh-fill', '0'); wc.classList.remove('wh-reset'); void wc.offsetWidth; wc.classList.add('wh-reset'); setTimeout(() => wc.classList.remove('wh-reset'), 700); }
        setTimeout(() => { try { paintHud(); } catch (e) { } }, 120);
    }
    function lpCancel() { clearTimeout(lp.t); lp.t = 0; if (lp.el) lp.el.classList.remove('wh-holding'); }
    function wireWaterHold() {
        const sel = '.wh-water[data-sp="water"], #lvDash .lv-water';
        D.addEventListener('pointerdown', e => {
            const el = e.target.closest && e.target.closest(sel); if (!el || (e.button && e.button !== 0)) return;
            lpCancel(); lp.el = el; lp.x = e.clientX; lp.y = e.clientY; lp.fired = false; el.classList.add('wh-holding');
            lp.t = setTimeout(() => { lp.t = 0; lp.fired = true; lp.until = Date.now() + 1500; el.classList.remove('wh-holding'); waterReset(); }, 600);
        }, true);
        D.addEventListener('pointermove', e => { if (lp.t && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12) lpCancel(); }, true);
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => D.addEventListener(n, () => { if (lp.t) lpCancel(); }, true));
        W.addEventListener('click', e => {
            if (!lp.fired || Date.now() > lp.until) return;
            const el = e.target.closest && e.target.closest(sel); if (!el) return;
            lp.fired = false; e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }, true);
        D.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest(sel)) e.preventDefault(); }, true);
    }
    function boot() {
        if (st.wired) return; st.wired = true;
        wireWaterHold();
        D.addEventListener('click', onClick, true);
        D.addEventListener('keydown', onKey);
        W.addEventListener('lowi:world-region', onRegion);
        W.addEventListener('lowi:gyro-state', e => { const d = e && e.detail; if (!d || d.state === 'off') { st.vrTip = null; return; }
            st.vrTip = { text: d.state === 'on' ? T('VR on · tilt your phone to look around', 'VR an · neig dein Handy zum Umsehen', 'RV activa · inclina el móvil para mirar') : d.text, until: Date.now() + 3200 };
            paintHint(); setTimeout(paintHint, 3300); });
        W.addEventListener('lowi:misty-open', () => { if (homeActive()) openMisty('aura'); });
        W.addEventListener('lowi:misty-pet', () => { if (homeActive()) pet(); });
        wireMistyHold();
        W.addEventListener('resize', layout);
        const mo = new MutationObserver(() => { clearTimeout(st.mt); st.mt = setTimeout(tick, 60); });
        mo.observe(D.body, { childList: true });
        /* Oct 15 (old-Home flash): when Home's nodes are (re)built, adopt them in the same frame. Observer callbacks run before the
           browser paints, so the old flat Home (loose status + log, no HUD) is never on screen; the 700 ms tick below stays as a safety net. */
        const adopt = () => { if (st.adopting) return; st.adopting = true; try { watchHome(); tick(); } catch (e) { } st.adopting = false; };
        const homeMo = new MutationObserver(adopt);
        const watchHome = () => { const t = D.getElementById('tab-home'), h = home();
            if (t && t !== st.obsTab) { st.obsTab = t; homeMo.observe(t, { childList: true }); }
            if (h && h !== st.obsHome) { st.obsHome = h; homeMo.observe(h, { childList: true }); } };
        new MutationObserver(watchHome).observe(D.body, { childList: true, subtree: false });
        const tabs = () => { watchHome(); const t = D.getElementById('tab-home'); if (t && !t.dataset.whObs) { t.dataset.whObs = '1'; new MutationObserver(tick).observe(t, { attributes: true, attributeFilter: ['class'] }); }
            const sw = D.getElementById('sheetwrap'); if (sw && !sw.dataset.whObs) { sw.dataset.whObs = '1'; new MutationObserver(syncX).observe(sw, { attributes: true, attributeFilter: ['class'] }); } };
        setInterval(() => { tabs(); tick(); }, 700);
        tabs(); tick();
    }
    /* misty-face.js: the art her 3D sprite is made from (svg text + aura colour), to split into body and face */
    function mistyFaceArt() { const txt = mistySvg(); if (!txt) return null; let aura = ''; try { aura = C.aura(auraId()).a; } catch (e) { aura = ''; } return { svg: txt, aura }; }
    W.LowiWorldHome = { pullOut, diveIn, settle, waterReset, openToday, openMisty, toggleZoom, zoomOutWhole, closeTop, openDetails, heroTurn, state: st, auraId, syncX, rig };
    W.LowiWorldHome.mistyFaceArt = mistyFaceArt;
    W.LowiWorldHome.pad = pad;
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
