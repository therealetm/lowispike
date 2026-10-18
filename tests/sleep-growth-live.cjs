'use strict';
/* Browser check for sleep-growth.js (Oct 18 2026): logging Sleep grows Misty by tier, in the real app with real taps.
   Sleep bubble -> 6-7 h / 7 h or more / under 6 h / Clear: S.xp, the one ledger entry for today, the level, the words on screen and the
   '+XP' pop over the Sleep bubble. Repeat taps and reload pay nothing; correction pays the difference; clear takes it back.
   Day rollover (fake clock 23:59 -> 00:00) and account switching (another account's saved state) in every view.
   Production Supabase and every non-GET request are blocked (counted, never sent); local fixture session only.
     node tests/sleep-growth-live.cjs [--root DIR] [--views a,b] [--out DIR] [--url https://therealetm.github.io/lowispike/]
   Exit 0 = pass. */
process.env.TZ = 'Europe/Berlin'; /* same clock as the browser contexts, so the fake 23:57 is 23:57 in the app */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/sleep-growth-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = (w, h) => ({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'],
    ipad_portrait_webkit: ['webkit', IPAD(820, 1180)], ipad_landscape_chromium: ['chromium', IPAD(1180, 820)] };
const UID_A = '00000000-0000-4000-8000-00000000a11a', UID_B = '00000000-0000-4000-8000-00000000b22b';
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  const uid = localStorage.getItem('sg.test.uid') || '${UID_A}';
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: uid, email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-03-01', tags: [] }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

const READ = () => {
    const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const S = window.LowiVitalsBridge.state(), sl = (S.ledger || []).filter(e => e.src === 'sleep');
    const chip = document.querySelector('.lvchip');
    return { today: k, xp: S.xp, level: typeof levelOf === 'function' ? levelOf(S.xp).L : null, stage: S.herb && S.herb.stageIndex, sleep: sl.map(e => e.eventId + '=' + e.amt), labels: sl.map(e => e.label),
        band: S.health && S.health.sleepDays && S.health.sleepDays[k] ? S.health.sleepDays[k].band : null, chip: chip ? chip.textContent.trim() : null,
        said: (window.__said || []).slice(-1)[0] || null, toastOn: (document.getElementById('toast') || {}).textContent || '', pops: [...document.querySelectorAll('.sg-pop')].map(p => p.textContent) };
};
async function center(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel); }

