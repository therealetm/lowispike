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
    function mistyName() { const c = cur(); try { return c ? String(W.LowiHerbTamagotchi.name(c.p, c.m) || 'Misty') : 'Misty'; } catch (e) { return 'Misty'; } }
    function auraId() { let v = ''; try { v = localStorage.getItem(AKEY) || ''; } catch (e) { } return C.cleanAura(v, xpNow()); }
    function applyAura() {
        const a = C.aura(auraId());
        H.style.setProperty('--wh-aura-a', a.a); H.style.setProperty('--wh-aura-b', a.b);
        H.dataset.whAura = a.id;
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
        const water = btn('wh-cell wh-water', T('Water, add a glass', 'Wasser, ein Glas dazu', 'Agua, un vaso más'), '<span class="wh-cell-fill" aria-hidden="true"></span><span class="wh-cell-tx"><small></small><b></b></span>', { 'data-sp': 'water' });
        const today = btn('wh-todaybtn', T('Open today', 'Heute öffnen', 'Abrir hoy'), ICO.today + '<span><b></b><small></small></span>', { 'data-wh': 'today', 'aria-expanded': 'false', 'aria-controls': 'whToday' });
        const zoom = btn('wh-zoom', T('World map: show the whole world', 'Weltkarte: ganze Welt zeigen', 'Mapa del mundo: ver todo el mundo'), ICO.out + '<span class="wh-zoom-tx"></span>', { 'data-wh': 'zoom' });
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
            const q = el.getBoundingClientRect(); if (!q.width || !q.height || getComputedStyle(el).display === 'none') return;
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
            wc.style.setProperty('--wh-fill', String(Math.max(0, Math.min(1, f))));
            const lab = tile.getAttribute('aria-label') || '', m = lab.match(/(\d+)\s*\/\s*(\d+)/);
            const small = wc.querySelector('small'), b = wc.querySelector('b');
            const sm = T('Water', 'Wasser', 'Agua'), bv = m ? m[1] + '/' + m[2] : '+1';
            if (small.textContent !== sm) small.textContent = sm;
            if (b.textContent !== bv) b.textContent = bv;
            wc.setAttribute('aria-label', (lab || sm) + '');
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
        x.hidden = !on;
    }

    /* ---------- zoom: whole world <-> back in ---------- */
    function rig() { const a = w3(); return a && a.rig ? a.rig : null; }
    function animateDist(to, pitch) {
        const a = w3(), r = rig(); if (!a || !r) return;
        hook();
        if (reduced()) { r.dist = to; if (pitch != null) r.pitch = pitch; st.zoomAnim = null; return; }
        st.zoomAnim = { to, pitch, t: 0 };
        r.idle = 0;
    }
    /* The Home -> Community zoom: the camera backs out of the bloodstream while the galaxy opens around it; settle() puts it back. */
    function pullOut() {
        const r = rig(); if (!r || r.mode !== 'home' || reduced()) return;
        if (!st.pull) st.pull = { dist: r.dist, pitch: r.pitch };
        hook(); st.zoomAnim = { to: Math.min(r.maxD || 13, baseDist(r) * 2.4), pitch: 0.34, t: 0 }; r.idle = 0;
    }
    function settle() {
        const r = rig();
        if (st.pull) { if (r) { r.dist = st.pull.dist; r.pitch = st.pull.pitch; } st.zoomAnim = null; st.pull = null; }
        try { tick(); } catch (e) {}
    }
    function baseDist(r) { return r && r.mode === 'home' ? (r.homeDist || 3.2) : 6.5; }
    function homeWorld() { const r = rig(); return !!(r && r.mode === 'home' && homeActive() && !D.querySelector('.bw3-full')); }
    function zoomState() {
        const r = rig(); if (!r || (r.mode !== 'full' && r.mode !== 'home')) return null;
        return C.zoomTarget(r.dist, r.minD, r.maxD, baseDist(r));
    }
    function inRegion() { try { const R = W.LowiWorldRegions; return !!(R && R.current && R.current() !== 'hub'); } catch (e) { return false; } }
    function awayHome() { try { const r = rig(), s = W.LowiWorldRegions && W.LowiWorldRegions.state; return !!(r && r.mode === 'home' && homeActive() && s && (s.busy || (s.cur && s.cur !== 'hub')) && !D.querySelector('.bw3-full')); } catch (e) { return false; } }
    function zoomOutWhole() {
        const a = w3(); if (!a || a.state === 'fallback' || !a.open) return;
        if (homeWorld()) { const r = rig(); if (inRegion()) { try { W.LowiWorldRegions.travel('hub'); } catch (e) { } setTimeout(() => animateDist(r.maxD, 0.42), 1900); } else animateDist(r.maxD, 0.42); st.hintUntil = Date.now() + 7000; setTimeout(() => { paintZoom(); paintHint(); }, 50); return; }
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
            hb.dataset.k = key; hb.innerHTML = (out ? ICO.inn : ICO.out) + '<span class="wh-zoom-tx">' + tx + '</span>';
            hb.setAttribute('aria-label', out ? T('Back to Misty', 'Zurück zu Misty', 'Volver a Misty') : T('World map: show the whole world', 'Weltkarte: ganze Welt zeigen', 'Mapa del mundo: ver todo el mundo'));
            hb.classList.toggle('is-out', out);
        }
    }
    /* one short hint line with its own spot; shown when Home opens and right after the world map zooms */
    function paintHint() {
        const h = D.getElementById('whHint'); if (!h) return;
        const live = H.classList.contains('wh-world-live') && homeWorld();
        const tip = st.vrTip && Date.now() < st.vrTip.until ? st.vrTip.text : '';
        const tx = tip ? tip : isZoomedOut()
            ? T('Tap a glowing place to travel there', 'Tippe auf ein Leuchten, um hinzureisen', 'Toca un brillo para viajar allí')
            : T('Drag to look around · two fingers to zoom', 'Ziehen zum Umsehen · zwei Finger zum Zoomen', 'Arrastra para mirar · dos dedos para hacer zoom');
        if (h.textContent !== tx) h.textContent = tx;
        const on = live && !st.today && (!!tip || (!H.classList.contains('wh-away') && (Date.now() < (st.hintUntil || 0) || isZoomedOut()))); /* on the world map it stays: tap a glow to travel */
        if (h.classList.contains('on') !== on) h.classList.toggle('on', on);
        /* never on top of Misty's water / fasting cells or the start pill: on tight screens it simply stays out */
        let blk = false;
        if (on) {
            /* its own spot: in the open sky between the header / quest card and Misty, far from the thumb row buttons */
            let top = 0;
            D.querySelectorAll('#spHome .sp-top, #spHome .f3-board').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(el).visibility !== 'hidden') top = Math.max(top, r.bottom); });
            /* Oct 16 (E-man: "Misty is the guide"): the hint is Misty talking, a speech bubble right above her head with its tail on her */
            const mb = D.getElementById('spBubble'), mr = mb && mb.getBoundingClientRect();
            const say = !!(mr && mr.width > 40 && getComputedStyle(mb).opacity !== '0');
            if (h.classList.contains('wh-say') !== say) h.classList.toggle('wh-say', say);
            const tv = Math.round(say ? mr.top - h.offsetHeight - 10 : Math.max(top + 10, 70)) + 'px'; if (h.style.top !== tv) h.style.top = tv;
            const lv = say ? Math.round(mr.left + mr.width / 2) + 'px' : ''; if (h.style.left !== lv) h.style.left = lv;
            const hr = h.getBoundingClientRect();
            D.querySelectorAll('#spFast, #whHud .wh-water, #whHud .wh-zoom, #whHud .wh-vr, #whHud .wa-btn, #whHud .wh-todaybtn, .fe-bub, #spHome .sp-top, #spHome .f3-board, ' + (say ? '' : '#spBubble, ') + '#tabbar').forEach(el => {
                const r = el.getBoundingClientRect(); if (!r.width) return;
                if (r.left < hr.right - 1 && r.right > hr.left + 1 && r.top < hr.bottom - 1 && r.bottom > hr.top + 1) blk = true;
            });
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
        if (id === 'hub') { const r0 = rig(); if (r0 && r0.mode === 'home' && homeActive()) setTimeout(() => { const r = rig(); if (r && r.mode === 'home' && !r.fly && !inRegion() && !st.zoomAnim) animateDist(baseDist(r), 0.12); }, reduced() ? 0 : 1600); }
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
        c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        c.removeAttribute('class'); c.setAttribute('width', '260'); c.setAttribute('height', '310');
        c.querySelectorAll('.lh-acc,.lh-pot-fx,.lh-constellation').forEach(n => n.remove());
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
            const z = st.zoomAnim; z.t += dt;
            if ((r.mode !== 'full' && r.mode !== 'home') || Math.abs(r.vy) > 0.02) st.zoomAnim = null;
            else if (z.t > 2.5) { r.dist = z.to; if (z.pitch != null) r.pitch = z.pitch; st.zoomAnim = null; paintZoom(); }
            else {
                const k = Math.min(1, dt * 3.2);
                r.dist += (z.to - r.dist) * k; if (z.pitch != null) r.pitch += (z.pitch - r.pitch) * k; r.idle = 0;
                if (Math.abs(z.to - r.dist) < 0.02) { r.dist = z.to; st.zoomAnim = null; paintZoom(); }
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
            /* One world: while Home travels to a place (and stays there), Misty's cell, water and fasting step aside */
            const aw = awayHome(); if (H.classList.contains('wh-away') !== aw) { H.classList.toggle('wh-away', aw); syncX(); }
            const k = Math.max(0.12, Math.min(1.4, (r.homeDist || 3.2) / Math.max(0.1, r.dist))), kv = k.toFixed(3);
            if (kv !== st.mz) { st.mz = kv; const b = D.getElementById('spBubble'); if (b) b.style.setProperty('--wh-mz', kv); H.classList.toggle('wh-mapview', k < 0.6); }
            if (++st.zf % 20 === 0) { paintZoom(); paintHint(); }
        }
        if (st.misty) {
            const show = r.mode === 'full' && !inRegion();
            if (st.misty.visible !== show) st.misty.visible = show;
            if (show && !reduced()) { const t = performance.now() / 1000; st.misty.position.set(0, Math.sin(t * 1.3) * 0.06, 0); }
        }
    }

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
            (W.LowiCellRoom && W.LowiCellRoom.openRoom ? '<button type="button" class="wh-ms-room" data-wh="room">' + ICO.home + '<span><b>' + esc(T('Misty\u2019s home', 'Mistys Zuhause', 'La casa de Misty')) + '</b><small>' + esc(T('Decorate her room in your bloodstream', 'Ihr Zimmer in deinem Blutkreislauf einrichten', 'Decora su cuarto en tu sangre')) + '</small></span></button>' : '');
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
        /* Oct 15 evening: tapping Misty opens her evolution view (same Misty as here, her six forms, XP to the next one) */
        try { if (W.LowiCompanion && W.LowiCompanion.open && W.LowiCompanion.open()) return true; } catch (e) { }
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
            if ((a === 'open' && sp.id === 'spBubble') || a === 'wardrobe' || a === 'path') {
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
        else if (k === 'zoom') { e.preventDefault(); if (st.today) openToday(false); if (homeWorld()) toggleZoom(); else zoomOutWhole(); }
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
        const th = D.getElementById('tab-home'), lv = (th ? Math.max(0, Math.round(th.getBoundingClientRect().left)) : 0) + 'px';
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
        layout(); paintHud(); syncX();
        const a3 = w3(), live = !!(a3 && a3.state === 'ready' && D.querySelector('#spHome .bw3-stage.bw3-live'));
        if (H.classList.contains('wh-world-live') !== live) { H.classList.toggle('wh-world-live', live); if (live) st.hintUntil = Date.now() + 8000; }
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
    W.LowiWorldHome = { pullOut, settle, waterReset, openToday, openMisty, toggleZoom, zoomOutWhole, closeTop, heroTurn, state: st, auraId, syncX, rig };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
