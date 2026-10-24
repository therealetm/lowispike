/* Browser check: every Community tab looks the same (23 Oct 2026, Eman on the iPad: "Bei Ranking ist auf einmal so ein rechteckiger
   schwarzer Rand und Ranking selber ist nicht in so einer Box. So wie bei Creation und Chat, sogar Room hat das. Und ich moechte, dass
   das immer gleich aussieht."). The real app on a local server, outside requests aborted, service worker blocked, people stubbed.
   At iPhone and iPad upright and sideways and the 360px phone, for Room, Chat, Creation, Affiliates and Ranking: the top bar sits at
   the same place with no dark box of its own, the content sits in a rounded panel on every tab, and Ranking in the very same
   .rm-frame panel as Creation and Affiliates (same left/right/top edge, radius, border and glow), and on Ranking the list scrolls inside that panel so nothing slides over or shows through the bar.
   Not part of the offline suite. Usage: [CHROME=/path/to/chrome] [SHOT=/tmp/cp] [ONE=1] node tests/community-panel-live.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const SIZES = process.env.ONE ? [['ipad-up', 820, 1180]] : [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820], ['small-phone', 360, 740]];
const TABS = ['room', 'chat', 'fy', 'studio', 'rank'];   /* 24 Oct 2026: For You + Studio (Affiliates | Creation) */
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
    await page.evaluate(() => {
      if (!window.LowiR3 || !window.LowiCareBoard) return;
      const wk = LowiCareBoard.tag(LowiCareBoard.periodKey('w', Date.now()), 1), mo = LowiCareBoard.tag(LowiCareBoard.periodKey('m', Date.now()), 1);
      const names = ['Joseph Castellar', 'Christabel', 'Eleonora', 'Fernando', 'Koji', 'Q', 'Ana', 'Ben', 'Cem', 'Dia', 'Eli', 'Fay'];
      const P = names.map((n, i) => ({ n, uid: '0000000' + i.toString(16) + '-aaaa-4aaa-8aaa-00000000000' + i.toString(16), xpw: 60 - i, wk, xpm: 200 - i, mo, xp: 90000 - i * 1000, lv: 20 }));
      const orig = LowiR3.everyone.bind(LowiR3); LowiR3.everyone = () => P.concat((orig() || []).filter(p => p && p.me));
    });
    const geo = {};
    await page.evaluate(() => { LowiRanking.setPeriod('w'); LowiRanking.open(); });
    await page.waitForTimeout(1200);
    for (const tab of TABS) {
      await page.evaluate(t => { const b = document.querySelector('#cmPaneChat .rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, tab);
      await page.waitForTimeout(1200);
      geo[tab] = await page.evaluate(() => {
        const pane = document.getElementById('cmPaneChat'), bar = pane && pane.querySelector(':scope > .rm-bar'); if (!bar) return { err: 'no bar' };
        const B = bar.getBoundingClientRect(), bc = getComputedStyle(bar), tabs = bar.querySelector('.rm-tabs').getBoundingClientRect();
        /* the panel: the biggest element under the bar with a visible rounded border */
        let best = null, area = 0;
        for (const e of pane.querySelectorAll('*')) { if (bar.contains(e) || !e.getClientRects().length) continue; const c = getComputedStyle(e), r = e.getBoundingClientRect();
          if (parseFloat(c.borderTopWidth) < .5 || c.borderTopStyle === 'none' || parseFloat(c.borderTopLeftRadius) < 12 || r.top < B.bottom - 30) continue;
          const a = r.width * Math.min(r.height, innerHeight); if (a > area) { area = a; best = e; } }
        const out = { view: pane.getAttribute('data-rm-view') || '', barTop: Math.round(B.top), tabsTop: Math.round(tabs.top), tabsL: Math.round(tabs.left), tabsW: Math.round(tabs.width), barBg: bc.backgroundColor, barShadow: bc.boxShadow, barBefore: getComputedStyle(bar, '::before').content };
        if (best) { const c = getComputedStyle(best), r = best.getBoundingClientRect(); Object.assign(out, { cls: String(best.className).slice(0, 40), l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), rad: c.borderTopLeftRadius, bcol: c.borderTopColor, bw: c.borderTopWidth, sh: c.boxShadow, bg: c.backgroundColor, gap: Math.round(r.top - tabs.bottom) }); }
        return out;
      });
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + name + '-' + tab + '.png' });
      if (process.env.DUMP) console.log(name, tab, JSON.stringify(geo[tab]));
    }
    const ref = geo.create, near = (a, b, d) => Math.abs(a - b) <= (d || 2);
    for (const tab of TABS) { const g = geo[tab];
      ok(g && near(g.tabsTop, ref.tabsTop) && near(g.tabsL, ref.tabsL) && near(g.tabsW, ref.tabsW), name + ' ' + tab + ': tab bar at the same place as Creation (' + [g.tabsTop, g.tabsL, g.tabsW] + ' vs ' + [ref.tabsTop, ref.tabsL, ref.tabsW] + ')');
      ok(g && /rgba\(0, 0, 0, 0\)|transparent/.test(g.barBg) && g.barShadow === ref.barShadow && g.barBefore === ref.barBefore, name + ' ' + tab + ': no dark box behind the bar (bg ' + (g && g.barBg) + ')');
      if (tab === 'room' || tab === 'chat') ok(g && g.cls && g.r - g.l >= ref.r - ref.l - 10 && parseFloat(g.rad) >= 22, name + ' ' + tab + ': content in a rounded panel (' + (g && [g.cls, g.l, g.r, g.t, g.rad].join(' ')) + ')');
      else ok(g && g.cls && near(g.l, ref.l) && near(g.r, ref.r) && near(g.t, ref.t, 3) && g.rad === ref.rad && g.bcol === ref.bcol && g.bw === ref.bw && g.sh === ref.sh, name + ' ' + tab + ': content in the same panel as Creation (' + (g && [g.cls, g.l, g.r, g.t, g.rad, g.bcol].join(' ')) + ' vs ' + [ref.cls, ref.l, ref.r, ref.t, ref.rad, ref.bcol].join(' ') + ')');
    }
    /* Ranking: it scrolls inside the panel, the bar never moves and nothing shows over it */
    await page.evaluate(() => { LowiRanking.setPeriod('w'); LowiRanking.open(); });
    await page.waitForTimeout(1000);
    const s = await page.evaluate(async () => {
      const pane = document.getElementById('cmPaneChat'), bar = pane.querySelector(':scope > .rm-bar'), t0 = bar.getBoundingClientRect().top;
      const sc = [pane, ...pane.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); return /(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.getClientRects().length; });
      let moved = 0, inner = 0; sc.forEach(e => { const b = e.scrollTop; e.scrollTop += 500; moved += e.scrollTop - b; if (e !== pane && !e.contains(bar)) inner += e.scrollTop - b; });
      await new Promise(r => setTimeout(r, 400));
      const R = bar.getBoundingClientRect(), P = pane.getBoundingClientRect(), bad = [];
      for (let y = R.top + 3; y < R.bottom - 2; y += 9) for (let x = R.left + 6; x < R.right - 6; x += 23) { const e = document.elementFromPoint(x, y); if (e && pane.contains(e) && !bar.contains(e) && e !== pane) bad.push((e.className || e.tagName).toString().slice(0, 24)); }
      return { moved, inner, shift: Math.round(R.top - t0), bad: bad.slice(0, 4), nbad: bad.length, paneTop: pane.scrollTop };
    });
    ok(s.inner > 0 && s.shift === 0 && s.nbad === 0, name + ' rank: the list scrolls inside the panel (' + s.inner + 'px), the bar stays put (shift ' + s.shift + ') and nothing shows over it ' + s.bad.join(' '));
    ok(!errs.length, name + ': no page errors ' + errs.join(' / '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
});
