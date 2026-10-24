'use strict';
/* Browser check (Oct 24 2026, cycle care): someone who chose "x" opens My cycle with tracking on (first day 7 days ago).
   The sheet says the phase is estimated, the check-in chips work, a not-great answer offers a gentle day (never automatic),
   the gentle day changes the Move goal, "I rested" counts once and raises Misty's energy, calm world softens the light and slows
   the world without overwriting her speed (and switches back), the recovered settings (length, irregular, own phase) work and
   dim the ring, "Not relevant to me" turns everything off, and delete needs two taps and erases the care data too. Misty's
   hold card still has the Your cycle row. A second pass with reduced motion: calm changes only light, never the speed.
     node tests/cycle-care-live.cjs [--root DIR | --url URL] [--views iphone_chromium,iphone13_webkit]
   Exit 0 = pass. Simulated browsers only, not a physical phone. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/cycle-care-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], small_chromium: ['chromium', { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }] };
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const SEED = () => {
    const p = n => String(n).padStart(2, '0'), d = new Date(Date.now() - 7 * 864e5), k = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    const days = {}; days[k] = { p: 'med' };
    try {
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01', gender: 'x' }, health: { cyc: { v: 1, show: true, setup: true, days } }, xp: 900, ledger: [], logs: [], settings: { lang: 'en' } }));
        localStorage.setItem('lowi.world.speed.v1', '0.9');
    } catch (e) { }
};
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit').split(',')) for (const rm of (arg('rm', 'no,yes')).split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', reducedMotion: rm === 'yes' ? 'reduce' : 'no-preference' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(SEED);
        await ctx.addInitScript(INIT);
        /* this VM's headless WebKit renderer dies when a page starts an <audio> (any first tap unlocks sound), on the live build too:
           silent media stub as in tools/check-scan-hold.cjs. Sim workaround only, not shipped, not an iPhone problem. */
        if (eng === 'webkit') await ctx.addInitScript({ path: path.join(__dirname, '..', 'tools', 'sim', 'no-media-init.js') });
        const page = await ctx.newPage(), errs = [], P = [], steps = { view: v, reducedMotion: rm };
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        const shot = n => page.screenshot({ path: `${OUT}/${TAG}-${v}-${rm}-${n}.png` }).catch(() => { });
        const tap = async sel => { const ok = await page.evaluate(s => { const b = document.querySelector('#cwSheet ' + s); if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true; }, sel); if (!ok) P.push('missing control ' + sel); await sleep(250); return ok; };
        const sheet = () => page.evaluate(() => { const el = document.getElementById('cwSheet'); return el ? el.innerText : ''; });
        const en = () => page.evaluate(() => { try { return window.LowiSun.energyNow().value; } catch (e) { return -1; } });
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
            await page.waitForFunction(() => window.LowiCycleWorld && window.LowiCycle && window.LowiCycleCare && window.LowiSun, null, { timeout: 150000 });
            await sleep(+arg('wait', 4000));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            steps.enabled = await page.evaluate(() => window.LowiCycle.enabled());
            if (!steps.enabled) P.push('tracking not on for the "x" fixture with her own yes');
            steps.hub = await page.evaluate(() => (window.LowiCycleWorld.hubHtml() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
            if (!/Your cycle/.test(steps.hub) || !/estimated/.test(steps.hub)) P.push('Misty card row missing or not marked estimated: ' + steps.hub);
            await page.evaluate(() => window.LowiCycleWorld.open());
            await page.waitForSelector('#cwSheet', { timeout: 15000 });
            await sleep(600);
            let t = await sheet();
            if (!/estimated/i.test(t)) P.push('phase not marked estimated');
            if (!/How are you today\?/.test(t)) P.push('no check-in');
            if (/Make today a gentle day/.test(t)) P.push('gentle day offered before any answer');
            await shot('1-open');
            await tap('[data-cw="feel"][data-v="good"]');
            if (/Make today a gentle day/.test(await sheet())) P.push('gentle day offered after all good');
            await tap('[data-cw="feel"][data-v="cramps"]');
            t = await sheet();
            if (!/Make today a gentle day/.test(t)) P.push('no gentle-day offer after cramps');
            const stored = await page.evaluate(() => { const c = window.LowiCycle.data(), k = window.LowiCycleCare.dayKey(); return c.days[k]; });
            if (!stored || !(stored.sym || []).includes('cramps') || stored.mood === 'good') P.push('check-in not stored on the old keys: ' + JSON.stringify(stored));
            if (await page.evaluate(() => !!window.LowiCycleCare.gentle(window.LowiCycle.data(), window.LowiCycleCare.dayKey()))) P.push('gentle day switched on by itself');
            const e0 = await en();
            await tap('[data-cw="gentle"]');
            t = await sheet();
            if (!/Gentle day/.test(t) || !/One short Move/.test(t)) P.push('gentle card missing');
            await tap('[data-cw="goal"][data-v="half"]');
            steps.goal = await page.evaluate(() => window.LowiCycleCare.energyInput(window.LowiCycle.data(), window.LowiCycleCare.dayKey()).moveGoal);
            if (steps.goal !== 0.5) P.push('goal size did not change: ' + steps.goal);
            await tap('[data-cw="rest"]');
            const e1 = await en();
            steps.energy = [e0, e1];
            if (!(e1 > e0)) P.push('rest did not raise energy: ' + e0 + ' -> ' + e1);
            t = await sheet();
            if (!/Rest counted for \S.* today/.test(t)) P.push('rest not confirmed');
            if (/Misty/.test(t) && !/Misty/.test(await page.evaluate(() => { try { return (window.LowiBirthCompanion.get() || {}).name || ''; } catch (e) { return ''; } }))) P.push('My cycle hard-codes Misty');
            const restTs = await page.evaluate(() => window.LowiCycleCare.gentle(window.LowiCycle.data(), window.LowiCycleCare.dayKey()).rest);
            await page.evaluate(() => { const b = document.querySelector('#cwSheet [data-cw="rest"]'); if (b) b.click(); });
            await sleep(200);
            if (restTs !== await page.evaluate(() => window.LowiCycleCare.gentle(window.LowiCycle.data(), window.LowiCycleCare.dayKey()).rest)) P.push('rest counted twice');
            await shot('2-gentle');
            /* calm world */
            await tap('[data-cw="calm"][data-v="1"]');
            await sleep(300);
            const calm = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('cc-calm'), speed: window.LowiWorldSpeed, stored: localStorage.getItem('lowi.world.speed.v1'), audio: !!(window.LowiWorldAudio && window.LowiWorldAudio.calmOn) }));
            steps.calm = calm;
            if (!calm.cls) P.push('calm light not on');
            if (rm === 'yes' && calm.speed !== undefined && calm.speed < 0.9 - 1e-9) P.push('reduced motion: speed changed to ' + calm.speed);
            if (rm !== 'yes' && !(calm.speed <= 0.5)) P.push('world not slowed: ' + calm.speed);
            if (calm.stored !== '0.9') P.push('her speed setting was overwritten: ' + calm.stored);
            if (!calm.audio) P.push('sound not switched to calm');
            await page.evaluate(() => { const s = document.querySelector('.r2-sh'); if (s) s.scrollTop = 0; });
            await shot('3-calm');
            await tap('[data-cw="calm"][data-v="0"]');
            await sleep(300);
            const normal = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('cc-calm'), speed: window.LowiWorldSpeed }));
            if (normal.cls) P.push('calm light stayed on');
            if (rm !== 'yes' && Math.abs(normal.speed - 0.9) > 1e-9) P.push('her speed not restored: ' + normal.speed);
            /* settings */
            await tap('[data-cw="set"]');
            if (!(await sheet()).includes('Cycle length')) P.push('settings did not open');
            await tap('[data-cw="len"][data-v="1"]');
            steps.len = await page.evaluate(() => window.LowiCycle.data().len);
            if (!(steps.len >= 22)) P.push('length did not change: ' + steps.len);
            await tap('input[data-cw="irr"]');
            await tap('[data-cw="manual"][data-v="luteal"]');
            const mod = await page.evaluate(() => { const m = window.LowiCycle.model(); return { ph: m.ph, irr: m.irregular }; });
            steps.manual = mod;
            if (mod.ph !== 'luteal' || !mod.irr) P.push('own phase not used: ' + JSON.stringify(mod));
            await shot('4-settings');
            await page.evaluate(() => window.LowiCycleWorld.paintRing());
            steps.ringWide = await page.evaluate(() => { const r = document.querySelector('.cyh-ring'); return r ? r.getAttribute('data-wide') : 'no ring'; });
            /* delete: two taps; the first only arms */
            await tap('[data-cw="del"]');
            if (!(await page.evaluate(() => Object.keys(window.LowiCycle.data().days || {}).length))) P.push('deleted on the first tap');
            if (!(await sheet()).includes('Tap again to delete everything')) P.push('no second-tap warning');
            await tap('[data-cw="del"]');
            await sleep(1500);
            const after = await page.evaluate(() => { const c = window.LowiCycle.data(); return { days: Object.keys(c.days || {}).length, care: !!(c.care && Object.keys(c.care.g || {}).length), len: c.len || 0, irr: !!c.irregular, calm: document.documentElement.classList.contains('cc-calm') }; });
            steps.afterDelete = after;
            if (after.days || after.care || after.len || after.irr) P.push('data left after delete: ' + JSON.stringify(after));
            await shot('5-deleted');
            /* not relevant */
            await page.evaluate(() => { window.LowiCycle.setShow(true); window.LowiCycleWorld.open(); });
            await sleep(400);
            await tap('[data-cw="set"]');
            await tap('[data-cw="na"]');
            steps.naEnabled = await page.evaluate(() => window.LowiCycle.enabled());
            if (steps.naEnabled) P.push('still on after Not relevant to me');
            if (await page.evaluate(() => !!window.LowiCycleWorld.hubHtml())) P.push('Misty card row still shows after Not relevant');
        } catch (e) { P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.join(' / '));
        console.log(JSON.stringify(Object.assign(steps, { problems: P })));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})();
