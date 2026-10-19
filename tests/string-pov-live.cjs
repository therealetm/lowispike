// Browser check for string-pov.js (Ant-Man POV on the strings) on the real 3D world. Not part of the offline suite.
// Usage: NODE_PATH=<dir with playwright-core> [ENGINE=webkit] [SHOTS=dir] node tests/string-pov-live.cjs
// Simulated flight in headless Chromium / Playwright WebKit (iPhone 13, iPad sizes), not a device test.
const pw = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, s) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); s.end(b); }); });
const ENGINE = process.env.ENGINE || 'chromium';
const SIZES = (ENGINE === 'webkit' ? [['iPhone 13'], ['iPad (gen 7)']] : [[390, 844], [820, 1180]]).slice(0, process.env.ONE ? 1 : 2);
(async () => {
    await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
    const browser = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
    for (const sz of SIZES) {
        const opts = typeof sz[0] === 'string' ? Object.assign({}, pw.devices[sz[0]]) : { viewport: { width: sz[0], height: sz[1] } };
        if (ENGINE === 'webkit') delete opts.defaultBrowserType;
        const ctx = await browser.newContext(opts), page = await ctx.newPage();
        const tag = (typeof sz[0] === 'string' ? sz[0] : sz.join('x')) + ' ' + ENGINE;
        const perr = []; page.on('pageerror', e => perr.push(String(e)));
        await page.goto(`http://localhost:${port}/tests/string-pov-stage.html`, { timeout: 120000 });
        await page.waitForFunction(() => window.stage && window.stage.ready, null, { timeout: 60000 });
        const r = await page.evaluate(() => {
            const st = window.stage, out = {};
            /* the longest string, started at its first free point */
            const ps = st.paths(); let best = -1, bl = 0;
            ps.forEach((p, i) => { const s = st.stream(i); if (!s) return; const a = s.pts[s.entry], b = s.pts[s.end]; const l = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); if (l > bl) { bl = l; best = i; } });
            out.string = best; out.len = Math.round(bl);
            const s = st.stream(best), e = s.pts[s.entry], f = s.pts[Math.min(s.end, s.entry + 1)];
            const back = [e[0] - f[0], e[1] - f[1], e[2] - f[2]], bl2 = Math.hypot(...back) || 1;
            /* A: autopilot swimming next to the string but not on it yet: the normal galaxy view */
            st.put(e[0] + back[0] / bl2 * 30, e[1] + back[1] / bl2 * 30 + 1, e[2] + back[2] / bl2 * 30);
            st.set({ mode: 'auto', exRide: false, swim: best });
            st.run(2.5);
            out.A = st.state(); out.A.loom = st.loom(); out.A.ms = st.timing(30);
            /* B: she gets onto the string and rides it */
            st.put(e[0], e[1] + 0.6, e[2]); st.set({ exRide: true });
            st.run(0.1); out.B0 = st.state();
            st.run(3.6, true); out.B = st.state(); out.B.loom = st.loom(); out.B.her = st.screen(st.S.p); out.B.tubes = st.tubes(); out.B.look = st.look();
            out.Bf = st.frames(); out.B.ms = st.timing(30);
            return out;
        });
        if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.SHOTS, tag.replace(/\W+/g, '-') + '-pov.png'), timeout: 180000 }); }
        const c = await page.evaluate(() => {
            const st = window.stage, out = {};
            /* C: she leaves the string (flies herself across a gap): back to the normal view */
            st.set({ exRide: false, swim: -1, want: [0.3, 1, 0.2] });
            st.run(0.4, true); out.C0 = st.state();
            st.run(6.6, true); out.C = st.state(); out.C.tubes = st.tubes(); out.Cf = st.frames(); out.C.loom = st.loom();
            return out;
        });
        if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, tag.replace(/\W+/g, '-') + '-after.png'), timeout: 180000 });
        const A = r.A, B = r.B, C = c.C;
        console.log(`   ${tag}: string ${r.string} (${r.len} u) | normal dist ${A.dist} loom ${A.loom} ${A.ms.toFixed(1)} ms | POV dist ${B.dist} k ${B.pov.k} riding ${B.riding} hs ${B.hs} loom ${B.loom} tube ${JSON.stringify(B.pov.tube)} her ${B.her} ${B.ms.toFixed(1)} ms | after dist ${C.dist} k ${C.pov.k} tubes ${C.tubes}`);
        ok(A.pov.k === 0 && A.riding < 0, tag + ': off the string the camera is the normal galaxy view');
        ok(B.riding >= 0 && B.pov.k > 0.95, tag + ': riding the string, the POV is all the way in (k ' + B.pov.k + ')');
        ok(B.dist <= A.dist / 12, tag + ': it is a shift to tiny scale: ' + B.dist + ' vs ' + A.dist);
        ok(B.tubes === 1 && B.pov.tube && B.pov.tube.R >= B.hs * 4, tag + ': the string she rides is a huge cable next to her');
        ok(B.look > 0.6, tag + ': the camera is behind her, looking the way she is carried (' + B.look + ')');
        ok(B.loom > A.loom * 1.15, tag + ': the world looms bigger (largest bubble ' + B.loom + ' vs ' + A.loom + ' of the screen)');
        const onScreen = r.Bf.filter(f => f.k > 0.5).every(f => Math.abs(f.her[0]) < 0.75 && Math.abs(f.her[1]) < 0.75 && f.her[2] < 1);
        ok(onScreen, tag + ': Misty stays on screen the whole ride');
        const all = r.Bf.concat(c.Cf); let jump = 0, camJump = 0;
        for (let i = 1; i < all.length; i++) { jump = Math.max(jump, Math.abs(Math.log(all[i].dist / all[i - 1].dist))); }
        ok(jump < 0.12, tag + ': one continuous move, no jump (largest step ' + jump.toFixed(3) + ' per frame)');
        ok(C.pov.k === 0 && Math.abs(C.dist - A.dist) / A.dist < 0.25 && C.riding < 0, tag + ': off the string it grows back out to the normal view (' + C.dist + ')');
        ok(C.tubes === 0, tag + ': the big string is gone and freed afterwards');
        ok(!perr.length && !B.errors.length && !C.errors.length, tag + ': no page errors ' + perr.concat(C.errors).join(' | '));
        /* Reduce Motion: no POV at all */
        const rm = await page.evaluate(() => { const st = window.stage, s = st.stream(st.paths().length ? 0 : 0); st.set({ reduced: true, exRide: true, swim: 0 }); const e = s.pts[s.entry]; st.put(e[0], e[1], e[2]); st.run(2); return st.state(); });
        ok(rm.pov.k === 0 && rm.pov.tube === null, tag + ': Reduce Motion: no POV');
        await ctx.close();
    }
    await browser.close(); srv.close();
    console.log(fail ? fail + ' FAILED' : 'all ok'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
