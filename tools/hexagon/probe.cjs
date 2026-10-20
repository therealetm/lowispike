'use strict';
/* Render Home's 3D world at given camera poses (POSES env, JSON) and report where the six place beacons land on screen.
   node tools/hexagon/probe.cjs <repoRoot> <tag> [view]   (needs playwright from /tmp/pw, see the galaxy-audit lib) */
const L = require(process.env.HEX_LIB || '/home/sprite/galaxy-audit/lib.cjs'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2]), TAG = process.argv[3] || 'x', VIEW = process.argv[4] || 'chromium390';
const OUT = process.env.HEX_OUT || '/tmp/hexagon-out'; fs.mkdirSync(OUT, { recursive: true });
const POSES = JSON.parse(process.env.POSES || '[]');
(async () => {
    const srv = await L.serve(ROOT), url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
    const h = await L.open({ url, view: VIEW, settle: 6000 });
    const res = { tag: TAG, errors: h.log, poses: [] };
    try {
        await h.page.waitForFunction(() => { const a = window.LowiWorld3D; return a && a.rig && a.rig.mode === 'home' && a.camera; }, null, { timeout: 60000 });
        res.rig = await h.page.evaluate(() => { const r = window.LowiWorld3D.rig; return { dist: r.dist, homeDist: r.homeDist, homeRest: r.homeRest, maxD: r.maxD, minD: r.minD, pitch: r.pitch, yaw: r.yaw, pMax: r.pMax }; });
        /* hold the camera where we put it: no idle spin, no gyro */
        await h.page.evaluate(() => { window.__hold = null; const f = () => { const a = window.LowiWorld3D, p = window.__hold; if (a && a.rig && p) { const r = a.rig; r.idle = 0; r.vy = r.vp = 0; r.gyT = r.gpT = 0; if (p.dist === 'rest') r.dist = r.homeRest; else if (p.dist === 'max') r.dist = r.maxD; else if (p.dist) r.dist = p.dist; if (p.pitch != null) r.pitch = p.pitch; if (p.yaw != null) r.yaw = p.yaw; } requestAnimationFrame(f); }; requestAnimationFrame(f); });
        for (const p of POSES) {
            await h.page.evaluate(p => { window.__hold = p; }, p);
            await L.sleep(p.wait || 1800);
            const info = await h.page.evaluate(() => {
                const a = window.LowiWorld3D, cam = a.camera, c = a.renderer.domElement.getBoundingClientRect(), V = a.THREE.Vector3;
                const pts = (a.regions || []).map(g => { const v = g.pos.clone().project(cam); return { id: g.id, x: Math.round(c.left + (v.x + 1) / 2 * c.width), y: Math.round(c.top + (1 - v.y) / 2 * c.height), pos: [g.pos.x, g.pos.y, g.pos.z].map(n => +n.toFixed(3)) }; });
                return { pts, cam: [cam.position.x, cam.position.y, cam.position.z].map(n => +n.toFixed(2)), dist: a.rig.dist, pitch: a.rig.pitch, yaw: a.rig.yaw };
            });
            const file = path.join(OUT, TAG + '-' + p.name + '.png');
            await h.page.screenshot({ path: file });
            res.poses.push(Object.assign({ name: p.name, file }, info));
        }
        res.after = await L.snap(h);
    } catch (e) { res.fail = String(e.stack || e).slice(0, 600); }
    fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify(res, null, 1));
    console.log(JSON.stringify({ rig: res.rig, fail: res.fail, errors: res.errors, poses: res.poses.map(p => ({ n: p.name, d: +p.dist.toFixed(2), pitch: +p.pitch.toFixed(2), yaw: +p.yaw.toFixed(2), pts: p.pts.map(q => q.id[0] + q.id[1] + ':' + q.x + ',' + q.y).join(' ') })) }, null, 1));
    await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
