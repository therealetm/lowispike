'use strict';
// Fresh user end-to-end: signed in (fixture token) -> setup birthday -> reveal (rename) -> Home -> Forms -> reload.
// node flow.cjs ROOT VIEW BDAY BTIME NAME
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const ROOT = process.argv[2], VIEW = process.argv[3] || 'iphone13', BDAY = process.argv[4] || '1997-10-12', BTIME = process.argv[5] || '', NAME = process.argv[6] || 'Lumi';
const SHOT = process.env.SHOT || '';
(async () => {
  const url = process.env.URL; const srv = { close() {} };
  const STUB = eval(require('fs').readFileSync('/home/sprite/NEWUSER/drv.cjs', 'utf8').match(/const STUB = (`[^`]*`)/)[1]);
  const h = await L.open({ url, view: VIEW, noFixture: true, settle: 4000, preInit: STUB });
  global.h = h; let p = h.page; const steps = [];
  const b = require('fs').readFileSync('/home/sprite/NEWUSER/snapfn.js', 'utf8'); await new Function('page','ctx','h','L','return (async()=>{' + b + '})()')(p, h.ctx, h, L);
  const vis = sel => h.page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);
  for (const t of ['text=Say hi', 'text=Got it', 'text=Next']) { await C(t); await L.sleep(1200); steps.push(t); }
  await h.page.fill('#hsYou', 'Tester'); await C('text=Nice to meet you'); await L.sleep(1200); await C('button.r2-btn.pri'); await L.sleep(1500);
  await h.page.evaluate(() => { localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-0000000000cc', email: 'flow@example.invalid' } })); localStorage.setItem('lowi.gate', 'done'); sessionStorage.setItem('lowi.a2hs.x', '1'); });
  const p2 = await h.ctx.newPage(); h.page.close().catch(() => {}); h.page = p2; p = p2; await p2.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 }); await L.sleep(12000);
  for (let k = 0; k < 10 && !(await vis('#r2obB')); k++) await L.sleep(700);
  if (!(await vis('#r2obB'))) { console.log(JSON.stringify({ stuck: true, steps, body: (await p.evaluate(() => document.body.innerText)).slice(0, 600) })); process.exit(2); }
  await p.evaluate(([b, t]) => { const n = document.getElementById('r2obName'); if (n && !n.value) { n.value = 'Tester'; n.dispatchEvent(new Event('input', { bubbles: true })); } const i = document.getElementById('r2obB'); i.value = b; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); if (t) { const tt = document.getElementById('r2obT'); tt.value = t; tt.dispatchEvent(new Event('input', { bubbles: true })); tt.dispatchEvent(new Event('change', { bubbles: true })); } }, [BDAY, BTIME]);
  const dayCardOverSetup = await p.evaluate(() => { const o = document.getElementById('drDay'); const n = document.querySelector('[data-r2o="next"]'); if (!n) return 'no-next'; const r = n.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return (o ? 'dayOpen,' : 'noDay,') + (hit && (hit === n || n.contains(hit)) ? 'nextHit' : 'BLOCKED:' + (hit && (hit.id || hit.className))); }); steps.push('dayCardOverSetup:' + dayCardOverSetup); await L.sleep(800);
  await p.click('[data-r2o="next"]'); await L.sleep(1500);
  // the reveal: wait for its name field, rename, read what it shows
  for (let k = 0; k < 30 && !(await vis('.lc-name')); k++) await L.sleep(500);
  await L.sleep(4000);
  const shown = await p.evaluate(() => { const s = [...document.querySelectorAll('.lc-svg .lc-shape')].map(e => e.getAttribute('d')); const svg = document.querySelector('.lc-svg[data-lc-sign]'); return { shapes: s, sign: svg && svg.dataset.lcSign, nameField: !!document.querySelector('.lc-name') }; });
  if (SHOT) await p.screenshot({ path: SHOT + '-reveal.png' });
  for (let k = 0; k < 2; k++) { await p.evaluate(() => { const b = document.querySelector('[data-lc="shuffle"]'); b && b.click(); }); await L.sleep(900); }
  shown.picked = await p.evaluate(() => (document.querySelector('.lc-name') || {}).textContent || null);
  shown.shapeAfterShuffle = await p.evaluate(() => { const s = [...document.querySelectorAll('.lc-svg .lc-shape')].map(e => e.getAttribute('d')); return s[s.length - 1] || null; });
  if (process.env.RELOAD4) { // BH-011: the app reloads while the reveal is showing, before Continue is tapped
    steps.push('pre4:has=' + (await p.evaluate(() => !!(window.LowiBirthCompanion && LowiBirthCompanion.has()))));
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 }); await L.sleep(12000);
    for (let k = 0; k < 12 && !(await vis('#r2ob')); k++) await L.sleep(600);
    for (let k = 0; k < 12 && (await vis('#r2ob')) && !(await vis('.lc-name')) && !(await vis('[data-r2o]')); k++) await L.sleep(600);
    await L.sleep(2500);
    steps.push('reload4:setup=' + (await vis('#r2ob')) + ',reveal=' + (await vis('.lc-name')) + ',revealName=' + (await p.evaluate(() => (document.querySelector('.lc-name') || {}).textContent || '')) + ',has=' + (await p.evaluate(() => !!(window.LowiBirthCompanion && LowiBirthCompanion.has()))) + ',step=' + (await p.evaluate(() => [...document.querySelectorAll('#r2ob .r2-dots i')].findIndex(i => i.classList.contains('on')))));
    if (await vis('#r2obB')) { // fixed build: back on the birthday step (filled in), Next replays the reveal
      steps.push('reload4:bdayKept=' + (await p.evaluate(() => document.getElementById('r2obB').value)));
      await p.click('[data-r2o="next"]'); for (let k = 0; k < 30 && !(await vis('.lc-name')); k++) await L.sleep(500); await L.sleep(2500);
      steps.push('reload4:revealAgain=' + (await vis('.lc-name')) + ',name=' + (await p.evaluate(() => (document.querySelector('.lc-name') || {}).textContent || '')));
      shown.shapes = await p.evaluate(() => [...document.querySelectorAll('.lc-svg .lc-shape')].map(e => e.getAttribute('d')));
    }
    shown.picked = await p.evaluate(() => (document.querySelector('.lc-name') || {}).textContent || null) || shown.picked;
  }
  await p.evaluate(() => { const b = document.querySelector('.lc-cta'); b && b.click(); }); await L.sleep(2000);
  if (process.env.RELOAD2) { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 }); await L.sleep(12000); steps.push('reload2:setupVisible=' + (await vis('#r2ob')) + ',day=' + (await vis('#drDay'))); }
  await C('text=Use my initial'); await L.sleep(1000); await C('text=None of these'); await L.sleep(400);
  // finish setup: press Next / Skip / Done until the setup sheet is gone
  for (let k = 0; k < 12 && (await vis('#r2ob')); k++) {
    const c = await p.evaluate(() => { const b = document.querySelector('[data-r2o="shoplater"]') || document.querySelector('[data-r2o="skip"]') || document.querySelector('[data-r2o="next"]') || document.querySelector('[data-r2o="done"]') || document.querySelector('[data-r2o="finish"]'); if (b) { b.click(); return b.dataset.r2o; } return null; });
    steps.push('ob:' + c); if (!c) break; await L.sleep(1500);
  }
  await L.sleep(4000);
  if (process.env.RELOAD3) { // BH-010: starter questions open after setup, then the app reloads before an answer
    for (let k = 0; k < 10 && !(await vis('.hs-ivov #hsIv')); k++) await L.sleep(600);
    steps.push('iv:open=' + (await vis('.hs-ivov #hsIv')) + ',pend=' + (await p.evaluate(() => localStorage.getItem('lowispike.hs-pending.v1') !== null)));
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 }); await L.sleep(12000);
    for (let k = 0; k < 10 && !(await vis('.hs-ivov #hsIv')); k++) await L.sleep(600);
    steps.push('reload3:ivVisible=' + (await vis('.hs-ivov #hsIv')) + ',ivCount=' + (await p.evaluate(() => document.querySelectorAll('.hs-ivov:not(.off)').length)) + ',starter=' + (await p.evaluate(() => { try { return !!(window.LowiR2.S().starter); } catch (e) { return 'err'; } })));
    const later = await p.evaluate(() => { const b = document.querySelector('[data-hsi="later"]'); if (b) { b.click(); return true; } return false; }); await L.sleep(1500);
    steps.push('later:' + later + ',pendAfter=' + (await p.evaluate(() => localStorage.getItem('lowispike.hs-pending.v1') !== null)) + ',ivAfter=' + (await vis('.hs-ivov #hsIv')));
  }
  const read = () => h.page.evaluate(() => { const B = window.LowiBirthCompanion, svg = document.querySelector('#spBubble svg.tmg-plant'); const sh = svg && svg.querySelector('.cw-own-body .lc-shape'); const nm = (window.LowiHerbIdentity && LowiHerbIdentity.name && LowiHerbIdentity.name()) || null; return { has: B && B.has(), rec: B && B.get() && B.get().name, homeOwn: !!(svg && svg.classList.contains('cw-own-cell')), homeShape: sh && sh.getAttribute('d'), homeName: nm, setupOpen: !!document.querySelector('#r2ob') && document.querySelector('#r2ob').getBoundingClientRect().width > 0 }; });
  const home = await read();
  if (SHOT) await p.screenshot({ path: SHOT + '-home.png' });
  await p.evaluate(() => window.LowiCompanion && LowiCompanion.open()); await L.sleep(1200);
  const forms = await p.evaluate(() => { const a = [...document.querySelectorAll('.cf-panel svg.tmg-plant')]; return { n: a.length, own: a.filter(s => s.classList.contains('cw-own-cell')).length, shape0: (document.querySelector('.cf-panel .cw-own-body .lc-shape') || { getAttribute: () => null }).getAttribute('d') }; });
  if (SHOT) await p.screenshot({ path: SHOT + '-forms.png' });
  await h.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 }); await L.sleep(12000);
  const reloaded = await read();
  const revealShape = shown.shapes[shown.shapes.length - 1] || null;
  console.log(JSON.stringify({ VIEW, BDAY, BTIME, steps, revealSign: shown.sign, picked: shown.picked, shuffleKeepsLook: shown.shapeAfterShuffle === revealShape, nameKept: { home: home.homeName === shown.picked, rec: home.rec === shown.picked, reload: reloaded.homeName === shown.picked }, revealShape: revealShape && revealShape.slice(0, 40), home: Object.assign({}, home, { homeShape: home.homeShape && home.homeShape.slice(0, 40) }), sameAsReveal: { home: home.homeShape === revealShape, forms: forms.shape0 === revealShape, reload: reloaded.homeShape === revealShape }, forms: { n: forms.n, own: forms.own }, reloaded: Object.assign({}, reloaded, { homeShape: undefined }), errs: h.log.pageerror.slice(0, 5) }));
  await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
