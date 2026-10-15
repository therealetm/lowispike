/* LOWiSPIKE whole body world (Oct 15, 2026, ref Random42 "Intercellular" aogLFedcnTI, spec VISUAL-MASTER.md "Whole world").
   The body is one explorable 3D world: the bloodstream hub (owned by body-world-3d*.js) plus seven regions you travel to
   through a vessel and look around in: brain, lung, heart, liver, pancreas, gut, muscle. Regions are built lazily inside the
   SAME renderer/scene as the hub (window.LowiWorld3D), only one at a time, and disposed when you leave. No second WebGL
   context. Drag / pinch / gyro come from the hub controls, which orbit around the origin, so every region is laid out
   around the origin. No WebGL or reduced motion: the world bar still lists the regions and opens the 2D journey sheets.
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
            n: ['Gut', 'Darm', 'Intestino'], line: ['A forest of villi. Your microbe buddies live here.', 'Ein Wald aus Zotten. Hier wohnen deine Mikroben-Freunde.', 'Un bosque de vellosidades. Aquí viven tus microbios.'] },
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
    const travelMs = reduced => reduced ? 250 : 1900;
    const pick = (arr, l) => arr[{ en: 0, de: 1, es: 2 }[l] || 0] || arr[0];
    function chips(cur, l) {
        return neighbours(cur).map(id => ({ id, label: pick(byId(id).n, l), hub: id === 'hub' }));
    }

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
    /* vessel: an open tube around the camera, along its view axis; it follows the camera every frame, and its wall
       texture streams past = flying forward through a blood vessel, whatever the orbit rig does meanwhile */
    function buildVessel(THREE, hue) {
        const g = new THREE.Group(), wt = texCanvas(THREE, 128, (x, s) => { x.fillStyle = '#3a0a16'; x.fillRect(0, 0, s, s); for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(' + (180 + (i * 37) % 70) + ',40,70,' + (0.25 + (i % 5) * 0.1) + ')'; x.beginPath(); x.ellipse((i * 53) % s, (i * 29) % s, 6 + i % 9, 3 + i % 4, 0, 0, 7); x.fill(); } });
        wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(3, 10);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 90, 28, 1, true), new THREE.MeshBasicMaterial({ map: wt, side: THREE.BackSide, color: 0xffffff, fog: false, depthTest: false }));
        tube.rotation.x = Math.PI / 2; tube.renderOrder = 998; tube.frustumCulled = false;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: hue == null ? 0xffffff : hue, transparent: true, opacity: 0.8, fog: false, depthTest: false }));
        ring.renderOrder = 999; ring.frustumCulled = false; ring.position.z = -40;
        const cells = [], cg = new THREE.SphereGeometry(0.22, 10, 6); cg.scale(1, 0.4, 1);
        const cm = new THREE.MeshBasicMaterial({ color: 0xd8445e, fog: false, depthTest: false });
        for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(cg, cm); m.renderOrder = 998; m.frustumCulled = false; const a = i * 2.4; m.position.set(Math.cos(a) * (0.6 + (i % 3) * 0.3), Math.sin(a) * (0.6 + (i % 3) * 0.3), -3 - i * 3); m.rotation.set(i, i * 0.7, 0); cells.push(m); g.add(m); }
        g.add(tube, ring);
        return { group: g, follow(cam) { g.position.copy(cam.position); g.quaternion.copy(cam.quaternion); },
            tick(p) { wt.offset.y = -p * 7; ring.position.z = -40 + p * 40; ring.material.opacity = 0.8 * Math.min(1, p * 2.5); cells.forEach((m, i) => { let z = m.position.z + 0.9; if (z > 1) z -= 44; m.position.z = z; m.rotation.x += 0.05; }); },
            dispose() { tube.geometry.dispose(); tube.material.dispose(); wt.dispose(); ring.geometry.dispose(); ring.material.dispose(); cg.dispose(); cm.dispose(); if (g.parent) g.parent.remove(g); } };
    }

    const API = { REGIONS, HUB, ROUTE, norm, byId, neighbours, regionForJourney, tier, counts, travelMs, chips, buildRegion, buildVessel, BUILD };
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
    const st = { cur: 'hub', target: null, next: null, region: null, vessel: null, busy: false, tier: null, off: null, label: null, bar: null, host: null, lt: 0 };
    const w3 = () => W.LowiWorld3D || null;
    const baseId = id => id === 'muscle' ? 'muscles' : id;
    const parked = []; let look = null, fogWas = null;
    function setHubVisible(on) {
        const a = w3(); if (!a || !a.scene) return;
        if (on) { parked.forEach(p => { p[0].layers.mask = p[1]; }); parked.length = 0; return; }
        if (parked.length) return;
        a.scene.children.forEach(c => { if (c.isLight || (c.userData && c.userData.bwr)) return; c.traverse(o => { if (o.isLight) return; parked.push([o, o.layers.mask]); o.layers.set(31); }); });
    }
    function setLook(o) {
        const a = w3(); if (!a || !a.scene || !a.scene.fog) { look = o; return; }
        if (o && fogWas == null) fogWas = a.scene.fog.density;
        if (!o && fogWas != null) { a.scene.fog.density = fogWas; fogWas = null; }
        look = o;
    }
    function applyLook() {
        const a = w3(); if (!look || !a || !a.scene) return;
        if (a.scene.background && a.scene.background.copy) a.scene.background.copy(look.bg);
        if (a.scene.fog) { a.scene.fog.color.copy(look.bg); a.scene.fog.density = look.fog; }
    }
    function centerOf(id) {
        const a = w3(), THREE = a.THREE, r = (a.regions || []).find(x => x.id === baseId(id));
        return r && r.pos ? r.pos.clone().multiplyScalar(0.92) : new THREE.Vector3();
    }
    const wo = () => { const a = w3(); return a && a.ready && a.scene && a.camera && a.THREE ? { scene: a.scene, camera: a.camera, three: a.THREE, setHubVisible, setLook } : null; };
    function explored(id) {
        try { const t = W.LowiBodyTrips; const pid = id === 'hub' ? 'blood' : id; const v = t && (t.progress ? t.progress(pid) : t.pct ? t.pct(pid) : null); const n = typeof v === 'number' ? v : (v && (v.pct != null ? v.pct : v.p)); return Math.max(0, Math.min(100, Math.round(n || 0))); } catch (e) { return 0; }
    }
    function host() { const a = w3(); if (!a || !a.isOpen || !a.isOpen()) return null; const h = D.querySelector('.bw3-full'); return h && h.isConnected ? h : null; }
    function ensureUi() {
        const h = host(); if (!h) return null;
        if (st.bar && st.bar.isConnected && st.host === h) return st.bar;
        st.host = h;
        const bar = D.createElement('div'); bar.className = 'bwr-bar'; bar.id = 'bwrBar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', T('Travel through your body', 'Durch deinen K\u00f6rper reisen', 'Viajar por tu cuerpo'));
        bar.addEventListener('click', e => { const b = e.target.closest('[data-bwr]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const v = b.dataset.bwr; if (v === 'map') openMap(); else if (v === 'journey') openJourney(st.cur); else travel(v); });
        ['pointerdown', 'touchstart', 'wheel'].forEach(n => bar.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        const mapBtn = D.createElement('button'); mapBtn.type = 'button'; mapBtn.className = 'bwr-mapbtn'; mapBtn.id = 'bwrMapBtn';
        mapBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="13" r="2.2"/><circle cx="18" cy="13" r="2.2"/><circle cx="12" cy="20" r="2.2"/><path d="M12 7v11M12 7l-5 4.5M12 7l5 4.5" fill="none"/></svg><span></span>';
        mapBtn.addEventListener('click', e => { e.stopPropagation(); openMap(); });
        ['pointerdown', 'touchstart'].forEach(n => mapBtn.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        const lab = D.createElement('div'); lab.className = 'bwr-label'; lab.id = 'bwrLabel'; lab.setAttribute('aria-live', 'polite');
        h.classList.add('bwr-on'); h.appendChild(lab); h.appendChild(mapBtn); h.appendChild(bar); st.bar = bar; st.label = lab; st.mapBtn = mapBtn; renderBar(); return bar;
    }
    function renderBar() {
        if (!st.bar) return;
        const l = lang(), cur = byId(st.cur), list = chips(st.cur, l);
        st.mapBtn.querySelector('span').textContent = T('World map', 'Weltkarte', 'Mapa');
        const here = '<span class="bwr-here" style="--h:' + cur.css + '"><i></i>' + esc(pick(cur.n, l)) + '</span>';
        const btns = list.map(c => { const R = byId(c.id), pct = explored(c.id); return '<button type="button" class="bwr-chip' + (c.hub ? ' hub' : '') + '" data-bwr="' + c.id + '" style="--h:' + R.css + '" aria-label="' + esc(T('Travel to ', 'Reise zu ', 'Viajar a ') + c.label) + '"><i></i>' + esc(c.label) + (pct ? '<small>' + pct + '%</small>' : '') + '</button>'; }).join('');
        const extra = (st.cur !== 'hub' && W.LowiBodyTrips && W.LowiBodyTrips.open ? '<button type="button" class="bwr-chip ghost" data-bwr="journey">' + esc(T('Journey', 'Reise', 'Viaje')) + '</button>' : '');
        st.bar.innerHTML = here + '<div class="bwr-chips">' + btns + extra + '</div>';
        st.bar.dataset.cur = st.cur;
        const h = st.host; if (h) { h.classList.toggle('bwr-in', st.cur !== 'hub'); h.style.setProperty('--bwr-h', cur.css); const t = h.querySelector('.bw3-top b'); if (t) { if (!t.dataset.hubTitle) t.dataset.hubTitle = t.textContent; t.textContent = st.cur === 'hub' ? t.dataset.hubTitle : pick(cur.n, l); } }
    }
    function say(id) {
        if (!st.label) return; const R = byId(id), l = lang();
        const card = st.host && st.host.querySelector('.bw3-card'); if (card && !card.hidden && id !== 'hub') { st.label.classList.remove('on'); return; }
        let line = pick(R.line, l);
        try { const c = W.LowiBodyDepth && W.LowiBodyDepth.arrival && W.LowiBodyDepth.arrival(id === 'hub' ? 'blood' : id); if (c && (c.line || c.text)) line = c.line || c.text; } catch (e) { }
        st.label.innerHTML = '<b style="--h:' + R.css + '">' + esc(pick(R.n, l)) + '</b><span>' + esc(line) + '</span>';
        st.label.classList.remove('on'); void st.label.offsetWidth; st.label.classList.add('on');
        clearTimeout(st.lt); st.lt = setTimeout(() => st.label && st.label.classList.remove('on'), 3600);
    }
    function frame(t, dt) {
        const h = host();
        if (st.host && h !== st.host) reset();
        if (h && !st.host) ensureUi();
        const w = wo(); if (!w) return;
        if (st.vessel) {
            const v = st.vessel, p = Math.min(1, (performance.now() - v.t0) / v.ms); v.v.follow(w.camera); v.v.tick(p);
            if (p >= 1) { st.vessel = null; v.v.dispose(); v.done(); }
        }
        if (st.region && st.region.tick) { try { st.region.tick(t, Math.min(0.05, dt || 0.016), reduced()); } catch (e) { } }
        applyLook();
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
        if (id === 'hub') { w.setLook(null); w.setHubVisible(true); }
        else {
            st.tier = st.tier || tier({ w: W.innerWidth, h: W.innerHeight, mem: navigator.deviceMemory, save: navigator.connection && navigator.connection.saveData });
            const reg = buildRegion(w.three, id, st.tier, { mounted: true }); reg.group.userData.bwr = true; reg.group.position.copy(centerOf(id));
            w.setHubVisible(false); w.scene.add(reg.group);
            const bg = new w.three.Color(reg.bg); if (lightMode()) bg.lerp(new w.three.Color(0xcfe4f7), 0.22);
            w.setLook({ bg, fog: 0.026 }); st.region = reg;
        }
        st.cur = id; renderBar(); say(id);
        try { W.dispatchEvent(new CustomEvent('lowi:world-region', { detail: { id, place: id === 'hub' ? 'blood' : id } })); } catch (e) { }
    }
    /* fromBase: the base world already started its glide (its chips, labels, beacon taps or the card's Back) */
    function travel(id, fromBase, tries) {
        id = norm(id);
        if (!byId(id) || id === st.cur && !st.busy) return false;
        if (st.busy) { if (id !== st.target) st.next = id; return false; }
        const a = w3();
        if (!a || a.state === 'fallback' || !a.open) { openJourney(id); return false; }
        if (!wo() || !host()) { if ((tries || 0) < 12) { a.open(); setTimeout(() => travel(id, false, (tries || 0) + 1), 400); return true; } openJourney(id); return false; }
        hook(); ensureUi();
        const w = wo();
        st.busy = true; st.target = id; st.next = null; st.bar && st.bar.classList.add('busy');
        const done = () => { st.busy = false; st.target = null; st.bar && st.bar.classList.remove('busy'); const n = st.next; st.next = null; if (n && n !== st.cur) travel(n, true); };
        if (!fromBase && a.flyTo) a.flyTo(id === 'hub' ? null : baseId(id));
        if (reduced()) { enter(id); done(); return true; }
        const R = byId(id), v = buildVessel(w.three, R.hue != null ? R.hue : 0xe0475a);
        v.group.userData.bwr = true;
        if (st.region) st.region.group.visible = false; w.setHubVisible(false);
        w.setLook({ bg: new w.three.Color(0x2a0a16), fog: 0.05 }); w.scene.add(v.group); v.follow(w.camera);
        st.vessel = { v, t0: performance.now(), ms: travelMs(false), done: () => { enter(id); done(); } };
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
            '<p>' + esc(T('Tap a place to travel there through your blood vessels.', 'Tipp auf einen Ort und reise durch deine Blutgef\u00e4\u00dfe dorthin.', 'Toca un lugar y viaja hasta \u00e9l por tus vasos sangu\u00edneos.')) + '</p>' +
            '<div class="bwr-body"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="sil" d="M50 2c6 0 10 5 10 11s-4 10-10 10-10-4-10-10 4-11 10-11zM34 25h32c6 0 9 4 9 9v28c0 4-3 6-6 6l-3 30h-8l-2-26h-12l-2 26h-8l-3-30c-3 0-6-2-6-6V34c0-5 3-9 9-9z"/>' + lines + '</svg>' + dots + '</div></div>';
        ['pointerdown', 'touchstart', 'wheel'].forEach(n => m.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        m.addEventListener('click', e => { e.stopPropagation(); if (e.target === m || e.target.closest('[data-x]')) { m.remove(); return; } const b = e.target.closest('[data-bwr]'); if (b) { m.remove(); travel(b.dataset.bwr); } });
        (host() || D.body).appendChild(m);
        const x = m.querySelector('[data-x]'); x && x.focus && x.focus({ preventScroll: true });
    }
    function reset() {
        if (st.vessel) { st.vessel.v.dispose(); st.vessel = null; }
        if (st.region) { st.region.dispose(); st.region = null; }
        setLook(null); setHubVisible(true);
        if (st.host) st.host.classList.remove('bwr-on', 'bwr-in');
        st.cur = 'hub'; st.busy = false; st.target = null; st.next = null; st.bar = null; st.label = null; st.host = null;
        const m = D.getElementById('bwrMap'); if (m) m.remove();
    }
    /* the base world's own chips, labels and beacon taps fly to a place: follow it into the region */
    W.addEventListener('lowi:world3d-place', e => { const id = e && e.detail && e.detail.id; if (!id || !host()) return; const r = norm(id); if (ROUTE.indexOf(r) >= 0) travel(r, true); });
    /* the card's Back button returns the base camera to the hub: leave the region with it */
    D.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('.bw3-full [data-bw3-back]'); if (b && (st.cur !== 'hub' || st.busy)) travel('hub', true); }, true);
    W.addEventListener('lowi:world3d-ready', () => hook());
    W.addEventListener('lowi:lang', () => renderBar());
    hook();
    Object.assign(API, { travel, openMap, current: () => st.cur, state: st, reset });
})();
