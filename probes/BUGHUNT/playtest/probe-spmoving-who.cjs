/* Run 24: who keeps html.sp-moving on after spam-opening Sound + Fasting? Wraps LowiSpring.create/glide and lists the springs
   still running 1.5 s after the last open (value, target, velocity, creator stack). node probe-spmoving-who.cjs [url] [engine] */
'use strict';
const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const H = require(WT + '/tools/regress/harness.cjs');
const URL_ = process.argv[2] || '', ENG = process.argv[3] || 'chromium';
(async () => {
  const R = await H.open(Object.assign({ probe: false, lang: 'en', url: URL_, engine: ENG }, ENG === 'webkit' ? { device: 'iPhone 13' } : { viewport: { width: 390, height: 844 } }));
  const p = R.page, errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => {
    const hook = () => { const S = window.LowiSpring; if (!S || S.__w) return !!S; S.__w = 1; const live = window.__spLive = new Set(); const c0 = S.create;
      S.create = function (o) { const a = c0.call(S, o); const st = (new Error().stack || '').split('\n').slice(2, 5).map(s => s.trim()).join(' | '); a.__st = st; live.add(a); return a; };
      return true; };
    const t = setInterval(() => { if (hook()) clearInterval(t); }, 5);
  });
  await R.goto(); await H.sleep(3000);
  const res = {};
  for (const gap of [0, 30]) {
    res[gap] = await p.evaluate(async gap => {
      const w = ms => new Promise(r => setTimeout(r, ms)); const A = window.LowiWorldAudio, F = window.LowiFastStop;
      for (let i = 0; i < 24; i++) { if (A) (i % 2 ? A.close() : A.open()); if (F) (i % 2 ? closeSheet() : F.open()); if (gap) await w(gap); }
      if (A) A.open(); if (F) F.open();
      const snap = () => ({ cls: document.documentElement.classList.contains('sp-moving'), mv: window.LowiSpring.moving, run: [...(window.__spLive || [])].filter(s => s.moving).map(s => ({ v: +s.value.toFixed(4), t: s.target, vel: +s.velocity.toFixed(4), st: s.__st.slice(0, 300) })) });
      const out = [];
      for (const ms of [500, 1000, 1500, 3000, 6000]) { await w(ms - (out.length ? [500, 1000, 1500, 3000, 6000][out.length - 1] : 0)); out.push([ms, snap()]); }
      if (A) A.close(); if (F) closeSheet(); await w(1500); out.push(['closed+1500', snap()]);
      return out;
    }, gap);
  }
  console.log(JSON.stringify({ res, errs }, null, 1));
  await R.close();
})();
