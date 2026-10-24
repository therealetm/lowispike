'use strict';
/* Back/close sweep helper: list what a player can tap on Home and in the Community menu (live or local). node tools/backclose-discover.cjs [engine] [device|WxH] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const engine = process.argv[2] || 'webkit', dev = process.argv[3] || 'iPhone 13', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { engine, members: 12, messages: 30, probe: false, lang: 'en', url };
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w || 390, height: h || 844 }; }
  const R = await H.open(o); const P = R.page;
  await R.goto(); await H.sleep(9000);
  const list = () => P.evaluate(() => [...document.querySelectorAll('button,[role=button],a[href],[data-orbit],[data-act],[data-tr],[data-cl]')].filter(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); if (!(r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && s.visibility !== 'hidden' && +s.opacity > .05)) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === b || b.contains(t) || t.contains(b)); }).map(b => ({ tag: b.tagName, id: b.id, cls: String(b.className).slice(0, 60), orbit: b.dataset.orbit || '', act: b.dataset.act || b.dataset.tr || b.dataset.cl || '', label: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) })));
  console.log('HOME', JSON.stringify(await list(), null, 0));
  console.log('errs', JSON.stringify(R.errs).slice(0, 600));
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
