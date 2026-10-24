'use strict';
/* Hourly back and close sweep (Oct 24 2026): open each screen, sheet and popup a player reaches from Home, leave it with back
   (Safari edge swipe / Android back = history.back), Escape, the visible X and a swipe down, and check Home comes back clean:
   Home tab, no sheet or overlay left, Home's bubbles take taps again, the app did not leave, reload or crash, no page errors.
   Then the same open/back round trip several times quickly.
   node tools/backclose-sweep.cjs [webkit|chromium] [device | WxH] [url|root] [only-regex]   (fake cloud, nothing leaves the VM) */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'webkit', dev = process.argv[3] || 'iPhone 13';
const target = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const only = process.argv[5] ? new RegExp(process.argv[5], 'i') : null;
const METHODS = (process.env.METHODS || 'back,escape,x,swipe').split(',');
const RAPID = +(process.env.RAPID || 4);
const sleep = H.sleep;

/* ---------- in-page helpers ---------- */
const STATE = () => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05 && r.bottom > 0 && r.top < innerHeight; };
  const tab = (document.querySelector('#main > .tab.active') || document.querySelector('.tab.active') || {}).id || '';
  const modals = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"],dialog[open]')].filter(vis).map(e => e.id || String(e.className).split(' ')[0] || e.tagName);
  const r2 = document.querySelectorAll('.r2-ov.on').length;
  /* big fixed layers above the page (a stuck scrim / sheet) */
  const layers = [...document.body.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); if (s.position !== 'fixed' || !vis(e)) return false; const r = e.getBoundingClientRect(); return r.width * r.height > innerWidth * innerHeight * .3 && s.pointerEvents !== 'none'; }).map(e => e.id || String(e.className).split(' ')[0] || e.tagName);
  const hit = sel => { const b = document.querySelector(sel); if (!b || !vis(b)) return 'gone'; const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t ? (t === b || b.contains(t) ? 'ok' : (t.id || String(t.className).split(' ')[0] || t.tagName)) : 'none'; };
  return { tab, modals, r2, layers, hits: { misty: hit('#spBubble'), scan: hit('[data-orbit="scan"]'), fuel: hit('[data-orbit="fuel"]') }, html: document.documentElement.className.split(/\s+/).filter(Boolean).sort(), url: location.href, hist: history.length };
};

