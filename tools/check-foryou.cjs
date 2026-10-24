'use strict';
/* Oct 24, 2026: For You shows only insulin-friendly items (foryou-core.js, foryou.js, inspo-core.js), against a local root or the live site.
   node tools/check-foryou.cjs <w> <h> [url|root] [outdir] [lang en|de|es]
   Fake Supabase (tools/sim/mock-cloud.cjs): nothing reaches the real server, no real profile or post is made.
   Community > For You with a finger tap: no crowd "Just ate" post (Sofia, Paolo, Niklas ...), every slide passes the rule, the bot's
   daily slides (today + 4 days before) show with a photo, in the app language, inside the panel; a plain link post of your own
   stays out; a low-spike meal shared to Community lands in For You, a medium one does not and gets the short note; the bot is
   not in Chat or People; no page errors. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, where = process.argv[4] || '.', out = process.argv[5] || '/tmp/check-foryou', lang = process.argv[6] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'chromium', members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = w + 'x' + h + '-' + lang + '-' + o.engine;
  await P.setViewportSize({ width: w, height: h });
  await R.ctx.addInitScript(a => { try { localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowispike.community.tabs', ''); } catch (e) { } }, { l: lang }).catch(() => {});
  const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 700) : '')); };
  await R.goto(); await H.sleep(6000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  console.log('build', build);
  /* 1. Community > For You, with a finger tap on the tab */
  await P.evaluate(() => window.goTab('foryou'));
  await P.waitForSelector('#tab-foryou.active .rm-tabs .rm-tab', { timeout: 30000 }).catch(() => {});
  await H.sleep(800);
  await R.tap('#tab-foryou .rm-tab[data-rm="fy"]'); await H.sleep(2500);
  const read = () => P.evaluate(() => {
    const feed = document.getElementById('fyFeed'), box = document.querySelector('#tab-foryou .rm-view > .rm-fy'), bb = box && box.getBoundingClientRect();
    const sl = feed ? [...feed.querySelectorAll('.fy-slide:not(.fy-end)')] : [];
    const demo = (TRIBE._t && TRIBE._t.DEMO || []).map(p => p.id);
    const ids = sl.map(s => s.getAttribute('data-id'));
    const post = id => TRIBE.post(id);
    return {
      view: window.LowiRoomsUI && LowiRoomsUI.view(), n: sl.length, ids,
      demoShown: ids.filter(id => demo.includes(id)),
      failing: ids.filter(id => { const p = post(id); return !p || !LowiForYou.passes(p); }),
      bot: ids.filter(id => { const p = post(id); return p && p.bot; }),
      text: sl.map(s => s.innerText.replace(/\s+/g, ' ').slice(0, 120)),
      box: bb && [Math.round(bb.top), Math.round(bb.bottom), Math.round(bb.left), Math.round(bb.right)],
      s0: sl[0] && (() => { const q = sl[0].getBoundingClientRect(); return [Math.round(q.top), Math.round(q.height), Math.round(q.width)]; })(),
      hOverflow: feed ? feed.scrollWidth > feed.clientWidth + 1 : null
    };
  });
  let r = await read();
  ok('1 For You opens from the Community tab bar with posts that fill the panel', r.view === 'fy' && r.n >= 1 && r.box && r.s0 && Math.abs(r.s0[1] - (r.box[1] - r.box[0])) < 6 && !r.hOverflow, { view: r.view, n: r.n, box: r.box, s0: r.s0 });
  ok('2 no crowd "Just ate" post (Sofia, Paolo, Niklas ...) and nothing without a low-spike verdict', !r.demoShown.length && !r.failing.length && !r.text.some(t => /Garides|Saganaki|leek and rice|Lauch|Panang|Just ate|Gerade gegessen/i.test(t)), { demoShown: r.demoShown, failing: r.failing });
  const want = await P.evaluate(() => LowiInspoCore.SHOW_DAYS);
  ok('3 the bot\'s daily slides: today and the days before (' + want + ')', r.bot.length === want, { bot: r.bot });
  await R.shot(out + '/0-foryou-' + tag + '.png');
  /* 4. each bot slide: photo loaded, name + Bot tag, swap, words in the app language, nothing outside the slide, readable text */
  const LAB = { en: /Swap|Craving|Try/i, de: /Tausch|Lust|Probier/i, es: /Cambio|Antojo|Prueba/i };
  const slides = [];
  for (let i = 0; i < r.bot.length; i++) {
    const id = r.bot[i];
    await P.evaluate(id => { const s = document.querySelector('#fyFeed .fy-slide[data-id="' + id + '"]'); const f = document.getElementById('fyFeed'); f.scrollTop = s.offsetTop; }, id);
    await H.sleep(900);
    const s = await P.evaluate(id => {
      const el = document.querySelector('#fyFeed .fy-slide[data-id="' + id + '"]'), b = el.getBoundingClientRect();
      const img = el.querySelector('img.fy-bg'), bg = el.querySelector('.fy-bg');
      const outside = [...el.querySelectorAll('.fyb-meta *, .fy-rail button')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.left < b.left - 1 || q.right > b.right + 1 || q.bottom > b.bottom + 1); }).map(e => e.className || e.tagName);
      return { id, img: img ? img.complete && img.naturalWidth > 0 : !!bg, src: img && img.getAttribute('src'), name: (el.querySelector('.fyb-by b') || {}).textContent, tag: (el.querySelector('.fyb-tag') || {}).textContent, swap: !!el.querySelector('.fyb-swap .fyb-to'), text: el.innerText.replace(/\s+/g, ' '), outside, lang: document.documentElement.lang };
    }, id);
    slides.push(s);
    if (i === 0) await R.shot(out + '/1-bot-today-' + tag + '.png');
  }
  const badSl = slides.filter(s => !s.img || !s.name || !s.tag || !s.swap || s.outside.length || !LAB[lang].test(s.text) || /Misty/.test(s.text));
  ok('4 every bot slide has its photo, the bot name + tag, the swap in ' + lang + ', and fits the slide', slides.length && !badSl.length, badSl.length ? badSl.map(s => ({ id: s.id, img: s.img, src: s.src, tag: s.tag, outside: s.outside.slice(0, 3), t: s.text.slice(0, 120) })) : slides.map(s => s.tag + ' ' + String(s.src).slice(0, 40)));
  /* 5. a plain link post of your own (no recipe, no meal) stays out of For You */
  await P.evaluate(() => { TRIBE.addPost({ id: 'chk-link', ts: Date.now(), plat: 'web', url: 'https://example.com/x', meta: null, cap: 'plain link', rec: '', vis: 'tribe', mine: true }); TRIBE.renderForYou(document.getElementById('cmFeed')); });
  await H.sleep(900);
  r = await read();
  ok('5 a plain link post without a Recipe Book recipe does not reach For You', !r.ids.includes('chk-link'), { n: r.n });
  /* 6. Share to Community: low spike lands in For You too, medium stays in Community with the short note */
  const share = await P.evaluate(() => {
    const src = n => 'https://abcdefghijkl.supabase.co/storage/v1/object/public/media/user0001/meal-' + n + '.jpg';
    const lo = LowiForYou.fromCommunityShare({ row: { text: LowiChatCore.mealBody(src('chk1'), 'Greek salad with feta', 'low', 'lunch') }, id: 'chk1', name: 'Greek salad with feta', lvl: 'low', caption: 'lunch' });
    const mid = LowiForYou.fromCommunityShare({ row: { text: LowiChatCore.mealBody(src('chk2'), 'Rice bowl', 'mid', '') }, id: 'chk2', name: 'Rice bowl', lvl: 'mid', caption: '' });
    TRIBE.renderForYou(document.getElementById('cmFeed'));
    return { lo: { ok: lo.ok, text: lo.text }, mid: { ok: mid.ok, text: mid.text } };
  });
  await H.sleep(900);
  r = await read();
  const NOTE_ONLY = { en: /stays in Community/, de: /bleibt diese in der Community/, es: /se queda en la Comunidad/ };
  ok('6 a low-spike meal shared to Community shows in For You; a medium one stays out with the short note', share.lo.ok && r.ids.includes('schk1') && !share.mid.ok && !r.ids.includes('schk2') && NOTE_ONLY[lang].test(share.mid.text), Object.assign({ inFeed: r.ids.filter(i => /^schk/.test(i)) }, share));
  /* 7. the bot is not in Chat or People */
  await R.tap('#tab-foryou .rm-tab[data-rm="chat"]'); await H.sleep(2500);
  const chat = await P.evaluate(a => { const t = document.getElementById('tab-foryou').innerText; return { insMsg: document.querySelectorAll('.ins-msg').length, name: t.includes(a) }; }, await P.evaluate(() => LowiInspoCore.NAME));
  ok('7 the bot is not in Chat or People', !chat.insMsg && !chat.name, chat);
  const errs = R.errs.map(e => e.m).filter(m => !/supabase|realtime|websocket/i.test(m));
  ok('8 no page errors', !errs.length, errs.slice(0, 5));
  const pass = res.filter(x => x.pass).length;
  console.log('RESULT ' + pass + '/' + res.length + ' ' + tag + ' build ' + build);
  fs.writeFileSync(out + '/result-' + tag + '.json', JSON.stringify({ build, res }, null, 1));
  await R.close().catch(() => {});
  process.exit(pass === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
