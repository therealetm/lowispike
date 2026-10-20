'use strict';
/* Food audit journey F (Chromium with a fake camera, since WebKit here has none): open and close each food camera five times
   (Log meal > Scan, Log meal > Snap, Shop > Scan in the shop) and count camera tracks still live afterwards. A camera left
   running is battery drain and, on iPhone Safari, a known way to get the page killed. Also tries the shutter. */
const { open, sleep } = require('./food-audit-lib.cjs');
const N = +(process.env.N || 5);
(async () => {
  const init = `(() => { const md = navigator.mediaDevices; if (!md || !md.getUserMedia) return; const g = md.getUserMedia.bind(md); window.__streams = []; md.getUserMedia = c => g(c).then(s => { window.__streams.push(s); return s; }); })();`;
  const H = await open({ tag: 'F', engine: 'chromium', device: 'iPhone 13', init }); const p = H.page;
  const log = (k, v) => console.log('\n### ' + k + '\n' + (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : JSON.stringify(v)));
  const live = () => p.evaluate(() => ({ opened: (window.__streams || []).length, live: (window.__streams || []).reduce((a, s) => a + s.getTracks().filter(t => t.readyState === 'live').length, 0), videos: document.querySelectorAll('video').length }));
  const openLog = async (slot) => { await H.bloom('fuel', 'log'); await sleep(1500); await p.tap('[data-sp="slot"][data-slot="' + slot + '"]'); await sleep(1000); };
  const res = {};
  // 1. Log meal > Scan, close with the X
  for (let i = 0; i < N; i++) {
    await openLog('snack'); await p.tap('[data-sp="scan"]'); await sleep(3000);
    if (i === 0) { res.scanLive = await p.evaluate(() => { const c = document.querySelector('.b3-cam'); return c ? { cls: c.className, text: c.innerText.replace(/\s+/g, ' ').slice(0, 160) } : null; }); res.scanOpen = await live(); await H.shot('scan-live'); }
    const x = await p.$('.b3-cam [data-b3="camclose"]'); if (x) await x.tap({ force: true }).catch(() => { }); await sleep(1500);
    await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(600);
  }
  res.afterScan = await live();
  // 2. Log meal > Snap, close with the X
  for (let i = 0; i < N; i++) {
    await openLog('lunch'); await p.tap('[data-sp="photo"]'); await sleep(3000);
    if (i === 0) { res.snapOpen = await live(); res.snapLive = await p.evaluate(() => !!document.querySelector('#ssFood.live')); await H.shot('snap-live'); }
    const x = await p.$('#ssFood [data-sp="cancelCapture"]'); if (x) await x.tap({ force: true }).catch(() => { }); await sleep(1500);
    await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(600);
  }
  res.afterSnap = await live();
  // 3. shutter once: does a photo sheet appear, and is the camera released?
  await openLog('dinner'); await p.tap('[data-sp="photo"]'); await sleep(3500);
  const sh = await p.$('#ssFood [data-sp="shutter"]'); if (sh) { await sh.tap({ force: true }).catch(() => { }); await sleep(5000); }
  res.shutter = { photoSheet: await p.evaluate(() => !!document.querySelector('#spMeal.sp-photo-form')), camGone: await p.evaluate(() => !document.querySelector('#ssFood')), streams: await live(), ai: await p.evaluate(() => (document.querySelector('.sp-ai') || {}).innerText || '') };
  await H.shot('shutter');
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(800);
  // 4. Shop > Scan in the shop, close
  for (let i = 0; i < N; i++) {
    await H.bloom('fuel', 'shop'); await sleep(2200);
    await p.tap('[data-stp="scanshop"]'); await sleep(3000);
    if (i === 0) res.shopOpen = await live();
    const x = await p.$('.b3-cam [data-b3="camclose"]'); if (x) await x.tap({ force: true }).catch(() => { }); await sleep(1500);
    await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(600);
  }
  res.afterShop = await live();
  res.heapMB = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null);
  log('F results', res);
  log('errs', H.errs);
  await H.close();
})().catch(e => { console.error(e); process.exit(1); });
