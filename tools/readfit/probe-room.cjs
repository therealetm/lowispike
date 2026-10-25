'use strict';
/* Probe: what sits at the bottom of the Room at a given size (rects, colours, safe-area). Usage:
   URL=... W=430 H=932 [ENGINE=chromium] [LANG_APP=en] [THEME=dark] [SHOT=/tmp/x.png] node tools/readfit/probe-room.cjs */
const H = require('./harness.cjs');
(async () => {
  const W = +process.env.W || 430, Hh = +process.env.H || 932;
  const s = await H.open({ engine: process.env.ENGINE || 'chromium', w: W, h: Hh, lang: process.env.LANG_APP || 'en', theme: process.env.THEME || 'dark', inset: { top: +process.env.IT || 59, bottom: +process.env.IB || 34 } });
  await H.openRoom(s.page);
  if (process.env.SELECT) console.log('select:', await s.page.evaluate(() => { try { const p = (LowiCommunity.people() || []).filter(x => x.name && x.name !== 'eman'); const t = p.find(x => /Emmy|Antje/.test(x.name)) || p[0]; LowiCommunity.select(t.id); return t.name; } catch (e) { return 'ERR ' + e.message; } }));
  await s.page.waitForTimeout(800);
  const out = await s.page.evaluate(() => {
    const sel = ['#cmPaneChat', '.cm-compose', '.cm-inrow', '#cmInput', '.cs-compose-meta', '#csDraft', '#csCount', '#csNotice', '#cgGalaxy', '.cg-tree-btn', '[class*=tree]', '#lgNav', '.glass-nav', 'nav', '#cmSeg', '.cm-seg', '#cePad', '.ce-pad', '[class*=energy]'];
    const r = []; const seen = new Set();
    for (const q of sel) for (const e of document.querySelectorAll(q)) { if (seen.has(e)) continue; seen.add(e); const b = e.getBoundingClientRect(); if (!b.width) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      r.push({ q, tag: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''), rect: [b.x, b.y, b.width, b.height].map(Math.round), color: cs.color, op: cs.opacity, fs: cs.fontSize, pos: cs.position, pb: cs.paddingBottom, bottom: cs.bottom, text: (e.textContent || '').trim().slice(0, 60) }); }
    const sab = (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);padding-top:env(safe-area-inset-top,0px)'; document.body.appendChild(d); const v = [getComputedStyle(d).height, getComputedStyle(d).paddingTop]; d.remove(); return v; })();
    return { sab, html: document.documentElement.className.slice(0, 300), r };
  });
  console.log('insetApplied=' + s.insetApplied + ' env(bottom,top)=' + out.sab + '\nhtml: ' + out.html);
  for (const x of out.r) console.log(JSON.stringify(x));
  if (process.env.SHOT) await s.page.screenshot({ path: process.env.SHOT });
  console.log('errors: ' + (s.errs.join(' / ') || 'none'));
  await s.browser.close();
})().catch(e => { console.error(e); process.exit(2); });
