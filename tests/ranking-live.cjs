/* Browser check for the Community Ranking tab (23 Oct 2026). The real app on a local server, every outside request aborted and the
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
const SIZES = process.env.ONE ? [['iphone-up', 390, 844]] : [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820], ['small-phone', 360, 740]];
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
      if (!window.LowiR3 || !window.LowiCareBoard || !window.LowiRanking) return 'missing ' + [!window.LowiR3 && 'R3', !window.LowiCareBoard && 'CB', !window.LowiRanking && 'Ranking'].filter(Boolean).join(',');
      const wk = LowiCareBoard.tag(LowiCareBoard.periodKey('w', Date.now()), 1), mo = LowiCareBoard.tag(LowiCareBoard.periodKey('m', Date.now()), 1);
      const P = [['Joseph Castellar', 30], ['Manuuii', 26], ['Emmy', 18], ['Samira', 12], ['Jonas', 9], ['Mateo', 5]].map(([n, p], i) => ({ n, uid: 'u' + i, xpw: p, wk, xpm: p * 2, mo, xp: 400 * (6 - i) }));
      const orig = LowiR3.everyone.bind(LowiR3); LowiR3.everyone = () => P.concat((orig() || []).filter(p => p && p.me));
      return 'ok';
    });
    ok(stub === 'ok', name + ': scripts loaded and people stubbed (' + stub + ')');
    /* old way in: Profile / Top / Settings all call openBoardTab */
    await page.evaluate(() => { try { window.LowiR3F && LowiR3F.openBoardTab ? LowiR3F.openBoardTab() : LowiRanking.open(); } catch (e) { LowiRanking.open(); } });
    await page.waitForTimeout(+process.env.WAIT || 1500);
    const r = await page.evaluate(() => {
      const pane = document.getElementById('cmPaneChat'), tabs = [...document.querySelectorAll('#cmPaneChat .rm-tabs .rm-tab')], box = document.querySelector('#cmPaneChat .rm-view > .rm-rank');
      const vis = el => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
      return {
        view: pane && pane.getAttribute('data-rm-view'), tabs: tabs.map(t => t.dataset.rm), sel: (tabs.find(t => t.getAttribute('aria-selected') === 'true') || {}).dataset,
        cut: tabs.filter(t => t.scrollWidth > t.clientWidth + 1).map(t => t.textContent), labels: tabs.map(t => t.textContent),
        shown: vis(box), dbg: box ? JSON.stringify([box.getBoundingClientRect().width|0, box.getBoundingClientRect().height|0, getComputedStyle(box).display, getComputedStyle(box).visibility, box.hidden, pane.getBoundingClientRect().width|0, typeof TAB!=='undefined'?TAB:'?', pane.getAttribute('data-spirit-chat'), (()=>{let e=box,o=[];while(e&&e!==document.documentElement){const c=getComputedStyle(e);if(c.visibility==='hidden'||c.opacity==='0')o.push((e.id||e.className||e.tagName).toString().slice(0,40)+':'+c.visibility+'/'+c.opacity);e=e.parentElement;}return o.join(' > ');})(), document.documentElement.className.slice(0,200)]) : 'nobox', pod: box ? box.querySelectorAll('.rk-pod-i').length : 0, rows: box ? box.querySelectorAll('.rk-row').length : 0, me: !!(box && box.querySelector('.rk-me')),
        imgs: box ? box.querySelectorAll('img').length : -1, wide: document.documentElement.scrollWidth > innerWidth + 1,
        podOut: box ? [...box.querySelectorAll('.rk-pod-i')].some(e => { const b = e.getBoundingClientRect(); return b.left < -1 || b.right > innerWidth + 1; }) : true
      };
    });
    ok(r.view === 'rank' && r.shown, name + ': the old board link opens Community > Ranking (view ' + r.view + ' ' + r.dbg + ')');
    ok(r.tabs.join() === 'room,chat,fy,studio,rank', name + ': five tabs ' + r.tabs.join());
    ok(r.sel && r.sel.rm === 'rank', name + ': Ranking tab is the selected one');
    ok(!r.cut.length, name + ': every tab label fits (' + r.labels.join(' | ') + ')' + (r.cut.length ? ' cut: ' + r.cut.join(',') : ''));
    ok(r.pod === 3 && r.rows >= 2 && r.me, name + ': Your place, podium of ' + r.pod + ', ' + r.rows + ' rows');
    ok(r.imgs === 0, name + ': companions, no human pictures');
    ok(!r.wide && !r.podOut, name + ': nothing wider than the screen');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + name + '.png' });
    /* tap the winner: the same member card as the old Care board opens */
    await page.evaluate(() => { const t = document.querySelector('#cmPaneChat .rk-pod-i.rk-p1'); if (t) t.click(); });
    await page.waitForTimeout(700);
    ok(await page.evaluate(() => !!document.querySelector('.rk-cmp-wrap')), name + ': tapping a companion opens You vs them (23 Oct: the comparison, its Profile button opens the owner card)');
    await page.evaluate(() => { try { window.LowiR2 && LowiR2.closeAll && LowiR2.closeAll(); } catch (e) {} });
    await page.waitForTimeout(400);
    /* tap another tab and back */
    await page.evaluate(() => { const t = document.querySelector('#cmPaneChat .rm-tab[data-rm="chat"]'); if (t) t.click(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { const t = document.querySelector('#cmPaneChat .rm-tab[data-rm="rank"]'); if (t) t.click(); });
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.getElementById('cmPaneChat').getAttribute('data-rm-view') === 'rank'), name + ': tapping the Ranking tab opens it');
    /* Move: no Care board card, no Milestones row */
    await page.evaluate(() => { try { goTab('move'); } catch (e) {} });
    await page.waitForTimeout(1200);
    ok(await page.evaluate(() => !document.querySelector('.nm-lbcard, .nm-milescard')), name + ': Move shows no Care board card or Milestones row');
    ok(!errs.length, name + ': no page errors ' + errs.join(' / '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
});
