/* LOWiSPIKE real 3D body world: the WebGL scene (three.js, vendored). Loaded lazily by body-world-3d.js.
   Look: VISUAL-MASTER.md (navy fog depth from Cellscape VR, friendly cell from "What is a Cell?", glow language from Kurzgesagt).
   The user's see-through cell floats in the middle of a 360 bloodstream: flowing red cells (instanced), plasma particles,
   light shafts, exponential fog. Orbit with drag, pinch/wheel zoom, gyro offsets, glides to body places. */
export function createWorld(THREE, canvas, opts) {
    opts = opts || {};
    const small = !!opts.small, places = opts.places || [];
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, alpha: false, powerPreference: 'high-performance', stencil: false });
    let dprCap = opts.dprCap || 2, dpr = Math.min(window.devicePixelRatio || 1, dprCap);
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
    const memU = { uIn: { value: new THREE.Color('#3a9fe0') }, uRim: { value: new THREE.Color('#9b87d2') }, uHi: { value: new THREE.Color('#8fe7ff') }, uGlow: { value: 0.55 }, uBase: { value: 0.1 }, uT: { value: 0 } };
    const memMat = new THREE.ShaderMaterial({
        uniforms: memU, transparent: true, depthWrite: false,
        vertexShader: 'uniform float uT;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec3 p=position*(1.0+0.025*sin(uT*1.6+position.y*3.0)+0.018*sin(uT*1.1+position.x*4.0));vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=position;gl_Position=projectionMatrix*mv;}',
        fragmentShader: 'uniform vec3 uIn;uniform vec3 uRim;uniform vec3 uHi;uniform float uGlow;uniform float uBase;uniform float uT;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0);vec3 c=mix(uIn,uRim,f);c=mix(c,uHi,pow(f,5.0)*0.8);float shimmer=0.5+0.5*sin(vP.y*9.0+uT*0.8+sin(vP.x*7.0));float a=uBase+f*(0.55+0.45*uGlow)+shimmer*0.04;gl_FragColor=vec4(c*(0.75+0.6*uGlow),clamp(a,0.0,0.95));\n#include <colorspace_fragment>\n}'
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
    const rig = { yaw: 0.35, pitch: 0.12, dist: 6.5, vy: 0, vp: 0, gy: 0, gp: 0, gyT: 0, gpT: 0, target: new THREE.Vector3(), mode: 'full', minD: 2.4, maxD: 13, pMax: 1.2, homeDist: 3.2, idle: 0, fly: null };
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
    function resize(w, h) { const nw = Math.max(1, w | 0), nh = Math.max(1, h | 0); if (nw !== W || nh !== H) { W = nw; H = nh; renderer.setSize(W, H, false); } applyView(); }
    function setFocus(f) { focus = f; applyView(); }
    function homeDistFor(px) { return CR / ((px / (H / 2)) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }
    function setMode(m, o) {
        o = o || {};
        if (m === 'home') {
            /* Home IS the world: drag orbits freely, two fingers zoom from Misty close-up out to the whole world.
               A re-layout keeps the current zoom (scaled to the new size) instead of snapping back to Misty. */
            const was = rig.mode === 'home' && rig.homeDist > 0 && rig.lastHome ? rig.dist / rig.homeDist : 1;
            rig.homeDist = homeDistFor(o.radiusPx || 100); rig.lastHome = true;
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
    function zoom(f) {
        /* past the World Map (Home only, while rig.outer is on): the same pinch keeps going, like Google Earth, and moves faster the
           farther out it is, so the spirit world is one or two pinches away and not twenty */
        if (rig.mode === 'home' && rig.outer && (rig.dist >= rig.maxD * 0.999 && f > 1 || rig.dist > rig.maxD)) {
            const over = Math.max(1, rig.dist / rig.maxD), g = 1 + Math.min(2.2, Math.log(over) * 0.9 + 0.6);
            const nd = rig.dist * Math.pow(f, g);
            rig.dist = Math.min(COSMOS.OUT, nd < rig.maxD && f < 1 ? Math.max(rig.minD, Math.max(rig.maxD * 0.999, nd)) : Math.max(rig.minD, nd)); rig.idle = 0; return;
        }
        rig.dist = Math.min(rig.maxD, Math.max(rig.minD, rig.dist * f)); rig.idle = 0;
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
        const to = b ? { t: b.pos.clone().multiplyScalar(0.92), d: 2.6 } : { t: new THREE.Vector3(), d: rig.mode === 'home' ? (rig.homeDist || 3.2) : 6.5 }; /* back home on Home: Misty's own framing */
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
       worlds, each with its own companion glow) hang in soft connective tissue, joined by fibres. Built on first use, hidden (and
       costing nothing) until the camera is past the World Map. Not a starfield: no stars, no planets, no purple, no gold. */
    let baseFog = PAL.dark.fog;
    const COSMOS = { R: 46, OUT: 300, N: small ? 7 : 10 };
    rig.outerD = COSMOS.OUT;
    let cosmos = null, cosmosK = -1, farNow = 120;
    const smoothC = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    function membraneMat(col, rim) {
        return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
            uniforms: { uCol: { value: new THREE.Color(col) }, uRim: { value: new THREE.Color(rim) }, uO: { value: 0 }, uT: { value: 0 } },
            vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }',
            fragmentShader: 'uniform vec3 uCol; uniform vec3 uRim; uniform float uO; uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = 1.0 - abs(dot(vN, vV)); float rim = pow(f, 2.6); float veins = 0.5 + 0.5 * sin(vP.x * 0.21 + uT * 0.4) * sin(vP.y * 0.17 - uT * 0.3) * sin(vP.z * 0.19 + uT * 0.25); vec3 c = mix(uCol * 0.18, uRim, rim) + uRim * veins * rim * 0.35; gl_FragColor = vec4(c, (0.05 + rim * 0.95) * uO); }' });
    }
    function buildCosmos() {
        const g = new THREE.Group(); g.visible = false; g.name = 'cosmos';
        const rnd = (() => { let sd = 4242; return () => (sd = (sd * 16807) % 2147483647) / 2147483647; })();
        /* our own membrane: Misty blue */
        const sphere = new THREE.SphereGeometry(1, small ? 40 : 56, small ? 28 : 40);
        const mine = new THREE.Mesh(sphere, membraneMat('#396b9c', '#a8dcff')); mine.scale.setScalar(COSMOS.R); g.add(mine);
        const mineGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#6fc8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); mineGlow.scale.set(COSMOS.R * 1.6, COSMOS.R * 1.6, 1); g.add(mineGlow);
        /* the other worlds: aura colours of companions (mint, rose, sky, coral, aqua, sea-green, peach), each a membrane with a sanctuary glow,
           a few cells drifting inside and its companion's bright core */
        /* palette taken from E-man's spirit-world picture: pale cyan, blues, soft lavender, plus a few warm companion auras */
        const hues = ['#a2bcc9', '#7fb8ff', '#9d8ac9', '#8fd0ff', '#7fe3d0', '#7d8eb2', '#ff9fb4', '#b8d8f0', '#896da2', '#5fc0f0'];
        const others = [];
        for (let i = 0; i < COSMOS.N; i++) {
            const a = i * 2.399963 + 0.7, ring = 150 + (i % 3) * 55 + rnd() * 40, y = (rnd() - 0.5) * 120, r = 26 + rnd() * 22, col = hues[i % hues.length];
            const o = new THREE.Group(); o.position.set(Math.cos(a) * ring, y, Math.sin(a) * ring);
            const m = new THREE.Mesh(sphere, membraneMat(col, col)); m.scale.setScalar(r); o.add(m);
            const sanct = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); sanct.scale.set(r * 1.5, r * 1.5, 1); o.add(sanct);
            const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); core.scale.set(r * 0.42, r * 0.42, 1); o.add(core);
            const cells = [];
            for (let k = 0; k < 6; k++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); const s = r * (0.12 + rnd() * 0.1); c.scale.set(s, s, 1); c.userData = { a: rnd() * 6.283, r: r * (0.3 + rnd() * 0.45), s: 0.15 + rnd() * 0.25, y: (rnd() - 0.5) * r * 0.6 }; o.add(c); cells.push(c); }
            o.userData = { m, sanct, core, cells, r, p: rnd() * 6.283 };
            g.add(o); others.push(o);
        }
        /* connective tissue: soft fibres from our membrane to each neighbour and between neighbours, plus slow motes in between */
        const fib = []; const curve = (p, q, bend) => { const mid = p.clone().add(q).multiplyScalar(0.5).add(new THREE.Vector3((rnd() - 0.5) * bend, (rnd() - 0.5) * bend, (rnd() - 0.5) * bend)); const pts = new THREE.QuadraticBezierCurve3(p, mid, q).getPoints(18); for (let j = 0; j < pts.length - 1; j++) fib.push(pts[j], pts[j + 1]); };
        const surf = (from, to, rad) => from.clone().add(to.clone().sub(from).normalize().multiplyScalar(rad));
        const O = new THREE.Vector3();
        others.forEach((o, i) => {
            curve(surf(O, o.position, COSMOS.R), surf(o.position, O, o.userData.r), 60);
            const n = others[(i + 1) % others.length]; curve(surf(o.position, n.position, o.userData.r), surf(n.position, o.position, n.userData.r), 70);
            if (i % 2 === 0) { const n2 = others[(i + 3) % others.length]; curve(surf(o.position, n2.position, o.userData.r), surf(n2.position, o.position, n2.userData.r), 90); }
        });
        const fGeo = new THREE.BufferGeometry().setFromPoints(fib);
        const fMat = new THREE.LineBasicMaterial({ color: '#8fa6cc', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const fibres = new THREE.LineSegments(fGeo, fMat); g.add(fibres);
        const MN = small ? 260 : 420, mPos = new Float32Array(MN * 3);
        for (let i = 0; i < MN; i++) { const rr = 70 + rnd() * 420, th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1); mPos[i * 3] = rr * Math.sin(ph) * Math.cos(th); mPos[i * 3 + 1] = rr * Math.cos(ph) * 0.6; mPos[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th); }
        const mGeo = new THREE.BufferGeometry(); mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
        const mMat = new THREE.PointsMaterial({ map: glowTex, color: '#a2bcc9', size: 3.2, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const motes = new THREE.Points(mGeo, mMat); g.add(motes);
        /* tissue haze: a few very large, very faint veils (deep blue and a little lavender, from the picture), like looking through living tissue */
        const haze = [];
        for (let i = 0; i < 6; i++) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: i % 3 === 2 ? '#5b4588' : '#214072', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); const a = i * 1.1; h.position.set(Math.cos(a) * 260, (rnd() - 0.5) * 160, Math.sin(a) * 260); const sc = 260 + rnd() * 200; h.scale.set(sc, sc, 1); g.add(h); haze.push(h); }
        scene.add(g);
        return { g, mine, mineGlow, others, fibres, motes, haze, tissue: new THREE.Color('#071635'), tmp: new THREE.Color() };
    }
    /* Oct 16 (task 1 rework, E-man: "each bubble holds that person's cells and companion; way out there the companions gather and float
       like gods"): once the Community roster is known (LowiCommunity.people), every outer bubble gets one person: their companion
       (the same little figure as on the Community map, drawn from its SVG) floating in the middle, their cells in their aura colour
       and as many as their level earns, and their name. Beyond all the bubbles, the Community realm: everyone's companions on a slow
       halo, big and bright, always at the far side of the view. */
    const formCache = new Map();
    const toCol = c => { const m = /hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(c || ''); const k = new THREE.Color(); if (m) k.setHSL(+m[1] / 360, +m[2] / 100, +m[3] / 100); else { try { k.set(c || '#9cdac7'); } catch (e) { k.set('#9cdac7'); } } return k; };
    function formTex(p) {
        if (formCache.has(p.uid)) return formCache.get(p.uid);
        const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; formCache.set(p.uid, tex);
        const plain = () => { const g = x.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, p.color); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); tex.needsUpdate = true; };
        const m = /<svg[\s\S]*<\/svg>/.exec(p.form || ''); if (!m) { plain(); return tex; }
        let svg = m[0].replace(/var\(--c\)/g, p.color);
        if (!/^<svg[^>]*xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        if (!/^<svg[^>]*\swidth=/.test(svg)) svg = svg.replace('<svg', '<svg width="' + S + '" height="' + S + '"');
        const im = new Image();
        im.onload = () => { try { x.drawImage(im, 0, 0, S, S); tex.needsUpdate = true; } catch (e) { plain(); } };
        im.onerror = plain; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        return tex;
    }
    const cellTex = (() => { const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
        const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.18, 'rgba(255,255,255,.75)'); g.addColorStop(0.26, 'rgba(255,255,255,.12)');
        g.addColorStop(0.66, 'rgba(255,255,255,.16)'); g.addColorStop(0.8, 'rgba(255,255,255,.7)'); g.addColorStop(0.9, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, S, S); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    function nameTex(n) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
        x.font = '600 30px -apple-system, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 8;
        x.fillStyle = 'rgba(235,245,255,.95)'; x.fillText(String(n || '').slice(0, 16), 128, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
    const addSprite = (parent, map, color, sz, add) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); sp.scale.set(sz, sz, 1); parent.add(sp); return sp; };
    function dressCosmos(C, people) {
        const others = people.filter(p => !p.me);
        if (!others.length) return false;
        C.others.forEach((o, i) => {
            const u = o.userData, p = others[i % others.length], col = toCol(p.color);
            u.person = p.uid;
            u.sanct.material.color.copy(col); u.core.material.color.copy(col); u.core.scale.set(u.r * 0.9, u.r * 0.9, 1);
            /* their companion in the middle of their world */
            u.mate = addSprite(o, formTex(p), '#ffffff', u.r * 0.62, false); u.mate.renderOrder = 3;
            /* their cells, in their aura colour, as many as their level earns */
            u.cells.forEach(c => { o.remove(c); c.material.dispose(); });
            const n = Math.min(small ? 8 : 12, 4 + Math.round(Math.sqrt(p.lv || 1) * 1.6)); u.cells = [];
            for (let k = 0; k < n; k++) { const c = addSprite(o, cellTex, col.clone().lerp(new THREE.Color('#ffffff'), 0.25 * (k % 3)), u.r * (0.13 + 0.05 * ((k * 7) % 4)), true); c.userData = { a: k * 2.399 + u.p, r: u.r * (0.38 + 0.14 * ((k * 5) % 4)), y: (((k * 37) % 11) / 11 - 0.5) * u.r * 0.9, s: 0.12 + 0.05 * (k % 3) }; u.cells.push(c); }
            const lab = addSprite(o, nameTex(p.name), '#ffffff', 1, false); lab.scale.set(u.r * 0.9, u.r * 0.225, 1); lab.position.set(0, -u.r * 1.18, 0); u.label = lab;
        });
        /* the Community realm: every companion, the user's too, floating on a slow halo far beyond the bubbles */
        const realm = new THREE.Group(); realm.name = 'community-realm';
        const halo = addSprite(realm, glowTex, '#9fc6ff', 520, true);
        const gods = people.slice(0, small ? 20 : 31).map((p, i, all) => {
            const sp = addSprite(realm, formTex(p), '#ffffff', p.me ? 46 : 38, false); sp.renderOrder = 4;
            const aura = addSprite(realm, glowTex, toCol(p.color), p.me ? 120 : 96, true);
            sp.userData = { a: (i / all.length) * 6.283, y: ((i * 37) % 13 / 13 - 0.5) * 70, rr: 150 + (i % 3) * 34, p: i * 1.7, aura };
            return sp;
        });
        /* far beyond the fog: the realm keeps its light (no fog on it) */
        realm.traverse(o => { if (o.material) o.material.fog = false; });
        C.g.add(realm); C.realm = { g: realm, halo, gods };
        return true;
    }
    const realmDir = new THREE.Vector3();
    /* 0 inside the World Map, 1 out in the spirit world; the walls and the fog give way as the camera leaves our bubble */
    function cosmosStep(t, dt) {
        const d = rig.dist, homeish = rig.mode === 'home';
        const k = homeish ? smoothC((rig.maxD || 14) * 1.05, 120, d) : 0;
        if (k <= 0 && !cosmos) return;
        if (!cosmos) cosmos = buildCosmos();
        const C = cosmos, walls = smoothC((rig.maxD || 14) * 1.05, 44, d), mem = smoothC(30, 75, d), far = smoothC(55, 190, d);
        C.g.visible = k > 0.001;
        if (k !== cosmosK) {
            cosmosK = k;
            const want = k > 0.001 ? 1500 : 120; if (want !== farNow) { farNow = want; camera.far = want; camera.updateProjectionMatrix(); }
            const wo = 1 - walls * 0.97; if (wallMat.transparent !== (wo < 0.999)) { wallMat.transparent = wo < 0.999; wallMat.needsUpdate = true; } wallMat.opacity = wo; wall.visible = wo > 0.02;
            shafts.visible = walls < 0.9;
        }
        if (!C.g.visible) { return; }
        C.mine.material.uniforms.uO.value = mem * 0.9; C.mine.material.uniforms.uT.value = t;
        C.mineGlow.material.opacity = mem * 0.22;
        if (!C.dressed && t - (C.tryT || -9) > 1.2) {
            C.tryT = t; try { const L = window.LowiCommunity, ps = L && L.people ? L.people() : []; if (ps.length) C.dressed = dressCosmos(C, ps); } catch (e) { C.dressed = true; }
        }
        C.others.forEach((o, i) => {
            const u = o.userData, wob = 1 + 0.02 * Math.sin(t * 0.6 + u.p);
            if (u.mate) { u.mate.material.opacity = far * 0.95; u.mate.position.y = Math.sin(t * 0.7 + u.p) * u.r * 0.06; u.label.material.opacity = far * 0.85; }
            u.m.scale.setScalar(u.r * wob); u.m.material.uniforms.uO.value = far * 0.85; u.m.material.uniforms.uT.value = t + i;
            u.sanct.material.opacity = far * 0.3; u.core.material.opacity = far * (0.75 + 0.25 * Math.sin(t * 1.3 + u.p));
            u.cells.forEach(c => { const q = c.userData, a = q.a + t * q.s; c.position.set(Math.cos(a) * q.r, q.y + Math.sin(t * 0.5 + q.a) * 2, Math.sin(a) * q.r); c.material.opacity = far * 0.55; });
            o.position.y += Math.sin(t * 0.2 + u.p) * dt * 0.8;
        });
        if (C.realm) {
            /* always at the far side of the view, beyond every bubble; on the Community page the real companions are in front, so it stays faint */
            const R = C.realm, on = smoothC(150, 290, d) * (document.documentElement.classList.contains('cg-spirit-on') ? 0.35 : 1);
            R.g.visible = on > 0.01;
            if (R.g.visible) {
                realmDir.copy(rig.target).sub(camera.position).normalize();
                R.g.position.copy(realmDir).multiplyScalar(560).add(rig.target); R.g.position.y += 70; R.g.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -C.g.rotation.y);
                R.halo.material.opacity = on * 0.16;
                R.gods.forEach(sp => { const q = sp.userData, a = q.a + t * 0.03; sp.position.set(Math.cos(a) * q.rr, q.y + Math.sin(t * 0.4 + q.p) * 6, Math.sin(a) * q.rr * 0.35);
                    sp.material.opacity = on; q.aura.position.copy(sp.position); q.aura.material.opacity = on * (0.22 + 0.08 * Math.sin(t * 1.1 + q.p)); });
            }
        }
        C.fibres.material.opacity = far * 0.28; C.motes.material.opacity = mem * 0.5; C.haze.forEach(h => { h.material.opacity = far * 0.05; });
        C.g.rotation.y += dt * 0.004;
        /* the tissue between the bubbles: the background and the fog turn from the bloodstream's blue into deep tissue teal, and thin out */
        curBg.lerp(C.tissue, walls * 0.85); scene.background.copy(curBg); scene.fog.color.copy(curBg);
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
            if (rig.idle > 6) rig.yaw += dt * (rig.mode === 'home' ? 0.05 : 0.025);
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
            if (avg > 1 / 38 && dpr > 1) { lowFor += dt; if (lowFor > 2) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); lowFor = 0; frames = []; } } else lowFor = 0;
        }
        if (!opts.shouldRender || opts.shouldRender()) { step(dt); frameFns.forEach(fn => { try { fn(dt, now); } catch (e) { console.warn('world3d onFrame', e && e.message); } }); renderer.render(scene, camera); }
        raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function fps() { if (!frames.length) return 0; return Math.round(frames.length / frames.reduce((a, b) => a + b, 0)); }
    function renderOnce() { step(0.016); renderer.render(scene, camera); }
    function dispose() { stop(); renderer.dispose(); }
    setTheme(opts.theme || 'dark');
    return { scene, camera, hub, regions, onFrame, memU, resize, setFocus, setMode, drag, release, zoom, setGyro, setGlow, setTend, beaconLook, setTheme, flyTo, pick, project, start, stop, fps, renderOnce, dispose, get running() { return running; }, get dpr() { return dpr; }, rig, renderer };
}
