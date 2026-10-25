'use strict';
/* 25 Oct 2026 (Emmanuel: "When I click on the low spike, it's not taking me to how do you cook it.")
   A Nibblo meal in Chat and in For You opens its full recipe page over Home: finger taps on the Low spike label, the photo,
   the caption and "Cook this" each open exactly one recipe view (.p2-recov) with the dish, the amounts, the shop basket
   (Aldi/Lidl, marked as estimates), the spike line and Start cooking; Start cooking opens step 1; closing goes back to the chat.
   The Community data is the fake cloud (tools/sim/mock-cloud.cjs) with tonight's Nibblo message and post seeded; nothing
   is written anywhere. node tools/nibblo-recipe/check.cjs [chromium|webkit] [WxH|device] [de|en|es] [url|root] [dark|light] */
const H = require('../sim/harness.cjs'), path = require('path'), fs = require('fs');
const N = require('../../nibblo-core.js'), K = require('../../community-chat-core.js');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || (engine === 'webkit' ? 'iPhone 13' : '390x844'), lang = process.argv[4] || 'de';
const where = process.argv[5] || path.join(__dirname, '..', '..'), theme = process.argv[6] || 'dark';
const out = '/tmp/nibblo-recipe'; fs.mkdirSync(out, { recursive: true });
const tag = engine + '-' + String(dev).replace(/\W/g, '') + '-' + lang + '-' + theme;
const DAY = '20261025', SLOT = 'e', dish = N.pick(DAY, SLOT).dish, NAMEL = dish.name[{ en: 0, de: 1, es: 2 }[lang]];
(async () => {
  const o = { engine, probe: false, lang, members: 20, messages: 40, posts: 6 };
  if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o), P = R.page, W = R.sim.W;
  const now = new Date().toISOString();
  W.messages.push({ id: N.msgId(DAY, SLOT), user_id: N.UID, who: N.NAME, body: N.chatBody(DAY, SLOT, K.mealBody), reply_to: null, created_at: now, room: 'all' });
  W.posts.unshift(Object.assign({ created_at: now, url: '', plat: '', lv: 3 }, N.postRow(DAY, SLOT)));
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  const res = []; const ok = (n, pass, info) => { res.push(!!pass); console.log((pass ? 'PASS ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 600) : '')); };
  await R.goto(); await H.sleep(6000);
  await P.evaluate(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(800);
  const build = await P.evaluate(() => fetch('version.json?x=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => 'n/a'));
  console.log('build', build, tag);
  const state = () => P.evaluate(() => {
    const ovs = [...document.querySelectorAll('.r2-ov.on:not(.off)')], rec = document.querySelector('.r2-ov.p2-recov.on:not(.off)'), act = document.querySelector('.tab.active');
    if (!rec) return { rec: false, open: ovs.length, tab: act ? act.id : '' };
    const txt = rec.textContent.replace(/\s+/g, ' '), b = rec.querySelector('[data-r2="close"]'), r = b && b.getBoundingClientRect();
    const top = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const sp = rec.querySelector('.p2-spike');
    return { rec: true, open: ovs.length, tab: act ? act.id : '', title: ((rec.querySelector('.p2-rn') || {}).textContent || '').trim(),
      amounts: [...rec.querySelectorAll('.p2-ing, .p2-chip, [data-p2="ing"]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).slice(0, 8),
      g200: /200 g/.test(txt), serves: !!rec.querySelector('.p2-serves'), servesT: (rec.querySelector('.p2-serves') || {}).textContent || '',
      shops: ['Aldi', 'Lidl'].filter(s => txt.indexOf(s) >= 0), est: /Not live prices|Keine Live-Preise|No son precios en vivo|geschätzt|estimad|Estimated/i.test(txt),
      spike: sp ? sp.textContent.replace(/\s+/g, ' ').trim() : '', cook: !!rec.querySelector('[data-p2="cook"]'), steps: rec.querySelectorAll('.p2-step, .p2-steps li').length,
      closeOnTop: !!(top && b.contains(top)), eng: /\b(tbsp|tsp|a pinch|Amounts for 1 person)\b/.test(txt) };
  });
  const close = async () => { await P.evaluate(() => { const b = document.querySelector('.r2-ov.p2-recov.on:not(.off) [data-r2="close"]'); if (b) b.click(); }); await H.sleep(900); };
  const fingerTap = async sel => {
    const box = await P.evaluate(sel => { const e = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).pop(); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hit: (() => { const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(t && (e === t || e.contains(t))); })(), top: (() => { const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t ? t.outerHTML.slice(0, 160) + ' r=' + JSON.stringify(r) : ''; })() }; }, sel);
    if (box && !box.hit) console.log('covered by', box.top);
    if (!box) return 'missing';
    await H.sleep(400);
    if (engine === 'webkit' || o.viewport) await P.touchscreen.tap(box.x, box.y).catch(() => P.mouse.click(box.x, box.y)); else await P.mouse.click(box.x, box.y);
    await P.waitForSelector('.r2-ov.p2-recov.on:not(.off)', { timeout: 8000 }).catch(() => { });
    await H.sleep(700); return box.hit ? 'tapped' : 'covered';
  };
  /* ---- Chat ---- */
  await P.evaluate(() => goTab('foryou')); await H.sleep(1200);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => { }); await H.sleep(2500);
  const msg = await P.evaluate(() => { const m = document.querySelector('[data-chat-id^="nb-"], #cmList .cm-msg .nb-photo'); const e = m && (m.closest('.cm-msg') || m); if (!e) return null; e.scrollIntoView({ block: 'center' });
    return { links: e.querySelectorAll('[data-sh="recipe"][data-r]').length, r: (e.querySelector('[data-sh="recipe"]') || {}).dataset ? e.querySelector('[data-sh="recipe"]').dataset.r : '', text: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 300),
      cook: (() => { const b = e.querySelector('.nb-cook'); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), vw: innerWidth, color: cs.color, bg: cs.backgroundColor }; })() }; });
  ok('chat: the Nibblo meal has photo, label, caption and Cook this all linked to the recipe', msg && msg.links === 4 && /^rb_/.test(msg.r), msg);
  ok('chat: the post is in the phone language (dish name)', msg && msg.text.indexOf(NAMEL) >= 0, NAMEL);
  ok('chat: Cook this is full size and on screen', msg && msg.cook && msg.cook.h >= 44 && msg.cook.right <= msg.cook.vw, msg && msg.cook);
  await R.shot(out + '/0-chat-' + tag + '.png');
  for (const [name, sel] of [['Low spike label', '#cmList .nb-bs'], ['Cook this', '#cmList .nb-cook'], ['photo', '#cmList .nb-photo'], ['caption', '#cmList .nb-cap']]) {
    const how = await fingerTap(sel); const s = await state();
    if (name === 'Low spike label') await R.shot(out + '/1-recipe-' + tag + '.png');
    ok('chat: tapping the ' + name + ' opens exactly one recipe view for ' + NAMEL + ' (' + how + ')', (how === 'tapped' || name === 'caption') && s.rec && s.open === 1 && s.title.indexOf(NAMEL) >= 0 && s.tab === 'tab-foryou', { title: s.title, open: s.open, tab: s.tab });
    if (name === 'Low spike label') {
      ok('recipe: amounts are shown (200 g shirataki) and say they are for one person', s.g200 && s.serves, { amounts: s.amounts, serves: s.servesT });
      ok('recipe: Aldi and Lidl basket, marked as estimates', s.shops.length === 2 && s.est, s.shops);
      ok('recipe: the spike line says how it rates and why', s.spike.length > 30, s.spike);
      ok('recipe: steps and Start cooking', s.cook && s.steps >= 2, { steps: s.steps });
      ok('recipe: close button reachable', s.closeOnTop);
      if (lang !== 'en') ok('recipe: no English amounts or labels left in ' + lang, !s.eng, s.amounts);
      await P.evaluate(() => { const b = document.querySelector('.r2-ov.p2-recov.on:not(.off) [data-p2="cook"]'); if (b) b.click(); }); await H.sleep(1500);
      const cm = await P.evaluate(() => { const c = document.querySelector('.r2-ov.p2-ckov.on:not(.off)'); return c ? c.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null; });
      ok('recipe: Start cooking opens the step-by-step cook mode', !!cm, cm);
      await R.shot(out + '/2-cook-' + tag + '.png');
      await P.evaluate(() => { for (let i = 0; i < 3; i++) { const b = document.querySelector('.r2-ov.on:not(.off) [data-r2="close"], .r2-ov.on:not(.off) [data-p2="closeall"]'); if (b) b.click(); } }); await H.sleep(1200);
    }
    await close();
    const after = await P.evaluate(() => ({ open: document.querySelectorAll('.r2-ov.on:not(.off)').length, chat: !!document.querySelector('#cmList .nb-photo') }));
    ok('chat: after closing, back in the chat with nothing open (' + name + ')', after.open === 0 && after.chat, after);
  }
  /* ---- For You ---- */
  await R.tap('#tab-foryou .rm-tab[data-rm="fy"]').catch(() => { }); await H.sleep(2500);
  const fy = await P.evaluate(() => { const s = [...document.querySelectorAll('#fyFeed .fy-slide')].find(x => x.querySelector('.nb-fyhit')); if (!s) return null; document.getElementById('fyFeed').scrollTop = s.offsetTop;
    return { id: s.getAttribute('data-id'), cook: !!s.querySelector('.nb-cook.nb-fy'), chip: !!s.querySelector('.fyv-rec'), bot: /Bot/.test(s.textContent) }; });
  ok('For You: the Nibblo post has a photo tap and Cook this (no small chip)', fy && fy.cook && !fy.chip, fy);
  if (fy) {
    await H.sleep(900);
    await R.shot(out + '/3-foryou-' + tag + '.png');
    for (const [name, sel] of [['Cook this', '#fyFeed .fy-slide[data-id="' + fy.id + '"] .nb-cook'], ['photo', '#fyFeed .fy-slide[data-id="' + fy.id + '"] .nb-fyhit']]) {
      const how = await fingerTap(sel); const s = await state();
      ok('For You: tapping ' + name + ' opens the recipe for ' + NAMEL + ' (' + how + ')', s.rec && s.open === 1 && s.title.indexOf(NAMEL) >= 0, { how, title: s.title, open: s.open, tab: s.tab });
      await close();
    }
  }
  /* ---- Shuffle (the Cook swipe pool) has the dish ---- */
  const inBook = await P.evaluate(r => !!(window.LowiP2 && LowiP2.rec && LowiP2.rec(r)), N.recipeFor({ id: N.msgId(DAY, SLOT), uid: N.UID }));
  ok('the dish is a Recipe Book recipe the kitchen knows (so Shuffle has it)', inBook);
  ok('no page errors', R.errs.length === 0, R.errs.slice(0, 3));
  const all = res.every(Boolean);
  console.log(all ? 'ALL PASS' : 'SOME FAILED', tag, build);
  await R.close(); process.exit(all ? 0 : 1);
})().catch(e => { console.error('ERROR', e && e.stack); process.exit(2); });
