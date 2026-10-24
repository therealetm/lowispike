/* 24 Oct 2026 (Emmanuel: a member's card said "Star sign: Not shared. Birthday: Not shared. Personality: Not shared."; 08:30: always
   visible, not optional, no hide toggle). The real app on a local server, outside requests aborted (the profiles upsert is recorded first),
   service worker blocked, people stubbed. Checks at 390x844: a returning account that had said "no" in the consent build publishes day + month
   on open with no ask, the own card (countdown, sign, test link in the app language, picker), no opt-out in Community settings, another member's
   card, an old full-year row never decoded, and Add my birthday for an account without one. Usage: node tests/profile-share-live.cjs [chromium|webkit] */
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
  const run = async (lang, user) => {
    const ctx = await browser.newContext(Object.assign({}, dev, { viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }));
    const pushed = [];
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => { const q = r.request(); if (/\/rest\/v1\/profiles/.test(q.url()) && q.method() === 'POST') { try { pushed.push(JSON.parse(q.postData() || 'null')); } catch (e) {} } r.abort(); });
    await ctx.addInitScript(([UID, lang, user]) => { try {
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang);
      localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } })); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 900, ledger: [], lang, user })); }
    } catch (e) {} }, [UID, lang, user || { name: 'eman', bday: '1990-03-01', shareProfile: { v: 1, at: 1, off: true } }]);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    await page.evaluate(() => { const rows = [{ uid: 'aaaaaaaa-0000-4000-8000-000000000001', n: 'Antje', bday: '0004-12-24', s: 'Capricorn', t: 'ENFP', lv: 6, xp: 2400 }, { uid: 'aaaaaaaa-0000-4000-8000-000000000002', n: 'Old row', bday: '1980-01-01', s: 'Leo', t: 'ENTJ', lv: 3, xp: 400 }]; window.LOWI_CLOUD.people = () => rows.slice(); });
    const sheetText = () => page.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov.on, .cs-overlay.on, .r2-ov')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').pop(); return o ? o.innerText : ''; });
    const closeAll = () => page.evaluate(() => { try { LowiR2.close(); } catch (e) {} });
    return { ctx, page, errs, sheetText, closeAll, pushed };
  };
  /* English: a returning account that turned sharing off in the consent build */
  { const { ctx, page, errs, sheetText, closeAll, pushed } = await run('en');
    const st = await page.evaluate(() => ({ PS: !!window.LowiProfileShare, bdayFn: !!LowiCommunityHost.setBday, old: !!LowiCommunityHost.setShare, id: LowiCommunityHost.identity() }));
    ok(st.PS && st.bdayFn && !st.old, 'profile-share-core loaded, host.setBday present, host.setShare gone');
    ok(st.id && !('share' in st.id) && !('asked' in st.id), 'identity carries no share/asked flags');
    /* offline fixture: pushProfile stops at "not live", so check the exact rule it applies to this account's saved state */
    const last = await page.evaluate(() => LowiProfileShare.publicRow(S.user, S.user.mbti || '')), rows = [last];
    ok(last.bday === '0004-03-01' && last.sign === 'Pisces' && !/1990/.test(JSON.stringify(rows)), 'on open the app publishes day + month and the sign despite the old "off", never the year: ' + JSON.stringify({ bday: last.bday, sign: last.sign, mbti: last.mbti }));
    /* no consent ask when Community opens */
    await page.evaluate(() => { try { LowiRanking.open(); } catch (e) {} });
    await page.waitForTimeout(2600);
    let t = await sheetText();
    ok(!/Share on my card|Not now/.test(t), 'no consent ask when Community opens');
    await closeAll(); await page.waitForTimeout(400);
    /* own card */
    const me = await page.evaluate(() => LOWI_CLOUD_X.state().uid);
    await page.evaluate(id => LowiCommunity.openProfile(id, 'eman'), me); await page.waitForTimeout(800);
    t = await sheetText(); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-2-own.png' });
    ok(/1 March · (in \d+ days|Tomorrow|Birthday today)/.test(t) && /Pisces/.test(t) && !/1990|not shared|Share on my card/i.test(t), 'own card: 1 March + countdown, Pisces, no year, no share button or tag');
    const link = await page.evaluate(() => { const a = document.querySelector('[data-ps-test]'); return a ? { href: a.href, tgt: a.target, vis: a.getBoundingClientRect().height > 30 } : null; });
    ok(link && link.href === 'https://www.16personalities.com/free-personality-test' && link.tgt === '_blank' && link.vis, 'own card without type: English test link visible ' + JSON.stringify(link));
    /* the type picker */
    const hasPick = await page.evaluate(() => !!document.querySelector('[data-chat="type-pick"]'));
    if (hasPick) { await page.evaluate(() => document.querySelector('[data-chat="type-pick"]').click()); await page.waitForTimeout(1200); const grid = await page.evaluate(() => { const g = [...document.querySelectorAll('.r5-mbgrid')].find(e => e.getClientRects().length && e.getBoundingClientRect().height > 50); return !!g; });
      ok(grid, 'I know my type opens the type picker'); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-5-picker.png' });
      await page.evaluate(() => { const b = [...document.querySelectorAll('.r5-mbgrid [data-v="INTJ"]')].find(e => e.getClientRects().length); if (b) b.click(); }); await page.waitForTimeout(900);
      const pub = await page.evaluate(() => { const me = LowiCommunityHost.identity(); return { t: me.t, row: LowiProfileShare.publicRow(S.user, (window.LowiR3 && LowiR3.me().t) || '') }; });
      ok(pub.t === 'INTJ' && pub.row.mbti === 'INTJ' && pub.row.bday === '0004-03-01', 'saved type INTJ is what gets shown ' + JSON.stringify(pub));
      await page.evaluate(() => { try { document.querySelector('[data-act="close-sheet"]') && document.querySelector('[data-act="close-sheet"]').click(); } catch (e) {} }); await closeAll(); await page.waitForTimeout(500);
      await page.evaluate(id => LowiCommunity.openProfile(id, 'eman'), me); await page.waitForTimeout(800); t = await sheetText();
      ok(/INTJ/.test(t) && !/· shared|personality test/i.test(t), 'own card now shows INTJ, no tag, test link gone'); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-5b-own-type.png' }); await closeAll(); await page.waitForTimeout(400); }
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
    ok(!/1980|January|Leo|ENTJ/.test(t) && !/Not shared/i.test(t) && (t.match(/Not added yet/g) || []).length >= 2 && /once this member opens the updated app/.test(t), 'old full-year row: never decoded, says Not added yet and when it appears, never "Not shared"');
    await closeAll(); await page.waitForTimeout(400);
    /* Community settings: the rule is stated, no toggle */
    await page.evaluate(() => { try { LowiRanking.open(); } catch (e) {} }); await page.waitForTimeout(1500);
    const set = await page.evaluate(() => { const b = document.querySelector('[data-chat="settings"]'); if (b) b.click(); return !!b; }); await page.waitForTimeout(900);
    t = await sheetText(); const tog = await page.evaluate(() => !!document.querySelector('form[data-chat-form="sharing"], input[name="all"]'));
    await page.screenshot({ path: SHOTS + '/' + ENGINE + '-9-settings.png' });
    ok(set && /never the year or your age/.test(t) && !tog, 'Community settings state day + month visibility, no sharing toggle');
    ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
    await ctx.close(); }
  /* an account without a birthday: Add my birthday */
  { const { ctx, page, errs, sheetText, pushed } = await run('en', { name: 'nobday', bday: '' });
    const me = await page.evaluate(() => LOWI_CLOUD_X.state().uid);
    await page.evaluate(id => LowiCommunity.openProfile(id, 'nobday'), me); await page.waitForTimeout(800);
    let t = await sheetText(); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-10-nobday.png' });
    ok(/Not added yet/.test(t) && /Add my birthday/.test(t), 'own card without birthday: Not added yet + Add my birthday');
    await page.evaluate(() => document.querySelector('[data-chat="bday-add"]').click()); await page.waitForTimeout(900);
    t = await sheetText(); ok(/never the year or your age/.test(t) && !/Not now/.test(t), 'sheet states the rule, no Not now');
    await page.evaluate(() => { const i = document.querySelector('form[data-chat-form="bday"] input[name="bday"]'); i.value = '1995-10-30'; document.querySelector('form[data-chat-form="bday"] button').click(); }); await page.waitForTimeout(4500);
    t = await sheetText(); await page.screenshot({ path: SHOTS + '/' + ENGINE + '-11-added.png' });
    const last = await page.evaluate(() => LowiProfileShare.publicRow(S.user, '')), rows = [last, await page.evaluate(() => localStorage.getItem('lowispike.v2').includes('"bday":"1995-10-30"') ? 'saved locally' : 'not saved')];
    ok(rows[1] === 'saved locally', 'the date is saved with the profile');
    if (!/30 October/.test(t)) console.log('info sheet: ' + t.slice(0, 300).replace(/\n/g, ' | '));
    ok(/30 October · in 6 days|30 October · in \d+ days/.test(t) && /Scorpio/.test(t) && !/1995/.test(t), 'card reopens with 30 October + countdown + Scorpio, no year');
    ok(last.bday === '0004-10-30' && last.sign === 'Scorpio' && !/1995/.test(JSON.stringify(last)), 'published 0004-10-30 Scorpio, never 1995: ' + JSON.stringify({ bday: last.bday, sign: last.sign }));
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
