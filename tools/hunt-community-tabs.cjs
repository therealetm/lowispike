'use strict';
/* Bug hunt (Community tabs, live site): open Community, visit Room / Chat / Creation / Affiliates / Ranking by finger,
   dump what each shows (visible text, English words left in DE/ES, horizontal overflow, controls), open the Community menu,
   switch tabs fast 20 times, leave to Home and come back 6 times, reload while in Chat. Reports errors, crashes, reloads.
   node tools/hunt-community-tabs.cjs <device> [url|root] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: true, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/tmp/hunt1502/loc-tabs-' + device.replace(/\W/g, '') + '-' + lang + '-' + theme;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  const errs = []; P.on('pageerror', e => errs.push(String(e).slice(0, 200))); P.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  await P.evaluate(() => goTab('foryou')); await H.sleep(1200);
  const dump = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05 && !e.closest('[hidden],[aria-hidden="true"],[inert]'); };
    const pane = document.querySelector('#tab-foryou');
    const walker = document.createTreeWalker(pane || document.body, NodeFilter.SHOW_TEXT);
    const txt = []; let n; while ((n = walker.nextNode())) { const t = n.textContent.trim(); if (!t || !n.parentElement || !vis(n.parentElement)) continue; txt.push(t); }
    const wide = [...(pane || document.body).querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return vis(e) && (r.right > innerWidth + 2 || r.left < -2) && r.width < innerWidth * 1.5 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 6).map(e => (e.id || e.className || e.tagName).toString().slice(0, 40) + ' ' + Math.round(e.getBoundingClientRect().left) + '..' + Math.round(e.getBoundingClientRect().right));
    const active = [...document.querySelectorAll('#cmPaneChat .rm-tab')].filter(t => t.classList.contains('on') || t.getAttribute('aria-selected') === 'true').map(t => t.dataset.rm);
    return { active, text: [...new Set(txt)].join(' | ').slice(0, 1400), wide, sx: document.scrollingElement.scrollWidth > innerWidth + 1 };
  });
  for (const tab of ['room', 'chat', 'create', 'aff', 'rank']) {
    const sel = '#cmPaneChat .rm-tab[data-rm="' + tab + '"]';
    const has = await P.locator(sel).count();
    if (!has) { log('tab ' + tab, 'missing'); continue; }
    await R.tap(sel).catch(e => log('tap ' + tab, String(e).slice(0, 100))); await H.sleep(1800);
    const d = await dump(); log('tab ' + tab, d); await R.shot(tag + '-' + tab + '.png');
  }
  const rankBtn = await P.evaluate(() => { const b = [...document.querySelectorAll('#tab-foryou button,#tab-foryou [role=button]')].find(b => /Ranking|Rangliste|Clasificaci/i.test(b.textContent)); return b ? (b.id || b.className || b.tagName) + ' data=' + JSON.stringify(b.dataset) : null; });
  log('ranking button', rankBtn);
  /* fast tab switching */
  const tabs = ['room', 'chat', 'create', 'aff'];
  for (let i = 0; i < 20; i++) { await R.tap('#cmPaneChat .rm-tab[data-rm="' + tabs[i % 4] + '"]').catch(() => { }); await H.sleep(120); }
  await H.sleep(1500); log('after fast switch', await dump()); await R.shot(tag + '-fast.png');
  /* leave to Home and back */
  for (let i = 0; i < 6; i++) { await P.evaluate(() => { try { history.back(); } catch (e) { } }); await H.sleep(900); await P.evaluate(() => goTab('foryou')); await H.sleep(900); }
  log('after 6 leave/return', await dump());
  /* reload in chat */
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => { }); await H.sleep(1200);
  await P.reload(); await H.sleep(5000);
  log('after reload, tab', await P.evaluate(() => (document.querySelector('.tab.on,.tab.active,[id^="tab-"].on') || {}).id || location.hash));
  log('errs', errs); log('crashed', R.crashed || false); log('loads', R.loads);
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
