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
const SIZES0 = process.env.ONE ? [['iphone-up', 390, 844]] : [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820], ['small-phone', 360, 740]];
const SIZES = [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820], ['small-phone', 360, 740]];
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
      if (!window.LowiR3 || !window.LowiCareBoard || !window.LowiRanking || !window.LowiCompanion) return 'missing';
      const wk = LowiCareBoard.tag(LowiCareBoard.periodKey('w', Date.now()), 1), mo = LowiCareBoard.tag(LowiCareBoard.periodKey('m', Date.now()), 1);
      const P = [['Joseph Castellar', 30, '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', 2400, 9], ['Emmanuel', 28, 'e81217a0-6658-4c00-bce2-bfe56de897a5', 2400, 9], ['Manuuii', 26, '4add63ec-61d6-4187-9c62-bd78c427be24', 300, 3], ['Emmy', 18, 'd813675e-16b6-40e3-bedb-d6fe8b01af91', 30, 1], ['Koji', 12, 'k-1', 900, 5], ['Fernando', 9, 'f-1', 120, 2]].map(([n, p, uid, xp, lv]) => ({ n, uid, xpw: p, wk, xpm: p * 2, mo, xp, lv }));
      const orig = LowiR3.everyone.bind(LowiR3); LowiR3.everyone = () => P.concat((orig() || []).filter(p => p && p.me));
      const fl = LowiCompanion.friendLooks; LowiCompanion.friendLooks = () => Object.assign({}, fl ? fl() : {}, { '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad': '1.5.0.ff8844.aa66ff.s.v.n.m.k1~Blaze%20Nova', 'k-1': '1.4.3.88ccff.c7b0ff.e.f.b.w.2a' });
      return 'ok';
    });
    ok(stub === 'ok', name + ': stubbed ' + stub);
    await page.evaluate(() => LowiRanking.open()); await page.waitForTimeout(1500);
    await page.evaluate(() => { const b = document.querySelector('#cmPaneChat [data-rk="per"][data-k="all"]'); if (b) b.click(); }); await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const box = document.querySelector('#cmPaneChat .rm-view > .rm-rank'); if (!box) return null;
      const items = [...box.querySelectorAll('.rk-pod-i, .rk-row')].map(e => ({ cn: (e.querySelector('.rk-cn') || {}).textContent, own: (e.querySelector('.rk-own') || {}).textContent, ownr: (e.querySelector('.rk-ownr') || {}).textContent }));
      return { items, me: !!box.querySelector('.rk-me[data-rk="ladder"]'), wide: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    ok(r && r.me, name + ': Your place opens the ladder');
    const owners = r ? r.items.map(i => i.ownr) : [];
    ok(r && !owners.some(o => /Emmanuel|Manuuii|Emmy/.test(o)), name + ': Eman once (' + owners.join(', ') + ')');
    const jo = r && r.items.find(i => i.ownr === 'Joseph Castellar');
    ok(jo && jo.cn === 'Blaze Nova' && /\S+ \u00b7 /.test(jo.own), name + ': chosen name with rank under it: ' + JSON.stringify(jo));
    const ko = r && r.items.find(i => i.ownr === 'Koji');
    ok(ko && ko.cn && !/~/.test(ko.cn), name + ': fallback form name for a look without a name: ' + JSON.stringify(ko));
    ok(r && !r.wide, name + ': nothing wider than the screen');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-rank-' + name + '.png' });
    await page.click('#cmPaneChat .rk-me'); await page.waitForTimeout(700);
    const l = await page.evaluate(() => {
      const w = document.querySelector('.rk-lad-wrap.in'), d = w && w.querySelector('.rk-lad'); if (!d) return null; const b = d.getBoundingClientRect();
      return { steps: d.querySelectorAll('.rk-lad-i').length, on: d.querySelectorAll('.rk-lad-i.on').length, locks: d.querySelectorAll('.rk-lad-i.off .rk-lock').length, now: (d.querySelector('.rk-lad-i.now b') || {}).textContent,
        next: (d.querySelector('.rk-lad-next') || {}).textContent, first: (d.querySelector('.rk-lad-i small') || {}).textContent, foot: (d.querySelector('.rk-lad-foot') || {}).textContent,
        inView: b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1, cut: [...d.querySelectorAll('.rk-lad-w b')].filter(e => e.scrollWidth > e.clientWidth + 1).length };
    });
    ok(l && l.steps === 25 && l.on >= 1 && l.locks === 25 - l.on, name + ': ladder 25 levels, ' + (l && l.on) + ' reached, locks on the rest');
    ok(l && /XP/.test(l.next) && /100%/.test(l.first) && /\d/.test(l.foot), name + ': ' + (l && [l.now, l.next, l.first, l.foot].join(' | ')));
    ok(l && l.inView, name + ': ladder fits the screen');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-ladder-' + name + '.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !document.querySelector('.rk-lad-wrap.in')), name + ': Escape closes the ladder');
    if (name === 'iphone-up') {
      await page.evaluate(() => { try { localStorage.setItem('lowispike.lang', 'de'); window.LowiLang && LowiLang.set && LowiLang.set('de'); } catch (e) {} });
      await page.waitForTimeout(500);
      await page.click('#cmPaneChat .rk-me'); await page.waitForTimeout(600);
      const de = await page.evaluate(() => (document.querySelector('.rk-lad') || {}).innerText || '');
      ok(/der Spieler/.test(de) && /bis Level/.test(de), 'German ladder: ' + de.split('\n').slice(0, 4).join(' / '));
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-ladder-de.png' });
      await page.keyboard.press('Escape');
      await page.evaluate(() => { try { localStorage.setItem('lowispike.lang', 'en'); window.LowiLang && LowiLang.set && LowiLang.set('en'); } catch (e) {} });
      /* recipes and the meal logger */
      const m = await page.evaluate(() => {
        const out = {};
        for (const t of ['tiramisu', 'doener', 'ramen', 'lemonade', 'chai latte', 'tacos', 'milk', 'coffee with milk']) { try { const a = analyseMeal(t); out[t] = a ? JSON.stringify({ v: a.verdict || a.r || a.level, sw: a.swap && (a.swap.rb || a.swap.n) || (a.s && (a.s.rb || a.s.n)) , m: a.meal && a.meal.id }).slice(0, 200) : null; } catch (e) { out[t] = 'ERR ' + e.message; } }
        return out;
      });
      console.log('meal logger: ' + JSON.stringify(m));
      const bk = await page.evaluate(() => { try { return typeof RECIPE_BOOK !== 'undefined' ? RECIPE_BOOK.length : -1; } catch (e) { return -2; } });
      ok(bk === 38, 'Recipe Book has ' + bk);
      for (const id of ['tiramisu', 'doener', 'ramen', 'lemonade']) {
        await page.evaluate(id => { try { document.querySelectorAll('.open').forEach(e => { if (e.id === 'result') e.classList.remove('open'); }); openMeal(id); } catch (e) { window.__e = e.message; } }, id);
        await page.waitForTimeout(900);
        const sc = await page.evaluate(() => { const r = document.querySelector('#result.open'); if (!r) return { err: window.__e || 'no result' }; const l = r.querySelector('.swapcard .sh-rblink'), shop = r.querySelector('[data-shshop]'); return { link: l ? l.dataset.r : null, shop: !!shop, txt: (r.querySelector('.swapcard .h3') || {}).textContent }; });
        ok(sc && sc.link && /^rb_/.test(sc.link) && sc.shop, 'scan result ' + id + ': recipe link and shopping box ' + JSON.stringify(sc));
        if (id === 'tiramisu' && process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-scan-tiramisu.png' });
      }
      await page.evaluate(() => { const l = document.querySelector('#result.open .swapcard .sh-rblink'); if (l) l.click(); });
      await page.waitForTimeout(1500);
      const rv = await page.evaluate(() => { const s = document.querySelector('#p2Rec'); return s ? s.innerText.slice(0, 400) : null; });
      ok(rv && /Ginger Lemon Fizz/i.test(rv), 'tapping the recipe link opens the new recipe: ' + String(rv).replace(/\n/g, ' / ').slice(0, 200));
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-recipe.png' });
    }
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
});
