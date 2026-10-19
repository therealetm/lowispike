'use strict';
// Geometry check of the own companion on Home + Forms + 3D split. node geom.cjs ROOT VIEW BDAY BTIME
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const ROOT = process.argv[2], VIEW = process.argv[3] || 'iphone13', BDAY = process.argv[4] || '1997-10-14', BTIME = process.argv[5] || '';
(async () => {
  const srv = await L.serve(ROOT), url = 'http://127.0.0.1:' + srv.address().port + '/';
  const SEED = `try{ if(!localStorage.getItem('__cm')){ localStorage.setItem('__cm','1'); localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Tester', bday: '${BDAY}' }, xp: 40, ledger: [], logs: [], settings: { lang: 'de' } })); localStorage.setItem('lowispike.lang','de'); } }catch(e){}`;
  const h = await L.open({ url, view: VIEW, preInit: SEED, settle: 6000 });
  const p = h.page;
  await p.evaluate(([bday, btime]) => { const B = window.LowiBirthCompanion; B.save(B.core.generate({ bday, btime })); }, [BDAY, BTIME]);
  await L.sleep(2500); // the lowi:companion event should repaint Home without a reload
  const live = await p.evaluate(() => !!document.querySelector('#spBubble svg.cw-own-cell'));
  const g = await p.evaluate(() => {
    const svg = document.querySelector('#spBubble svg.tmg-plant'); if (!svg) return { none: true };
    const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const out = { svg: r(svg), body: r(svg.querySelector('.cw-own-body .lc-shape')), eyes: r(svg.querySelector('.cw-own-face .lh-eyes')), mouthShown: [...svg.querySelectorAll('.cw-own-face .lh-smile,.cw-own-face .lh-calm,.cw-own-face .lh-flat,.cw-own-face .lh-frown')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.getAttribute('class')),
      acc: r(svg.querySelector('.cw-own-body > :last-child')), parts: r(svg.querySelector('.cw-own-parts')), cells: document.querySelectorAll('svg.cw-cell').length, ownCells: document.querySelectorAll('svg.cw-own-cell').length, wallVisible: getComputedStyle(svg.querySelector('.cw-wall')).visibility, misty: document.documentElement.dataset.misty || (document.getElementById('spHome') || {dataset:{}}).dataset.misty };
    try { const F = window.LowiMistyFace && (window.LowiMistyFace.core || window.LowiMistyFace); const sp = F && F.splitArt ? F.splitArt(svg.outerHTML) : null; out.split = sp ? { fx: sp.fx, fy: sp.fy, rx: sp.rx, faceHasEyes: sp.face.indexOf('lh-eyes') > 0, bodyHasFace: sp.body.indexOf('lh-face') > 0 } : 'no splitArt api'; } catch (e) { out.split = 'err ' + e.message; }
    return out;
  });
  const sprite = await p.evaluate(async () => {
    const WH = window.LowiWorldHome, art = WH && WH.mistyFaceArt ? WH.mistyFaceArt() : null; if (!art) return 'no 3D art api';
    const B = window.LowiBirthCompanion.get();
    const img = new Image(); const ok = await new Promise(res => { img.onload = () => res(true); img.onerror = () => res(false); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(art.svg); });
    let px = null; if (ok) { const cv = document.createElement('canvas'); cv.width = 260; cv.height = 310; const x = cv.getContext('2d'); x.drawImage(img, 0, 0, 260, 310); const d = x.getImageData(0, 0, 260, 310).data; let n = 0, r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { n++; r += d[i]; g += d[i + 1]; b += d[i + 2]; } px = { opaque: n, avg: n ? [r / n | 0, g / n | 0, b / n | 0] : null }; }
    return { own: art.svg.indexOf('cw-own-body') > 0, eyes: art.svg.indexOf('cw-own-face') > 0, loads: ok, px, palette: B && B.palette };
  });
  await p.evaluate(() => window.LowiCompanion && LowiCompanion.open()); await L.sleep(1200);
  const forms = await p.evaluate(() => [...document.querySelectorAll('.cf-panel svg.tmg-plant')].map(s => { const b = s.querySelector('.cw-own-body .lc-shape'); const r = b && b.getBoundingClientRect(), o = s.getBoundingClientRect(); return { own: s.classList.contains('cw-own-cell'), inside: !!(r && r.left >= o.left - 2 && r.right <= o.right + 2 && r.top >= o.top - 2 && r.bottom <= o.bottom + 2), w: r && Math.round(r.width) }; }));
  // a friend never wears my companion
  const friend = await p.evaluate(() => { const F = window.LowiCompanion && LowiCompanion.friendSVG; if (!F) return 'no api'; const s = String(F(null, 'zz') || ''); return { len: s.length, own: s.indexOf('cw-own-cell') >= 0, cell: s.indexOf('cw-wall') >= 0 }; });
  console.log(JSON.stringify({ VIEW, BDAY, BTIME, liveRepaint: live, sprite, g, forms, friend, errs: h.log.pageerror.slice(0, 5) }));
  await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
