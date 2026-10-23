/* Browser check for the Ranking comparison (23 Oct 2026, Eman: "it has to be clear WHY"). The real app on a local server, every
   outside request aborted and the service worker blocked. People stubbed like ranking-ladder-live.cjs. Checks at iPhone and iPad
   upright and sideways and a small phone: the line under the tabs, form and level never cut, Compare the top 3, You vs one person,
   what it takes, the profile card next-level line, German and Spanish. Not part of the offline suite.
   Usage: [CHROME=/path/to/chrome] [SHOT=/tmp/cmp] node tests/ranking-compare-live.cjs */
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
    await page.evaluate(() => { const b = document.querySelector('#cmPaneChat [data-rk="per"][data-k="w"]'); if (b) b.click(); }); await page.waitForTimeout(500);
    /* 1. every board says what it counts; form and level never cut */
    const r = await page.evaluate(() => {
      const box = document.querySelector('#cmPaneChat .rm-view > .rm-rank'); if (!box) return null;
      const per = box.querySelector('.rk-per'), pr = per && per.getBoundingClientRect();
      const cut = [...box.querySelectorAll('.rk-of, .rk-ol')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
      const btn = box.querySelector('.rk-cmpb'), br = btn && btn.getBoundingClientRect();
      return { per: per ? per.textContent : '', perIn: !!pr && pr.left >= -1 && pr.right <= innerWidth + 1, cut, btn: btn ? btn.textContent : '', btnH: br ? br.height : 0, wide: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    ok(r && /^Week counts the sunbeams since Monday, .+ Up to 12 a day/.test(r.per) && r.perIn, name + ': Week line: ' + (r && r.per));
    ok(r && !r.cut.length, name + ': form and level never cut ' + JSON.stringify(r && r.cut));
    ok(r && /Compare the top 3/.test(r.btn) && r.btnH >= 44, name + ': Compare the top 3 button, ' + (r && r.btnH) + 'px tall');
    ok(r && !r.wide, name + ': nothing wider than the screen');
    for (const k of ['m', 'all']) {
      await page.evaluate(k => { const b = document.querySelector('#cmPaneChat [data-rk="per"][data-k="' + k + '"]'); if (b) b.click(); }, k); await page.waitForTimeout(400);
      const t = await page.evaluate(() => (document.querySelector('#cmPaneChat .rk-per') || {}).textContent || '');
      ok(k === 'm' ? /^Month counts the sunbeams since /.test(t) : /^All time counts all the XP/.test(t), name + ': ' + k + ' line: ' + t);
    }
    await page.evaluate(() => { const b = document.querySelector('#cmPaneChat [data-rk="per"][data-k="w"]'); if (b) b.click(); }); await page.waitForTimeout(400);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-rank-' + name + '.png' });
    /* 2. the top 3 side by side */
    await page.evaluate(q => { const e = document.querySelector(q); if (e) e.click(); }, '#cmPaneChat .rk-cmpb'); await page.waitForTimeout(700);
    const sheet = () => page.evaluate(() => {
      const w = document.querySelector('.rk-cmp-wrap.in'), d = w && w.querySelector('.rk-cmp'); if (!d) return null; const b = d.getBoundingClientRect();
      const over = [...d.querySelectorAll('.rk-cmp-tb, .rk-cmp-s, .rk-cmp-seg, .rk-cmpb')].filter(e => e.getBoundingClientRect().right > b.right + 1 || e.getBoundingClientRect().left < b.left - 1).length;
      return { t: (d.querySelector('.rk-cmp-t') || {}).textContent, rows: d.querySelectorAll('.rk-cmp-tb tbody tr').length, pairs: d.querySelectorAll('tr[data-cmp="pair"]').length, need: [...d.querySelectorAll('.rk-cmp-need li, .rk-cmp-need p')].map(e => e.textContent),
        needSun: [...d.querySelectorAll('.rk-cmp-need li, .rk-cmp-need p')].map(e => e.querySelectorAll('svg.li-sun[aria-label]').length), bareSun: d.querySelectorAll('.rk-cmp-need svg.li-sun:not([aria-label])').length,
        sunW: (() => { const i = d.querySelector('.rk-cmp-need svg.rk-sun'); return i ? Math.round(i.getBoundingClientRect().width) : 0; })(),
        cur: [...d.querySelectorAll('thead th.cur, tr.cur th')].map(e => e.textContent), inView: b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1, over,
        srcRows: d.querySelectorAll('.rk-src li').length, notes: [...d.querySelectorAll('.rk-cmp-note')].map(e => e.textContent), back: !!d.querySelector('.rk-cmp-bk'), pf: (d.querySelector('.rk-cmp-pf') || {}).textContent || '' };
    });
    let s = await sheet();
    ok(s && s.t === 'Top 3 side by side' && s.rows >= 3 && s.pairs >= 2, name + ': top 3 sheet, ' + (s && s.rows) + ' rows');
    ok(s && s.need.length === 3 && s.need.every(x => /\d/.test(x)), name + ': what it takes on each board: ' + (s && s.need.join(' | ')));
    ok(s && !s.need.some(x => /\bby 0\b/.test(x)) && s.need.some(x => /tie-break/.test(x)), name + ': a tie says you win the tie-break, never "lead by 0"');
    ok(s && s.inView && !s.over, name + ': sheet fits the screen, nothing sticks out');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-top3-' + name + '.png' });
    await page.evaluate(q => { const e = document.querySelector(q); if (e) e.click(); }, '.rk-cmp-seg [data-k="m"]'); await page.waitForTimeout(400);
    s = await sheet();
    ok(s && s.cur.some(c => /^Month/.test(c)), name + ': switching to Month inside the sheet: ' + (s && s.cur.join(',')));
    await page.evaluate(q => { const e = document.querySelector(q); if (e) e.click(); }, '.rk-cmp-seg [data-k="w"]'); await page.waitForTimeout(300);
    /* 3. You vs one person, from the top 3 */
    await page.evaluate(q => { const e = document.querySelector(q); if (e) e.click(); }, '.rk-cmp tr[data-cmp="pair"]'); await page.waitForTimeout(500);
    s = await sheet();
    ok(s && /^You vs /.test(s.t) && s.back && s.rows >= 6, name + ': ' + (s && s.t) + ', ' + (s && s.rows) + ' rows, back to top 3');
    /* 23 Oct: the sun is the app's own golden icon, labelled for screen readers (the emoji pass would strip a bare one) */
    ok(s && s.need.length === 1 && s.needSun[0] >= 1 && !s.bareSun && s.sunW >= 10, name + ': ' + (s && s.need[0]) + ' [sun icons ' + (s && s.needSun.join(',')) + ', ' + (s && s.sunW) + 'px]');
    ok(s && (s.srcRows > 0 || s.notes.length), name + ': sources: ' + (s && s.srcRows) + ' rows, ' + (s && s.notes.join(' | ')));
    ok(s && s.inView && !s.over, name + ': pair sheet fits the screen');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-pair-' + name + '.png' });
    await page.evaluate(() => { const b = document.querySelector('.rk-cmp-b'); if (b) b.scrollTop = b.scrollHeight; }); await page.waitForTimeout(200);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-pair2-' + name + '.png' });
    await page.evaluate(q => { const e = document.querySelector(q); if (e) e.click(); }, '.rk-cmp-pf'); await page.waitForTimeout(900);
    ok(await page.evaluate(() => !document.querySelector('.rk-cmp-wrap.in') && !!document.querySelector('.r3-ov')), name + ': Open profile goes to their card');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    /* 4. tapping a podium companion opens You vs them */
    await page.evaluate(() => { document.querySelectorAll('.r3-ov').forEach(e => e.remove()); LowiRanking.open(); }); await page.waitForTimeout(800);
    const tapped = await page.evaluate(() => { const p = [...document.querySelectorAll('#cmPaneChat .rk-pod-i[data-rk="open"]')].find(e => e.dataset.me !== '1'); if (!p) return false; p.click(); return true; });
    await page.waitForTimeout(600);
    s = await sheet();
    ok(tapped && s && /^You vs /.test(s.t) && !s.back, name + ': tapping a podium spot opens ' + (s && s.t));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !document.querySelector('.rk-cmp-wrap.in')), name + ': Escape closes the comparison');
    /* 5. the profile card: "Next: Level 6 · Legend" reads across, not one letter per line */
    const pc = await page.evaluate(async () => {
      try { LowiR3.open({ me: true }); } catch (e) { return { err: e.message }; }
      await new Promise(r => setTimeout(r, 900));
      const hs = [...document.querySelectorAll('.r3m-hint')].filter(e => e.offsetParent);
      if (!hs.length) return { none: true };
      return hs.map(hn => { const t = hn.querySelector('span:nth-child(2)'), b = t && t.getBoundingClientRect(), lh = t ? parseFloat(getComputedStyle(t).lineHeight) || 16 : 16, dots = hn.querySelector('.r3m-hb'), db = dots && dots.getBoundingClientRect(), hb = hn.getBoundingClientRect();
        return { txt: t ? t.textContent : '', w: b ? Math.round(b.width) : 0, lines: b ? Math.round(b.height / lh) : 0, dotsIn: !!db && db.right <= hb.right + 1 }; });
    });
    ok(Array.isArray(pc) && pc.every(x => x.w > 80 && x.lines <= 2 && x.dotsIn), name + ': profile card next-level line ' + JSON.stringify(pc));
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-profile-' + name + '.png' });
    await page.evaluate(() => document.querySelectorAll('.r3-ov').forEach(e => e.remove()));
    if (name === 'iphone-up') {
      await page.evaluate(() => { try { localStorage.setItem('lowispike.lang', 'de'); window.LowiLang && LowiLang.set && LowiLang.set('de'); } catch (e) {} });
      await page.waitForTimeout(500);
      await page.evaluate(() => LowiRanking.open()); await page.waitForTimeout(800);
      await page.evaluate(() => LowiRanking.openCompare(null)); await page.waitForTimeout(600);
      const de = await page.evaluate(() => ({ per: (document.querySelector('#cmPaneChat .rk-per') || {}).textContent || '', sheet: (document.querySelector('.rk-cmp') || {}).innerText || '' }));
      ok(/^Woche zählt/.test(de.per) && /Top 3 im Vergleich/.test(de.sheet) && /Was du brauchst/.test(de.sheet), 'German: ' + de.per + ' / ' + de.sheet.split('\n').slice(0, 3).join(' / '));
      if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-top3-de.png' });
      await page.keyboard.press('Escape');
      await page.evaluate(() => { try { localStorage.setItem('lowispike.lang', 'es'); window.LowiLang && LowiLang.set && LowiLang.set('es'); } catch (e) {} });
      await page.waitForTimeout(400);
      await page.evaluate(() => LowiRanking.openCompare({ uid: '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', n: 'Joseph Castellar' })); await page.waitForTimeout(600);
      const es = await page.evaluate(() => (document.querySelector('.rk-cmp') || {}).innerText || '');
      ok(/Tú vs\. /.test(es) && /Lo que hace falta/.test(es), 'Spanish: ' + es.split('\n').slice(0, 3).join(' / '));
      await page.keyboard.press('Escape');
      await page.evaluate(() => { try { localStorage.setItem('lowispike.lang', 'en'); window.LowiLang && LowiLang.set && LowiLang.set('en'); } catch (e) {} });
    }
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
});
