'use strict';
/* Oct 26, 2026 (Emmanuel: "You know the auto fly. If they want to manually tap, let them do that. But not automatically.
   It's quite annoying and then the UI breaks."): the companion never leaves on her own; she explores only after a tap, and
   Home looks clean while she is out.
   node tools/manual-explore/check.cjs [url|root] [langs] [outdir]     ENG=webkit|chromium (default webkit)
   WebKit on this VM: SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1. Fake data only (the harness's offline test profile). */
const H = require('../sim/harness.cjs');
const fs = require('fs');
process.env.SIM_WK_VIEWPORT = '1';
(async () => {
  const where = process.argv[2] || '.', langs = (process.argv[3] || 'en,de,es').split(','), out = process.argv[4] || '/tmp/manual-explore';
  const engine = process.env.ENG || 'webkit', phase = process.env.PHASE || 'all';
  fs.mkdirSync(out, { recursive: true });
  let pass = 0, fail = 0; const bad = [];
  for (const lang of langs) {
    const tag = lang + '-' + engine;
    const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: 390, height: 844 } };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 900))); };
    try {
      if (engine === 'chromium') await P.setViewportSize({ width: 390, height: 844 });
      await R.ctx.addInitScript(a => { try { localStorage.setItem('lowispike.lang', a); localStorage.setItem('lowi.lang', a); } catch (e) { } }, lang);
      /* an OLD automatic trip saved before the change (no manual flag), 20 min in: must come home on open */
      await R.ctx.addInitScript(() => { try { if (sessionStorage.getItem('mx-seeded')) return; sessionStorage.setItem('mx-seeded', '1');
        const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const now = Date.now(); s.garden = { trips: {}, items: [] }; s.garden.trips[k] = { start: now - 20 * 60000, back: now + 40 * 60000, item: 'dew', got: false, vigor: 'ok' };
        s.ledger = (s.ledger || []).concat([{ id: 'sf', eventId: 'sun-full:' + k, src: 'sun-full', amt: 10, ts: now - 20 * 60000 }]);
        localStorage.setItem('lowispike.v2', JSON.stringify(s)); } catch (e) { } });
      await R.goto(); await H.sleep(7000);
      const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
      console.log(tag, 'build', build, 'viewport', JSON.stringify(P.viewportSize()));
      const look = () => P.evaluate(() => {
        const rr = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
        const bub = document.getElementById('spBubble'), chip = bub && bub.querySelector('.ls-back'), home = document.getElementById('spHome');
        const herb = bub && bub.querySelector('.lh-herb, .lh-wrap, svg');
        const seen = e => { for (let x = e; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.3) return false; } return true; };
        const ring = [...document.querySelectorAll('#whHud button, #spHome > .sp-heroes button, #spFast')].filter(e => e !== bub && !e.closest('#whToday') && e.getBoundingClientRect().width > 20 && e.getBoundingClientRect().y < innerHeight).map(e => ({ id: e.id || e.className.toString().slice(0, 30), r: rr(e), seen: seen(e) }));
        const wh = window.LowiWorldHome && LowiWorldHome.state;
        const v = window.LowiSun && LowiSun.live ? LowiSun.live() : {};
        const g = (() => { try { return LowiVitalsBridge.state().garden; } catch (e) { return null; } })();
        const chipCs = chip ? getComputedStyle(chip) : null;
        const hit = chip ? (() => { const r = chip.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e ? (e.closest('.ls-back') ? 'chip' : (e.id || e.className.toString().slice(0, 40))) : null; })() : null;
        return { away: !!v.away, tripToday: v.trip || null, items: g ? g.items.length : -1, homeAway: home && home.dataset.away, homeCls: home && home.className.slice(0, 120),
          bub: rr(bub), chip: rr(chip), chipText: chip ? chip.textContent : '', chipShown: chipCs ? chipCs.display !== 'none' && chipCs.visibility !== 'hidden' && +chipCs.opacity > 0.05 : false,
          chipOverflow: chip ? chip.scrollWidth > chip.clientWidth + 1 || chip.scrollHeight > chip.clientHeight + 1 : false, hit,
          herbOpacity: herb ? getComputedStyle(herb).opacity : null, bubOpacity: bub ? getComputedStyle(bub).opacity : null,
          wider: document.documentElement.scrollWidth > innerWidth + 1, ring, seenN: ring.filter(r => r.seen).length, vw: innerWidth, vh: innerHeight,
          clean: /\blw-clean\b/.test(document.documentElement.className), pad: wh && wh.pad ? wh.pad.mode || '' : '', wand: !!(wh && wh.adv && wh.adv.wand && wh.adv.wand.visible) };
      });
      let s = await look();
      ok('1 an old automatic trip comes home on open (not away, finds kept)', !s.away && s.items >= 1 && !s.chipShown, s);
      await R.shot(out + '/' + tag + '-1-home.png');
      /* the sun bonus is in, today's trip is used by that old one; give a fresh day state to test the manual start */
      await P.evaluate(() => { const st = LowiVitalsBridge.state(); const k = LowiSun.dayKey(Date.now()); delete st.garden.trips[k]; st.garden.items = (st.garden.items || []).filter(i => i && i.day !== k); LowiVitalsBridge.save(); LowiSun.render(); });
      await H.sleep(1500);
      s = await look();
      ok('2 sun full, no trip: she stays home on her own (wait 35 s)', true);
      await H.sleep(35000);
      s = await look();
      ok('3 still home after 35 s: she never leaves by herself', !s.away && !s.tripToday && !s.chipShown, s);
      const before = s;
      /* the manual start: the sun sheet's "Send her exploring" */
      /* give her energy the honest way the app reads it (a full-power boost), so the trip can be offered */
      /* give her energy the way the app reads it: 4 glasses of water logged today on the water counter */
      await P.evaluate(() => { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}; f.water = f.water || {}; f.water[LowiSun.dayKey(Date.now())] = 4; localStorage.setItem('lowi_fast_v1', JSON.stringify(f)); LowiSun.render(); });
      await H.sleep(800);
      const opened = await P.evaluate(() => { try { LowiSun.info(); return true; } catch (e) { return String(e); } });
      await H.sleep(1200);
      const btn = await P.evaluate(() => { const b = document.querySelector('.r2-ov [data-ls="go"]'); return b ? b.textContent : null; });
      ok('4 the sun sheet offers a deliberate start button', opened === true && !!btn, { opened, btn });
      if (btn) {
        await P.evaluate(() => document.querySelector('.r2-ov [data-ls="go"]').scrollIntoView({ block: 'center' })); await H.sleep(700);
        const where = await P.evaluate(() => { const b = document.querySelector('.r2-ov [data-ls="go"]'), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { y: Math.round(r.y), h: Math.round(r.height), onTop: !!(e && e.closest('[data-ls="go"]')) }; });
        ok('4b the start button is on screen and nothing covers it', where.onTop && where.y >= 0 && where.y + where.h <= 844, where);
        await R.tap('.r2-ov [data-ls="go"]'); await H.sleep(2500);
      }
      s = await look();
      ok('5 after the tap she is out exploring (manual trip)', s.away && s.tripToday && s.tripToday.manual === true, { away: s.away, trip: s.tripToday });
      await R.shot(out + '/' + tag + '-5-away.png');
      const b = s.bub, c = s.chip;
      const inside = b && c && c.x >= b.x - 1 && c.x + c.w <= b.x + b.w + 1 && c.y >= b.y - 1 && c.y + c.h <= b.y + b.h + 1;
      const onScreen = c && c.x >= 0 && c.x + c.w <= s.vw && c.y >= 0 && c.y + c.h <= s.vh;
      ok('6 away chip: shown, fully on screen, inside her bubble, text not cut', s.chipShown && onScreen && inside && !s.chipOverflow && /\d/.test(s.chipText), { chip: c, bub: b, text: s.chipText, overflow: s.chipOverflow });
      ok('7 the chip takes the tap (nothing on top of it)', s.hit === 'chip', { hit: s.hit });
      const moved = (before.ring || []).filter((r, i) => { const n = (s.ring || [])[i]; return !n || Math.abs(n.r.x - r.r.x) > 6 || Math.abs(n.r.y - r.r.y) > 6 || Math.abs(n.r.w - r.r.w) > 4; });
      ok('8 the ring around her stays where it was, no sideways overflow', !moved.length && !s.wider && JSON.stringify(s.bub) === JSON.stringify(before.bub), { moved, bubBefore: before.bub, bubNow: s.bub, wider: s.wider });
      await H.sleep(6000); s = await look();
      ok('8b while she is out every Home button stays visible (no clean view, no autopilot, no faded copy of her drifting)', s.seenN === before.seenN && s.seenN > 0 && !s.clean && s.pad !== 'auto' && !s.wand && s.away, { seen: s.seenN, before: before.seenN, gone: before.ring.filter(r => r.seen && !(s.ring.find(n => n.id === r.id) || {}).seen).map(r => r.id), clean: s.clean, pad: s.pad, wand: s.wand });
      /* call her back with one tap on the chip */
      if (s.chipShown) { await R.tap('#spBubble > .ls-back'); await H.sleep(3000); }
      await P.evaluate(() => { const t = window.LowiR2 && LowiR2.top && LowiR2.top(); if (t) LowiR2.closeAll && LowiR2.closeAll(); }); await H.sleep(800);
      s = await look();
      ok('9 one tap on the chip calls her back, finds kept, chip gone', !s.away && !s.chipShown && s.items >= 1 && s.tripToday && s.tripToday.got, { away: s.away, items: s.items, trip: s.tripToday });
      const moved2 = (before.ring || []).filter((r, i) => { const n = (s.ring || [])[i]; return !n || Math.abs(n.r.x - r.r.x) > 6 || Math.abs(n.r.y - r.r.y) > 6; });
      ok('10 back home: same layout as before she left', !moved2.length && !s.wider && JSON.stringify(s.bub) === JSON.stringify(before.bub) && +s.herbOpacity > 0.5, { moved2, bub: s.bub, herb: s.herbOpacity });
      await R.shot(out + '/' + tag + '-10-back.png');
      ok('11 no page errors', !R.errs.length, R.errs.slice(0, 4));
    } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 600)); }
    await R.close();
  }
  console.log('\nRESULT', pass, 'passed,', fail, 'failed'); if (bad.length) console.log(bad.join('\n'));
  process.exit(fail ? 1 : 0);
})();
