const H = require('/home/sprite/lowispike/tools/sim/harness.cjs');
(async () => {
  const [device, lang] = [process.argv[2], process.argv[3]];
  const R = await H.open({ device, engine: process.env.ENGINE || 'webkit', members: 10, messages: 20, probe: false, lang, ...(process.env.ROOT ? { root: process.env.ROOT } : { url: 'https://therealetm.github.io/lowispike/index.html' }) }), P = R.page;
  await R.ctx.addInitScript(([l]) => { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); }, [lang]);
  await R.goto(); await H.sleep(5000);
  const sc = await P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await P.touchscreen.tap(sc[0], sc[1]); await H.sleep(2500);
  console.log(device, lang, JSON.stringify(await P.evaluate(() => { const c = document.getElementById('b3Cam'); const r = s => { const e = c.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), getComputedStyle(e).zIndex]; }; const inp = c.querySelector('.b3-ctype input'); const ir = inp.getBoundingClientRect(); const t = document.elementFromPoint(ir.left + 20, ir.top + ir.height / 2); return { w: innerWidth, h: innerHeight, cls: c.className, html: document.documentElement.className.slice(0, 200), cmsg: r('.b3-cmsg'), box: r('.b3-pickbox'), cbot: r('.b3-cbot'), inputHit: t === inp ? 'self' : (t && (t.className || t.tagName)).toString().slice(0, 30) }; })));
  await R.close();
})();
