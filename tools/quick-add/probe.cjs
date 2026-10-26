'use strict';
/* quick "+" on Supermarket rows (MAYA-HANDOFF 0.35): real taps on WebKit iPhone 13, iPad portrait + landscape, Reduce Motion */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const ROOT = process.argv[2] || '/home/sprite/wt-quick-add', URL0 = process.argv[3] || '';
const views = (process.argv[4] || 'iphone13,ipadP,ipadL,iphone13rm').split(',');
const SEED = `try{ if(!localStorage.getItem('lowi.storePicks.v1')) localStorage.setItem('lowi.storePicks.v1', JSON.stringify({range:'lidl',store:{id:'osm:1',name:'Lidl',brand:'Lidl',chain:'lidl',addr:'Engelsbyer Str. 131',town:'Flensburg',km:0.4}})); }catch(e){}`;
(async () => {
  let base = URL0; if (!base) { const s = await L.serve(ROOT); base = 'http://127.0.0.1:' + s.address().port + '/'; }
  const out = {};
  for (const v of views) {
    const rm = v.endsWith('rm'), view = rm ? v.slice(0, -2) : v, lang = v === 'ipadL' ? 'de' : v === 'ipadP' ? 'es' : 'en';
    const h = await L.open({ view, url: base, lang, preInit: SEED, reducedMotion: rm, settle: 3000 });
    const P = h.page, R = out[v] = { fails: [] };
    try {
    const fail = m => R.fails.push(m);
    await P.waitForFunction(() => window.LowiStorePicks && window.LowiQuickAdd, null, { timeout: 90000 }).catch(() => fail('no LowiQuickAdd'));
    await P.evaluate(() => { try { LowiStorePicks.open(); } catch (e) {} });
    await P.waitForSelector('.stp-card .stp-qa', { timeout: 30000 }).catch(() => fail('no quick column'));
    await L.sleep(800);
    const info = () => P.evaluate(() => {
      const sc = document.querySelector('.stp-card .stp-scroll') || document.querySelector('.stp-card');
      const cols = [...document.querySelectorAll('.stp-card [data-stp-qa-col]')];
      const lines = (window.LOWI_SHELF && LOWI_SHELF.cartLines ? LOWI_SHELF.cartLines() : []).map(l => l.n + ' x' + l.q);
      const kit = LowiStorePicks.kitchen ? LowiStorePicks.kitchen() : null;
      return { st: sc ? sc.scrollTop : -1, qv: !!document.querySelector('.stp-qv'), lines, kit: Array.isArray(kit) ? kit.map(i => i.n || (i.p && i.p.n) || '?') : kit && kit.items ? kit.items.map(i => i.n) : [],
        rows: cols.slice(0, 4).map(c => { const li = c.closest('li'), r = li.getBoundingClientRect(), it = li.querySelector('.stp-it').getBoundingClientRect(), cr = c.getBoundingClientRect();
          return { k: c.getAttribute('data-k'), n: (c.querySelector('.stp-qa-n') || {}).textContent || '', h: Math.round(r.height), top: Math.round(r.top), overlap: it.right > cr.left + 1,
            name: li.querySelector('.stp-nm b').textContent, btnH: [...c.querySelectorAll('button')].map(b => b.offsetHeight), vis: Math.round(c.querySelector('button').getBoundingClientRect().height) }; }),
        cart: (document.querySelector('.stp-card .stp-cartbtn') || {}).textContent || '', note: (document.querySelector('.stp-qa-note.on') || {}).textContent || '' };
    });
    const tp = async sel => { const p = await c(sel); if (p) await L.tap(h, p.x, p.y); return p; };
    const c = async sel => { const p = await L.center(h, sel); if (!p) fail('missing ' + sel); return p; };
    // scroll a little so a scroll jump would show
    const ST = await P.evaluate(() => { const sc = document.querySelector('.stp-card .stp-scroll'); const li = document.querySelector('.stp-li.qa'); if (sc && li) sc.scrollTop += li.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12; return sc ? sc.scrollTop : -1; }); await L.sleep(400);
    let a = await info(); R.start = { st: a.st, rows: a.rows.map(r => r.name + ' ' + r.k + ' h' + r.h + ' btn' + r.btnH + ' vis' + r.vis + (r.overlap ? ' OVERLAP' : '')) };
    if (a.rows.some(r => r.overlap)) fail('text overlaps the quick column');
    if (a.rows.some(r => r.btnH.some(x => x < 44))) fail('tap target under 44');
    const tgt = await P.evaluate(() => { const cs = [...document.querySelectorAll('.stp-card [data-stp-qa-col]')]; const vis = cs.filter(c => { const r = c.getBoundingClientRect(); const s = document.querySelector('.stp-card .stp-scroll').getBoundingClientRect(); const li = c.closest('li').getBoundingClientRect(); return li.top >= s.top - 1 && r.bottom < s.bottom - 8; }); return vis.slice(0, 3).map(c => c.getAttribute('data-stp-qa-col')); });
    if (tgt.length < 1) fail('no visible row');
    const i0 = tgt[0], i1 = String(+tgt[0] + 1), i2 = String(+tgt[0] + 2), sel = (i, q) => `[data-stp-qa-col="${i}"] [data-stp-qa="${q}"]`;
    const h0 = await P.evaluate(i => document.querySelector(`[data-stp-qa-col="${i}"]`).closest('li').getBoundingClientRect().height, i0);
    // 1) single tap +
    let p = await tp(sel(i0, 'add')); await L.sleep(500);
    a = await info(); const r0 = await P.evaluate(i => { const c = document.querySelector(`[data-stp-qa-col="${i}"]`); return { k: c.getAttribute('data-k'), n: (c.querySelector('.stp-qa-n') || {}).textContent, h: c.closest('li').getBoundingClientRect().height }; }, i0);
    R.tap1 = { st: a.st, qv: a.qv, lines: a.lines, cart: a.cart, row: r0, note: a.note };
    if (a.qv) fail('+ opened the product'); if (Math.abs(a.st - ST) > 1) fail('list scrolled ' + ST + '->' + a.st); if (r0.k !== 'step' || r0.n !== '1') fail('no stepper 1');
    if (Math.abs(r0.h - h0) > 0.5) fail('row height changed ' + h0 + '->' + r0.h); if (a.lines.length !== 1) fail('cart lines ' + a.lines.length);
    await L.sleep(800);
    // 2) double tap + on 2nd row (gap ~80ms)
    await P.evaluate(i => document.querySelector(`[data-stp-qa-col="${i}"]`).closest('li').scrollIntoView({ block: 'center' }), i1); await L.sleep(500);
    p = await tp(sel(i1, 'add')); await L.sleep(80); if (p) await L.tap(h, p.x, p.y); await L.sleep(600);
    a = await info(); R.dbl = a.lines; if (a.lines.some(l => / x2$/.test(l))) fail('double tap added 2'); if (a.qv) fail('dbl opened product');
    await L.sleep(800);
    // 3) stepper + quick taps x2 on first row (300 ms apart) -> 3
    await P.evaluate(i => document.querySelector(`[data-stp-qa-col="${i}"]`).closest('li').scrollIntoView({ block: 'center' }), i0); await L.sleep(500);
    p = await tp(sel(i0, 'more')); await L.sleep(300); if (p) await L.tap(h, p.x, p.y); await L.sleep(500);
    a = await info(); R.more = a.lines; if (!a.lines.some(l => / x3$/.test(l))) fail('stepper + did not reach 3');
    // 4) minus x3 -> removed, + back
    for (let k = 0; k < 3; k++) { p = await c(sel(i0, 'less')); if (!p) break; await L.tap(h, p.x, p.y); await L.sleep(650); }
    a = await info(); const k0 = await P.evaluate(i => document.querySelector(`[data-stp-qa-col="${i}"]`).getAttribute('data-k'), i0);
    R.less = { lines: a.lines, k: k0, note: a.note }; if (k0 !== 'add' || a.lines.length !== 1) fail('minus did not take it out');
    await L.sleep(500);
    // 5) house on 3rd row -> kitchen, Undo -> gone
    await P.evaluate(i => { const li = document.querySelector(`[data-stp-qa-col="${i}"]`).closest('li'); li.scrollIntoView({ block: 'center' }); }, i2); await L.sleep(500);
    p = await tp(sel(i2, 'kit')); await L.sleep(600);
    a = await info(); R.kit = { kit: a.kit, note: a.note }; if (!a.kit.length) fail('house did not add to kitchen');
    const on = await P.evaluate(i => document.querySelector(`[data-stp-qa-col="${i}"] .stp-qa-kit`).getAttribute('aria-pressed'), i2); if (on !== 'true') fail('house not pressed');
    await P.screenshot({ path: `/home/sprite/qa-probe/${v}.png` });
    p = await c('.stp-qa-note.on .stp-qa-undo'); if (p) { await L.tap(h, p.x, p.y); await L.sleep(600); }
    a = await info(); R.undo = { kit: a.kit, note: a.note, pressed: await P.evaluate(i => document.querySelector(`[data-stp-qa-col="${i}"] .stp-qa-kit`).getAttribute('aria-pressed'), i2) }; if (a.kit.length) fail('undo left it in kitchen');
    // 6) the row itself still opens the product
    p = await c(`[data-stp-item="${i2}"]`); if (p) { await L.tap(h, p.x - 60, p.y); await L.sleep(900); a = await info(); R.rowOpens = a.qv; if (!a.qv) fail('row no longer opens product'); }
    } catch (e) { R.fails.push('THROW ' + String(e.message).slice(0, 200)); }
    const s = await L.snap(h); R.err = s.err.concat(s.rej, h.log.pageerror); if (R.err.length) fail('errors');
    await h.browser.close();
  }
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
