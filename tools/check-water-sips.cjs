/* Browser check for Water by sips (23 Oct 2026, Eman: "a few sips, one cup or one whole bottle").
   Real app on a local server, outside requests aborted, service worker blocked. iPhone upright / sideways, iPad upright / sideways,
   a small phone, English and German: the Water bloom shows Sips / Cup / Bottle on screen; 4 sips = 1 cup = +2 XP; a bottle = +3 cups
   (+6 water XP; the healthy-streak combo counts water at most 3, the same as three cups); the Home Water bubble says 1/6 style with no unit word; long press on Water takes the last entry off (and its XP); no page errors.
   Usage: node tools/check-water-sips.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const SIZES = [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820]];
const SHOT = process.env.SHOT || '/tmp/water-sips-shots';
fs.mkdirSync(SHOT, { recursive: true });

const SIZES2 = (process.env.ONE ? [['iphone-up', 390, 844, 'en']] : [['iphone-up', 390, 844, 'en'], ['iphone-side', 844, 390, 'en'], ['ipad-up', 820, 1180, 'de'], ['ipad-side', 1180, 820, 'de'], ['small', 360, 740, 'en']]);
srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, w, h, lang] of SIZES2) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block' });
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    await ctx.addInitScript((lang) => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.lang', lang);
      const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 900, ledger: [], logs: [], saved: [], lang, user: { name: 'eman', bday: '1990-01-01', tags: [] } })); } catch (e) { } }, lang);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    const st = () => page.evaluate(() => { let f = {}, s = {}; try { f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); s = JSON.parse(localStorage.getItem('lowispike.v2')); } catch (e) { } const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return { cups: +((f.water || {})[k]) || 0, xp: s.xp }; });
    const orbs = () => page.evaluate(() => [...document.querySelectorAll('.hb2-bloom.on .hb2-orb')].map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.id, txt: b.textContent.trim(), in: r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; }));
    const tap = id => page.evaluate(id => { const b = document.querySelector('.hb2-bloom.on .hb2-orb[data-id="' + id + '"]'); if (b) b.click(); return !!b; }, id);
    await page.evaluate(() => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.open('water')); await page.waitForTimeout(900);
    const o = await orbs(), ids = o.map(x => x.id);
    ok(JSON.stringify(ids) === JSON.stringify(['sips', 'cup', 'bottle']), name + ': Water bloom = ' + ids.join(','));
    const words = lang === 'de' ? ['Schlucke', 'Glas', 'Flasche'] : ['Sips', 'Cup', 'Bottle'];
    ok(words.every((wd, i) => o[i] && o[i].txt.indexOf(wd) >= 0), name + ': labels ' + o.map(x => x.txt).join(' | '));
    ok(o.length === 3 && o.every(x => x.in), name + ': every Water bubble on screen');
    await page.screenshot({ path: SHOT + '/' + name + '-water-bloom.png' });
    const s0 = await st();
    for (let i = 0; i < 3; i++) { await tap('sips'); await page.waitForTimeout(350); }
    const s3 = await st();
    ok(s3.cups === s0.cups + 0.75 && s3.xp === s0.xp, name + ': 3 sips = 3/4 cup, no XP yet (' + s3.cups + ', XP ' + s0.xp + ' -> ' + s3.xp + ')');
    await tap('sips'); await page.waitForTimeout(600);
    const s4 = await st();
    ok(s4.cups === s0.cups + 1 && s4.xp === s0.xp + 2, name + ': 4th sip completes the cup, +2 XP (' + s4.cups + ', XP ' + s4.xp + ')');
    await tap('bottle'); await page.waitForTimeout(900);
    const s5 = await st();
    const wxp = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lowispike.v2')); return (s.ledger || []).map(e => (e.src || '?') + ':' + (e.amt || 0) + ':' + String(e.eventId || e.label || '').slice(0, 40)).join(' ; '); });
    console.log('     ledger ' + wxp);
    const waterXp = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lowispike.v2')); return (s.ledger || []).filter(e => e.src === 'water').reduce((a, e) => a + (+e.amt || 0), 0); });
    ok(waterXp === 8, name + ': water XP after 1 + 3 cups = 8 (' + waterXp + ')');
    ok(s5.cups === s4.cups + 3 && s5.xp >= s4.xp + 6, name + ': a bottle = +3 cups, +6 XP (' + s5.cups + ', XP ' + s5.xp + ')');
    await tap('sips'); await page.waitForTimeout(600);
    await page.evaluate(() => LowiHomeBloomsV2.close && LowiHomeBloomsV2.close()); await page.waitForTimeout(1500);
    const bub = await page.evaluate(() => { const b = document.querySelector('#whHud .wh-water b'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
    ok(bub === '4\u00bc/6', name + ': Home Water bubble reads "' + bub + '" (no unit word)');
    await page.screenshot({ path: SHOT + '/' + name + '-water-home.png' });
    /* long press = take the last one back (the sips), then again (the bottle and its XP) */
    const hold = () => page.evaluate(() => new Promise(res => { const el = document.querySelector('#whHud .wh-water'); if (!el) return res(false); const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      el.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); res(true); }, 800); }));
    const s6 = await st(); await hold(); await page.waitForTimeout(700);
    const s7 = await st();
    ok(s7.cups === s6.cups - 0.25 && s7.xp === s6.xp, name + ': hold takes the last sips off (' + s6.cups + ' -> ' + s7.cups + ')');
    await page.waitForTimeout(1600); await hold(); await page.waitForTimeout(700);
    const s8 = await st();
    ok(s8.cups === s7.cups - 3 && s8.xp === s7.xp - 6, name + ': hold again takes the bottle and its 6 XP back (' + s7.cups + ' -> ' + s8.cups + ', XP ' + s7.xp + ' -> ' + s8.xp + ')');
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' failed' : 'all passed'); process.exit(fail ? 1 : 0);
});
