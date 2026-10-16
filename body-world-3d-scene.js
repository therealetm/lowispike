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
    /* microbe buddies bob next to the gut */
    /* hub for other builds (regions, cell ride, living cell) to add their meshes */
    const hub = new THREE.Group(); hub.name = 'lowi-hub'; scene.add(hub);
    const regions = places.map(p => ({ id: p.id, pos: beacons[p.id].pos.clone(), hue: p.hue }));
    const frameFns = new Set();
    function onFrame(fn) { if (typeof fn !== 'function') return () => {}; frameFns.add(fn); return () => frameFns.delete(fn); }
    const microbes = [];
    const gut = beacons.gut;
    if (gut) {
        const eyeMat = new THREE.MeshBasicMaterial({ color: '#0b102a' });
        [['#2ef8b6', 0], ['#9feb25', 2.1], ['#8fe7ff', 4.2]].forEach(([c, ph], i) => {
            const m = new THREE.Group();
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.4 }));
            body.scale.set(1.25, 0.9, 1);
            const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat), e2 = e1.clone();
            e1.position.set(-0.08, 0.05, 0.19); e2.position.set(0.08, 0.05, 0.19);
            m.add(body, e1, e2); m.userData = { ph, base: gut.pos.clone().add(new THREE.Vector3(Math.cos(ph) * 0.95, 0.45 * Math.sin(ph * 1.7), Math.sin(ph) * 0.95)) };
            scene.add(m); microbes.push(m);
        });
    }

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
            rig.dist = Math.min(rig.maxD, Math.max(rig.minD, rig.homeDist * was)); rig.fly = null; rig.target.set(0, 0, 0);
            rig.mode = m; inner.visible = false; halo.visible = false; /* one bubble: Misty's own cell, no extra glow shell */
        }
        else { rig.mode = m; rig.lastHome = false; rig.minD = 2.4; rig.maxD = 13; rig.pMax = 1.2; if (rig.dist < 4) rig.dist = 6.5; inner.visible = true; halo.visible = true; }
        Object.values(beacons).forEach(b => { b.g.visible = true; });
        applyView();
    }
    function drag(dx, dy) { rig.yaw -= dx * 0.0062; rig.pitch += dy * 0.005; rig.vy = -dx * 0.0062; rig.vp = dy * 0.005; rig.idle = 0; }
    function release(vx, vy) { rig.vy = -vx * 0.0062 * 16; rig.vp = vy * 0.005 * 16; }
    function zoom(f) { rig.dist = Math.min(rig.maxD, Math.max(rig.minD, rig.dist * f)); rig.idle = 0; }
    function setGyro(y, p) { rig.gyT = y; rig.gpT = p; }
    function setGlow(g) { glowT = Math.max(0, Math.min(1, g)); }
    function setTend(k) { tendT = Math.max(0, Math.min(1, +k || 0)); }
    function beaconLook() { const b = Object.values(beacons)[0]; return b ? { tend: +tend.toFixed(3), glowScale: +b.glow.scale.x.toFixed(3), glowOpacity: +b.glow.material.opacity.toFixed(3), ringOpacity: +b.ring.material.opacity.toFixed(3), ringScale: +b.ring.scale.x.toFixed(3), core: '#' + b.core.material.color.getHexString() } : null; }
    function setTheme(t) {
        theme = t === 'light' ? 'light' : 'dark'; const P = PAL[theme];
        baseBg.set(P.bg); scene.fog.density = P.fog; hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGround); key.color.set(P.key);
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
        microbes.forEach(m => { const u = m.userData; m.position.copy(u.base).add(tmpP.set(Math.sin(t * 0.8 + u.ph) * 0.2, Math.sin(t * 1.3 + u.ph) * 0.18, 0)); m.lookAt(camera.position); });
        /* place tint */
        tintAmt += (tintT - tintAmt) * Math.min(1, dt * 2.5);
        curBg.copy(baseBg); if (tint && tintAmt > 0.001) curBg.lerp(tint, tintAmt * (theme === 'light' ? 0.5 : 0.35));
        scene.background.copy(curBg); scene.fog.color.copy(curBg);
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
