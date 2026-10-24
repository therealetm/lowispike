/* Browser check for the bottle size picker (24 Oct 2026, HANDOFF-hydration.md). Real app on a local server (or BASE=<live url>), outside
   requests aborted, service worker blocked. One browser at a time. Checks: the Water bloom shows Sips / Glass / Bottle (with its size) / Size,
   all on screen and not overlapping; Size steps 0.75 -> 1 -> 1.5 -> 0.33 -> 0.5 l and is remembered; a 0.5 l bottle adds 2 glasses and
   remembers its size; the Home Water bubble reads n/6 and its words say glasses; hold takes the bottle off and the toast names its size;
   Hold Scan's every-bubble view still has 12 orbs (no Size); no page errors.
   Usage: node tools/check-water-bottle.cjs    (ONE=1 iPhone only, SIZE=<name> one size, BASE=https://therealetm.github.io/lowispike/ live) */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const SIZES = [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820]];
const SHOT = process.env.SHOT || '/tmp/water-bottle-shots';
fs.mkdirSync(SHOT, { recursive: true });

const ALLS = [['iphone-up', 390, 844, 'en'], ['iphone-de', 390, 844, 'de'], ['iphone-side', 844, 390, 'en'], ['small-de', 375, 667, 'de'], ['ipad-up', 820, 1180, 'de'], ['ipad-side', 1180, 820, 'es']];
const SIZES2 = process.env.ONE ? [ALLS[1]] : process.env.SIZE ? ALLS.filter(s => s[0] === process.env.SIZE) : ALLS;
const BASE = process.env.BASE || '';
srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, w, h, lang] of SIZES2) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block' });
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)) && !(BASE && String(u).indexOf(BASE) === 0), r => r.abort());
    await ctx.addInitScript((lang) => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.lang', lang);
      const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 900, ledger: [], logs: [], saved: [], lang, user: { name: 'eman', bday: '1990-01-01', tags: [] } })); } catch (e) { } }, lang);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto(BASE ? BASE + '?v=' + Date.now() : 'http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    const st = () => page.evaluate(() => { let f = {}, s = {}; try { f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); s = JSON.parse(localStorage.getItem('lowispike.v2')); } catch (e) { } const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return { cups: +((f.water || {})[k]) || 0, xp: s.xp }; });
    const orbs = () => page.evaluate(() => [...document.querySelectorAll('.hb2-bloom.on .hb2-orb')].map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.id, txt: b.textContent.trim(), in: r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; }));
    const tap = id => page.evaluate(id => { const b = document.querySelector('.hb2-bloom.on .hb2-orb[data-id="' + id + '"]'); if (b) b.click(); return !!b; }, id);
    const orbR = () => page.evaluate(() => [...document.querySelectorAll('.hb2-bloom.on .hb2-orb')].map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.id, txt: b.textContent.replace(/\s+/g, ' ').trim(), aria: b.getAttribute('aria-label') || '', l: r.left, t: r.top, r: r.right, b: r.bottom, in: r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; }));
    const toastTxt = () => page.evaluate(() => [...document.querySelectorAll('[class*="toast"], [id*="toast"], [role="status"]')].map(e => e.textContent.trim()).filter(Boolean).join(' | '));
    const de = lang === 'de';
    await page.evaluate(() => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.open('water')); await page.waitForTimeout(1200);
    let o = await orbR();
    ok(o.map(x => x.id).join() === 'sips,cup,bottle,bsize', name + ': Water bloom = ' + o.map(x => x.id).join());
    const words = de ? ['Schlucke', 'Glas', 'Flasche', 'Größe'] : ['Sips', 'Glass', 'Bottle', 'Size'];
    ok(words.every((wd, i) => o[i] && o[i].txt.indexOf(wd) >= 0), name + ': labels ' + o.map(x => x.txt).join(' | '));
    ok(o[2] && o[2].txt.indexOf(de ? '0,75' : '0.75') >= 0, name + ': Bottle shows its size (' + (o[2] && o[2].txt) + ')');
    ok(o.length === 4 && o.every(x => x.in), name + ': every Water bubble on screen');
    let lap = 0; for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) { const a = o[i], b = o[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 2 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 2) lap++; }
    ok(!lap, name + ': no two Water bubbles overlap (' + lap + ')');
    await page.screenshot({ path: SHOT + '/' + name + '-bloom-075.png' });
    const key = () => page.evaluate(() => localStorage.getItem('lowispike.water.bottle.v1'));
    const seen = [];
    for (let i = 0; i < 4; i++) { await tap('bsize'); await page.waitForTimeout(700); o = await orbR(); seen.push((await key()) + '=' + (o[2] ? o[2].txt.replace(/^\D+/, '') : '?')); }
    ok(seen.map(s => s.split('=')[0]).join() === '1000,1500,330,500', name + ': Size steps 1 / 1.5 / 0.33 / 0.5 l (' + seen.join(' ; ') + ')');
    ok(o.length === 4 && o.every(x => x.in) && o[2].txt.indexOf(de ? '0,5' : '0.5') >= 0, name + ': bloom stays open, Bottle now says ' + (o[2] && o[2].txt));
    await page.screenshot({ path: SHOT + '/' + name + '-bloom-05.png' });
    const s0 = await st();
    await tap('bottle'); await page.waitForTimeout(900);
    const s1 = await st();
    const fb = await page.evaluate(() => { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); return Object.values(f.waterBottle || {}); });
    ok(s1.cups === s0.cups + 2 && fb.indexOf(500) >= 0, name + ': a 0.5 l bottle = +2 glasses and remembers 500 ml (' + s0.cups + ' -> ' + s1.cups + ', sizes ' + fb.join() + ')');
    await page.evaluate(() => LowiHomeBloomsV2.close && LowiHomeBloomsV2.close()); await page.waitForTimeout(1500);
    const bub = await page.evaluate(() => { const c = document.querySelector('#whHud .wh-water'), b = c && c.querySelector('b'); return c ? { t: b.textContent.replace(/\s+/g, ' ').trim(), a: c.getAttribute('aria-label') || '' } : null; });
    ok(bub && /^[\d¼½¾]+\/6$/.test(bub.t) && bub.a.indexOf(de ? 'Gläsern' : 'glasses') >= 0 && !/cup/i.test(bub.a), name + ': Home Water bubble "' + (bub && bub.t) + '", aria "' + (bub && bub.a) + '"');
    await page.screenshot({ path: SHOT + '/' + name + '-home.png' });
    const hold = () => page.evaluate(() => new Promise(res => { const el = document.querySelector('#whHud .wh-water'); if (!el) return res(false); const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      el.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); res(true); }, 800); }));
    await hold(); await page.waitForTimeout(500);
    const tt = await toastTxt(); const s2 = await st();
    ok(s2.cups === s1.cups - 2, name + ': hold takes the bottle off (' + s1.cups + ' -> ' + s2.cups + ')');
    ok(tt.indexOf(de ? 'eine Flasche (0,5' : 'a bottle (0.5') >= 0, name + ': toast names the size: "' + tt.slice(0, 120) + '"');
    await page.waitForTimeout(1600);
    const all = await page.evaluate(() => { try { LowiHomeBloomsV2.openAll(); } catch (e) { return 'err ' + e.message; } return null; }); await page.waitForTimeout(1500);
    const ao = await orbR();
    ok(!all && ao.length === 12 && !ao.some(x => x.id === 'bsize') && ao.every(x => x.in), name + ': Hold Scan view keeps 12 orbs, no Size (' + ao.length + ', ' + (all || '') + ')');
    await page.screenshot({ path: SHOT + '/' + name + '-all.png' });
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' failed' : 'all passed'); process.exit(fail ? 1 : 0);
});
