/* Weather + Fasting panels on the spring (25 Oct 2026). Simulated iPhone 13, fake Supabase (nothing written), local folder or URL.
   For each: open the real panel (LowiTopBar.openWeather / the page's sheet() with a .fst-sh body, the same call Fasting makes),
   close it while it is still growing, and check frame by frame that it turns around from where it is (no jump to full size,
   no timed keyframes), and that the next plain sheet on the reused #sheet carries no leftover spring.
   node tools/springs/panels.cjs [url] [cases]   cases: chromium-phone,webkit-phone. Exit 1 on failure. */
'use strict';
const H = require('../regress/harness.cjs');
const sleep = H.sleep;
const URL_ = process.argv[2] || '';
const ALL = { 'chromium-phone': { engine: 'chromium', viewport: { width: 390, height: 844 } }, 'webkit-phone': { engine: 'webkit', device: 'iPhone 13' } };
const CASES = (process.argv[3] || Object.keys(ALL).join(',')).split(',').filter(k => ALL[k]);
const fails = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };
const ok = (w, m) => console.log('ok  ', w, m);

async function run(name) {
  const R = await H.open(Object.assign({ probe: false, lang: 'en', url: URL_ }, ALL[name]));
  const p = R.page;
  try {
    await R.goto();
    await sleep(2500);
    const res = await p.evaluate(async () => {
      const frame = () => new Promise(r => requestAnimationFrame(() => r()));
      const t0 = performance.now(); const sc = el => { const cs = getComputedStyle(el); return { s: parseFloat(cs.scale) || 1, o: parseFloat(cs.opacity), on: el.isConnected, t: Math.round(performance.now() - t0), anim: cs.animationName, sp: el.classList.contains('mb-sp') }; };
      async function midClose(el, close) {
        const grow = []; for (let i = 0; i < 3; i++) { await frame(); grow.push(sc(el)); }
        close();
        const fold = []; for (let i = 0; i < 6; i++) { await frame(); fold.push(sc(el)); }
        return { grow, fold };
      }
      const out = {};
      /* Weather */
      if (window.LowiTopBar && LowiTopBar.openWeather) {
        LowiTopBar.openWeather();
        const el = document.querySelector('#tbWx .tbw-sheet');
        out.wx = el ? await midClose(el, () => LowiTopBar.closeWeather()) : { err: 'no weather sheet' };
        await new Promise(r => setTimeout(r, 600));
        out.wxGone = !document.getElementById('tbWx');
      } else out.wx = { err: 'no LowiTopBar' };
      /* Fasting: the page's own sheet() with the Fasting body class */
      if (typeof sheet === 'function' && typeof closeSheet === 'function') {
        sheet('<div class="bt-sheet fst-sh" data-noi18n><div class="h2 fst-title">Fasting check</div><div style="height:360px"></div></div>');
        const el = document.getElementById('sheet');
        out.fst = await midClose(el, () => closeSheet());
        await new Promise(r => setTimeout(r, 700));
        /* the same #sheet now shows a plain (non-blooming) sheet: no spring paint left on it */
        sheet('<div style="height:200px">plain</div>');
        await frame(); await frame();
        const cs = getComputedStyle(el);
        out.plain = { op: cs.opacity, scale: cs.scale, inlineOp: el.style.opacity, inlineScale: el.style.scale, sp: el.classList.contains('mb-sp') };
        closeSheet();
      } else out.fst = { err: 'no sheet()' };
      return out;
    });
    for (const k of ['wx', 'fst']) {
      const r = res[k], label = k === 'wx' ? 'Weather' : 'Fasting';
      if (r.err) { fail(name, label + ': ' + r.err); continue; }
      const g = r.grow[r.grow.length - 1], f = r.fold[0];
      const trail = r.fold.map(x => x.on ? x.s.toFixed(2) + '/o' + x.o.toFixed(2) + '@' + x.t + 'ms' : 'removed@' + x.t + 'ms').join(' ');
      if (!g.sp || (g.anim && g.anim !== 'none')) fail(name, label + ': not spring-driven (' + JSON.stringify(g) + ')');
      else if (!(g.s > 0.15 && g.s < 0.99)) fail(name, label + ': not mid-growth when closed (' + g.s + ')');
      else if (!f.on) ok(name, label + ' closed mid-growth at scale ' + g.s.toFixed(2) + '; this machine took ' + (f.t - g.t) + ' ms for one frame, so the panel was already removed (its normal 260 ms close) before the next frame: ' + trail);
      else if (f.s > g.s + 0.12) fail(name, label + ': jumped from ' + g.s.toFixed(2) + ' to ' + f.s.toFixed(2) + ' ' + trail);
      else ok(name, label + ' closed mid-growth at scale ' + g.s.toFixed(2) + ', next frame ' + f.s.toFixed(2) + ' (no jump), then ' + trail);
    }
    if (res.wxGone === false) fail(name, 'Weather: overlay still there after closing'); else if (res.wxGone) ok(name, 'Weather overlay removed after closing');
    if (res.plain) {
      const pl = res.plain;
      if (pl.inlineOp || pl.inlineScale || pl.sp) fail(name, 'reused #sheet kept spring paint ' + JSON.stringify(pl));
      else ok(name, 'plain sheet on the reused #sheet has no leftover spring (opacity ' + pl.op + ', scale ' + pl.scale + ')');
    }
  } catch (e) { fail(name, 'crashed: ' + (e && e.stack || e)); }
  finally { await R.close(); }
}
(async () => {
  for (const c of CASES) await run(c);
  console.log(fails.length ? '\nFAILED ' + fails.length + '\n' + fails.join('\n') : '\nALL PASSED');
  process.exit(fails.length ? 1 : 0);
})();
