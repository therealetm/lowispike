// Browser check for galaxy-bubbles.js on the real 3D world (not part of the offline suite: needs Playwright's Chromium).
// Usage: NODE_PATH=<dir with playwright-core> node tests/galaxy-bubbles-live.cjs
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, s) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); s.end(b); }); });
const SIZES = process.env.ONE ? [[390, 844]] : [[390, 844], [375, 667], [844, 390], [820, 1180], [1180, 820]];
(async () => {
    await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
    const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
    for (const [wd, ht] of SIZES) {
        const page = await browser.newPage({ viewport: { width: wd, height: ht }, deviceScaleFactor: 1 });
        const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
        await page.goto(`http://localhost:${port}/tests/galaxy-bubbles-stage.html`);
        await page.waitForFunction(() => window.stage && window.stage.ready, null, { timeout: 60000 });
        const tag = wd + 'x' + ht;
        if (wd === 390) {
            const info = await page.evaluate(() => ({ worlds: stage.worlds(), paths: stage.paths().length, dirs: stage.paths().filter(p => p.dir === 1 || p.dir === -1).length }));
            ok(info.worlds > 10 && info.paths > 10 && info.dirs === info.paths, `${tag} cosmos: ${info.worlds} worlds, ${info.paths} currents, all with a flow direction`);
            /* a current: put her on the middle of a thread, no steering: she is carried along it */
            const cur = await page.evaluate(() => {
                const pa = stage.paths().find(p => p.a > 0 && p.b > 0) || stage.paths()[0], g = stage.w.scene.getObjectByName('cosmos'); g.updateMatrixWorld();
                const at = i => new stage.THREE.Vector3(pa.arr[i * 3], pa.arr[i * 3 + 1], pa.arr[i * 3 + 2]).applyMatrix4(g.matrixWorld);
                const m = at(20), t = at(21).sub(at(19)).normalize().multiplyScalar(pa.dir); stage.put(m.x, m.y, m.z); stage.w.rig.dist = 80;
                const p0 = stage.S.p.clone(); const s = stage.run(2, { mag: 0 }); const moved = stage.S.p.clone().sub(p0);
                const free = stage.run(0.01, {}); return { along: moved.dot(t), side: moved.clone().sub(t.clone().multiplyScalar(moved.dot(t))).length(), riding: s.riding, current: s.current };
            });
            ok(cur.along > 3 && cur.riding >= 0, `${tag} a current carries her without steering: ${cur.along.toFixed(1)} units along the flow in 2 s (side drift ${cur.side.toFixed(1)}), current ${cur.current}`);
            /* against the flow at full push vs with it */
            const ag = await page.evaluate(() => {
                const pa = stage.paths().find(p => p.a > 0 && p.b > 0) || stage.paths()[0], g = stage.w.scene.getObjectByName('cosmos'); g.updateMatrixWorld();
                const at = i => new stage.THREE.Vector3(pa.arr[i * 3], pa.arr[i * 3 + 1], pa.arr[i * 3 + 2]).applyMatrix4(g.matrixWorld);
                const go = sg => { const m = at(18), t = at(19).sub(at(17)).normalize().multiplyScalar(pa.dir * sg); stage.put(m.x, m.y, m.z); stage.w.rig.dist = 80; const p0 = m.clone(); stage.run(0.8, { mag: 1, want: t.toArray() }); return stage.S.p.clone().sub(p0).dot(t); };
                return { withF: go(1), against: go(-1) };
            });
            ok(ag.withF > ag.against * 1.5 && ag.against > 0, `${tag} with the flow ${ag.withF.toFixed(1)} vs against it ${ag.against.toFixed(1)} units in 0.8 s at full push (against = slow but possible)`);
            /* a bubble: fly at the first world, keep pushing: she goes in, the camera comes in; push out: she leaves */
            const inn = await page.evaluate(() => {
                const q = stage.world(0); const dir = new stage.THREE.Vector3(1, 0.2, 0.4).normalize(); const st = q.p.clone().addScaledVector(dir, q.r + 6); stage.put(st.x, st.y, st.z); stage.w.rig.dist = 80;
                let s = null; for (let i = 0; i < 40 && (!s || s.inside < 0); i++) s = stage.run(0.1, { mag: 1, aim: { i: 0 } });
                const s2 = stage.run(2.5, { mag: 0 });
                return { inside: s.inside, dist: s2.dist, r: q.r, log: s2.log };
            });
            ok(inn.inside === 0, `${tag} pushing into a bubble (r ${inn.r.toFixed(0)}) takes her in`);
            ok(inn.dist < 64, `${tag} inside, the camera comes in close (distance ${inn.dist})`);
            await page.screenshot({ path: '/tmp/gb-inside-' + tag + '.png' });
            const out = await page.evaluate(() => {
                let s = null; for (let i = 0; i < 60 && (!s || s.inside >= 0); i++) s = stage.run(0.1, { mag: 1, want: [1, 0.2, 0.4] });
                const q = stage.world(0), d = stage.S.p.distanceTo(q.p); const s2 = stage.run(3, { mag: 0 });
                return { inside: s.inside, d, r: q.r, dist: s2.dist, floor: s2.floor };
            });
            ok(out.inside === -1 && out.d > out.r, `${tag} pushing out against the membrane lets her out (${out.d.toFixed(1)} from the middle, r ${out.r.toFixed(1)})`);
            ok(out.dist > 60, `${tag} the camera backs out to the galaxy again (distance ${out.dist})`);
            /* the way home lets her straight out of a bubble, no jump to the membrane */
            const home = await page.evaluate(() => {
                const q = stage.world(1); const st = q.p.clone().add(new stage.THREE.Vector3(0, q.r + 6, 0)); stage.put(st.x, st.y, st.z); stage.w.rig.dist = 80;
                let s = null; for (let i = 0; i < 80 && (!s || s.inside < 0); i++) s = stage.run(0.1, { mag: 1, aim: { i: 1 } });
                stage.run(1.5, { mag: 0 });
                const wasIn = s.inside; const p0 = stage.S.p.clone(); stage.run(1 / 30, { mode: 'home', mag: 0 }); const jump = stage.S.p.distanceTo(p0); const s2 = stage.run(0.5, { mode: 'home' }); stage.run(0.01, { mode: 'drive' });
                return { wasIn, after: s2.inside, jump };
            });
            ok(home.wasIn === 1 && home.after === -1 && home.jump < 2, `${tag} the way home lets her out of a bubble without a jump (${home.jump.toFixed(2)}) ` + JSON.stringify(home));
            /* just touching (no push) never goes in: she slides round */
            const touch = await page.evaluate(() => {
                const q = stage.world(2); const st = q.p.clone().add(new stage.THREE.Vector3(0, 0, q.r * 1.02)); stage.put(st.x, st.y, st.z);
                const s = stage.run(2, { mag: 0.2, aim: { i: 2 } }); return { inside: s.inside, d: stage.S.p.distanceTo(q.p), r: q.r };
            });
            ok(touch.inside === -1 && touch.d >= touch.r, `${tag} a weak touch slides round, does not go in`);
        } else {
            const inn = await page.evaluate(() => { const q = stage.world(0); const st = q.p.clone().add(new stage.THREE.Vector3(0, 0, q.r + 6)); stage.put(st.x, st.y, st.z); let s = null; for (let i = 0; i < 40 && (!s || s.inside < 0); i++) s = stage.run(0.1, { mag: 1, aim: { i: 0 } }); stage.run(2, { mag: 0 }); return s.inside; });
            ok(inn === 0, `${tag} into a bubble`);
            await page.screenshot({ path: '/tmp/gb-inside-' + tag + '.png' });
        }
        const pe = errs.filter(e => !/GPU stall|WebGL|swiftshader|Automatic fallback/i.test(e));
        ok(pe.length === 0, `${tag} no page errors` + (pe.length ? ': ' + pe.slice(0, 3).join(' | ') : ''));
        await page.close();
    }
    await browser.close(); srv.close();
    console.log(fail ? fail + ' failed' : 'all ok'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
