'use strict';
/* Bug hunt 29 Oct 01:03 (Community / Circle): the new Circle games bar (Billard, Mischen, Swipen, Freundesbaum).
   Opens Community > Circle, taps each game by finger, records what is on screen, presses back (history.back = iPhone swipe /
   Android back) from each game, switches games fast, switches language with a game open, leaves to Home and back.
   node tools/hunt-circle-games-0103.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: 'webkit', members: 20, messages: 40, probe: true, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/tmp/hunt0103/cg-' + device.replace(/\W/g, '') + '-' + lang;
  require('fs').mkdirSync('/tmp/hunt0103', { recursive: true });
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  const st = () => P.evaluate(() => {
    const H = document.documentElement, a = document.querySelector('#main>.tab.active');
    const bar = document.getElementById('cspBar'), br = bar && bar.getBoundingClientRect();
    const sel = bar ? [...bar.querySelectorAll('[aria-selected="true"]')].map(b => b.dataset.csp) : null;
    const shelf = document.getElementById('tab-shelf'), sr = shelf && shelf.getBoundingClientRect();
    const tree = document.querySelector('.cr-ov.cr-ov-tree');
    const ov = [...document.querySelectorAll('.r2-ov.on,.cr-ov,.ns-ov.on,[role=dialog]:not([hidden])')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 4 && getComputedStyle(e).display !== 'none'; }).map(e => (e.id || String(e.className).slice(0, 30)));
    let rt = ''; try { rt = LowiRoomsUI.tab(); } catch (e) { }
    return { tab: a ? a.id : null, rm: rt, cur: window.LowiCircleGames && LowiCircleGames.current(), cls: ['csp-circle', 'csp-game', 'csp-tree', 'cook-holo'].filter(c => H.classList.contains(c)), bar: br ? [Math.round(br.top), Math.round(br.bottom), Math.round(br.width), getComputedStyle(bar).display] : null, sel, labels: bar ? [...bar.querySelectorAll('b')].map(b => b.textContent + (b.scrollWidth > b.clientWidth + 1 ? '(cut)' : '')) : null, shelf: sr && a && a.id === 'tab-shelf' ? [Math.round(sr.top), Math.round(sr.bottom)] : null, tree: tree ? String(tree.className) : null, ov, lang: H.lang, sx: document.scrollingElement.scrollWidth > innerWidth + 1 };
  });
  const back = async () => { await P.evaluate(() => history.back()); await H.sleep(1400); };
  const open = async () => { await P.evaluate(() => goTab('foryou')); await H.sleep(1500); const r = await P.locator('#cmPaneChat .rm-tab[data-rm="room"]').count(); if (r) await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(1500); };
  const game = async id => { await R.tap('#cspBar [data-csp="' + id + '"]').catch(e => log('tap ' + id + ' fail', String(e).slice(0, 80))); await H.sleep(1500); };
  R.step = 'open'; await open(); log('circle', await st()); await R.shot(tag + '-circle.png');
  log('buttons in circle', (await R.vis()).slice(0, 30));
  for (const id of ['mischen', 'swipen', 'baum']) {
    R.step = id; await game(id); log(id, await st()); await R.shot(tag + '-' + id + '.png');
    if (id !== 'baum') log(id + ' buttons', (await R.vis()).filter(s => !/cspBar|rm-tab/.test(s)).slice(0, 20));
    log(id + ' panel fit', await P.evaluate(() => { const sh = document.getElementById('tab-shelf'); if (!sh || !sh.classList.contains('active')) return null; const sr = sh.getBoundingClientRect(); const sb = document.getElementById('shBody'); const all = [...sh.querySelectorAll('button,[role=button]')].filter(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && !b.closest('[hidden]'); }); const out = all.filter(b => { const r = b.getBoundingClientRect(); return r.bottom > sr.bottom + 1 || r.top < sr.top - 1; }).map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 24) + '@' + Math.round(b.getBoundingClientRect().top)); return { panel: [Math.round(sr.top), Math.round(sr.bottom)], vh: innerHeight, body: sb ? [sb.scrollHeight, sb.clientHeight, getComputedStyle(sb).overflowY] : null, outside: out.slice(0, 12) }; }));
    R.step = id + ' back'; await back(); log(id + ' after back', await st());
    if (!(await P.evaluate(() => document.getElementById('tab-foryou').classList.contains('active')))) { log(id + ' NOTE', 'back left Community'); await open(); }
    else { await R.tap('#cspBar [data-csp="billard"]').catch(() => { }); await H.sleep(900); }
  }
  /* game -> other game -> billard -> back */
  R.step = 'chain'; await game('mischen'); await game('swipen'); log('mischen>swipen', await st()); await game('billard'); log('>billard', await st()); await back(); log('chain back', await st());
  await open();
  /* fast switching */
  R.step = 'fast'; for (let i = 0; i < 16; i++) { await R.tap('#cspBar [data-csp="' + ['mischen', 'swipen', 'baum', 'billard'][i % 4] + '"]').catch(() => { }); await H.sleep(150); }
  await H.sleep(1800); log('after fast', await st()); await R.shot(tag + '-fast.png');
  /* other Community tabs while a game is open */
  R.step = 'tab while game'; await game('mischen');
  const tabs = await P.evaluate(() => [...document.querySelectorAll('#cmPaneChat .rm-tab')].map(t => t.dataset.rm));
  log('rm tabs', tabs);
  for (const t of tabs.filter(t => t !== 'room')) { await R.tap('#cmPaneChat .rm-tab[data-rm="' + t + '"]').catch(e => log('tap rm ' + t, String(e).slice(0, 80))); await H.sleep(1400); log('rm ' + t + ' from game', await st()); await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(1200); log('rm room again', await st()); await game('mischen'); }
  /* Home while game open, then back to Community */
  R.step = 'home'; await P.evaluate(() => goTab('home')); await H.sleep(1500); log('home from game', await st()); await open(); log('circle again', await st());
  /* language switch with Swipen open */
  R.step = 'lang'; await game('swipen'); const other = lang === 'de' ? 'es' : 'de';
  await P.evaluate(l => { try { if (window.LowiLang && LowiLang.set) LowiLang.set(l); else if (window.setLang) setLang(l); } catch (e) { console.log('lang err ' + e); } }, other); await H.sleep(1800);
  log('after lang ' + other, await st()); await R.shot(tag + '-lang.png');
  /* reload with a game open */
  R.step = 'reload'; await P.reload(); await H.sleep(6000); log('after reload', await st());
  log('errs', R.errs); log('crashed', R.crashed); log('loads', R.loads);
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
