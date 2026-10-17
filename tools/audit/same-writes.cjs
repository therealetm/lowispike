#!/usr/bin/env node
/* LOWiSPIKE audit: who still writes the SAME value into the page. The Oct 18 crash/heat fixes (f93d0d7, 45141bc) were all
   this one bug class: a write that changes nothing still queues a mutation record, which wakes every MutationObserver
   watching that part of the page, which writes again. This lists the remaining same-value writers per screen, by script
   line, so the same class of bug can be found everywhere instead of one screen at a time.
   Harmless no-ops are NOT counted: classList.toggle that changes nothing queues no record (DOM spec), so it is skipped.
   Counted: setAttribute with the current value, classList.add of a class already there / remove of one not there,
   style.setProperty or style.x with the current value, textContent/innerHTML/className with the current value.
   Isolation as in nav-audit.cjs: only GETs to the local server; everything else (all of *.supabase.co) is aborted.
   Usage: node tools/audit/same-writes.cjs [--engine chromium|webkit] [--out f.json]   (desktop engine, not an iPhone) */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const CHECK = String(arg('check', '') || '').split(',').filter(Boolean); /* files that must have NO same-value writes */
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), ENGINE = arg('engine', 'chromium'), OUT = arg('out', '');
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const PROBE = `(() => { if (window.__sw) return; const S = window.__sw = { by: Object.create(null), all: 0, same: 0 };
  const caller = () => { const s = (new Error().stack || '').split('\\n').slice(3), out = []; for (const l of s) { const m = l.match(/([\\w.-]+\\.(?:js|html))(?:\\?[^:]*)?:(\\d+)/); if (m) { out.push(m[1] + ':' + m[2]); if (out.length === 3) break; } } return out.join(' < ') || '?'; };
  const rec = (kind, same) => { S.all++; if (!same) return; S.same++; const k = kind + ' ' + caller(); S.by[k] = (S.by[k] || 0) + 1; };
  const sa = Element.prototype.setAttribute; Element.prototype.setAttribute = function (n, v) { rec('attr:' + n, this.getAttribute(n) === String(v)); return sa.call(this, n, v); };
  const ad = DOMTokenList.prototype.add; DOMTokenList.prototype.add = function () { const same = [...arguments].every(c => this.contains(c)); rec('class.add', same); return ad.apply(this, arguments); };
  const rm = DOMTokenList.prototype.remove; DOMTokenList.prototype.remove = function () { const same = [...arguments].every(c => !this.contains(c)) && this.value !== ''; rec('class.remove', same); return rm.apply(this, arguments); };
  const hook = (P, prop, kind) => { const d = Object.getOwnPropertyDescriptor(P, prop); if (!d || !d.set) return; Object.defineProperty(P, prop, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { let same = false; try { same = d.get.call(this) === String(v); } catch (e) { } rec(kind, same); d.set.call(this, v); } }); };
  hook(Node.prototype, 'textContent', 'text'); hook(Element.prototype, 'innerHTML', 'html'); hook(Element.prototype, 'className', 'className');
  const sp = CSSStyleDeclaration.prototype.setProperty; CSSStyleDeclaration.prototype.setProperty = function (n, v) { rec('style:' + n, this.getPropertyValue(n) === String(v)); return sp.apply(this, arguments); };
  ['transform', 'opacity', 'left', 'top', 'width', 'height', 'display'].forEach(p => hook(CSSStyleDeclaration.prototype, p, 'style.' + p));
  S.snap = () => ({ t: performance.now(), all: S.all, same: S.same, by: Object.assign({}, S.by) });
})();`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.wasm': 'application/wasm' };
const serve = () => new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    const browser = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
    const dev = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    const blocked = {};
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); const k = q.method() + ' ' + u.host; blocked[k] = (blocked[k] || 0) + 1; return r.abort(); });
    await ctx.addInitScript(() => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Audit', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] })); } catch (e) { } });
    await ctx.addInitScript({ content: PROBE });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
    await sleep(8000);
    const ev = (fn, a) => page.evaluate(fn, a).catch(e => 'ERR ' + e.message.slice(0, 120));
    const out = {};
    async function measure(name, act, hold) {
        const a = await page.evaluate(() => __sw.snap()); if (act) await act(); await sleep(hold); const b = await page.evaluate(() => __sw.snap());
        const sec = (b.t - a.t) / 1000, by = {}; Object.keys(b.by).forEach(k => { const d = b.by[k] - (a.by[k] || 0); if (d > 0) by[k] = +(d / sec).toFixed(1); });
        out[name] = { sameWritesPerSec: +((b.same - a.same) / sec).toFixed(1), allWritesPerSec: +((b.all - a.all) / sec).toFixed(1), top: Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 12) };
        console.log(name.padEnd(18), 'same/s', out[name].sameWritesPerSec, 'of', out[name].allWritesPerSec); out[name].top.slice(0, 8).forEach(([k, v]) => console.log('    ', String(v).padStart(6), k));
    }
    await measure('home-idle', null, 6000);
    await measure('care-board', () => ev(() => { goTab('move'); setTimeout(() => window.LowiNavMoves && LowiNavMoves.open('lb'), 400); }), 6000);
    await measure('care-toggle', async () => { for (let i = 0; i < 8; i++) { await ev(k => { const b = document.querySelector('[data-r3lb="' + k + '"]'); if (b) b.click(); }, i % 2 ? 'w' : 'm'); await sleep(350); } }, 1000);
    await measure('cook', () => ev(() => goTab('shelf')), 6000);
    await measure('community', () => ev(() => goTab('foryou')), 6000);
    await measure('home-again', () => ev(() => goTab('home')), 6000);
    await ev(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await measure('hidden', null, 5000);
    await ev(() => { delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); });
    await measure('visible-again', null, 5000);
    const result = { engine: ENGINE, commit: (() => { try { return require('child_process').execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return 'not a git tree'; } })(), when: new Date().toISOString(), scenarios: out, blocked, pageErrors: [...new Set(errs)] };
    console.log('blocked', JSON.stringify(blocked), 'errors', JSON.stringify(result.pageErrors));
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
    await browser.close(); srv.close();
    if (CHECK.length) {
        const bad = []; Object.entries(out).forEach(([sc, r]) => r.top.forEach(([k, v]) => { if (CHECK.some(f => k.split(' < ')[0].includes(' ' + f + ':'))) bad.push(sc + ': ' + v + '/s ' + k); }));
        if (bad.length) { console.log('CHECK FAILED: same-value writes from guarded files\n  ' + bad.join('\n  ')); process.exit(2); }
        console.log('CHECK OK: no same-value writes from ' + CHECK.join(', '));
    }
})().catch(e => { console.error('SAME-WRITES FAILED', e); process.exit(1); });
