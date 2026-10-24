/* 24 Oct 2026 (Emmanuel: a member's card said "Star sign: Not shared. Birthday: Not shared. Personality: Not shared."). The real app on a local
   server, outside requests aborted, service worker blocked, people stubbed. Checks at 390x844: the consent ask when Community opens, the own card
   (countdown, sign, test link in the app language, picker), Share saves the consent and publishes only day + month, another member's shared
   card, and an old full-year row staying private. Usage: node tests/profile-share-live.cjs [chromium|webkit] */
const http = require('http'), fs = require('fs'), path = require('path');
const pw = require('/tmp/pw/node_modules/playwright');
const ROOT = path.join(__dirname, '..'), ENGINE = process.argv[2] || 'chromium', SHOTS = process.env.SHOTS || '/tmp/profile-share-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const UID = '00000000-0000-4000-8000-00000000c0c0';
(async () => {
  await new Promise(r => srv.listen(0, r));
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw[ENGINE].launch();
  const dev = ENGINE === 'webkit' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const run = async (lang) => {
    const ctx = await browser.newContext(Object.assign({}, dev, { viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }));
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    await ctx.addInitScript(([UID, lang]) => { try {
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang);
      localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } })); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 900, ledger: [], lang, user: { name: 'eman', bday: '1990-03-01' } })); }
    } catch (e) {} }, [UID, lang]);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    await page.evaluate(() => { const rows = [{ uid: 'aaaaaaaa-0000-4000-8000-000000000001', n: 'Antje', bday: '0004-12-24', s: 'Capricorn', t: 'ENFP', lv: 6, xp: 2400 }, { uid: 'aaaaaaaa-0000-4000-8000-000000000002', n: 'Old row', bday: '1980-01-01', s: 'Leo', t: 'ENTJ', lv: 3, xp: 400 }]; window.LOWI_CLOUD.people = () => rows.slice(); });
    const sheetText = () => page.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov.on, .cs-overlay.on, .r2-ov')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').pop(); return o ? o.innerText : ''; });
    const closeAll = () => page.evaluate(() => { try { LowiR2.close(); } catch (e) {} });
    return { ctx, page, errs, sheetText, closeAll };
  };
  /* English */
  { const { ctx, page, errs, sheetText, closeAll } = await run('en');
    const st = await page.evaluate(() => ({ scope: (window.LOWI_CLOUD_X && LOWI_CLOUD_X.state().uid) || '', PS: !!window.LowiProfileShare, share: !!LowiCommunityHost.setShare, id: LowiCommunityHost.identity() }));
    ok(st.PS && st.share, 'profile-share-core loaded and host.setShare present');
    ok(st.id && st.id.share === false && st.id.asked === false, 'existing user starts with nothing shared and not asked: ' + JSON.stringify(st.id && { share: st.id.share, asked: st.id.asked }));
    /* consent ask when Community opens */
    await page.evaluate(() => { try { LowiRanking.open(); } catch (e) {} });
    await page.waitForTimeout(2600);
    let t = await sheetText();
    const autoAsk = /Your Community card/.test(t);
    console.log('info auto ask on Community open: ' + autoAsk);
    if (!autoAsk) { await closeAll(); await page.waitForTimeout(300); await page.evaluate(() => LowiCommunity.openProfile(LowiCommunityHost.state().uid || 'me', 'eman')); await page.waitForTimeout(700); }
    else { await page.screenshot({ path: SHOTS + '/' + ENGINE + '-1-ask.png' }); ok(/never the year or your age/.test(t) && /1 March/.test(t) && /Pisces/.test(t) && !/1990/.test(t), 'ask explains the rule and previews 1 March + Pisces, no year'); await closeAll(); await page.waitForTimeout(400); }
    /* own card before consent */
    const me = await page.evaluate(() => LOWI_CLOUD_X.state().uid);
    await page.evaluate(id => LowiCommunity.openProfile(id, 'eman'), me); await page.waitForTimeout(800);
    t = await sheetText(); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-2-own-before.png' });
    ok(/1 March/.test(t) && /not shared yet/.test(t) && /Pisces/.test(t) && !/1990/.test(t), 'own card: 1 March, countdown, Pisces, marked not shared yet');
    const link = await page.evaluate(() => { const a = document.querySelector('[data-ps-test]'); return a ? { href: a.href, tgt: a.target, vis: a.getBoundingClientRect().height > 30 } : null; });
    ok(link && link.href === 'https://www.16personalities.com/free-personality-test' && link.tgt === '_blank' && link.vis, 'own card without type: English test link visible ' + JSON.stringify(link));
    /* Share */
    await page.evaluate(() => document.querySelector('[data-chat="share-ask"]').click()); await page.waitForTimeout(900);
    t = await sheetText(); ok(/Your Community card/.test(t), 'share button opens the consent sheet');
    await page.screenshot({ path: SHOTS + '/' + ENGINE + '-3-consent.png' });
    await page.evaluate(() => document.querySelector('form[data-chat-form="share"] button').click()); await page.waitForTimeout(2200);
    const saved = await page.evaluate(() => { const v = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); return { c: v.user && v.user.shareProfile, row: LowiProfileShare.publicRow(S.user, S.user.shareProfile, '') }; });
    ok(saved.c && saved.c.v === 1 && saved.c.at > 0 && !saved.c.off, 'Share saved the consent with the profile ' + JSON.stringify(saved.c));
    ok(saved.row.bday === '0004-03-01' && saved.row.sign === 'Pisces' && saved.row.mbti === '', 'what pushProfile may publish: ' + JSON.stringify(saved.row));
    t = await sheetText(); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-4-own-after.png' });
    ok(/1 March[^\n]*shared/.test(t) && !/not shared yet/.test(t), 'own card reopened marked shared');
    /* the type picker */
    const hasPick = await page.evaluate(() => !!document.querySelector('[data-chat="type-pick"]'));
    if (hasPick) { await page.evaluate(() => document.querySelector('[data-chat="type-pick"]').click()); await page.waitForTimeout(1200); const grid = await page.evaluate(() => { const g = [...document.querySelectorAll('.r5-mbgrid')].find(e => e.getClientRects().length && e.getBoundingClientRect().height > 50); return !!g; });
      ok(grid, 'I know my type opens the type picker'); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-5-picker.png' });
      await page.evaluate(() => { const b = [...document.querySelectorAll('.r5-mbgrid [data-v="INTJ"]')].find(e => e.getClientRects().length); if (b) b.click(); }); await page.waitForTimeout(900);
      const pub = await page.evaluate(() => { const me = LowiCommunityHost.identity(); return { t: me.t, row: LowiProfileShare.publicRow(S.user, S.user.shareProfile, (window.LowiR3 && LowiR3.me().t) || '') }; });
      ok(pub.t === 'INTJ' && pub.row.mbti === 'INTJ' && pub.row.bday === '0004-03-01', 'saved type INTJ is what gets shared ' + JSON.stringify(pub));
      await page.evaluate(() => { try { document.querySelector('[data-act="close-sheet"]') && document.querySelector('[data-act="close-sheet"]').click(); } catch (e) {} }); await closeAll(); await page.waitForTimeout(500);
      await page.evaluate(id => LowiCommunity.openProfile(id, 'eman'), me); await page.waitForTimeout(800); t = await sheetText();
      ok(/INTJ · shared/.test(t) && !/personality test/i.test(t), 'own card now shows INTJ · shared, test link gone'); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-5b-own-type.png' }); await closeAll(); await page.waitForTimeout(400); }
    else ok(false, 'type-pick button present');
    /* another member who shared */
    await page.evaluate(() => LowiCommunity.openProfile('aaaaaaaa-0000-4000-8000-000000000001', 'Antje')); await page.waitForTimeout(800);
    t = await sheetText(); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-6-antje.png' });
    ok(/24 December/.test(t) && /(in \d+ days|Tomorrow|Birthday today)/.test(t) && /Capricorn/.test(t) && /ENFP/.test(t), 'Antje: 24 December + countdown, Capricorn, ENFP');
    ok(!/0004|personality test|I know my type/i.test(t), 'no marker year and no test link on someone else\'s card');
    const fit = await page.evaluate(() => { const s = [...document.querySelectorAll('.cs-sheet')].pop(); if (!s) return null; const r = s.getBoundingClientRect(); const over = [...s.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0).length; return { l: r.left, r: r.right, over }; });
    ok(fit && fit.l >= 0 && fit.r <= 390, 'card fits 390 wide ' + JSON.stringify(fit));
    await closeAll(); await page.waitForTimeout(400);
    /* old full-year row */
    await page.evaluate(() => LowiCommunity.openProfile('aaaaaaaa-0000-4000-8000-000000000002', 'Old row')); await page.waitForTimeout(800);
    t = await sheetText(); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-7-legacy.png' });
    ok(!/1980|January|Leo|ENTJ/.test(t) && (t.match(/Not shared/g) || []).length >= 3, 'old full-year row: all three Not shared');
    ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
    await ctx.close(); }
  /* German and Spanish: sign names and the test page in the app language */
  for (const [lang, url, sign] of [['de', 'https://www.16personalities.com/de/kostenloser-personlichkeitstest', 'Fische'], ['es', 'https://www.16personalities.com/es/test-de-personalidad', 'Piscis']]) {
    const { ctx, page, sheetText } = await run(lang);
    const me = await page.evaluate(() => LOWI_CLOUD_X.state().uid);
    await page.evaluate(id => LowiCommunity.openProfile(id, 'eman'), me); await page.waitForTimeout(800);
    const t = await sheetText(), href = await page.evaluate(() => { const a = document.querySelector('[data-ps-test]'); return a ? a.href : ''; });
    await page.screenshot({ path: SHOTS + '/' + ENGINE + '-8-own-' + lang + '.png' });
    ok(href === url, lang + ' test link ' + href);
    ok(t.includes(sign), lang + ' sign name ' + sign);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED' : 'ALL OK'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
