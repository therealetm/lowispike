'use strict';
/* Oct 25, 2026 (readability + fit): the Room at every phone size with the real profile list (read-only copy). Checks that every
   companion and its name sit inside the Room, clear of the Friends tree button, the energy pad and the screen edges, that no name
   is cut to a letter, and that the composer hint and counter sit above the home indicator. Writes a screenshot per size.
   URL=... [ENGINE=webkit] [SIZES=se,13,max,android,ipad] [LANG_APP=de] [OUT=/tmp/readfit/room] node tools/readfit/room-fit-check.cjs */
const fs = require('fs');
const H = require('./harness.cjs');
const SIZES = { se: [375, 667, 20, 0], '13': [390, 844, 47, 34], max: [430, 932, 59, 34], android: [360, 780, 24, 16], ipad: [820, 1180, 24, 20] };
(async () => {
  const engine = process.env.ENGINE || 'chromium', lang = process.env.LANG_APP || 'de', out = process.env.OUT || '/tmp/readfit/room';
  fs.mkdirSync(out, { recursive: true });
  let bad = 0;
  for (const k of (process.env.SIZES || 'se,13,max,android,ipad').split(',')) {
    const [w, h, it, ib] = SIZES[k];
    const s = await H.open({ engine, w, h, lang, theme: process.env.THEME || 'dark', inset: { top: it, bottom: ib } });
    /* WebKit cannot be told the safe area, so the check judges it at 0 there */
    const insetB = s.insetApplied ? ib : 0, insetT = s.insetApplied ? it : 0;
    await H.openRoom(s.page);
    if (process.env.HINT_TO) await s.page.evaluate(n => { const d = document.getElementById('csDraft'); if (d) d.textContent = n; }, process.env.HINT_TO);
    /* SETTLE=ms: WebKit on the slow test computer draws ~2 frames a second, so its layout needs longer to settle */
    await s.page.waitForTimeout(+process.env.SETTLE || 1500);
    const r = await s.page.evaluate(([insetT, insetB]) => {
      const R = e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
      const g = document.getElementById('cgGalaxy'), gb = g && R(g), vw = innerWidth, vh = innerHeight;
      const blockers = [...document.querySelectorAll('#cmPaneChat .nm-ctree, #cmPaneChat .ce-pad, #cmPaneChat [class*="ce-pad"], #cePad')].filter(e => e.getBoundingClientRect().width > 4).map(e => ({ el: (e.id || e.className).toString().slice(0, 30), r: R(e) }));
      /* the energy pad as the Room sees it (LowiEnergy.keepOut: the pad plus a 6 px margin each side), in screen px */
      try { const gal = document.getElementById('cgGalaxy'), ko = gal && window.LowiEnergy && LowiEnergy.keepOut ? LowiEnergy.keepOut(gal) : null; if (ko) { const g = gal.getBoundingClientRect(), s = ko.s - 12; blockers.push({ el: 'energy pad', r: { x: g.left + ko.x - s / 2, y: g.top + ko.y - s / 2, w: s, h: s } }); } } catch (e) {}
      const hit = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 2 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 2;
      const issues = [], bodies = [];
      for (const b of document.querySelectorAll('#cgGalaxy .cg-body')) {
        const orb = b.querySelector('.cg-orb') || b, name = b.querySelector('.cg-name');
        const o = R(orb), n = name ? R(name) : null, who = (name && name.textContent.trim()) || b.getAttribute('data-uid') || '?';
        if (getComputedStyle(b).display === 'none' || o.w < 2) continue;
        bodies.push({ who, o, n, full: name ? name.scrollWidth <= name.clientWidth + 1 : true });
        for (const [what, x] of [['bubble', o], ['name', n]]) { if (!x || x.w < 1) continue;
          if (x.x < Math.max(0, gb.x) - 1 || x.x + x.w > Math.min(vw, gb.x + gb.w) + 1 || x.y < gb.y - 1 || x.y + x.h > gb.y + gb.h + 1) issues.push(who + ': ' + what + ' outside the Room ' + JSON.stringify([x.x, x.y, x.w, x.h].map(Math.round)));
          for (const bl of blockers) if (hit(x, bl.r)) issues.push(who + ': ' + what + ' under ' + bl.el); }
        if (name && name.textContent.trim().length <= 1 && who.length > 1) issues.push(who + ': name cut to one letter');
      }
      for (const id of ['csDraft', 'csCount']) { const e = document.getElementById(id); if (!e || !e.getBoundingClientRect().width) continue; const x = R(e);
        if (x.y + x.h > vh - insetB + 1) issues.push(id + ' under the home indicator / bottom edge ' + JSON.stringify([x.x, x.y, x.w, x.h].map(Math.round)));
        if (x.x < 0 || x.x + x.w > vw) issues.push(id + ' off the side');
        if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) issues.push(id + ' clipped inside its box'); }
      return { gb, blockers, bodies: bodies.length, names: bodies.map(b => b.who + (b.full ? '' : '…')).join(', '), issues };
    }, [insetT, insetB]);
    await s.page.screenshot({ path: out + '/' + engine + '-' + k + '-' + lang + '.png' });
    console.log(engine + ' ' + k + ' ' + w + 'x' + h + ' inset ' + (s.insetApplied ? 'on' : 'off') + ': ' + r.bodies + ' companions; ' + (r.issues.length ? r.issues.length + ' problems' : 'OK'));
    console.log('   room ' + JSON.stringify(r.gb && [r.gb.x, r.gb.y, r.gb.w, r.gb.h].map(Math.round)) + ' blockers ' + JSON.stringify(r.blockers.map(b => b.el + '@' + [b.r.x, b.r.y, b.r.w, b.r.h].map(Math.round)))); console.log('   names: ' + r.names);
    for (const i of r.issues) console.log('   ' + i);
    bad += r.issues.length;
    if (s.errs.length) console.log('   page errors: ' + s.errs.slice(0, 3).join(' / '));
    await s.browser.close();
  }
  console.log('TOTAL ' + bad);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
