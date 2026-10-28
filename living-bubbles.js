/* LOWiSPIKE living Home bubbles (Oct 17, 2026, Emmanuel: "I wanted exactly that bubble [Misty's] for every other thing that we are
   about to put into the home screen" + "all this stuff should be inside the bubble, like Misty is inside hers; when we click on it,
   it's like clicking the bubble" + "why is there an extra Edit button above the fasting bubble?" + "very good with the long press").

   Misty's real bubble is the 3D membrane of the world (body-world-3d-scene.js: memMat, fresnel #3a9fe0 -> #9b87d2 -> #8fe7ff, vertex
   wobble, shimmer, breathing, uGlow, theme colours). This file draws THAT membrane - the same shaders and the very same uniform values
   (one shared clock, glow and theme) - around every registered Home bubble: fasting (#spFast), water (#whHud .wh-water) and anything
   added later (LowiBubbles.add(el), class "lw-bub", [data-hb], or the 'lowi:home-bubble-added' event, e.g. the movement bubble).
   - No new loop and no new WebGL context: the meshes live in the world's own scene and are placed in its own frame callback.
   - Each membrane sits exactly on its DOM bubble (it follows the bubble's box every drawn frame, so the float and the press squish move
     the membrane and the text inside together), breathes and turns like Misty's cell, and fades with the Home HUD.
   - The DOM shell becomes clear (html.lb3d); the content (text, water, progress) stays inside it, on top of the membrane.
   - Press = squish like Misty's bubble. Long press on fasting = edit the start time (replaces the separate "Edit" button).
   - Without the 3D world (reduced capability, failure) nothing changes: the CSS bubble in world-home.css stays as the fallback.
   Pure helpers are exported for node tests (tests/living-bubbles.test.cjs). */
