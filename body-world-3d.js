/* LOWiSPIKE real 3D body world (task 'real 3D body world you can move like VR'). Source of truth for the look:
   /home/sprite/.lowispike/VISUAL-MASTER.md. Home: the top of Home becomes a window into a 360 bloodstream; the herb sits
   inside a see-through glowing cell membrane and the world turns around it (drag sideways). Tap the window or the 3D button
   for the full-screen world: drag/swipe to orbit, pinch to zoom, turn the phone (gyro button, iOS asks on tap), tap a body
   place to fly there. three.js is vendored (vendor/three-0.160.1.module.min.js), lazy-loaded, cached by sw.js.
   Falls back to the existing 2D look without WebGL, with prefers-reduced-motion or Save-Data. One WebGL context only:
   the same canvas moves between the Home window and the full-screen view. API for other builds: window.LowiWorld3D. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiWorld3D) return;

    const THREE_FILE = 'vendor/three-0.160.1.module.min.js', SCENE_FILE = 'body-world-3d-scene.js', GYRO_KEY = 'lowi.world3d.gyro';
    const PLACES = [
        { id: 'gut', hue: '#2ef8b6', name: ['Gut', 'Darm', 'Intestino'], line: ['Your microbe buddies live here.', 'Hier wohnen deine Mikroben-Freunde.', 'Aquí viven tus amigos microbios.'] },
        { id: 'liver', hue: '#e78631', name: ['Liver', 'Leber', 'Hígado'], line: ['Your store room and filter.', 'Dein Speicher und Filter.', 'Tu almacén y filtro.'] },
        { id: 'pancreas', hue: '#f8ea40', name: ['Pancreas', 'Bauchspeicheldrüse', 'Páncreas'], line: ['This is where insulin is made.', 'Hier wird Insulin gemacht.', 'Aquí se produce la insulina.'] },
        { id: 'muscles', hue: '#9feb25', name: ['Muscles', 'Muskeln', 'Músculos'], line: ['Moving wakes them up.', 'Bewegung macht sie wach.', 'El movimiento los despierta.'] },
        { id: 'heart', hue: '#f14770', name: ['Heart', 'Herz', 'Corazón'], line: ['The beat of your bloodstream.', 'Der Takt deiner Blutbahn.', 'El ritmo de tu torrente.'] },
        { id: 'brain', hue: '#1cf7f9', name: ['Brain', 'Gehirn', 'Cerebro'], line: ['Mission control.', 'Die Kommandozentrale.', 'El centro de mando.'] }
    ];
    const COPY = {
        open: ['Open your body world in 3D', 'Deine Körperwelt in 3D öffnen', 'Abrir tu mundo corporal en 3D'],
        title: ['Your bloodstream', 'Deine Blutbahn', 'Tu torrente'],
        hint: ['Drag to look around · pinch to zoom', 'Ziehen zum Umsehen · Zwei Finger zum Zoomen', 'Arrastra para mirar · pellizca para zoom'],
        close: ['Close', 'Schließen', 'Cerrar'],
        gyroAsk: ['Use motion', 'Bewegung nutzen', 'Usar movimiento'],
        gyroOn: ['Motion on', 'Bewegung an', 'Movimiento activo'],
        gyroOff: ['Motion off', 'Bewegung aus', 'Movimiento apagado'],
        gyroNo: ['No motion sensor here', 'Kein Bewegungssensor', 'Sin sensor de movimiento'],
        gyroDenied: ['Motion not allowed. Touch still works.', 'Bewegung nicht erlaubt. Ziehen geht weiter.', 'Movimiento no permitido. El toque sigue.'],
        back: ['Back to your cell', 'Zurück zur Zelle', 'Volver a tu célula'],
        trip: ['Open journey', 'Reise ansehen', 'Ver viaje'],
        places: ['Body places', 'Körperorte', 'Lugares del cuerpo'],
        cell: ['Your cell', 'Deine Zelle', 'Tu célula'],
        cellLine: ['It glows brighter the more your sun fills today.', 'Sie leuchtet heller, je voller deine Sonne heute ist.', 'Brilla más cuanto más se llena tu sol hoy.']
    };
    const LI = { en: 0, de: 1, es: 2 };
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return ((D && D.documentElement.lang) || 'de').slice(0, 2); } };
    const tr = (k, l) => { const a = COPY[k]; return a ? a[LI[l || lang()] == null ? 1 : LI[l || lang()]] : k; };
    const placeText = (p, f, l) => p[f][LI[l || lang()] == null ? 1 : LI[l || lang()]];

    /* ---------- pure helpers (tested) ---------- */
    function shouldUse3D(env) {
        env = env || {};
        if (!env.webgl) return { ok: false, why: 'no-webgl' };
        if (env.reduced) return { ok: false, why: 'reduced-motion' };
        if (env.saveData) return { ok: false, why: 'save-data' };
        if (env.disabled) return { ok: false, why: 'off' };
        return { ok: true, why: '' };
    }
    function dprCap(env) { env = env || {}; const small = (env.w || 400) < 380 || (env.mem && env.mem <= 2); return small ? 1.5 : 2; }
    function wrapDeg(d) { d = ((d + 180) % 360 + 360) % 360 - 180; return d; }
    function gyroAngles(e, base) {
        if (!e || (e.beta == null && e.gamma == null)) return null;
        const b = base || {};
        const useAlpha = e.alpha != null && b.alpha != null;
        const yawDeg = useAlpha ? wrapDeg(e.alpha - b.alpha) : -((e.gamma || 0) - (b.gamma || 0));
        const pitchDeg = Math.max(-70, Math.min(70, (e.beta || 0) - (b.beta || 0)));
        return { yaw: yawDeg * Math.PI / 180, pitch: -pitchDeg * Math.PI / 180 * 0.8 };
    }
    function gyroKind(env) {
        env = env || {};
        if (!env.touch) return 'none';
        if (env.needsPermission) return 'ask';
        if (env.hasEvent) return 'plain';
        return 'none';
    }
    function pinchFactor(d0, d1) { if (!(d0 > 0) || !(d1 > 0)) return 1; return Math.max(0.5, Math.min(2, d0 / d1)); }
    /* 3D button spot: a size x size round tap target, as close to pref as it can get inside area without touching any
       obstacle (rect {l,t,r,b} or circle {cx,cy,rad}). Phones: the header's right end belongs to the avatar + theme switch. */
    function clearOf(cx, cy, half, o, gap) {
        if (o.rad != null) return Math.hypot(cx - o.cx, cy - o.cy) >= o.rad + half + gap;
        return cx + half + gap <= o.l || cx - half - gap >= o.r || cy + half + gap <= o.t || cy - half - gap >= o.b;
    }
    function pickSpot(o) {
        o = o || {}; const a = o.area, size = o.size || 44, half = size / 2, gap = o.gap == null ? 2 : o.gap, step = o.step || 2, obs = o.obstacles || [], pref = o.pref;
        if (!a || !pref) return null;
        let best = null, bd = Infinity;
        for (let y = a.t + half; y <= a.b - half; y += step) for (let x = a.l + half; x <= a.r - half; x += step) {
            const d = Math.hypot(x - pref.x, y - pref.y); if (d >= bd) continue;
            if (obs.every(ob => clearOf(x, y, half, ob, gap))) { best = { x, y }; bd = d; }
        }
        return best;
    }
    const core = { PLACES, COPY, shouldUse3D, dprCap, gyroAngles, gyroKind, wrapDeg, pinchFactor, pickSpot, THREE_FILE, SCENE_FILE };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    if (!D || !D.createElement || typeof W.requestAnimationFrame !== 'function') { W.LowiWorld3D = core; return; }

    /* ---------- environment ---------- */
    const H = D.documentElement;
    const me = D.currentScript || D.querySelector('script[src*="body-world-3d.js"]');
    const ver = (me && /[?&]v=([^&]+)/.exec(me.getAttribute('src') || '') || [])[1] || '';
    const q = ver ? '?v=' + ver : '';
    function hasWebGL() { try { const c = D.createElement('canvas'); return !!(W.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
    const mqReduce = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    function env() { return { webgl: hasWebGL(), reduced: mqReduce.matches, saveData: !!(navigator.connection && navigator.connection.saveData), disabled: /[?&]no3d\b/.test(location.search) }; }
    const themeNow = () => (H.dataset.theme === 'light' ? 'light' : 'dark');
    const isTouch = () => ('ontouchstart' in W) || (navigator.maxTouchPoints || 0) > 0;

    if (!D.getElementById('bw3Css')) {
        const l = D.createElement('link'); l.id = 'bw3Css'; l.rel = 'stylesheet';
        l.href = me ? me.getAttribute('src').replace('body-world-3d.js', 'body-world-3d.css') : 'body-world-3d.css';
        D.head.appendChild(l);
    }

    const api = Object.assign({}, core, { ready: false, state: 'idle', why: '', fps: () => (world ? world.fps() : 0), open, close, flyTo: id => { if (flyHome(id)) return; open(); setTimeout(() => go(id), 50); }, setGlow: g => { glowOverride = g; if (world) world.setGlow(g); }, places: () => PLACES.slice(),
        THREE: null, scene: null, camera: null, renderer: null, hub: null, regions: [],
        isOpen: () => !!full,
        /* One world (Oct 15): Home's own VR / motion button drives the same gyro as the full window */
        gyro: { kind: () => gyroKind(gyroEnv()), on: () => gyroOn, tap: b => gyroTap(b), paint: (b, s) => paintGyro(b, s || (gyroOn ? 'on' : 'off')) },
        homeAway: () => homeAway(),
        onFrame: fn => { if (typeof fn !== 'function') return () => {}; if (world) return world.onFrame(fn); pendingFrames.add(fn); let off = null; const t = { off: () => { pendingFrames.delete(fn); if (off) off(); } }; t.bind = o => { off = o; }; pendingBind.set(fn, t); return t.off; } });
    const pendingFrames = new Set(), pendingBind = new Map();
    W.LowiWorld3D = api;

    let world = null, canvas = null, loading = null, stage = null, full = null, mode = 'home', glowOverride = null, visibleHome = true, io = null;

    /* ---------- loading ---------- */
    function load() {
        if (loading) return loading;
        api.state = 'loading';
        loading = Promise.all([import('./' + THREE_FILE + q), import('./' + SCENE_FILE + q)]).then(([THREE, S]) => {
            canvas = D.createElement('canvas'); canvas.className = 'bw3-canvas'; canvas.setAttribute('aria-hidden', 'true');
            canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('context-lost'); });
            world = S.createWorld(THREE, canvas, { places: PLACES, small: W.innerWidth < 380, dprCap: dprCap({ w: W.innerWidth, mem: navigator.deviceMemory }), theme: themeNow(), shouldRender });
            Object.assign(api, { THREE, scene: world.scene, camera: world.camera, renderer: world.renderer, hub: world.hub, regions: world.regions, rig: world.rig, memU: world.memU || null });
            pendingFrames.forEach(fn => { const t = pendingBind.get(fn); const off = world.onFrame(fn); if (t) t.bind(off); }); pendingFrames.clear(); pendingBind.clear();
            api.ready = true; api.state = 'ready'; H.classList.add('bw3-ready');
            try { W.dispatchEvent(new CustomEvent('lowi:world3d-ready', { detail: api })); } catch (e) {}
            syncGlow();
            return world;
        }).catch(err => { console.warn('3D world unavailable', err && err.message); fail('load'); return null; });
        return loading;
    }
    function fail(why) {
        api.state = 'fallback'; api.why = why; api.ready = false; H.classList.remove('bw3-ready'); H.classList.add('bw3-off');
        try { if (world) world.dispose(); } catch (e) {}
        world = null; Object.assign(api, { scene: null, camera: null, renderer: null, hub: null, regions: [], rig: null, memU: null });
        if (stage) { stage.remove(); stage = null; }
        D.querySelectorAll('.bw3-home').forEach(e => e.classList.remove('bw3-home'));
        if (full) close();
    }
    function shouldRender() {
        if (D.hidden) return false;
        if (mode === 'full') return !!full;
        if (!visibleHome || !stage || !stage.isConnected) return false;
        const tab = D.getElementById('spHome'); if (tab && !tab.offsetParent) return false;
        if (D.querySelector(H.classList.contains('wh-on') ? '.sp-world.on, .ht-world.on' : '.r2-ov, .sp-world.on, .ht-world.on')) return false; /* world-first Home: sheets are see-through, the world keeps breathing behind them */
        return true;
    }
    function syncGlow() {
        if (!world) return;
        if (glowOverride != null) { world.setGlow(glowOverride); return; }
        try { const v = W.LowiSun && W.LowiSun.live && W.LowiSun.live(); world.setGlow(v ? 0.35 + 0.65 * (v.ratio || 0) : 0.55); } catch (e) { world.setGlow(0.55); }
    }

    /* ---------- pointer: drag, pinch, tap ---------- */
    function bindGestures(el, onTap, allowPinch) {
        const pts = new Map(); let start = null, pinch0 = 0, moved = 0, lastX = 0, lastY = 0, vx = 0, vy = 0, lastT = 0;
        el.addEventListener('pointerdown', e => {
            if (!world) return;
            pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
            try { el.setPointerCapture(e.pointerId); } catch (err) {}
            if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: e.timeStamp }; moved = 0; lastX = e.clientX; lastY = e.clientY; vx = vy = 0; lastT = e.timeStamp; }
            if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
        });
        el.addEventListener('pointermove', e => {
            if (!world || !pts.has(e.pointerId)) return;
            pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pts.size >= 2 && allowPinch) {
                const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
                world.zoom(pinchFactor(pinch0, d)); pinch0 = d; moved = 99; e.preventDefault(); return;
            }
            if (pts.size !== 1) return;
            const dx = e.clientX - lastX, dy = e.clientY - lastY, dt = Math.max(1, e.timeStamp - lastT);
            moved += Math.abs(dx) + Math.abs(dy);
            world.drag(dx, dy);
            vx = 0.7 * vx + 0.3 * (dx / dt * 16); vy = 0.7 * vy + 0.3 * (dy / dt * 16);
            lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp;
        });
        const end = e => {
            if (!pts.has(e.pointerId)) return;
            pts.delete(e.pointerId);
            if (pts.size === 0 && start) {
                if (moved < 10 && e.type === 'pointerup' && e.timeStamp - start.t < 450) { const r = el.getBoundingClientRect(); onTap(e.clientX - r.left, e.clientY - r.top); }
                else if (world && e.timeStamp - lastT < 90) world.release(vx, vy);
                start = null;
            }
        };
        el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
        if (allowPinch) el.addEventListener('wheel', e => { if (!world) return; e.preventDefault(); world.zoom(e.deltaY > 0 ? 1.08 : 1 / 1.08); }, { passive: false });
    }

    /* ---------- gyroscope ---------- */
    let gyroOn = false, gyroBase = null, gyroSeen = false;
    function onOrient(e) {
        if (!gyroOn || !world) return;
        if (e.beta == null && e.gamma == null) return;
        gyroSeen = true;
        if (!gyroBase) gyroBase = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
        const a = gyroAngles(e, gyroBase); if (a) world.setGyro(a.yaw, a.pitch);
    }
    function gyroEnv() { return { touch: isTouch(), needsPermission: !!(W.DeviceOrientationEvent && typeof W.DeviceOrientationEvent.requestPermission === 'function'), hasEvent: 'DeviceOrientationEvent' in W }; }
    function setGyro(on, btn) {
        gyroOn = on; gyroBase = null;
        try { localStorage.setItem(GYRO_KEY, on ? '1' : '0'); } catch (e) {}
        if (on) { W.addEventListener('deviceorientation', onOrient); gyroSeen = false; setTimeout(() => { if (gyroOn && !gyroSeen && btn) { setGyro(false); paintGyro(btn, 'no'); } }, 2500); }
        else { W.removeEventListener('deviceorientation', onOrient); if (world) world.setGyro(0, 0); }
        if (btn) paintGyro(btn, on ? 'on' : 'off');
    }
    function paintGyro(btn, st) {
        btn.dataset.state = st;
        btn.setAttribute('aria-pressed', String(st === 'on'));
        const tx = st === 'on' ? tr('gyroOn') : st === 'no' ? tr('gyroNo') : st === 'denied' ? tr('gyroDenied') : gyroEnv().needsPermission ? tr('gyroAsk') : tr('gyroOff');
        const sp = btn.querySelector('span');
        /* Home's compact VR button keeps its short name; the full sentence goes to its label and a short hint */
        if (btn.dataset.short) { btn.setAttribute('aria-label', 'VR · ' + tx); if (sp && sp.textContent !== 'VR') sp.textContent = 'VR'; try { W.dispatchEvent(new CustomEvent('lowi:gyro-state', { detail: { state: st, text: tx } })); } catch (e) { } }
        else if (sp) sp.textContent = tx;
    }
    /* One world (Oct 15): on Home a glowing place is travelled to right there, inside Home's own world. No second
       full-screen version: the regions warp runs in place (LowiWorldRegions.travel) and its camera leg comes back here. */
    let homeWarp = false;
    function homeHere() { return !!(world && stage && stage.isConnected && mode === 'home' && !full && H.classList.contains('wh-home') && H.classList.contains('wh-world-live')); }
    function homeAway() { const R = W.LowiWorldRegions, s = R && R.state; return !!(s && !full && (s.busy || (s.cur && s.cur !== 'hub'))); }
    function flyHome(id) {
        if (!homeHere()) return false;
        const R = W.LowiWorldRegions;
        if (!homeWarp && R && R.travel) { homeWarp = true; try { R.travel(id || 'hub'); } catch (e) { } finally { homeWarp = false; } return true; }
        world.flyTo(id || null); return true;
    }
    function gyroTap(btn) {
        if (gyroOn) { setGyro(false, btn); return; }
        const ge = gyroEnv();
        if (ge.needsPermission) {
            W.DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') setGyro(true, btn); else paintGyro(btn, 'denied'); }).catch(() => paintGyro(btn, 'denied'));
        } else setGyro(true, btn);
    }

    /* ---------- Home window ---------- */
    function homeEls() {
        const home = D.getElementById('spHome'); if (!home) return null;
        const heroes = home.querySelector('.sp-heroes'), top = home.querySelector('.sp-top'), bubble = D.getElementById('spBubble');
        return heroes ? { home, heroes, top, bubble } : null;
    }
    function mountHome() {
        if (api.state === 'fallback') return;
        const els = homeEls(); if (!els) return;
        if (!stage || !stage.isConnected || stage.parentNode !== els.heroes) {
            if (stage) stage.remove();
            stage = D.createElement('div'); stage.className = 'bw3-stage'; stage.id = 'bw3Stage';
            els.heroes.insertBefore(stage, els.heroes.firstChild);
            els.heroes.classList.add('bw3-on'); els.home.classList.add('bw3-home');
            [...els.heroes.children].forEach(c => { if (c !== stage && getComputedStyle(c).position === 'static') c.style.position = 'relative'; });
            /* Home is the world itself: drag orbits, two fingers zoom, tapping a glowing place warps there; tapping empty space does nothing */
            bindGestures(stage, (x, y) => { if (!world) return; const id = world.pick(x, y); if (id === 'cell') { try { W.dispatchEvent(new CustomEvent('lowi:misty-open')); } catch (e) {} } else if (id) api.flyTo(id); }, true);
            if (io) io.disconnect();
            if ('IntersectionObserver' in W) { io = new IntersectionObserver(es => { visibleHome = es.some(x => x.isIntersecting); }, { threshold: 0.01 }); io.observe(stage); }
            if (mode === 'home' && canvas) stage.insertBefore(canvas, stage.firstChild);
        }
        if (els.top && !els.top.querySelector('.bw3-open')) {
            const btn = D.createElement('button'); btn.type = 'button'; btn.className = 'bw3-open'; btn.setAttribute('aria-label', tr('open'));
            btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="3.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 3a9 9 0 0 1 0 18" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M18.5 14.6l2.4 1-1 2.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><b>3D</b>';
            btn.addEventListener('click', e => { e.stopPropagation(); open(); });
            els.top.appendChild(btn);
        }
        layoutHome();
    }
    let lastLay = '';
    function layoutHome() {
        const els = homeEls(); if (!els || !stage) return;
        const hr = els.heroes.getBoundingClientRect(), tr0 = els.top ? els.top.getBoundingClientRect() : hr, vw = D.documentElement.clientWidth || W.innerWidth;
        const topOff = Math.round(Math.min(0, tr0.top - hr.top) - 6), left = Math.round(Math.max(-12, -hr.left + 4)), right = Math.round(Math.max(-12, -(vw - hr.right) + 4));
        const key = [topOff, left, right, Math.round(hr.width), Math.round(hr.height)].join(',');
        if (key !== lastLay) { stage.style.top = topOff + 'px'; stage.style.left = left + 'px'; stage.style.right = right + 'px'; stage.style.bottom = '-6px'; lastLay = key; }
        placeOpenBtn(els);
        if (!world || mode !== 'home') return;
        /* travelling inside Home's world (a place or the warp there): keep the camera where the warp put it */
        if (homeAway()) { const s0 = stage.getBoundingClientRect(); world.resize(s0.width, s0.height); return; }
        const sr = stage.getBoundingClientRect(), b = els.bubble && els.bubble.getBoundingClientRect(), bw = els.bubble ? (els.bubble.offsetWidth || 0) : 0;
        world.resize(sr.width, sr.height);
        if (b && b.width) { world.setFocus({ x: b.left + b.width / 2 - sr.left, y: b.top + b.height / 2 - sr.top }); world.setMode('home', { radiusPx: Math.min(sr.height * 0.48, (bw || b.width) * 0.54) }); }
        else { world.setFocus(null); world.setMode('home', { radiusPx: sr.height * 0.36 }); }
    }
    /* keep the 3D button clear of the avatar ring / theme switch (phones): float it to the nearest free spot of the window */
    let lastBtn = '';
    function obstacleOf(el, pad) {
        if (!el || el.hidden || el.classList.contains('tb-off')) return null;
        const q = el.getBoundingClientRect(), w = el.offsetWidth || q.width, h = el.offsetHeight || q.height, p = pad || 0; if (w < 2 || h < 2) return null;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') return null;
        const cx = q.left + q.width / 2, cy = q.top + q.height / 2; // centre from the box, size without transforms (breathing scale never moves the spot)
        const br = cs.borderTopLeftRadius || '', brPx = parseFloat(br) * (/%/.test(br) ? w / 100 : 1), round = Math.abs(w - h) < 2 && brPx >= w / 2 - 1;
        return round ? { cx, cy, rad: w / 2 + p } : { l: cx - w / 2 - p, t: cy - h / 2 - p, r: cx + w / 2 + p, b: cy + h / 2 + p };
    }
    function scrolledBy(el) { let s = 0; for (let e = el && el.parentElement; e && e !== D.body; e = e.parentElement) s += e.scrollTop || 0; return s + (W.scrollY || 0); }
    function placeOpenBtn(els) {
        const btn = els.top && els.top.querySelector('.bw3-open'); if (!btn || !stage) return;
        if (scrolledBy(els.home) > 2) return;
        const fixed = [D.getElementById('pfBtn'), D.getElementById('tbTheme')].map(e => obstacleOf(e, 5)).filter(Boolean);
        const inRow = [...els.top.children].filter(c => c !== btn).concat([...els.heroes.children].filter(c => c !== stage)).map(e => obstacleOf(e, 0)).filter(Boolean);
        const obs = fixed.concat(inRow), tr0 = els.top.getBoundingClientRect();
        const sr = stage.getBoundingClientRect(), X = n => Math.round(n - tr0.left), Y = n => Math.round(n - tr0.top); // relative to the header: a uniform shift keeps the spot
        const key = [tr0.width, X(sr.left), Y(sr.top), X(sr.right), Y(sr.bottom)].concat(...obs.map(o => o.rad != null ? [X(o.cx), Y(o.cy), Math.round(o.rad)] : [X(o.l), Y(o.t), X(o.r), Y(o.b)])).join(',');
        if (key === lastBtn) return; lastBtn = key;
        btn.classList.remove('bw3-float'); btn.style.left = btn.style.top = '';
        const b = btn.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const box = { l: b.left, r: b.right, t: Math.min(b.top, cy - 22), b: Math.max(b.bottom, cy + 22) };
        const boxClear = o => o.rad != null ? Math.hypot(Math.max(box.l - o.cx, 0, o.cx - box.r), Math.max(box.t - o.cy, 0, o.cy - box.b)) >= o.rad + 2 : (box.r + 2 <= o.l || box.l - 2 >= o.r || box.b + 2 <= o.t || box.t - 2 >= o.b);
        if (fixed.every(boxClear)) return;
        const spot = pickSpot({ area: { l: sr.left + 2, t: sr.top + 2, r: sr.right - 2, b: sr.bottom - 2 }, size: 44, gap: 4, step: 2, pref: { x: cx, y: cy }, obstacles: obs });
        if (!spot) return;
        btn.classList.add('bw3-float');
        btn.style.left = Math.round(spot.x - 22 - tr0.left) + 'px'; btn.style.top = Math.round(spot.y - 22 - tr0.top) + 'px';
    }
    function attachHome() {
        mode = 'home';
        if (!world || !stage) return;
        stage.insertBefore(canvas, stage.firstChild);
        lastLay = ''; layoutHome(); world.start();
        stage.classList.add('bw3-live');
    }

    /* ---------- full-screen world ---------- */
    function open() {
        if (api.state === 'fallback') return false;
        if (full) return true;
        mode = 'full';
        const l = lang();
        full = D.createElement('div'); full.className = 'bw3-full'; full.setAttribute('role', 'dialog'); full.setAttribute('aria-modal', 'true'); full.setAttribute('aria-label', tr('title', l));
        const ge = gyroEnv(), gk = gyroKind(ge);
        full.innerHTML = '<div class="bw3-view"></div><div class="bw3-labels"></div>' +
            '<header class="bw3-top"><div><b>' + tr('title', l) + '</b><small>' + tr('hint', l) + '</small></div><button type="button" class="bw3-x" aria-label="' + tr('close', l) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></header>' +
            (gk !== 'none' ? '<button type="button" class="bw3-gyro" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 9c-1.3 2-1.3 4 0 6M21 9c1.3 2 1.3 4 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span></span></button>' : '') +
            '<div class="bw3-card" hidden></div>' +
            '<nav class="bw3-chips" aria-label="' + tr('places', l) + '">' + PLACES.map(p => '<button type="button" data-bw3-go="' + p.id + '" style="--h:' + p.hue + '"><i></i>' + placeText(p, 'name', l) + '</button>').join('') + '</nav>' +
            '<div class="bw3-loading" aria-hidden="true"></div>';
        D.body.appendChild(full);
        H.classList.add('bw3-full-open');
        requestAnimationFrame(() => full && full.classList.add('on'));
        const view = full.querySelector('.bw3-view'), labels = full.querySelector('.bw3-labels');
        labels.innerHTML = PLACES.map(p => '<button type="button" class="bw3-lab" data-bw3-go="' + p.id + '" style="--h:' + p.hue + '" tabindex="-1">' + placeText(p, 'name', l) + '</button>').join('');
        full.querySelector('.bw3-x').addEventListener('click', close);
        full.addEventListener('click', e => { const b = e.target.closest('[data-bw3-go]'); if (b) go(b.dataset.bw3Go); const bk = e.target.closest('[data-bw3-back]'); if (bk) go(null); const tp = e.target.closest('[data-bw3-trip]'); if (tp) openTrip(tp.dataset.bw3Trip); });
        const gb = full.querySelector('.bw3-gyro');
        if (gb) { paintGyro(gb, gyroOn ? 'on' : 'off'); gb.addEventListener('click', () => gyroTap(gb)); }
        bindGestures(view, (x, y) => { if (!world) return; const id = world.pick(x, y); if (id === 'cell') showCell(); else if (id) go(id); }, true);
        D.addEventListener('keydown', onKey);
        load().then(w => {
            if (!w || !full) return;
            full.classList.add('bw3-has');
            view.appendChild(canvas);
            const r = view.getBoundingClientRect(); w.setMode('full'); w.setFocus(null); w.resize(r.width, r.height); w.flyTo(null); syncGlow(); w.start();
            labelLoop();
        });
        return true;
    }
    function close() {
        if (!full) return;
        D.removeEventListener('keydown', onKey);
        const f = full; full = null; f.classList.remove('on');
        H.classList.remove('bw3-full-open');
        setTimeout(() => f.remove(), mqReduce.matches ? 0 : 220);
        if (world) world.flyTo(null);
        if (stage && stage.isConnected) attachHome(); else mode = 'home';
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    let labRaf = 0;
    function labelLoop() {
        if (labRaf) cancelAnimationFrame(labRaf);
        const tick = () => {
            labRaf = 0; if (!full || !world) return;
            full.querySelectorAll('.bw3-lab').forEach(el => {
                const p = world.project(el.dataset.bw3Go);
                if (!p || !p.visible) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; }
                el.style.opacity = String(Math.max(0.25, Math.min(1, 9 / (p.dist + 1))));
                el.style.pointerEvents = 'auto';
                el.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px) translate(-50%,-100%)';
            });
            labRaf = requestAnimationFrame(tick);
        };
        labRaf = requestAnimationFrame(tick);
    }
    function go(id) {
        if (!full || !world) return;
        const card = full.querySelector('.bw3-card'), l = lang();
        world.flyTo(id || null);
        full.querySelectorAll('.bw3-chips button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bw3Go === id)));
        if (!id) { card.hidden = true; return; }
        const p = PLACES.find(x => x.id === id); if (!p) return;
        const hasTrip = !!(W.LowiBodyTrips && typeof W.LowiBodyTrips.open === 'function');
        card.style.setProperty('--h', p.hue);
        card.innerHTML = '<b>' + placeText(p, 'name', l) + '</b><p>' + placeText(p, 'line', l) + '</p><div>' + (hasTrip ? '<button type="button" data-bw3-trip="' + id + '">' + tr('trip', l) + '</button>' : '') + '<button type="button" class="ghost" data-bw3-back>' + tr('back', l) + '</button></div>';
        card.hidden = false;
        if (!mqReduce.matches) { full.style.setProperty('--flash', p.hue); full.classList.remove('bw3-flash'); void full.offsetWidth; full.classList.add('bw3-flash'); }
        try { W.dispatchEvent(new CustomEvent('lowi:world3d-place', { detail: { id } })); } catch (e) {}
    }
    function showCell() {
        if (!full) return; const card = full.querySelector('.bw3-card'), l = lang();
        card.style.setProperty('--h', '#9b87d2');
        card.innerHTML = '<b>' + tr('cell', l) + '</b><p>' + tr('cellLine', l) + '</p><div><button type="button" class="ghost" data-bw3-back>' + tr('back', l) + '</button></div>';
        card.hidden = false;
    }
    function openTrip(id) { try { close(); W.LowiBodyTrips.open(id); } catch (e) {} }

    /* ---------- boot ---------- */
    function boot() {
        const e = env(), d = shouldUse3D(e);
        if (!d.ok) { api.state = 'fallback'; api.why = d.why; H.classList.add('bw3-off'); return; }
        mountHome();
        const kick = () => load().then(w => { if (w && mode === 'home') attachHome(); });
        if (W.requestIdleCallback) W.requestIdleCallback(kick, { timeout: 1500 }); else setTimeout(kick, 300);
        setInterval(() => { if (api.state !== 'fallback' && !D.hidden) { mountHome(); syncGlow(); } }, 1200);
        W.addEventListener('resize', () => { lastLay = ''; if (mode === 'home') layoutHome(); else if (full && world) { const r = full.querySelector('.bw3-view').getBoundingClientRect(); world.resize(r.width, r.height); } });
        new MutationObserver(() => { if (world) world.setTheme(themeNow()); }).observe(H, { attributes: true, attributeFilter: ['data-theme'] });
        D.addEventListener('visibilitychange', () => { if (D.hidden && world) world.stop(); else if (world) world.start(); });
        if (mqReduce.addEventListener) mqReduce.addEventListener('change', () => { if (mqReduce.matches) fail('reduced-motion'); });
        ['lowi:award', 'lowi:meal-logged'].forEach(n => W.addEventListener(n, () => setTimeout(syncGlow, 300)));
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
