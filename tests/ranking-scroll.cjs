/* Scroll check for the Community Ranking tab (23 Oct 2026, second pass): with 14 real people, 3 demo bots and sample-chat people
   stubbed in, the board shows places 1-10 only, no bot or demo entry, Your place still shows the real place below 10, and while
   the page scrolls nothing shows through or over the pinned Community bar (pill + tabs) on Ranking, Room, Chat, Creation and
   Affiliates. Same harness as tests/ranking-live.cjs (local server, outside requests aborted). Not part of the offline suite.
   First lines of the original harness: Browser check for the Community Ranking tab (23 Oct 2026). The real app on a local server, every outside request aborted and the
   service worker blocked, so nothing reaches the live database. The people list is stubbed (LowiR3.everyone) with week sunbeams.
   Checks at iPhone upright / sideways and iPad upright / sideways: five Community tabs that fit, the Ranking opens from the tab and
   from every old board link (openBoardTab, Settings row), podium of three + list, no human pictures, no page errors, and Move shows no
   Care board card or Milestones row. Not part of the offline suite.
   Usage: [CHROME=/path/to/chrome] [SHOT=/tmp/rk] node tests/ranking-live.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const SIZES = process.env.ONE ? [['iphone-up', 390, 844]] : [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820], ['small-phone', 360, 740]].slice(0, process.env.ALL ? 5 : 4);
srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw.chromium.launch(Object.assign({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, process.env.CHROME ? { executablePath: process.env.CHROME } : {}));
  for (const [name, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block' });
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    await ctx.addInitScript(() => { try { localStorage.setItem('lowi.gate', 'done');
      const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999');
      localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } })); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      const d = 864e5, L = [], day0 = new Date(); day0.setHours(9, 0, 0, 0);
      for (let i = 0; i < 3; i++) { const t = day0.getTime() - i * d; ['meal', 'move', 'water'].forEach((s, j) => L.push({ ts: t + j * 6e4, src: s, amt: 10 })); }
      localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 2311, ledger: L, user: { name: 'eman', bday: '1990-01-01' } })); } catch (e) {} });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    const stub = await page.evaluate(() => {
      if (!window.LowiR3 || !window.LowiCareBoard || !window.LowiRanking) return 'missing';
      const wk = LowiCareBoard.tag(LowiCareBoard.periodKey('w', Date.now()), 1), mo = LowiCareBoard.tag(LowiCareBoard.periodKey('m', Date.now()), 1);
      /* 23 Oct: no Manuuii or Emmy here any more, since build 20261023-114410 those count as Eman himself */
      const names = ['Joseph Castellar', 'Gus', 'Hana', 'Christabel', 'Eleonora', 'Fernando', 'Koji', 'Q', 'Ana', 'Ben', 'Cem', 'Dia', 'Eli', 'Fay'];
      const P = names.map((n, i) => ({ n, uid: '0000000' + i.toString(16) + '-aaaa-4aaa-8aaa-00000000000' + i.toString(16), xpw: 60 - i, wk, xpm: 200 - i, mo, xp: 90000 - i * 1000, lv: 20 }));
      const bots = [{ n: 'Samir', bot: true, lv: 43, xp: 999999 }, { n: 'Mateo', bot: true, lv: 1 }, { n: 'Jonas', bot: true, lv: 18 }, { n: 'Zed', demo: true, lv: 9, xp: 999999, xpw: 60, wk }, { n: 'Robo', uid: 'bot:robo', xp: 999999, xpw: 60, wk }];
      const orig = LowiR3.everyone.bind(LowiR3); LowiR3.everyone = () => P.concat(bots, (orig() || []).filter(p => p && p.me));
      return 'ok';
    });
    ok(stub === 'ok', name + ': people stubbed (' + stub + ')');
    for (const per of ['w', 'm', 'all']) {
      await page.evaluate(k => { LowiRanking.setPeriod(k); LowiRanking.open(); }, per);
      await page.waitForTimeout(1300);
      const b = await page.evaluate(() => { const box = document.querySelector('#cmPaneChat .rm-view > .rm-rank'); if (!box) return null;
        const txt = box.textContent; return { pod: box.querySelectorAll('.rk-pod-i').length, rows: box.querySelectorAll('.rk-row').length,
          nums: [...box.querySelectorAll('.rk-row .rk-n')].map(e => e.textContent.trim()), demo: /\bdemo\b/i.test(txt) || /Samir|Mateo|Jonas|Zed|Robo/.test(txt),
          me: (box.querySelector('.rk-me') || {}).textContent || '' }; });
      ok(b && b.pod === 3 && b.rows === 7 && b.nums.join() === '4,5,6,7,8,9,10', name + ' ' + per + ': top 10 only, podium 3 + rows ' + (b && b.nums.join()));
      ok(b && !b.demo, name + ' ' + per + ': no bot or demo entry');
      ok(b && /15/.test(b.me), name + ' ' + per + ': Your place shows the real place 15 (' + (b && b.me.replace(/\s+/g, ' ').slice(0, 60)) + ')');
    }
    /* scroll every Community tab and look at what is on top inside the bar and above it */
    for (const tab of ['rank', 'room', 'chat', 'fy', 'studio', 'chans']) {
      await page.evaluate(t => { if (t === 'chans') { try { LowiRoomsUI.showView('chans'); } catch (e) {} return; } const b = document.querySelector('#cmPaneChat .rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, tab);
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => {
        const pane = document.getElementById('cmPaneChat'), bar = pane && pane.querySelector(':scope > .rm-bar'); if (!bar) return { err: 'no bar' };
        let moved = 0; const sc = [pane, ...pane.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); return /(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.getClientRects().length; });
        sc.forEach(e => { const before = e.scrollTop; e.scrollTop += 400; moved += e.scrollTop - before; });
        return { moved, n: sc.length };
      });
      await page.waitForTimeout(500);
      const c = await page.evaluate(() => {
        const pane = document.getElementById('cmPaneChat'), bar = pane.querySelector(':scope > .rm-bar'), R = bar.getBoundingClientRect(), P = pane.getBoundingClientRect();
        const bad = [], pts = [];
        for (let y = R.top + 3; y < R.bottom - 2; y += 9) for (let x = R.left + 6; x < R.right - 6; x += 23) pts.push([x, y, 'in']);
        for (let y = Math.max(0, P.top) + 1; y < R.top - 1; y += 4) for (let x = R.left + 6; x < R.right - 6; x += 23) pts.push([x, y, 'above']);
        for (const [x, y, w] of pts) { const e = document.elementFromPoint(x, y); if (!e) continue; const inPane = pane.contains(e);
          if (inPane && !bar.contains(e) && e !== pane) bad.push(w + '@' + (x | 0) + ',' + (y | 0) + ':' + (e.className || e.tagName).toString().slice(0, 24)); }
        return { view: pane.getAttribute('data-rm-view'), bar: [R.top | 0, R.bottom | 0], bad: bad.slice(0, 4), nbad: bad.length, npts: pts.length };
      });
      ok(c.nbad === 0, name + ' ' + tab + ' (view ' + c.view + ', scrolled ' + r.moved + 'px in ' + r.n + '): nothing over or through the top bar ' + c.bar + ' (' + c.npts + ' points) ' + c.bad.join(' '));
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + name + '-' + tab + '.png' });
    }
    ok(!errs.length, name + ': no page errors ' + errs.join(' / '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
});
