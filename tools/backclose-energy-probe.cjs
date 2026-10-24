'use strict';
/* Back and close sweep 13:40 (Oct 24 2026): what Send energy on a person card opens (Community > Chat > a member's card), and
   whether back / X / Escape close it and return to the chat, then Community, then Home. Fake cloud: nothing is sent.
   node tools/backclose-energy-probe.cjs [chromium|webkit] [WxH|device] [url|root] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844';
const target = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const sleep = H.sleep;
const LOOK = () => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; };
  const ov = [...document.querySelectorAll('.r2-ov')].filter(vis).map(e => String(e.className).slice(0, 60) + (e.querySelector('.r2-close,[aria-label^=Close],[aria-label^=close]') ? ' [X]' : ' [noX]'));
  const tab = (document.querySelector('#main > .tab.active') || {}).id || '';
  return { tab, ov, room: document.documentElement.classList.contains('rm-room-open'), cm: document.documentElement.classList.contains('cm-open'), rv: (window.LowiRoomsUI && LowiRoomsUI.tab()) || '' };
};
(async () => {
  const o = { engine, members: 12, messages: 30, probe: false, lang: 'en' };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page;
  await R.goto(); await sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.evaluate(() => goTab('foryou')); await sleep(2500);
  await P.evaluate(() => LowiRoomsUI.setTab(true)); await sleep(2000);
  const who = await P.evaluate(() => [...document.querySelectorAll('#tab-foryou [data-chat="profile"]')].slice(0, 30).map(b => [b.dataset.uid, b.dataset.name]));
  console.log('profile buttons', who.length, JSON.stringify(who.slice(0, 8)));
  const bots = await P.evaluate(() => { try { return LowiCommunity.bots().map(b => b.id || b.uid).slice(0, 20); } catch (e) { return 'ERR ' + e.message; } });
  console.log('bots', JSON.stringify(bots).slice(0, 300));
  const pick = who.find(w => !String(w[0]).startsWith('bot')) || who[0];
  if (!pick) { console.log('no profile button in chat'); await R.close(); return; }
  await P.evaluate(([u, n]) => LowiCommunity.openProfile(u, n), pick); await sleep(1800);
  const card = await P.evaluate(() => { const b = document.querySelector('.r2-ov.on [data-chat="energy"]'); return b ? { disabled: b.disabled, uid: b.dataset.uid, name: b.dataset.name, mb: !!(window.LowiMicroBook && LowiMicroBook.openCare) } : null; });
  console.log('card', JSON.stringify(pick), JSON.stringify(card), JSON.stringify(await P.evaluate(LOOK)));
  const e0 = R.errs.length;
  await P.evaluate(() => { const b = document.querySelector('.r2-ov.on [data-chat="energy"]'); if (b) b.click(); }); await sleep(2500);
  console.log('after Send energy', JSON.stringify(await P.evaluate(LOOK)));
  if (process.env.MODE === 'x') {
    for (let i = 1; i <= 4; i++) {
      const x = await P.evaluate((sel) => { const c = [...document.querySelectorAll(sel)].filter(b => { const r = b.getBoundingClientRect(); return r.width > 4; }); const b = c[0]; if (!b) return null; const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left + r.width / 2, y: r.top + r.height / 2, what: b.id || String(b.className), label: b.getAttribute('aria-label'), hit: t ? (t === b || b.contains(t) ? 'ok' : (t.id || String(t.className).slice(0, 40))) : 'none' }; }, process.env.XSEL || '.r2-ov.on .r2-close, .r2-ov.on [aria-label^=Close], #secX, .sec-x');
      console.log('x', i, JSON.stringify(x)); if (!x) break; await P.touchscreen.tap(x.x, x.y); await sleep(2500);
      const l = await P.evaluate(LOOK); console.log('  ->', JSON.stringify(l)); if (l.tab === 'tab-home' && !l.ov.length) break;
    }
  } else
  for (let i = 1; i <= 4; i++) { await P.evaluate(() => history.back()); await sleep(2500); const l = await P.evaluate(LOOK).catch(e => ({ dead: e.message.slice(0, 60) })); console.log('back', i, JSON.stringify(l), P.url().slice(0, 60)); if (l.tab === 'tab-home' && !l.ov.length) break; }
  console.log('errors', JSON.stringify(R.errs.slice(e0).map(e => e.m)).slice(0, 600));
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
