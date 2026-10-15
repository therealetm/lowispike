/* LOWiSPIKE seasonal themes (Oct 15, 2026): the world changes look with the season, automatically by date.
   - <html data-season="autumn" data-season-phase="peak"> + --ssn-a/--ssn-b/--ssn-c, so CSS (season.css) tints the Home
     background, the living cell (.cw-env), the 3D window frame and the cell room (.cr-scene). Night/Cloud/Sunrise all work.
   - #ssnSky: one layer behind every screen (next to the weather sky) with a seasonal wash + a few drifting leaves/petals/
     flakes/pollen (<= 10 DOM particles, transform/opacity only, none with reduced motion). Takes no touches.
   - 3D: inside the ONE shared world (window.LowiWorld3D) only. Adds a small Points group of drifting motes to the hub and
     lerps the hub fog/background toward the season haze in onFrame (after world health). Never in a region (regions keep
     their hue), never during a cell ride, never a second WebGL context.
   - No setting, no reward, no countdown. ?season=winter (dev) previews another season. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiSeason) return;
    const C = W.LowiSeasonCore;
    if (!C) { console.warn('season-core missing'); return; }
    const me = D.currentScript || D.querySelector('script[src*="season.js"]');
    if (!D.getElementById('ssnCss')) {
        const l = D.createElement('link'); l.id = 'ssnCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('season.js', 'season.css') : 'season.css';
        D.head.appendChild(l);
    }
    const mqReduce = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const themeNow = () => (H.dataset.theme === 'light' ? 'light' : 'dark');
    function forced() {
        try { const m = /[?&]season=(spring|summer|autumn|winter)(?:[-:](early|peak|late))?/.exec(location.search); return m ? { force: m[1], phase: m[2] } : {}; } catch (e) { return {}; }
    }
    let cur = null, layer = null, layerSig = '', themeSig = '';

    function now() { return C.season(Date.now(), forced()); }

    /* ---------- html attributes + css vars ---------- */
    function paintVars() {
        if (!cur) return;
        const L = C.look(cur, themeNow());
        H.style.setProperty('--ssn-a', L.a); H.style.setProperty('--ssn-b', L.b); H.style.setProperty('--ssn-c', L.c);
        themeSig = themeNow();
    }
    function apply() {
        const s = now();
        const changed = !cur || cur.key !== s.key;
        cur = s;
        if (changed) { H.dataset.season = s.id; H.dataset.seasonPhase = s.phase; paintVars(); try { W.dispatchEvent(new CustomEvent('lowi:season', { detail: s })); } catch (e) {} }
        else if (themeSig !== themeNow()) paintVars();
        build();
        hook3d();
        return s;
    }

    /* ---------- 2D layer behind every screen ---------- */
    function build() {
        const app = D.getElementById('app');
        if (!app || !cur) return null;
        const wet = /^(rain|drizzle|storm|snow)$/.test(H.dataset.wxCond || '');
        const n = C.counts({ w: W.innerWidth, reduced: mqReduce.matches, phase: cur.phase, wet }).dom;
        const sig = cur.key + '|' + n;
        if (layer && layer.parentNode === app && sig === layerSig) return layer;
        layer = D.getElementById('ssnSky') || D.createElement('div');
        layer.id = 'ssnSky'; layer.setAttribute('aria-hidden', 'true');
        const ps = C.particles(n, cur.id.length * 97 + 11);
        layer.innerHTML = '<i class="ssn-wash"></i><i class="ssn-glow"></i>' + ps.map(p => '<i class="ssn-p ssn-t' + p.tone + '" style="--x:' + p.x + '%;--d:' + p.delay + 's;--t:' + p.dur + 's;--s:' + p.size + 'px;--w:' + p.sway + 'px;--r:' + p.spin + 'deg"></i>').join('');
        const wx = D.getElementById('wxSky');
        if (wx && wx.parentNode === app) app.insertBefore(layer, wx.nextSibling); else app.insertBefore(layer, app.firstChild);
        layerSig = sig;
        return layer;
    }

    /* ---------- 3D: motes in the hub + a season haze on the bloodstream fog ---------- */
    let world3d = null, motes = null, offFrame = null, moteSig = '', haze = null;
    function moteTexture(THREE, kind) {
        const c = D.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        g.translate(32, 32); g.fillStyle = '#fff';
        if (kind === 'leaf') {
            g.rotate(-0.5); g.beginPath(); g.moveTo(0, -26); g.bezierCurveTo(18, -16, 20, 10, 0, 26); g.bezierCurveTo(-20, 10, -18, -16, 0, -26); g.fill();
            g.globalCompositeOperation = 'destination-out'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 22); g.stroke();
        } else if (kind === 'petal') {
            g.beginPath(); g.ellipse(0, 0, 14, 24, 0.6, 0, Math.PI * 2); g.fill();
        } else {
            const r = g.createRadialGradient(0, 0, 0, 0, 0, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(kind === 'frost' ? 0.25 : 0.4, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = r; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
        }
        const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
    }
    function disposeMotes() {
        if (!motes) return;
        try { motes.parent && motes.parent.remove(motes); motes.geometry.dispose(); motes.material.map && motes.material.map.dispose(); motes.material.dispose(); } catch (e) {}
        motes = null; moteSig = '';
    }
    function buildMotes() {
        const a = world3d; if (!a || !a.THREE || !a.hub || !cur) return;
        const th = themeNow(), sig = cur.key + '|' + th;
        if (motes && sig === moteSig) return;
        disposeMotes();
        const THREE = a.THREE, L = C.look(cur, th), n = C.counts({ w: W.innerWidth, phase: cur.phase }).motes, r = C.rand(cur.id.length * 31 + 5);
        const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = new Float32Array(n * 3), c = new THREE.Color();
        for (let i = 0; i < n; i++) {
            const ang = r() * 6.283, d = 1.4 + Math.sqrt(r()) * 8.5;
            pos[i * 3] = (r() * 2 - 1) * 20; pos[i * 3 + 1] = Math.cos(ang) * d; pos[i * 3 + 2] = Math.sin(ang) * d;
            vel[i * 3] = 0.25 + r() * 0.35; vel[i * 3 + 1] = (cur.mote === 'pollen' ? 0.05 : 0.18) + r() * 0.22; vel[i * 3 + 2] = r() * 6.283;
            c.set(L.motes[i % L.motes.length]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const mat = new THREE.PointsMaterial({ map: moteTexture(THREE, cur.mote), vertexColors: true, size: cur.mote === 'leaf' ? 0.42 : cur.mote === 'petal' ? 0.32 : 0.2, sizeAttenuation: true, transparent: true, opacity: L.moteOp, depthWrite: false, fog: true,
            blending: th === 'light' || cur.mote === 'leaf' || cur.mote === 'petal' ? THREE.NormalBlending : THREE.AdditiveBlending });
        motes = new THREE.Points(geo, mat); motes.name = 'lowi-season-motes'; motes.frustumCulled = false; motes.userData.vel = vel; motes.userData.season = cur.id;
        a.hub.add(motes); moteSig = sig;
        haze = new THREE.Color(L.haze); haze.amt = L.amt;
    }
    function inRegion(a) { try { return !!(a.hub && a.camera && !a.hub.layers.test(a.camera.layers)); } catch (e) { return false; } }
    function riding() { try { return !!(W.LowiRide && W.LowiRide.active); } catch (e) { return false; } }
    let tAcc = 0;
    function frame(dt) {
        const a = world3d; if (!a || !a.scene || !cur) return;
        dt = dt > 1 ? dt / 1000 : dt; if (!(dt > 0)) dt = 1 / 60; dt = Math.min(dt, 0.05);
        tAcc += dt;
        if (!motes || moteSig !== cur.key + '|' + themeNow()) buildMotes();
        if (inRegion(a) || riding()) { if (motes) motes.visible = false; return; }
        if (motes) {
            motes.visible = true;
            if (!mqReduce.matches) {
                const p = motes.geometry.attributes.position, arr = p.array, v = motes.userData.vel, n = p.count, fall = cur.mote === 'pollen' ? 0.4 : 1;
                for (let i = 0; i < n; i++) {
                    let x = arr[i * 3] + v[i * 3] * dt, y = arr[i * 3 + 1] - v[i * 3 + 1] * dt * fall;
                    const z = arr[i * 3 + 2] + Math.sin(tAcc * 0.7 + v[i * 3 + 2]) * dt * 0.35;
                    if (x > 20) x -= 40; if (y < -9) y += 18; if (cur.mote === 'pollen') y += Math.sin(tAcc * 0.5 + v[i * 3 + 2]) * dt * 0.2;
                    arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
                }
                p.needsUpdate = true;
            }
        }
        /* season haze on top of the base + world-health colour; the regions build sets its own look when inside */
        const bg = a.scene.background, f = a.scene.fog;
        if (haze && bg && bg.isColor) { bg.lerp(haze, haze.amt); if (f && f.color) f.color.copy(bg); }
    }
    function hook3d() {
        const a = W.LowiWorld3D;
        if (!a || typeof a.onFrame !== 'function') return;
        if (!offFrame) { offFrame = a.onFrame(frame) || null; world3d = a; }
        if (a.ready && a.hub && a.THREE) { world3d = a; buildMotes(); }
    }

    function boot() {
        apply();
        W.addEventListener('lowi:world3d-ready', () => { world3d = W.LowiWorld3D; hook3d(); buildMotes(); });
        new MutationObserver(() => { if (cur && themeSig !== themeNow()) paintVars(); }).observe(H, { attributes: true, attributeFilter: ['data-theme'] });
        const app = D.getElementById('app');
        if (app) new MutationObserver(() => { if (!layer || layer.parentNode !== app) { layerSig = ''; build(); } }).observe(app, { childList: true });
        if (mqReduce.addEventListener) mqReduce.addEventListener('change', () => { layerSig = ''; build(); });
        D.addEventListener('visibilitychange', () => { if (!D.hidden) apply(); });
        W.addEventListener('resize', () => { build(); });
        setInterval(() => { if (!D.hidden) apply(); }, 10 * 60000);
        /* the app shell may mount #app or the 3D world a moment later */
        let tries = 0; const t = setInterval(() => { apply(); if (++tries > 20 || (layer && layer.isConnected && world3d)) clearInterval(t); }, 500);
    }
    W.LowiSeason = { now: () => (cur ? Object.assign({}, cur) : now()), apply, look: () => (cur ? C.look(cur, themeNow()) : null), get motes() { return motes ? motes.geometry.attributes.position.count : 0; } };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
