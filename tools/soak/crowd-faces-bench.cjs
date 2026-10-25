#!/usr/bin/env node
/* Item 29 scale check (25 Oct 2026): what N companion faces cost the page when each is a live inline drawing (as the
   galaxy and the chat drew them before) versus a small picture of the same drawing (community-chat.js mateLite).
   Opens the app, then adds N real friendSVG companions (random genomes) to a fixed grid at galaxy size, twice: once
   inline, once as pictures, each in a fresh browser, and reports the browser's memory (all its processes).
   Usage: node tools/soak/crowd-faces-bench.cjs [--url URL] [--n 115] [--engine chromium|webkit] [--copies 2] */
'use strict';
const { execSync } = require('child_process'), path = require('path'), os = require('os');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const URL0 = arg('url', 'https://therealetm.github.io/lowispike/'), N = +arg('n', 115), ENGINE = arg('engine', 'chromium'), COPIES = +arg('copies', 2);
function rss(root) { const rows = execSync('ps -eo pid=,ppid=,rss=').toString().trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)); const kids = new Map(); for (const [p, pp] of rows) { if (!kids.has(pp)) kids.set(pp, []); kids.get(pp).push(p); }
  const by = new Map(rows.map(r => [r[0], r[2]])); let s = 0; const st = [root]; while (st.length) { const p = st.pop(); s += by.get(p) || 0; for (const k of kids.get(p) || []) st.push(k); } return s / 1024 | 0; }
async function run(mode) {
  const b = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] : [] }), root = process.pid;
  const dev = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true };
  const ctx = await b.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); return (u.host === new URL(URL0).host || u.protocol === 'data:' || u.protocol === 'blob:') ? r.continue() : r.abort(); });
  await ctx.addInitScript(() => { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.auto', 'done'); localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Probe', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [], settings: { lang: 'en' } })); });
  const p = await ctx.newPage(); await p.goto(URL0 + '?bench=' + Date.now()); await p.waitForFunction(() => window.LowiCompanion && window.LowiCompanion.friendSVG && window.LowiCompanionCore, null, { timeout: 120000 }); await p.waitForTimeout(5000);
  const before = rss(root);
  const info = await p.evaluate(async ({ N, mode, COPIES }) => {
    const C = window.LowiCompanionCore, F = window.LowiCompanion.friendSVG, els = ['fire', 'water', 'earth', 'air'], host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-wrap:wrap;gap:2px;overflow:hidden;background:#0b1230;pointer-events:none'; document.body.appendChild(host);
    const svgs = []; for (let i = 0; i < N; i++) { let g = null; try { g = C.genome({ sign: { element: els[i % 4] }, personality: 'INFJ', palette: i % 6 }, 1 + (i % 10), 1000 + i * 7919); } catch (e) { } svgs.push(g ? (F(g, 'b' + i) || '') : ''); }
    const P = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'opacity', 'display', 'transform', 'transform-origin', 'transform-box', 'stop-color', 'stop-opacity', 'clip-path', 'mask', 'filter', 'mix-blend-mode'];
    async function pic(svgHtml) { const t = document.createElement('div'); t.style.cssText = 'position:fixed;left:0;top:0;width:72px;height:72px;opacity:0'; t.innerHTML = svgHtml; document.body.appendChild(t); const s = t.querySelector('svg'); if (!s) { t.remove(); return ''; }
      const cl = s.cloneNode(true), a = [s, ...s.querySelectorAll('*')], d = [cl, ...cl.querySelectorAll('*')]; for (let i = 0; i < a.length; i++) { const cs = getComputedStyle(a[i]); for (const x of [...d[i].attributes]) if (!/^[a-zA-Z_][\w:.-]*$/.test(x.name)) d[i].removeAttribute(x.name); let st = ''; for (const k of P) { const v = cs.getPropertyValue(k); if (v) st += k + ':' + v.replace(/url\(\s*"?[^"#)]*#/g, 'url(#').replace(/"\)/g, ')') + ';'; } d[i].setAttribute('style', st + 'animation:none'); }
      cl.setAttribute('width', 216); cl.setAttribute('height', 216); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); const xml = new XMLSerializer().serializeToString(cl); t.remove();
      const u = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' })), im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = u; });
      const c = document.createElement('canvas'); c.width = c.height = 216; try { c.getContext('2d').drawImage(im, 0, 0, 216, 216); } catch (e) { } URL.revokeObjectURL(u); const bl = await new Promise(r => c.toBlob(r, 'image/png')); c.width = c.height = 0; return bl ? URL.createObjectURL(bl) : ''; }
    let html = ''; const urls = mode !== 'inline' ? [] : null; if (urls) for (const s of svgs) urls.push(await pic(s));
    for (let k = 0; k < COPIES; k++) for (let i = 0; i < N; i++) html += '<span style="display:block;width:46px;height:46px;border-radius:50%;box-shadow:0 0 12px #8fb4ff">' + (urls ? '<img alt="" style="display:block;width:100%;height:100%;transform:scale(1.5)" src="' + urls[i] + '">' : svgs[i].replace('<svg', '<svg style="display:block;width:100%;height:100%;overflow:visible"')) + '</span>';
    host.innerHTML = mode === 'rasteronly' ? '' : html; await new Promise(r => setTimeout(r, 2500));
    return { nodes: host.querySelectorAll('*').length, svgNodes: host.querySelectorAll('svg *').length, faces: svgs.filter(Boolean).length };
  }, { N, mode, COPIES });
  for (let i = 0; i < 6; i++) { await p.evaluate(() => window.scrollBy(0, 300)); await p.waitForTimeout(400); }
  await p.waitForTimeout(2000); const after = rss(root); await b.close();
  return Object.assign({ mode, beforeMB: before, afterMB: after, addedMB: after - before }, info);
}
(async () => { for (const m of (arg('modes', 'inline,pic')).split(',')) console.log(JSON.stringify(await run(m))); })().catch(e => { console.error(e); process.exit(1); });
