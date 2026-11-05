'use strict';
/* True black (Dark) probe, Nov 5 2026. Opens the app in Night, Dark or Day, visits the main screens, saves screenshots and
   measures the blue tint of the dark pixels: share of dark pixels (luma < 64) whose blue channel beats red and green by
   more than 6, and the mean colour of the dark pixels. Usage:
   node tools/true-black/tint.cjs <repo> <night|black|day> <outdir> [chromium390|iphone13] */
const L = require(process.env.LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const fs = require('fs'), path = require('path');
(async () => {
    const ROOT = path.resolve(process.argv[2] || '.'), mode = process.argv[3] || 'black', out = process.argv[4] || '/tmp/tb', view = process.argv[5] || 'chromium390';
    fs.mkdirSync(out, { recursive: true });
    const srv = await L.serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/';
    const pre = `try{localStorage.setItem('lowi.theme', ${JSON.stringify(mode === 'day' ? 'light' : 'dark')});
      localStorage.setItem('lowi.atmos', JSON.stringify({mode:'manual',p:${mode === 'day' ? 25 : 100}}));localStorage.removeItem('lowi.atmos.css');
      localStorage.setItem('lowi.theme.dark', ${JSON.stringify(mode === 'black' ? 'black' : 'night')});
      localStorage.setItem('lowi.tutorial.v1', JSON.stringify({done:true}));}catch(e){}`;
    const h = await L.open({ view, url, settle: 7000, preInit: pre });
    const p = h.page;
    const shots = [];
    async function shot(name) {
        const file = path.join(out, mode + '-' + name + '.png');
        const buf = await p.screenshot({ path: file });
        const m = await p.evaluate(async b64 => {
            const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
            const d = g.getImageData(0, 0, c.width, c.height).data; let dark = 0, blue = 0, R = 0, G = 0, B = 0, n = 0, black = 0;
            for (let i = 0; i < d.length; i += 16) { n++; const r = d[i], gg = d[i + 1], bb = d[i + 2], y = 0.299 * r + 0.587 * gg + 0.114 * bb;
                if (y < 64) { dark++; R += r; G += gg; B += bb; if (bb - Math.max(r, gg) > 6) blue++; if (r + gg + bb < 12) black++; } }
            return { darkShare: +(dark / n).toFixed(3), blueOfDark: dark ? +(blue / dark).toFixed(3) : 0, blackOfDark: dark ? +(black / dark).toFixed(3) : 0, meanDark: dark ? [R / dark | 0, G / dark | 0, B / dark | 0] : null };
        }, buf.toString('base64'));
        const attrs = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, black: document.documentElement.dataset.black || '', tab: (document.querySelector('#main>.tab.active') || {}).id || '' }));
        shots.push(Object.assign({ name, file }, attrs, m));
        console.log(JSON.stringify(shots[shots.length - 1]));
    }
    await shot('home');
    /* the 3D world alone: the Home bubbles (DOM + their 3D glass) hidden for one shot */
    await p.evaluate(() => { window.__tbHid = []; const a = window.LowiWorld3D; if (a && a.scene) a.scene.traverse(o => { if (o.userData && o.userData.lwKeep && o.visible) { o.visible = false; window.__tbHid.push(o); } });
        document.querySelectorAll('#whHud, #spHome, .wh-hud').forEach(e => { e.style.visibility = 'hidden'; window.__tbHid.push(e); }); });
    await L.sleep(900); await shot('world');
    await p.evaluate(() => (window.__tbHid || []).forEach(o => { if (o.style) o.style.visibility = ''; else o.visible = true; }));
    for (const t of ['foryou', 'shelf', 'profile', 'scan', 'move']) {
        try { await p.evaluate(t => window.goTab(t), t); } catch (e) { }
        await L.sleep(2200); await shot(t);
    }
    try { await p.evaluate(() => window.goTab('home')); } catch (e) { }
    await L.sleep(1500);
    /* the Settings bubble on Home, then the Look & sound card */
    const s = await L.center(h, '[data-hb="settings"], #o8Settings, .o8-settings');
    if (s) { await L.tap(h, s.x, s.y); await L.sleep(1800); await shot('settings'); try { await p.keyboard.press('Escape'); } catch (e) { } await L.sleep(800); }
    /* the galaxy: zoom far out */
    try { await p.evaluate(() => { const a = window.LowiWorld3D; if (a && a.rig) a.rig.dist = 260; if (a && a.zoom) a.zoom(40); }); } catch (e) { }
    await L.sleep(3500); await shot('galaxy');
    const errs = await L.snap(h);
    console.log('ERRORS', JSON.stringify({ page: h.log.pageerror.slice(0, 8), mon: errs }));
    fs.writeFileSync(path.join(out, mode + '-summary.json'), JSON.stringify({ mode, view, shots, errors: h.log.pageerror }, null, 1));
    await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
