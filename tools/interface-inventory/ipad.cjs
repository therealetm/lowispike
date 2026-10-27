'use strict';
/* iPad pass (1180x820, dark, German): opens the main surfaces with the same fixture user as crawl.cjs, screenshots each as
   ipad-<phoneId>.jpg and measures how wide the visible content really is. A surface whose content is wider than ~600 px
   (not just the phone column centred) counts as "layout differs" and goes into OUT/ipad.json as {phoneId, file}.
   Usage: node ipad.cjs */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const OUT = process.env.OUT || '/home/sprite/inv-shots';
const cr = fs.readFileSync(path.join(__dirname, 'crawl.cjs'), 'utf8');
const seedSrc = cr.slice(cr.indexOf('const today = L.dayKey();'), cr.indexOf('async function fresh()'));
const seed = new Function('L', seedSrc + '\nreturn seed;')(L);
const SURF = [
  { phoneId: 'comm-001', name: 'Home', js: "try{goTab('home')}catch(e){}" },
  { phoneId: 'comm-002', name: 'Community', tap: '[data-orbit="settings"]' },
  { phoneId: 'tshelf-002', name: 'Cook / Shop', js: "goTab('shelf')" },
  { phoneId: 'tmove-002', name: 'Move', js: "goTab('move')" },
  { phoneId: 'tprof-002', name: 'Profil', js: "goTab('profile')" }
];
(async () => {
  const res = [], log = [];
  for (const s of SURF) {
    let h;
    try {
      h = await L.launch({ viewport: { width: 1180, height: 820 }, locale: 'de-DE', lang: 'de', seed: seed() });
      await h.page.emulateMedia({ colorScheme: 'dark' });
      await L.openApp(h, { settle: 4500, waitReady: true });
      if (s.js) await h.page.evaluate(js => { try { (0, eval)(js); } catch (e) { } }, s.js);
      if (s.tap) await h.page.click(s.tap, { timeout: 8000 }).catch(() => { });
      await L.sleep(2800);
      const w = await h.page.evaluate(() => {
        let minL = 1e9, maxR = 0;
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
          if (r.width < 8 || r.height < 8 || r.width > innerWidth - 2 || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
          if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue;
          if (!(el.innerText || '').trim() && el.tagName !== 'BUTTON' && el.tagName !== 'IMG' && el.tagName !== 'CANVAS' && el.tagName !== 'svg') continue;
          minL = Math.min(minL, r.left); maxR = Math.max(maxR, r.right);
        }
        return Math.round(maxR - minL);
      });
      const file = 'ipad-' + s.phoneId + '.jpg';
      await h.page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 72 });
      const differs = w > 600;
      log.push({ ...s, file, contentWidth: w, differs });
      if (differs) res.push({ phoneId: s.phoneId, file });
      console.log(s.name, 'contentWidth', w, differs ? 'DIFFERS' : 'same column');
    } catch (e) { console.log(s.name, 'ERR', String(e.message || e).slice(0, 160)); log.push({ ...s, err: String(e.message || e).slice(0, 160) }); }
    if (h) await h.browser.close().catch(() => { });
    fs.writeFileSync(path.join(OUT, 'ipad.json'), JSON.stringify(res, null, 1));
    fs.writeFileSync(path.join(OUT, 'ipad-log.json'), JSON.stringify(log, null, 1));
  }
  console.log('END ipad', res.length);
})();
