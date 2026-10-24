'use strict';
/* Bug hunt probe (galaxy chat, live site): tap a name in the chat, wait for the profile card to settle, then report the card's
   name and whether its buttons sit inside the screen and can be hit by a finger; close it, open the next name, repeat.
   node tools/hunt-chat-profile-probe.cjs <device> [url|root] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/tmp/hunt0702/prof-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1800);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  const names = await P.evaluate(() => [...document.querySelectorAll('#cmList [data-chat="profile"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.top > 120 && r.bottom < innerHeight - 140; }).map(e => e.dataset.name || e.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i).slice(-4));
  log('names', names);
  for (const n of names) {
    const loc = P.locator('#cmList [data-chat="profile"][data-name="' + n + '"]').last();
    if (!await loc.count()) { log(n, 'no element'); continue; }
    await R.tapEl(loc); await H.sleep(2500);
    const card = await P.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > .05; };
      const btns = [...document.querySelectorAll('button')].filter(b => vis(b) && /Talk to|sprechen|Hablar|energy|Energie|energ|Block|blockieren|Bloquear/i.test(b.textContent + ' ' + (b.getAttribute('aria-label') || '')));
      return { vh: innerHeight, vvh: visualViewport && Math.round(visualViewport.height), btns: btns.map(b => { const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, Math.min(y, innerHeight - 1)); const sh = b.closest('[class*=sheet],[id*=Sheet],[class*=card],[role=dialog]'); return { t: b.textContent.trim().slice(0, 30), y: Math.round(r.top) + '..' + Math.round(r.bottom), hit: !!(t && (t === b || b.contains(t))), by: t && !(t === b || b.contains(t)) ? (t.id || String(t.className).slice(0, 30) || t.tagName) : '', host: sh ? (sh.id || String(sh.className).slice(0, 40)) : '' }; }) };
    });
    log('card ' + n, card); await R.shot(tag + '-' + n + '.png');
    for (let i = 0; i < 2; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(500); }
    await H.sleep(1200);
  }
  log('errs', R.errs); log('crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
