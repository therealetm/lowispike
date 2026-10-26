'use strict';
/* Browser check (Oct 26 2026, MAYA-HANDOFF 0.39): the evening catch-up bubble checklist, end to end, as a signed-in fixture.
   A) the evening greeting: one gentle card with the greeting and one big "Catch up on today" button (EN / DE / ES), big text;
   B) the checklist: one big bubble at a time; tap it -> big choices + Something else + Skip; a pick adds points and your companion
      cheers; Something else takes typed words; the read-back lists the picks; one big Save logs the meals (via catchup) and the
      points really land; back (Safari's swipe) steps back inside the checklist and never leaves the app;
   C) Settings: "Catch up on today" is the first row and opens the checklist;
   D) Reduce Motion: nothing drifts or animates; no page errors; nothing wider than the screen; targets >= 56 px, text >= 20 px.
     node tests/evening-catchup-live.cjs [--root DIR | --url URL] [--views iphone13_webkit,ipad_portrait_webkit] [--langs en,de,es] [--reduce]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/evening-catchup-shots');
const REDUCE = process.argv.includes('--reduce');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
        }).listen(0, '127.0.0.1', () => r(s));
    });
}
const IPAD = { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone13_webkit: ['webkit', 'iPhone 13'], ipad_portrait_webkit: ['webkit', IPAD], iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }] };
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const C = require('../evening-catchup-core.js'), SS = require('../home-settings-sleep-v2.js');

/* measure what is on screen now */
const LOOK = () => {
    const ov = document.getElementById('ecOv'), vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const btns = ov ? [...ov.querySelectorAll('.ec-stage button')].filter(vis).map(b => { const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return { ec: b.getAttribute('data-ec'), h: Math.round(r.height), w: Math.round(r.width), x: r.left, r: r.right, fs: parseFloat(cs.fontSize), t: b.textContent.trim().slice(0, 40) }; }) : [];
    const anims = ov ? [...ov.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return cs.animationName && cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0.02 && cs.animationPlayState !== 'paused'; }).map(e => e.className.baseVal != null ? 'svg' : e.className).slice(0, 5) : [];
    return { open: !!ov && document.documentElement.classList.contains('ec-open'), step: ov ? ov.getAttribute('data-back-step') : null, btns, bubble: !!(ov && vis(ov.querySelector('.ec-bubble'))), drift: !!(ov && ov.querySelector('.ec-drift')), pts: ov ? (ov.querySelector('.ec-pts-n') || {}).textContent : '', say: ov ? (ov.querySelector('.ec-say') || {}).textContent : '', head: ov ? ((ov.querySelector('.ec-stage h2, .ec-stage .ec-q, .ec-bname') || {}).textContent || '') : '', headFs: ov && ov.querySelector('.ec-bname, .ec-q') ? parseFloat(getComputedStyle(ov.querySelector('.ec-bname, .ec-q')).fontSize) : 0, wide: document.documentElement.scrollWidth > innerWidth + 1, vw: innerWidth, anims, home: document.documentElement.classList.contains('wh-home') };
};
const num = s => +(String(s || '').match(/\d+/) || [0])[0];

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0, checks = 0;
    const ok = (cond, P, msg) => { checks++; if (!cond) P.push(msg); };
    for (const v of arg('views', 'iphone13_webkit,ipad_portrait_webkit').split(',')) {
        for (const lang of arg('langs', 'en,de,es').split(',')) {
            const [eng, dd] = VIEWS[v], T = C.TX[lang];
            const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } : {});
            const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd, { serviceWorkers: 'block', reducedMotion: REDUCE ? 'reduce' : 'no-preference' });
            const P = [], steps = { view: v, lang, reduce: REDUCE };
            const ctx = await browser.newContext(dev);
            await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
            await ctx.addInitScript(INIT);
            await ctx.addInitScript(l => { try { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); s.settings = Object.assign({}, s.settings, { lang: l }); localStorage.setItem('lowispike.v2', JSON.stringify(s)); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
            const page = await ctx.newPage(), errs = [];
            page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
            const shot = async n => { try { await page.screenshot({ path: `${OUT}/${v}-${lang}${REDUCE ? '-rm' : ''}-${n}.png` }); } catch (e) { } };
            const look = () => page.evaluate(LOOK);
            const tap = async sel => { await page.waitForSelector(sel, { timeout: 6000 }).catch(async () => { throw new Error('no ' + sel + ' on ' + JSON.stringify(await look()).slice(0, 400)); }); await page.evaluate(s => { const e = document.querySelector(s); e && e.scrollIntoView({ block: 'center' }); }, sel); await sleep(150); await page.tap(sel, { timeout: 5000 }); };
            try {
                await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
                await page.waitForFunction(() => window.LowiEveningCatchup && window.LowiHomeSettingsSleepV2 && document.documentElement.classList.contains('wh-home'), null, { timeout: 150000, polling: 300 }).catch(() => P.push('app or catch-up never loaded'));
                await page.waitForFunction(() => { const b = document.querySelector('[data-orbit="settings"]'); return !!(b && b.dataset.o8Adapter === 'settings-sleep' && b.getBoundingClientRect().width > 20); }, null, { timeout: 180000, polling: 500 }).catch(() => P.push('Settings bubble never mounted'));
                await sleep(1200);
                await page.evaluate(l => { try { window.LowiLang && window.LowiLang.set && window.LowiLang.set(l); } catch (e) { } }, lang);
                await page.tap('body', { position: { x: 5, y: 300 } }).catch(() => { });   /* a touch, so the back guard is in place (like a real visitor) */
                await sleep(400);
                /* ---------- A) the greeting ---------- */
                await page.evaluate(() => { document.querySelectorAll('#ecHi').forEach(e => e.remove()); window.LowiEveningCatchup.greet(); });
                await page.waitForSelector('#ecHi [data-hi="go"]', { timeout: 5000 }).catch(() => { });
                await sleep(REDUCE ? 200 : 700);
                const g = await page.evaluate(() => { const h = document.getElementById('ecHi'); if (!h) return null; const go = h.querySelector('[data-hi="go"]'), hd = h.querySelector('h2'), r = go.getBoundingClientRect(); return { head: hd ? hd.textContent.trim() : '', headFs: hd ? parseFloat(getComputedStyle(hd).fontSize) : 0, go: go.textContent.trim(), h: r.height, x: r.left, rt: r.right, fs: parseFloat(getComputedStyle(go).fontSize), vw: innerWidth }; });
                steps.greet = g;
                ok(!!g && g.head === T.greet && g.go.includes(T.go), P, 'greeting text wrong ' + JSON.stringify(g));
                ok(!!g && g.h >= 56 && g.fs >= 20 && g.headFs >= 22 && g.x >= 0 && g.rt <= g.vw + 1, P, 'greeting not big enough or off screen ' + JSON.stringify(g));
                await shot('1-greet');
                await page.tap('#ecHi [data-hi="go"]').catch(e => P.push('greet tap ' + e.message.slice(0, 80)));
                await page.waitForSelector('#ecOv .ec-bubble', { timeout: 5000 }).catch(() => { });
                await sleep(REDUCE ? 300 : 900);
                /* ---------- B) the checklist ---------- */
                let L = await look();
                steps.first = { step: L.step, head: L.head, drift: L.drift };
                steps.list = await page.evaluate(() => (window.LowiEveningCatchup._state() || {}).list || []);
                ok(L.open && L.bubble && !(await page.evaluate(() => !!document.querySelector('#ecHi.on'))), P, 'Catch up on today did not open the bubble screen ' + JSON.stringify(L));
                ok(L.head === T.name.breakfast, P, 'first bubble is not Breakfast: ' + L.head);
                ok(L.headFs >= 22, P, 'bubble name text too small ' + L.headFs);
                ok(REDUCE ? (!L.drift && L.anims.length === 0) : L.drift, P, (REDUCE ? 'Reduce Motion still animates ' : 'bubble does not drift ') + JSON.stringify(L.anims));
                await shot('2-bubble');
                const seen = [], picks = [];
                let pts0 = num(L.pts), guard = 0, backChecked = false, otherChecked = false;
                while (guard++ < 10) {
                    L = await look();
                    if (!L.bubble) break;
                    seen.push(L.head);
                    await tap('#ecOv [data-ec="open"]'); await sleep(REDUCE ? 300 : 700);
                    L = await look();
                    const pk = L.btns.filter(b => b.ec === 'pick'), other = L.btns.find(b => b.ec === 'other'), skip = L.btns.find(b => b.ec === 'skip');
                    ok(pk.length >= 2 && !!skip && (seen.length > 4 || !!other), P, 'choices for ' + seen[seen.length - 1] + ' incomplete ' + JSON.stringify(L.btns.map(b => b.ec)));
                    const small = L.btns.filter(b => b.h < 56 || b.fs < 20 || b.x < 0 || b.r > L.vw + 1);
                    ok(small.length === 0, P, 'choice buttons too small or off screen on ' + seen[seen.length - 1] + ': ' + JSON.stringify(small));
                    if (seen.length === 1) { await shot('3-choices'); const qf = await page.evaluate(() => { const q = document.querySelector('#ecOv h2.ec-q'); return q ? parseFloat(getComputedStyle(q).fontSize) : 0; }); ok(qf >= 24, P, 'question text too small ' + qf); }
                    if (!backChecked) {
                        backChecked = true;
                        await page.evaluate(() => history.back()); await sleep(1100);
                        const b = await look(); steps.backFromChoices = { open: b.open, bubble: b.bubble, home: b.home };
                        ok(b.open && b.bubble && b.home, P, 'back from the choices did not step back to the bubble ' + JSON.stringify(steps.backFromChoices));
                        await page.tap('body', { position: { x: 3, y: 3 } }).catch(() => { });   /* re-arm the guard, like a real touch */
                        await tap('#ecOv [data-ec="open"]'); await sleep(REDUCE ? 300 : 700);
                    }
                    const k = seen.length;
                    if (k === 3 && other) {
                        await tap('#ecOv [data-ec="other"]'); await sleep(500);
                        const inp = await page.$('#ecOv .ec-input');
                        ok(!!inp, P, 'Something else has no text box');
                        if (inp) {
                            const fs1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#ecOv .ec-input')).fontSize));
                            ok(fs1 >= 20, P, 'Something else text box text too small ' + fs1);
                            await inp.fill('Lentil soup'); await sleep(200);
                            await shot('4-other');
                            await tap('#ecOv [data-ec="add"]'); picks.push('Lentil soup'); otherChecked = true;
                        }
                    } else if (k === 4) {
                        await tap('#ecOv [data-ec="skip"]');
                    } else {
                        const label = (pk[0] || {}).t || '';
                        await tap('#ecOv [data-ec="pick"]'); picks.push(label);
                    }
                    await sleep(250);
                    const pop = await look();
                    if (k !== 4) {
                        ok(num(pop.pts) > pts0, P, 'points did not grow after ' + seen[k - 1] + ': ' + pts0 + ' -> ' + pop.pts);
                        ok(!!pop.say, P, 'your companion did not cheer after ' + seen[k - 1]);
                        if (k === 1) await shot('5-pop');
                    }
                    pts0 = num(pop.pts);
                    await page.waitForFunction(k => { const o = document.getElementById('ecOv'), s = o && o.getAttribute('data-back-step'); return !o || s === 'bubble-' + k || s === 'review'; }, k, { timeout: 8000 }).catch(() => P.push('did not move on after bubble ' + k));
                    await sleep(REDUCE ? 200 : 500);
                }
                steps.seen = seen.join(','); steps.picks = picks.length;
                const want = (steps.list || []).map(k => T.name[k]);
                ok(want.length >= 5 && seen.join(',') === want.join(',') && C.ORDER.join(',').includes(steps.list.slice(0, 3).join(',')), P, 'bubbles not one at a time in order: ' + seen.join(',') + ' vs ' + want.join(','));
                ok(otherChecked, P, 'Something else was not tried');
                /* the read-back */
                const rv = await page.evaluate(() => { const o = document.getElementById('ecOv'); if (!o) return null; const s = o.querySelector('[data-ec="save"]'); const r = s ? s.getBoundingClientRect() : null; return { lines: [...o.querySelectorAll('.ec-stage li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()), save: s ? s.textContent.trim() : '', h: r ? r.height : 0, fs: s ? parseFloat(getComputedStyle(s).fontSize) : 0 }; });
                steps.review = rv && { n: rv.lines.length, save: rv.save };
                ok(!!rv && rv.save.includes(T.save) && rv.h >= 56 && rv.fs >= 20, P, 'no big Save on the read-back ' + JSON.stringify(rv));
                ok(!!rv && rv.lines.some(l => l.includes('Lentil soup')), P, 'read-back misses the typed item ' + JSON.stringify(rv && rv.lines));
                await shot('6-review');
                const before = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); return { xp: +s.xp || 0, logs: (s.logs || []).length }; });
                await tap('#ecOv [data-ec="save"]'); await sleep(1500);
                const after = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); const st = window.LowiState || null; const L = (s.logs || []); return { xp: +s.xp || 0, logs: L.length, via: L.filter(l => l && l.via === 'catchup').length, names: L.filter(l => l && l.via === 'catchup').map(l => l.name || l.title || '').join('|') }; });
                steps.save = { before, after };
                ok(after.via >= 3, P, 'Save did not log the meals (via catchup) ' + JSON.stringify(after));
                ok(after.xp > before.xp, P, 'Save gave no points ' + JSON.stringify(steps.save));
                L = await look(); await shot('7-finish');
                ok(await page.evaluate(() => !document.getElementById('fstRw')), P, 'a second reward dialog (fast done) popped up over the finish');
                ok(!L.wide && errs.length === 0, P, 'page too wide or errors: ' + errs.join(' | '));
                /* closing: back closes the checklist and stays in the app */
                await page.tap('body', { position: { x: 3, y: 3 } }).catch(() => { });
                await page.evaluate(() => history.back()); await sleep(1200);
                L = await look(); steps.backClose = { open: L.open, home: L.home };
                ok(!L.open && L.home && (await page.evaluate(h => location.host === h, host)), P, 'back from the finish did not close it and stay in the app ' + JSON.stringify(steps.backClose));
                /* ---------- C) Settings, first row ---------- */
                await page.evaluate(() => window.LowiHomeSettingsSleepV2.openSettings());
                await page.waitForSelector('[data-cme="catchUp"],[data-ss2="catchUp"]', { timeout: 8000 }).catch(() => { });
                await sleep(700);
                const rows = await page.evaluate(() => [...document.querySelectorAll('.cme-row[data-cme],.ss2-page [data-ss2]')].map(b => ({ id: b.dataset.cme || b.dataset.ss2, label: (b.textContent || '').trim(), vis: b.getBoundingClientRect().height > 0 })));
                const setIds = rows.map(r => r.id).filter(id => ['catchUp', 'theme', 'look', 'worldSound', 'language', 'tutorial', 'quickTour'].includes(id));
                steps.rows = setIds.join(',');
                ok(setIds[0] === 'catchUp', P, 'Catch up on today is not the first Settings row: ' + setIds.join(','));
                const row = rows.find(r => r.id === 'catchUp');
                ok(!!row && row.label.includes(SS.TX[lang].catchUp) && row.vis, P, 'Settings row label ' + JSON.stringify(row));
                await shot('8-settings');
                await sleep(1200);
                steps.rowHit = await page.evaluate(() => { const b = document.querySelector('.cme-row[data-cme="catchUp"],.ss2-page [data-ss2="catchUp"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { y: Math.round(r.top), h: Math.round(r.height), hit: !!(at && (at === b || b.contains(at))), at: at ? (at.id || String(at.className).slice(0, 40)) : null }; });
                if (row) {
                    await tap('.cme-row[data-cme="catchUp"],.ss2-page [data-ss2="catchUp"]'); await sleep(1300);
                    L = await look(); steps.fromSettings = { open: L.open, step: L.step };
                    ok(L.open, P, 'Settings row did not open the checklist ' + JSON.stringify(steps.fromSettings));
                    await shot('9-from-settings');
                    await page.keyboard.press('Escape'); await sleep(400); await page.keyboard.press('Escape'); await sleep(700);
                    L = await look();
                    ok(!L.open, P, 'Escape did not close the checklist');
                }
                ok(errs.length === 0, P, 'page errors: ' + errs.join(' | '));
            } catch (e) { P.push('error: ' + e.message.slice(0, 900)); }
            await ctx.close(); await browser.close();
            if (P.length) fail++;
            console.log((P.length ? 'FAIL ' : 'PASS ') + v + ' ' + lang + (REDUCE ? ' reduce' : '') + ' ' + JSON.stringify(steps).slice(0, 1200) + (P.length ? '\n  - ' + P.join('\n  - ') : ''));
        }
    }
    if (srv) srv.close();
    console.log(fail ? `evening-catchup-live: ${fail} view(s) FAILED (${checks} checks)` : `evening-catchup-live: all ${checks} checks passed`);
    process.exit(fail ? 1 : 0);
})();
