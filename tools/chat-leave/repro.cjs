/* Repro: Community > chat room > leave to Home by a route; screenshot Home and list what covers it. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-leave-repro'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const ROUTE = process.argv[4] || 'x';
const lang = process.argv[5] || 'de';
const device = process.argv[6] || 'iPhone 13';
async function openRoom(p) {
  await sleep(2500);
  if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true, timeout: 3000 }).catch(() => { }); await sleep(1500); }
  if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { const b = document.querySelector('.rm-tab[data-rt="chat"],[data-rt="chat"]'); if (b) b.click(); }); await sleep(1500); }
  if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"]'); if (b) b.click(); }); await sleep(1200); }
  if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { console.log('tabs', await p.evaluate(() => [...document.querySelectorAll('.rm-tab,[data-rt],.rm-ch')].map(b => b.outerHTML.slice(0, 120)).join('\n'))); await p.evaluate(() => { try { LowiCommunity.thread(true); } catch (e) { } }); await sleep(1500); }
  return p.evaluate(() => !!document.querySelector('#cgThread[data-open]'));
}
function cover() {
  const out = [];
  const pts = [[.5, .5], [.3, .35], [.7, .7], [.5, .2], [.2, .8]];
  for (const [fx, fy] of pts) {
    const els = document.elementsFromPoint(innerWidth * fx, innerHeight * fy).slice(0, 6);
    out.push(els.map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '')).join(' > '));
  }
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 50 && r.height > 50 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.02; };
  const media = [...document.querySelectorAll('video,canvas,iframe')].filter(vis).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).slice(0, 40) + ' parent=' + (e.parentElement && (e.parentElement.id || e.parentElement.className)).toString().slice(0, 40) + ' ' + JSON.stringify(e.getBoundingClientRect()).slice(0, 80));
  const fixed = [...document.body.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return (s.position === 'fixed') && vis(e) && e.getBoundingClientRect().width > innerWidth * .8 && e.getBoundingClientRect().height > innerHeight * .5; }).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).slice(0, 50) + ' z=' + getComputedStyle(e).zIndex);
  const WH = window.LowiWorldHome, W3 = window.LowiWorld3D; const sp = document.querySelector('.sp-world,#spWorld,[class*=sp-layer]');
  return { pull: WH && WH.state ? JSON.stringify({ pull: WH.state.pull, za: WH.state.zoomAnim, today: WH.state.today }) : null, rig: (() => { try { const r = WH.rig(); return r ? { mode: r.mode, dist: +r.dist.toFixed(2), maxD: r.maxD, homeRest: r.homeRest, homeDist: r.homeDist, outerD: r.outerD } : null; } catch (e) { return 'err ' + e.message; } })(), inBack: W3 && W3.inBack ? W3.inBack() : null, allHtml: document.documentElement.className, tab: window.LowiHost && LowiHost.tab ? LowiHost.tab() : '?', html: document.documentElement.className.split(/\s+/).filter(c => /room|chat|cr-|rm-|cs-|galax|cg|thread/.test(c)), body: document.body.className, out, media, fixed };
}
(async () => {
  const R = await H.open({ engine: device === 'Pixel 7' ? 'chromium' : 'webkit', device, probe: false, url: URL_, lang });
  const p = R.page;
  try {
    await R.goto(); await sleep(2500);
    await R.shot(path.join(OUT, '0-home.png'));
    await N.openCommunity(R);
    const ok = await openRoom(p); console.log('room open', ok);
    await R.shot(path.join(OUT, '1-room.png'));
    if (process.env.THROTTLE && device === 'Pixel 7') { const c = await R.ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); }
    await p.evaluate(() => { window.__wl = []; const WH = window.LowiWorldHome; const t0 = performance.now(); for (const k of ['diveIn', 'settle', 'pullOut']) { const o = WH[k]; WH[k] = function () { const r = WH.rig && WH.rig(); window.__wl.push(k + '@' + Math.round(performance.now() - t0) + ' pull=' + JSON.stringify(WH.state.pull) + ' dist=' + (r ? r.dist.toFixed(1) : '?')); return o.apply(this, arguments); }; } window.__land = null; let last = ''; const iv = setInterval(() => { const r0 = WH.rig && WH.rig(); const sig = [!!WH.state.zoomAnim, document.documentElement.classList.contains('wh-mapview') ? 'map' : '', document.documentElement.classList.contains('wh-cosmos') ? 'cos' : '', document.querySelector('#tab-home.active') ? 'home' : '', [...document.documentElement.classList].filter(c => /^gx-/.test(c)).join('+'), r0 ? Math.round(r0.dist) : ''].join(','); if (sig !== last) { last = sig; window.__wl.push('st@' + Math.round(performance.now() - t0) + ' ' + sig); } const H = document.documentElement.classList; if (!H.contains('wh-mapview') && !H.contains('wh-cosmos') && document.querySelector('#tab-home.active')) { window.__land = Math.round(performance.now() - t0); clearInterval(iv); } }, 50); });
    if (ROUTE === 'x') { const ok2 = await p.evaluate(() => { const b = [...document.querySelectorAll('.sec-x')].find(b => b.getBoundingClientRect().width > 0); if (b) { b.click(); return true; } return false; }); console.log('sec-x', ok2); }
    else if (ROUTE === 'tab') await N.goHome(R);
    else if (ROUTE === 'sec') await p.evaluate(() => LowiSections.close());
    else if (ROUTE === 'back') await p.evaluate(() => history.back());
    else if (ROUTE === 'crback') { await p.evaluate(() => { const b = document.querySelector('#cgThread .cr-back'); b && b.click(); }); await sleep(800); await p.evaluate(() => { const b = [...document.querySelectorAll('.sec-x')].find(b => b.getBoundingClientRect().width > 0); if (b) b.click(); }); }
    await sleep(300); await R.shot(path.join(OUT, '2-home-300ms.png'));
    await sleep(2500); await R.shot(path.join(OUT, '3-home-3s.png'));
    console.log(JSON.stringify(await p.evaluate(cover), null, 1));
    console.log('LOG', JSON.stringify(await p.evaluate(() => ({ wl: window.__wl, land: window.__land })), null, 1));
    console.log('errs', JSON.stringify(R.errs.slice(0, 5)));
  } catch (e) { console.log('ERR', e.message); }
  await R.close();
})();
