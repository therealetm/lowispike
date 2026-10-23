'use strict';
/* Bug hunt probe: Creation / Affiliates frames inside Community. Opens each tab by finger, reports the frame box, whether it
   loaded, its visible text and buttons, then taps up to 8 buttons inside and reports errors.
   node tools/hunt-community-frames2.cjs <device> [url] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang, url: where };
  const R = await H.open(o), P = R.page, tag = '/tmp/hunt1502/fr-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  const errs = []; P.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  await P.evaluate(() => goTab('foryou')); await H.sleep(1200);
  for (const tab of ['create', 'aff']) {
    await R.tap('#cmPaneChat .rm-tab[data-rm="' + tab + '"]'); await H.sleep(5000);
    const box = await P.evaluate((tab) => { const f = document.querySelector('iframe.rm-frame[data-view="' + tab + '"]'); if (!f) return null; const r = f.getBoundingClientRect(); return { src: f.getAttribute('src'), hidden: f.hidden, r: [r.left, r.top, r.width, r.height].map(Math.round), vh: innerHeight }; }, tab);
    log(tab + ' frame', box);
    const fr = P.frames().find(f => f.url().includes(tab === 'aff' ? 'affiliates/' : 'create/'));
    if (!fr) { log(tab, 'no frame document'); continue; }
    const info = await fr.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > .05; };
      const txt = [...document.querySelectorAll('h1,h2,h3,p,button,a,label,span,small,b')].filter(vis).map(e => e.childElementCount ? '' : e.textContent.trim()).filter(Boolean);
      const btns = [...document.querySelectorAll('button,a[href],[role=button],input,select,textarea')].filter(vis).map(b => (b.textContent.trim() || b.getAttribute('aria-label') || b.placeholder || b.name || b.tagName).slice(0, 40));
      const wide = [...document.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return vis(e) && r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map(e => (e.id || e.className || e.tagName).toString().slice(0, 40) + ' right ' + Math.round(e.getBoundingClientRect().right) + '/' + innerWidth);
      return { lang: document.documentElement.lang, text: [...new Set(txt)].join(' | ').slice(0, 1500), btns: btns.slice(0, 40), wide, sw: document.scrollingElement.scrollWidth, iw: innerWidth };
    }).catch(e => 'eval failed ' + e);
    log(tab + ' content', info);
    await R.shot(tag + '-' + tab + '.png');
  }
  log('errs', errs); log('crashed', R.crashed);
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
