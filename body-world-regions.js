/* LOWiSPIKE whole body world (Oct 15, 2026, ref Random42 "Intercellular" aogLFedcnTI, spec VISUAL-MASTER.md "Whole world").
   The body is one explorable 3D world: the bloodstream hub (owned by body-world-3d*.js) plus seven regions you travel to
   in one continuous fly-to and look around in: brain, lung, heart, liver, pancreas, gut, muscle. Regions are built lazily inside the
   SAME renderer/scene as the hub (window.LowiWorld3D), only one at a time, and disposed when you leave. No second WebGL
   context. Drag / pinch / gyro come from the hub controls, which orbit around the origin, so every region is laid out
   around the origin. You pick a place on the World map or by tapping it in the world (no second list of chips).
   No WebGL: the 2D journey sheets. Reduced motion: you arrive without the fly-to.
   Travelling pays nothing; region brightness follows journey progress from logged actions only.
   Pure data + layout at the top are tested in tests/body-world-regions.test.cjs (also builds every region with three.js). */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiWorldRegions) return;

    /* ---------- data ---------- */
    const REGIONS = [
        { id: 'brain', hue: 0x1cf7f9, css: '#1cf7f9', bg: 0x050f1a, fog: 0x07182a, map: [50, 9],
            n: ['Brain', 'Gehirn', 'Cerebro'], line: ['A forest of neurons. Sparks run along every branch.', 'Ein Wald aus Nervenzellen. Funken laufen jeden Ast entlang.', 'Un bosque de neuronas. Las chispas recorren cada rama.'] },
        { id: 'lung', hue: 0xa8e0ff, css: '#a8e0ff', bg: 0x0a1a30, fog: 0x10243e, map: [36, 30],
            n: ['Lungs', 'Lunge', 'Pulmones'], line: ['Millions of tiny air bubbles, breathing slowly.', 'Millionen winziger Luftbläschen, die langsam atmen.', 'Millones de burbujas de aire que respiran despacio.'] },
        { id: 'heart', hue: 0xf14770, css: '#f14770', bg: 0x1a0612, fog: 0x240a18, map: [56, 34],
            n: ['Heart', 'Herz', 'Corazón'], line: ['Inside the pump. Feel the calm beat around you.', 'Mitten in der Pumpe. Spür den ruhigen Schlag um dich.', 'Dentro de la bomba. Siente el latido tranquilo.'] },
        { id: 'liver', hue: 0xe78631, css: '#e78631', bg: 0x180c05, fog: 0x22120a, map: [40, 48],
            n: ['Liver', 'Leber', 'Hígado'], line: ['Rows of busy cells that store sugar for later.', 'Reihen fleißiger Zellen, die Zucker für später speichern.', 'Filas de células que guardan azúcar para luego.'] },
        { id: 'pancreas', hue: 0xf8ea40, css: '#f8ea40', bg: 0x14120a, fog: 0x1c1a0c, map: [60, 52],
            n: ['Pancreas', 'Bauchspeicheldrüse', 'Páncreas'], line: ['A little island of cells. This is where insulin is made.', 'Eine kleine Zellinsel. Hier entsteht Insulin.', 'Una islita de células. Aquí se fabrica la insulina.'] },
        { id: 'gut', hue: 0x2ef8b6, css: '#2ef8b6', bg: 0x041611, fog: 0x07201a, map: [50, 64],
            n: ['Gut', 'Darm', 'Intestino'], line: ['A forest of villi that takes in your food.', 'Ein Wald aus Zotten, der deine Nahrung aufnimmt.', 'Un bosque de vellosidades que absorbe tu comida.'] },
        { id: 'muscle', hue: 0x9feb25, css: '#9feb25', bg: 0x0b1405, fog: 0x101c08, map: [38, 84],
            n: ['Muscles', 'Muskeln', 'Músculos'], line: ['Long fibres full of tiny power plants.', 'Lange Fasern voller winziger Kraftwerke.', 'Fibras largas llenas de pequeñas centrales.'] }
    ];
    const HUB = { id: 'hub', css: '#e0475a', map: [50, 42], n: ['Bloodstream', 'Blutbahn', 'Torrente sanguíneo'], line: ['Back in the bloodstream, home of your cell.', 'Zurück in der Blutbahn, dem Zuhause deiner Zelle.', 'De vuelta en el torrente, el hogar de tu célula.'] };
    const ROUTE = REGIONS.map(r => r.id);
    const norm = id => id === 'blood' ? 'hub' : id === 'muscles' ? 'muscle' : id;
    const byId = id => { id = norm(id); return id === 'hub' ? HUB : REGIONS.find(r => r.id === id) || null; };
    /* metro-line neighbours: the hub links to every region, each region to the hub and the stops beside it */
    function neighbours(id) {
        id = norm(id);
        if (id === 'hub') return ROUTE.slice();
        const i = ROUTE.indexOf(id);
        if (i < 0) return [];
        return ['hub', ROUTE[i - 1], ROUTE[i + 1]].filter(Boolean);
    }
    /* journeys use the same place ids; the bloodstream journey is the hub */
    const regionForJourney = pid => { pid = norm(pid); return pid === 'hub' ? 'hub' : (ROUTE.indexOf(pid) >= 0 ? pid : null); };
    function tier(o) {
        o = o || {};
        const w = Math.min(o.w || 390, o.h || 844), mem = o.mem || 4;
        if (o.save || mem <= 2 || w < 380) return 'low';
        if (w >= 700 && mem >= 4) return 'high';
        return 'mid';
    }
    const K = { low: 0.6, mid: 1, high: 1.4 };
    const BASE = { brain: { neurons: 9, sparks: 70, dust: 160 }, lung: { clusters: 11, per: 9, sparks: 90 }, heart: { cells: 120, beams: 26 },
        liver: { spokes: 12, per: 9, granules: 180, cells: 60 }, pancreas: { islet: 110, acini: 150, sparks: 80 },
        gut: { villi: 150, tips: 300, microbes: 8, food: 60 }, muscle: { fibres: 22, mito: 70, sparks: 70 } };
    function counts(id, t) {
        const b = BASE[id], k = K[t] || 1, o = {};
        if (!b) return null;
        Object.keys(b).forEach(n => { o[n] = Math.max(n === 'microbes' || n === 'neurons' || n === 'clusters' || n === 'spokes' || n === 'fibres' ? 4 : 10, Math.round(b[n] * (n === 'microbes' ? 1 : k))); });
        return o;
    }
    const travelMs = reduced => reduced ? 250 : 1450 + 420 + 640;
    const pick = (arr, l) => arr[{ en: 0, de: 1, es: 2 }[l] || 0] || arr[0];

    /* ---------- three.js builders (pure: take THREE, return { group, tick, dispose }) ---------- */
    function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
    const seedOf = id => Array.from(id).reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    function texCanvas(THREE, size, draw) {
        if (D && D.createElement) {
            const c = D.createElement('canvas'); c.width = c.height = size;
            const x = c.getContext('2d'); if (x) { draw(x, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace || t.colorSpace; return t; }
        }
        const data = new Uint8Array(4 * 4 * 4).fill(255);
        const t = new THREE.DataTexture(data, 4, 4); t.needsUpdate = true; return t;
    }
    const glow = THREE => texCanvas(THREE, 64, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
    const stripes = (THREE, a, b, n) => texCanvas(THREE, 128, (x, s) => { x.fillStyle = a; x.fillRect(0, 0, s, s); x.fillStyle = b; for (let i = 0; i < n; i++) x.fillRect(0, i * s / n, s, s / n / 2.4); });
    function onShell(r, rmin, rmax, yk) {
        const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = rmin + r() * (rmax - rmin), q = Math.sqrt(1 - u * u);
        return [Math.cos(th) * q * rad, u * rad * (yk || 1), Math.sin(th) * q * rad];
    }
    function mergeGeoms(THREE, list) {
        let n = 0; const parts = list.map(g => { const ni = g.index ? g.toNonIndexed() : g; n += ni.attributes.position.count; return ni; });
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
        parts.forEach(g => { pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
        const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return m;
    }
    function points(THREE, n, color, size, place, tex) {
        const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const v = place(i); p[i * 3] = v[0]; p[i * 3 + 1] = v[1]; p[i * 3 + 2] = v[2]; }
        g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        const m = new THREE.PointsMaterial({ color, size, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
        const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
    }
    function lambert(THREE, color, emissive, ei, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color, emissive, emissiveIntensity: ei }, extra || {})); }
    function inst(THREE, geo, mat, n, each) {
        const m = new THREE.InstancedMesh(geo, mat, n), o = new THREE.Object3D();
        for (let i = 0; i < n; i++) { each(o, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
        m.instanceMatrix.needsUpdate = true; return m;
    }
    function lights(THREE, g, hue, mounted) {
        if (!mounted) g.add(new THREE.HemisphereLight(0xa3b4d9, 0x1a0c20, 0.9));
        const p = new THREE.PointLight(hue, 2.2, 60, 1.4); p.position.set(0, 8, 4); g.add(p);
        const d = new THREE.DirectionalLight(0xffffff, 0.5); d.position.set(-6, 10, 8); g.add(d);
    }
    function redCells(THREE, n, r, area, color) {
        const geo = new THREE.SphereGeometry(0.42, 12, 8); geo.scale(1, 0.38, 1);
        const st = []; const m = inst(THREE, geo, lambert(THREE, color || 0xc8324a, 0x7a1830, 0.45), n, (o, i) => { const v = area(i); st.push({ p: v, a: r() * 6.28, s: 0.4 + r() * 0.8 }); o.position.set(v[0], v[1], v[2]); o.rotation.set(r() * 3, r() * 3, 0); });
        return { mesh: m, st };
    }

    const BUILD = {
        brain(THREE, c, r, tex) {
            const g = new THREE.Group(), somas = [], tubes = [], links = [];
            for (let i = 0; i < c.neurons; i++) {
                const p = new THREE.Vector3(...onShell(r, 6.5, 17, 0.8)); somas.push(p);
                const nb = 5 + Math.floor(r() * 3);
                for (let b = 0; b < nb; b++) {
                    const pts = [p.clone()], dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
                    let q = p.clone();
                    for (let s = 0; s < 4; s++) { dir.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.7)).normalize(); q = q.clone().addScaledVector(dir, 1.1 + r() * 1.2); pts.push(q); }
                    tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.07 + r() * 0.06, 5, false));
                }
            }
            for (let i = 0; i < somas.length; i++) {
                const j = (i + 1 + Math.floor(r() * 3)) % somas.length, a = somas[i], b = somas[j];
                const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(5));
                const cur = new THREE.CatmullRomCurve3([a, mid, b]); links.push(cur);
                tubes.push(new THREE.TubeGeometry(cur, 24, 0.09, 5, false));
            }
            g.add(new THREE.Mesh(mergeGeoms(THREE, tubes), lambert(THREE, 0x1a6f86, 0x1cf7f9, 0.55)));
            g.add(inst(THREE, new THREE.SphereGeometry(1, 16, 12), lambert(THREE, 0x2a8fa8, 0x1cf7f9, 0.7), somas.length, (o, i) => { o.position.copy(somas[i]); o.scale.setScalar(0.6 + r() * 0.45); }));
            const halo = points(THREE, somas.length, 0x8ff8ff, 4.5, i => somas[i].toArray(), tex); halo.material.opacity = 0.55; g.add(halo);
            const sp = c.sparks, st = []; for (let i = 0; i < sp; i++) st.push({ c: i % links.length, t: r(), v: 0.08 + r() * 0.16 });
            const sparks = points(THREE, sp, 0xdffcff, 0.55, () => [0, 0, 0], tex); g.add(sparks);
            g.add(points(THREE, c.dust, 0x3fb8c8, 0.18, () => onShell(r, 3, 26), tex));
            const tmp = new THREE.Vector3();
            return { group: g, tick(t, dt) { const a = sparks.geometry.attributes.position; st.forEach((s, i) => { s.t = (s.t + s.v * dt) % 1; links[s.c].getPointAt(s.t, tmp); a.setXYZ(i, tmp.x, tmp.y, tmp.z); }); a.needsUpdate = true; } };
        },
        lung(THREE, c, r, tex) {
            const g = new THREE.Group(), ctr = [];
            for (let i = 0; i < c.clusters; i++) ctr.push(onShell(r, 7, 18, 0.9));
            const n = c.clusters * c.per;
            const sacs = inst(THREE, new THREE.SphereGeometry(1, 14, 10), lambert(THREE, 0xa8e0ff, 0x2a5d80, 0.6, { transparent: true, opacity: 0.38, depthWrite: false }), n, (o, i) => {
                const k = ctr[Math.floor(i / c.per)], s = 1.2 + r() * 1.1; o.position.set(k[0] + (r() - 0.5) * 4.2, k[1] + (r() - 0.5) * 4.2, k[2] + (r() - 0.5) * 4.2); o.scale.setScalar(s);
            });
            g.add(sacs);
            const caps = ctr.map(k => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(...k), new THREE.Vector3(k[0] * 0.5 + (r() - 0.5) * 6, k[1] * 0.5 + (r() - 0.5) * 6, k[2] * 0.5), new THREE.Vector3(k[0] * 0.15, k[1] * 0.15 - 6, k[2] * 0.15)]), 16, 0.14, 5, false));
            g.add(new THREE.Mesh(mergeGeoms(THREE, caps), lambert(THREE, 0x8a2a3a, 0xe0475a, 0.35)));
            const air = points(THREE, c.sparks, 0xe6f6ff, 0.35, () => onShell(r, 3, 20), tex); g.add(air);
            return { group: g, tick(t) { const b = 1 + 0.045 * Math.sin(t * Math.PI * 2 / 4.5); sacs.scale.setScalar(b); air.rotation.y = t * 0.02; } };
        },
        heart(THREE, c, r, tex) {
            const g = new THREE.Group();
            const wtex = stripes(THREE, '#5a1426', '#b8344f', 18); wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.repeat.set(6, 3);
            const wall = new THREE.Mesh(new THREE.SphereGeometry(22, 40, 28), lambert(THREE, 0xffffff, 0x4a0f20, 0.6, { map: wtex, side: THREE.BackSide })); g.add(wall);
            g.add(inst(THREE, new THREE.CylinderGeometry(0.5, 0.8, 1, 8), lambert(THREE, 0xc23a55, 0xf14770, 0.28), c.beams, (o, i) => {
                const a = new THREE.Vector3(...onShell(r, 18, 21)), b = new THREE.Vector3(...onShell(r, 18, 21)); const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b);
                if (mid.length() < 8) mid.setLength(9); o.position.copy(mid); o.scale.set(1, len * 0.55, 1); o.lookAt(b); o.rotateX(Math.PI / 2);
            }));
            const rc = redCells(THREE, c.cells, r, () => onShell(r, 4, 16));
            g.add(rc.mesh);
            const tmp = new THREE.Object3D(), beat = t => { const p = (t % 1.05) / 1.05; return Math.exp(-Math.pow((p - 0.1) / 0.06, 2)) + 0.5 * Math.exp(-Math.pow((p - 0.32) / 0.07, 2)); };
            return { group: g, tick(t, dt, calm) {
                const b = calm ? 0 : beat(t); wall.scale.setScalar(1 - 0.03 * b);
                rc.st.forEach((s, i) => { s.a += dt * s.s * 0.25; const p = s.p, ca = Math.cos(dt * 0.15 * s.s), sa = Math.sin(dt * 0.15 * s.s), x = p[0] * ca - p[2] * sa; p[2] = p[0] * sa + p[2] * ca; p[0] = x;
                    tmp.position.set(p[0], p[1], p[2]); tmp.rotation.set(s.a, s.a * 0.6, 0); tmp.updateMatrix(); rc.mesh.setMatrixAt(i, tmp.matrix); });
                rc.mesh.instanceMatrix.needsUpdate = true;
            } };
        },
        liver(THREE, c, r, tex) {
            const g = new THREE.Group(), n = c.spokes * c.per * 3;
            g.add(inst(THREE, new THREE.CylinderGeometry(0.85, 0.85, 1.1, 6), lambert(THREE, 0xc06a28, 0xe78631, 0.32), n, (o, i) => {
                const sp = i % c.spokes, k = Math.floor(i / c.spokes) % c.per, layer = Math.floor(i / (c.spokes * c.per)) - 1;
                const a = sp / c.spokes * Math.PI * 2 + Math.sin(k * 0.6) * 0.08, rad = 5.5 + k * 1.75;
                o.position.set(Math.cos(a) * rad, layer * 5 + (r() - 0.5) * 0.6, Math.sin(a) * rad); o.rotation.set(Math.PI / 2, 0, a + Math.PI / 2); o.scale.set(1, 1 + r() * 0.3, 1);
            }));
            const vein = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.35, 8, 40), lambert(THREE, 0x5a1a2a, 0xe0475a, 0.35)); vein.rotation.x = Math.PI / 2; vein.position.y = -7.5; g.add(vein);
            g.add(points(THREE, c.granules, 0xffd27a, 0.32, () => { const a = r() * 6.28, rad = 5 + r() * 16; return [Math.cos(a) * rad, (Math.floor(r() * 3) - 1) * 5 + (r() - 0.5) * 2, Math.sin(a) * rad]; }, tex));
            const rc = redCells(THREE, c.cells, r, () => { const a = (Math.floor(r() * 12) + 0.5) / 12 * 6.28, rad = 6 + r() * 14; return [Math.cos(a) * rad, (r() - 0.5) * 12, Math.sin(a) * rad]; }); g.add(rc.mesh);
            const tmp = new THREE.Object3D();
            return { group: g, tick(t, dt) { rc.st.forEach((s, i) => { const p = s.p, L = Math.hypot(p[0], p[2]), k = Math.max(0, L - dt * s.s * 1.2) / L; p[0] *= k; p[2] *= k; if (L < 4.5) { const a = Math.atan2(p[2], p[0]); p[0] = Math.cos(a) * 20; p[2] = Math.sin(a) * 20; }
                tmp.position.set(p[0], p[1], p[2]); tmp.rotation.set(t * s.s, 0, 0); tmp.updateMatrix(); rc.mesh.setMatrixAt(i, tmp.matrix); }); rc.mesh.instanceMatrix.needsUpdate = true; } };
        },
        pancreas(THREE, c, r, tex) {
            const g = new THREE.Group(), core = new THREE.Vector3(0, 0.5, -11);
            const islet = inst(THREE, new THREE.SphereGeometry(0.62, 14, 10), lambert(THREE, 0xe8c63a, 0xf8ea40, 0.45), c.islet, (o, i) => { const v = onShell(r, 0, 4); o.position.set(core.x + v[0], core.y + v[1], core.z + v[2]); o.scale.setScalar(0.8 + r() * 0.5); });
            g.add(islet);
            g.add(inst(THREE, new THREE.SphereGeometry(1, 10, 7), lambert(THREE, 0x6a5420, 0x8a6a1a, 0.25), c.acini, (o, i) => { const v = onShell(r, 15, 24); o.position.set(v[0], v[1], v[2]); o.scale.set(1.3 + r(), 1 + r() * 0.8, 1.3 + r()); }));
            const halo = points(THREE, 1, 0xfff3a0, 14, () => core.toArray(), tex); halo.material.opacity = 0.5; g.add(halo);
            const st = []; for (let i = 0; i < c.sparks; i++) st.push({ d: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), t: r(), v: 0.05 + r() * 0.08 });
            const sparks = points(THREE, c.sparks, 0xfff6b0, 0.4, () => core.toArray(), tex); g.add(sparks);
            return { group: g, tick(t, dt) { const a = sparks.geometry.attributes.position; st.forEach((s, i) => { s.t = (s.t + s.v * dt) % 1; const d = 3.5 + s.t * 14; a.setXYZ(i, core.x + s.d.x * d, core.y + s.d.y * d, core.z + s.d.z * d); }); a.needsUpdate = true; islet.rotation.y = t * 0.05; } };
        },
        gut(THREE, c, r, tex) {
            const g = new THREE.Group(), R = 14;
            const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.5, R + 1.5, 90, 36, 1, true), lambert(THREE, 0x0d3a2e, 0x06261d, 0.6, { side: THREE.BackSide })); wall.rotation.x = Math.PI / 2; g.add(wall);
            const tips = [];
            g.add(inst(THREE, new THREE.CapsuleGeometry(0.6, 3.6, 4, 10), lambert(THREE, 0x2a9e7c, 0x2ef8b6, 0.32), c.villi, (o, i) => {
                const a = r() * 6.28, z = (r() - 0.5) * 70, len = 0.7 + r() * 0.6; o.position.set(Math.cos(a) * (R - 2.1 * len), Math.sin(a) * (R - 2.1 * len), z); o.scale.set(1, len, 1);
                o.rotation.set(0, 0, a + Math.PI / 2); tips.push([Math.cos(a) * (R - 4.3 * len), Math.sin(a) * (R - 4.3 * len), z]);
            }));
            g.add(points(THREE, c.tips, 0xb8ffe6, 0.3, i => { const p = tips[i % tips.length]; return [p[0] + (r() - 0.5) * 1.2, p[1] + (r() - 0.5) * 1.2, p[2] + (r() - 0.5) * 1.2]; }, tex));
            const food = points(THREE, c.food, 0xfff2c8, 0.5, () => { const a = r() * 6.28, rad = r() * 8; return [Math.cos(a) * rad, Math.sin(a) * rad, (r() - 0.5) * 60]; }, tex); g.add(food);
            const hues = ['#2ef8b6', '#9feb25', '#a8e0ff', '#f8ea40', '#f14770', '#9b87d2', '#1cf7f9', '#e78631'], bugs = [];
            for (let i = 0; i < c.microbes; i++) {
                const col = hues[i % hues.length], t = texCanvas(THREE, 96, (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2); gr.addColorStop(0, col); gr.addColorStop(0.62, col); gr.addColorStop(0.64, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.beginPath(); x.ellipse(s / 2, s / 2, s * 0.44, s * 0.36, 0, 0, 7); x.fill(); x.fillStyle = '#0b102a'; x.beginPath(); x.arc(s * 0.4, s * 0.46, s * 0.05, 0, 7); x.arc(s * 0.6, s * 0.46, s * 0.05, 0, 7); x.fill(); });
                const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); const a = r() * 6.28, rad = 3.5 + r() * 6;
                sp.position.set(Math.cos(a) * rad, Math.sin(a) * rad, -3 - r() * 12); sp.scale.setScalar(1.3 + r() * 0.6); sp.userData = { y: sp.position.y, p: r() * 6 }; bugs.push(sp); g.add(sp);
            }
            return { group: g, bugs, tick(t, dt) { const a = food.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let z = a.getZ(i) + dt * 1.4; if (z > 30) z = -30; a.setZ(i, z); } a.needsUpdate = true; bugs.forEach(b => { b.position.y = b.userData.y + Math.sin(t * 1.3 + b.userData.p) * 0.35; }); } };
        },
        muscle(THREE, c, r, tex) {
            const g = new THREE.Group(), st = stripes(THREE, '#4f7a12', '#b9f24a', 24); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(1, 10);
            const spots = []; for (let ring = 1; spots.length < c.fibres && ring < 8; ring++) { const k = ring * 6; for (let j = 0; j < k && spots.length < c.fibres; j++) { const a = j / k * 6.28 + ring * 0.3, rad = 2.2 + ring * 2.6; spots.push([Math.cos(a) * rad, Math.sin(a) * rad]); } }
            g.add(inst(THREE, new THREE.CylinderGeometry(1.05, 1.05, 70, 14, 1, true), lambert(THREE, 0xffffff, 0x2f4a08, 0.55, { map: st }), spots.length, (o, i) => { const s = spots[i]; if (Math.hypot(s[0], s[1]) < 4.6) { s[0] *= 1.9; s[1] *= 1.9; } o.position.set(0, s[1], s[0]); o.rotation.z = Math.PI / 2; o.scale.set(1 + r() * 0.25, 1, 1 + r() * 0.25); }));
            g.add(inst(THREE, new THREE.CapsuleGeometry(0.28, 0.9, 3, 8), lambert(THREE, 0xe78631, 0xf8a040, 0.6), c.mito, (o, i) => { const s = spots[i % spots.length], a = r() * 6.28; o.position.set((r() - 0.5) * 50, s[1] + Math.sin(a) * 1.35, s[0] + Math.cos(a) * 1.35); o.rotation.z = Math.PI / 2; }));
            const sp = points(THREE, c.sparks, 0xeaffb0, 0.35, () => onShell(r, 3, 20), tex); g.add(sp);
            return { group: g, tick(t, dt) { const a = sp.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let x = a.getX(i) + dt * 2.2; if (x > 22) x = -22; a.setX(i, x); } a.needsUpdate = true; } };
        }
    };
    function buildRegion(THREE, id, t, opts) {
        const R = byId(id), f = BUILD[id];
        if (!R || !f) return null;
        const r = rng(seedOf(id)), tex = glow(THREE), out = f(THREE, counts(id, t || 'mid'), r, tex, opts || {});
        out.group.name = 'region:' + id; lights(THREE, out.group, R.hue, opts && opts.mounted);
        out.id = id; out.bg = R.bg; out.fog = R.fog;
        out.dispose = () => { out.group.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); }); tex.dispose(); if (out.group.parent) out.group.parent.remove(out.group); };
        return out;
    }
    /* warp streaks: light lines in camera space that stream past as the camera flies (Stargate / Google Earth fly-to).
       The world stays visible behind them; they only add the sense of speed. vf = signed speed along the view axis. */
    function buildWarp(THREE, n, hue) {
        n = Math.max(24, n | 0 || 120);
        const g = new THREE.Group(), r = rng(9173), st = [];
        g.name = 'bwr-warp';
        for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, rad = 0.5 + r() * 2.6; st.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, z: -1.5 - r() * 28, w: 0.6 + r() * 0.8 }); }
        const pos = new Float32Array(n * 6), col = new Float32Array(n * 6), geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false, blending: THREE.AdditiveBlending });
        const lines = new THREE.LineSegments(geo, mat); lines.renderOrder = 997; lines.frustumCulled = false; g.add(lines);
        const c = new THREE.Color();
        function setHue(h) { c.set(0xffffff).lerp(new THREE.Color(h == null ? 0xffffff : h), 0.45); for (let i = 0; i < n; i++) { col.set([c.r, c.g, c.b, c.r * 0.08, c.g * 0.08, c.b * 0.08], i * 6); } geo.attributes.color.needsUpdate = true; }
        setHue(hue);
        function tick(vf, dt, amt) {
            const v = Math.max(-40, Math.min(40, vf || 0)), d = Math.min(0.05, dt || 0.016);
            for (let i = 0; i < n; i++) {
                const s = st[i]; s.z += v * d * s.w * 1.6;
                if (s.z > -0.6) s.z -= 28; else if (s.z < -30) s.z += 28;
                const len = Math.min(4, 0.06 + Math.abs(v) * 0.09 * s.w), o = i * 6;
                pos[o] = s.x; pos[o + 1] = s.y; pos[o + 2] = s.z; pos[o + 3] = s.x; pos[o + 4] = s.y; pos[o + 5] = s.z - (v >= 0 ? len : -len);
            }
            geo.attributes.position.needsUpdate = true;
            mat.opacity = Math.max(0, Math.min(1, amt || 0)) * 0.9; lines.visible = mat.opacity > 0.01;
        }
        tick(0, 0.016, 0);
        return { group: g, count: n, setHue, tick, follow(cam) { g.position.copy(cam.position); g.quaternion.copy(cam.quaternion); },
            get opacity() { return mat.opacity; }, dispose() { geo.dispose(); mat.dispose(); if (g.parent) g.parent.remove(g); } };
    }
    /* fly-to timeline (ms) after the base camera glide (body-world-3d-scene.js flyTo, 1.45 s): dive into the place's glow,
       then settle inside the region while it unfolds around you. warpPose(phase, k) -> forward offset of the camera along
       its view axis (world units per unit of reach), veil opacity and region scale: pure, tested. */
    const WARP = { glide: 1450, dive: 420, settle: 640, out: 380 };
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    function warpPose(phase, k) {
        k = Math.max(0, Math.min(1, k));
        if (phase === 'dive') return { fwd: k * k * k, speed: 3 * k * k, veil: smooth(0.4, 1, k), scale: 1 };
        if (phase === 'settle') { const e = 1 - Math.pow(1 - k, 3); return { fwd: -(1 - e), speed: 3 * Math.pow(1 - k, 2), veil: 1 - smooth(0, 0.65, k), scale: 0.45 + 0.55 * e }; }
        if (phase === 'out') return { fwd: 0, speed: 0, veil: 1 - smooth(0, 1, k), scale: 1 };
        return { fwd: 0, speed: 0, veil: 0, scale: 1 };
    }
    const API = { REGIONS, HUB, ROUTE, norm, byId, neighbours, regionForJourney, tier, counts, travelMs, WARP, warpPose, buildRegion, buildWarp, BUILD };
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
    W.LowiWorldRegions = API;
    if (!D || !D.addEventListener) return;
    if (!D.getElementById('bwrCss')) {
        const me = D.currentScript || D.querySelector('script[src*="body-world-regions.js"]'), l = D.createElement('link'); l.id = 'bwrCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('body-world-regions.js', 'body-world-regions.css') : 'body-world-regions.css';
        D.head.appendChild(l);
    }

    /* ---------- browser: world controller on top of window.LowiWorld3D (base build 20261015-040000) ----------
       Uses only the shared API: THREE, scene, camera, regions [{id,pos,hue}], onFrame(fn(dt,now)) -> off, flyTo(id), open(),
       isOpen(), state, plus the 'lowi:world3d-place' event and the .bw3-full overlay. The hub rig keeps orbiting its target,
       so each region is mounted around the spot the hub camera glides to (beacon * 0.92, lung = centre): drag, pinch and gyro
       work unchanged inside every region. Hub meshes are parked on layer 31 while a region is shown (not rendered, not
       pickable); lights stay. One renderer, one canvas, one WebGL context. */
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return ((D.documentElement.lang) || 'de').slice(0, 2); } };
    const T = (en, de, es) => pick([en, de, es], lang());
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const st = { cur: 'hub', target: null, next: null, region: null, warp: null, busy: false, tier: null, off: null, label: null, mapBtn: null, veil: null, host: null, lt: 0 };
    const w3 = () => W.LowiWorld3D || null;
    const baseId = id => id === 'muscle' ? 'muscles' : id;
    const parked = []; let look = null, fogWas = null;
    function setHubVisible(on) {
        const a = w3(); if (!a || !a.scene) return;
        if (on) { parked.forEach(p => { p[0].layers.mask = p[1]; }); parked.length = 0; return; }
        if (parked.length) return;
        /* Oct 17 (E-man: "Misty should be everywhere"): her flying sprite, sparkles and ring (userData.lwKeep, world-home.js) stay
           drawn in every place; parking them made the real Misty invisible inside a world once she had flown before */
        a.scene.children.forEach(c => { if (c.isLight || (c.userData && (c.userData.bwr || c.userData.lwKeep))) return; c.traverse(o => { if (o.isLight) return; parked.push([o, o.layers.mask]); o.layers.set(31); }); });
    }
    function setLook(o) {
        const a = w3(); if (!a || !a.scene || !a.scene.fog) { look = o; return; }
        if (o && fogWas == null) fogWas = a.scene.fog.density;
        if (!o && fogWas != null) { a.scene.fog.density = fogWas; fogWas = null; }
        look = o;
    }
    /* Oct 17 energy shot (misty-turn.js): how much today's shots healed this world, 0..0.6 */
    function shotHeal() { const M = W.LowiMistyTurn; let h = 0; try { h = M && M.heal ? +M.heal(st.cur) || 0 : 0; } catch (e) { h = 0; } return Math.max(0, Math.min(0.6, h)); }
    function applyLook() {
        const a = w3(); if (!look || !a || !a.scene) return;
        if (a.scene.background && a.scene.background.copy) a.scene.background.copy(look.bg);
        if (a.scene.fog) { a.scene.fog.color.copy(look.bg); a.scene.fog.density = look.fog * (1 + 0.9 * Math.max(0, Math.min(1, +st.murk || 0))) * (1 - 0.5 * shotHeal()); } /* misty-hunt: murk thins as Misty eats; misty-turn: her energy shots heal it */
    }
    function centerOf(id) {
        const a = w3(), THREE = a.THREE, r = (a.regions || []).find(x => x.id === baseId(id));
        return r && r.pos ? r.pos.clone().multiplyScalar(0.92) : new THREE.Vector3();
    }
    const wo = () => { const a = w3(); return a && a.ready && a.scene && a.camera && a.THREE ? { scene: a.scene, camera: a.camera, three: a.THREE, setHubVisible, setLook } : null; };
    function explored(id) {
        try { const t = W.LowiBodyTrips; const pid = id === 'hub' ? 'blood' : id; const v = t && (t.progress ? t.progress(pid) : t.pct ? t.pct(pid) : null); const n = typeof v === 'number' ? v : (v && (v.pct != null ? v.pct : v.p)); return Math.max(0, Math.min(100, Math.round(n || 0))); } catch (e) { return 0; }
    }
    function host() { const a = w3(); if (!a || !a.isOpen) return null; if (!a.isOpen()) return homeHost(a); const h = D.querySelector('.bw3-full'); return h && h.isConnected ? h : null; }
    /* One world (Oct 15): Home's live world is a host too, so a warp from Home lands in Home itself (no second window) */
    function homeHost(a) {
        const H = D.documentElement; if (!H.classList.contains('wh-home') || !H.classList.contains('wh-world-live')) return null;
        if (!a.rig || a.rig.mode !== 'home' || !a.ready) return null;
        const h = D.getElementById('whHud'); return h && h.isConnected ? h : null;
    }
    function ensureUi() {
        const h = host(); if (!h) return null;
        if (st.mapBtn && st.mapBtn.isConnected && st.host === h) return st.mapBtn;
        st.host = h;
        /* one way to pick a place: the World map button (all seven, lungs included) plus tapping a place in the world itself */
        const mapBtn = D.createElement('button'); mapBtn.type = 'button'; mapBtn.className = 'bwr-mapbtn'; mapBtn.id = 'bwrMapBtn';
        mapBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="13" r="2.2"/><circle cx="18" cy="13" r="2.2"/><circle cx="12" cy="20" r="2.2"/><path d="M12 7v11M12 7l-5 4.5M12 7l5 4.5" fill="none"/></svg><span></span>';
        mapBtn.addEventListener('click', e => { e.stopPropagation(); openMap(); });
        ['pointerdown', 'touchstart'].forEach(n => mapBtn.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        const lab = D.createElement('div'); lab.className = 'bwr-label'; lab.id = 'bwrLabel'; lab.setAttribute('aria-live', 'polite');
        const veil = D.createElement('div'); veil.className = 'bwr-veil'; veil.setAttribute('aria-hidden', 'true');
        h.classList.add('bwr-on'); const lv = h.querySelector('.bw3-labels'); if (lv) h.insertBefore(veil, lv); else h.appendChild(veil); h.appendChild(lab); h.appendChild(mapBtn); st.label = lab; st.mapBtn = mapBtn; st.veil = veil; renderUi(); return mapBtn;
    }
    function renderUi() {
        if (!st.mapBtn) return;
        const l = lang(), cur = byId(st.cur);
        st.mapBtn.querySelector('span').textContent = T('World map', 'Weltkarte', 'Mapa');
        st.mapBtn.setAttribute('aria-label', T('World map', 'Weltkarte', 'Mapa') + ' · ' + pick(cur.n, l));
        const h = st.host; if (h) { h.classList.toggle('bwr-in', st.cur !== 'hub'); h.style.setProperty('--bwr-h', cur.css); const t = h.querySelector('.bw3-top b'); if (t) { if (!t.dataset.hubTitle) t.dataset.hubTitle = t.textContent; t.textContent = st.cur === 'hub' ? t.dataset.hubTitle : pick(cur.n, l); } }
    }
    /* the base card (name, journey, Back) exists for the six beacons; the lungs have no beacon, so give them the same card */
    function lungCard() {
        const h = st.host, card = h && h.querySelector('.bw3-card'); if (!card || st.cur !== 'lung') return;
        if (!card.hidden && card.querySelector('[data-bwr-lung]')) return;
        const l = lang(), R = byId('lung');
        const trip = W.LowiBodyTrips && W.LowiBodyTrips.open ? '<button type="button" data-bw3-trip="lung">' + esc(T('Open journey', 'Reise öffnen', 'Abrir viaje')) + '</button>' : '';
        card.style.setProperty('--h', R.css);
        card.innerHTML = '<b data-bwr-lung>' + esc(pick(R.n, l)) + '</b><p>' + esc(pick(R.line, l)) + '</p><div>' + trip + '<button type="button" class="ghost" data-bw3-back>' + esc(T('Back to your cell', 'Zurück zu deiner Zelle', 'Volver a tu célula')) + '</button></div>';
        card.hidden = false;
    }
    function say(id) {
        if (!st.label) return; const R = byId(id), l = lang();
        const card = st.host && st.host.querySelector('.bw3-card'); if (card && !card.hidden && id !== 'hub') { st.label.classList.remove('on'); return; }
        let line = pick(R.line, l);
        try { const c = W.LowiBodyDepth && W.LowiBodyDepth.arrival && W.LowiBodyDepth.arrival(id === 'hub' ? 'blood' : id); if (c && (c.line || c.text)) line = c.line || c.text; } catch (e) { }
        /* Oct 16 (E-man): on Home this line no longer floats over the Daily Quest: it goes into the Daily Quest box */
        if (!D.querySelector('.bw3-full') && W.LowiArrival && W.LowiArrival.note) { st.label.classList.remove('on'); try { if (W.LowiArrival.note(pick(R.n, l), line, R.css, 3600)) return; } catch (e) { } }
        st.label.innerHTML = '<b style="--h:' + R.css + '">' + esc(pick(R.n, l)) + '</b><span>' + esc(line) + '</span>';
        st.label.classList.remove('on'); void st.label.offsetWidth; st.label.classList.add('on');
        clearTimeout(st.lt); st.lt = setTimeout(() => st.label && st.label.classList.remove('on'), 3600);
    }
    /* ---------- the fly-to: one continuous camera move through the world, no cut ----------
       glide: the base camera glides through the hub to the place (whole world visible, streaks + wider lens with speed);
       dive:  it keeps pushing forward into the place's glow until the glow fills the view;
       settle: inside the glow the region is mounted and unfolds around you while the camera slows to rest.
       Leaving a region (Back, map, bloodstream) bursts out of its glow and the base camera pulls back through the hub. */
    function portalFor(THREE, hue) {
        const m = new THREE.SpriteMaterial({ map: glow(THREE), color: new THREE.Color(hue), transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false, blending: THREE.AdditiveBlending });
        const s = new THREE.Sprite(m); s.renderOrder = 996; s.userData.bwr = true; s.visible = false;
        return { sprite: s, dispose() { if (s.parent) s.parent.remove(s); if (m.map) m.map.dispose(); m.dispose(); } };
    }
    function veil(o, css) {
        const v = st.veil; if (!v) return;
        if (css) v.style.setProperty('--vh', css);
        v.style.opacity = String(Math.max(0, Math.min(1, o)).toFixed(3));
    }
    function stepWarp(w, dt) {
        const q = st.warp, a = w3(), cam = w.camera, THREE = w.three, d = Math.max(1 / 240, Math.min(0.05, dt || 0.016));
        /* the warp clock runs on the same capped frame time as the base glide, so on a slow phone both stay in step */
        q.clock += d * 1000; const now = q.clock;
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        const base = cam.position.clone();
        let vf = q.last ? base.clone().sub(q.last).dot(fwd) / d : 0; q.last = base;
        let veilO = 0;
        /* Oct 16 (E-man): leaving a place for the bloodstream (World map, X) is the fly-to played backwards: the place shrinks
           away as the camera pulls back under its glow (settle reversed), the camera backs out of the glowing spot (dive
           reversed), then glides back out to Home (glide reversed). Same streaks, same easing, no cut and no blank frame. */
        if (q.phase === 'unsettle') {
            const k = (now - q.tu) / WARP.settle, p = warpPose('settle', 1 - k);
            if (q.back == null) q.back = 1.2 + 0.25 * (a && a.rig ? a.rig.dist : 2.6);
            cam.position.addScaledVector(fwd, q.back * p.fwd); vf -= q.back * p.speed / (WARP.settle / 1000);
            veilO = Math.max(veilO, p.veil);
            if (st.region) st.region.group.scale.setScalar(p.scale);
            if (k >= 1) {
                /* under the full glow: the place goes, the bloodstream comes back, and the camera waits just outside the glowing
                   spot it dived into, facing in, exactly where the fly-to left it before the dive */
                enter('hub');
                const r = a && a.rig;
                if (r) {
                    const ang = Math.atan2(q.B.x, q.B.z);
                    r.fly = null; r.flyYaw = null; r.vy = 0; r.vp = 0; r.idle = 0;
                    r.target.copy(q.B).multiplyScalar(0.92); r.dist = 2.6;
                    r.yaw = ang + Math.round((r.yaw - ang) / (Math.PI * 2)) * Math.PI * 2;
                    r.pitch = Math.max(-0.5, Math.min(0.5, r.pitch));
                    /* the base's own glide home (resets the hue tint now, under the glow); it is held until the back-out ends */
                    if (a.flyTo) { st.ownFly = true; try { a.flyTo(null); } finally { st.ownFly = false; } }
                    q.fly = r.fly; r.fly = null;
                }
                q.phase = 'undive'; q.tp = now; q.reach = null; q.last = null; veil(1);
                q.streaks.follow(cam); return;
            }
        } else if (q.phase === 'undive') {
            /* first frame from the new spot: the clock for the back-out starts here, under the full glow (a slow frame never shows the jump) */
            if (q.reach == null) { q.reach = Math.max(0.6, base.distanceTo(q.B) - 0.2); q.tp = now; }
            const k = (now - q.tp) / WARP.dive, p = warpPose('dive', 1 - k);
            cam.position.addScaledVector(fwd, q.reach * p.fwd); vf -= q.reach * p.speed / (WARP.dive / 1000);
            veilO = Math.max(veilO, p.veil);
            const ps = q.portal.sprite, kk = 1 - Math.min(1, k);
            ps.visible = k < 1; ps.position.copy(q.B); ps.scale.setScalar(2.6 + 5 * kk * kk); ps.material.opacity = (0.35 + 0.6 * kk) * (1 - smooth(0.55, 1, k));
            if (k >= 1) {
                const r = a && a.rig;
                if (r && q.fly) {
                    q.fly.from = { t: r.target.clone(), d: r.dist }; q.fly.t = 0;
                    if (q.wide && r.maxD) q.fly.to.d = r.maxD; /* World map: one pull back out to the whole world, Misty in the middle */
                    r.fly = q.fly; r.flyYaw = null; q.p0 = r.pitch;
                }
                q.phase = 'glide'; q.t0 = now; q.saw = false;
            }
        }
        if (q.outT != null) { const k = (now - q.outT) / WARP.out; veilO = Math.max(veilO, warpPose('out', k).veil); if (k >= 1) q.outT = null; }
        const flying = a && a.rig ? !!a.rig.fly : null;
        if (flying) q.saw = true;
        if (q.phase === 'glide') {
            const el = now - q.t0;
            const glideOver = flying === null ? el > WARP.glide + 80 : (q.saw ? !flying : el > 320);
            if (q.rev && a && a.rig && a.rig.fly) {
                const f = a.rig.fly, k = Math.min(1, f.t / f.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
                if (q.wide && q.p0 != null) a.rig.pitch = q.p0 + (0.42 - q.p0) * e;
                q.reveal = k > 0.68; /* Home's Misty fades back in over the last stretch, as her cell slides into place */
            }
            if (el > 90 && glideOver) {
                if (q.id === 'hub') { finish(); return; }
                q.phase = 'dive'; q.tp = now; veil(0, q.css); warpEv('dive', q.id, q.from); q.reach = Math.max(0.6, base.distanceTo(q.B) - 0.2);
            }
        }
        if (q.phase === 'dive') {
            const k = (now - q.tp) / WARP.dive, p = warpPose('dive', k);
            cam.position.addScaledVector(fwd, q.reach * p.fwd); vf += q.reach * p.speed / (WARP.dive / 1000);
            veilO = Math.max(veilO, p.veil);
            const ps = q.portal.sprite; ps.visible = true; ps.position.copy(q.B); ps.scale.setScalar(2.6 + 5 * k * k); ps.material.opacity = 0.35 + 0.6 * k;
            if (k >= 1) {
                q.portal.dispose(); q.portal = portalFor(THREE, q.hue); w.scene.add(q.portal.sprite);
                enter(q.id); if (st.region) st.region.group.scale.setScalar(warpPose('settle', 0).scale);
                q.phase = 'settle'; q.ts = now; veilO = 1;
            }
        } else if (q.phase === 'settle') {
            const k = (now - q.ts) / WARP.settle, p = warpPose('settle', k), back = 1.8;
            cam.position.addScaledVector(fwd, back * p.fwd); vf += back * p.speed / (WARP.settle / 1000);
            veilO = Math.max(veilO, p.veil);
            if (st.region) st.region.group.scale.setScalar(p.scale);
            if (k >= 1) { finish(); return; }
        }
        const amt = Math.max(0, Math.min(1, Math.abs(vf) / 7));
        q.amt += (amt - q.amt) * Math.min(1, d * 9);
        q.streaks.tick(vf, d, q.amt); q.streaks.follow(cam);
        const fov = q.fov0 + 16 * q.amt;
        if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
        veil(veilO);
    }
    /* Oct 15: the fly-to's real phases go out as window 'lowi:world-warp' {phase:'start'|'dive'|'arrive'|'cancel', id, from} (world-audio.js plays its warp sounds on them) */
    function warpEv(phase, id, from) { try { W.dispatchEvent(new CustomEvent('lowi:world-warp', { detail: { phase, id, from: from || null } })); } catch (e) { } }
    function finish() {
        const q = st.warp; if (!q) return;
        st.warp = null; clean(q);
        if (q.id === 'hub' && st.cur !== 'hub') enter('hub');
        if (q.rev && q.wide) { const r0 = w3() && w3().rig; if (r0 && !r0.fly) r0.pitch = 0.42; }
        lungCard(); warpEv('arrive', q.id, q.from);
        q.done && q.done();
        /* Oct 16 (E-man): "when entering a world, start from the most zoomed-out view": right after the dive the camera glides
           back out to the widest view of the place, like a map; pinch or double tap to zoom into a spot */
        const a = w3(), r = a && a.rig;
        if (q.id !== 'hub' && r && !r.fly && r.dist < r.maxD * 0.9) { r.fly = { from: { t: r.target.clone(), d: r.dist }, to: { t: r.target.clone(), d: r.maxD }, t: 0, dur: 1.1 }; r.flyYaw = null; }
    }
    function clean(q) {
        const a = w3(), cam = a && a.camera;
        if (cam && q.fov0 && Math.abs(cam.fov - q.fov0) > 0.001) { cam.fov = q.fov0; cam.updateProjectionMatrix(); }
        try { q.streaks && q.streaks.dispose(); } catch (e) { }
        try { q.portal && q.portal.dispose(); } catch (e) { }
        if (st.region) st.region.group.scale.setScalar(1);
        veil(0);
        if (st.host) st.host.classList.remove('bwr-warp');
    }
    /* leave the region you are in without announcing the bloodstream (going on to another place) */
    function leaveQuiet() {
        const w = wo(); if (!w) return;
        if (st.region) { st.region.dispose(); st.region = null; }
        w.setLook(null); w.setHubVisible(true); st.cur = 'hub'; renderUi();
    }
    function frame(t, dt) {
        const h = host();
        if (st.host && h !== st.host) reset();
        if (h && !st.host) ensureUi();
        const w = wo(); if (!w) return;
        if (st.warp) { try { stepWarp(w, dt); } catch (e) { const q = st.warp; st.warp = null; clean(q); if (q.id !== st.cur) enter(q.id); q.done && q.done(); } }
        if (st.region && st.region.tick) { try { st.region.tick(t, Math.min(0.05, dt || 0.016), reduced()); } catch (e) { } }
        applyLook();
        /* Oct 17 (E-man: "in some cells we should be able to really zoom in, fly in or fly out"): while you are in a place the camera
           knows it (body-world-3d-scene.js zoom: closer minimum, the pinch flies toward your fingers, bounded to the place) */
        const a3 = w3(); if (a3 && a3.rig) a3.rig.place = st.region && st.cur !== 'hub' && !st.warp ? (st.place || (st.place = { c: st.region.group.position.clone(), R: 9 })) : null;
    }
    function hook() {
        if (st.off) return true;
        const a = w3(); if (!a || !a.onFrame) return false;
        st.off = a.onFrame((dt, now) => frame((now || performance.now()) / 1000, dt)); return true;
    }
    function lightMode() { return D.documentElement.dataset.theme === 'light'; }
    function enter(id) {
        const w = wo(); if (!w) return;
        if (st.region) { st.region.dispose(); st.region = null; }
        st.murk = 0; st.place = null;
        if (id === 'hub') { w.setLook(null); w.setHubVisible(true); }
        else {
            st.tier = st.tier || tier({ w: W.innerWidth, h: W.innerHeight, mem: navigator.deviceMemory, save: navigator.connection && navigator.connection.saveData });
            const reg = buildRegion(w.three, id, st.tier, { mounted: true }); reg.group.userData.bwr = true; reg.group.position.copy(centerOf(id));
            w.setHubVisible(false); w.scene.add(reg.group);
            const bg = new w.three.Color(reg.bg); if (lightMode()) bg.lerp(new w.three.Color(0xcfe4f7), 0.22);
            w.setLook({ bg, fog: 0.026 }); st.region = reg;
        }
        st.cur = id; renderUi(); if (id === 'lung' && !st.warp) lungCard(); say(id);
        try { W.dispatchEvent(new CustomEvent('lowi:world-region', { detail: { id, place: id === 'hub' ? 'blood' : id } })); } catch (e) { }
    }
    /* fromBase: the base world already started its glide (its labels, beacon taps or the card's Back) */
    /* opts.wide (World map): the trip back out ends on the whole world, not on Misty's close framing */
    function travel(id, fromBase, tries, opts) {
        id = norm(id);
        if (!byId(id) || id === st.cur && !st.busy) return false;
        if (st.busy) { if (id !== st.target) { st.next = id; st.nextOpts = opts || null; } return false; }
        const a = w3();
        if (!a || a.state === 'fallback' || !a.open) { openJourney(id); return false; }
        if (!wo() || !host()) { if ((tries || 0) < 12) { a.open(); setTimeout(() => travel(id, false, (tries || 0) + 1, opts), 400); return true; } openJourney(id); return false; }
        hook(); ensureUi();
        const w = wo(), THREE = w.three, h = st.host;
        st.busy = true; st.target = id; st.next = null;
        const done = () => { st.busy = false; st.target = null; const n = st.next, no = st.nextOpts; st.next = null; st.nextOpts = null; if (n && n !== st.cur) travel(n, false, 0, no || undefined); };
        /* back out of a place to the bloodstream: the reversed fly-to (see stepWarp) starts the base glide itself, later */
        const rev = id === 'hub' && st.cur !== 'hub' && !fromBase && !reduced() && !!a.rig;
        if (!fromBase && !rev && a.flyTo) { st.ownFly = true; try { a.flyTo(id === 'hub' ? null : baseId(id)); } finally { st.ownFly = false; } }
        if (h) h.classList.remove('bw3-flash');
        if (reduced()) { enter(id); lungCard(); done(); return true; }
        const R = byId(id), from = byId(st.cur), src = rev && from ? from : R, hue = src.hue != null ? src.hue : 0xe0475a;
        const q = { id, phase: 'glide', t0: 0, saw: false, amt: 0, last: null, outT: null, hue, css: src.css, fov0: w.camera.fov, done, clock: 0 };
        if (rev) { q.rev = true; q.wide = !!(opts && opts.wide); q.phase = 'unsettle'; q.tu = 0; veil(0, src.css); if (a.rig.fly) a.rig.fly = null; a.rig.vy = 0; a.rig.vp = 0; }
        else if (st.cur !== 'hub') { veil(1, from.css); q.outT = 0; if (id === 'hub') enter('hub'); else leaveQuiet(); }
        const bp = (a.regions || []).find(x => x.id === baseId(rev && from ? from.id : id));
        q.B = bp && bp.pos ? bp.pos.clone() : new THREE.Vector3();
        q.streaks = buildWarp(THREE, (st.tier || tier({ w: W.innerWidth, h: W.innerHeight, mem: navigator.deviceMemory })) === 'low' ? 70 : 130, hue);
        q.streaks.group.userData.bwr = true; w.scene.add(q.streaks.group); q.streaks.follow(w.camera);
        q.portal = portalFor(THREE, hue); w.scene.add(q.portal.sprite);
        if (h) h.classList.add('bwr-warp');
        st.warp = q;
        warpEv('start', id, q.from = from ? from.id : st.cur);
        return true;
    }
    function openJourney(id) {
        const pid = id === 'hub' ? 'blood' : id;
        try { if (W.LowiBodyTrips && W.LowiBodyTrips.open) { const a = w3(); if (a && a.close && host()) a.close(); return W.LowiBodyTrips.open(pid); } } catch (e) { }
    }
    function openMap() {
        let m = D.getElementById('bwrMap'); if (m) m.remove();
        const l = lang(), nodes = [HUB].concat(REGIONS);
        const lines = ROUTE.map(id => { const R = byId(id); return '<line x1="' + HUB.map[0] + '" y1="' + HUB.map[1] + '" x2="' + R.map[0] + '" y2="' + R.map[1] + '"/>'; }).join('') + ROUTE.slice(1).map((id, i) => { const a = byId(ROUTE[i]), b = byId(id); return '<line class="m" x1="' + a.map[0] + '" y1="' + a.map[1] + '" x2="' + b.map[0] + '" y2="' + b.map[1] + '"/>'; }).join('');
        const dots = nodes.map(R => '<button type="button" class="bwr-node' + (R.id === st.cur ? ' cur' : '') + '" data-bwr="' + R.id + '" style="left:' + R.map[0] + '%;top:' + R.map[1] + '%;--h:' + R.css + '"><i></i><span>' + esc(pick(R.n, l)) + '</span></button>').join('');
        m = D.createElement('div'); m.id = 'bwrMap'; m.className = 'bwr-map'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', T('Body world map', 'Karte der K\u00f6rperwelt', 'Mapa del mundo del cuerpo'));
        m.innerHTML = '<div class="bwr-map-card"><div class="bwr-map-hd"><b>' + esc(T('Your body world', 'Deine K\u00f6rperwelt', 'Tu mundo del cuerpo')) + '</b><button type="button" class="bwr-x" data-x aria-label="' + esc(T('Close', 'Schlie\u00dfen', 'Cerrar')) + '">\u00d7</button></div>' +
            '<p>' + esc(T('Tap a place and you zoom right into it.', 'Tipp auf einen Ort und du zoomst direkt hinein.', 'Toca un lugar y entras volando directamente.')) + '</p>' +
            '<div class="bwr-body"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="sil" d="M50 2c6 0 10 5 10 11s-4 10-10 10-10-4-10-10 4-11 10-11zM34 25h32c6 0 9 4 9 9v28c0 4-3 6-6 6l-3 30h-8l-2-26h-12l-2 26h-8l-3-30c-3 0-6-2-6-6V34c0-5 3-9 9-9z"/>' + lines + '</svg>' + dots + '</div></div>';
        ['pointerdown', 'touchstart', 'wheel'].forEach(n => m.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        m.addEventListener('click', e => { e.stopPropagation(); if (e.target === m || e.target.closest('[data-x]')) { m.remove(); return; } const b = e.target.closest('[data-bwr]'); if (b) { m.remove(); travel(b.dataset.bwr); } });
        (host() || D.body).appendChild(m);
        const x = m.querySelector('[data-x]'); x && x.focus && x.focus({ preventScroll: true });
    }
    function reset() {
        if (st.warp) { const q = st.warp; st.warp = null; clean(q); warpEv('cancel', q.id, q.from); }
        if (st.region) { st.region.dispose(); st.region = null; }
        setLook(null); setHubVisible(true);
        if (st.host) st.host.classList.remove('bwr-on', 'bwr-in', 'bwr-warp');
        [st.veil, st.label, st.mapBtn].forEach(e => { try { e && e.remove(); } catch (x) { } });
        st.cur = 'hub'; st.busy = false; st.target = null; st.next = null; st.mapBtn = null; st.label = null; st.veil = null; st.host = null;
        const m = D.getElementById('bwrMap'); if (m) m.remove();
    }
    /* the base world's own chips, labels and beacon taps fly to a place: follow it into the region */
    W.addEventListener('lowi:world3d-place', e => { const id = e && e.detail && e.detail.id; const h = host(); if (!id || !h) return; if (!reduced()) h.classList.remove('bw3-flash'); const r = norm(id); if (ROUTE.indexOf(r) >= 0) travel(r, true); });
    /* the card's Back button returns the base camera to the hub: leave the region with it */
    D.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('.bw3-full [data-bw3-back]'); if (b && (st.cur !== 'hub' || st.busy)) travel('hub', true); }, true);
    W.addEventListener('lowi:world3d-ready', () => hook());
    W.addEventListener('lowi:lang', () => renderUi());
    hook();
    Object.assign(API, { travel, openMap, current: () => st.cur, state: st, reset });
})();
