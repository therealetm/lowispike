'use strict';
/* Oct 27 2026: the visual kitchen (Cook > Küche): fridge + cabinet + bin scene, against a local root or the live site.
   node tools/kitchen-scene/check.cjs [url|root] [lang en|de] [theme dark|light] [WxH] [outdir]
   Chromium (ENG=webkit for simulated Safari). Mock cloud from tools/sim/harness.cjs, so no real profiles or messages.
   Checks: the scene shows fridge, cabinet, bin and the list note with the food on the shelves; a shelf, the fridge and the
   cabinet zoom open in place and close again; tapping food gives the quick actions (Used up -> shopping list, move shelf,
   remove); dragging food to the bin puts it on the list; the week plan's "Put it on my shopping list" lands in the kitchen
   with the note glowing; the week buttons are there; no sideways scroll; no page errors. Prints PASS/FAIL and ALL OK / FAIL. */
const H = require('../sim/harness.cjs');
const fs = require('fs');
(async () => {
  const where = process.argv[2] || '.', lang = process.argv[3] || 'de', theme = process.argv[4] || 'dark';
  const [vw, vh] = String(process.argv[5] || '390x844').split('x').map(Number), out = process.argv[6] || '/tmp/kitchen-scene-check';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'chromium', members: 4, messages: 4, probe: false, lang, viewport: { width: vw, height: vh }, dpr: 1 };
  if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = lang + '-' + theme + '-' + vw;
  const now = Date.now();
  const seed = { v: 1, items: [
    { id: 'kt1', n: lang === 'de' ? 'Skyr' : 'Skyr', at: now, from: 'me', c: 'dairy', p: { v: 'ok' } },
    { id: 'kt2', n: lang === 'de' ? 'Eier' : 'Eggs', at: now, from: 'me', p: { v: 'ok' } },
    { id: 'kt3', n: lang === 'de' ? 'Brokkoli' : 'Broccoli', at: now, from: 'me', p: { v: 'ok' } },
    { id: 'kt4', n: lang === 'de' ? 'Haferflocken' : 'Oats', at: now, from: 'me', p: { v: 'better' } },
    { id: 'kt5', n: lang === 'de' ? 'Weißbrot' : 'White bread', at: now, from: 'me', p: { v: 'spike' } },
    { id: 'kt6', n: lang === 'de' ? 'Mandeln' : 'Almonds', at: now, from: 'me' },
    { id: 'kt7', n: lang === 'de' ? 'Hähnchenbrust' : 'Chicken breast', at: now, from: 'me', p: { v: 'ok' } }
  ] };
  await R.ctx.addInitScript(a => { try { if (!sessionStorage.getItem('ksc')) { sessionStorage.setItem('ksc', '1'); localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.theme', a.t); localStorage.setItem('lowispike.kitchen.v1', a.s); localStorage.removeItem('lowi.weekBasket.v1'); localStorage.removeItem('lowispike.weekshop.v1'); } } catch (e) { } }, { l: lang, t: theme, s: JSON.stringify(seed) });
  const res = []; const ok = (name, pass, info) => { res.push(!!pass); console.log((pass ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (info !== undefined && !pass ? ' ' + JSON.stringify(info).slice(0, 600) : '')); };
  const sleep = H.sleep;
  /* a person scrolls to what they tap; the quick actions are checked to be on screen without that */
  const tap = async sel => { await P.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {}); await sleep(250); await R.tap(sel); };
  await R.goto(); await sleep(4000);
  await P.evaluate(() => {
    const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
    strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
    try { if (window.LowiTutorial && LowiTutorial.isOn && LowiTutorial.isOn()) LowiTutorial.stop('check'); } catch (e) { }
  });
  const env = await P.evaluate(() => ({ build: (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '', theme: document.documentElement.getAttribute('data-theme'), kg: !!window.LowiKitchenGame }));
  console.log('env', JSON.stringify(env));
  ok('kitchen code loaded, theme ' + theme, env.kg && env.theme === theme, env);
  await P.evaluate(() => LowiKitchenGame.open()); await sleep(1500);
  const st = () => P.evaluate(() => {
    const r = document.getElementById('kgRoot'), q = s => document.querySelector(s), vis = el => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 4 && b.height > 4; };
    const note = q('.kg-note span');
    return { scene: vis(q('.kg-scene')), fridge: vis(q('.kg-fridge-u')), cab: vis(q('.kg-cab-u')), bin: vis(q('.kg-bin-big')), note: vis(q('.kg-note')), noteN: note ? +note.textContent : null, glow: !!q('.kg-note.kg-glow'),
      toks: document.querySelectorAll('.kg-scene .kg-tok:not(.kg-more)').length, open: (q('.kg-open') || {}).className || '', qa: !!q('.kg-qa.on'), week: (q('.kg-week') || {}).textContent || '', hint: (q('.kg-binhint') || {}).textContent || '',
      saved: JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}').items.map(i => i.id + '@' + (i.c || '')),
      list: (() => { try { return window.LOWI_SHELF && LOWI_SHELF.listOpen ? LOWI_SHELF.listOpen().map(x => x.n) : null; } catch (e) { return 'err'; } })(),
      hOver: document.documentElement.scrollWidth > innerWidth + 1 || (r ? [...r.querySelectorAll('*')].some(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.kg-toast'); }) : false),
      overBy: r ? [...r.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.kg-toast'); }).slice(0, 3).map(e => String(e.className).slice(0, 40) + ':' + Math.round(e.getBoundingClientRect().left) + '-' + Math.round(e.getBoundingClientRect().right) + ' ' + (e.textContent || '').slice(0, 20)) : [], toast: (q('.kg-toast') || {}).textContent || '',
      labels: [...document.querySelectorAll('.kg-uh b')].map(b => b.textContent), text: r ? r.innerText.slice(0, 400) : '' };
  });
  let s = await st();
  const words = lang === 'de' ? ['Kühlschrank', 'Schrank', 'Einkaufsliste', 'Müll'] : ['Fridge', 'Cabinet', 'To buy', 'Bin'];
  ok('scene: fridge, cabinet, bin and list note show', s.scene && s.fridge && s.cab && s.bin && s.note, s);
  ok('scene: food sits on the shelves (7 seeded)', s.toks === 7, s);
  ok('scene: words in ' + lang, words.every(w => s.text.toLowerCase().indexOf(w.toLowerCase()) >= 0), s.text);
  ok('scene: week button there', /Woche|week/i.test(s.week), s.week);
  ok('scene: no sideways scroll', !s.hOver, s);
  const contrast = await P.evaluate(() => { const b = document.querySelector('.kg-uh b'); if (!b) return null; const c = getComputedStyle(b).color; return c; });
  console.log('unit label colour', contrast);
  await R.shot(out + '/scene-' + tag + '.png');
  /* zoom: fridge, cabinet, a shelf */
  for (const d of ['fridge', 'cabinet']) {
    await tap('.kg-uh[data-kg-door="' + d + '"]'); await sleep(700); s = await st();
    ok('zoom: ' + d + ' opens in place', s.open.indexOf('kg-' + d) >= 0 && !s.hOver, s);
    await R.shot(out + '/open-' + d + '-' + tag + '.png');
    await tap('.kg-open [data-kg="close"]'); await sleep(600); s = await st();
    ok('zoom: ' + d + ' closes back to the scene', !s.open && s.scene, s);
  }
  const shelfId = await P.evaluate(() => { const b = document.querySelector('.kg-scene .kg-shl'); return b ? b.getAttribute('data-kg-door') : ''; });
  await tap('.kg-shl[data-kg-door="' + shelfId + '"]'); await sleep(700); s = await st();
  ok('zoom: a shelf (' + shelfId + ') opens', !!s.open && s.open.indexOf('kg-buyv') < 0, s);
  await tap('.kg-open [data-kg="close"]'); await sleep(600);
  /* quick actions: tap Skyr, Used up -> list */
  const n0 = (await st()).noteN;
  await tap('[data-kg-tok="kt1"]'); await sleep(700); s = await st();
  const qa = await P.evaluate(() => { const q = document.querySelector('.kg-qa.on'); if (!q) return null; const b = q.getBoundingClientRect(); return { txt: q.innerText, l: b.left, r: b.right, w: innerWidth, t: b.top, bo: b.bottom, vh: innerHeight, lt: (q.querySelector('.kg-lt') || {}).textContent || '', hit: (() => { const bb = q.querySelector('.kg-binbtn').getBoundingClientRect(), e = document.elementFromPoint(bb.left + bb.width / 2, bb.top + bb.height / 2); return e ? String(e.className).slice(0, 40) : null; })(), sy: scrollY }; });
  console.log('qa', JSON.stringify(qa));
  ok('quick actions: tap on food opens them inside the screen', s.qa && qa && qa.l >= 0 && qa.r <= qa.w + 1 && qa.t >= 0 && qa.bo <= qa.vh + 1, qa);
  ok('quick actions: insulin label wording', qa && (lang === 'de' ? qa.lt === 'Insulinfreundlich' : qa.lt === 'Insulin-friendly'), qa);
  ok('quick actions: Used up / move / remove', qa && (lang === 'de' ? /Ist leer/.test(qa.txt) && /Entfernen/.test(qa.txt) : /Used up/.test(qa.txt) && /Remove/.test(qa.txt)) && !!(await P.$('.kg-qa select[data-kg-move]')), qa);
  await R.shot(out + '/qa-' + tag + '.png');
  await tap('.kg-qa .kg-binbtn'); await sleep(1200); s = await st();
  ok('quick actions: Used up takes it out and onto the list', !s.saved.some(x => x.startsWith('kt1@')) && s.noteN === n0 + 1, s);
  /* move: Eggs to another shelf */
  await tap('[data-kg-tok="kt2"]'); await sleep(600);
  const target = await P.evaluate(() => { const sel = document.querySelector('.kg-qa select[data-kg-move]'); const o = [...sel.options].find(x => !x.selected); return o ? o.value : ''; });
  await P.selectOption('.kg-qa select[data-kg-move]', target); await sleep(800); s = await st();
  ok('quick actions: move to shelf ' + target, s.saved.indexOf('kt2@' + target) >= 0, s);
  /* remove: Almonds */
  await P.evaluate(() => { const x = document.querySelector('.kg-qa [data-kg="unsel"]'); if (x) x.click(); }); await sleep(300);
  await tap('[data-kg-tok="kt6"]'); await sleep(600);
  await tap('.kg-qa .kg-x'); await sleep(900); s = await st();
  ok('quick actions: remove takes it out without the list', !s.saved.some(x => x.startsWith('kt6@')) && s.noteN === n0 + 1, s);
  /* drag White bread to the bin (mouse drag) */
  await P.evaluate(() => { const sc = document.querySelector('.kg-scene'); if (sc) sc.scrollIntoView({ block: 'center' }); }); await sleep(500);
  const a = await P.locator('[data-kg-tok="kt5"]').boundingBox(), b = await P.locator('.kg-bin-big').boundingBox();
  if (a && b) {
    await P.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await P.mouse.down(); await sleep(100);
    for (let k = 1; k <= 12; k++) { await P.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * k / 12, a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * k / 12); await sleep(30); }
    await P.mouse.up(); await sleep(1300);
  }
  s = await st();
  ok('drag: food dragged to the bin lands on the list', !!a && !!b && !s.saved.some(x => x.startsWith('kt5@')) && s.noteN === n0 + 2, { s, a, b });
  ok('after actions: no sideways scroll', !s.hOver, s);
  /* the list note opens the list */
  await tap('.kg-note'); await sleep(700); s = await st();
  ok('list note opens the shopping list', s.open.indexOf('kg-buyv') >= 0, s);
  await R.shot(out + '/list-' + tag + '.png');
  await tap('.kg-open [data-kg="close"]'); await sleep(500);
  /* week plan flow: Woche planen -> setup -> week -> list -> kitchen with the note glowing */
  await tap('.kg-week'); await sleep(1500);
  await P.evaluate(() => { const unlock = () => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); }); unlock(); setInterval(unlock, 200); });
  let hasWb = await P.waitForSelector('.wb-inline, .wb-v-q, .wb-tile', { timeout: 20000 }).then(() => true).catch(() => false);
  ok('week: Woche planen opens the planner', hasWb);
  let guard = 0;
  while (hasWb && guard++ < 14 && !(await P.$('.wb-v-week'))) {
    const t = await P.$('.wb-tile[data-wb="a_store"]:not(.on), .wb-tile[data-wb="a_people"]:not(.on)');
    if (t) { await t.click().catch(() => {}); await sleep(400); continue; }
    const nx = await P.$('.wb-qnext:not([disabled])'); if (nx) { await nx.click().catch(() => {}); await sleep(500); continue; }
    await sleep(500);
  }
  ok('week: the setup reaches the week', !!(await P.$('.wb-v-week')));
  const wk = await P.$('.wb-week > .wb-cta'); if (wk) { await wk.click().catch(() => {}); await sleep(600); }
  const go = await P.$('.wb-list .wb-go .wb-cta'); if (go) { await go.click().catch(() => {}); }
  await sleep(3200); s = await st();
  ok('week: Put it on my list lands in the kitchen, note glowing', s.scene && s.glow && s.noteN > n0 + 2, s);
  await R.shot(out + '/week-to-kitchen-' + tag + '.png');
  ok('week: kitchen button now reads My week', /Meine Woche|My week/.test(s.week), s.week);
  ok('final: no sideways scroll', !s.hOver, s);
  const errs = R.errs.filter(e => !/supabase|Failed to fetch|NetworkError|Load failed|net::/i.test(e.m));
  ok('no page errors', errs.length === 0, errs.slice(0, 5));
  console.log(res.every(Boolean) ? 'ALL OK ' + tag : 'FAIL ' + tag);
  await R.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(2); });
