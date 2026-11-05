'use strict';
/* Where on screen is Dark still blue? Screenshots each named view, finds the 40 px cells with the most blue-dark pixels and lists
   the elements under them. node tools/true-black/where.cjs <repo> <home|galaxy|tab...> */
const L = require(process.env.LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path');
(async () => {
    const ROOT = path.resolve(process.argv[2] || '.');
    const srv = await L.serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/';
    const pre = `try{localStorage.setItem('lowi.theme','dark');localStorage.setItem('lowi.atmos',JSON.stringify({mode:'manual',p:100}));
      localStorage.setItem('lowi.theme.dark','black');localStorage.setItem('lowi.tutorial.v1',JSON.stringify({done:true}));}catch(e){}`;
    const h = await L.open({ view: 'chromium390', url, settle: 7000, preInit: pre });
    const p = h.page;
    for (const t of process.argv.slice(3)) {
        if (t === 'galaxy') { await p.evaluate(() => { window.goTab('home'); const a = window.LowiWorld3D; if (a && a.rig) a.rig.dist = 260; if (a && a.zoom) a.zoom(40); }); await L.sleep(3500); }
        else if (t !== 'home') { await p.evaluate(t => window.goTab(t), t); await L.sleep(3000); }
        const buf = await p.screenshot();
        const r = await p.evaluate(async b64 => {
            const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
            const d = g.getImageData(0, 0, c.width, c.height).data, q = devicePixelRatio, cells = {};
            for (let y = 0; y < c.height; y += 4) for (let x = 0; x < c.width; x += 4) { const i = (y * c.width + x) * 4, r = d[i], gg = d[i + 1], b = d[i + 2], l = 0.299 * r + 0.587 * gg + 0.114 * b;
                if (l < 64 && b - Math.max(r, gg) > 6) { const k = (x / 40 | 0) + ',' + (y / 40 | 0); cells[k] = (cells[k] || 0) + 1; } }
            return Object.entries(cells).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => { const [cx, cy] = k.split(',').map(Number), x = cx * 40 + 20, y = cy * 40 + 20, i = (y * c.width + x) * 4;
                return { x: x / q | 0, y: y / q | 0, n, px: [d[i], d[i + 1], d[i + 2]], stack: document.elementsFromPoint(x / q, y / q).slice(0, 5).map(e => e.tagName + (e.id ? '#' + e.id : '') + '.' + String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className).slice(0, 28)) }; });
        }, buf.toString('base64'));
        console.log('== ' + t); for (const o of r) console.log(JSON.stringify(o));
    }
    await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