(function (root) {
    'use strict';
    const CORE = {
        /* the membrane radius for a DOM bubble of width w (Misty's is 0.54 x her bubble; a hair tighter here so the water inside meets the rim) */
        radiusFor(w) { return Math.max(0, +w || 0) * 0.52; },
        /* the same breathing as Misty's cell (body-world-3d-scene.js step(): 1 + 0.015 sin(1.55 t)) */
        breath(t, phase, still) { return still ? 1 : 1 + 0.015 * Math.sin((+t || 0) * 1.55 + (phase || 0)); },
        /* Misty's fragment shader with one extra uniform (uO) so each bubble can fade with the HUD; returns null if the shader changed */
        fadeShader(src) {
            if (typeof src !== 'string' || src.indexOf('clamp(a,0.0,0.95)') < 0) return null;
            return 'uniform float uO;' + src.replace('clamp(a,0.0,0.95)', 'clamp(a,0.0,0.95)*uO');
        },
        /* where a DOM point lands in the canvas, in normalised device coords */
        ndc(cx, cy, W, H) { return { x: (cx / W) * 2 - 1, y: -((cy / H) * 2 - 1) }; },
        /* world units per CSS pixel at camera distance d (fov in degrees, canvas height H in CSS px) */
        unitsPerPx(d, fovDeg, H) { return (2 * d * Math.tan((fovDeg * Math.PI / 180) / 2)) / Math.max(1, H); },
        /* long press: held long enough and the finger hardly moved */
        isLong(ms, moved) { return ms >= 520 && moved < 12; },
        AUTO: ['#spFast', '#whHud .wh-water', '#whHud .wh-move', '#whHud [data-hb]', '.lw-bub'],
        /* home-controls (Oct 17, Emmanuel: "Update the VR bubble. The sound bubble. The world map bubble. The night bubble ... even the
           Today" - the actual bubble, not glass colours): the Home controls get the same membrane. They keep their own shape (round, and
           Today stays a pill), position, icon, label, tap/hold/drag and their own :active press, so no squish, no float added here. */
        CTL: [
            { sel: '#whHud .wh-vr', kind: 'vr' },
            { sel: '#whHud .wa-btn', kind: 'sound' },
            { sel: '#whHud .wh-zoom', kind: 'map' },
            { sel: '#tbTheme', kind: 'daynight' },
            { sel: '#whHud .wh-todaybtn', kind: 'today', shape: 'pill' },
            { sel: '#tab-home #spHome .sp-weather', kind: 'weather' }, /* sym-home (Oct 17): "the weather thing should be round too" */
            { sel: '#tab-home #f3Board', kind: 'quest', shape: 'box' }
        ],
        /* membrane radius in CSS px for a box: a round control like a bubble (0.52 x width), a pill on its height (its round ends) */
        radiusForBox(w, h, shape, rx) { return shape === 'box' ? CORE.cornerOf(w, h, rx) * 1.04 : shape === 'pill' ? Math.max(0, +h || 0) * 0.52 : CORE.radiusFor(w); },
        /* a box (Daily Quest) keeps its own corner: the round end of the capsule is its corner radius, never more than half its height */
        cornerOf(w, h, rx) { h = Math.max(0, +h || 0); const r = +rx > 0 ? +rx : h / 2; return Math.min(h / 2, Math.max(4, Math.min(r, (+w || 0) / 2))); },
        /* how much taller than its corners the box membrane is stretched (1 for a pill: plain capsule) */
        stretchY(h, rx) { const r = +rx > 0 ? Math.min(+rx, (+h || 0) / 2) : (+h || 0) / 2; return r > 0 ? ((+h || 0) * 0.52) / (r * 1.04) : 1; },
        /* a pill is Misty's membrane stretched into a capsule: the straight middle (in geometry units, cap radius gR) so that the caps
           land on the pill's own round ends */
        /* sym-home (Oct 17, Emmanuel: "the Daily Quest and the Today thingy are cylindrical, but I still see the straight lines, so it
           doesn't really look like a water bubble"): pills and boxes are no longer a capsule with a straight middle but a liquid drop, a
           superellipsoid |x|^n + |y|^n + |z|^n = 1, curved everywhere (no flat top or bottom line), stretched over the control.
           n: lower = rounder. dropAxes: half-axes in CSS px, a little larger than the box so its content stays inside the membrane. */
        DROP_SEG: [96, 64], /* width x height segments of the liquid-drop geometry (was 56 x 36: faceted corners on the wide Daily Quest) */
        dropN(shape) { return shape === 'box' ? 3 : 2.6; },
        dropAxes(w, h, shape) { w = Math.max(0, +w || 0); h = Math.max(0, +h || 0); return shape === 'box' ? { ax: w * 0.53, ay: h * 0.6 } : { ax: w * 0.54, ay: h * 0.6 }; },
        /* scale for one unit direction (x, y, z) onto the superellipsoid of exponent n, and its outward normal there */
        dropPoint(x, y, z, n) {
            const s = Math.pow(Math.pow(Math.abs(x), n) + Math.pow(Math.abs(y), n) + Math.pow(Math.abs(z), n), -1 / n);
            const px = x * s, py = y * s, pz = z * s, g = v => Math.sign(v) * Math.pow(Math.abs(v), n - 1);
            const nx = g(px), ny = g(py), nz = g(pz), L = Math.hypot(nx, ny, nz) || 1;
            return { x: px, y: py, z: pz, nx: nx / L, ny: ny / L, nz: nz / L };
        },
        capsuleLen(w, h, gR, rx) { w = +w || 0; h = +h || 0; if (!(h > 0)) return 0; const r = rx > 0 ? CORE.cornerOf(w, h, rx) : h / 2; return Math.max(0, w - 2 * r) * gR / (1.04 * r); },

        /* ---------- the liquid inside (Oct 18, Emmanuel on his iPad: "The liquid in the bubble still doesn't match." Asked before:
           like water inside a balloon - the same boundary as the bubble, clipped by it, sloshing as it moves).
           The fill used to be a flat DOM layer clipped to a CSS circle (and the fasting water its own 2D canvas), while the glass is
           this 3D membrane: 0.52 x the width, vertex wobble, breathing, perspective - two outlines that never matched. Now the
           membrane mesh draws the liquid itself: a child mesh with the SAME geometry, the SAME vertex shader (same wobble, same clock)
           and the same edge softening, so the liquid's outline IS the glass outline. Only its surface line is the liquid's own. */
        SLOSH_MAX: 0.42,
        /* progress 0..1 -> surface height in the glass, -1 (bottom) .. +1 (top), on the view-space normal; full sits far above the top
           so no slosh ever shows a surface on a full glass (Water 8/6 is full); nothing to draw when empty */
        liquidLevel(f) { f = +f; if (!(f > 0.002)) return null; if (f >= 0.999) return 1.75; return -1 + 2 * f; },
        /* Misty's membrane fragment shader -> the liquid's fragment shader, with the membrane's own lwEdge(); null if it changed */
        liquidShader(fs) {
            if (typeof fs !== 'string') return null;
            const a = fs.indexOf('\n#if __VERSION__ >= 300'), b = a >= 0 ? fs.indexOf('#endif\n', a) : -1;
            if (a < 0 || b < 0 || fs.indexOf('float lwEdge(float nv)', a) < 0) return null;
            const edge = fs.slice(a, b + 7), cs = fs.indexOf('#include <colorspace_fragment>') >= 0 ? '\n#include <colorspace_fragment>\n' : '';
            return 'uniform float uO;uniform float uT;uniform float uLv;uniform float uTilt;uniform float uWave;uniform float uPh;' +
                'uniform vec3 uTop;uniform vec3 uBot;uniform float uA1;uniform float uA2;varying vec3 vN;varying vec3 vV;varying vec3 vP;' + edge +
                '\n#if __VERSION__ >= 300 || defined(GL_OES_standard_derivatives)\nfloat lqW(float y){return fwidth(y)*1.2+0.002;}\n#else\nfloat lqW(float y){return 0.02;}\n#endif\n' +
                'void main(){vec3 n=normalize(vN);float nv=abs(dot(n,normalize(vV)));float x=n.x,y=n.y;' +
                /* the surface: level + slosh tilt + two soft waves (the fasting water's own wave shape) */
                'float s=uLv+uTilt*x+uWave*(0.6*sin(x*2.6+uT*1.15+uPh)+0.4*sin(x*4.6-uT*1.7+uPh*1.7));' +
                'float d=s-y;float w=lqW(y);float under=smoothstep(-w,w,d);if(under<=0.0)discard;' +
                'float k=clamp((y+1.0)/max(0.1,min(s,1.0)+1.0),0.0,1.0);vec3 c=mix(uBot,uTop,k);float a=mix(uA2,uA1,k);' +
                /* a band of light just under the surface. No deeper colour where the glass curves away: on a part-full bubble that read as a
                   dark band along its lower edge (Emmanuel: "All bubbles have a shadow bottom. Remove that weird bottom.") */
                'c+=vec3(0.2)*smoothstep(0.12,0.0,d)*step(s,1.05);' +
                'gl_FragColor=vec4(c,clamp(a*under,0.0,0.95)*lwEdge(nv)*uO);' + cs + '}';
        },
        /* the liquid's colour from the bubble's own fill gradient (water blue, move green, fuel amber, sleep violet), a touch stronger
           under the glass so a full glass reads full */
        parseGradient(bg) {
            const m = String(bg || '').match(/rgba?\([^)]*\)/g); if (!m || m.length < 2) return null;
            const p = t => { const v = t.replace(/[^\d.,]/g, '').split(',').map(Number); return { c: [v[0], v[1], v[2]], a: v.length > 3 ? v[3] : 1 }; };
            const t = p(m[0]), b = p(m[m.length - 1]), up = a => Math.min(0.92, a * 1.1 + 0.08);
            return { top: t.c, bot: b.c, a1: up(t.a), a2: up(b.a) };
        },
        /* the fasting water keeps its own colours (fast-bubble.js PAL): blue while it runs, sea green when the goal is reached */
        liquidColors(kind, light, done) {
            const P = done ? (light ? { top: [170, 238, 214], bot: [80, 170, 176], a1: 0.64, a2: 0.78 } : { top: [158, 240, 214], bot: [56, 150, 170], a1: 0.8, a2: 0.92 })
                : (light ? { top: [150, 222, 245], bot: [92, 146, 222], a1: 0.62, a2: 0.74 } : { top: [118, 210, 238], bot: [52, 92, 188], a1: 0.76, a2: 0.92 });
            return kind === 'fast' ? P : { top: [110, 200, 255], bot: [40, 120, 240], a1: 0.69, a2: 0.92 };
        },
        /* slosh: the water lags the bubble. dx, dy = how far the bubble moved this frame, in bubble radii. Water answers to a change of
           speed (steady motion leaves it flat): the bubble's speed is smoothed, and each change of it pushes a damped spring for the
           surface tilt (sideways) and bob (up and down); a touch adds a ripple that dies away. Reduced motion: flat and still. */
        sloshState() { return { tilt: 0, tv: 0, bob: 0, bv: 0, wave: 0, kick: 0, svx: 0, svy: 0 }; },
        slosh(st, dx, dy, dt, calm) {
            if (calm) { st.tilt = st.tv = st.bob = st.bv = st.wave = st.kick = st.svx = st.svy = 0; return st; }
            dt = Math.min(0.05, Math.max(0, +dt || 0)); if (!dt) return st;
            const M = CORE.SLOSH_MAX, c = v => Math.max(-M, Math.min(M, v)), cl = v => Math.max(-20, Math.min(20, v)), k = Math.min(1, dt * 12);
            const vx = cl((+dx || 0) / dt), vy = cl((+dy || 0) / dt), px = st.svx, py = st.svy;
            st.svx += (vx - st.svx) * k; st.svy += (vy - st.svy) * k;
            st.tv -= (st.svx - px) * 5;                           /* speeding up to the right: water piles up on the left */
            st.bv += (st.svy - py) * 3;                           /* speeding up downward: the water rises */
            st.tv += (-38 * st.tilt - 3.2 * st.tv) * dt; st.tilt = c(st.tilt + st.tv * dt);
            st.bv += (-44 * st.bob - 3.6 * st.bv) * dt; st.bob = c(st.bob + st.bv * dt);
            st.kick *= Math.exp(-dt * 2.4);
            st.wave = 0.012 + Math.min(0.06, Math.abs(st.tilt) * 0.12 + Math.abs(st.tv) * 0.01) + st.kick;
            return st;
        }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
    if (!root || !root.document) return;

    const W = root, D = root.document, H = D.documentElement;
    const reduceMq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const still = () => !!(reduceMq && reduceMq.matches);
    const list = new Map(); /* el -> { mesh, mat, phase, spin, o, oT, opts } */
    let api = null, mem = null, group = null, offFrame = null, geo = null, vs = '', fs = '', lfs = '', lastVis = 0, tmp = null;

    function css() {
        if (D.getElementById('lbCss')) return;
        const me = D.querySelector('script[src*="living-bubbles.js"]'), l = D.createElement('link');
        l.id = 'lbCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('living-bubbles.js', 'living-bubbles.css') : 'living-bubbles.css';
        D.head.appendChild(l);
    }

    /* ---------- the membrane: Misty's own shader, her uniform values ---------- */
    function findMembrane(a) {
        let m = null;
        try { a.scene.traverse(o => { if (!m && o.isMesh && o.material && o.material.uniforms && o.material.uniforms === a.memU) m = o; }); } catch (e) {}
        return m;
    }
    function makeMat(THREE) {
        const U = api.memU;
        return new THREE.ShaderMaterial({
            uniforms: { uIn: U.uIn, uRim: U.uRim, uHi: U.uHi, uGlow: U.uGlow, uBase: U.uBase, uT: U.uT, uO: { value: 0 } },
            vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false,
            extensions: { derivatives: true } /* Misty's shader now softens its own outline with fwidth (crisp edges, body-world-3d-scene.js EDGE_AA) */
        });
    }
    /* sym-home: Misty's sphere, pulled into a liquid drop (superellipsoid of exponent n); the mesh is stretched over the control */
    const drops = {};
    function dropGeo(n) {
        if (drops[n]) return drops[n];
        const THREE = api.THREE, gR = (geo && geo.parameters && geo.parameters.radius) || 1.4;
        /* crisp edges (Oct 17): the drop is stretched over wide controls (Daily Quest, Today), so its outline needs more points than
           Misty's round sphere or the corners show as flat facets; built once per shape and shared, about 6k points each */
        const g = new THREE.SphereGeometry(gR, CORE.DROP_SEG[0], CORE.DROP_SEG[1]), P = g.attributes.position, N = g.attributes.normal;
        for (let i = 0; i < P.count; i++) {
            const x = P.getX(i) / gR, y = P.getY(i) / gR, z = P.getZ(i) / gR, q = CORE.dropPoint(x, y, z, n);
            P.setXYZ(i, q.x * gR, q.y * gR, q.z * gR); N.setXYZ(i, q.nx, q.ny, q.nz);
        }
        P.needsUpdate = true; N.needsUpdate = true;
        return (drops[n] = g);
    }
    function build(el) {
        const s = list.get(el); if (!s || s.mesh || !group) return;
        const THREE = api.THREE;
        s.mat = makeMat(THREE);
        s.mesh = new THREE.Mesh((s.opts.shape === 'pill' || s.opts.shape === 'box') ? dropGeo(CORE.dropN(s.opts.shape)) : geo, s.mat);
        s.mesh.renderOrder = 20; s.mesh.frustumCulled = false; s.mesh.visible = false;
        s.mesh.userData.lwKeep = true; /* body-world-regions setHubVisible leaves it alone */
        group.add(s.mesh);
        buildLiquid(s);
    }
    /* the liquid inside: same geometry, same vertex shader, same clock as the glass, and a child of it, so it shares the glass's exact
       outline every frame (wobble, turn, breathing, press squish, perspective) - only round Home bubbles that carry a fill */
    function buildLiquid(s) {
        if (s.liq || !lfs || !s.mesh || s.opts.ctl || s.opts.shape) return;
        const THREE = api.THREE;
        s.lmat = new THREE.ShaderMaterial({
            uniforms: { uT: s.mat.uniforms.uT, uO: { value: 0 }, uLv: { value: -2 }, uTilt: { value: 0 }, uWave: { value: 0 }, uPh: { value: s.phase },
                uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uA1: { value: 0.7 }, uA2: { value: 0.9 } },
            vertexShader: s.mat.vertexShader, fragmentShader: lfs, transparent: true, depthWrite: false, depthTest: false,
            extensions: { derivatives: true }
        });
        s.liq = new THREE.Mesh(s.mesh.geometry, s.lmat);
        s.liq.renderOrder = 19; s.liq.frustumCulled = false; s.liq.visible = false;
        s.liq.userData.lbLiquid = true; s.liq.userData.lwKeep = true;
        s.sl = CORE.sloshState(); s.lv = null; s.lvT = null; s.colKey = '';
        s.mesh.add(s.liq);
    }
    function setCol(s, P) {
        const k = P.top.join() + P.bot.join() + P.a1 + P.a2; if (k === s.colKey) return; s.colKey = k;
        const U = s.lmat.uniforms;
        U.uTop.value.setRGB(P.top[0] / 255, P.top[1] / 255, P.top[2] / 255, api.THREE.SRGBColorSpace);
        U.uBot.value.setRGB(P.bot[0] / 255, P.bot[1] / 255, P.bot[2] / 255, api.THREE.SRGBColorSpace);
        U.uA1.value = P.a1; U.uA2.value = P.a2;
    }
    /* how full the bubble is, as its own fill shows it (any bubble: water, move, fuel, sleep, ...; read with the 180 ms pass) */
    function readFill(el, s) {
        if (!s.liq) return;
        if (s.opts.kind === 'fast') {
            let st = null; try { st = W.LowiFastBubble && W.LowiFastBubble.state && W.LowiFastBubble.state(); } catch (e) {}
            if (!st || !st.on) { s.lvT = null; return; }
            s.lvT = CORE.liquidLevel(st.target >= 0.999 ? 0.999 : st.target);
            setCol(s, CORE.liquidColors('fast', H.getAttribute('data-theme') === 'light', !!st.done));
            return;
        }
        if (!s.fillEl || !s.fillEl.isConnected || !el.contains(s.fillEl)) s.fillEl = el.querySelector('.wh-cell-fill, .hb2-fill');
        const f = s.fillEl, hh = el.clientHeight; /* the fill sits inside the border: 122 of 122 px is full */
        if (!f || !hh) { s.lvT = null; return; }
        s.lvT = CORE.liquidLevel(f.offsetHeight / hh);
        const bg = getComputedStyle(f).backgroundImage;
        if (bg !== s.bg) { s.bg = bg; setCol(s, CORE.parseGradient(bg) || CORE.liquidColors('water')); }
    }
    /* while the 3D liquid draws, the flat fill / fasting 2D water hide under it (written only when it changes) */
    function liqClass(el, s, on) { if (s.liqOn !== on) { s.liqOn = on; el.classList.toggle('lb-liq', on); } }
    function attach3d(a) {
        if (api || !a || !a.THREE || !a.scene || !a.memU || !a.camera) return false;
        const m = findMembrane(a); if (!m) return false;
        const f = CORE.fadeShader(m.material.fragmentShader); if (!f) return false;
        api = a; mem = m; vs = m.material.vertexShader; fs = f; geo = m.geometry; lfs = CORE.liquidShader(f) || '';
        const THREE = a.THREE; tmp = { v: new THREE.Vector3(), f: new THREE.Vector3(), q: new THREE.Quaternion(), y: new THREE.Vector3(0, 1, 0), x: new THREE.Vector3(1, 0, 0) };
        group = new THREE.Group(); group.name = 'lowi-living-bubbles'; group.userData.lwKeep = true; a.scene.add(group);
        list.forEach((s, el) => build(el));
        offFrame = a.onFrame(frame);
        H.classList.add('lb3d');
        return true;
    }

    /* ---------- visibility: the bubble is on screen and the HUD is showing ---------- */
    function effOpacity(el) {
        if (!el.isConnected) return 0;
        let o = 1;
        for (let e = el; e && e !== D.body; e = e.parentElement) {
            const c = getComputedStyle(e);
            if (c.display === 'none' || c.visibility === 'hidden') return 0;
            o *= +c.opacity;
            if (o < 0.02) return 0;
        }
        return o;
    }
    function homeShown() {
        if (!H.classList.contains('wh-home') || !H.classList.contains('wh-world-live')) return false;
        /* Oct 17 (Emmanuel, inside the heart world: "that's still the old design ... not the water liquid design that we had going on
           in the homepage"): inside a cell world (wh-away) the same membrane is drawn around whatever control is still shown there,
           so nothing drops back to the old flat glass shell. Each control's own visibility still decides (effOpacity). */
        if (/(^|\s)(wh-cosmos|wb-on)(\s|$)/.test(H.className)) return false;
        try { if (W.LowiWorld3D && W.LowiWorld3D.isOpen && W.LowiWorld3D.isOpen()) return false; } catch (e) {}
        const t = D.getElementById('tab-home'); return !t || t.classList.contains('active');
    }
    function refreshVis(now) {
        lastVis = now;
        const on = homeShown();
        list.forEach((s, el) => {
            s.oT = on ? effOpacity(el) : 0;
            if (s.opts.ctl) live(el, s.oT > 0 && !!s.mesh);
            if (s.liq && s.oT > 0) readFill(el, s);
            if (s.oT > 0 && s.opts.shape === 'box') {
                const v = parseFloat(getComputedStyle(el).borderTopLeftRadius); if (v > 0) s.rx = v; /* its corner, as styled now */
                const j = el.classList.contains('hc-joined') ? D.getElementById('hcLine') : null; /* hunt-count.js joins its line under it */
                s.join = j && effOpacity(j) > 0.5 ? j : null;
            }
        });
    }
    /* home-controls: the shell of a control turns clear only while its membrane is really drawn (Day/Night lives on every page) */
    function live(el, on) { if (el.classList.contains('lb-live') !== on) el.classList.toggle('lb-live', on); }
    function unlive() { list.forEach((s, el) => { if (s.opts.ctl) live(el, false); }); }

    /* ---------- every drawn frame of the world (its own loop) ---------- */
    function frame(dt, now) {
        if (!api || !list.size) return;
        now = now || performance.now();
        if (now - lastVis > 180) refreshVis(now);
        const cam = api.camera, cv = api.renderer && api.renderer.domElement; if (!cv) return;
        const cr = cv.getBoundingClientRect(); if (!cr.width || !cr.height) return;
        const t = api.memU.uT.value, calm = still(), D0 = 1.2;
        const upp = CORE.unitsPerPx(D0, cam.fov, cr.height);
        cam.getWorldDirection(tmp.f);
        list.forEach((s, el) => {
            if (!s.mesh) return;
            s.o += (s.oT - s.o) * Math.min(1, dt * 9);
            if (s.oT <= 0 && s.o < 0.01) { s.o = 0; s.mesh.visible = false; if (s.liq) liqClass(el, s, false); return; }
            let r = el.getBoundingClientRect();
            if (!r.width) { s.mesh.visible = false; if (s.liq) liqClass(el, s, false); return; }
            if (s.join) { /* Daily Quest + the hunt count line it carries inside a world: one membrane around both, as one box */
                const j = s.join.getBoundingClientRect();
                if (j.height > 0 && j.bottom > r.bottom) r = { left: r.left, top: r.top, width: r.width, height: j.bottom - r.top };
            }
            const n = CORE.ndc(r.left + r.width / 2 - cr.left, r.top + r.height / 2 - cr.top, cr.width, cr.height);
            tmp.v.set(n.x, n.y, 0.5).unproject(cam).sub(cam.position).normalize();
            const k = D0 / Math.max(0.2, tmp.v.dot(tmp.f));
            s.mesh.position.copy(cam.position).addScaledVector(tmp.v, k);
            if (!calm) s.spin += dt * 0.12;
            s.mesh.quaternion.copy(cam.quaternion).multiply(tmp.q.setFromAxisAngle(tmp.y, s.spin));
            /* the mesh sits at depth D0 on the camera axis, so one CSS px is upp world units there; the box already carries the press
               squish and the float */
            const gR = (geo && geo.parameters && geo.parameters.radius) || 1.4;
            const drop = s.opts.shape === 'pill' || s.opts.shape === 'box';
            if (drop) {
                /* a liquid drop over the pill / box: it keeps its long axis on screen (no turn), breathes like Misty's cell, and the
                   box already carries the press, so the drop follows it */
                s.mesh.quaternion.copy(cam.quaternion);
                const a = CORE.dropAxes(r.width, r.height, s.opts.shape), b = CORE.breath(t, s.phase, calm) * upp / gR;
                s.mesh.scale.set(a.ax * b, a.ay * b, Math.min(a.ax, a.ay) * b);
            } else {
                const R = CORE.radiusForBox(r.width, r.height, s.opts.shape, 0) * upp, k1 = (R / gR) * CORE.breath(t, s.phase, calm);
                s.mesh.scale.setScalar(k1);
            }
            s.mat.uniforms.uO.value = s.o;
            s.mesh.visible = true;
            if (s.liq) liquidFrame(el, s, r, dt, calm);
        });
    }
    function liquidFrame(el, s, r, dt, calm) {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = Math.max(1, r.width / 2);
        if (s.lvT == null) { s.lv = null; s.liq.visible = false; liqClass(el, s, false); s.pcx = null; return; }
        s.lv = (s.lv == null || calm) ? s.lvT : s.lv + (s.lvT - s.lv) * Math.min(1, dt * 2.2);
        if (s.pcx == null) { s.pcx = cx; s.pcy = cy; }
        CORE.slosh(s.sl, (cx - s.pcx) / rad, (cy - s.pcy) / rad, dt, calm);
        s.pcx = cx; s.pcy = cy;
        const U = s.lmat.uniforms;
        U.uLv.value = s.lv + s.sl.bob; U.uTilt.value = s.sl.tilt; U.uWave.value = s.lv > 1.2 ? 0 : s.sl.wave; U.uO.value = s.o;
        s.liq.visible = true;
        liqClass(el, s, s.o > 0.05);
    }

    /* ---------- press squish + long press (generic), like Misty's bubble ---------- */
    let press = null, swallow = 0;
    /* BH-023 (bug hunt run 24): fingers on the screen right now. A press or long press is one finger; once a second finger lands it
       is a pinch, so the press ends and no long press fires (pinching Home with a finger resting on the Move bubble opened the Move
       page, on the meals bubble the meal details, on a running fast the start-time editor). */
    const fingers = new Set();
    const lift = e => fingers.delete(e.pointerId);
    function bubbleOf(t) {
        if (!t || !t.closest) return null;
        for (const el of list.keys()) if (el.contains(t)) return el;
        return null;
    }
    function haptic(ms) { if (still()) return; try { W.navigator.vibrate && W.navigator.vibrate(ms); } catch (e) {} }
    function endPress(ok) {
        if (!press) return;
        const el = press.el; clearTimeout(press.timer);
        delete el.dataset.pressed;
        if (ok && !still()) { el.dataset.pop = '1'; setTimeout(() => delete el.dataset.pop, 460); }
        press = null;
    }
    D.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse') { if (e.isPrimary) fingers.clear(); /* the first finger of a new touch: nothing stale counts */ fingers.add(e.pointerId); if (fingers.size > 1) { endPress(false); return; } }
        const el = bubbleOf(e.target); if (!el || (e.button != null && e.button !== 0)) return;
        if (list.get(el).opts.ctl) return; /* home-controls: their own :active press, tap, hold and drag stay exactly as they were */
        endPress(false);
        const s = list.get(el);
        press = { el, id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, timer: 0 };
        el.dataset.pressed = '1';
        if (s && s.sl && !still()) s.sl.kick = 0.05; /* a touch sets the water rippling */
        if (s && s.opts && typeof s.opts.onLong === 'function') {
            press.timer = setTimeout(() => {
                if (!press || press.el !== el || !CORE.isLong(performance.now() - press.t, press.moved)) return;
                let used = false;
                try { used = s.opts.onLong(el) !== false; } catch (err) { console.warn('living bubble long press', err && err.message); }
                if (used) { swallow = performance.now(); haptic(14); endPress(false); }
            }, 540);
        }
    }, { passive: true, capture: true });
    D.addEventListener('pointermove', e => {
        if (!press || e.pointerId !== press.id) return;
        press.moved = Math.max(press.moved, Math.hypot(e.clientX - press.x, e.clientY - press.y));
        if (press.moved > 14) endPress(false);
    }, { passive: true, capture: true });
    D.addEventListener('pointerup', e => { lift(e); if (press && e.pointerId === press.id) endPress(true); }, { passive: true, capture: true });
    D.addEventListener('pointercancel', e => { lift(e); if (press && e.pointerId === press.id) endPress(false); }, { passive: true, capture: true });
    /* the tap that ends a long press must not also do the bubble's tap action, nor press whatever just opened under the finger */
    D.addEventListener('click', e => {
        if (swallow && performance.now() - swallow < 900) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); swallow = 0; }
    }, true);
    D.addEventListener('contextmenu', e => { const el = bubbleOf(e.target); if (el && list.get(el).opts.onLong) e.preventDefault(); }, true);

    /* ---------- registry ---------- */
    let seq = 0;
    function add(el, opts) {
        if (!el || !el.nodeType) return false;
        const prev = list.get(el);
        if (prev) { if (opts) prev.opts = Object.assign(prev.opts, opts); return true; }
        const s = { mesh: null, mat: null, pg: null, pL: 0, phase: (seq * 2.1) % 6.28, spin: 0.9 + seq * 1.7, o: 0, oT: 0, opts: Object.assign({}, opts || {}) };
        seq++;
        list.set(el, s);
        el.classList.add(s.opts.ctl ? 'lb-ctl' : 'lb-bub'); /* a control is not a Home bubble: no float, no squish, no forced circle */
        if (s.opts.kind) el.setAttribute('data-lb', s.opts.kind);
        if (s.opts.shape) el.setAttribute('data-lb-shape', s.opts.shape);
        if (s.opts.shape === 'box') { try { s.rx = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20; } catch (e) { s.rx = 20; } }
        if (api) build(el);
        lastVis = 0;
        return true;
    }
    function remove(el) {
        const s = list.get(el); if (!s) return false;
        if (s.mesh) { group && group.remove(s.mesh); try { s.mat.dispose(); s.lmat && s.lmat.dispose(); } catch (e) {} }
        el.classList.remove('lb-bub', 'lb-ctl', 'lb-live'); el.classList.remove('lb-liq'); el.removeAttribute('data-lb'); el.removeAttribute('data-lb-shape');
        list.delete(el); return true;
    }
    /* Oct 23, 18:03 (Eman: "every bubble needs to look like the bubble of our bubble style"): the bloom orbs (home-blooms-v2.js) wear
       this same membrane. A bloom re-draws its orbs after a tap (Sips, Cup ...); adopt hands the drawn membrane, its fade and its liquid
       over to the new element, so nothing flickers or fades in again. */
    function adopt(from, to, opts) {
        const s = list.get(from);
        if (!to || !to.nodeType) return false;
        if (!s || list.has(to)) return add(to, opts);
        list.delete(from);
        from.classList.remove('lb-bub', 'lb-ctl', 'lb-live', 'lb-liq'); from.removeAttribute('data-lb');
        if (opts) s.opts = Object.assign(s.opts, opts);
        s.fillEl = null; s.liqOn = null; s.bg = null;
        list.set(to, s);
        to.classList.add(s.opts.ctl ? 'lb-ctl' : 'lb-bub');
        if (s.opts.kind) to.setAttribute('data-lb', s.opts.kind);
        lastVis = 0;
        return true;
    }
    /* Home is rebuilt now and then: drop bubbles that left the page, pick up new ones */
    /* Oct 28 2026 (Emmanuel: a long press on the timer shows only what happens in the body after a meal): the hold opens the
       Essenspause screen in its phases-only form (gap-view.js). Changing the last-meal time is on the screen itself now. */
    function fastLong() {
        const G = W.LowiGapView;
        if (G && typeof G.open === 'function') {
            try { if (G.isOpen && G.isOpen() && G.mode && G.mode() === 'phases') return true; } catch (e) {}
            return G.open({ phases: true }) !== false;
        }
        const FE = W.LowiFastEdit;
        if (!FE || typeof FE.open !== 'function') return false;
        try { const st = FE.startOf ? +FE.startOf() : 1; if (!(st > 0) || st > Date.now()) return false; } catch (e) { return false; } /* no fast running: a normal tap */
        return FE.open() !== false;
    }
    function scan() {
        list.forEach((s, el) => { if (!el.isConnected) remove(el); });
        CORE.AUTO.forEach(sel => D.querySelectorAll(sel).forEach(el => {
            if (list.has(el)) return;
            const kind = el.id === 'spFast' ? 'fast' : el.classList.contains('wh-water') ? 'water' : (el.getAttribute('data-hb') || (el.classList.contains('wh-move') ? 'move' : 'bubble'));
            add(el, kind === 'fast' ? { kind, onLong: fastLong } : { kind });
        }));
        CORE.CTL.forEach(c => D.querySelectorAll(c.sel).forEach(el => {
            if (list.has(el)) return;
            add(el, c.shape ? { kind: c.kind, ctl: true, shape: c.shape } : { kind: c.kind, ctl: true });
        }));
        if (!api && W.LowiWorld3D && W.LowiWorld3D.ready) attach3d(W.LowiWorld3D);
    }
    W.addEventListener('lowi:world3d-ready', e => { attach3d((e && e.detail) || W.LowiWorld3D); scan(); });
    W.addEventListener('lowi:home-bubble-added', e => { const d = e && e.detail; if (d && d.el) add(d.el, { kind: d.kind || 'bubble' }); });
    /* only while Home is the page you see (no measuring behind Community) */
    setInterval(() => { if (D.hidden) return; if (homeShown()) scan(); else unlive(); }, 1500);
    D.addEventListener('visibilitychange', () => { if (!D.hidden) scan(); });
    css();
    setTimeout(scan, 400);

    const API = { add, remove, adopt, attach: add, scan, list: () => [...list.keys()], active: () => !!api, core: CORE,
        look: () => [...list.entries()].map(([el, s]) => ({ kind: s.opts.kind || '', visible: !!(s.mesh && s.mesh.visible), opacity: +s.o.toFixed(2), sameUniforms: !!(s.mat && api && s.mat.uniforms.uT === api.memU.uT && s.mat.uniforms.uGlow === api.memU.uGlow && s.mat.uniforms.uIn === api.memU.uIn), sameShader: !!(s.mat && mem && s.mat.vertexShader === mem.material.vertexShader), ctl: !!s.opts.ctl, shape: s.opts.shape || 'round', live: !!(s.opts.ctl && el.classList.contains('lb-live')), drop: !!(s.mesh && s.mesh.geometry !== geo), scale: s.mesh ? +s.mesh.scale.x.toFixed(4) : 0,
            liquid: s.liq ? { on: !!(s.liq.visible && s.mesh.visible), cls: el.classList.contains('lb-liq'), level: s.lv == null ? null : +s.lv.toFixed(3), target: s.lvT == null ? null : +s.lvT.toFixed(3),
                tilt: +s.sl.tilt.toFixed(3), wave: +s.sl.wave.toFixed(3), child: s.liq.parent === s.mesh,
                sameGeometry: s.liq.geometry === s.mesh.geometry, sameVertexShader: s.liq.material.vertexShader === s.mat.vertexShader, sameClock: s.lmat.uniforms.uT === s.mat.uniforms.uT,
                ownTransform: !(s.liq.position.lengthSq() === 0 && s.liq.scale.x === 1 && s.liq.scale.y === 1 && s.liq.scale.z === 1 && s.liq.quaternion.w === 1) } : null })) };
    W.LowiBubbles = API;
    W.LowiLivingBubble = { attach: (el, o) => add(el, o) };
})(typeof window !== 'undefined' ? window : null);
