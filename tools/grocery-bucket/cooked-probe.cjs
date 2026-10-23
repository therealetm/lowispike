'use strict';
/* Browser simulation (not a real phone) for grocery-4: log what was cooked from Today's groceries (text through logMeal, Snap photo), linked to bucket items.
   node tools/grocery-bucket/cooked-probe.cjs [--views se,i13,i15,pixel7] [--theme light|dark] [--langs en,de,es] [--url LIVE] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = arg('out', '/tmp/grocery-cooked-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sv = async (l, n) => { await l.evaluate(e => e.scrollIntoView({block:'center'})); await new Promise(r=>setTimeout(r,600)); const ok = await l.evaluate(e => { const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return {in: r.top >= 0 && r.bottom <= innerHeight, hit: !!(h && (e===h || e.contains(h))), by: h ? (h.id + '.' + String(h.className).slice(0,60) + ' < ' + (h.parentElement ? h.parentElement.className : '')).slice(0,160) : null, me: (e.className + ' ' + e.textContent).slice(0,60), top: Math.round(r.top), vh: innerHeight}; }); if (!ok.in || !ok.hit) throw new Error(n + ': not reachable ' + JSON.stringify(ok)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, '..', '..', 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], pixel7: ['chromium', 'Pixel 7'] };



const W = { en: ['What you cooked', 'Log it', 'Snap a photo', 'Which groceries went in?'], de: ['Was du gekocht hast', 'Eintragen', 'Foto machen', 'Welche Einkäufe sind drin?'], es: ['Lo que cocinaste', 'Registrar', 'Hacer foto', '¿Qué compras usaste?'] };
const PIX = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = arg('url', '') ? null : await serve();
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const theme = arg('theme', 'dark'), langs = arg('langs', 'en').split(',');
  let fail = 0;
  for (const v of arg('views', 'se,i13,i15,pixel7').split(',')) {
    const [eng, dev] = VIEWS[v], fails = [];
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { serviceWorkers: 'block' }));
    await ctx.addInitScript(t => { try { localStorage.setItem('lowi.theme', t); } catch (e) {} }, theme);
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    const ev = (fn, a) => page.evaluate(fn, a);
    try {
      await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiBucket && window.LowiBucketCore && window.LowiVitalsBridge && window.LowiMealJournal, null, { timeout: 150000 });
      await sleep(3000);
      if (!(await ev(() => typeof LowiBucketCore.addCooked === 'function' && typeof LowiBucket.logText === 'function'))) fails.push(v + ': grocery-4 code not loaded');
      for (const lang of langs) {
        const tag = `${v} ${theme} ${lang}`, w = W[lang];
        await ev(l => { try { LowiLang.set(l); } catch (e) {} try { LowiR2.closeAll(); } catch (e) {} document.querySelectorAll('.gt-ov,.mj-ov').forEach(o => o.remove());
          const C = LowiBucketCore; let s = { days: {} };
          [{ name: 'Bio Eier 10 Stück', verdict: 'ok', score: 8 }, { name: 'Feta Classic', brand: 'Salakis', verdict: 'ok', score: 6 }, { name: 'Rinder Hackfleisch', verdict: 'ok', score: 5 }, { name: 'Lachsfilet', verdict: 'ok', score: 4 }].forEach(p => { s = C.add(s, p); });
          C.save(s); }, lang); await sleep(500);
        await ev(() => LowiBucket.openToday()); await sleep(900);
        const ov = page.locator('.gt-ov').last();
        if (!(await ov.count())) { fails.push(tag + ': sheet did not open'); continue; }
        const txt = (await ov.innerText()).replace(/\s+/g, ' ');
        w.forEach(x => { if (!txt.includes(x)) fails.push(tag + ': missing "' + x + '"'); });
        const nChips = await ev(() => [...document.querySelectorAll('.gt-ov')].pop().querySelectorAll('.gt-chip').length); if (nChips !== 4) fails.push(tag + ': chips ' + nChips);
        // empty Log it asks for a name
        const dbg = await ev(() => { const ov = [...document.querySelectorAll('.gt-ov')].pop(), b = ov && ov.querySelector('.gt-logt'), out = [];
          for (let e = b; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility !== 'visible' || +c.opacity === 0) out.push(e.className + ':' + c.display + '/' + c.visibility + '/' + c.opacity); }
          return { ov: [...document.querySelectorAll('.gt-ov')].map(o => o.className + ':' + getComputedStyle(o).display), btn: !!b, rect: b ? JSON.stringify(b.getBoundingClientRect()) : '', hid: out, n: LowiR2.openCount(), bodyCls: document.body.className.slice(0, 120) }; });
        if (process.env.G4_DEBUG) console.log(tag + ' ' + JSON.stringify(dbg));
        const logBtn = page.locator('.gt-ov .gt-logt').last();
        await sv(logBtn, 'logBtn'); await logBtn.tap(); await sleep(300);
        const need = await ev(() => { const f = [...document.querySelectorAll('.gt-ov [data-gtc-form]')].pop(); return { inv: f.querySelector('[name="gtc"]').getAttribute('aria-invalid'), msg: f.querySelector('.gt-msg').textContent }; });
        if (need.inv !== 'true' || !need.msg) fails.push(tag + ': empty log not refused ' + JSON.stringify(need));
        // Cooked this on a suggestion fills the name and the groceries
        const did = page.locator('.gt-ov .gt-did').first();
        if (!(await did.count())) fails.push(tag + ': no Cooked this button');
        else { await sv(did, 'did'); await did.tap(); await sleep(500); }
        const fill = await ev(() => { const f = [...document.querySelectorAll('.gt-ov [data-gtc-form]')].pop(); return { name: f.querySelector('[name="gtc"]').value, checked: f.querySelectorAll('.gt-chip input:checked').length }; });
        if (!fill.name || !fill.checked) fails.push(tag + ': Cooked this did not fill ' + JSON.stringify(fill));
        const sizes = await ev(() => { const ov = [...document.querySelectorAll('.gt-ov')].pop(); return [...ov.querySelectorAll('.gt-chip span,.gt-did,.gt-logt,.gt-logp,.gt-what input')].filter(e => e.getBoundingClientRect().height < 44).map(e => e.className || e.tagName); });
        if (sizes.length) fails.push(tag + ': under 44 px ' + sizes.join(','));
        const inp = page.locator('.gt-ov [name="gtc"]').last();
        await inp.fill(fill.name + ' ' + lang + ' ' + v);
        await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-form.png`) });
        const before = await ev(() => LowiVitalsBridge.state().logs.length);
        await sv(logBtn, 'logBtn'); await logBtn.tap(); await sleep(900);
        const r = await ev(() => { const st = LowiVitalsBridge.state(), ov = [...document.querySelectorAll('.gt-ov')].pop(), C = LowiBucketCore, ck = C.cookedToday(C.load());
          const last = ck[ck.length - 1] || {}, log = st.logs.find(l => l.eventId === last.id);
          return { n: st.logs.length, via: log && log.via, t: log && log.t, used: (last.used || []).length, lvia: last.via, done: ov ? ov.querySelectorAll('.gt-done li').length : -1, thumb: ov ? ov.querySelectorAll('.gt-done .mj-thumb').length : -1,
            vw: innerWidth, sx: document.documentElement.scrollWidth, shW: ov ? ov.querySelector('.r2-sh').getBoundingClientRect().right : 0 }; });
        if (r.n !== before + 1 || r.via !== 'groceries' || r.lvia !== 'text') fails.push(tag + ': text meal not logged ' + JSON.stringify(r));
        if (!r.used) fails.push(tag + ': no bucket items linked');
        if (r.done !== 1 || r.thumb !== 1) fails.push(tag + ': cooked list ' + r.done + '/' + r.thumb);
        if (r.sx > r.vw + 1 || r.shW > r.vw + 1) fails.push(tag + ': sideways scroll');
        /* a meal that ends a running fast shows the app's fast reward first (same as any Log meal): close it like a person would */
        const rw = page.locator('#fstRw [data-fst="rw-close"]'); if (await rw.count()) { await rw.tap(); await sleep(800); }
        /* the same for the app's own reward sheets that a meal can fill (sun meter etc.): close the ones above Today's groceries */
        for (let i = 0; i < 4; i++) { const top = await ev(() => { const t = LowiR2.top(); return t ? t.className : ''; }); if (!top || top.includes('gt-ov')) break;
          const cta = page.locator('.r2-ov.on:not(.gt-ov) [data-ls="close"]').last(); if (await cta.count()) await cta.tap(); else await ev(() => LowiR2.back()); await sleep(700); }
        await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-logged.png`) });
        // the cooked meal opens in the meal journal
        const th = page.locator('.gt-ov .gt-done .mj-thumb').first();
        if (process.env.G4_DEBUG) console.log(tag + ' at thumb ' + JSON.stringify(await ev(() => ({ top: (LowiR2.top() || {}).className, n: LowiR2.openCount(), ovs: [...document.querySelectorAll('.r2-ov,[role=dialog]')].map(o => (o.className || o.id) + ':' + getComputedStyle(o).display).slice(0, 8), th: [...document.querySelectorAll('.gt-done .mj-thumb')].map(b => JSON.stringify(b.getBoundingClientRect())) }))));
        if (await th.count()) { await sv(th, 'th'); await sleep(400);
          const hit = await ev(() => { const b = document.querySelector('.gt-ov .gt-done .mj-thumb'), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [r.left, r.top, r.width, r.height].map(Math.round), hit: e ? (e.className || e.tagName) + '' : null, ok: !!(e && b.contains(e)) }; });
          if (!hit.ok) console.log('thumb hit ' + JSON.stringify(hit));
          await th.tap({ timeout: 8000 }); for (let k = 0; k < 12 && !(await ev(() => !!document.querySelector('.mj-ov .mj-sheet'))); k++) await sleep(400); if (!(await ev(() => !!document.querySelector('.mj-ov .mj-sheet')))) fails.push(tag + ': meal journal did not open'); }
        // Snap a photo: opens the app's own Snap; the photo meal that follows is linked
        await ev(() => { try { LowiR2.closeAll(); } catch (e) {} document.querySelectorAll('.gt-ov,.mj-ov').forEach(o => o.remove()); LowiBucket.openToday(); }); await sleep(1500);
        const chip = page.locator('.gt-ov .gt-chip').nth(1), chk = () => ev(() => [...document.querySelectorAll('.gt-ov')].pop().querySelectorAll('.gt-chip input:checked').length);
        await sv(chip, 'chip'); await sleep(400); await chip.tap(); await sleep(300);
        if ((await chk()) !== 1) { console.log(tag + ': chip tap retried'); await sleep(600); if ((await chk()) !== 1) { await chip.tap(); await sleep(300); } }
        if ((await chk()) !== 1) fails.push(tag + ': chip did not toggle');
        const snap = page.locator('.gt-ov .gt-logp').last(); await sv(snap, 'snap'); await snap.tap(); await sleep(1200);
        const cam = await ev(() => !!document.getElementById('ssFood'));
        if (!cam) fails.push(tag + ': Snap did not open');
        await ev(() => { const x = document.querySelector('#ssFood [data-sp="cancelCapture"]'); if (x) x.click(); }); await sleep(400);
        const pr = await ev(a => { const res = LowiVitalsBridge.logMeal({ id: 'probe-photo-' + Date.now(), t: 'Probe photo dish ' + a, via: 'photo' }); return !!(res && res.log); }, lang + ' ' + v);
        const pl = await ev(() => { const ck = LowiBucketCore.cookedToday(LowiBucketCore.load()); const l = ck[ck.length - 1] || {}; return { via: l.via, used: (l.used || []).length, n: ck.length }; });
        if (!pr || pl.via !== 'photo' || pl.used !== 1 || pl.n !== 2) fails.push(tag + ': photo meal not linked ' + JSON.stringify(pl));
        console.log((fails.some(f => f.startsWith(tag)) ? 'FAIL ' : 'ok   ') + tag + ' cooked=' + fill.name + ' linked=' + r.used + ' photo=' + pl.via);
      }
    } catch (e) { fails.push(v + ': ' + e.message.replace(/\s+/g, ' ').slice(0, 700)); }
    if (errs.length) fails.push(v + ': page errors ' + errs.slice(0, 3).join(' | '));
    fails.forEach(f => console.log('FAIL ' + f)); fail += fails.length;
    await browser.close();
  }
  if (srv) srv.close();
  console.log(fail ? 'PROBE FAIL ' + fail : 'PROBE PASS');
  process.exit(fail ? 1 : 0);
})();
