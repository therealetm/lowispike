/* LOWiSPIKE moving cell ride (Oct 15, 2026). "Joining the adventure of a cell": a journey plays as a camera that travels by
   itself through the vessels, from the hub into a body place, alongside your own glowing cell. Touch and drag (or the gyro)
   to look around 360 at any moment; let go and the view eases back to the path. Pause, speed, Free look, step out.
   The inside reflects how you treat yourself: LowiWorldHealth (world-health-core.js) drives fog, brightness, flow speed,
   microbe buddies and the cell glow, and one honest line says why and what would brighten it.
   Rides inside the ONE shared 3D world (window.LowiWorld3D: THREE/scene/camera/renderer/hub/regions/onFrame): the vessel is a group
   in its hub, and the ride sets the world camera each frame (path pose, then drag/pinch/gyro on top). It never opens a WebGL context.
   World fallback (no WebGL, Save-Data, ?no3d) or prefers-reduced-motion: a 2D ride (panorama strip with the same stops, step by step when motion is reduced).
   API: LowiRide.start(placeId), .stop(), .picker(), .health(); window event 'lowi:ride' {detail:{place}} starts a ride.
   Events out: 'lowi:ride-start', 'lowi:ride-arrive' {place}, 'lowi:ride-end'. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiRide) return;
    const C = () => W.LowiRideCore, WH = () => W.LowiWorldHealth;
    const lang = () => { try { return String(W.LowiLang.get() || 'de').slice(0, 2).toLowerCase(); } catch (e) { return String(D.documentElement.lang || 'de').slice(0, 2).toLowerCase(); } };
    const L = () => { const v = { en: 0, de: 1, es: 2 }[lang()]; return v == null ? 1 : v; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const copy = {
        inside: ['Your inside', 'Dein Inneres', 'Tu interior'],
        ride: ['Ride along', 'Mitfahren', 'Viajar'],
        pick: ['Where should your cell go?', 'Wohin soll deine Zelle reisen?', '¿A dónde viaja tu célula?'],
        pickSub: ['Your cell rides through the vessels. Drag to look around while it moves.', 'Deine Zelle fährt durch die Adern. Zieh zum Umsehen, während sie fährt.', 'Tu célula viaja por los vasos. Arrastra para mirar alrededor mientras avanza.'],
        hint: ['Drag to look around · let go and the ride takes over', 'Zieh zum Umsehen · loslassen und die Fahrt übernimmt', 'Arrastra para mirar · suelta y el viaje sigue'],
        pause: ['Pause', 'Pause', 'Pausa'], play: ['Play', 'Weiter', 'Seguir'],
        free: ['Free look', 'Frei umsehen', 'Mirar libre'], back: ['Ride on', 'Weiterfahren', 'Seguir viaje'],
        gyro: ['Gyro', 'Gyro', 'Giro'], close: ['Step out', 'Aussteigen', 'Salir'], speed: ['Speed', 'Tempo', 'Velocidad'],
        to: ['On the way to', 'Unterwegs zu:', 'Rumbo a'], arrived: ['You made it:', 'Angekommen:', 'Has llegado:'],
        again: ['Ride again', 'Nochmal fahren', 'Otra vez'], other: ['Another place', 'Anderer Ort', 'Otro lugar'],
        next: ['Next', 'Weiter', 'Siguiente'], prev: ['Back', 'Zurück', 'Atrás'], start: ['Start', 'Start', 'Inicio'],
        says: ['says', 'sagt', 'dice']
    };
    const tr = k => (copy[k] || [k])[L()] || (copy[k] || [k])[0];
    const B = () => W.LowiVitalsBridge;
    const state = () => { try { return (B() && B().state()) || {}; } catch (e) { return {}; } };
    function health() { try { return WH().forState(state(), Date.now(), L()); } catch (e) { return { score: 62, tier: 'steady', look: { clarity: .8, fog: .2, bright: .8, flow: .9, microbes: .7, cellGlow: .7, warmth: .7, t: .6 }, line: '' }; } }
    const tierHue = t => t === 'bright' ? '#4ff5d2' : t === 'steady' ? '#8fb4ff' : '#b49cff';
    function css() {
        if (D.getElementById('brCss')) return;
        const l = D.createElement('link'); l.id = 'brCss'; l.rel = 'stylesheet';
        const me = D.querySelector('script[src*="body-ride.js"]');
        l.href = me ? me.getAttribute('src').replace('body-ride.js', 'body-ride.css') : 'body-ride.css';
        D.head.appendChild(l);
    }

    /* ---------- entry on Today: one slim row ---------- */
    let row = null, lastRow = '';
    function mountRow() {
        const home = D.getElementById('spHome'), log = home && home.querySelector('.sp-log');
        if (!log) return null;
        if (!row) { row = D.createElement('button'); row.type = 'button'; row.id = 'brRow'; row.className = 'br-row'; row.dataset.br = 'pick'; }
        const anchor = log.querySelector('#btBar') || log.querySelector('#lsSun');
        if (anchor) { if (anchor.nextSibling !== row) { anchor.after(row); lastRow = ''; } }
        else if (row.parentNode !== log) { const head = log.querySelector(':scope > header'); log.insertBefore(row, head ? head.nextSibling : log.firstChild); lastRow = ''; }
        return row;
    }
    function renderRow() {
        if (!mountRow()) return;
        const h = health(), sig = h.score + h.tier + L() + h.line;
        if (sig === lastRow) return; lastRow = sig;
        row.style.setProperty('--br-h', tierHue(h.tier));
        row.style.setProperty('--br-g', String(h.look.cellGlow));
        row.dataset.tier = h.tier;
        row.setAttribute('aria-label', tr('inside') + ': ' + h.line + ' ' + tr('ride'));
        row.innerHTML = '<span class="br-dot" aria-hidden="true"></span><span class="br-name">' + esc(tr('inside')) + '</span><span class="br-line">' + esc(h.line) + '</span><span class="br-go">' + esc(tr('ride')) + '</span>';
    }
    let rq = 0;
    const schedule = () => { if (rq) return; rq = setTimeout(() => { rq = 0; try { renderRow(); } catch (e) {} }, 120); };

    /* ---------- picker ---------- */
    function picker() {
        const R = W.LowiR2; css();
        const h = health(), P = C().PLACES;
        const items = Object.keys(P).map(id => '<li><button type="button" class="br-place" data-br-go="' + id + '" style="--ph:' + P[id].hue + '"><span class="br-pdot" aria-hidden="true"></span><b>' + esc(P[id].n[L()] || P[id].n[0]) + '</b></button></li>').join('');
        const html = '<div class="br-pick" data-tier="' + h.tier + '" style="--br-h:' + tierHue(h.tier) + '"><h2>' + esc(tr('pick')) + '</h2><p class="br-sub">' + esc(tr('pickSub')) + '</p>' +
            '<div class="br-health"><span class="br-dot" aria-hidden="true"></span><p>' + esc(h.line) + '</p></div><ul class="br-places">' + items + '</ul></div>';
        if (R && R.sheet) R.sheet(html, { cls: 'br-ov-sheet' });
    }

    /* ---------- ride overlay (shared by 3D and 2D) ---------- */
    let ride = null;
    function overlay(id) {
        css();
        const ov = D.createElement('div'); ov.className = 'br-ov'; ov.id = 'brOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
        const P = C().PLACES[id], h = health();
        ov.style.setProperty('--ph', P.hue); ov.style.setProperty('--br-h', tierHue(h.tier)); ov.dataset.tier = h.tier;
        ov.innerHTML = '<div class="br-stage" aria-hidden="true"></div><div class="br-flash" aria-hidden="true"></div>' +
            '<header class="br-top"><div class="br-title"><small>' + esc(tr('to')) + '</small><b>' + esc(P.n[L()] || P.n[0]) + '</b></div>' +
            '<button type="button" class="br-x" data-brc="close" aria-label="' + esc(tr('close')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
            '<p class="br-why"><span class="br-dot" aria-hidden="true"></span>' + esc(h.line) + '</p>' +
            '<p class="br-hint">' + esc(tr('hint')) + '</p><div class="br-cards" aria-live="polite"></div>' +
            '<footer class="br-bar"><div class="br-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><div class="br-ctl">' +
            '<button type="button" data-brc="pause" class="br-b">' + esc(tr('pause')) + '</button>' +
            '<button type="button" data-brc="speed" class="br-b" aria-label="' + esc(tr('speed')) + '">1×</button>' +
            '<button type="button" data-brc="free" class="br-b">' + esc(tr('free')) + '</button>' +
            '<button type="button" data-brc="gyro" class="br-b br-gyro" aria-pressed="false">' + esc(tr('gyro')) + '</button></div></footer>';
        D.body.appendChild(ov);
        D.documentElement.classList.add('br-open');
        return ov;
    }
    function card(r, html, cls, ms) {
        const box = r.ov.querySelector('.br-cards'); if (!box) return;
        const el = D.createElement('div'); el.className = 'br-card ' + (cls || ''); el.innerHTML = html;
        box.innerHTML = ''; box.appendChild(el);
        clearTimeout(r.cardT); if (ms) r.cardT = setTimeout(() => { el.classList.add('br-out'); setTimeout(() => el.remove(), 400); }, ms);
    }
    function onStop(r, s) {
        const P = r.route.place, li = L();
        if (s.kind === 'buddy') { const b = s.buddy; card(r, '<span class="br-bud" style="--bh:' + b.hue + '" aria-hidden="true"></span><div><b>' + esc(b.n) + ' ' + esc(tr('says')) + '</b><p>' + esc(b.l[li] || b.l[0]) + '</p></div>', 'br-c-bud', 4200); if (r.scene && r.scene.wave) r.scene.wave(b); }
        else if (s.kind === 'fact') card(r, '<div><b>' + esc(tr('to')) + ' ' + esc(P.n[li] || P.n[0]) + '</b><p>' + esc(P.f[li] || P.f[0]) + '</p></div>', 'br-c-fact', 4800);
        else if (s.kind === 'arrive') {
            const fl = r.ov.querySelector('.br-flash'); if (fl && !reduced()) { fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); }
            r.ov.querySelector('.br-title small').textContent = tr('arrived');
            card(r, '<div><b>' + esc(P.n[li] || P.n[0]) + '</b><p>' + esc(P.f[li] || P.f[0]) + '</p><p class="br-why2">' + esc(health().line) + '</p><div class="br-cbtn"><button type="button" class="br-b br-pri" data-brc="again">' + esc(tr('again')) + '</button><button type="button" class="br-b" data-brc="other">' + esc(tr('other')) + '</button></div></div>', 'br-c-arrive', 0);
            try { W.dispatchEvent(new CustomEvent('lowi:ride-arrive', { detail: { place: r.route.id } })); } catch (e) {}
        }
    }
    function setFree(r, on) {
        r.free = !!on; r.ov.classList.toggle('br-freeon', r.free);
        const b = r.ov.querySelector('[data-brc="free"]'); if (b) b.textContent = r.free ? tr('back') : tr('free');
    }
    function setPaused(r, on) {
        r.paused = !!on; const b = r.ov.querySelector('[data-brc="pause"]'); if (b) b.textContent = r.paused ? tr('play') : tr('pause');
    }
    function progress(r) {
        const p = r.ov.querySelector('.br-prog'); if (!p) return;
        const v = Math.round(r.u * 100); p.firstChild.style.transform = 'scaleX(' + r.u.toFixed(3) + ')';
        if (+p.getAttribute('aria-valuenow') !== v) p.setAttribute('aria-valuenow', String(v));
    }

    /* ---------- input: drag, pinch, gyro ---------- */
    function bindLook(r, el) {
        const pts = new Map(); let pinch0 = 0, fov0 = 70;
        el.addEventListener('pointerdown', e => { el.setPointerCapture && el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); r.holding = true; r.ov.classList.add('br-touched');
            if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = r.fov; } });
        el.addEventListener('pointermove', e => {
            const p = pts.get(e.pointerId); if (!p) return;
            if (pts.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) r.fov = Math.max(42, Math.min(92, fov0 * pinch0 / Math.max(20, d))); return; }
            const k = 0.0052 * (r.fov / 70); r.look.yaw += (e.clientX - p.x) * k; r.look.pitch += (e.clientY - p.y) * k; p.x = e.clientX; p.y = e.clientY;
        });
        const up = e => { pts.delete(e.pointerId); if (!pts.size) r.holding = false; if (pts.size < 2) pinch0 = 0; };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, up));
        el.addEventListener('wheel', e => { e.preventDefault(); r.fov = Math.max(42, Math.min(92, r.fov + e.deltaY * 0.03)); }, { passive: false });
    }
    function gyro(r) {
        const btn = r.ov.querySelector('[data-brc="gyro"]');
        if (r.gyroOn) { W.removeEventListener('deviceorientation', r.onOri); r.gyroOn = false; r.gyro = { yaw: 0, pitch: 0 }; btn.setAttribute('aria-pressed', 'false'); return; }
        const go = () => { r.g0 = null; r.onOri = e => { if (e.alpha == null) return; if (!r.g0) r.g0 = { a: e.alpha, b: e.beta }; let da = e.alpha - r.g0.a; if (da > 180) da -= 360; if (da < -180) da += 360; r.gyro = { yaw: da * Math.PI / 180, pitch: -(e.beta - r.g0.b) * Math.PI / 180 }; };
            W.addEventListener('deviceorientation', r.onOri); r.gyroOn = true; btn.setAttribute('aria-pressed', 'true'); };
        const DOE = W.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === 'function') DOE.requestPermission().then(s => { if (s === 'granted') go(); }).catch(() => {}); else if (DOE) go();
    }

    /* ---------- 3D: rides inside the ONE shared world (window.LowiWorld3D). Never a second WebGL context. ---------- */
    const W3 = () => { const w = W.LowiWorld3D; return w && w.state !== 'fallback' && typeof w.open === 'function' ? w : null; };
    const W3ok = () => { const w = W3(); return !!(w && w.ready && w.scene && w.camera && w.renderer && w.hub && w.THREE); };
    /* the world's regions as plain points; a ride place the world has no region for sits at the regions' mean radius */
    function layout() {
        const w = W.LowiWorld3D, P = C().PLACES; if (!w || !w.regions || !w.regions.length) return null;
        const v = p => Array.isArray(p) ? p.slice(0, 3) : [p.x, p.y, p.z];
        const regions = w.regions.map(x => ({ id: x.id, pos: v(x.pos), hue: x.hue }));
        const rad = regions.reduce((a, x) => a + Math.hypot(...x.pos), 0) / regions.length;
        Object.keys(P).forEach(id => { if (!regions.some(x => C().placeId(x.id) === id)) { const p = P[id].pos, l = Math.hypot(...p) || 1; regions.push({ id, pos: p.map(c => c * rad / l), hue: P[id].hue }); } });
        /* whole-world regions (LowiWorldRegions): inside the world you ride from the region you are in to the next one */
        let hub; try { const R = W.LowiWorldRegions, cur = R && R.current && w.isOpen && w.isOpen() ? R.current() : 'hub'; const at = cur && cur !== 'hub' && regions.find(x => C().placeId(x.id) === C().placeId(cur)); if (at) hub = { pos: at.pos.map(c => c * 0.92) }; } catch (e) {}
        return { regions, hub, vesselPath: typeof w.vesselPath === 'function' ? w.vesselPath : undefined };
    }
    function glowTex(THREE, inner, outer) {
        const c = D.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace || t.colorSpace; return t;
    }
    function buildScene(THREE, r) {
        const shared = W.LowiWorld3D, phone = Math.min(innerWidth, innerHeight) < 600;
        const renderer = shared.renderer, scene = shared.scene, camera = shared.camera, look = r.health.look;
        /* ride geometry is authored at ~160 units per vessel; one group scales it into the world */
        const S = Math.max(0.005, (r.route.curve.length || 160) / 160), root = new THREE.Group(); root.name = 'lowi-ride'; root.scale.setScalar(S); shared.hub.add(root);
        const keep = { near: camera.near, fov: camera.fov, fog: scene.fog ? scene.fog.density : 0 };
        camera.near = Math.min(camera.near, 0.6 * S); camera.updateProjectionMatrix();
        const navy = new THREE.Color('#0b102a'), haze = new THREE.Color('#2a2448'), place = new THREE.Color(r.route.place.hue);
        const bg = navy.clone().lerp(haze, look.fog * 0.8), fogC = bg.clone().lerp(place, 0.08), fogD = (0.006 + look.fog * 0.03) / S;
        root.add(new THREE.AmbientLight(0xffffff, 0.2 + 0.4 * look.bright));
        root.add(new THREE.HemisphereLight(0xa8e0ff, 0x1d0b4f, 0.25 + 0.45 * look.bright));
        const head = new THREE.PointLight(0xffd7e6, (1.2 + 1.6 * look.bright) * Math.pow(S, 1.6), 90 * S, 1.6); root.add(head);
        /* vessel wall */
        const pts = r.route.points.map(p => new THREE.Vector3(p[0] / S, p[1] / S, p[2] / S));
        const cv = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
        const RAD = 9, segs = phone ? 220 : 340;
        const tube = new THREE.TubeGeometry(cv, segs, RAD, phone ? 14 : 20, false);
        const cols = [], pos = tube.attributes.position, wallA = new THREE.Color('#7a1c3c').lerp(haze, look.fog * 0.6), n = pos.count, ring = (phone ? 14 : 20) + 1;
        for (let i = 0; i < n; i++) { const t = Math.floor(i / ring) / segs, c = wallA.clone().lerp(place, Math.max(0, (t - 0.55) / 0.45) * 0.75); const v = 0.75 + 0.25 * Math.sin(i * 1.7) * Math.sin(i * 0.31); cols.push(c.r * v, c.g * v, c.b * v); }
        tube.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        const wallM = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.BackSide, emissive: new THREE.Color('#2a0818').lerp(place, 0.1), emissiveIntensity: 0.4 + 0.6 * look.bright });
        root.add(new THREE.Mesh(tube, wallM));
        /* red blood cells flowing with the stream, instanced */
        const NC = phone ? 130 : 240, rbcG = new THREE.SphereGeometry(1, 14, 8); rbcG.scale(1, 0.36, 1);
        const rbcM = new THREE.MeshLambertMaterial({ color: new THREE.Color('#e0384f').lerp(haze, look.fog * 0.35), emissive: '#4a0814', emissiveIntensity: 0.25 + 0.5 * look.bright });
        const rbc = new THREE.InstancedMesh(rbcG, rbcM, NC); rbc.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(rbc);
        const rnd = C().rng(C().hash(r.route.id + ':cells'));
        const cells = Array.from({ length: NC }, () => ({ u: rnd(), a: rnd() * 6.283, rr: 1.5 + rnd() * (RAD - 3), sp: 0.6 + rnd() * 0.8, s: 0.9 + rnd() * 0.7, rx: rnd() * 6.283, ry: rnd() * 6.283, w: (rnd() - .5) * 2 }));
        /* microbe buddies: how many and how lively depends on world health */
        const NB = Math.round((phone ? 18 : 30) * look.microbes), budG = new THREE.IcosahedronGeometry(0.7, 1);
        const budM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 + 0.4 * look.bright });
        const bud = new THREE.InstancedMesh(budG, budM, Math.max(1, NB)); bud.count = NB; bud.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(bud);
        const BC = C().BUDDIES, buds = Array.from({ length: NB }, (_, i) => ({ u: rnd(), a: rnd() * 6.283, rr: 2 + rnd() * (RAD - 4), ph: rnd() * 6.283, c: new THREE.Color(BC[i % BC.length].hue) }));
        buds.forEach((b, i) => bud.setColorAt(i, b.c)); if (bud.instanceColor) bud.instanceColor.needsUpdate = true;
        /* floating sparkle particles */
        const NP = phone ? 260 : 520, pp = new Float32Array(NP * 3), pu = [];
        for (let i = 0; i < NP; i++) { pu.push({ u: rnd(), a: rnd() * 6.283, rr: rnd() * (RAD - 1) }); }
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
        const pm = new THREE.PointsMaterial({ size: 0.35 * S, color: new THREE.Color('#ffd7f0').lerp(place, 0.4), transparent: true, opacity: 0.35 + 0.5 * look.clarity, depthWrite: false, blending: THREE.AdditiveBlending });
        root.add(new THREE.Points(pg, pm));
        /* your cell: translucent cyan-magenta membrane, magenta nucleus, amber mitochondria, glow by health */
        const cell = new THREE.Group();
        cell.add(new THREE.Mesh(new THREE.SphereGeometry(1.6, 28, 20), new THREE.MeshPhongMaterial({ color: '#6ff3ff', emissive: '#b14dff', emissiveIntensity: 0.25 + 0.55 * look.cellGlow, transparent: true, opacity: 0.38, shininess: 90, depthWrite: false })));
        const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3fb4').multiplyScalar(0.55 + 0.45 * look.cellGlow) })); cell.add(nuc);
        const mitoM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb340').multiplyScalar(0.5 + 0.5 * look.cellGlow) }), mitoG = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.12, 0.34, 4, 8) : new THREE.SphereGeometry(0.2, 8, 6);
        for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(mitoG, mitoM); const a = i * 1.05; m.position.set(Math.cos(a) * 1.05, Math.sin(a * 1.7) * 0.5, Math.sin(a) * 1.05); m.rotation.set(a, a * 0.7, 0); cell.add(m); }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(THREE, 'rgba(255,255,255,1)', 'rgba(120,240,255,.55)'), color: '#9ff7ff', transparent: true, opacity: 0.35 + 0.6 * look.cellGlow, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.setScalar(4 + 4 * look.cellGlow); cell.add(glow); root.add(cell);
        /* the place at the end: lazy, built once the ride is past 55% */
        let chamber = null;
        function buildChamber() {
            const end = pts[pts.length - 1], g = new THREE.Group(); g.position.copy(end);
            g.add(new THREE.Mesh(new THREE.SphereGeometry(34, 32, 20), new THREE.MeshLambertMaterial({ color: place.clone().multiplyScalar(0.35).lerp(haze, look.fog * 0.5), emissive: place, emissiveIntensity: 0.12 + 0.3 * look.bright, side: THREE.BackSide })));
            const NV = phone ? 90 : 160, vg = new THREE.ConeGeometry(1.1, 6, 7), vm = new THREE.MeshLambertMaterial({ color: place, emissive: place, emissiveIntensity: 0.25 + 0.45 * look.bright }), vi = new THREE.InstancedMesh(vg, vm, NV), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
            for (let i = 0; i < NV; i++) { const d = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(); q.setFromUnitVectors(up, d.clone().negate()); const s = 0.6 + rnd() * 0.9; m4.compose(d.multiplyScalar(31), q, new THREE.Vector3(s, s * (0.7 + rnd()), s)); vi.setMatrixAt(i, m4); }
            g.add(vi); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(THREE, 'rgba(255,255,255,.9)', r.route.place.hue), transparent: true, opacity: 0.25 + 0.5 * look.bright, depthWrite: false, blending: THREE.AdditiveBlending }));
            gl.scale.setScalar(26); g.add(gl); root.add(g); return g;
        }
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpB = new THREE.Vector3(), worldUp = new THREE.Vector3(0, 1, 0);
        const frames = cv.computeFrenetFrames(400, false);
        function frameAt(u, out) { const i = Math.min(399, Math.max(0, Math.round(u * 399))); out.n = frames.normals[i]; out.b = frames.binormals[i]; out.t = frames.tangents[i]; return out; }
        const fr = {};
        function onTube(u, a, rr, out) { cv.getPointAt(u, out); frameAt(u, fr); tmpN.copy(fr.n).multiplyScalar(Math.cos(a) * rr); tmpB.copy(fr.b).multiplyScalar(Math.sin(a) * rr); return out.add(tmpN).add(tmpB); }
        const camQ = new THREE.Quaternion(), lookQ = new THREE.Quaternion(), baseM = new THREE.Matrix4(), ahead = new THREE.Vector3(), here = new THREE.Vector3(), upS = new THREE.Vector3(0, 1, 0);
        let t = 0, waveT = 0;
        const camW = new THREE.Vector3(), hubQ = new THREE.Quaternion();
        const api = {
            renderer, scene, camera, shared: true,
            resize() {},
            wave() { waveT = 1.2; },
            frame() {},
            /* runs inside the world's own frame (after its camera rig, before its render): our pose wins, drag/pinch/gyro on top */
            step(dt) {
                t += dt; const flow = look.flow, u = Math.min(0.999, r.u);
                if (!chamber && u > 0.55) chamber = buildChamber();
                /* camera on the path, looking ahead, smooth up vector so the view never flips */
                cv.getPointAt(u, here); cv.getPointAt(Math.min(1, u + 0.02), ahead);
                if (u > 0.985) ahead.copy(here).add(v3.copy(cv.getTangentAt(0.999)));
                upS.lerp(worldUp, 0.02).normalize();
                baseM.lookAt(here, ahead, upS); camQ.setFromRotationMatrix(baseM);
                const yaw = r.look.yaw + r.gyro.yaw, pitch = Math.max(-1.45, Math.min(1.45, r.look.pitch + r.gyro.pitch));
                lookQ.setFromEuler(e3.set(pitch, yaw, 0, 'YXZ')); root.getWorldQuaternion(hubQ); camera.quaternion.copy(hubQ).multiply(camQ).multiply(lookQ); camera.position.copy(root.localToWorld(camW.copy(here))); head.position.copy(here);
                if (scene.fog) { scene.fog.density = fogD; scene.fog.color.copy(fogC); } if (scene.background && scene.background.isColor) scene.background.copy(bg);
                if (Math.abs(camera.fov - r.fov) > 0.05) { camera.fov += (r.fov - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }
                /* your cell rides just ahead and a little to the side */
                const cu = Math.min(0.999, u + 0.012 + 0.002 * Math.sin(t * 0.7));
                onTube(cu, 2.2 + 0.25 * Math.sin(t * 0.5), 2.6, cell.position); cell.rotation.y += dt * 0.4; cell.rotation.x = Math.sin(t * 0.6) * 0.2;
                const pulse = 1 + 0.04 * Math.sin(t * (1.5 + flow)) + (waveT > 0 ? 0.12 * Math.sin(waveT * 12) : 0); cell.scale.setScalar(pulse); waveT = Math.max(0, waveT - dt);
                glow.material.opacity = (0.35 + 0.6 * look.cellGlow) * (0.85 + 0.15 * Math.sin(t * 2));
                /* blood cells: faster, smoother stream on healthier days */
                const L = cv.getLength(), du = dt * 7 * flow / L;
                for (let i = 0; i < NC; i++) {
                    const c = cells[i]; c.u += du * c.sp; if (c.u > 1) c.u -= 1;
                    onTube(c.u, c.a + Math.sin(t * 0.3 + c.w) * 0.2, c.rr, v3);
                    e3.set(c.rx + t * 0.6 * c.w * flow, c.ry + t * 0.4 * flow, 0); q.setFromEuler(e3); sc.setScalar(c.s); m4.compose(v3, q, sc); rbc.setMatrixAt(i, m4);
                }
                rbc.instanceMatrix.needsUpdate = true;
                for (let i = 0; i < NB; i++) {
                    const b = buds[i]; b.u += du * 0.5; if (b.u > 1) b.u -= 1;
                    onTube(b.u, b.a + t * 0.5 * flow, b.rr + Math.sin(t * 2 + b.ph) * 0.6, v3);
                    const s = 0.8 + 0.35 * Math.sin(t * 3 * look.microbes + b.ph); q.identity(); sc.setScalar(s); m4.compose(v3, q, sc); bud.setMatrixAt(i, m4);
                }
                if (NB) bud.instanceMatrix.needsUpdate = true;
                for (let i = 0; i < NP; i++) { const p = pu[i]; p.u += du * 0.3; if (p.u > 1) p.u -= 1; onTube(p.u, p.a, p.rr, v3); pp[i * 3] = v3.x; pp[i * 3 + 1] = v3.y; pp[i * 3 + 2] = v3.z; }
                pg.attributes.position.needsUpdate = true;
            },
            dispose() {
                off(); shared.hub.remove(root);
                root.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); });
                camera.near = keep.near; camera.fov = keep.fov; camera.updateProjectionMatrix(); if (scene.fog) scene.fog.density = keep.fog;
            }
        };
        const off = shared.onFrame(dt => { if (ride === r) { try { api.step(Math.min(0.05, dt > 1 ? dt / 1000 : dt)); } catch (e) { console.warn('ride frame', e); } } });
        return api;
    }
    /* ---------- 2D ride: no WebGL, or reduced motion ---------- */
    function build2D(r) {
        const stage = r.ov.querySelector('.br-stage'), look = r.health.look, auto = !reduced();
        r.ov.classList.add('br-2d'); stage.setAttribute('aria-hidden', 'false');
        const st = r.route.stops, P = r.route.place, li = L();
        stage.style.setProperty('--clarity', String(look.clarity)); stage.style.setProperty('--glow', String(look.cellGlow)); stage.style.setProperty('--flow', String(look.flow));
        stage.innerHTML = '<div class="br2-strip"><div class="br2-vessel"></div>' + st.map((s, i) => '<div class="br2-stop br2-' + s.kind + '" style="left:' + (8 + s.u * 84) + '%"' + (s.buddy ? ' data-bud="' + esc(s.buddy.n) + '"' : '') + '>' + (s.kind === 'arrive' ? '<span class="br2-place"></span>' : s.kind === 'buddy' ? '<span class="br-bud" style="--bh:' + s.buddy.hue + '"></span>' : '<span class="br2-fact"></span>') + '</div>').join('') + '</div><div class="br2-cell" aria-hidden="true"><i></i></div><div class="br2-haze"></div>' +
            (auto ? '' : '<div class="br2-steps"><button type="button" class="br-b" data-brc="prev">' + esc(tr('prev')) + '</button><button type="button" class="br-b br-pri" data-brc="next">' + esc(tr('next')) + '</button></div>');
        r.stepI = -1;
        r.step = dir => { r.stepI = Math.max(0, Math.min(st.length - 1, r.stepI + dir)); r.u = st[r.stepI].u; onStop(r, st[r.stepI]); progress(r); place2D(r); };
        if (!auto) { r.paused = true; r.ov.querySelector('.br-ctl').classList.add('br-hide'); }
        bindLook(r, stage);
        return { frame() { place2D(r); }, resize() {}, dispose() { stage.innerHTML = ''; } };
    }
    function place2D(r) {
        const strip = r.ov.querySelector('.br2-strip'); if (!strip) return;
        const px = -(r.u * 84 + 8) + 50 + (r.look.yaw + r.gyro.yaw) * 18;
        strip.style.transform = 'translate3d(' + px.toFixed(2) + '%,' + ((r.look.pitch + r.gyro.pitch) * 30).toFixed(1) + 'px,0)';
    }

    /* ---------- loop ---------- */
    function loop(r) {
        if (ride !== r || r.raf) return;
        const tick = now => {
            r.raf = 0; if (ride !== r || D.hidden) return;
            const dt = r.last ? Math.min(0.05, (now - r.last) / 1000) : 1 / 60; r.last = now;
            const u0 = r.u;
            if (!r.free && !r.ended) r.u = C().advance(r.u, dt, r.dur / r.speed, r.paused);
            C().passed(r.route.stops, u0, r.u).forEach(s => onStop(r, s));
            if (r.u >= 1 && !r.ended) { r.ended = true; setFree(r, true); }
            Object.assign(r.look, C().look(r.look, dt, r.holding, r.free));
            try { r.scene && r.scene.frame(dt); } catch (e) { console.warn('ride frame', e); }
            progress(r);
            r.raf = requestAnimationFrame(tick);
        };
        r.raf = requestAnimationFrame(tick);
    }
    function onVis() { if (!ride) return; if (D.hidden) { cancelAnimationFrame(ride.raf); ride.raf = 0; } else { ride.last = 0; loop(ride); } }
    function onResize() { if (ride && ride.scene) ride.scene.resize(); }
    function onKey(e) { if (!ride) return; if (e.key === 'Escape') { e.preventDefault(); stop(); } else if (e.key === ' ' && e.target === D.body) { e.preventDefault(); setPaused(ride, !ride.paused); } }

    function start(id, opts) {
        opts = opts || {};
        if (!C()) return null;
        if (ride) stop(true);
        try { W.LowiR2 && W.LowiR2.top && W.LowiR2.top() && W.LowiR2.closeTop && W.LowiR2.closeTop(); } catch (e) {}
        const pid = C().placeId(id), h = health();
        const world = W.LowiWorld3D || null;
        const r = { id: pid, route: C().route(pid, layout() || {}), health: h, u: 0, speed: 1, paused: false, free: false, ended: false, holding: false, fov: 70, look: { yaw: 0, pitch: 0, idle: 0 }, gyro: { yaw: 0, pitch: 0 }, raf: 0, last: 0 };
        r.dur = C().duration(h.look.flow, 1);
        r.ov = overlay(pid); ride = r;
        r.ov.addEventListener('click', e => {
            const b = e.target.closest('[data-brc]'); if (!b) return; const a = b.dataset.brc;
            if (a === 'close') stop(); else if (a === 'pause') setPaused(r, !r.paused);
            else if (a === 'speed') { r.speed = C().nextSpeed(r.speed); b.textContent = String(r.speed).replace('.', lang() === 'en' ? '.' : ',') + '×'; }
            else if (a === 'free') { if (r.ended && r.free) { r.u = 0; r.ended = false; r.ov.querySelector('.br-title small').textContent = tr('to'); } setFree(r, !r.free); }
            else if (a === 'gyro') gyro(r); else if (a === 'again') start(pid); else if (a === 'other') { stop(); picker(); }
            else if (a === 'next' && r.step) r.step(1); else if (a === 'prev' && r.step) r.step(-1);
        });
        const go2D = () => { if (ride !== r) return; r.scene = build2D(r); r.mode = '2d'; r.ov.dataset.mode = '2d'; if (r.step && r.paused) r.step(1); loop(r); };
        const w3 = W3();
        if (opts.mode === '2d' || reduced() || !w3) go2D();
        else {
            r.ov.classList.add('br-loading');
            r.openedWorld = !(w3.isOpen && w3.isOpen());
            if (w3.open() === false) { r.ov.classList.remove('br-loading'); go2D(); }
            else {
                const t0 = Date.now();
                const wait = () => {
                    if (ride !== r) return;
                    if (W3ok()) {
                        try { const lay = layout(); if (lay) r.route = C().route(pid, lay); r.scene = buildScene(W.LowiWorld3D.THREE, r); }
                        catch (e) { console.warn('ride 3D unavailable, 2D ride', e); r.scene = null; }
                        r.ov.classList.remove('br-loading');
                        if (!r.scene) { go2D(); return; }
                        r.mode = '3d'; r.ov.dataset.mode = '3d'; bindLook(r, r.ov.querySelector('.br-stage')); loop(r); return;
                    }
                    if (!W3() || Date.now() - t0 > 12000) { r.ov.classList.remove('br-loading'); go2D(); return; }
                    setTimeout(wait, 80);
                };
                wait();
            }
        }
        setTimeout(() => { if (r.ov) r.ov.classList.add('br-hinted'); }, 4200);
        D.addEventListener('visibilitychange', onVis); W.addEventListener('resize', onResize); D.addEventListener('keydown', onKey);
        try { history.pushState({ brRide: 1 }, ''); r.pushed = true; } catch (e) {}
        try { W.dispatchEvent(new CustomEvent('lowi:ride-start', { detail: { place: pid, score: h.score } })); } catch (e) {}
        setTimeout(() => { const x = r.ov && r.ov.querySelector('.br-x'); if (x) x.focus({ preventScroll: true }); }, 60);
        return r;
    }
    function stop(silent) {
        const r = ride; if (!r) return; ride = null;
        cancelAnimationFrame(r.raf); clearTimeout(r.cardT);
        if (r.gyroOn) W.removeEventListener('deviceorientation', r.onOri);
        try { r.scene && r.scene.dispose(); } catch (e) {}
        if (r.openedWorld) { try { W.LowiWorld3D && W.LowiWorld3D.isOpen() && W.LowiWorld3D.close(); } catch (e) {} }
        r.ov.remove(); D.documentElement.classList.remove('br-open');
        D.removeEventListener('visibilitychange', onVis); W.removeEventListener('resize', onResize); D.removeEventListener('keydown', onKey);
        if (r.pushed && !silent && history.state && history.state.brRide) { r.pushed = false; try { history.back(); } catch (e) {} }
        try { W.dispatchEvent(new CustomEvent('lowi:ride-end', { detail: { place: r.id } })); } catch (e) {}
        schedule();
    }
    W.addEventListener('popstate', () => { if (ride) { ride.pushed = false; stop(true); } });

    D.addEventListener('click', e => {
        const go = e.target.closest('[data-br-go]'); if (go) { e.preventDefault(); start(go.dataset.brGo); return; }
        const p = e.target.closest('[data-br="pick"]'); if (p) { e.preventDefault(); picker(); }
    });
    W.addEventListener('lowi:ride', e => { try { start(e.detail && (e.detail.place || e.detail.id)); } catch (x) {} });
    ['lowi:reward', 'lowi:meal-logged', 'lowi:lang', 'lowi:state', 'storage', 'focus'].forEach(n => W.addEventListener(n, schedule));
    D.addEventListener('visibilitychange', schedule);
    W.LowiRide = { start, stop, picker, health, get active() { return ride ? { place: ride.id, u: ride.u, mode: ride.mode, paused: ride.paused, free: ride.free, speed: ride.speed, look: Object.assign({}, ride.look), score: ride.health.score, tier: ride.health.tier } : null; } };
    /* world health in free look too: the shared world's fog and depth follow LowiWorldHealth (rides set their own) */
    let hTs = 0, hLook = null, fogBase = 0, fogSet = -1;
    function hookWorld() {
        const w = W.LowiWorld3D; if (!w || w.__brHealth || typeof w.onFrame !== 'function') return; w.__brHealth = 1;
        w.onFrame(() => {
            if (ride || !w.scene || !(w.isOpen && w.isOpen())) return;
            const now = Date.now(); if (!hLook || now - hTs > 5000) { hLook = health().look; hTs = now; }
            const f = w.scene.fog, bg = w.scene.background;
            if (f) { if (f.density !== fogSet) fogBase = f.density; f.density = fogSet = fogBase * (0.7 + 0.9 * hLook.fog); }
            if (bg && bg.isColor) { bg.multiplyScalar(0.8 + 0.25 * hLook.bright); if (f) f.color.copy(bg); }
        });
    }
    function boot() {
        css(); schedule(); hookWorld(); W.addEventListener('lowi:world3d-ready', hookWorld);
        const mo = new MutationObserver(() => { if (row && !row.isConnected) { lastRow = ''; schedule(); } else if (!row) schedule(); });
        const home = D.getElementById('spHome') || D.body; mo.observe(home, { childList: true, subtree: true });
        setInterval(schedule, 60000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
