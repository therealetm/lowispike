'use strict';
/* Oct 19 old-design purge: census of every picture on every reachable screen.
   node playtest/probe-old-design.cjs [--url URL] [--view chromium390|iphone13|ipadP] [--shots DIR]
   For each screen it lists the visible imagery: <img> sources, top-level inline <svg> (class + parent class), canvases,
   CSS background images (url() only), plus LOWiSPIKE wordmarks. Writes JSON to stdout and screenshots to --shots. */
const path = require('path'), fs = require('fs');
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const VIEW = arg('--view') || 'chromium390', SHOTS = arg('--shots');
const CENSUS = () => {
  const vw = innerWidth, vh = innerHeight, out = [];
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 10 || r.height < 10 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) return null; let n = e; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return null; n = n.parentElement; } return r; };
  const who = e => { const p = []; let n = e; for (let i = 0; i < 4 && n && n.nodeType === 1; i++, n = n.parentElement) p.push((n.tagName.toLowerCase()) + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : (n.className && n.className.baseVal ? '.' + n.className.baseVal.trim().split(/\s+/).slice(0, 2).join('.') : ''))); return p.join(' < '); };
  const short = s => s.startsWith('data:') ? s.slice(0, 30) + '…(' + s.length + ')' : s.split('?')[0].split('/').slice(-2).join('/');
  document.querySelectorAll('img').forEach(e => { const r = vis(e); if (r) out.push({ k: 'img', src: short(e.currentSrc || e.src || ''), w: Math.round(r.width), at: who(e) }); });
  document.querySelectorAll('svg').forEach(e => { if (e.parentElement && e.parentElement.closest('svg')) return; const r = vis(e); if (!r || r.width < 24) return; const inner = Array.from(e.querySelectorAll('[class]')).map(x => (x.className && x.className.baseVal || '').split(/\s+/)[0]).filter(Boolean); const sig = Array.from(new Set(inner)).slice(0, 6).join(','); out.push({ k: 'svg', w: Math.round(r.width), at: who(e), sig }); });
  document.querySelectorAll('canvas').forEach(e => { const r = vis(e); if (r) out.push({ k: 'canvas', w: Math.round(r.width), at: who(e) }); });
  document.querySelectorAll('body *').forEach(e => { const b = getComputedStyle(e).backgroundImage; if (!b || b.indexOf('url(') < 0) return; const r = vis(e); if (!r) return; const m = b.match(/url\("?([^")]+)/); out.push({ k: 'bg', src: short(m ? m[1] : b), w: Math.round(r.width), at: who(e) }); });
  document.querySelectorAll('body *').forEach(e => { if (e.children.length > 3) return; const t = (e.textContent || '').replace(/\s+/g, ''); if (/^LOW.?i.?SPIKE$/i.test(t) && vis(e)) out.push({ k: 'wordmark', at: who(e), html: e.innerHTML.slice(0, 120) }); });
  const seen = new Set(); return out.filter(o => { const key = o.k + o.src + o.at; if (seen.has(key)) return false; seen.add(key); return true; });
};
(async () => {
  let url = arg('--url'), server = null;
  if (!url) { server = await L.serve(path.resolve(__dirname, '..')); url = 'http://127.0.0.1:' + server.address().port + '/'; }
  const res = {};
  const run = async (name, opts, steps) => {
    const h = await L.open(Object.assign({ url, view: VIEW, settle: 6000 }, opts));
    for (const [sname, fn, wait] of steps) {
      try { await h.page.evaluate(fn); } catch (e) { res[name + '/' + sname] = { error: String(e.message).slice(0, 200) }; continue; }
      await L.sleep(wait || 1800);
      res[name + '/' + sname] = await h.page.evaluate(CENSUS);
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await h.page.screenshot({ path: path.join(SHOTS, VIEW + '-' + name + '-' + sname + '.png') }).catch(() => {}); }
    }
    res[name + '/errors'] = h.log.pageerror.slice(0, 5);
    await h.browser.close();
  };
  const closeAll = '(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); })()';
  const more = id => `(() => { const b = document.querySelector('[data-orbit="settings"]'); b && b.click(); setTimeout(() => { const m = document.querySelector('[data-ss2-id="${id}"], [data-ss2="${id}"], [data-more="${id}"], [data-route="${id}"]'); m && m.click(); }, 900); })()`;
  await run('main', {}, [
    ['home', '0', 500],
    ['misty-tap', '(() => { const m = document.querySelector("[data-home-misty]") || document.getElementById("spBubble"); m && m.click(); })()', 2000],
    ['settings', closeAll + ';(() => { const b = document.querySelector("[data-orbit=settings]"); b && b.click(); })()', 1500],
    ['profile', closeAll + ';goTab("profile")', 2000],
    ['community', 'goTab("foryou")', 3000],
    ['cook', 'goTab("shelf")', 2000],
    ['move', 'goTab("move")', 2000],
    ['today', 'goTab("today")', 2000],
    ['care', 'goTab("home"); window.LowiR3F && LowiR3F.openBoardTab && LowiR3F.openBoardTab()', 2500],
    ['map', closeAll + ';goTab("home"); (() => { const b = document.querySelector("#whHud .wh-zoom"); b && b.click(); })()', 3000],
    ['old-onboard', closeAll + ';window.openOnboarding && openOnboarding()', 1500],
    ['misty-world', closeAll + ';goTab("home"); window.LowiSpirit && LowiSpirit.open()', 3000],
    ['ritual-day', closeAll + ';window.LowiSpirit && LowiSpirit.close(true); window.LowiRitual && LowiRitual.openDay && LowiRitual.openDay()', 2000],
    ['ritual-a2', closeAll + ';window.LowiRitual && LowiRitual.closeDay && LowiRitual.closeDay(); window.LowiRitual && LowiRitual.openA2 && LowiRitual.openA2()', 2000],
    ['comm-me', closeAll + ';window.LowiRitual && LowiRitual.closeA2 && LowiRitual.closeA2(); goTab("foryou"); setTimeout(() => { const b = document.querySelector(".cg-body.me"); b && b.click(); }, 1500)', 3500],
  ]);
  await run('prof', { preInit: "try{const s=JSON.parse(localStorage.getItem('lowispike.v2')||'{}');s.user=Object.assign({tags:[]},s.user||{});localStorage.setItem('lowispike.v2',JSON.stringify(s));}catch(e){}" }, [
    ['profile', 'goTab("profile")', 2500],
    ['profile-edit', '(() => { const b = document.querySelector("[data-r2p=edit]"); b && b.click(); })()', 1800],
  ]);
  await run('scan', {}, [['scan', 'goTab("scan")', 3500]]);
  await run('firstrun', { noFixture: true, settle: 7000 }, [['gate', '0', 500]]);
  if (server) server.close();
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