async function boot(page, url) {
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiVitalsBridge && window.LowiSleepGrowth && window.LowiHomeSettingsSleepV2, null, { timeout: 90000 });
    await page.waitForFunction(() => document.documentElement.classList.contains('wh-home') && document.querySelector('[data-orbit="sleep"]'), null, { timeout: 90000 });
    await sleep(+arg('wait', 5000));
    await page.evaluate(() => {
        window.__said = [];
        const hook = (o, k) => { if (!o || typeof o[k] !== 'function' || o[k].__sg) return; const f = o[k]; o[k] = function (m) { window.__said.push(String(m)); return f.apply(this, arguments); }; o[k].__sg = 1; };
        hook(window, 'toast'); hook(window.LowiR2, 'toast');
    });
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', Object.keys(VIEWS).join(',')).split(',')) {
        const [eng, d] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof d === 'string' ? Object.assign({}, pw.devices[d]) : d;
        const P = [], errs = [], ok = (c, m) => { if (!c) P.push(m); };
        const blocked = { supabase: 0, writes: 0 };
        const mk = async () => {
            const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', timezoneId: 'Europe/Berlin' }));
            await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (/supabase\.co$/.test(u.hostname)) blocked.supabase++; if (q.method() !== 'GET') blocked.writes++; return r.abort(); });
            await ctx.addInitScript(INIT);
            const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
            return { ctx, page };
        };
        const MISSING = [];
        const tap = async (page, sel) => { if (sel.startsWith('#ss2Bloom')) await sleep(300); const c = await center(page, sel); if (!c) { MISSING.push(sel); return false; } await page.touchscreen.tap(c.x, c.y); await sleep(450); return true; };
        const home = page => page.evaluate(() => { if (document.documentElement.classList.contains('ss2-open') && window.LowiHomeSettingsSleepV2.close) window.LowiHomeSettingsSleepV2.close(); });
        const pick = async (page, id) => { await home(page); await sleep(250); await tap(page, '[data-orbit="sleep"]'); await tap(page, '#ss2Bloom [data-ss2="' + id + '"]'); await sleep(250); return page.evaluate(READ); };

        /* ---------- main run: tiers, repeat, correction, clear, reload ---------- */
        let { ctx, page } = await mk();
        await boot(page, url);
        let r = await page.evaluate(READ);
        ok(r.xp === 900 && !r.sleep.length, 'start: ' + JSON.stringify(r));
        const lv0 = r.level;
        r = await pick(page, '6to7');
        ok(r.band === '6to7' && r.xp === 905 && r.sleep.join() === 'sleep:' + r.today + '=5', '6-7 h should give 5 XP: ' + JSON.stringify(r));
        ok(/\+5 XP for Misty/.test(r.said || '') && /7 h or more gives 10/.test(r.said || ''), '6-7 h words: ' + r.said);
        ok(r.pops.join() === '+5 XP', 'the +5 XP pop over Sleep: ' + r.pops);
        ok(r.labels.every(l => l === 'Sleep'), 'ledger label carries no hours: ' + r.labels);
        await page.screenshot({ path: `${OUT}/${v}-1-six-to-seven.png` });
        r = await pick(page, '7plus');
        ok(r.xp === 910 && r.sleep.join() === 'sleep:' + r.today + '=10', 'upgrade to 7 h or more: +5 more, one entry of 10: ' + JSON.stringify(r));
        ok(/\+5 XP for Misty \u00b7 now 10 XP/.test(r.said || ''), 'upgrade words: ' + r.said);
        await page.screenshot({ path: `${OUT}/${v}-2-seven-plus.png` });
        r = await pick(page, '7plus'); r = await pick(page, '7plus');
        ok(r.xp === 910 && r.sleep.length === 1, 'repeat taps pay nothing: ' + JSON.stringify(r));
        await page.reload({ waitUntil: 'load' }); await boot(page, url);
        r = await page.evaluate(READ);
        ok(r.xp === 910 && r.sleep.length === 1 && r.band === '7plus', 'after reload: ' + JSON.stringify(r));
        ok(r.level === lv0 || r.level > lv0, 'level never lower');
        r = await pick(page, '6to7');
        ok(r.xp === 905 && r.sleep.join() === 'sleep:' + r.today + '=5', 'downgrade takes 5 back: ' + JSON.stringify(r));
        ok(r.pops.join() === '\u22125 XP', 'downgrade pop: ' + r.pops);
        r = await pick(page, 'under6');
        ok(r.xp === 900 && !r.sleep.length, 'under 6 h: no sleep XP: ' + JSON.stringify(r));
        r = await pick(page, 'under6');
        ok(/Sleep logged \u00b7 6 h or more helps Misty grow/.test(r.said || ''), 'gentle under-6 words: ' + r.said);
        await page.screenshot({ path: `${OUT}/${v}-3-under-six.png` });
        r = await pick(page, '7plus'); ok(r.xp === 910, '7 h again: ' + r.xp);
        r = await pick(page, 'clear');
        ok(r.xp === 900 && !r.sleep.length && r.band === null, 'clear takes all of it back: ' + JSON.stringify(r));
        ok(/Sleep cleared \u00b7 10 XP taken back/.test(r.said || ''), 'clear words: ' + r.said);
        /* level-up through sleep: 95 -> 105 crosses level 1 -> 2 in the real app */
        await page.evaluate(() => { const S = window.LowiVitalsBridge.state(); S.xp = 95; window.LowiVitalsBridge.save && window.LowiVitalsBridge.save(); });
        r = await pick(page, '7plus');
        ok(r.xp === 105 && r.level === 2, 'sleep should level Misty up from 95 to 105 XP (level 2): ' + JSON.stringify(r));
        r = await pick(page, 'clear');
        ok(r.xp === 95, 'clear after level-up: ' + r.xp);
        /* reduced motion: the pop still shows, but fades in place */
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await home(page); await sleep(250); await tap(page, '[data-orbit="sleep"]'); await tap(page, '#ss2Bloom [data-ss2="6to7"]');
        await page.waitForSelector('.sg-pop', { state: 'attached', timeout: 1500 }).catch(() => { });
        const rm = await page.evaluate(() => { const p = document.querySelector('.sg-pop'); return p ? getComputedStyle(p).animationName : 'none:' + JSON.stringify(window.LowiSleepGrowth.last) + (window.__said || []).slice(-1)[0]; });
        ok(rm === 'sgFade' || rm === 'none', 'reduced motion: the +XP pop must not rise (fade in place, or the app-wide still rule): ' + rm);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await pick(page, 'clear');

        /* ---------- account switching: another account's saved state on this phone ---------- */
        const stateA = await page.evaluate(() => { const S = window.LowiVitalsBridge.state(); window.LowiVitalsBridge.save && window.LowiVitalsBridge.save(); return localStorage.getItem('lowispike.v2'); });
        r = await pick(page, '7plus');
        const xpA = r.xp, blobA = await page.evaluate(() => localStorage.getItem('lowispike.v2'));
        await page.evaluate(uid => { localStorage.setItem('sg.test.uid', uid); localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Other', bday: '1992-07-10', tags: [] }, xp: 50, ledger: [], logs: [], saved: [] })); }, UID_B);
        await page.reload({ waitUntil: 'load' }); await boot(page, url);
        r = await page.evaluate(READ);
        ok(r.xp === 50 && !r.sleep.length, 'account B must not inherit A\'s sleep XP: ' + JSON.stringify(r));
        r = await pick(page, '6to7');
        ok(r.xp === 55 && r.sleep.length === 1, 'account B earns its own: ' + JSON.stringify(r));
        await page.evaluate(([uid, blob]) => { localStorage.setItem('sg.test.uid', uid); localStorage.setItem('lowispike.v2', blob); }, [UID_A, blobA]);
        await page.reload({ waitUntil: 'load' }); await boot(page, url);
        r = await page.evaluate(READ);
        ok(r.xp === xpA && r.sleep.length === 1 && /=10$/.test(r.sleep[0] || ''), 'back on A: exactly its own credit: ' + JSON.stringify({ r, xpA }));
        void stateA;
        if (MISSING.length) P.push('could not find to tap: ' + MISSING.splice(0).join(', '));
        await ctx.close();

        /* ---------- day rollover: 23:59 log, midnight, new day ---------- */
        ({ ctx, page } = await mk());
        const D1 = new Date(); D1.setHours(23, 57, 0, 0);
        await page.clock.install({ time: D1 });
        await boot(page, url);
        r = await pick(page, '7plus');
        const day1 = r.today;
        ok(r.sleep.join() === 'sleep:' + day1 + '=10', 'late-night log: ' + JSON.stringify(r));
        await page.clock.fastForward('05:00');
        await sleep(800);
        r = await page.evaluate(READ);
        ok(r.today !== day1 && r.band === null && r.sleep.length === 1 && r.xp === 910, 'after midnight: new day empty, yesterday kept: ' + JSON.stringify(r));
        /* after a fake-clock jump the bubble's tap timing (real event timestamps vs the faked clock) is not trustworthy, so the new day is
           logged through the Sleep bloom's own API, which runs the same setSleep() and sends the same 'lowi:sleep' event as a tap */
        const viaApi = async band => { await page.evaluate(b => b ? window.LowiHomeSettingsSleepV2.sleep.set(b) : window.LowiHomeSettingsSleepV2.sleep.clear(), band); await sleep(400); return page.evaluate(READ); };
        await page.screenshot({ path: `${OUT}/${v}-4-after-midnight.png` });
        r = await viaApi('6to7');
        ok(r.xp === 915 && r.sleep.join() === 'sleep:' + day1 + '=10,sleep:' + r.today + '=5', 'new day earns its own: ' + JSON.stringify(r));
        r = await viaApi(null);
        ok(r.xp === 910 && r.sleep.join() === 'sleep:' + day1 + '=10', 'clearing today leaves yesterday: ' + JSON.stringify(r));
        if (MISSING.length) P.push('rollover: could not find to tap: ' + MISSING.splice(0).join(', '));
        await ctx.close();

        const mine = errs.filter(e => /sleep-growth|LowiSleepGrowth|sg-pop/.test(e));
        ok(!mine.length, 'page errors from sleep-growth: ' + mine.join(' | '));
        console.log(JSON.stringify({ view: v, url: url.replace(/\?.*/, ''), pass: !P.length, problems: P, blocked, pageErrors: errs.slice(0, 4) }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL ' + fail : 'PASS all views');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
