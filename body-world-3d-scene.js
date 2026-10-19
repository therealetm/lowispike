/* LOWiSPIKE real 3D body world: the WebGL scene (three.js, vendored). Loaded lazily by body-world-3d.js.
   Look: VISUAL-MASTER.md (navy fog depth from Cellscape VR, friendly cell from "What is a Cell?", glow language from Kurzgesagt).
   The user's see-through cell floats in the middle of a 360 bloodstream: flowing red cells (instanced), plasma particles,
   light shafts, exponential fog. Orbit with drag, pinch/wheel zoom, gyro offsets, glides to body places. */
export function createWorld(THREE, canvas, opts) {
    opts = opts || {};
    const small = !!opts.small, places = opts.places || [];
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, alpha: false, powerPreference: 'high-performance', stencil: false });
    let paintNow = false; /* the canvas was just resized (picture wiped): draw it in this same refresh */
    let dprCap = opts.dprCap || 2, dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    /* sharpness floor + ceiling for the frame-time watcher in frame(): never below 1.5x on a retina screen, back up to the cap when smooth */
    const dprTop = dpr, dprFloor = Math.min(dprTop, (window.devicePixelRatio || 1) >= 2 ? 1.5 : 1);
    let hiFor = 0, dprDropAt = -1e9; /* no climbing back for 20 s after a step down: no flip-flopping sharpness */
    renderer.setPixelRatio(dpr);
    const scene = new THREE.Scene();
    const PAL = {
        dark: { bg: '#121c33', wall: '#2a3a5a', wallHi: '#6a82ab', hemiSky: '#8fb4e6', hemiGround: '#17223b', key: '#c3cfe6', fog: 0.034, shaft: 0.11, part: 0.75 },
        light: { bg: '#7f94b4', wall: '#9aacc8', wallHi: '#dbe4f0', hemiSky: '#eef3fa', hemiGround: '#5f7393', key: '#ffffff', fog: 0.030, shaft: 0.16, part: 0.55 }
    };
    let theme = 'dark';
    scene.background = new THREE.Color(PAL.dark.bg);
    scene.fog = new THREE.FogExp2(PAL.dark.bg, PAL.dark.fog);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 120);

    /* ---------- textures made on the fly (no image downloads) ---------- */
    function radialTex(stops, size) {
        size = size || 128;
        const c = document.createElement('canvas'); c.width = c.height = size;
        const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        stops.forEach(s => gr.addColorStop(s[0], s[1]));
        g.fillStyle = gr; g.fillRect(0, 0, size, size);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
    const dotTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']], 64);
    function wallTex() {
        const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
        const g = c.getContext('2d'); g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, s, s);
        let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 90; i++) {
            const x = rnd() * s, y = rnd() * s, r = 8 + rnd() * 34, a = 0.08 + rnd() * 0.22, light = rnd() > 0.5;
            for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
                const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
                gr.addColorStop(0, light ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(128,128,128,0)');
                g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
            }
        }
        g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 2;
        for (let i = 0; i < 9; i++) { g.beginPath(); const y = rnd() * s; g.moveTo(0, y); for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x / 30 + i) * 6); g.stroke(); }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    function shaftTex() {
        const c = document.createElement('canvas'); c.width = 4; c.height = 128;
        const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
        gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }

    /* ---------- lights ---------- */
    const hemi = new THREE.HemisphereLight(PAL.dark.hemiSky, PAL.dark.hemiGround, 0.85); scene.add(hemi);
    const key = new THREE.DirectionalLight(PAL.dark.key, 1.25); key.position.set(2, 10, 4); scene.add(key);
    const rim = new THREE.PointLight('#8aa7d6', 6, 9, 1.6); rim.position.set(-1.5, 0.6, -2.6); scene.add(rim);

    /* ---------- the vessel: 360 bloodstream around the viewer ---------- */
    const VR = 15, LEN = 90;
    const wallMat = new THREE.MeshStandardMaterial({ color: PAL.dark.wall, map: wallTex(), roughness: 0.7, metalness: 0.2, side: THREE.BackSide, emissive: PAL.dark.wallHi, emissiveIntensity: 0.12 });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(VR, VR, LEN * 2, small ? 28 : 40, 1, true), wallMat);
    wall.rotation.z = Math.PI / 2; scene.add(wall);

    /* red blood cells: biconcave discs, instanced, flowing along +x */
    const prof = [];
    for (let i = 0; i <= 12; i++) { const r = i / 12 * 0.42; const h = 0.07 + 0.11 * Math.pow(Math.sin(Math.PI * Math.min(1, r / 0.42) * 0.92), 1.4) * (r / 0.42); prof.push(new THREE.Vector2(r, h)); }
    for (let i = 12; i >= 0; i--) { const p = prof[i]; prof.push(new THREE.Vector2(p.x, -p.y)); }
    const rbcGeo = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(Math.max(0.0001, p.x), p.y)), small ? 14 : 20);
    rbcGeo.computeVertexNormals();
    const rbcMat = new THREE.MeshStandardMaterial({ color: '#9fb2d2', roughness: 0.32, metalness: 0.35, emissive: '#2c4675', emissiveIntensity: 0.35 }); /* Oct 16: silvery blue, the brand colour (no red world) */
    const RBC = small ? 150 : 230;
    const rbc = new THREE.InstancedMesh(rbcGeo, rbcMat, RBC);
    rbc.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const rb = [];
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < RBC; i++) {
        let y, z, rr;
        do { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (VR - 1.2); y = Math.cos(a) * d; z = Math.sin(a) * d; rr = Math.hypot(y, z); } while (rr < 2.6 && rnd() < 0.85);
        rb.push({ x: (rnd() * 2 - 1) * 40, y, z, s: 0.75 + rnd() * 0.5, v: 0.55 + rnd() * 0.5 + (1 - rr / VR) * 0.6, ax: rnd() * 6, ay: rnd() * 6, w: (rnd() - 0.5) * 0.8 });
    }
    scene.add(rbc);
    rbc.name = 'lowi-rbc'; rbc.userData.cells = rb; /* misty-bump.js reads the cells' flow (true 3D contact with Misty) and knocks a bumped cell into a new lane */
    /* a few white cells and platelets */
    const wbcMat = new THREE.MeshStandardMaterial({ color: '#e8eef8', roughness: 0.7, emissive: '#7d8fb8', emissiveIntensity: 0.25 });
    const wbcs = [];
    for (let i = 0; i < (small ? 3 : 5); i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), wbcMat); const a = rnd() * 6.28, d = 4 + rnd() * 8; m.position.set((rnd() * 2 - 1) * 40, Math.cos(a) * d, Math.sin(a) * d); m.userData.v = 0.35 + rnd() * 0.2; scene.add(m); wbcs.push(m); }
    const platMat = new THREE.MeshStandardMaterial({ color: '#d9e3f1', roughness: 0.6, emissive: '#7f97bf', emissiveIntensity: 0.3 });
    const PLT = small ? 30 : 50, plat = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), platMat, PLT), pl = [];
    plat.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < PLT; i++) { const a = rnd() * 6.28, d = 2 + rnd() * (VR - 3); pl.push({ x: (rnd() * 2 - 1) * 40, y: Math.cos(a) * d, z: Math.sin(a) * d * 0.6 + Math.sin(a) * d * 0.4, v: 0.7 + rnd() * 0.6 }); }
    scene.add(plat);

    /* plasma particles: one Points draw call */
    const PN = small ? 380 : 650, pPos = new Float32Array(PN * 3), pVel = new Float32Array(PN);
    for (let i = 0; i < PN; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * (VR - 0.5); pPos[i * 3] = (rnd() * 2 - 1) * 40; pPos[i * 3 + 1] = Math.cos(a) * d; pPos[i * 3 + 2] = Math.sin(a) * d; pVel[i] = 0.8 + rnd() * 1.2; }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
    const pMat = new THREE.PointsMaterial({ color: '#bfe9ff', map: dotTex, size: 0.16, sizeAttenuation: true, transparent: true, opacity: PAL.dark.part, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);

    /* light shafts from above */
    const shafts = new THREE.Group(), sTex = shaftTex();
    const shaftMat = new THREE.MeshBasicMaterial({ map: sTex, color: '#cfe0ff', transparent: true, opacity: PAL.dark.shaft, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
    for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.6 + rnd(), 22, 16, 1, true), shaftMat);
        m.position.set(-12 + i * 6 + rnd() * 2, 4, -3 + rnd() * 6); m.rotation.z = 0.25 - rnd() * 0.5; m.rotation.x = 0.2 - rnd() * 0.4; m.userData.p = rnd() * 6;
        shafts.add(m);
    }
    scene.add(shafts);

    /* ---------- the user's cell ---------- */
    const cell = new THREE.Group(); scene.add(cell);
    const CR = 1.4;
    /* crisp bubble edges (Oct 17, E-man: "the bubbles have jagged, pixely edges"): the membrane is brightest and most opaque exactly at
       its outline, and the canvas runs without MSAA (antialias is off at dpr >= 2 to save battery), so every bubble outline stepped like
       stairs. EDGE_AA fades the last pixel or so of the outline using the screen-space change of the facing term (fwidth), a soft 1-2 px
       edge at any size and any sharpness step, for one extra instruction per pixel - no extra resolution, no MSAA, no new pass. */
    const EDGE_AA = '\n#if __VERSION__ >= 300 || defined(GL_OES_standard_derivatives)\nfloat lwEdge(float nv){return smoothstep(0.0,fwidth(nv)*2.0+0.02,nv);}\n#else\nfloat lwEdge(float nv){return smoothstep(0.0,0.06,nv);}\n#endif\n';
    const memU = { uIn: { value: new THREE.Color('#3a9fe0') }, uRim: { value: new THREE.Color('#9b87d2') }, uHi: { value: new THREE.Color('#8fe7ff') }, uGlow: { value: 0.55 }, uBase: { value: 0.1 }, uT: { value: 0 } };
    const memMat = new THREE.ShaderMaterial({
        uniforms: memU, transparent: true, depthWrite: false, extensions: { derivatives: true },
        vertexShader: 'uniform float uT;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec3 p=position*(1.0+0.025*sin(uT*1.6+position.y*3.0)+0.018*sin(uT*1.1+position.x*4.0));vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=position;gl_Position=projectionMatrix*mv;}',
        fragmentShader: 'uniform vec3 uIn;uniform vec3 uRim;uniform vec3 uHi;uniform float uGlow;uniform float uBase;uniform float uT;varying vec3 vN;varying vec3 vV;varying vec3 vP;' + EDGE_AA + 'void main(){float nv=abs(dot(normalize(vN),normalize(vV)));float f=pow(1.0-nv,2.0);vec3 c=mix(uIn,uRim,f);c=mix(c,uHi,pow(f,5.0)*0.8);float shimmer=0.5+0.5*sin(vP.y*9.0+uT*0.8+sin(vP.x*7.0));float a=(uBase+f*(0.55+0.45*uGlow)+shimmer*0.04)*lwEdge(nv);gl_FragColor=vec4(c*(0.75+0.6*uGlow),clamp(a,0.0,0.95));\n#include <colorspace_fragment>\n}'
    });
    const membrane = new THREE.Mesh(new THREE.SphereGeometry(CR, small ? 40 : 56, small ? 28 : 40), memMat); cell.add(membrane);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#8fe7ff', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(CR * 3.4, CR * 3.4, 1); cell.add(halo);
    const inner = new THREE.Group(); cell.add(inner);
    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), new THREE.MeshStandardMaterial({ color: '#985cb5', emissive: '#b95b9f', emissiveIntensity: 0.45, roughness: 0.3, transparent: true, opacity: 0.92 }));
    nucleus.position.set(0.12, 0.08, -0.05); inner.add(nucleus);
    const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshStandardMaterial({ color: '#fbebfa', emissive: '#fbebfa', emissiveIntensity: 0.6 })); nucleolus.position.set(0.24, 0.2, 0.3); inner.add(nucleolus);
    const mitoMat = new THREE.MeshStandardMaterial({ color: '#e78631', emissive: '#f8ea40', emissiveIntensity: 0.55, roughness: 0.35 });
    const mitos = [];
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 10), mitoMat); m.userData = { r: 0.85 + (i % 2) * 0.18, a: i * 1.26, y: -0.35 + i * 0.17, s: 0.25 + i * 0.05 }; inner.add(m); mitos.push(m); }
    const vesMat = new THREE.MeshStandardMaterial({ color: '#2ef8b6', emissive: '#2ef8b6', emissiveIntensity: 0.6, roughness: 0.3, transparent: true, opacity: 0.85 });
    const vesicles = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.055 + (i % 3) * 0.02, 10, 8), vesMat); m.userData = { r: 0.6 + (i % 4) * 0.14, a: i * 0.8, y: -0.5 + (i % 5) * 0.25, s: 0.5 + (i % 3) * 0.2 }; inner.add(m); vesicles.push(m); }

    /* ---------- body places: beacons out in the fog ---------- */
    const beacons = {}, hitMeshes = [];
    places.forEach((p, i) => {
        const g = new THREE.Group(), col = new THREE.Color(p.hue);
        const a = (i / places.length) * Math.PI * 2 + 0.4, el = (i % 2 ? 0.35 : -0.25), r = 7.2;
        g.position.set(Math.sin(a) * Math.cos(el) * r, Math.sin(el) * r * 0.8, Math.cos(a) * Math.cos(el) * r);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshBasicMaterial({ color: col, fog: true }));
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.set(2.4, 2.4, 1);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, fog: true }));
        const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
        hit.userData.place = p.id;
        g.add(glow, core, ring, hit); scene.add(g); hitMeshes.push(hit);
        beacons[p.id] = { g, ring, glow, core, hue: col, pos: g.position.clone() };
    });
    /* hub for other builds (regions, cell ride, living cell) to add their meshes */
    const hub = new THREE.Group(); hub.name = 'lowi-hub'; scene.add(hub);
    const regions = places.map(p => ({ id: p.id, pos: beacons[p.id].pos.clone(), hue: p.hue }));
    const frameFns = new Set();
    function onFrame(fn) { if (typeof fn !== 'function') return () => {}; frameFns.add(fn); return () => frameFns.delete(fn); }
    /* (the little microbe buddies that bobbed next to the gut were removed Oct 16, user decision) */

    /* ---------- camera rig ---------- */
    const rig = { yaw: 0.35, pitch: 0.12, dist: 6.5, vy: 0, vp: 0, gy: 0, gp: 0, gyT: 0, gpT: 0, target: new THREE.Vector3(), mode: 'full', minD: 2.4, maxD: 13, pMax: 1.2, homeDist: 3.2, idle: 0, drift: 0, fly: null };
    let focus = null, W = 1, H = 1, glow = 0.55, glowT = 0.55, tint = null, tintAmt = 0, tintT = 0;
    /* Oct 16: tend 0..1 = how much Misty's trip today has energised the cells (LowiSun.tended): their glow grows, rings and cores brighten */
    let tend = 0, tendT = 0; const tendWhite = new THREE.Color('#ffffff');
    const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), baseBg = new THREE.Color(PAL.dark.bg), curBg = new THREE.Color();

    function applyView() {
        camera.aspect = W / H;
        if (focus && rig.mode === 'home') camera.setViewOffset(W, H, W / 2 - focus.x, H / 2 - focus.y, W, H); else camera.clearViewOffset();
        camera.updateProjectionMatrix();
    }
    /* Oct 16: Home re-lays itself out every 1.2 s; setting the canvas size again, even to the same numbers, wipes and re-allocates the
       WebGL buffer (a dropped frame on iPhone). Only a real change touches the canvas. */
    function resize(w, h) { const nw = Math.max(1, w | 0), nh = Math.max(1, h | 0); if (nw !== W || nh !== H) { W = nw; H = nh; renderer.setSize(W, H, false); paintNow = true; } applyView(); if (paintNow && running) { try { renderer.render(scene, camera); } catch (e) { } } }
    function setFocus(f) { focus = f; applyView(); }
    const HOME_OUT = 1.4; /* the resting Home view: Misty at 1/1.4 of her close-up size (above wh-mapview's 0.6) */
    function homeDistFor(px) { return CR / ((px / (H / 2)) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }
    function setMode(m, o) {
        o = o || {};
        if (m === 'home') {
            /* Home IS the world: drag orbits freely, two fingers zoom from Misty close-up out to the whole world.
               A re-layout keeps the current zoom (scaled to the new size) instead of snapping back to Misty. */
            /* Oct 17 (handoff 6, E-man: zoomed-out Home is the default): Home rests a little pulled back (rig.homeRest), Misty smaller in
               the middle with her four bubbles circling her (sym-home.js). homeDist stays the distance where her cell fits her DOM bubble. */
            const was = rig.mode === 'home' && rig.homeDist > 0 && rig.lastHome ? rig.dist / rig.homeDist : HOME_OUT;
            rig.homeDist = homeDistFor(o.radiusPx || 100); rig.homeOut = HOME_OUT; rig.homeRest = rig.homeDist * HOME_OUT; rig.lastHome = true;
            rig.minD = rig.homeDist * 0.72; rig.maxD = Math.max(14, rig.homeDist * 2.5); rig.pMax = 1.1;
            /* Oct 16 (task 1 fix): Home re-lays itself out every frame; past the World Map (rig.outer) the camera may be out in the
               spirit world, so the re-layout must not pull it back to the World Map limit */
            const hiD = rig.outer && rig.dist > rig.maxD ? (rig.outerD || 300) : rig.maxD;
            rig.dist = Math.min(hiD, Math.max(rig.minD, was > 0 && rig.dist > rig.maxD && rig.outer ? rig.dist : rig.homeDist * was)); rig.fly = null; rig.target.set(0, 0, 0);
            rig.mode = m; inner.visible = false; halo.visible = false; /* one bubble: Misty's own cell, no extra glow shell */
        }
        else { rig.mode = m; rig.lastHome = false; rig.minD = 2.4; rig.maxD = 13; rig.pMax = 1.2; if (rig.dist < 4) rig.dist = 6.5; inner.visible = true; halo.visible = true; }
        Object.values(beacons).forEach(b => { b.g.visible = true; });
        applyView();
    }
    function drag(dx, dy) { rig.yaw -= dx * 0.0062; rig.pitch += dy * 0.005; rig.vy = -dx * 0.0062; rig.vp = dy * 0.005; rig.idle = 0; }
    function release(vx, vy) { rig.vy = -vx * 0.0062 * 16; rig.vp = vy * 0.005 * 16; }
    const zv = new THREE.Vector3(), zp = new THREE.Vector3(), PLACE_MIN = 0.75;
    function zoom(f, sx, sy) {
        /* past the World Map (Home only, while rig.outer is on): the same pinch keeps going, like Google Earth, and moves faster the
           farther out it is, so the spirit world is one or two pinches away and not twenty */
        if (rig.mode === 'home' && rig.outer && (rig.dist >= rig.maxD * 0.999 && f > 1 || rig.dist > rig.maxD)) {
            const over = Math.max(1, rig.dist / rig.maxD), g = 1 + Math.min(2.2, Math.log(over) * 0.9 + 0.6);
            const nd = rig.dist * Math.pow(f, g);
            rig.dist = Math.min(COSMOS.OUT, nd < rig.maxD && f < 1 ? Math.max(rig.minD, Math.max(rig.maxD * 0.999, nd)) : Math.max(rig.minD, nd)); rig.idle = 0; return;
        }
        /* Oct 17: inside a body place you can come much closer, and the pinch flies toward the spot under your fingers (zooming out
           drifts back to the place's middle), always inside the place: one continuous camera, no jumps */
        const pl = rig.mode === 'home' && rig.place && rig.place.c ? rig.place : null;
        rig.dist = Math.min(rig.maxD, Math.max(pl ? Math.min(rig.minD, PLACE_MIN) : rig.minD, rig.dist * f)); rig.idle = 0;
        if (pl && isFinite(sx) && isFinite(sy) && !rig.fly) {
            const q = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
            if (q && q.width) {
                zv.set((sx - q.left) / q.width * 2 - 1, -((sy - q.top) / q.height * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
                zp.copy(camera.position).addScaledVector(zv, camera.position.distanceTo(rig.target));
                if (f < 1) rig.target.lerp(zp, Math.min(0.5, (1 - f) * 1.2)); else if (f > 1) rig.target.lerp(pl.c, Math.min(0.4, (f - 1) * 0.6));
                zv.subVectors(rig.target, pl.c); const L = zv.length(); if (L > pl.R) rig.target.copy(pl.c).addScaledVector(zv, pl.R / L);
            }
        }
    }
    function setGyro(y, p) { rig.gyT = y; rig.gpT = p; }
    function setGlow(g) { glowT = Math.max(0, Math.min(1, g)); }
    function setTend(k) { tendT = Math.max(0, Math.min(1, +k || 0)); }
    function beaconLook() { const b = Object.values(beacons)[0]; return b ? { tend: +tend.toFixed(3), glowScale: +b.glow.scale.x.toFixed(3), glowOpacity: +b.glow.material.opacity.toFixed(3), ringOpacity: +b.ring.material.opacity.toFixed(3), ringScale: +b.ring.scale.x.toFixed(3), core: '#' + b.core.material.color.getHexString() } : null; }
    function setTheme(t) {
        theme = t === 'light' ? 'light' : 'dark'; const P = PAL[theme];
        baseBg.set(P.bg); scene.fog.density = P.fog; baseFog = P.fog; hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGround); key.color.set(P.key);
        wallMat.color.set(P.wall); wallMat.emissive.set(P.wallHi); shaftMat.opacity = P.shaft; pMat.opacity = P.part;
        pMat.blending = theme === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending; pMat.color.set(theme === 'light' ? '#ffffff' : '#bfe9ff'); pMat.needsUpdate = true;
        memU.uIn.value.set(theme === 'light' ? '#2e8fd6' : '#3a9fe0'); memU.uBase.value = theme === 'light' ? 0.16 : 0.1;
        halo.material.opacity = theme === 'light' ? 0.22 : 0.32;
    }
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function flyTo(id) {
        const b = id && beacons[id];
        const from = { t: rig.target.clone(), d: rig.dist };
        const to = b ? { t: b.pos.clone().multiplyScalar(0.92), d: 2.6 } : { t: new THREE.Vector3(), d: rig.mode === 'home' ? (rig.homeRest || rig.homeDist || 3.2) : 6.5 }; /* back home on Home: Misty's own (zoomed-out) framing */
        if (b) { const ang = Math.atan2(b.pos.x, b.pos.z); rig.flyYaw = { from: rig.yaw, to: ang + Math.round((rig.yaw - ang) / (Math.PI * 2)) * Math.PI * 2 }; } else rig.flyYaw = null;
        rig.fly = { from, to, t: 0, dur: 1.45 }; rig.idle = 0;
        tint = b ? b.hue.clone() : null; tintT = b ? 0.2 : 0;
        return !!b || !id;
    }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(x, y) {
        ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(hitMeshes, false)[0];
        if (hit) return hit.object.userData.place;
        const cHit = ray.intersectObject(membrane, false)[0];
        return cHit ? 'cell' : null;
    }
    function project(id) {
        const b = beacons[id]; if (!b) return null;
        tmpP.copy(b.pos).add(new THREE.Vector3(0, 0.95, 0)).project(camera);
        const camSpace = b.pos.clone().applyMatrix4(camera.matrixWorldInverse);
        return { x: (tmpP.x + 1) / 2 * W, y: (1 - tmpP.y) / 2 * H, visible: camSpace.z < 0 && Math.abs(tmpP.x) < 1.1 && Math.abs(tmpP.y) < 1.1, dist: -camSpace.z };
    }

    /* ---------- loop ---------- */
    let running = false, raf = 0, last = 0, t = 0, frames = [], lowFor = 0;
    /* Oct 16 (E-man): a speed control for the world's own motion (cells drifting, platelets, mitochondria...). The camera, gestures,
       glow fades and Misty (DOM, her own animations) keep real time. Set by atmosphere.js as window.LowiWorldSpeed (0.25..3). */
    function worldSpeed() { const v = +(typeof window !== 'undefined' && window.LowiWorldSpeed); return v > 0 ? Math.min(3, Math.max(0.1, v)) : 1; }
    /* Oct 16, 2026 (handoff task 3, E-man: "pinch out like Google Maps / Google Earth ... we're not just inside our one, we now see
       all the other ones around us"; "the bubbles are membranes: inside each is the sanctuary where the cells and companions live,
       the space outside is the connective tissue of the spirit world"). The world goes on past the World Map: keep pulling out and
       the bloodstream thins into a glowing sanctuary inside OUR membrane bubble, and around it the other bubbles (everyone else's
       worlds) hang in the dark, joined by threads of light. Built on first use, hidden (and costing nothing) until the camera is past
       the World Map. Since the cellular-galaxy rework (below) the bubbles are living cells and no companion is drawn out here. */
    let baseFog = PAL.dark.fog;
    /* DEEP0 / DEEP1 (Oct 17, limitless spirit world, misty-galaxy.js GAL.LOOP): the camera distances from home over which the whole
       cosmos fades into the deep starry dark between galaxies, where Misty's flight loops round; kept equal to GAL.DEEP0 / DEEP1 */
    const COSMOS = { R: 46, OUT: 300, N: small ? 30 : 40, DEEP0: 1000, DEEP1: 1130 };
    const skyTmp = new THREE.Vector3(), skyUp = new THREE.Vector3(0, 1, 0);
    rig.outerD = COSMOS.OUT;
    let cosmos = null, cosmosK = -1, farNow = 120, cosmosGx = 0;
    const smoothC = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    /* Oct 16, 2026 (E-man, after build 181510: "Why are there companions in the background? It's distracting ... We don't see the
       companions. We see that metabolic cellular galaxy outer world that I showed you"). The far realm is cells, not faces: NO companion,
       face, name or sprite of a person is ever drawn in this layer (the only companions in Community are the real, tappable members on
       the page above). Everything is made here, procedurally (no picture, no wallpaper): translucent glass cell-spheres of every size,
       each full of life (inner cells, organelles, a glowing node web, a nucleus glow), a few huge ones close by and cut off by the screen
       edges, many small far ones, soft curving threads of light with beads travelling along them, fine sparkling dust and a dark starry
       deep. Base stays dark blue and Misty blue; cyan, green, purple, magenta and gold only as glows inside the cells, like his picture. */
    const reduceMq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    /* Oct 19 2026 (Emmanuel, iPad screenshot): no shading crescent on any bubble. The old fixed upper-left glint lobe
       (pow(dot(n, (-0.45,0.6,0.65)), 22)) sat at 0.75 R towards 11 o'clock on every cell and read as a shadow arc, so it is gone.
       The symmetric fresnel rim, the veins and the colours are the glass look and stay. */
    function membraneMat(col, rim, rim2) {
        return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, extensions: { derivatives: true },
            uniforms: { uCol: { value: new THREE.Color(col) }, uRim: { value: new THREE.Color(rim) }, uRim2: { value: new THREE.Color(rim2 || rim) }, uO: { value: 0 }, uT: { value: 0 } },
            vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }',
            fragmentShader: 'uniform vec3 uCol; uniform vec3 uRim; uniform vec3 uRim2; uniform float uO; uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;' + EDGE_AA + 'void main(){ float f = 1.0 - abs(dot(vN, vV)); float nv = abs(dot(normalize(vN), normalize(vV))); float rim = pow(f, 2.3); float veins = 0.5 + 0.5 * sin(vP.x * 7.0 + uT * 0.4) * sin(vP.y * 6.0 - uT * 0.3) * sin(vP.z * 6.5 + uT * 0.25); vec3 rc = mix(uRim, uRim2, 0.5 + 0.5 * vN.y); vec3 c = uCol * 0.10 + rc * rim * 0.85 + rc * veins * rim * 0.35; gl_FragColor = vec4(c, (0.035 + rim * 0.9) * uO * lwEdge(nv)); }' });
    }
    /* glowing points: one shader for inner cells, organelles, beads, dust and the starry deep (size in world units, own distance fade,
       optional slow orbit around a centre so cells drift inside their sphere, optional twinkle) */
    const PT_V = 'uniform float uT; uniform float uScale; uniform float uSz; uniform float uO; uniform float uTw; uniform float uFa; uniform float uFb; attribute float aSize; attribute vec3 aCol; attribute float aPh;\n#ifdef ORBIT\nattribute vec4 aOrb;\n#endif\nvarying vec3 vC; varying float vA; void main(){ vec3 p = position;\n#ifdef ORBIT\nvec3 rel = position - aOrb.xyz; float an = uT * aOrb.w; float cs = cos(an); float sn = sin(an); p = aOrb.xyz + vec3(rel.x * cs - rel.z * sn, rel.y + sin(uT * 0.6 + aPh * 6.283) * 0.04 * length(rel), rel.x * sn + rel.z * cs);\n#endif\nvec4 mv = modelViewMatrix * vec4(p, 1.0); float dz = max(0.5, -mv.z); float ps = aSize * uSz * uScale / dz; gl_PointSize = clamp(ps, 0.0, 240.0); float tw = 1.0 - uTw + uTw * (0.5 + 0.5 * sin(uT * (1.2 + fract(aPh * 3.7) * 2.2) + aPh * 6.283)); vC = aCol; vA = uO * tw * (1.0 - smoothstep(uFa, uFb, dz)) * smoothstep(0.25, 1.4, ps); gl_Position = projectionMatrix * mv; }';
    const PT_F = 'uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ vec4 tx = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC * tx.rgb, tx.a * vA); }';
    const ptsList = [];
    function ptsBuf() { return { p: [], s: [], c: [], ph: [], o: [] }; }
    function ptPush(A, x, y, z, size, col, ph, orb) { A.p.push(x, y, z); A.s.push(size); A.c.push(col.r, col.g, col.b); A.ph.push(ph); if (orb) A.o.push(orb[0], orb[1], orb[2], orb[3]); }
    function ptsObj(A, map, orbit, fa, fb, tw) {
        const gm = new THREE.BufferGeometry();
        gm.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3)); gm.setAttribute('aSize', new THREE.Float32BufferAttribute(A.s, 1));
        gm.setAttribute('aCol', new THREE.Float32BufferAttribute(A.c, 3)); gm.setAttribute('aPh', new THREE.Float32BufferAttribute(A.ph, 1));
        if (orbit) gm.setAttribute('aOrb', new THREE.Float32BufferAttribute(A.o, 4));
        const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, defines: orbit ? { ORBIT: 1 } : {},
            uniforms: { uMap: { value: map }, uT: { value: 0 }, uScale: { value: 800 }, uSz: { value: 1 }, uO: { value: 0 }, uTw: { value: tw || 0 }, uFa: { value: fa || 700 }, uFb: { value: fb || 1500 } },
            vertexShader: PT_V, fragmentShader: PT_F });
        const pts = new THREE.Points(gm, mat); pts.frustumCulled = false; ptsList.push(pts); return pts;
    }
    function webObj(V, Cs) {
        const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); gm.setAttribute('color', new THREE.Float32BufferAttribute(Cs, 3));
        const ln = new THREE.LineSegments(gm, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        ln.frustumCulled = false; return ln;
    }
    /* a glass cell seen from afar: thin bright membrane, translucent body, an off-centre nucleus and a few organelles */
    const cellTex = (() => { const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), h = S / 2;
        let g = x.createRadialGradient(h, h, 0, h, h, h); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(0.72, 'rgba(255,255,255,.16)'); g.addColorStop(0.86, 'rgba(255,255,255,.85)'); g.addColorStop(0.93, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, S, S);
        g = x.createRadialGradient(h - 12, h - 8, 0, h - 12, h - 8, 26); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, S, S);
        [[h + 20, h + 14, 6], [h + 10, h - 26, 4], [h - 22, h + 24, 5], [h + 28, h - 6, 3]].forEach(d => { const q = x.createRadialGradient(d[0], d[1], 0, d[0], d[1], d[2]); q.addColorStop(0, 'rgba(255,255,255,.9)'); q.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = q; x.fillRect(d[0] - d[2], d[1] - d[2], d[2] * 2, d[2] * 2); });
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const SPC = { cyan: '#7fe6ff', blue: '#5aa8ff', misty: '#8fd0ff', teal: '#5fe0c8', green: '#8ff0a0', purple: '#a98cff', magenta: '#ff80d6', gold: '#ffcf7a', white: '#e8f6ff' };
    const SPK = Object.keys(SPC).reduce((o, k) => { o[k] = new THREE.Color(SPC[k]); return o; }, {});
    /* rims: mostly Misty blue and cyan; a few green, purple, magenta or gold glows, like the spheres in his picture */
    const RIMS = ['cyan', 'blue', 'purple', 'misty', 'cyan', 'magenta', 'blue', 'teal', 'gold', 'misty', 'green', 'cyan', 'purple', 'blue', 'misty', 'teal'];
    const ACC = ['purple', 'magenta', 'gold', 'green', 'cyan', 'teal'];
    /* one living cell-sphere's inside: drifting inner cells (orbit), organelle nodes joined in a glowing web, a nucleus glow */
    function fillCell(rnd, cellsA, nodesA, webV, webC, cx, cy, cz, r, colA, colB, nCells, nNodes) {
        for (let k = 0; k < nCells; k++) {
            const rr = r * Math.cbrt(rnd()) * 0.74, th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1);
            const col = (k % 3 === 2 ? colB : k % 7 === 5 ? SPK[ACC[k % ACC.length]] : colA).clone().lerp(SPK.white, rnd() * 0.3), sp = (rnd() > 0.5 ? 1 : -1) * (0.03 + rnd() * 0.09);
            ptPush(cellsA, cx + rr * Math.sin(ph) * Math.cos(th), cy + rr * Math.cos(ph) * 0.8, cz + rr * Math.sin(ph) * Math.sin(th), r * (0.12 + rnd() * 0.24), col, rnd(), [cx, cy, cz, sp]);
        }
        const nodes = [];
        for (let k = 0; k < nNodes; k++) {
            const rr = r * (0.2 + 0.68 * Math.sqrt(rnd())), th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1);
            const p = [cx + rr * Math.sin(ph) * Math.cos(th), cy + rr * Math.cos(ph), cz + rr * Math.sin(ph) * Math.sin(th)];
            const col = (k % 3 === 0 ? colB : colA).clone().lerp(SPK.white, 0.35); nodes.push({ p, col });
            ptPush(nodesA, p[0], p[1], p[2], r * (0.035 + rnd() * 0.05), col, rnd());
        }
        nodes.forEach((a, i) => {
            const near = nodes.map((b, j) => [j, (a.p[0] - b.p[0]) ** 2 + (a.p[1] - b.p[1]) ** 2 + (a.p[2] - b.p[2]) ** 2]).filter(q => q[0] > i).sort((q, w) => q[1] - w[1]).slice(0, 2);
            near.forEach(q => { if (q[1] > r * r * 0.5) return; const b = nodes[q[0]]; webV.push(a.p[0], a.p[1], a.p[2], b.p[0], b.p[1], b.p[2]); webC.push(a.col.r * 0.5, a.col.g * 0.5, a.col.b * 0.5, b.col.r * 0.5, b.col.g * 0.5, b.col.b * 0.5); });
        });
        ptPush(nodesA, cx, cy, cz, r * 1.1, colA.clone().multiplyScalar(0.35), rnd());
        ptPush(nodesA, cx + r * 0.12, cy + r * 0.05, cz, r * 0.38, colB.clone().lerp(SPK.white, 0.25), rnd());
    }
    /* LIMITLESS, new space: move the fixed glass worlds onto the made-up worlds nearest the camera (misty-galaxy.js deepNear, a few
       times a second), and fade each by its distance (in from GEN.SEE) and by how deep out the camera is (genK) */
    function deepStep(C, camL, dt, tt, calm) {
        const GC = typeof window !== 'undefined' && window.LowiMistyGalaxy && window.LowiMistyGalaxy.core;
        const gen = GC && GC.genK ? GC.genK(camL) : 0, slots = C.deepSlots;
        C.deep.visible = gen > 0.002;
        if (!C.deep.visible) { if (C.deepT !== 0) { C.deepT = 0; slots.forEach(gi => { gi.userData.key = -1; gi.visible = false; }); } return; }
        const cp = camera.position, SEE = GC.GEN.SEE;
        C.deepT -= dt;
        if (C.deepT <= 0) {
            C.deepT = 0.15;
            const want = GC.deepNear(cp.x, cp.y, cp.z, slots.length);
            slots.forEach(gi => { const k = gi.userData.key; if (k >= 0 && !want.some(w => w.key === k)) { gi.userData.key = -1; gi.visible = false; } });
            want.forEach(w => {
                if (slots.some(gi => gi.userData.key === w.key)) return;
                const gi = slots.find(s => s.userData.key < 0); if (!gi) return;
                const u = gi.userData; u.key = w.key; u.r = w.r; u.p = w.p; gi.position.set(w.x, w.y, w.z); gi.rotation.set(0, w.p, 0); gi.visible = true;
            });
        }
        slots.forEach(gi => {
            const u = gi.userData; if (u.key < 0) return;
            const d = gi.position.distanceTo(cp) - u.r, o = gen * (1 - smoothC(SEE - 170, SEE, d)) * 0.8 * calm;
            gi.scale.setScalar(u.r * (1 + 0.02 * Math.sin(tt * 0.6 + u.p)));
            u.m.material.uniforms.uO.value = o; u.m.material.uniforms.uT.value = tt + u.p;
            u.c.material.uniforms.uSz.value = u.r; u.nd.material.uniforms.uSz.value = u.r;
            u.c.material.uniforms.uO.value = o * 0.9; u.nd.material.uniforms.uO.value = o * 0.9; u.w.material.opacity = o * 0.5;
            u.c.material.uniforms.uT.value = tt; u.nd.material.uniforms.uT.value = tt;
        });
    }
    function buildCosmos() {
        const g = new THREE.Group(); g.visible = false; g.name = 'cosmos';
        const rnd = (() => { let sd = 4242; return () => (sd = (sd * 16807) % 2147483647) / 2147483647; })();
        const sphere = new THREE.SphereGeometry(1, small ? 40 : 56, small ? 28 : 40), sphereLo = new THREE.SphereGeometry(1, 28, 20);
        /* our own membrane: Misty blue, the bubble the camera has just left */
        const mine = new THREE.Mesh(sphere, membraneMat('#396b9c', '#a8dcff', '#7fe6ff')); mine.scale.setScalar(COSMOS.R); g.add(mine);
        const mineGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#6fc8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); mineGlow.scale.set(COSMOS.R * 1.6, COSMOS.R * 1.6, 1); g.add(mineGlow);
        const cellsA = ptsBuf(), nodesA = ptsBuf(), webV = [], webC = [];
        /* the other worlds: glass cell-spheres of every size, scattered in depth, never on the camera's orbit (no sphere ever fills the view) */
        const worlds = [{ x: 0, y: 0, z: 0, r: COSMOS.R, colA: SPK.misty, colB: SPK.cyan }];
        const others = [];
        for (let i = 0, tries = 0; i < COSMOS.N && tries < 1500; tries++) {
            const big = i < 5, r = big ? 30 + rnd() * 26 : 6 + Math.pow(rnd(), 1.5) * 24;
            const dist = rnd() < 0.45 ? 75 + rnd() * 175 : 340 + rnd() * 460, th = rnd() * 6.283, ph = Math.acos((2 * rnd() - 1) * 0.75);
            const x = dist * Math.sin(ph) * Math.cos(th), y = dist * Math.cos(ph) * 0.6, z = dist * Math.sin(ph) * Math.sin(th);
            if (Math.abs(Math.hypot(x, y, z) - COSMOS.OUT) < r + 45) continue;
            if (worlds.some(w => Math.hypot(w.x - x, w.y - y, w.z - z) < (w.r + r) * 1.25)) continue;
            const colA = SPK[RIMS[i % RIMS.length]], colB = SPK[ACC[(i * 5 + 1) % ACC.length]];
            const o = new THREE.Mesh(r < 22 ? sphereLo : sphere, membraneMat(colA.clone().multiplyScalar(0.6), colA, colB)); o.scale.setScalar(r); o.position.set(x, y, z);
            o.userData = { r, p: rnd() * 6.283, base: y }; g.add(o); others.push(o);
            const w = { x, y, z, r, colA, colB }; worlds.push(w);
            const q = small ? 0.65 : 1;
            fillCell(rnd, cellsA, nodesA, webV, webC, x, y, z, r, colA, colB, Math.round(Math.min(34, Math.max(6, r * 0.75)) * q), Math.round(Math.min(40, Math.max(8, r * 0.9)) * q));
            i++;
        }
        /* our own bubble is alive too: its cells glow faintly from outside */
        fillCell(rnd, cellsA, nodesA, webV, webC, 0, 0, 0, COSMOS.R, SPK.misty, SPK.cyan, small ? 18 : 28, small ? 20 : 30);
        const cells = ptsObj(cellsA, cellTex, true, 650, 1250, 0); g.add(cells);
        const nodes = ptsObj(nodesA, glowTex, false, 650, 1250, 0.35); g.add(nodes);
        const web = webObj(webV, webC); g.add(web);
        /* connective threads: each world to its two nearest neighbours, soft organic S-curves (never straight, never across the whole
           view), brightest in the middle and fading into the membranes, with beads of light along them and sparks travelling on them */
        const thV = [], thC = [], beadsA = ptsBuf(), paths = [], seen = new Set(), S = 40;
        const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
        worlds.forEach((a, i) => {
            worlds.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)]).filter(q => q[0] !== i && q[1] < 270).sort((q, w) => q[1] - w[1]).slice(0, 2).forEach(q => {
                const key = Math.min(i, q[0]) + ':' + Math.max(i, q[0]); if (seen.has(key)) return; seen.add(key);
                const b = worlds[q[0]], dir = tmpA.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize().clone();
                const p0 = new THREE.Vector3(a.x, a.y, a.z).addScaledVector(dir, a.r * 0.98), p3 = new THREE.Vector3(b.x, b.y, b.z).addScaledVector(dir, -b.r * 0.98), L = p0.distanceTo(p3);
                /* a living fibre: a bow to one side plus two smaller wiggles, through five points (Catmull-Rom), so it always curves */
                const n1 = tmpB.copy(dir).cross(up).normalize().applyAxisAngle(dir, rnd() * 6.283).clone(), bow = L * (0.22 + rnd() * 0.2);
                const w1 = n1.clone().applyAxisAngle(dir, (rnd() - 0.5) * 2.4), w2 = n1.clone().applyAxisAngle(dir, (rnd() - 0.5) * 2.4);
                const via = [p0, p0.clone().lerp(p3, 0.25).addScaledVector(n1, bow * 0.7).addScaledVector(w1, L * (0.06 + rnd() * 0.1)), p0.clone().lerp(p3, 0.5).addScaledVector(n1, bow),
                    p0.clone().lerp(p3, 0.75).addScaledVector(n1, bow * 0.7).addScaledVector(w2, -L * (0.06 + rnd() * 0.1)), p3];
                const pts = new THREE.CatmullRomCurve3(via, false, 'centripetal').getPoints(S - 1), arr = new Float32Array(S * 3);
                const ca = a.colA, cb = b.colA;
                pts.forEach((p, k) => { arr[k * 3] = p.x; arr[k * 3 + 1] = p.y; arr[k * 3 + 2] = p.z; });
                for (let k = 0; k < S - 1; k++) {
                    const u0 = k / (S - 1), u1 = (k + 1) / (S - 1), e0 = 0.15 + 0.85 * Math.sin(Math.PI * u0), e1 = 0.15 + 0.85 * Math.sin(Math.PI * u1);
                    thV.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
                    const k0 = ca.clone().lerp(cb, u0).multiplyScalar(e0 * 0.8), k1 = ca.clone().lerp(cb, u1).multiplyScalar(e1 * 0.8); thC.push(k0.r, k0.g, k0.b, k1.r, k1.g, k1.b);
                }
                pts.forEach((p, k) => { const u = k / (S - 1), col = ca.clone().lerp(cb, u).lerp(SPK.white, 0.3);
                    ptPush(beadsA, p.x, p.y, p.z, 2.4 + 1.2 * Math.sin(Math.PI * u), col.clone().multiplyScalar(0.28), rnd());
                    if (k % 6 === 3) ptPush(beadsA, p.x, p.y, p.z, 4 + rnd() * 5, col, rnd()); });
                paths.push({ arr, col: ca.clone().lerp(cb, 0.5).lerp(SPK.white, 0.45), a: i, b: q[0], dir: 1 });
            });
        });
        /* Oct 17 (E-man: the strings carry Misty like ocean currents): galaxy-bubbles.js reads the threads' curves (group space) from here.
           a / b are indexes into worlds (0 = our own bubble, n = others[n - 1]); dir is the way each current flows (+1 = a to b). */
        const threads = webObj(thV, thC); threads.name = 'cosmos-threads'; threads.userData.paths = paths; g.add(threads);
        const beads = ptsObj(beadsA, glowTex, false, 650, 1300, 0.45); g.add(beads);
        const sparkA = ptsBuf(), sparks = [];
        /* the sparks show which way each current flows: the first spark's coin decides the thread's direction, both sparks follow it */
        paths.forEach((pa, j) => { for (let k = 0; k < 2; k++) { const o = rnd(), sp = 0.025 + rnd() * 0.03, sg = rnd() > 0.5 ? 1 : -1; if (k === 0) pa.dir = sg; sparks.push({ j, o, s: sp * pa.dir }); ptPush(sparkA, pa.arr[0], pa.arr[1], pa.arr[2], 6 + rnd() * 3, pa.col, rnd()); } });
        const sparkPts = ptsObj(sparkA, dotTex, false, 650, 1300, 0); g.add(sparkPts);
        /* fine sparkling dust drifting slowly between the worlds, and the dark starry deep far beyond */
        const dustA = ptsBuf(), DN = small ? 650 : 1100;
        for (let i = 0; i < DN; i++) { const rr = 60 + Math.pow(rnd(), 0.8) * 700, th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1), pick = rnd();
            const col = (pick < 0.62 ? SPK.white : pick < 0.8 ? SPK.cyan : pick < 0.88 ? SPK.gold : pick < 0.95 ? SPK.magenta : SPK.green).clone().multiplyScalar(0.55 + rnd() * 0.45);
            ptPush(dustA, rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph) * 0.7, rr * Math.sin(ph) * Math.sin(th), 0.9 + rnd() * 2.2, col, rnd(), [0, 0, 0, (0.004 + rnd() * 0.01) * (rnd() > 0.3 ? 1 : -1)]); }
        const motes = ptsObj(dustA, dotTex, true, 600, 1200, 0.6); g.add(motes);
        const starA = ptsBuf(), SN = small ? 500 : 800;
        for (let i = 0; i < SN; i++) { const rr = 950 + rnd() * 200, th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1);
            ptPush(starA, rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th), 1.6 + Math.pow(rnd(), 3) * 4, (rnd() < 0.85 ? SPK.white : SPK.cyan).clone().multiplyScalar(0.5 + rnd() * 0.5), rnd()); }
        const stars = ptsObj(starA, dotTex, false, 5000, 6000, 0.5); g.add(stars);
        const farA = ptsBuf(), FN = small ? 140 : 240;
        for (let i = 0; i < FN; i++) { const rr = 720 + rnd() * 230, th = rnd() * 6.283, ph = Math.acos((2 * rnd() - 1) * 0.85);
            ptPush(farA, rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph) * 0.8, rr * Math.sin(ph) * Math.sin(th), 5 + Math.pow(rnd(), 2) * 16, SPK[RIMS[i % RIMS.length]].clone().multiplyScalar(0.55), rnd()); }
        const farCells = ptsObj(farA, cellTex, false, 5000, 6000, 0); g.add(farCells);
        /* tissue haze: a few very large, very faint veils of deep blue with a breath of violet */
        const haze = [];
        for (let i = 0; i < 6; i++) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: i % 3 === 2 ? '#3d2c70' : '#1f3d70', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); const a = i * 1.1; h.position.set(Math.cos(a) * 260, (rnd() - 0.5) * 160, Math.sin(a) * 260); const sc = 260 + rnd() * 200; h.scale.set(sc, sc, 1); g.add(h); haze.push(h); }
        /* Oct 16, 2026 (E-man, voice note on the outer world: "there's a transparent cylinder ... it looks like there's a line cutting
           through it. I would rather have it be like light frequency"). The bloodstream's tube no longer reaches out here (see
           cosmosStep); in its place our bubble carries the flow as light: a few soft strands of light frequency, waves of cyan, Misty
           blue and violet that swell in the middle and fade to nothing at both ends, well inside our membrane. Camera-facing ribbons
           (no surface, no hard edge, no depth write), additive, gently travelling; reduced motion holds them still. */
        const FREQ_V = 'uniform float uT; uniform float uLen; uniform float uAmp; uniform float uK; uniform float uSpd; uniform float uPh; uniform float uW; attribute float aU; attribute float aSide; varying float vU; varying float vS;'
            + ' vec3 cen(float u){ float e = sin(3.14159 * clamp(u, 0.0, 1.0)); float a = uAmp * e * (0.8 + 0.2 * sin(uT * 0.5 + uPh)); float w = uK * u * 6.28318 - uT * uSpd + uPh; return vec3((u - 0.5) * uLen, a * sin(w), a * 0.55 * cos(w * 0.5 + uPh)); }'
            + ' void main(){ vec4 mp = modelViewMatrix * vec4(cen(aU), 1.0); vec4 mq = modelViewMatrix * vec4(cen(aU + 0.004), 1.0); vec2 d = mq.xy - mp.xy; vec2 tg = length(d) > 1e-6 ? normalize(d) : vec2(1.0, 0.0);'
            + ' float e = sin(3.14159 * aU); mp.xy += vec2(-tg.y, tg.x) * aSide * uW * (0.4 + 0.6 * e); vU = aU; vS = aSide; gl_Position = projectionMatrix * mp; }';
        const FREQ_F = 'uniform float uT; uniform float uO; uniform float uPh; uniform vec3 uA; uniform vec3 uB; varying float vU; varying float vS;'
            + ' void main(){ float e = pow(sin(3.14159 * vU), 1.6); float core = exp(-vS * vS * 4.0); float pulse = 0.65 + 0.35 * sin(vU * 16.0 - uT * 1.3 + uPh);'
            + ' vec3 c = mix(uA, uB, vU) * (0.55 + 0.75 * core * core); gl_FragColor = vec4(c, core * e * pulse * uO); }';
        const FREQ_SEG = small ? 120 : 180, fU = new Float32Array((FREQ_SEG + 1) * 2), fS = new Float32Array((FREQ_SEG + 1) * 2), fIdx = [];
        for (let k = 0; k <= FREQ_SEG; k++) { fU[k * 2] = fU[k * 2 + 1] = k / FREQ_SEG; fS[k * 2] = -1; fS[k * 2 + 1] = 1; if (k < FREQ_SEG) { const a = k * 2; fIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
        const freqGeo = new THREE.BufferGeometry();
        freqGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((FREQ_SEG + 1) * 2 * 3), 3));
        freqGeo.setAttribute('aU', new THREE.Float32BufferAttribute(fU, 1)); freqGeo.setAttribute('aSide', new THREE.Float32BufferAttribute(fS, 1)); freqGeo.setIndex(fIdx);
        const freq = new THREE.Group(); freq.name = 'light-frequency';
        [[1.6, 7.5, 0.55, 0.0, 1.5, 'cyan', 'misty'], [2.3, 5.5, -0.42, 1.9, 1.2, 'misty', 'purple'], [3.1, 4.0, 0.7, 3.7, 1.0, 'teal', 'cyan'], [1.2, 9.5, -0.3, 5.1, 1.8, 'blue', 'purple']].slice(0, small ? 3 : 4).forEach(s => {
            const m = new THREE.Mesh(freqGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
                uniforms: { uT: { value: 0 }, uO: { value: 0 }, uLen: { value: COSMOS.R * 1.5 }, uK: { value: s[0] }, uAmp: { value: s[1] }, uSpd: { value: s[2] }, uPh: { value: s[3] }, uW: { value: s[4] }, uA: { value: SPK[s[5]].clone() }, uB: { value: SPK[s[6]].clone() } },
                vertexShader: FREQ_V, fragmentShader: FREQ_F }));
            m.frustumCulled = false; m.rotation.x = s[3]; freq.add(m);
        });
        g.add(freq);
        scene.add(g);
        /* a few huge cell-spheres right in front of the camera, cut off by the screen edges (deepest parallax), placed in screen space */
        const near = new THREE.Group(); near.visible = false; near.name = 'cosmos-near';
        const NEAR = [[-1.02, 0.62, 0.62, 'misty', 'purple'], [1.08, -0.42, 0.55, 'cyan', 'gold'], [0.92, 1.05, 0.3, 'purple', 'cyan'], [-0.78, -1.08, 0.36, 'teal', 'magenta']].slice(0, small ? 3 : 4);
        const giants = NEAR.map((n, i) => {
            const gi = new THREE.Group(), colA = SPK[n[3]], colB = SPK[n[4]];
            const m = new THREE.Mesh(sphere, membraneMat(colA.clone().multiplyScalar(0.5), colA, colB)); gi.add(m);
            const cA = ptsBuf(), nA = ptsBuf(), wV = [], wC = [];
            fillCell(rnd, cA, nA, wV, wC, 0, 0, 0, 1, colA, colB, small ? 26 : 40, small ? 26 : 38);
            const c = ptsObj(cA, cellTex, true, 5000, 6000, 0), nd = ptsObj(nA, glowTex, false, 5000, 6000, 0.35), w = webObj(wV, wC);
            gi.add(c); gi.add(nd); gi.add(w); near.add(gi);
            gi.userData = { m, c, nd, w, n, p: i * 1.9 };
            return gi;
        });
        scene.add(near);
        /* LIMITLESS, new space (Oct 17): a fixed handful of glass worlds, built once, that misty-galaxy.js deepNear() places on the
           worlds made up from the coordinates of the space around the camera (out past the hand-made galaxy). As she flies on, the
           ones left behind are moved ahead to the next new worlds; each fades in from GEN.SEE, so new space keeps appearing and the
           app never holds more than these. In the world's own frame (not the slowly turning cosmos), not solid: Misty flies into them. */
        const deep = new THREE.Group(); deep.visible = false; deep.name = 'cosmos-deep';
        const drnd = (() => { let sd = 9173; return () => (sd = (sd * 16807) % 2147483647) / 2147483647; })();
        const deepSlots = [];
        for (let i = 0; i < (small ? 8 : 12); i++) {
            const colA = SPK[RIMS[(i * 3 + 2) % RIMS.length]], colB = SPK[ACC[(i * 2 + 3) % ACC.length]], gi = new THREE.Group(); gi.visible = false;
            const m = new THREE.Mesh(sphereLo, membraneMat(colA.clone().multiplyScalar(0.6), colA, colB)); gi.add(m);
            const cA = ptsBuf(), nA = ptsBuf(), wV = [], wC = [];
            fillCell(drnd, cA, nA, wV, wC, 0, 0, 0, 1, colA, colB, small ? 14 : 22, small ? 14 : 20);
            const c = ptsObj(cA, cellTex, true, 5000, 6000, 0), nd = ptsObj(nA, glowTex, false, 5000, 6000, 0.35), w = webObj(wV, wC);
            gi.add(c); gi.add(nd); gi.add(w); deep.add(gi);
            gi.userData = { m, c, nd, w, key: -1, r: 1, p: i * 2.3 };
            deepSlots.push(gi);
        }
        scene.add(deep);
        return { deep, deepSlots, deepT: 0, g, mine, mineGlow, others, cells, nodes, web, threads, beads, sparkPts, sparks, paths, motes, stars, farCells, haze, freq, near, giants, S, tissue: new THREE.Color('#050f2a'), tmp: new THREE.Color() };
    }
    /* 0 inside the World Map, 1 out in the spirit world; the walls and the fog give way as the camera leaves our bubble */
    function cosmosStep(t, dt) {
        /* inside a galaxy bubble (galaxy-bubbles.js) the camera comes in close to Misty, but the spirit world must stay the spirit world
           (no bloodstream tube, no blue fog): rig.cosmosMin holds these looks at least at the galaxy's own camera distance */
        const d = Math.max(rig.dist, rig.cosmosMin || 0), homeish = rig.mode === 'home';
        const k = homeish ? smoothC((rig.maxD || 14) * 1.05, 120, d) : 0;
        if (k <= 0 && !cosmos) return;
        if (!cosmos) cosmos = buildCosmos();
        const C = cosmos, walls = smoothC((rig.maxD || 14) * 1.05, 44, d), mem = smoothC(30, 75, d), nearK = smoothC(120, 285, d);
        C.g.visible = k > 0.001;
        /* Oct 17: while Misty flies out in the galaxy (misty-galaxy.js) the other worlds and the currents between them stay clearly visible:
           at the galaxy's camera distance they used to be nearly invisible glass, so you could not see where to fly */
        cosmosGx += ((document.documentElement.classList.contains('mf-galaxy') ? 1 : 0) - cosmosGx) * Math.min(1, dt * 1.5);
        const far = Math.max(smoothC(55, 190, d), 0.72 * cosmosGx);
        if (k !== cosmosK) {
            cosmosK = k;
            const want = k > 0.001 ? 1600 : 120; if (want !== farNow) { farNow = want; camera.far = want; camera.updateProjectionMatrix(); }
            /* the tube of the bloodstream fades out completely past the World Map (it used to stay at 3%, a faint glass cylinder that
               stuck out of our bubble and, still writing depth, cut a straight-edged slice out of the bubbles behind it); while it fades
               it no longer writes depth, so it can never punch a hole in a membrane */
            const wo = 1 - walls; if (wallMat.transparent !== (wo < 0.999)) { wallMat.transparent = wo < 0.999; wallMat.depthWrite = !wallMat.transparent; wallMat.needsUpdate = true; } wallMat.opacity = wo; wall.visible = wo > 0.02;
            shafts.visible = walls < 0.9;
        }
        C.near.visible = C.g.visible && nearK > 0.01;
        if (!C.g.visible) C.deep.visible = false; /* limitless: the made-up worlds go with the cosmos */
        if (!C.g.visible) { return; }
        /* on the Community page the real members are the focus: the realm steps back a little behind them */
        const calm = document.documentElement.classList.contains('cg-spirit-on') ? 0.82 : 1, still = !!(reduceMq && reduceMq.matches), tt = still ? 0 : t;
        const sc = renderer.domElement.height * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        ptsList.forEach(p => { p.material.uniforms.uScale.value = sc; p.material.uniforms.uT.value = tt; });
        /* limitless spirit world (Oct 17): far out (Misty's galaxy flight, misty-galaxy.js) the worlds fade into the deep dark by the
           camera's distance from home, and are not drawn at all out there (battery); the stars and the far cells ride along with the
           camera like the sky (skyW), so where her flight loops round to the far side nothing in view jumps. At Home and behind
           Community, Cook, Move and Scan the camera stays within COSMOS.OUT: deep = 1, skyW = 0, everything exactly as before. */
        const camL = camera.position.length(), deep = 1 - smoothC(COSMOS.DEEP0, COSMOS.DEEP1, camL), skyW = smoothC(COSMOS.OUT + 20, COSMOS.DEEP0 - 100, camL);
        const dv = deep > 0.002, farW = far * deep, memW = mem * deep;
        if (C.deepOn !== dv) { C.deepOn = dv; [C.mine, C.mineGlow, C.cells, C.nodes, C.web, C.threads, C.beads, C.sparkPts, C.motes].concat(C.others, C.haze).forEach(o => { o.visible = dv; }); }
        skyTmp.copy(camera.position).applyAxisAngle(skyUp, -C.g.rotation.y).multiplyScalar(skyW); C.stars.position.copy(skyTmp); C.farCells.position.copy(skyTmp);
        deepStep(C, camL, dt, tt, calm);
        /* Oct 17 grocery hunt: a fresh shopping check-in makes your own world in the spirit realm glow a little brighter; the extra
           fades back to 0 when check-ins lapse (grocery-hunt.js, LowiGrocery.glow 0..1). 0 = exactly the look from before. */
        const shopK = window.LowiGrocery && typeof window.LowiGrocery.glow === 'function' ? Math.max(0, Math.min(1, +window.LowiGrocery.glow() || 0)) : 0;
        C.mine.material.uniforms.uO.value = memW * (0.9 + 0.1 * shopK); C.mine.material.uniforms.uT.value = tt;
        C.mineGlow.material.opacity = memW * (0.22 + 0.2 * shopK);
        C.others.forEach((o, i) => { const u = o.userData; o.scale.setScalar(u.r * (1 + 0.02 * Math.sin(tt * 0.6 + u.p))); o.material.uniforms.uO.value = farW * 0.8 * calm; o.material.uniforms.uT.value = tt + i; });
        C.cells.material.uniforms.uO.value = Math.max(memW * 0.5, farW) * calm;
        C.nodes.material.uniforms.uO.value = Math.max(memW * 0.5, farW) * 0.9 * calm;
        C.web.material.opacity = farW * 0.55 * calm;
        C.threads.material.opacity = farW * 0.55 * calm; C.beads.material.uniforms.uO.value = farW * 0.9 * calm;
        C.sparkPts.material.uniforms.uO.value = still ? 0 : farW * calm;
        if (!still && farW > 0.01) {
            const pa = C.sparkPts.geometry.attributes.position, S = C.S;
            C.sparks.forEach((s, i) => { const P = C.paths[s.j].arr, u = (((t * s.s + s.o) % 1) + 1) % 1, f = u * (S - 1), k0 = Math.floor(f), k1 = Math.min(S - 1, k0 + 1), w = f - k0;
                pa.setXYZ(i, P[k0 * 3] + (P[k1 * 3] - P[k0 * 3]) * w, P[k0 * 3 + 1] + (P[k1 * 3 + 1] - P[k0 * 3 + 1]) * w, P[k0 * 3 + 2] + (P[k1 * 3 + 2] - P[k0 * 3 + 2]) * w); });
            pa.needsUpdate = true;
        }
        C.motes.material.uniforms.uO.value = memW * 0.85; C.stars.material.uniforms.uO.value = far * 0.8; C.farCells.material.uniforms.uO.value = far * 0.7 * calm;
        C.haze.forEach(h => { h.material.opacity = farW * 0.05; });
        /* the light frequency takes over from the tube as it fades */
        const fo = smoothC(0.3, 1, walls) * 0.6 * calm;
        C.freq.visible = fo > 0.005; C.freq.children.forEach(m => { m.material.uniforms.uO.value = fo; m.material.uniforms.uT.value = tt; });
        if (!dv) C.freq.visible = false; /* limitless: out in the deep our bubble's light frequency is not drawn either */
        C.g.rotation.y += dt * 0.004;
        if (C.near.visible) {
            /* screen space: they come in from right past the camera while it pulls out (and go back out when it dives in), then sway with
               the camera's turn more than anything else, so they read as the closest layer */
            C.near.position.copy(camera.position); C.near.quaternion.copy(camera.quaternion);
            const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), asp = camera.aspect || 0.5, yaw = rig.yaw + rig.gy;
            C.giants.forEach((gi, i) => {
                const u = gi.userData, n = u.n, D = 130 * (0.42 + 0.58 * nearK), hh = D * th, hw = hh * Math.max(asp, 0.46);
                const r = n[2] * hh * Math.min(1.25, Math.max(0.85, 1 / Math.max(asp, 0.46) * 0.6));
                gi.position.set(n[0] * hw + Math.sin(yaw * 0.9 + u.p) * 0.1 * hw, n[1] * hh + Math.sin(tt * 0.05 + u.p) * 0.03 * hh, -D);
                gi.scale.setScalar(r); gi.rotation.y = tt * 0.02 + u.p;
                const o = nearK * 0.62 * calm;
                u.m.material.uniforms.uO.value = o; u.m.material.uniforms.uT.value = tt + u.p;
                u.c.material.uniforms.uSz.value = r; u.nd.material.uniforms.uSz.value = r;
                u.c.material.uniforms.uO.value = o * 0.8; u.nd.material.uniforms.uO.value = o * 0.8; u.w.material.opacity = o * 0.5;
            });
        }
        /* the tissue between the bubbles: the background and the fog turn from the bloodstream's blue into the deep dark of the realm */
        curBg.lerp(C.tissue, walls * 0.88); scene.background.copy(curBg); scene.fog.color.copy(curBg);
        scene.fog.density = baseFog + (0.0011 - baseFog) * walls;
    }
    function step(dt) {
        const wdt = dt * worldSpeed();
        t += wdt;
        /* camera */
        if (rig.fly) {
            rig.fly.t += dt; const k = ease(Math.min(1, rig.fly.t / rig.fly.dur));
            rig.target.lerpVectors(rig.fly.from.t, rig.fly.to.t, k); rig.dist = rig.fly.from.d + (rig.fly.to.d - rig.fly.from.d) * k;
            if (rig.flyYaw) rig.yaw = rig.flyYaw.from + (rig.flyYaw.to - rig.flyYaw.from) * k;
            if (rig.fly.t >= rig.fly.dur) rig.fly = null;
        } else {
            rig.yaw += rig.vy * dt * 3.2; rig.pitch += rig.vp * dt * 3.2;
            const damp = Math.pow(0.04, dt); rig.vy *= damp; rig.vp *= damp;
            rig.idle += dt;
            /* Oct 16 (E-man: "when you open the community section, it takes about 4 seconds until the background starts playing, where
               we're seeing everything circle each other. That's a lag"): the slow orbit that makes the worlds circle each other used to
               wait for 6 s of stillness, and the pull-out keeps resetting that clock, so Community sat frozen for seconds. Out in the
               spirit world behind a page (Community, Cook, Move, Scan) it runs from the first frames of the pull-out, easing in over
               ~0.2 s so it never jerks. Home (idle > 6 s) is unchanged; reduced motion keeps the old wait. */
            rig.drift += ((realmBack() ? 1 : 0) - rig.drift) * Math.min(1, dt * 5);
            const spin = rig.idle > 6 ? 1 : rig.drift;
            if (spin > 0.001) rig.yaw += dt * (rig.mode === 'home' ? 0.05 : 0.025) * spin;
        }
        rig.pitch = Math.max(-rig.pMax, Math.min(rig.pMax, rig.pitch));
        rig.gy += (rig.gyT - rig.gy) * Math.min(1, dt * 8); rig.gp += (rig.gpT - rig.gp) * Math.min(1, dt * 8);
        const yaw = rig.yaw + rig.gy, pitch = Math.max(-1.35, Math.min(1.35, rig.pitch + rig.gp));
        camera.position.set(rig.target.x + rig.dist * Math.cos(pitch) * Math.sin(yaw), rig.target.y + rig.dist * Math.sin(pitch), rig.target.z + rig.dist * Math.cos(pitch) * Math.cos(yaw));
        camera.lookAt(rig.target);
        /* flow */
        for (let i = 0; i < RBC; i++) {
            const c = rb[i]; c.x += c.v * wdt; if (c.x > 40) c.x -= 80;
            tmpE.set(c.ax + t * 0.35 * c.w, c.ay + t * 0.22, 0); tmpQ.setFromEuler(tmpE); tmpS.setScalar(c.s); tmpP.set(c.x, c.y + Math.sin(t * 0.5 + c.ax) * 0.15, c.z);
            tmpM.compose(tmpP, tmpQ, tmpS); rbc.setMatrixAt(i, tmpM);
        }
        rbc.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < PLT; i++) { const c = pl[i]; c.x += c.v * wdt; if (c.x > 40) c.x -= 80; tmpM.makeTranslation(c.x, c.y, c.z); plat.setMatrixAt(i, tmpM); }
        plat.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < PN; i++) { let x = pPos[i * 3] + pVel[i] * wdt; if (x > 40) x -= 80; pPos[i * 3] = x; }
        pGeo.attributes.position.needsUpdate = true;
        wbcs.forEach(m => { m.position.x += m.userData.v * wdt; if (m.position.x > 40) m.position.x -= 80; m.rotation.y += wdt * 0.2; });
        shafts.children.forEach(m => { m.material.opacity = m.material.opacity; m.rotation.y = Math.sin(t * 0.1 + m.userData.p) * 0.3; });
        shafts.position.x = Math.sin(t * 0.05) * 2;
        /* cell */
        glow += (glowT - glow) * Math.min(1, dt * 2); memU.uGlow.value = glow; memU.uT.value = t;
        const br = 1 + 0.015 * Math.sin(t * 1.55); cell.scale.setScalar(br); cell.rotation.y += wdt * 0.12; cell.position.y = Math.sin(t * 0.7) * 0.06;
        halo.material.opacity = (theme === 'light' ? 0.16 : 0.24) + glow * 0.18;
        mitos.forEach(m => { const u = m.userData; const a = u.a + t * u.s; m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 0.9 + u.a) * 0.06, Math.sin(a) * u.r); m.rotation.set(a, a * 0.7, 0.4); });
        vesicles.forEach(m => { const u = m.userData; const a = u.a - t * u.s; m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a) * 0.05, Math.sin(a) * u.r); });
        tend += (tendT - tend) * Math.min(1, dt * 1.2);
        Object.values(beacons).forEach((b, i) => {
            b.ring.rotation.x = t * 0.6 + i; b.ring.rotation.y = t * 0.4; const s = (2.2 + Math.sin(t * 1.6 + i) * 0.25) * (1 + 0.45 * tend); b.glow.scale.set(s, s, 1);
            b.glow.material.opacity = 0.85 + 0.15 * tend; b.ring.material.opacity = 0.7 + 0.3 * tend; const rs = 1 + 0.3 * tend; b.ring.scale.set(rs, rs, rs);
            b.core.material.color.copy(b.hue).lerp(tendWhite, 0.4 * tend);
        });
        /* place tint */
        tintAmt += (tintT - tintAmt) * Math.min(1, dt * 2.5);
        curBg.copy(baseBg); if (tint && tintAmt > 0.001) curBg.lerp(tint, tintAmt * (theme === 'light' ? 0.5 : 0.35));
        scene.background.copy(curBg); scene.fog.color.copy(curBg);
        cosmosStep(t, dt);
    }
    function frame(now) {
        raf = 0; if (!running) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
        frames.push(dt); if (frames.length > 90) frames.shift();
        if (frames.length >= 90) {
            const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
            /* Oct 17 (E-man: the bubbles look "pixely"): this used to step down to 1x and never come back. On a 3x iPhone that is a
               3x stretched canvas with no antialias (antialias is off at dpr >= 2), so every living bubble went jagged - and a phone
               in Low Power Mode (30 Hz) or a warm phone always tripped it. Now it never goes below dprFloor (1.5 on retina screens)
               and climbs back to full sharpness after a few smooth seconds. */
            /* Oct 17 (E-man, flat blue screen while leaving a world): a sharpness change resizes the canvas, which wipes the picture.
               Never during a world transition (the heaviest frames, so the likeliest moment for it), and when it happens the picture
               is drawn again in the same screen refresh (paintNow), never left blank for a skipped one. */
            if (inTransit()) { lowFor = 0; hiFor = 0; }
            else if (avg > 1 / 38 && dpr > dprFloor) { lowFor += dt; hiFor = 0; if (lowFor > 2) { dprDropAt = now; dpr = Math.max(dprFloor, dpr - 0.25); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); paintNow = true; lowFor = 0; frames = []; } }
            else if (avg < 1 / 50 && dpr < dprTop && now - dprDropAt > 20000) { lowFor = 0; hiFor += dt; if (hiFor > 4) { dpr = Math.min(dprTop, dpr + 0.25); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); paintNow = true; hiFor = 0; frames = []; } }
            else { lowFor = 0; hiFor = 0; }
        }
        /* Oct 16 speed pass (E-man: the newest iPhone overheats): nobody touching, no camera flight, no Community warp, no gyro swing,
           only the slow drift of the bloodstream moving = draw every second screen refresh (about 30 a second). Time still runs at full
           speed (the skipped refresh's time is added to the next one), so it looks the same, at half the GPU work. A touch, a glide or a
           tilt brings back every frame at once. The DPR watcher above still sees every refresh, so this never lowers the sharpness. */
        acc += dt;
        odd = calm(now) && !paintNow && !inTransit() ? !odd : false;
        paintNow = false;
        if (!odd) {
            if (!opts.shouldRender || opts.shouldRender()) { const d = Math.min(0.1, acc); step(d); frameFns.forEach(fn => { try { fn(d, now); } catch (e) { console.warn('world3d onFrame', e && e.message); } }); renderer.render(scene, camera); }
            acc = 0;
        }
        raf = requestAnimationFrame(frame);
    }
    let acc = 0, odd = false, lastIn = 0;
    /* a world transition is running (a fly-to / leaving a place: body-world-regions.js html.bwr-warping; Misty going through a wall,
       flying out, falling or warping: misty-flight.js html.mf-transit): every refresh is drawn and the canvas size is left alone */
    /* ... and for 2 s after the camera crosses our own membrane into the spirit world or back (world-home.js html.wh-cosmos), the
       other moment where a lot of new scenery appears at once (E-man: the same blank blue there) */
    let cosOn = null, cosAt = -1e9;
    function inTransit() {
        const E = typeof document !== 'undefined' && document.documentElement; if (!E) return false;
        const c = E.className, now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const cos = /(^|\s)wh-cosmos(\s|$)/.test(c); if (cos !== cosOn) { if (cosOn !== null) cosAt = now; cosOn = cos; }
        return /(^|\s)(bwr-warping|mf-transit)(\s|$)/.test(c) || now - cosAt < 2000;
    }
    const markIn = () => { lastIn = performance.now(); };
    try { ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel', 'keydown'].forEach(ev => window.addEventListener(ev, markIn, { passive: true, capture: true })); } catch (e) { }
    function calm(now) {
        if (now - lastIn < 2500 || rig.fly) return false;
        if (Math.abs(rig.vy) + Math.abs(rig.vp) > 0.002 || Math.abs(rig.gyT - rig.gy) + Math.abs(rig.gpT - rig.gp) > 0.002) return false;
        const H = typeof document !== 'undefined' && document.documentElement;
        return !(H && /(^|\s)gx-(in|out|hold)(\s|$)/.test(H.className));
    }
    function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function fps() { if (!frames.length) return 0; return Math.round(frames.length / frames.reduce((a, b) => a + b, 0)); }
    function renderOnce() { step(0.016); renderer.render(scene, camera); }
    /* the camera is out past the World Map (spirit world) and the world is the layer under a page (html.wb-on: Community, Cook...) */
    function realmBack() {
        if (rig.mode !== 'home' || !(rig.dist > (rig.maxD || 13) * 1.06) || (reduceMq && reduceMq.matches)) return false;
        return typeof document !== 'undefined' && document.documentElement.classList.contains('wb-on');
    }
    /* Oct 16 (the 4 s Community lag): build the spirit world and get its GPU programs and textures ready ahead of time, while Home
       is idle, so the first pull-out to Community does not stall on building ~40 cell-spheres and compiling their shaders.
       Everything is made visible only for the compile and hidden again; nothing is drawn, Home looks exactly the same. */
    let warmed = false;
    function warm() {
        if (warmed) return true;
        if (!cosmos) cosmos = buildCosmos();
        const C = cosmos, gv = C.g.visible, nv = C.near.visible, tr = wallMat.transparent, dw = wallMat.depthWrite, texs = new Set();
        C.g.visible = true; C.near.visible = true;
        try {
            [C.g, C.near].forEach(o => o.traverse(m => { const mt = m.material; if (!mt) return; if (mt.map) texs.add(mt.map); const u = mt.uniforms || {}; Object.keys(u).forEach(k => { const v = u[k] && u[k].value; if (v && v.isTexture) texs.add(v); }); }));
            if (renderer.initTexture) texs.forEach(tx => { try { renderer.initTexture(tx); } catch (e) { } });
            renderer.compile(scene, camera);
            /* the tube's see-through variant, used while it fades on the way out */
            wallMat.transparent = true; wallMat.depthWrite = false; wallMat.needsUpdate = true; renderer.compile(scene, camera);
        } catch (e) { } finally {
            wallMat.transparent = tr; wallMat.depthWrite = dw; wallMat.needsUpdate = true;
            C.g.visible = gv; C.near.visible = nv;
        }
        warmed = true; return true;
    }
    function dispose() { stop(); renderer.dispose(); }
    setTheme(opts.theme || 'dark');
    return { scene, camera, hub, regions, onFrame, memU, resize, setFocus, setMode, drag, release, zoom, setGyro, setGlow, setTend, beaconLook, setTheme, flyTo, pick, project, start, stop, fps, renderOnce, warm, get warmed() { return warmed; }, dispose, get running() { return running; }, get dpr() { return dpr; }, rig, renderer };
}
