/* Browser check for the rank peek in Misty's card (23 Oct 2026, Eman: "where Misty's ranked, worldwide ... a very tiny preview").
   The real app on a local server, outside requests aborted, service worker blocked; the people list is stubbed (LowiR3.everyone).
   Opens Misty's card (LowiMistyHub.open, what the long press calls), checks the peek under her level: label + #place, three tiny
   companions, fits the card, thumb-sized; then taps it and checks Community > Ranking opens on that board with Your place glowing.
   iPhone 13, iPhone SE, iPhone sideways, iPad upright and sideways; EN, DE, ES. Browser simulation, not a real phone.
   Usage: [CHROME=/path] [SHOT=/tmp/mrk] node tests/misty-rank-peek-live.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const RUNS = ([['iphone13-en', 390, 844, 'en'], ['iphoneSE-de', 375, 667, 'de'], ['iphoneSE-es', 375, 667, 'es'], ['iphone-side-es', 844, 390, 'es'], ['ipad-up-de', 820, 1180, 'de'], ['ipad-side-en', 1180, 820, 'en']]).filter(r => !process.env.ONLY || r[0].includes(process.env.ONLY));
const LABEL = { en: /Worldwide · (All time|Month|Week)/, de: /Weltweit · (Gesamt|Monat|Woche)/, es: /Mundial · (Total|Mes|Semana)/ };
srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw.chromium.launch(Object.assign({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, process.env.CHROME ? { executablePath: process.env.CHROME } : {}));
  for (const [name, w, h, lang] of RUNS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block' });
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    await ctx.addInitScript(lg => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lg);
      const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999');
      localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } })); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      const d = 864e5, L = [], day0 = new Date(); day0.setHours(9, 0, 0, 0);
      for (let i = 0; i < 3; i++) { const t = day0.getTime() - i * d; ['meal', 'move', 'water'].forEach((s, j) => L.push({ ts: t + j * 6e4, src: s, amt: 10 })); }
      localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 2311, ledger: L, user: { name: 'eman', bday: '1990-01-01' } })); } catch (e) {} }, lang);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    const stub = await page.evaluate(() => {
      if (!window.LowiR3 || !window.LowiCareBoard || !window.LowiRanking || !window.LowiCompanion || !window.LowiMistyHub || !window.LowiMistyRank) return 'missing';
      const wk = LowiCareBoard.tag(LowiCareBoard.periodKey('w', Date.now()), 1), mo = LowiCareBoard.tag(LowiCareBoard.periodKey('m', Date.now()), 1);
      const P = [['Joseph Castellar', 30, '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', 5400, 12], ['Emmanuel', 28, 'e81217a0-6658-4c00-bce2-bfe56de897a5', 2400, 9], ['Manuuii', 26, '4add63ec-61d6-4187-9c62-bd78c427be24', 300, 3], ['Koji', 12, 'k-1', 900, 5], ['Fernando', 9, 'f-1', 120, 2], ['Mateo', 99, 'bot:mateo', 99999, 25]].map(([n, p, uid, xp, lv]) => ({ n, uid, xpw: p, wk, xpm: p * 2, mo, xp, lv, bot: /^bot:/.test(uid) }));
      const orig = LowiR3.everyone.bind(LowiR3); LowiR3.everyone = () => P.concat((orig() || []).filter(p => p && p.me));
      const fl = LowiCompanion.friendLooks; LowiCompanion.friendLooks = () => Object.assign({}, fl ? fl() : {}, { '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad': '1.5.0.ff8844.aa66ff.s.v.n.m.k1~Blaze%20Nova', 'k-1': '1.4.3.88ccff.c7b0ff.e.f.b.w.2a' });
      return 'ok';
    });
    ok(stub === 'ok', name + ': stubbed ' + stub);
    await page.evaluate(() => LowiMistyHub.open());
    { let prev = null; for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); const t = await page.evaluate(() => { const b = document.querySelector('#mistyHub .mh-rk'); return b ? Math.round(b.getBoundingClientRect().top) : null; }); if (t !== null && t === prev) break; prev = t; } }
    const r = await page.evaluate(() => {
      const b = document.querySelector('#mistyHub .mh-rk'), lv = document.querySelector('#mistyHub .mh-lv'), card = document.querySelector('#mistyHub');
      if (!b) return null;
      const br = b.getBoundingClientRect(), cr = card.getBoundingClientRect(), lr = lv.getBoundingClientRect();
      const l = b.querySelector('.mh-rk-l'), v = b.querySelector('.mh-rk-v'), d = LowiMistyRank.last();
      return { label: l.textContent, value: v.textContent, ls: getComputedStyle(l).fontSize, vs: getComputedStyle(v).fontSize, h: br.height, w: br.width, inCard: br.left >= cr.left - 1 && br.right <= cr.right + 1,
        under: !!b.closest('.mh-head') && br.top >= document.querySelector('#mistyHub .mh-art').getBoundingClientRect().bottom - 6, faces: b.querySelectorAll('.mh-rk-f').length, svgs: b.querySelectorAll('.mh-rk-f svg').length, meFace: !!b.querySelector('.mh-rk-f.me svg'),
        whole: b.scrollWidth <= b.clientWidth + 1 && b.querySelector('.mh-rk-go').getBoundingClientRect().right <= br.right + 1, k: d && d.k, rank: d && d.rank, up: d && d.up && d.up.p.n, down: d && d.down && d.down.p.n, aria: b.getAttribute('aria-label'), wide: document.documentElement.scrollWidth > innerWidth + 1, onScreen: br.bottom <= innerHeight && br.top >= 0, box: [Math.round(br.left), Math.round(br.top), Math.round(br.right), Math.round(br.bottom), innerWidth, innerHeight, Math.round(cr.top), Math.round(cr.bottom)].join(',') };
    });
    ok(!!r, name + ': the peek is in Misty\'s card');
    if (r) {
      ok(LABEL[lang].test(r.label) && /^#\d+$/.test(r.value), name + ': label "' + r.label + '" value "' + r.value + '"');
      ok(r.ls === r.vs, name + ': label and value the same size (' + r.ls + ' / ' + r.vs + ')');
      ok(r.h >= 44 && r.h <= 48 && r.inCard && !r.wide, name + ': tiny and fits (' + Math.round(r.w) + 'x' + Math.round(r.h) + (r.inCard ? '' : ' outside the card') + (r.wide ? ' page wider than screen' : '') + ')');
      ok(r.under, name + ': in the header, right under the picture and name');
      ok(r.faces >= 2 && r.faces <= 3 && r.meFace, name + ': ' + r.faces + ' tiny companions (' + r.svgs + ' drawn), Misty in the middle');
      ok(r.up !== 'Mateo' && r.down !== 'Mateo' && !/Emmanuel|Manuuii/.test(String(r.up) + String(r.down)), name + ': neighbours ' + r.up + ' / ' + r.down + ' (no bot, Eman once), board ' + r.k + ' #' + r.rank);
      ok(r.onScreen, name + ': visible when the card opens (' + r.box + ')');
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + name + '-card.png' });
      const pr = await page.evaluate(() => { const b = document.querySelector('#mistyHub .mh-rk'); const rr = b.getBoundingClientRect(); const x = rr.left + rr.width / 2, y = rr.top + rr.height / 2, at = document.elementFromPoint(x, y); return { x, y, at: at ? (at.closest('.mh-rk') ? 'peek' : at.tagName + '.' + at.className) : 'none' }; });
      if (pr.at !== 'peek') console.log('note ' + name + ': under the finger: ' + pr.at);
      await page.touchscreen.tap(pr.x, pr.y);
      await page.waitForFunction(() => { const m = document.querySelector('.rk .rk-me'); return m && m.getClientRects().length; }, null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      const dbg = await page.evaluate(() => ({ view: window.LowiRoomsUI && LowiRoomsUI.view && LowiRoomsUI.view(), pane: !!document.getElementById('cmPaneChat'), tab: document.body.dataset.tab || '', hubOpen: !!document.querySelector('#mistyHub') && getComputedStyle(document.querySelector('#mistyHub')).visibility }));
      console.log('note ' + name + ': ' + JSON.stringify(dbg));
      if (process.env.DBG && !dbg.pane) { const z = await page.evaluate(() => { const out = {}; try { out.goTab = typeof goTab; out.R2top = !!(window.LowiR2 && LowiR2.top && LowiR2.top()); out.U = !!window.LowiRoomsUI; out.r = LowiMistyRank.open('all'); } catch (e) { out.err = String(e); } return out; }); await page.waitForTimeout(3000); const z2 = await page.evaluate(() => ({ pane: !!document.getElementById('cmPaneChat'), view: window.LowiRoomsUI && LowiRoomsUI.view && LowiRoomsUI.view(), rk: document.querySelectorAll('.rk-me').length, foryou: !!document.querySelector('#foryou, [data-tab=foryou]'), active: (document.querySelector('.tab.active, .tabbar .on, [aria-current=page]') || {}).id })); console.log('dbg ' + JSON.stringify(z) + ' ' + JSON.stringify(z2)); }
      const o = await page.evaluate(() => { const me = document.querySelector('.rk .rk-me'), seg = document.querySelector('.rk [data-rk="per"][aria-selected="true"]');
        return { me: !!(me && me.getClientRects().length), hi: !!(me && me.classList.contains('mh-rk-hi')), per: seg && seg.dataset.k, hub: !!document.querySelector('#mistyHub:not(.r2-ov.off #mistyHub)'), rank: me && (me.querySelector('.rk-me-l b') || {}).textContent, rks: document.querySelectorAll('.rk').length, mes: document.querySelectorAll('.rk-me').length }; });
      if (!o.me) console.log('note ' + name + ': ' + JSON.stringify(o));
      ok(o.me && o.per === r.k, name + ': tap opens the Ranking on ' + o.per + ' at Your place ' + o.rank + (o.hi ? ' (glowing)' : ''));
      ok(o.rank === r.value, name + ': same place as the Ranking (' + o.rank + ' = ' + r.value + ')');
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + name + '-ranking.png' });
    }
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
});
