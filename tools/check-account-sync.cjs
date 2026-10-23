/* Two-device check for "the same data on every device" (Eman, 23 Oct 2026).
   A phone (390x844) and an iPad (820x1180) share ONE account on the real Supabase backend (a throwaway anonymous account named
   "eman", so the Ranking folds it away; deleted again afterwards with tools/check-account-sync-cleanup in the log).
   1. phone opens with 900 XP and pushes.  2. iPad opens with its own, different data: it pulls, merges (higher XP kept, its own
   meal kept), reloads once and shows the merged numbers.  3. phone logs a cup of water.  4. iPad comes back to the app
   (visibilitychange): it pulls and shows the same water as the phone.  5. iPad logs a sip set, phone comes back: same again.
   Usage: node tools/check-account-sync.cjs [--url https://therealetm.github.io/lowispike/index.html]   (default: this checkout on a local server) */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const SHOT = process.env.SHOT || '/tmp/account-sync-shots';
fs.mkdirSync(SHOT, { recursive: true });
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function seed(lang, xp, extra) {
  return ({ lang, xp, extra, day }) => { try {
    localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.lang', lang);
    localStorage.setItem('lowi.daily.seen', day); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
    if (extra && extra.auth && !localStorage.getItem('lowi.auth')) localStorage.setItem('lowi.auth', extra.auth);
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify(Object.assign({ v: 2, setupDone: true, onboarded: true, xp, ledger: [], logs: [], saved: [], lang, user: { name: 'eman', bday: '1990-01-01', tags: [] } }, (extra && extra.v2) || {})));
  } catch (e) { } };
}

