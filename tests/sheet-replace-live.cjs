#!/usr/bin/env node
/* Live walk for the Oct 22 report (Seven, 14:48): "Multiple times when I click something, something opens, but when I exit down
   there's another thing behind it ... Fix that error on all presses, on all pages." (Fuel sheet > Log a meal > X left Fuel behind.)
   Rule (LowiR2.sheet / R2.adopt in index.html): a sheet opened from a sheet replaces it; closing it (X, swipe, backdrop, Escape,
   back) lands on the page underneath with zero sheets open and the page tappable; the back chevron brings the parent back.
   Walks every sheet-to-sheet path on Home, Misty, Today's stats, the profile hub, Log a meal and the shared shell, each with a
   different way of closing, then checks nothing is left: no visible layer, no parked sheet, no scroll lock, the middle of the
   screen is the page. ISOLATED: only GET requests to the app's own host pass.
   node tests/sheet-replace-live.cjs [--url https://therealetm.github.io/lowispike/] [--device "iPhone 13"] [--theme day|night] [--lang en|de|es] [--shots DIR] [--verbose 1] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SHOTS = arg('shots', ''), VERBOSE = arg('verbose', '');
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
    } catch (e) { } }, [THEME === 'day' ? 'light' : THEME === 'night' ? 'dark' : THEME, LANG]);
    const page = await ctx.newPage(), errs = [], fails = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiR2 && window.LowiR2.sheet && document.querySelector('#whHud .wh-meals'), null, { timeout: 120000 });
    await sleep(4000);
    await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } document.querySelectorAll('.tut-ov, #ltTour').forEach(n => { try { n.remove(); } catch (e) { } }); try { goTab('home'); } catch (e) { } });
    await sleep(1500);
    /* what is open: every sheet / page layer that can be seen, and whether the middle of the screen is a sheet or the page */
    const state = () => page.evaluate(() => {
        const SEL = '.r2-ov:not(.off), body > .cf-ov, body > .gv-ov, body > .fe-ov:not(.out), body > .hs-ov, body > .cr-ov, body > .stp-ov, body > .wj-ov, body > .yd-ov:not(.yd-out), body > .bs-ov, #sheetwrap.open';
        const seen = el => { if (!el.isConnected) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const open = [...document.querySelectorAll(SEL)].filter(seen);
        const hit = document.elementFromPoint(innerWidth / 2, innerHeight * 0.3);
        const blocked = !!(hit && hit.closest('.r2-ov, .cf-ov, .gv-ov, .fe-ov, .hs-ov, .cr-ov, .stp-ov, .wj-ov, .yd-ov, .bs-ov, #sheetwrap.open'));
        const name = el => (el.className || el.id || '').toString().split(' ').filter(c => /-ov|full|sheetwrap/.test(c) || el.id).slice(0, 3).join('.') + ':' + ((el.querySelector('h1,h2,h3,.h2,.cf-h,b') || {}).textContent || '').trim().slice(0, 24);
        return { n: open.length, names: open.map(name), parked: document.querySelectorAll('.r2-parked').length, stack: (window.LowiR2 && LowiR2.openCount) ? LowiR2.openCount() : -1,
            back: open.length ? !!open[open.length - 1].querySelector('.r2-pback') : false, blocked, ovf: getComputedStyle(document.documentElement).overflow + '/' + getComputedStyle(document.body).overflow,
            feUp: document.documentElement.classList.contains('fe-up') };
    });
    const base = await state();
    const run = (fn, arg) => page.evaluate(new Function('arg', 'try { return (' + fn + ')(arg); } catch (e) { return "ERR " + e.message; }'), arg);
    /* tap a control in the top layer by selector or by its words */
    const tapIn = (q) => page.evaluate(q => {
        const tops = [...document.querySelectorAll('.r2-ov:not(.off):not(.r2-parked), body > .cf-ov, body > .gv-ov, body > .fe-ov, body > .hs-ov, body > .stp-ov, body > .wj-ov, body > .yd-ov, body > .bs-ov')].filter(e => getComputedStyle(e).display !== 'none');
        const top = tops[tops.length - 1]; if (!top) return 'no layer';
        const all = [...top.querySelectorAll(q.sel || 'button, [role=button], a, .cme-tile, .cme-row')].filter(b => b.getBoundingClientRect().width > 0);
        const b = q.text ? all.find(b => new RegExp(q.text, 'i').test(b.textContent.trim())) : all[0];
        if (!b) return 'no control ' + (q.sel || q.text);
        b.click(); return 'ok';
    }, q);
    const closeBy = async how => {
        if (how === 'x') return page.evaluate(() => { const tops = [...document.querySelectorAll('.r2-ov:not(.off):not(.r2-parked), body > .cf-ov, body > .gv-ov, body > .fe-ov, body > .hs-ov, body > .stp-ov, body > .wj-ov, body > .yd-ov, body > .bs-ov')].filter(e => getComputedStyle(e).display !== 'none'); const t = tops[tops.length - 1]; if (!t) return 'none';
            const wx = document.getElementById('whX'); const x = [...t.querySelectorAll("[data-r2='close'], [data-cf='close'], .cf-x, [data-gv='close'], [data-fe='close'], [data-shop='close'], [data-stp='close'], [data-wj='close'], [data-yd='close'], [data-bs='close'], [aria-label='Close'], [aria-label='Schlie\u00dfen'], [aria-label='Cerrar'], [aria-label='Back'], [aria-label='Zur\u00fcck'], [aria-label='Atr\u00e1s']")].filter(b => !b.classList.contains('r2-pback'))[0];
            if (x && x.getBoundingClientRect().width > 0) { x.click(); return 'x'; } if (wx && wx.getBoundingClientRect().width > 0) { wx.click(); return 'whX'; } if (x) { x.click(); return 'x-hidden'; } return 'no x'; });
        if (how === 'scrim') return page.evaluate(() => { const t = [...document.querySelectorAll('.r2-ov:not(.off):not(.r2-parked)')].pop(); const s = t && t.querySelector('.r2-scrim'); if (!s) return 'no scrim'; s.click(); return 'scrim'; });
        if (how === 'escape') { await page.keyboard.press('Escape'); return 'escape'; }
        if (how === 'back') return page.evaluate(() => { const t = [...document.querySelectorAll('.r2-pback')].filter(b => b.getBoundingClientRect().width > 0).pop(); if (!t) return 'no chevron'; t.click(); return 'chevron'; });
        if (how === 'swipe') return page.evaluate(() => { const t = [...document.querySelectorAll('.r2-ov:not(.off):not(.r2-parked)')].pop(); if (!t) return 'none'; window.LowiR2.close(t); return 'swipe->R2.close'; });
    };
    /* every sheet-to-sheet path: open the first, open the second from inside it, close the second, nothing may be left */
    const L = '(Log a meal|Essen eintragen|Mahlzeit eintragen|Registrar comida)';
    const PATHS = [
        { id: 'Fuel sheet > Log a meal', open: "() => { const b = document.querySelector('#whHud .wh-meals'); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true })); return !!b; }", child: { text: '^' + L + '$' } },
        { id: "Today's stats > Log a meal", open: '() => LowiNutriStats.open()', child: { sel: '[data-ns="log"]' } },
        { id: "Misty's sheet > Forms", open: '() => LowiMistyHub.open()', child: { sel: '[data-mh="forms"]' }, back: true },
        { id: "Misty's sheet > Glow", open: '() => LowiMistyHub.open()', child: { sel: '[data-mh="glow"], [data-mh="aura"]' }, back: true },
        { id: 'Profile hub > Weight journey', open: "() => { const k = Object.keys(window).find(k => /^Lowi(CommunityMe|Me|ProfileHub)$/.test(k)); return k && window[k].open(); }", child: { text: '(Weight journey|Gewichtsverlauf|Gewichtsreise|Evoluci\u00f3n|Peso)' } },
        { id: 'Gap sheet > last meal time', open: "() => { const k = Object.keys(window).find(k => /^LowiGap/.test(k) && window[k] && window[k].open); return k && (window[k].open(), true); }", child: { sel: '[data-gv="fix"]' }, back: true },
        { id: 'Gap sheet > Log a meal', open: "() => { const k = Object.keys(window).find(k => /^LowiGap/.test(k) && window[k] && window[k].open); return k && (window[k].open(), true); }", child: { sel: '[data-gv="log"]' } },
        { id: 'Move sheet > pick a move', open: '() => LowiMoveBubble.edit()', child: { sel: '[data-wm="pick"]' } },
        { id: 'Sheet > sheet (any two, shared shell)', open: "() => !!LowiR2.sheet('<h3>Parent</h3><button id=sxKid type=button>Open child</button>', { cls: 'sx-a one-sheet' })", child: { sel: '#sxKid' }, kid: "() => document.getElementById('sxKid').addEventListener('click', () => LowiR2.sheet('<h3>Child</h3>', { cls: 'sx-b one-sheet' }))", back: true }
    ];
    const HOWS = ['x', 'scrim', 'escape', 'swipe'];
    const rows = [];
    let k = 0;
    for (const p of PATHS) {
        const hows = p.id.startsWith('Sheet > sheet') ? HOWS : [HOWS[k++ % HOWS.length], 'x'];
        for (const how of hows.concat(p.back ? ['back'] : [])) {
            await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiCompanion.close(); } catch (e) { } try { LowiFastEdit.close(); } catch (e) { } });
            await sleep(700);
            const o = await run(p.open); await sleep(1300);
            if (p.kid) await run(p.kid);
            const s1 = await state();
            if (!s1.n) { rows.push({ p: p.id, how, skip: 'first sheet did not open (' + o + ')' }); break; }
            const t = await tapIn(p.child);
            let s2 = await state();
            for (let w = 0; w < 12 && t === 'ok' && (!s2.n || JSON.stringify(s2.names) === JSON.stringify(s1.names)); w++) { await sleep(500); s2 = await state(); }
            await sleep(600); s2 = await state();
            if (t !== 'ok') { rows.push({ p: p.id, how, skip: t, s1: s1.names }); break; }
            if (s2.n > 1) fails.push(p.id + ': two layers visible after opening ' + JSON.stringify(s2.names));
            const c = await closeBy(how); await sleep(1100);
            const s3 = await state();
            if (how === 'back') {
                if (s3.n !== 1) fails.push(p.id + ': back chevron should bring the parent back ' + JSON.stringify(s3));
                await closeBy('x'); await sleep(1100);
                const s4 = await state();
                if (s4.n || s4.blocked || s4.stack) fails.push(p.id + ': after back then X, left open ' + JSON.stringify(s4));
                rows.push({ p: p.id, how: c, open: s2.names, chevron: s2.back, after: s3.names, end: s4.n });
            } else {
                if (s3.n || s3.blocked || s3.stack || s3.parked) fails.push(p.id + ' (' + c + '): left open ' + JSON.stringify(s3));
                if (s3.ovf !== base.ovf || s3.feUp) fails.push(p.id + ' (' + c + '): scroll lock left ' + s3.ovf + ' vs ' + base.ovf);
                rows.push({ p: p.id, how: c, open: s2.names, chevron: s2.back, end: s3.n });
            }
        }
    }
    if (SHOTS) { try { await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(600); await run(PATHS[2].open); await sleep(1200); await tapIn(PATHS[2].child); await sleep(1500); await page.screenshot({ path: path.join(SHOTS, DEV.replace(/\W+/g, '_') + '-' + THEME + '-forms.png') }); } catch (e) { } }
    const walked = rows.filter(r => !r.skip).length;
    if (walked < 8) fails.push('only ' + walked + ' paths walked');
    const ok = !fails.length && !errs.length;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + DEV + ' ' + THEME + ' ' + LANG + ': ' + walked + ' closes walked, ' + rows.filter(r => r.skip).length + ' skipped' + (fails.length ? ' | ' + fails.join(' | ') : '') + (errs.length ? ' | errors: ' + errs.join(' ; ') : ''));
    if (VERBOSE) rows.forEach(r => console.log('  ' + JSON.stringify(r)));
    await browser.close(); if (srv) srv.close();
    process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FAIL', e && e.message); process.exit(1); });
