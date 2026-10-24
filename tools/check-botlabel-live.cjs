'use strict';
/* Oct 24 2026 (Emmanuel: bots in the chat clearly marked, "a dash and then bot" next to the name; never a real person).
   Live check: the page has LowiBotLabel, the galaxy bots read "Name - bot" (galaxy names + message heads), real names, your own
   name and a made-up 'bot:' id do not, a message from a real person carries no mark, no page errors.
   node tools/check-botlabel-live.cjs [chromium|webkit] [WxH | device] [de|en] [url] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'webkit', dev = process.argv[3] || 'iPhone 13', lang = process.argv[4] || 'de';
const url = process.argv[5] || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const o = { engine, probe: false, url, lang };
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page; const res = [];
  await R.goto(); await H.sleep(9000);
  await P.evaluate(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(800);
  const build = await P.evaluate(() => fetch('version.json?x=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => 'n/a'));
  res.push(['build', true, build]);
  const r = await P.evaluate(() => {
    const L = window.LowiBotLabel, C = window.LowiCommunity, out = { label: !!L, community: !!C };
    if (!L || !C) return out;
    const bots = (C.bots && C.bots()) || [];
    out.bots = bots.map(b => [b.n, L.isBot(b.uid), L.name(b.n, b.uid, 1)]);
    out.humans = [['u-antje', 'Antje'], ['u-eman', 'Emmanuel'], ['u-lena', 'Lena'], ['u-mia', 'Mia Test 8263']].map(([u, n]) => L.name(n, u, 1));
    out.fake = L.isBot('bot:not-a-real-one');
    const b = bots[0];
    if (b) {
      const m = { id: 'chk-b', uid: b.uid, by: b.n, t: 'Hallo', ts: Date.now() }, h = { id: 'chk-h', uid: 'u-antje', by: 'Antje', t: 'Hi', ts: Date.now() + 1000 };
      const hb = C.messageHTML(m, [m]), hh = C.messageHTML(h, [h]);
      const d = document.createElement('div'); d.innerHTML = hb; const s = d.querySelector('.cs-botd');
      out.botMsg = s ? s.parentElement.textContent.replace(/\s+/g, ' ').trim() : null; out.humanMsgMarked = /cs-botd|- bot/.test(hh);
    }
    return out;
  });
  res.push(['LowiBotLabel on the live page', r.label && r.community, r]);
  res.push(['galaxy bots read "Name - bot"', !!(r.bots && r.bots.length && r.bots.every(x => x[1] && / - bot$/i.test(x[2]))), r.bots]);
  res.push(['real names, test accounts unmarked', !!(r.humans && r.humans.join('|') === 'Antje|Emmanuel|Lena|Mia Test 8263'), r.humans]);
  res.push(['made-up bot: id unmarked', r.fake === false]);
  res.push(['bot message head "Name - bot"', !!(r.botMsg && / - bot/i.test(r.botMsg)), r.botMsg]);
  res.push(['real person message unmarked', r.humanMsgMarked === false]);
  /* the room as drawn: open Community chat and read the galaxy names */
  await P.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await H.sleep(3500);
  const names = await P.evaluate(() => [...document.querySelectorAll('.cg-name')].map(e => e.textContent).slice(0, 12));
  res.push(['galaxy names on screen (info)', true, names]);
  res.push(['no page errors', R.errs.length === 0, R.errs.slice(0, 3)]);
  let ok = true;
  for (const [n, pass, d] of res) { if (!pass) ok = false; console.log((pass ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' ' + JSON.stringify(d).slice(0, 400) : '')); }
  console.log(ok ? 'ALL PASS' : 'SOME FAILED', engine, dev, lang);
  await R.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ERROR', e && e.message); process.exit(2); });
