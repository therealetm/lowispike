'use strict';
const L = require('./lib.cjs'), zlib = require('zlib');
function png(w, h) {
    const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    const crc = b => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 90 + (x % 100); raw[o + 1] = 140; raw[o + 2] = 60 + (y % 120); }
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/* BH-014 probe (bug hunt run 16): canvas bitmap bytes held by canvases NOT on the page (throwaways only the GC frees), measured
   around a food-camera snap (Chromium fake camera only), a barcode scanner opened and closed 3 times, and a barcode photo with
   no barcode in it. usage: node probe-photo-canvas.cjs VIEW URL-or-DIR, prints JSON */
const TRACK = '(() => { const cvs = window.__cvs = []; const ce = Document.prototype.createElement;' +
  ' Document.prototype.createElement = function (n, o) { const e = ce.call(this, n, o); if (String(n).toLowerCase() === `canvas`) cvs.push(e); return e; };' +
  ' window.__held = () => cvs.filter(c => !c.isConnected).reduce((s, c) => s + c.width * c.height * 4, 0); })();';
(async () => {
    const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const chromium = L.VIEWS[view][0] === 'chromium';
    const h = await L.open({ view, url, settle: 7000, preInit: TRACK, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
    const page = h.page, ctx = h.ctx, out = { view, url: target };
    if (chromium) { try { await ctx.grantPermissions(['camera'], { origin: new URL(url).origin }); } catch (e) { out.permErr = e.message; } }
    const held = () => page.evaluate(() => window.__held());
    const MB = b => +(b / 1048576).toFixed(2);
    if (chromium) {
        const b0 = await held();
        await page.evaluate(() => window.LowiSpirit.photo()).catch(e => { out.photoErr = e.message; });
        const ok = await page.waitForFunction(() => [...document.querySelectorAll('video')].some(v => v.videoWidth > 0), null, { timeout: 20000 }).then(() => true).catch(() => false);
        out.foodCamLive = ok;
        if (ok) { await L.sleep(800); await page.click('[data-sp=shutter]').catch(e => { out.shutterErr = e.message; }); await L.sleep(3000); }
        out.snapHeldMB = MB((await held()) - b0);
        await page.keyboard.press('Escape').catch(() => { }); await L.sleep(1200);
    }
    {
        const b0 = await held();
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.LowiDex.scan()).catch(e => { out.scanErr = e.message; });
            await L.sleep(chromium ? 3500 : 2500);
            if (i === 0) out.scanState = await page.evaluate(() => { const c = document.getElementById('b3Cam'); return c ? c.className : 'none'; });
            await page.evaluate(() => { const b = document.querySelector('#b3Cam [data-b3=camclose]'); if (b) b.click(); });
            await L.sleep(800);
        }
        out.scanHeldMB = MB((await held()) - b0);
    }
    {
        const b0 = await held();
        await page.evaluate(() => window.LowiDex.scan('type')).catch(() => { });
        await L.sleep(1500);
        const fc = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
        await page.evaluate(() => { const b = document.getElementById('b3PhotoBtn') || document.querySelector('#b3Cam [data-b3=photo]'); if (b) b.click(); });
        const chooser = await fc; out.fileChooser = !!chooser;
        const file = { name: 'shelf.png', mimeType: 'image/png', buffer: png(3024, 2268) };
        if (chooser) await chooser.setFiles(file); else { const inp = await page.$('#b3File'); if (inp) await inp.setInputFiles(file); }
        await page.waitForFunction(() => { const c = document.getElementById('b3Cam'); return c && c.classList.contains('typing'); }, null, { timeout: 60000 }).catch(() => { out.decodeTimeout = true; });
        await L.sleep(1000);
        out.barcodePhotoHeldMB = MB((await held()) - b0);
        out.canvasesMade = await page.evaluate(() => window.__cvs.length);
    }
    out.err = h.log.pageerror.filter(e => !/supabase|Failed to fetch|NetworkError|Load failed/i.test(e)).slice(0, 6);
    const s = await L.snap(h); out.monitorErr = s.err.slice(0, 4); out.rej = s.rej.filter(e => !/fetch|network|Load failed/i.test(e)).slice(0, 4);
    console.log(JSON.stringify(out));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.log(JSON.stringify({ fatal: String(e && e.stack || e).slice(0, 600) })); process.exit(1); });
