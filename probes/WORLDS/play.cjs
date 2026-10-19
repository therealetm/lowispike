'use strict';
/* Worlds playtest: enter each world, sample the guide every 300 ms (line, name, bubble rect vs screen / joystick / Misty),
   screenshot each new line, then leave. node play.cjs [--root DIR | --url URL] [--view chromium390|iphone13|ipadL] [--worlds liver,heart]
   [--who new|back] [--ms 30000] [--lang en] [--tapGuide 1] [--exit hub|x|map] */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs'), path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/home/sprite/WORLDS/out'); fs.mkdirSync(OUT, { recursive: true });
const VIEW = arg('view', 'chromium390'), WHO = arg('who', 'new'), TAG = arg('tag', 'p');
const WORLDS = arg('worlds', 'liver,heart,lung,brain,pancreas,gut,muscle').split(',');
const RPLOG = `window.__rp=[];addEventListener('lowi:region-pal',e=>{try{__rp.push(Object.assign({t:Math.round(performance.now())},e.detail))}catch(x){}});addEventListener('lowi:world-region',e=>{try{__rp.push({t:Math.round(performance.now()),region:e.detail.id})}catch(x){}});`;
const preNew = RPLOG + `try{localStorage.removeItem('lowi.guides.v1')}catch(e){}`;
const preBack = RPLOG + `try{if(!sessionStorage.getItem('wp.seeded')){sessionStorage.setItem('wp.seeded','1');const ids=['brain','lung','heart','liver','pancreas','gut','muscle'];const m={v:1,met:{},lastBack:-1,told:{},ok:{},since:{}};ids.forEach(i=>{m.met[i]=Date.now()-86400000;m.told[i]=[1,2];m.since[i]=1});localStorage.setItem('lowi.guides.v1',JSON.stringify(m));}}catch(e){}`;
function sample() {
  const R = e => { if (!e) return null; const q = e.getBoundingClientRect(); return q.width > 2 ? [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)] : null; };
  const ov = (a, b) => a && b ? Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])) : 0;
  const pal = document.getElementById('rpPal'), say = pal && pal.classList.contains('rp-talk') ? pal.querySelector('.rp-say') : null;
  const sr = R(say), pad = document.getElementById('whPad'), pr = R(pad);
  const MF = window.LowiMistyFlight, m = MF && MF.screen ? MF.screen() : null, mr = m ? [m.x - 40, m.y - 40, m.x + 40, m.y + 40] : null;
  let fs = null; if (say) { const t = say.querySelector('.rp-tx'); fs = t ? parseFloat(getComputedStyle(t).fontSize) : null; }
  const st = MF && MF.state ? MF.state() : {};
  return { cur: (() => { try { return LowiWorldRegions.current(); } catch (e) { return null; } })(), st: st.st, pal: pal ? pal.dataset.pal : null,
    name: say ? (say.querySelector('b') || {}).textContent : null, text: say ? (say.querySelector('.rp-tx') || {}).textContent : null,
    asking: !!(pal && pal.classList.contains('rp-asking')), dock: !!(pal && pal.classList.contains('rp-dock')), sr, fs,
    off: sr ? (sr[0] < 0 || sr[1] < 0 || sr[2] > innerWidth || sr[3] > innerHeight) : false,
    onPad: ov(sr, pr), onMisty: ov(sr, mr), padOp: pad ? +getComputedStyle(pad).opacity : null,
    hunt: (() => { try { const h = LowiMistyHunt.state(); return h.left; } catch (e) { return null; } })(),
    toasts: Array.from(document.querySelectorAll('.toast.show, #toast.show, .lp-praise.on, #lpPraise.on, .wh-hint.wh-say, #mhNudge.on')).map(e => (e.textContent || '').slice(0, 60)) };
}
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '/home/sprite/wt-worlds-playtest')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view: VIEW, settle: 6000, lang: arg('lang', 'en'), preInit: WHO === 'back' ? preBack : preNew }); const P = h.page;

  await P.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 150000 }).catch(() => { });
  const report = { view: VIEW, who: WHO, build: await P.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?')), worlds: {} };
  for (const w of WORLDS) {
    const t0 = Date.now();
    await P.evaluate(w => LowiWorldRegions.travel(w), w);
    await P.waitForFunction(w => { try { return LowiWorldRegions.current() === w && LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, w, { timeout: 240000, polling: 300 }).catch(() => { });
    const enterMs = Date.now() - t0;
    const lines = [], issues = new Set(); let last = null, n = 0, tapped = 0;
    const tEnd = Date.now() + +arg('ms', 30000);
    while (Date.now() < tEnd) {
      const s = await P.evaluate(sample);
      if (s.text && s.text !== last) {
        lines.push({ t: Math.round((Date.now() - t0 - enterMs) / 100) / 10, name: s.name, text: s.text, asking: s.asking, dock: s.dock, fs: s.fs });
        if (!process.env.NOSHOT) await P.screenshot({ path: `${OUT}/${TAG}-${VIEW}-${WHO}-${w}-${n++}.png` });
      }
      last = s.text || null;
      if (s.text && /Moss|Leaf|herb|Kraut|hierba/i.test(s.text)) issues.add('wrong name: ' + s.text);
      if (s.off) issues.add('bubble off screen ' + JSON.stringify(s.sr));
      if (s.onPad > 0) issues.add('bubble on joystick ' + s.onPad);
      if (s.onMisty > 900) issues.add('bubble on Misty ' + s.onMisty);
      if (s.fs && s.fs < 13) issues.add('small font ' + s.fs);
      if (s.toasts.length) issues.add('other text up: ' + s.toasts.join(' | '));
      if (s.cur !== w) issues.add('left the world on its own: ' + s.cur + '/' + s.st);
      if (arg('tapGuide', '') && !tapped && Date.now() > t0 + enterMs + 12000) { tapped = 1; await P.evaluate(() => { const b = document.querySelector('#rpPal .rp-body'); if (b) b.click(); }); }
      if (arg('answer', '') && s.asking) { await L.sleep(1500); await P.evaluate(y => { const b = document.querySelector(y === 'yes' ? '#rpPal .rp-yes' : '#rpPal .rp-no'); if (b) b.click(); }, arg('answer', '')); }
      await L.sleep(300);
    }
    report.rp = await P.evaluate(() => window.__rp.splice(0)); console.log('RP', JSON.stringify(report.rp.map(x => x.region ? x.t + ' REGION ' + x.region : x.t + ' ' + x.kind + ' ' + x.line + ' ' + (x.text || '').slice(0, 50))));
    const texts = lines.map(x => x.text); const dup = texts.filter((x, i) => texts.indexOf(x) !== i);
    if (dup.length) issues.add('repeated lines: ' + dup.join(' | '));
    const ex = arg('exit', 'hub'), tx = Date.now();
    if (ex === 'x') await P.evaluate(() => { const b = document.querySelector('.bw3-full .bw3-x, .bw3-close, [data-act=close-world], .bwr-x'); if (b) b.click(); return b && (b.className || b.id); });
    else await P.evaluate(() => LowiWorldRegions.travel('hub'));
    await P.waitForFunction(() => { try { return LowiWorldRegions.current() === 'hub' && LowiMistyFlight.state().st !== 'warp'; } catch (e) { return false; } }, null, { timeout: 240000, polling: 300 }).catch(() => { });
    await L.sleep(2500);
    const after = await P.evaluate(() => ({ cur: LowiWorldRegions.current(), st: LowiMistyFlight.state().st, pal: !!document.getElementById('rpPal'), cls: document.documentElement.className.split(' ').filter(c => /away|mapview|bwr|lw-/.test(c)).join(' ') }));
    if (after.pal) issues.add('guide still on screen after leaving');
    report.worlds[w] = { enterMs, exitMs: Date.now() - tx, lines, issues: [...issues], after };
    console.log(JSON.stringify({ w, enterMs, exitMs: Date.now() - tx, lines: lines.map(x => x.t + 's ' + (x.asking ? '[ASK] ' : '') + x.name + ': ' + x.text.slice(0, 110)), issues: [...issues], after }));
  }
  const s = await L.snap(h); report.errors = [...h.log.pageerror, ...s.err, ...s.rej]; report.console = h.log.console.slice(0, 8); report.stalls = s.stalls.slice(0, 10);
  console.log('ERRORS', JSON.stringify(report.errors), 'CONSOLE', JSON.stringify(report.console));
  fs.writeFileSync(`${OUT}/${TAG}-${VIEW}-${WHO}.json`, JSON.stringify(report, null, 1));
  await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
