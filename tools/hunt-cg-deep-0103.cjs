'use strict';
/* 29 Oct 01:03 hunt: flows that start inside a Circle game (Mischen result sheet, Kochen tiles, Swipen actions) and the way back.
   node tools/hunt-cg-deep-0103.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: 'webkit', members: 12, messages: 20, probe: true, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content + ' ' + innerWidth + 'x' + innerHeight));
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05; };
    const a = document.querySelector('#main>.tab.active'); const Hc = document.documentElement.classList;
    const sheets = [...document.querySelectorAll('.r2-ov.on,.ns-ov.on,.au-sheet.on,.p2-ov.on,[id^=p2].on,.sheet.on,.cr-ov,.r5-ov.on,.gs-ov.on,[aria-modal="true"]')].filter(vis).map(e => e.id || String(e.className).slice(0, 30));
    const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2); const tit = [...document.querySelectorAll('h1,h2,.au-sheet-title,.au-sheet-title-2')].filter(vis).map(e => e.textContent.trim().slice(0, 30)).slice(0, 4);
    let rt = ''; try { rt = LowiRoomsUI.tab(); } catch (e) { }
    return { tab: a && a.id, rm: rt, cur: LowiCircleGames.current(), cls: ['csp-circle', 'csp-game', 'cook-holo'].filter(c => Hc.contains(c)), sheets, mid: top ? (top.id || String(top.className).slice(0, 24) || top.tagName) : null, tit };
  });
  const back = async (k) => { await P.evaluate(() => history.back()); await H.sleep(1600); log(k, await st()); };
  const toCircle = async () => { await P.evaluate(() => goTab('foryou')); await H.sleep(1500); await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(1500); };
  const game = async id => { await R.tap('#cspBar [data-csp="' + id + '"]'); await H.sleep(2000); };
  const tapIn = async (sel, k) => { const l = P.locator(sel).first(); await l.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => { }); await H.sleep(500); try { await R.tapEl(l); } catch (e) { log(k + ' tap fail', String(e).slice(0, 80)); return false; } await H.sleep(2200); log(k, await st()); return true; };
  /* A: Mischen > Shuffle my food > back > back */
  await toCircle(); await game('mischen'); log('A mischen', await st());
  if (await tapIn('#tab-shelf #r5Go', 'A after shuffle')) { await R.shot('/tmp/hunt0103/deep-' + device.replace(/\W/g, '') + '-shuffle.png'); await back('A back1'); await back('A back2'); }
  /* B: Mischen > All recipes tile > back > back */
  await toCircle(); await game('mischen');
  if (await tapIn('#tab-shelf .g2h-tile >> nth=0', 'B all recipes')) { await back('B back1'); await back('B back2'); await back('B back3'); }
  /* C: Mischen > Cook it > back */
  await toCircle(); await game('mischen');
  if (await tapIn('#tab-shelf .cs-btn >> nth=0', 'C cook it')) { await back('C back1'); await back('C back2'); }
  /* D: Swipen > Cook today > back */
  await toCircle(); await game('swipen');
  const n = await P.locator('#tab-shelf .r3k-b').count(); log('D r3k buttons', n);
  if (n) { if (await tapIn('#tab-shelf .r3k-b >> nth=' + (n - 1), 'D cook today')) { await back('D back1'); await back('D back2'); } }
  /* E: games bar tapped while a sheet from the game is open */
  await toCircle(); await game('mischen');
  if (await tapIn('#tab-shelf #r5Go', 'E shuffle')) { const hit = await P.evaluate(() => { const b = document.querySelector('#cspBar [data-csp="swipen"]'); if (!b) return null; const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === b || b.contains(e) ? 'bar reachable' : 'covered by ' + (e && (e.id || String(e.className).slice(0, 30))); }); log('E bar', hit); await game('swipen'); log('E after bar tap', await st()); await back('E back'); }
  log('errs', R.errs); log('crashed', R.crashed); log('loads', R.loads);
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
