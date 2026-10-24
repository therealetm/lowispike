'use strict';
/* Bug hunt 2026-10-24 09:02: tap Misty on Home (#spBubble) like a user; what opens, over time; then back. node tools/hunt-misty-tap-probe.cjs <device> [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
  const P = R.page;
  await R.goto(); await H.sleep(6500); await P.touchscreen.tap(5, 830).catch(() => { }); await H.sleep(600);
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 60 && r.height > 60 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .1; };
    const fx = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return (s.position === 'fixed') && +s.zIndex > 50 && vis(e); }).map(e => (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ').slice(0, 2).join('.') + ' z' + getComputedStyle(e).zIndex).slice(0, 12);
    const sp = document.getElementById('spBubble'); const r = sp && sp.getBoundingClientRect();
    const cr = sp && sp.querySelector('.sp-creature'); const tip = [...document.querySelectorAll('#whHud *, .wh-tip, .wh-hint')].filter(e => vis(e) || e.getBoundingClientRect().width > 20).filter(e => /hey|hola|hallo|hello|nice|gut|agradable|water|wasser|agua|amazing|explore|sleepy|wobbly/i.test(e.textContent || '') && e.children.length < 3).map(e => e.className + ':' + e.textContent.slice(0, 40)).slice(0, 2); return { pets: window.__pets, tip, spc: sp && sp.className, crc: cr && String(cr.className), crT: cr && getComputedStyle(cr).transform, say: [...document.querySelectorAll('.sp-say,.misty-say,.ms-bubble,[class*=say]')].filter(vis).map(e=>e.className+':'+e.innerText.slice(0,40)).slice(0,3), html: document.documentElement.className, hist: history.length, hs: JSON.stringify(history.state), fx, sp: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
  });
  await P.evaluate(() => { window.__pets = 0; new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => { if (n.classList && n.classList.contains('wh-pet')) window.__pets++; }))).observe(document.body, { childList: true }); });
  const s0 = await st(); console.log('S0', JSON.stringify(s0));
  const c = await P.evaluate(() => { const sp = document.querySelector('#spBubble .sp-creature') || document.getElementById('spBubble'); const r = sp.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, hit: t && ((t.id ? '#' + t.id : '') + '.' + String(t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className).slice(0, 60)), inside: !!(t && t.closest('#spBubble')) }; });
  console.log('CENTER', JSON.stringify(c));
  await P.touchscreen.tap(c.x, c.y);
  for (const ms of [150, 400, 1200, 2500, 4500]) { await H.sleep({150:150,400:250,1200:800,2500:1300,4500:2000}[ms]); console.log('T+' + ms, JSON.stringify(await st())); }
  await R.shot('/tmp/hunt0902/mistytap-' + device.replace(/\W/g, '') + '.png');
  const u0 = P.url(); await P.goBack({ timeout: 4000 }).catch(() => { }); await H.sleep(1500);
  console.log('BACK', JSON.stringify({ left: P.url() !== u0, url: P.url().slice(0, 80) }), JSON.stringify(await st().catch(e => String(e))));
  console.log('ERRS', JSON.stringify(R.errs.slice(0, 5)));
  await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