(async () => {
  const o = { engine, members: 12, messages: 30, probe: false, lang: 'en' };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w || 390, height: h || 844 }; }
  const R = await H.open(o); const P = R.page;
  if (engine === 'webkit') await R.ctx.addInitScript({ content: require('fs').readFileSync(require('path').join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
  let bootLoads = 0;
  const findings = []; const covered = [];
  const note = (k, m, extra) => { const f = { k, m, extra }; findings.push(f); console.log('FINDING', k, '|', m, extra ? JSON.stringify(extra).slice(0, 700) : ''); };
  let base = null, appUrl = '';
  const boot = async () => {
    for (let i = 0; i < 3; i++) { try { await R.goto(); if (await P.evaluate(() => !!(window.goTab && document.getElementById('whPad')))) break; } catch (e) { console.log('boot retry', e.message.slice(0, 80)); } }
    await sleep(9000);
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
    await P.touchscreen.tap(8, 420).catch(() => { }); await sleep(800);
    base = await P.evaluate(STATE); bootLoads = R.loads; appUrl = P.url().split('?')[0];
    console.log('BASE', JSON.stringify(base).slice(0, 600));
  };
  const alive = () => !R.crashed && R.loads === bootLoads && P.url().split('?')[0] === appUrl;
  const st = async () => { for (let i = 0; i < 3; i++) { try { const r = await Promise.race([P.evaluate(STATE), sleep(25000).then(() => 'HUNG')]); if (r === 'HUNG') { note('freeze', 'page did not answer for 25s at ' + R.step, {}); continue; } return r; } catch (e) { await sleep(1500); } } return { tab: 'dead', modals: [], r2: 0, layers: [], hits: {}, html: [], url: P.url() }; };
  const transient = c => /^(nm-f|kb-|touch|lg-|wh-anim|is-|bw-|gz-|sl-|lb-|o8-|ph-|tod-|sky-|day|night|dusk|dawn|wx-|cy-|mp-|wh-)/.test(c);
  const clean = s => s.tab === base.tab && !s.r2 && !s.modals.length && s.layers.join() === base.layers.join() && s.hits.misty === 'ok' && s.hits.scan === base.hits.scan;
  const diffHtml = s => ({ added: s.html.filter(c => !base.html.includes(c) && !transient(c)), gone: base.html.filter(c => !s.html.includes(c) && !transient(c)) });
  const opened = s => s.tab !== base.tab || s.r2 || s.modals.length || s.layers.join() !== base.layers.join() || diffHtml(s).added.length;
  const tapSel = async sel => { const b = await P.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); if (!b) return false; await P.touchscreen.tap(b[0], b[1]); return true; };
  /* long press: real pointer + touch events at the element centre, held, then released (Playwright has no touch hold) */
  const holdSel = async (sel, ms = 900) => P.evaluate(async ([sel, ms]) => {
    const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y) || e;
    const pe = (type) => t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    let te = () => { }; try { const tt = new Touch({ identifier: 7, target: t, clientX: x, clientY: y }); te = (type) => t.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches: type === 'touchend' ? [] : [tt], targetTouches: type === 'touchend' ? [] : [tt], changedTouches: [tt] })); } catch (x) { }
    pe('pointerdown'); te('touchstart'); await new Promise(r => setTimeout(r, ms)); pe('pointerup'); te('touchend'); return true;
  }, [sel, ms]);
  const findX = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 6 && r.height > 6 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const c = [...document.querySelectorAll('button,[role=button],a')].filter(b => vis(b) && (/^(close|schlie|cerrar|back|zur\u00fcck|volver|done|fertig|listo)/i.test((b.getAttribute('aria-label') || '').trim()) && !b.closest('.mc-row, [class*="mc-ph"]') /* Gap's 'Back to baseline' phase is not a back button */ || /(^|[\s-])(x|close|r2-close|sec-x|pd-x|cs-close|back)([\s-]|$)/i.test(String(b.className)) || /^[\u00d7\u2715\u2716]$/.test((b.textContent || '').trim())));
    const hitOk = b => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === b || b.contains(t)); };
    const h = c.filter(hitOk); const b = h[h.length - 1]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, what: b.id || String(b.className).slice(0, 40) || b.getAttribute('aria-label') };
  });
  const swipeDown = () => P.evaluate(async () => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 50 && r.height > 50 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .1; };
    const sh = [...document.querySelectorAll('.r2-ov.on .r2-sh, [aria-modal="true"], [role="dialog"], dialog[open], .sheet.on, #sheetwrap.open #sheet')].filter(vis).pop(); if (!sh) return null;
    const r = sh.getBoundingClientRect(); const x = r.left + r.width / 2; let y = Math.max(r.top + 14, 30); const t = document.elementFromPoint(x, y) || sh; const dy = Math.min(innerHeight * .55, 420);
    const pe = (type, yy) => t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: yy, buttons: type === 'pointerup' ? 0 : 1 }));
    let te = () => { }; try { new Touch({ identifier: 1, target: document.body, clientX: 0, clientY: 0 }); te = (type, yy) => { const tt = new Touch({ identifier: 9, target: t, clientX: x, clientY: yy, pageX: x, pageY: yy }); t.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches: type === 'touchend' ? [] : [tt], targetTouches: type === 'touchend' ? [] : [tt], changedTouches: [tt] })); }; } catch (x) { }
    pe('pointerdown', y); te('touchstart', y);
    for (let i = 1; i <= 10; i++) { await new Promise(r => setTimeout(r, 16)); pe('pointermove', y + dy * i / 10); te('touchmove', y + dy * i / 10); }
    pe('pointerup', y + dy); te('touchend', y + dy); return String(sh.id || sh.className).slice(0, 40);
  });
  const closeOnce = async m => {
    if (m === 'back') { await P.evaluate(() => history.back()); return 'back'; }
    if (m === 'escape') { await P.keyboard.press('Escape'); return 'esc'; }
    if (m === 'x') { const x = await findX(); if (!x) return null; await P.touchscreen.tap(x.x, x.y); return 'x:' + x.what; }
    if (m === 'swipe') { const s = await swipeDown(); return s ? 'swipe:' + s : null; }
  };
  const errMark = () => R.errs.length;

  /* ---------- what a player opens from Home ---------- */
  const SC = [
    { n: 'Misty bubble tap', open: () => tapSel('#spBubble') },
    { n: 'Misty hold menu', open: () => holdSel('#spBubble', 900) },
    { n: 'Gap view', open: () => tapSel('#spFast') },
    { n: 'Gap hold (fix time)', open: () => holdSel('#spFast', 900) },
    { n: 'Move bloom', open: () => tapSel('[data-orbit="move"]') },
    { n: 'Move hold (Move page)', open: () => holdSel('[data-orbit="move"]', 900) },
    { n: 'Sleep bloom', open: () => tapSel('[data-orbit="sleep"]') },
    { n: 'Scan', open: () => tapSel('[data-orbit="scan"]') },
    { n: 'Hold Scan (all bubbles)', open: () => holdSel('[data-orbit="scan"]', 900) },
    { n: 'Fuel tap (log a meal)', open: () => tapSel('[data-orbit="fuel"]') },
    { n: 'Fuel hold', open: () => holdSel('[data-orbit="fuel"]', 900) },
    { n: 'Water hold', open: () => holdSel('[data-orbit="water"]', 900) },
    { n: 'Community', open: () => tapSel('[data-orbit="settings"]') },
    { n: 'Community hold (settings / profile hub)', open: () => holdSel('[data-orbit="settings"]', 900) },
    { n: 'Cook tab', open: () => P.evaluate(() => goTab('shelf')) },
    { n: 'Move tab', open: () => P.evaluate(() => goTab('move')) },
    { n: 'Profile tab', open: () => P.evaluate(() => goTab('profile')) },
    { n: 'Today sheet', open: () => tapSel('.wh-today, #whToday, [data-orbit="today"]') },
  ];
  /* EXTRA=1 (Oct 24 12:40 run): the places Settings / More and the hubs open by their own APIs, so the parts the earlier runs
     could not reach by a Home tap get the same round trips: tour, weather, body stats, weight, Ranking, grocery hunt, world sound,
     World Map zoom, Today, Misty's details, profile overview, For You. ONLY_EXTRA=1 runs just these. */
  const api = (expr) => () => P.evaluate(e => { try { return (0, eval)(e); } catch (x) { return 'ERR ' + x.message; } }, expr);
  const EXTRA = [
    { n: 'Tour (Settings > replay tour)', open: api("LowiTutorial.start({ from: 'settings' })") },
    { n: 'Weather', open: api('LowiTopBar.openWeather()') },
    { n: 'Body stats', open: api('LowiBodyStats.open()') },
    { n: 'Weight journey', open: api('LowiWeightJourney.open()') },
    { n: 'Ranking', open: api('LowiRanking.open()') },
    { n: 'Grocery hunt', open: api('LowiGrocery.open()') },
    { n: 'World sound', open: api('LowiWorldAudio.open()') },
    { n: 'World Map (zoom out whole)', open: api('LowiWorldHome.zoomOutWhole()') },
    { n: 'Today (API)', open: api('LowiWorldHome.openToday()') },
    { n: 'Misty details', open: api('LowiWorldHome.openDetails()') },
    { n: 'Profile overview', open: api('LowiG2E.overview()') },
    { n: 'For You', open: api("LowiNavMoves.open('fy')") },
  ];
  /* DEEP=1 (Oct 24 13:40 run): the places the earlier runs had not reached, as stacks a player builds (screen inside screen),
     each left with the same method until Home: Community chat, a person card from inside the chat, Send energy from that card
     (opens the Adventure log care sheet; nothing is sent, the fake cloud keeps everything on the VM), the new For You / Studio /
     Ranking tabs, a chat opened from Studio / For You, the People directory, Shop's Supermarket / Seller Zone / Kitchen tabs,
     Settings, and the What's New mini tour. ONLY_DEEP=1 runs just these. */
  const comm = async (expr) => { await P.evaluate(() => goTab('foryou')); await sleep(2200); if (expr) { await api(expr)(); await sleep(1600); } };
  const clickIn = (sel) => P.evaluate(sel => { const b = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && !e.disabled; }); if (!b) return false; b.click(); return true; }, sel);
  const personCard = async () => { await comm('LowiRoomsUI.setTab(true)'); if (!(await clickIn('#tab-foryou [data-chat="profile"]'))) await api("(()=>{const el=document.querySelector('#tab-foryou [data-uid]');return el?LowiCommunity.openProfile(el.getAttribute('data-uid'),''):'none'})()")(); await sleep(1500); };
  const shop = async (t) => { await api("(localStorage.setItem('lowi.storePicks.tab','" + t + "'),LowiStorePicks.open('sweep'))")(); await sleep(1200); await clickIn('.stp-ov [data-stp-tab="' + t + '"]'); };
  const DEEP = [
    { n: 'Community > Chat tab', deep: 1, open: () => comm('LowiRoomsUI.setTab(true)') },
    { n: 'Community > Chat > person card', deep: 1, open: personCard },
    { n: 'Community > Chat > person card > Send energy', deep: 1, open: async () => { await personCard(); await clickIn('[data-chat="energy"]'); await sleep(1500); } },
    { n: 'Community > For You tab', deep: 1, open: () => comm("LowiRoomsUI.showView('fy')") },
    { n: 'Community > Studio tab', deep: 1, open: () => comm("LowiRoomsUI.showView('studio')") },
    { n: 'Community > Studio > chat', deep: 1, open: async () => { await comm("LowiRoomsUI.showView('studio')"); await api('LowiRoomsUI.setTab(true)')(); await sleep(1500); } },
    { n: 'Community > Ranking tab', deep: 1, open: () => comm("LowiRoomsUI.showView('rank')") },
    { n: 'Community > For You > chat', deep: 1, open: async () => { await comm("LowiRoomsUI.showView('fy')"); await api('LowiRoomsUI.setTab(true)')(); await sleep(1500); } },
    { n: 'People directory', deep: 1, open: api('LowiPeopleDir.open()') },
    { n: 'Shop > Supermarket', deep: 1, open: () => shop('shop') },
    { n: 'Shop > Seller Zone', deep: 1, open: () => shop('sz') },
    { n: 'Shop > Kitchen', deep: 1, open: () => shop('kitchen') },
    { n: 'Settings sheet', deep: 1, open: api('LowiHomeOrbitV2.openSettings()') },
    { n: "What's New", deep: 1, open: api("fetch('version.json?'+Date.now()).then(r=>r.json()).then(v=>LowiTutorial.news(LowiTutorialSteps.unseenNews(v.news,()=>false)))") },
  ];
  if (process.env.ONLY_EXTRA || process.env.ONLY_DEEP) SC.length = 0;
  if (process.env.EXTRA || process.env.ONLY_EXTRA) SC.push(...EXTRA);
  if (process.env.DEEP || process.env.ONLY_DEEP) SC.push(...DEEP);
  if (process.env.MATCH) { const re = new RegExp(process.env.MATCH, 'i'); const keep = SC.filter(s => re.test(s.n)); SC.length = 0; SC.push(...keep); }
  /* Community menu entries, found on the page */
  const commMenu = async () => {
    await P.evaluate(() => goTab('foryou')); await sleep(2500);
    const okm = await tapSel('.rm-menu-btn'); await sleep(1200);
    if (!okm) return [];
    const items = await P.evaluate(() => { const m = [...document.querySelectorAll('[role=menu], .rm-menu, .rm-pop, .rm-sheet, .r2-ov.on')].filter(e => e.getBoundingClientRect().height > 20).pop(); if (!m) return []; return [...m.querySelectorAll('button,[role=menuitem],a')].filter(b => b.getBoundingClientRect().height > 10).map(b => (b.textContent || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean); });
    return items;
  };
  const toHome = async () => {
    for (let i = 0; i < 6; i++) { const s = await st(); if (clean(s)) return true; await P.keyboard.press('Escape'); await sleep(500); if (i > 2) { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiSections.close(); } catch (e) { goTab('home'); } }); await sleep(900); } }
    return clean(await st());
  };

  await boot();
  const commItems = process.env.NOCOMM || process.env.ONLY_DEEP ? [] : await commMenu(); console.log('COMMUNITY MENU', JSON.stringify(commItems));
  await toHome();
  for (const it of commItems) {
    if (/invite|einladen|invitar|sign out|abmelden|log out|delete|l\u00f6sch/i.test(it)) continue;
    SC.push({ n: 'Community menu > ' + it, deep: 1, open: async () => { await P.evaluate(() => goTab('foryou')); await sleep(2000); await tapSel('.rm-menu-btn'); await sleep(1000); await P.evaluate(t => { const m = [...document.querySelectorAll('[role=menu], .rm-menu, .rm-pop, .rm-sheet, .r2-ov.on')].filter(e => e.getBoundingClientRect().height > 20).pop(); const b = m && [...m.querySelectorAll('button,[role=menuitem],a')].find(b => (b.textContent || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30) === t); if (b) b.click(); }, it); } });
  }

  for (const sc of SC) {
    if (only && !only.test(sc.n)) continue;
    try {
    for (const m of METHODS) {
      if (!alive()) { console.log('reboot after', sc.n); await boot(); }
      if (!(await toHome())) { note('stuck', 'could not get back to a clean Home before ' + sc.n + ' / ' + m, await st()); await boot(); }
      const e0 = errMark(); R.step = sc.n + '/' + m;
      await sc.open(); await sleep(sc.deep ? 1800 : 1400);
      await sleep(0); const s1 = await st(); if (!alive()) { note('left', sc.n + ': opening it reloaded / left the app', { url: P.url(), loads: R.loads, crashed: R.crashed }); continue; }
      if (!opened(s1)) { console.log('-', sc.n, m, 'nothing opened'); sc.none = 1; break; }
      const path = [];
      let s = s1, done = false;
      for (let k = 0; k < +(process.env.MAXSTEPS || (sc.deep ? 6 : 4)); k++) {
        const how = await closeOnce(m); if (!how) { path.push(m + ':none'); break; }
        path.push(how); await sleep(1100);
        if (!alive()) { note('left', sc.n + ': ' + m + ' left the app / crashed', { path, url: P.url(), crashed: R.crashed }); break; }
        s = await st(); if (clean(s)) { done = true; break; }
        /* this VM runs at a few frames a second under load: let the closing slide finish before judging or pressing again */
        let prev = JSON.stringify(s), same = 0; const t0 = Date.now();
        while (Date.now() - t0 < +(process.env.SETTLE || 20000)) { await sleep(1500); if (!alive()) break; s = await st(); if (clean(s)) break; const j = JSON.stringify(s); same = j === prev ? same + 1 : 0; prev = j; if (same >= +(process.env.SAME || 99)) break; }
        if (!alive()) { note('left', sc.n + ': ' + m + ' left the app / crashed (late)', { path, url: P.url(), crashed: R.crashed }); break; }
        if (clean(s)) { done = true; path.push('(slow ' + Math.round((Date.now() - t0) / 1000) + 's)'); break; }
        console.log('   step', how, JSON.stringify({ tab: s.tab, r2: s.r2, modals: s.modals, layers: s.layers, hits: s.hits, html: diffHtml(s) }).slice(0, 400));
      }
      const errs = R.errs.slice(e0);
      if (errs.length) note('error', sc.n + ' / ' + m + ': page errors', errs.slice(0, 3));
      if (alive() && !done && path.every(p => !/none$/.test(p))) note('not-home', sc.n + ' / ' + m + ': not back on a clean Home after ' + path.length + ' steps', { path, s: { tab: s.tab, r2: s.r2, modals: s.modals, layers: s.layers, hits: s.hits, html: diffHtml(s) } });
      console.log(done ? 'ok' : (path.some(p => /none$/.test(p)) ? 'n/a' : 'BAD'), sc.n, '|', m, '|', path.join(' > '));
      covered.push(sc.n + '/' + m + ':' + (done ? 'ok' : 'x'));
    }
    /* rapid round trips: open, back, open, back ... then settle */
    if (RAPID && !sc.none && alive() && (await toHome())) {
      const e0 = errMark(); R.step = sc.n + '/rapid';
      for (let i = 0; i < RAPID; i++) { await sc.open(); await sleep(350 + (i % 2) * 250); await P.evaluate(() => history.back()); await sleep(300); if (!alive()) break; }
      for (let w = 0; w < 10; w++) { await sleep(1500); if (!alive() || clean(await st())) break; }
      if (!alive()) note('left', sc.n + ': rapid open/back left the app / crashed', { url: P.url(), crashed: R.crashed });
      else { let s = await st(); if (!clean(s)) { await P.evaluate(() => history.back()); for (let w = 0; w < 10; w++) { await sleep(1500); if (!alive() || clean(await st())) break; } if (!alive()) note('left', sc.n + ': rapid open/back, one more back left the app', {}); else { s = await st(); if (!clean(s)) note('rapid', sc.n + ': after ' + RAPID + ' quick open/back round trips Home is not clean', { tab: s.tab, r2: s.r2, modals: s.modals, layers: s.layers, hits: s.hits, html: diffHtml(s) }); } } }
      const errs = R.errs.slice(e0); if (errs.length) note('error', sc.n + ' / rapid: page errors', errs.slice(0, 3));
      console.log('rapid', sc.n, 'done');
    }
    } catch (e) { note('left', sc.n + ': the page navigated away / crashed mid-step (' + (R.step || '') + ')', { msg: e.message.slice(0, 120), url: P.url(), loads: R.loads }); try { await boot(); } catch (e2) { console.log('reboot failed', e2.message.slice(0, 80)); } }
  }
  console.log('COVERED', covered.length, JSON.stringify(covered));
  console.log('FINDINGS', findings.length, JSON.stringify(findings).slice(0, 4000));
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