srv.listen(0, async () => {
  const port = srv.address().port, url = arg('url', '') || ('http://localhost:' + port + '/index.html');
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async (name, w, h, lang, xp, extra) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript(seed(), { lang, xp, extra, day: today() });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'sync=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
    return { name, ctx, page, errs };
  };
  const live = async d => { for (let i = 0; i < 60; i++) { const l = await d.page.evaluate(() => !!(window.LOWI_CLOUD && LOWI_CLOUD.live() && LOWI_CLOUD.uid())).catch(() => false); if (l) return true; await d.page.waitForTimeout(500); } return false; };
  const state = async d => { for (let i = 0; i < 20; i++) { const r = await state1(d); if (r && r.uid) return r; await d.page.waitForTimeout(1000); } return state1(d); };
  const state1 = d => d.page.evaluate(() => { let s = {}; try { s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); } catch (e) { }
    const b = document.querySelector('#whHud .wh-water b');
    let rl = []; try { rl = JSON.parse(sessionStorage.getItem('lowi.sync.reloads') || '[]'); } catch (e) { }
    let last = null; try { last = JSON.parse(sessionStorage.getItem('lowi.sync.last') || 'null'); } catch (e) { }
    return { last, reloads: rl.length, xp: s.xp, meals: (s.syncProbe || []).map(x => x.id).filter(Boolean), water: b ? b.textContent.replace(/\s+/g, ' ').trim() : null, uid: window.LOWI_CLOUD && LOWI_CLOUD.uid() }; }).catch(() => ({}));
  const tapWater = async (d, id) => { for (let i = 0; i < 20; i++) { if (await d.page.evaluate(() => !!(window.LowiHomeBloomsV2 && document.querySelector('#whHud .wh-water'))).catch(() => false)) break; await d.page.waitForTimeout(500); }
    await d.page.evaluate(() => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.open('water')); await d.page.waitForTimeout(900);
    const t = await d.page.evaluate(id => { const b = document.querySelector('.hb2-bloom.on .hb2-orb[data-id="' + id + '"]'); if (b) b.click(); return !!b; }, id);
    await d.page.waitForTimeout(700); await d.page.evaluate(() => LowiHomeBloomsV2.close && LowiHomeBloomsV2.close()); await d.page.waitForTimeout(1200); return t; };
  const origin = d => d.page.evaluate(() => performance.timeOrigin).catch(() => 0);
  const comeBack = async d => { const o0 = await origin(d);
    await d.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }).catch(() => { });
    await d.page.waitForTimeout(6000); await d.page.waitForLoadState('load').catch(() => { }); await live(d);
    const o1 = await origin(d); if (o1 !== o0) await d.page.waitForTimeout(4000); return o1 !== o0; };
  /* 1. the phone */
  const phone = await open('phone', 390, 844, 'en', 900, { v2: { syncProbe: [{ id: 'meal-phone', ts: Date.now() - 3600e3 }] } });
  ok(await live(phone), 'phone: signed in to the backend');
  await phone.page.waitForTimeout(6000);
  const auth = await phone.page.evaluate(() => localStorage.getItem('lowi.auth'));
  const p1 = await state(phone);
  console.log('     account ' + p1.uid);
  ok(!!auth && !!p1.uid, 'phone: has an account session to share');

  /* 2. the iPad, same account, different data, never synced before */
  const ipad = await open('ipad', 820, 1180, 'de', 300, { auth, v2: { syncProbe: [{ id: 'meal-ipad', ts: Date.now() - 7200e3 }] } });
  const navd = ipad.page.waitForNavigation({ timeout: 30000 }).then(() => true).catch(() => false);
  ok(await live(ipad), 'iPad: signed in');
  const reloaded = await navd; if (reloaded) { await ipad.page.waitForLoadState('load'); await live(ipad); }
  await ipad.page.waitForTimeout(5000);
  const i1 = await state(ipad);
  ok(i1.uid === p1.uid, 'iPad: the same account (' + i1.uid + ')');
  ok(reloaded || i1.reloads === 1, 'iPad: pulled the account and reloaded once to show it (reloads ' + i1.reloads + ')');
  ok(i1.xp === 900, 'iPad: higher XP kept on the first merge (' + i1.xp + ')');
  ok(i1.meals.includes('meal-phone') && i1.meals.includes('meal-ipad'), 'iPad: both meals, none lost (' + i1.meals.join(',') + ')');
  const note = await ipad.page.evaluate(() => window.__lowiSyncNote || '');
  ok(note === 'Auf dem Stand deines anderen Geräts', 'iPad: a short German note says why it reloaded (' + note + ')');
  await ipad.page.screenshot({ path: SHOT + '/ipad-after-first-sync.png' });

  /* 3. phone logs a cup; 4. the iPad comes back to the app */
  await phone.page.waitForTimeout(16000);
  const back1 = await comeBack(phone);
  const p2a = await state(phone);
  ok(p2a.meals.includes('meal-ipad'), 'phone: came back and has the iPad meal too (' + p2a.meals.join(',') + (back1 ? ', reloaded' : '') + ')');
  ok(await tapWater(phone, 'cup'), 'phone: tapped Cup');
  await phone.page.waitForTimeout(7000);
  const p2 = await state(phone);
  await ipad.page.waitForTimeout(9000);
  const back2 = await comeBack(ipad);
  const i2 = await state(ipad);
  ok(back2, 'iPad: came back to the app and reloaded with the new data');
  ok(!!p2.water && i2.water === p2.water, 'iPad water bubble = phone water bubble (' + i2.water + ' / ' + p2.water + ')');
  ok(i2.xp === p2.xp, 'iPad XP = phone XP (' + i2.xp + ' / ' + p2.xp + ')');
  await ipad.page.screenshot({ path: SHOT + '/ipad-after-phone-cup.png' });
  await phone.page.screenshot({ path: SHOT + '/phone-after-cup.png' });

  /* 5. the other way round */
  ok(await tapWater(ipad, 'bottle'), 'iPad: tapped Bottle');
  await ipad.page.waitForTimeout(7000);
  const i3 = await state(ipad);
  await phone.page.waitForTimeout(9000);
  const back3 = await comeBack(phone);
  const p3 = await state(phone);
  ok(back3 && !!i3.water && p3.water === i3.water, 'phone water = iPad water after the iPad logged a bottle (' + p3.water + ' / ' + i3.water + ')');
  ok(p3.xp === i3.xp, 'phone XP = iPad XP (' + p3.xp + ' / ' + i3.xp + ')');
  await phone.page.screenshot({ path: SHOT + '/phone-after-ipad-bottle.png' });

  /* 6. nothing new: coming back again does not reload */
  await ipad.page.waitForTimeout(16000);
  const back4 = await comeBack(ipad);
  ok(!back4, 'iPad: nothing new, no reload when coming back');
  console.log('     last sync iPad: ' + JSON.stringify((await state(ipad)).last) + '\n     last sync phone: ' + JSON.stringify((await state(phone)).last));

  const errs = phone.errs.concat(ipad.errs).filter(e => !/ResizeObserver|AbortError|Failed to fetch|Load failed|NetworkError/i.test(e));
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('ACCOUNT ' + p1.uid);
  console.log(fail ? 'FAIL ' + fail : 'PASS all');
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
});
