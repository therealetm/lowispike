'use strict';
/* Bug hunt probe (Community > person card > Send energy): opens a member's person card, taps Send energy and reports what
   the care sheet looks like (stylesheet loaded, cell size + fill, open overlays, kind buttons, language) plus screenshots.
   Runs against the fake Supabase from tools/sim (nothing is sent to real people).
   node tools/hunt-send-energy.cjs <device> [url|root] [lang] [ui] [outPrefix] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'de', ui = process.argv[5] || 'dark', out = process.argv[6] || '/tmp/hunt/se';
  const o = { device, engine: process.env.ENG || 'chromium', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.goto(); await H.sleep(5000);
  if (ui === 'light') await P.evaluate(() => { try { document.documentElement.setAttribute('data-ui', 'light'); } catch (e) { } });
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => { }); await H.sleep(1500);
  const cand = await P.evaluate(() => [...document.querySelectorAll('#cmList button[data-chat="profile"]')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 4 && r.top > 120 && r.bottom < innerHeight - 140; }).map(b => ({ uid: b.dataset.uid, name: b.dataset.name })));
  console.log('avatars', JSON.stringify(cand.slice(0, 8)));
  let opened = false;
  for (const c of cand) {
    const b = P.locator('#cmList button[data-chat="profile"][data-uid="' + c.uid + '"]').first();
    if (!(await b.count())) continue;
    const hit = await b.evaluate(e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t ? (t.id + '|' + String(t.className).slice(0, 60) + '|' + (t.closest('[data-chat]') || {}).outerHTML).slice(0, 200) : null; });
    console.log('hit', hit);
    await R.tapEl(b).catch(() => { }); await H.sleep(600);
    if (!(await P.locator('.cp-card').count())) { console.log('tap did not open, clicking'); await b.evaluate(e => e.click()); } await H.sleep(1500);
    const st = await P.evaluate(() => { const e = document.querySelector('.cp-card [data-chat="energy"]'); return { has: !!e, dis: e ? e.disabled : null, title: e ? e.title : null, mb: !!(window.LowiMicroBook && window.LowiMicroBook.openCare), ovs: [...document.querySelectorAll('.r2-ov')].map(o => String(o.className).slice(0, 50)), cards: document.querySelectorAll('.cp-card').length }; });
    console.log('card', c.name, JSON.stringify(st)); const ok = st.has && !st.dis;
    if (ok) { opened = c; break; }
    await P.keyboard.press('Escape'); await H.sleep(900);
  }
  console.log('card with energy', JSON.stringify(opened));
  await R.shot(out + '-1card.png');
  if (!opened) { console.log('no energy-capable member'); await R.close(); return; }
  await R.tapEl(P.locator('.cp-card [data-chat="energy"]').last()); await H.sleep(1800);
  const info = await P.evaluate(() => {
    const css = document.getElementById('mbCss'); const sheet = document.querySelector('.mb-care');
    const cell = sheet && sheet.querySelector('.mb-cell'); const m = cell && cell.querySelector('.m');
    const r = cell && cell.getBoundingClientRect();
    const ovs = [...document.querySelectorAll('.r2-ov')].map(o => { const b = o.getBoundingClientRect(); const cs = getComputedStyle(o); return String(o.className).slice(0, 60) + ' z' + cs.zIndex + ' vis' + cs.visibility + ' op' + cs.opacity + ' @' + Math.round(b.top) + 'h' + Math.round(b.height) + ': ' + (o.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60); });
    const kinds = sheet ? [...sheet.querySelectorAll('.mb-kind')].map(k => { const b = k.getBoundingClientRect(); return k.textContent.trim() + ' ' + Math.round(b.width) + 'x' + Math.round(b.height); }) : [];
    const cta = sheet && sheet.querySelector('.mb-cta'); const cb = cta && cta.getBoundingClientRect();
    return { mbCss: css ? css.href + ' loaded=' + !!css.sheet : null, sheets: [...document.styleSheets].filter(s => /micro-book|community-energy/.test(s.href || '')).map(s => s.href), cell: r ? Math.round(r.width) + 'x' + Math.round(r.height) : null, mFill: m ? getComputedStyle(m).fill : null, say: sheet && (sheet.querySelector('.mb-say') || {}).textContent, title: sheet && (sheet.querySelector('h2') || {}).textContent, over: sheet && (sheet.querySelector('.mb-over') || {}).textContent, kinds, cta: cta ? cta.textContent + ' ' + Math.round(cb.left) + ',' + Math.round(cb.top) + ' ' + Math.round(cb.width) + 'x' + Math.round(cb.height) : null, ovs, lang: document.documentElement.lang, w: innerWidth, h: innerHeight };
  });
  console.log('care', JSON.stringify(info, null, 1));
  await R.shot(out + '-2care.png');
  console.log('errs', JSON.stringify(R.errs));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
