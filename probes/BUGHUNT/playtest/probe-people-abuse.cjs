/* Run 26: abuse People > Online right now (live 20261025-201810+). Fake Supabase (tools/sim/mock-cloud.cjs): nothing real is touched.
   Triple tap on 'here now', presence churn while People is open, a person leaving while their card is open, language switch while open,
   close/reopen. Prints one JSON line per step.  node probe-people-abuse.cjs [base-url] [chromium|webkit] */
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const WT = fs.readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const pw = require('/tmp/pw/node_modules/playwright');
const cloud = require(WT + '/tools/sim/mock-cloud.cjs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let base = process.argv[2] || '', srv = null; const eng = process.argv[3] || 'chromium'; const SHORT = !!process.env.SHORT;
  if (!base || !/^https?:/.test(base)) { const ROOT = base || WT; srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); }); await new Promise(ok => srv.listen(0, ok)); base = 'http://localhost:' + srv.address().port + '/'; }
  const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } : {});
  const ctx = await browser.newContext(Object.assign(eng === 'webkit' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { serviceWorkers: 'block' }));
  const host = new URL(base).host;
  await ctx.route(u => { try { const x = new URL(u); return !(x.protocol === 'data:' || x.protocol === 'blob:' || x.host === host || x.host.endsWith('.supabase.co')); } catch (e) { return true; } }, r => r.abort());
  const sim = await cloud.install(ctx, { members: 30, messages: 20, me: 'Emmanuel' });
  await ctx.addInitScript(() => { try { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '1990-08-01' }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang: 'en' } })); } catch (e) {} });
  /* the mock's unseatAll sends leaves without phx_ref (the client cannot match them): seat/leave here with stable refs */
  const T = 'realtime:lowi-room-all', PM = () => { let m = sim.presence.get(T); if (!m) { m = new Map(); sim.presence.set(T, m); } return m; };
  const send = (joins, leaves) => { for (const [t, v] of sim.topics) if (t === T) { try { v.ws.send(JSON.stringify([v.jr, null, t, 'presence_diff', { joins, leaves }])); } catch (e) { } } };
  sim.seat = (room, n) => { const m = PM(), joins = {}; let i = 0; for (const o of sim.W.others) { if (i >= n) break; i++; if (m.has(o.id)) continue; const meta = { at: Date.now() - 600000 + i, phx_ref: 'p' + o.id.slice(-8) }; m.set(o.id, meta); joins[o.id] = { metas: [meta] }; } send(joins, {}); return m.size; };
  sim.unseatAll = () => { const m = PM(), leaves = {}; for (const [k, meta] of m) leaves[k] = { metas: [meta] }; m.clear(); send({}, leaves); };
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.stack || e.message).split('\n').slice(0, 2).join(' | ').slice(0, 260)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(base + '?pa=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.LowiPeopleDir && window.LowiPeopleDir.here && window.LOWI_CLOUD && window.LowiRooms && window.goTab, null, { timeout: 90000 }).catch(() => {});
  await page.waitForFunction(() => LOWI_CLOUD.live && LOWI_CLOUD.live() && (LOWI_CLOUD.people() || []).length > 10, null, { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} goTab('foryou'); });
  await page.waitForFunction(() => window.LowiRooms.status() === 'in', null, { timeout: 30000 }).catch(() => {});
  sim.seat('all', 2);
  await page.waitForFunction(() => window.LowiRooms.members().length >= 3, null, { timeout: 15000 }).catch(() => {});
  await sleep(2500);
  await page.waitForFunction(() => { const lv = document.querySelector('.rm-live'); if (!lv) return false; const r = lv.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && e.closest('.rm-live')); }, null, { timeout: 30000 }).catch(() => {});
  const state = () => page.evaluate(() => { const ovs = [...document.querySelectorAll('.pd-ov')]; const ov = ovs[ovs.length - 1]; const here = ov ? [...ov.querySelectorAll('.pd-here .pd-n')].map(e => e.textContent) : [];
    const lv = document.querySelector('.rm-live'); const m = lv && lv.textContent.match(/(\d+)/); const all = ov ? [...ov.querySelectorAll('.pd-row .pd-n')].map(e => e.textContent) : [];
    const dup = all.filter((x, i) => all.indexOf(x) !== i); const secs = ov ? [...ov.querySelectorAll('.pd-sec h3')].map(e => e.textContent) : [];
    return { sheets: ovs.length, cards: document.querySelectorAll('.cs-overlay').length, here: here.length, head: m ? +m[1] : -1, headTxt: lv ? lv.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : '', members: LowiRooms.members().length, count: LowiPeopleDir.here().count, dup: dup.slice(0, 5), secs, active: (document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName) + '').slice(0, 40), lang: document.documentElement.lang }; });
  const out = [];
  const step = async (name, fn) => { let r = {}; try { r = (await fn()) || {}; } catch (e) { r = { threw: String(e.message).slice(0, 200) }; } const s = await state(); const row = Object.assign({ step: name }, r, s, errs.length ? { errs: errs.splice(0) } : {}); out.push(row); console.log(JSON.stringify(row)); return row; };
  const tapLive = async (n, gap) => { const r = await page.evaluate(() => { const b = document.querySelector('.rm-live').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); for (let i = 0; i < n; i++) { await page.mouse.click(r.x, r.y); if (gap) await sleep(gap); } };
  if (process.env.R2CHECK) { const out = {};
    for (const [name, wait] of [['scrimAt60ms', 60], ['scrimAt700ms', 700]]) { await page.evaluate(() => { LowiR2.closeAll(); LowiR2.sheet('<p style="height:200px">probe</p>', {}); }); await sleep(wait); await page.mouse.click(195, 40); await sleep(900); out[name] = await page.evaluate(() => document.querySelectorAll('.r2-ov.on').length); }
    await page.evaluate(() => { LowiR2.closeAll(); LowiR2.sheet('<button id="pb" style="padding:20px" onclick="window.__pb=(window.__pb||0)+1">b</button>', {}); }); await sleep(120);
    const bb = await page.locator('#pb').boundingBox(); out.hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.id || e.className); }, [bb.x + 10, bb.y + 10]); await page.mouse.click(bb.x + 10, bb.y + 10); await sleep(300); out.btnAt120ms = await page.evaluate(() => window.__pb || 0);
    console.log('R2CHECK ' + JSON.stringify(out), errs); await browser.close(); if (srv) srv.close(); return; }
  if (process.env.GAPS) { for (const g of process.env.GAPS.split(',').map(Number)) { for (let k = 0; k < 2; k++) { await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiPeopleDir.close(); } catch (e) {} }); await sleep(900);
      await step('double tap gap ' + g + ' try ' + k, async () => { const t0 = Date.now(); await tapLive(g < 0 ? 1 : 2, Math.max(g, 0)); const dt = Date.now() - t0; await sleep(1500); return { dt }; }); } }
    await browser.close(); if (srv) srv.close(); return; }
  await step('start', () => ({}));
  await step('triple tap here-now (0ms gaps)', async () => { await tapLive(3, 0); await sleep(1500); });
  await step('escape x1', async () => { await page.keyboard.press('Escape'); await sleep(1200); });
  await step('single tap after escape', async () => { await tapLive(1, 0); await sleep(1500); });
  await step('escape x1 (b)', async () => { await page.keyboard.press('Escape'); await sleep(1200); });
  await step('double tap here-now (60ms)', async () => { await tapLive(2, 60); await sleep(1500); });
  await step('escape x1 (c)', async () => { await page.keyboard.press('Escape'); await sleep(1200); });
  await step('double tap here-now (250ms)', async () => { await tapLive(2, 250); await sleep(1500); });
  await step('single tap (d)', async () => { await tapLive(1, 0); await sleep(1500); });
  if (SHORT) { await browser.close(); if (srv) srv.close(); return; }
  await step('presence churn x25 while open', async () => { for (let i = 0; i < 25; i++) { if (i % 3 === 2) sim.unseatAll('all'); else sim.seat('all', 1 + (i * 7) % 12); await sleep(40); } sim.seat('all', 6); await sleep(2500); });
  await step('settle 2s', async () => { await sleep(2000); });
  await step('open first online person card', async () => { const loc = page.locator('.pd-ov .pd-here:not([data-me])').first(); const bb = await loc.boundingBox(); if (!bb) return { noRow: true }; await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(1500); });
  await step('everyone leaves while card open', async () => { sim.unseatAll('all'); await sleep(2500); });
  await step('escape (card)', async () => { await page.keyboard.press('Escape'); await sleep(1000); });
  await step('lang de while People open', async () => { await page.evaluate(() => LowiLang.set('de')); await sleep(2000); });
  await step('seat 4 in de', async () => { sim.seat('all', 4); await sleep(2500); });
  await step('lang en', async () => { await page.evaluate(() => LowiLang.set('en')); await sleep(2000); });
  await step('escape x1 again', async () => { await page.keyboard.press('Escape'); await sleep(1200); });
  await step('hidden tab 3s + churn, then back', async () => { await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }); sim.unseatAll('all'); sim.seat('all', 3); await sleep(3000); await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(3000); });
  await step('reopen once (fresh foryou)', async () => { await page.evaluate(() => goTab('foryou')); await sleep(2500); await tapLive(1, 0); await sleep(1500); });
  await step('reopen once', async () => { await tapLive(1, 0); await sleep(1500); });
  console.log('SUMMARY ' + JSON.stringify({ eng, bad: out.filter(r => r.errs || r.sheets > 1 || (r.sheets && r.here !== r.head) || (r.dup && r.dup.length)).map(r => r.step) }));
  await browser.close(); if (srv) srv.close();
})();
