#!/usr/bin/env node
/* Live repeat of the Oct 22 report (Seven): Cook > Products > Shuffle opened a "Your pick" sheet saying "No low-spike products to
   shuffle yet". A fresh device with no catches and no shared dex opens Cook, taps Products, waits (no sheet may pop up, no empty
   card), taps Shuffle and must land on a real low-spike product from the shop range; then Shuffle again lands on one too.
   ISOLATED: only GET requests to the app's own host pass (Supabase and other hosts aborted), so the shop range is the only source.
   node tests/shuffle-catalog-live.cjs [--url https://therealetm.github.io/lowispike/] [--device "iPhone 13"] [--theme day|night] [--lang en|de|es] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..')), URL0 = arg('url', ''), DEV = arg('device', 'iPhone 13'), THEME = arg('theme', 'night'), LANG = arg('lang', 'en');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }

(async () => {
    let srv = null, url = URL0;
    if (!url) { srv = await serve(); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const d = pw.devices[DEV] || pw.devices['iPhone 13'], engine = /Pixel|Galaxy/.test(DEV) ? 'chromium' : 'webkit';
    const browser = await pw[engine].launch();
    const ctx = await browser.newContext(Object.assign({}, d, { serviceWorkers: 'block' }));
    const host = new URL(url).host;
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(([theme, lang]) => { try {
        const t = new Date(); localStorage.setItem('lowi.daily.seen', t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'));
        sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
        localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
        localStorage.setItem('lowi.cook.src', 'book'); localStorage.setItem('lowi.lang', lang); localStorage.setItem('lowi.theme', theme);
    } catch (e) { } }, [THEME, LANG]);
    const page = await ctx.newPage(), errs = [], fails = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiScanSort && window.LowiScanSort.catalog, null, { timeout: 90000 });
    await sleep(4000);
    await page.evaluate(() => { document.querySelectorAll('.r2-ov,.g2-ov,.tut-ov,[role=dialog]').forEach(n => { try { n.remove(); } catch (e) { } }); goTab('shelf'); });
    await sleep(1500);
    const tap = sel => page.evaluate(sel => { const b = [...document.querySelectorAll(sel)].find(b => b.getBoundingClientRect().width > 0); if (!b) return false; b.click(); return true; }, sel);
    if (!await tap('#ckBar [data-ck="src"][data-v="products"]')) fails.push('Products tab not found');
    await sleep(2500);
    const s1 = await page.evaluate(() => ({ empty: !!document.querySelector('.ck-pempty'), sheet: [...document.querySelectorAll('.g2-pt')].map(n => n.textContent).join('|'), text: (document.body.innerText.match(/No low-spike products|Noch keine Low-Spike|A\u00fan no hay productos/) || [''])[0] }));
    if (s1.empty || s1.text) fails.push('empty state after opening Products ' + JSON.stringify(s1));
    if (!await tap('#r5Go')) fails.push('Shuffle button not found');
    await sleep(3500);
    const pick = () => page.evaluate(() => { const c = document.querySelector('#r5Pick .r5-card, .g2-ov .r5-card'); const n = document.querySelector('#r5Pick .r5-cn, .g2-ov .r5-cn');
        return { card: !!c, empty: !!document.querySelector('.ck-pempty'), name: n ? n.textContent.trim() : '', verdict: (document.querySelector('#r5Pick .b3-vb, .g2-ov .b3-vb') || {}).className || '', pool: (() => { try { return document.querySelectorAll('#r5Strip .r5-cell').length; } catch (e) { return 0; } })() }; });
    const p1 = await pick();
    if (!p1.name || p1.empty || /v-spike/.test(p1.verdict)) fails.push('first shuffle ' + JSON.stringify(p1));
    await page.evaluate(() => { document.querySelectorAll('.g2-ov').forEach(n => { const x = n.querySelector('[data-act="close-sheet"],.xbtn,.r2-x'); if (x) x.click(); }); });
    await sleep(800);
    await tap('#r5Go'); await sleep(3500);
    const p2 = await pick();
    if (!p2.name || p2.empty || /v-spike/.test(p2.verdict)) fails.push('second shuffle ' + JSON.stringify(p2));
    const ok = !fails.length && !errs.length;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + DEV + ' ' + THEME + ' ' + LANG + ': picks "' + p1.name + '", "' + p2.name + '"' + (fails.length ? ' | ' + fails.join(' | ') : '') + (errs.length ? ' | errors: ' + errs.join(' ; ') : ''));
    await browser.close(); if (srv) srv.close();
    process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FAIL', e && e.message); process.exit(1); });
