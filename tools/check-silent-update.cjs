'use strict';
/* Oct 26: a newer build never puts "I've got something new for you!" / "New version" / "Update loaded" on screen, and after
   10+ minutes away it loads quietly. node tools/check-silent-update.cjs <root|url> <chromium|webkit> [loud] [--away]
   loud: what the served version.json says in "loud" (default 20000101-000000; "none" leaves it out, "new" = the newer build). */
const H = require('./sim/harness.cjs');
const where = process.argv[2] || '.', eng = process.argv[3] || 'chromium', loudArg = process.argv[4] || '20000101-000000', away = process.argv.includes('--away');
const live = /^https?:/.test(where), NEWER = '20991231-235959';
(async () => {
  const o = { engine: eng, members: 4, messages: 4, probe: false }; if (live) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page; await P.setViewportSize({ width: 390, height: 844 });
  await R.ctx.addInitScript(() => { let off = 0; const n = Date.now.bind(Date); Date.now = () => n() + off; window.__adv = ms => { off += ms; }; });
  await P.route(u => /version\.json/.test(String(u)), async r => {
    let v = {}; try { const res = await r.fetch(); v = JSON.parse(await res.text()); } catch (e) { }
    const out = { build: NEWER }; if (loudArg !== 'none') out.loud = loudArg === 'new' ? NEWER : loudArg;
    Object.keys(v).forEach(k => { if (k !== 'build' && k !== 'loud') out[k] = v[k]; });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  let navs = 0; P.on('framenavigated', f => { if (f === P.mainFrame()) navs++; });
  await R.goto(); await H.sleep(6000);
  const look = () => P.evaluate(() => { const t = document.body.innerText || ''; return { banner: !!document.getElementById('lcUpd'), ok: !!document.getElementById('lcUpdOk'), something: /something new for you|etwas Neues für dich|algo nuevo para ti/i.test(t), loaded: /Update loaded|Update geladen|Actualización cargada/i.test(t), url: location.search, build: (document.querySelector('meta[name="lowi-build"]') || {}).content }; });
  const vis = st => P.evaluate(s => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s }); document.dispatchEvent(new Event('visibilitychange')); }, st);
  await vis('hidden'); await H.sleep(300); await vis('visible'); await H.sleep(4000);
  console.log('short break', JSON.stringify(await look()));
  await P.evaluate(() => window.dispatchEvent(new Event('focus'))); await H.sleep(62000);
  console.log('after a minute', JSON.stringify(await look()));
  if (away) {
    const before = navs; await vis('hidden'); await P.evaluate(() => window.__adv(11 * 60 * 1000)); await vis('visible');
    await H.sleep(9000); console.log('back after 11 min', JSON.stringify(Object.assign(await look(), { reloaded: navs > before })));
    await H.sleep(5000); console.log('settled', JSON.stringify(await look()));
  }
  console.log('errs', JSON.stringify(R.errs.slice(0, 3)));
  await R.close();
})();
