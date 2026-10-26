'use strict';
/* Run 21 (BH-021): For You "+ Post" composer photo picked, then the composer closed and reopened while the photo is still being
   shrunk (FileReader slowed to 1.5 s by this probe). Old code: the old photo shows up in the new, empty post.
   Also the normal case: pick and wait -> the photo shows. Nothing is posted. node probe-photo-pick.cjs <view> <url> */
const L = require('./lib.cjs');
const path = require('path');
const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
const IMG = path.join(__dirname, 'lunch.jpg');
const SLOW = `(() => { const o = FileReader.prototype.readAsDataURL; FileReader.prototype.readAsDataURL = function (b) { const fr = this, h = fr.onload; const ms = window.__slowFR || 0;
  if (!ms) return o.call(fr, b); fr.onload = null; fr.addEventListener('load', ev => { setTimeout(() => { const f = fr.onload || h; if (f) f.call(fr, ev); }, ms); }); return o.call(fr, b); }; })();`;
(async () => {
    let url = target, srv = null; if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 6000, preInit: SLOW }); const P = h.page; const res = {};
    const thumbs = () => P.evaluate(() => [...document.querySelectorAll('#trRest img.tr-thumbsm')].length);
    const pick = async () => { const [fc] = await Promise.all([P.waitForEvent('filechooser', { timeout: 5000 }), P.evaluate(() => document.querySelector('#trRest [data-tr="photo"]').click())]); await fc.setFiles(IMG); };
    const openPost = async () => { await P.evaluate(() => window.LowiR3F.postSheet()); await L.sleep(900); };
    const closePost = async () => { await P.evaluate(() => { const x = document.querySelector('#sheet [data-act="close-sheet"]'); if (x) x.click(); }); await L.sleep(250); };
    try {
        res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
        /* A. normal: pick, wait, photo shows */
        await openPost(); res.hasPhotoBtn = await P.evaluate(() => !!document.querySelector('#trRest [data-tr="photo"]'));
        await P.evaluate(() => { window.__slowFR = 800; }); await pick(); await L.sleep(2500); res.normalThumbs = await thumbs();
        await closePost(); await L.sleep(600);
        /* B. pick, close, reopen while shrinking: new post must stay empty */
        await openPost(); await P.evaluate(() => { window.__slowFR = 1500; }); await pick();
        await closePost(); await openPost(); res.reopenedEmptyAtOpen = (await thumbs()) === 0;
        await L.sleep(2500); res.reopenedThumbs = await thumbs();
        await closePost(); await L.sleep(600);
        /* C. private post ("Only you", stays on this phone: nothing goes online) sent while the photo is still shrinking */
        await openPost();
        await P.evaluate(() => { const v = document.querySelector('#trRest [data-tr="vis"]'); if (v && v.classList.contains('on')) v.click(); });
        await L.sleep(300);
        await P.evaluate(() => { const c = document.getElementById('trCap'); c.value = 'quick lunch'; c.dispatchEvent(new Event('input', { bubbles: true })); });
        await P.evaluate(() => { window.__slowFR = 1500; }); await pick(); await L.sleep(100);
        res.privateBefore = await P.evaluate(() => { const v = document.querySelector('#trRest [data-tr="vis"]'); return v ? v.classList.contains('on') : null; });
        await P.evaluate(() => { const b = document.querySelector('[data-tr="post"]'); if (b) b.click(); });
        await L.sleep(2500); res.postSheetOpen = await P.evaluate(() => !!document.querySelector('#trRest'));
        res.pageerror = h.log.pageerror.slice(0, 5);
        const s = await L.snap(h); res.err = s.err.slice(0, 5); res.rej = s.rej.slice(0, 5);
        res.pass = res.normalThumbs === 1 && res.reopenedThumbs === 0 && !res.pageerror.length && !res.rej.length;
    } catch (e) { res.error = String(e).slice(0, 300); }
    console.log(JSON.stringify(res, null, 1));
    await h.browser.close(); if (srv) srv.close();
})();
