'use strict';
/* weekly-ranking task, live check after release: a fresh test browser (navigator.webdriver) opens the live app, signs in as a
   guest (now flagged test), opens Community > Ranking > Week. Logs the board text and the new guest id. Logs nothing, posts nothing. */
const pw = require('/tmp/pw/node_modules/playwright');
(async () => {
  const eng = process.argv[2] || 'webkit', lang = process.argv[3] || 'en';
  const b = await pw[eng].launch();
  const ctx = await b.newContext(eng === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(l => { try { localStorage.setItem('lowi.tutorial.done', '1'); localStorage.setItem('lowispike.lang', l);
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Livecheck', bday: '1990-01-01' }, xp: 0, ledger: [], logs: [], settings: { lang: l } })); } catch (e) {} }, lang);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const posts = []; p.on('request', r => { if (r.method() !== 'GET' && /supabase/.test(r.url())) posts.push(r.method() + ' ' + r.url().replace(/^https:\/\/[^/]+/, '').slice(0, 60) + (/signup/.test(r.url()) ? ' ' + (r.postData() || '').slice(0, 120) : '')); });
  await p.goto('https://therealetm.github.io/lowispike/', { waitUntil: 'load' });
  await p.waitForFunction(() => window.LowiRanking && window.LOWI_CLOUD_X, null, { timeout: 120000 });
  await p.waitForTimeout(9000);
  const info = await p.evaluate(() => ({ build: (window.LOWI_BUILD || document.documentElement.dataset.build || ''), wd: navigator.webdriver, opts: window.lowiAnonOpts && JSON.stringify(window.lowiAnonOpts()) }));
  await p.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiRanking.open(); } catch (e) {} });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { try { LowiRanking.setPeriod('w'); } catch (e) {} });
  await p.waitForTimeout(1500);
  const wk = await p.evaluate(() => { const bx = [...document.querySelectorAll('.rm-rank')].find(x => !x.hidden); return bx ? bx.innerText.replace(/\s+/g, ' ').slice(0, 500) : 'no board'; });
  await p.screenshot({ path: '/tmp/wr/live-week-' + eng + '-' + lang + '.png' });
  console.log(JSON.stringify({ eng, lang, info, week: wk, posts: posts.slice(0, 8), errs }));
  await b.close();
})();
