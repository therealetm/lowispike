'use strict';
/* Back and close sweep, 15:40 Oct 24 2026: the places that went live since the 14:40 run, left with back (edge swipe /
   history.back), Escape, the visible X and a swipe down, then back to Home:
   CYCLE  hold Misty > "Your cycle" row > My cycle (cycle-world.js on top of misty-hub.js): one back should close My cycle and
          leave her card, the next one Home.
   FIX    food photo result (stand-in answer, the real endpoint is never called) > fix a food, typing, suggestion list open
          (meal-result.js Kitchen autocomplete): back / Escape / X must not leave a floating list or a stuck sheet.
   ADD    food photo result > "+ Add food" open (empty Kitchen list showing) > the same.
   node tools/backclose-new-probe.cjs [chromium|webkit] [WxH | device] [url] [only cycle|fix|add]  METHODS=back,escape,x,swipe */
const H = require('./sim/harness.cjs');
const path = require('path');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844';
const url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const only = process.argv[5] || '';
const METHODS = (process.env.METHODS || 'back,escape,x,swipe').split(',');
const sleep = H.sleep;
const FIX = path.join(__dirname, 'regress', 'fixtures', 'photo0.jpg');
const FAKE = 'https://therealetm.github.io/__food_photo_fixture';
const DISHES = [
  { name: 'Pasta', portion: '~250 g', grams: 250, kcal: 390, protein: 14, carbs: 78, sugar: 3, fiber: 4, fat: 2 },
  { name: 'Tomato sauce', portion: '~80 g', grams: 80, kcal: 40, protein: 1, carbs: 7, sugar: 5, fiber: 1, fat: 1 }
];
(async () => {
  const o = { engine, probe: false, url, lang: 'en', members: 6, messages: 10 };
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w || 390, height: h || 844 }; }
  const R = await H.open(o); const P = R.page;
  await R.ctx.route(FAKE + '**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().method() === 'POST' ? { dishes: DISHES, confidence: 'high', left: 2, limit: 3, model: 'fixture' } : { ok: true, configured: true, left: 3, limit: 3 }) }));
  const finds = []; const find = (k, m) => { finds.push({ k, m }); console.log('FINDING', k, '|', typeof m === 'string' ? m : JSON.stringify(m).slice(0, 600)); };
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05 && r.bottom > 0 && r.top < innerHeight; };
    const tab = (document.querySelector('#main > .tab.active') || document.querySelector('.tab.active') || {}).id || '';
    const modals = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"],dialog[open]')].filter(vis).map(e => e.id || String(e.className).split(' ')[0] || e.tagName);
    const hubs = [...document.querySelectorAll('#mistyHub')].filter(e => !(e.closest('.r2-ov.off')) && vis(e)).length;
    const mr = [...document.querySelectorAll('.mr-verdict')].filter(vis).length;
    const sug = [...document.querySelectorAll('.mr-sug')].filter(e => !e.hidden && vis(e)).length;
    const layers = [...document.body.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); if (s.position !== 'fixed' || !vis(e)) return false; const r = e.getBoundingClientRect(); return r.width * r.height > innerWidth * innerHeight * .3 && s.pointerEvents !== 'none'; }).map(e => e.id || String(e.className).split(' ')[0] || e.tagName);
    const b = document.getElementById('spBubble'); let misty = 'gone'; if (b && vis(b)) { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); misty = t && (t === b || b.contains(t)) ? 'ok' : (t ? (t.id || String(t.className).split(' ')[0]) : 'none'); }
    return { tab, modals, hubs, cycle: !!(window.LowiCycleWorld && LowiCycleWorld.isOpen()), mr, sug, layers, misty, url: location.href };
  });
  const home = s => s.tab === 'tab-home' && !s.modals.length && !s.hubs && !s.cycle && !s.mr && !s.sug && s.misty === 'ok';
  const alive = async () => { try { return /lowispike/.test(await P.evaluate(() => location.href)); } catch (e) { return false; } };
  const settle = async (pred, ms) => { const t0 = Date.now(); let s; while (Date.now() - t0 < (ms || 6000)) { await sleep(500); if (!(await alive())) return { dead: true }; s = await st(); if (pred(s)) return s; } return s; };
  const findX = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 6 && r.height > 6 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const c = [...document.querySelectorAll('button,[role=button],a')].filter(b => vis(b) && (/^(close|schlie|cerrar|back|zur\u00fcck|volver|cancel|abbrechen)/i.test((b.getAttribute('aria-label') || b.textContent || '').trim()) || /(^|[\s-])(x|close|r2-close|sec-x)($|[\s-])/.test(String(b.className)) || b.id === 'whX'));
    const ok = b => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === b || b.contains(t)); };
    const h = c.filter(ok); const b = h[h.length - 1]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, what: b.id || String(b.className).slice(0, 40) || (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30) };
  });
  const swipe = () => P.evaluate(async () => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 50 && r.height > 50 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .1; };
    const sh = [...document.querySelectorAll('.r2-ov.on .r2-sh, [aria-modal="true"], [role="dialog"], dialog[open]')].filter(vis).pop(); if (!sh) return null;
    const r = sh.getBoundingClientRect(); const x = r.left + r.width / 2; const y = Math.max(r.top + 14, 30); const t = document.elementFromPoint(x, y) || sh; const dy = Math.min(innerHeight * .55, 420);
    const pe = (type, yy) => t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: yy, buttons: type === 'pointerup' ? 0 : 1 }));
    pe('pointerdown', y); for (let i = 1; i <= 10; i++) { await new Promise(r => setTimeout(r, 16)); pe('pointermove', y + dy * i / 10); } pe('pointerup', y + dy); return String(sh.id || sh.className).slice(0, 40);
  });
  const press = async m => {
    if (m === 'back') { await P.evaluate(() => history.back()); return 'back'; }
    if (m === 'escape') { await P.keyboard.press('Escape'); return 'esc'; }
    if (m === 'x') { const x = await findX(); if (!x) return null; if (engine === 'webkit') await P.mouse.click(x.x, x.y); else await P.touchscreen.tap(x.x, x.y); return 'x:' + x.what; }
    if (m === 'swipe') { const s = await swipe(); return s ? 'swipe:' + s : null; }
  };
  const toHome = async () => { for (let i = 0; i < 6; i++) { const s = await st(); if (home(s)) return true; await P.evaluate(() => { try { LowiCycleWorld.close(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await sleep(1200); } return home(await st()); };
  const boot = async () => {
    await R.goto(); await sleep(9000);
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
    await P.evaluate(() => { const s = LowiR2.S(); s.user.gender = 'f'; delete s.health.cyc; LowiCycle.setShow(true); const d = new Date(); d.setDate(d.getDate() - 7); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); LowiCycle.markStart(k); });
    await P.evaluate(() => { try { window.LOWI_SHELF.addIngredients([{ n: 'Sriracha Sauce', q: '1 Flasche' }], 'Check'); } catch (e) { } try { localStorage.setItem('lowispike.kitchen.v1', JSON.stringify({ v: 1, items: [{ id: 'k1', n: 'Pesto', at: Date.now() - 1000, from: 'me' }, { id: 'k2', n: 'K\u00e4se', at: Date.now() - 2000, from: 'me' }] })); } catch (e) { } });
    await sleep(2500); await toHome();
    console.log('BOOT', JSON.stringify(await st()), 'build', await P.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content));
  };
  const tapIn = async sel => { const b = await P.evaluate(sel => { const e = [...document.querySelectorAll(sel)].filter(x => x.getBoundingClientRect().width > 2).pop(); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); if (!b) return false; await sleep(300); if (engine === 'webkit') await P.evaluate(sel => [...document.querySelectorAll(sel)].pop().click(), sel); else await P.touchscreen.tap(b.x, b.y); return true; };
  /* ---- openers ---- */
  const openCycle = async () => { await P.evaluate(() => LowiMistyHub.open()); await sleep(1600); const ok = await tapIn('#mistyHub .cyh-hub-b'); if (!ok) return 'no row'; await sleep(1800); const s = await st(); return s.cycle ? 'ok' : 'cycle not open ' + JSON.stringify(s); };
  const openResult = async () => {
    await P.evaluate(u => { window.LOWI_FOOD_AI_URL = u; let i = document.getElementById('__bcIn'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.className = 'sp-file-in'; i.id = '__bcIn'; i.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px'; document.body.append(i); } }, FAKE);
    await P.setInputFiles('#__bcIn', FIX);
    try { await P.waitForSelector('.mr-verdict', { timeout: 40000 }); } catch (e) { return 'no result'; } await sleep(1500); return 'ok';
  };
  const openFix = async () => { const r = await openResult(); if (r !== 'ok') return r; await tapIn('[data-mr-edit="f1"]'); await sleep(500); await P.evaluate(() => { const i = document.querySelector('[data-mr="f1"] [data-mr-name]'); if (i) { i.focus(); i.select(); } }); await P.keyboard.type('pes', { delay: 60 }); await sleep(800); const s = await st(); return s.sug ? 'ok' : 'no list ' + JSON.stringify(s); };
  const openAdd = async () => { const r = await openResult(); if (r !== 'ok') return r; await tapIn('[data-mr-add-food]'); await sleep(900); const s = await st(); return s.sug ? 'ok' : 'add open, list ' + s.sug; };
  const openDoor = k => async () => { await P.evaluate(() => LowiMistyHub.open()); await sleep(1600); const ok = await tapIn('#mistyHub [data-mh="' + k + '"]'); if (!ok) return 'no door'; await sleep(1800); const s = await st(); return s.modals.length > 1 || s.hubs === 0 ? 'ok' : 'door? ' + JSON.stringify(s.modals); };
  const SC = [
    { n: 'cycle', open: openCycle, first: s => !s.cycle && s.hubs > 0, firstWhy: 'My cycle closes, her card stays' },
    { n: 'forms', open: openDoor('forms'), first: s => s.hubs > 0 && s.modals.length === 1, firstWhy: 'Forms closes, her card stays' },
    { n: 'glow', open: openDoor('glow'), first: s => s.hubs > 0 && s.modals.length === 1, firstWhy: 'Glow closes, her card stays' },
    { n: 'fix', open: openFix },
    { n: 'add', open: openAdd },
  ].filter(s => !only || s.n === only);
  await boot();
  for (const sc of SC) for (const m of METHODS) {
    if (!(await alive())) { find('crash', 'page gone before ' + sc.n + ' ' + m); await boot(); }
    const e0 = R.errs.length;
    const how = await sc.open(); const s0 = await st();
    if (how !== 'ok') { console.log('OPEN', sc.n, how); }
    const steps = [];
    for (let k = 0; k < 5; k++) {
      const p = await press(m); if (!p) { steps.push('no ' + m); break; }
      const s = await settle(x => home(x) || (k === 0 && sc.first && sc.first(x)), 5000);
      steps.push(p + ' -> ' + (s.dead ? 'LEFT THE APP' : (home(s) ? 'HOME' : JSON.stringify({ t: s.tab, mo: s.modals, h: s.hubs, c: s.cycle, mr: s.mr, sug: s.sug, ly: s.layers, mi: s.misty }))));
      if (s.dead) { find('left', sc.n + ' ' + m + ': ' + steps.join(' | ')); await boot(); break; }
      if (k === 0 && sc.first && !sc.first(s) && !home(s)) find('first-step', sc.n + ' ' + m + ' (' + sc.firstWhy + '): ' + steps.join(' | '));
      if (k === 0 && sc.first && home(s)) find('first-step', sc.n + ' ' + m + ' went straight Home (expected: ' + sc.firstWhy + ')');
      if (home(s)) break;
    }
    const last = await st();
    const ok = home(last);
    console.log(ok ? 'OK  ' : 'BAD ', sc.n, m, '|', 'open:' + how, '|', steps.join(' | '));
    if (!ok && !/^no (x|swipe)/.test(steps[steps.length - 1] || '')) find('not-home', sc.n + ' ' + m + ': ' + steps.join(' | '));
    if (R.errs.length > e0) find('errors', sc.n + ' ' + m + ': ' + JSON.stringify(R.errs.slice(e0).map(e => e.m)).slice(0, 500));
    await toHome(); await sleep(800);
  }
  /* rapid: open + back x4 */
  for (const sc of SC) {
    const e0 = R.errs.length; let bad = 0;
    for (let i = 0; i < 4; i++) { await sc.open(); for (let k = 0; k < 4; k++) { const s = await settle(home, k ? 3500 : 400); if (s.dead || home(s)) break; await P.evaluate(() => history.back()); await sleep(600); } if (!(await alive())) { find('left', 'rapid ' + sc.n); await boot(); bad++; continue; } const s = await settle(home, 4000); if (!home(s)) { bad++; find('rapid', sc.n + ' round ' + i + ' ' + JSON.stringify(s)); await toHome(); } }
    console.log('RAPID', sc.n, bad ? 'BAD ' + bad : 'ok', R.errs.length > e0 ? 'errs ' + JSON.stringify(R.errs.slice(e0).map(e => e.m)).slice(0, 300) : '');
  }
  console.log('DONE findings', finds.length, 'crashed', R.crashed);
  await R.close(); process.exit(0);
})().catch(e => { console.log('FATAL', e.stack); process.exit(1); });
