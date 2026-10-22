#!/usr/bin/env node
/* tools/app-voice/mirror-sim.cjs: Mirror mode (camera workout) on simulated phones; checks every line it says is the new voice
   (recorded app-voice clips, the tutorial's voices) and the device voice never speaks.
   Usage: node tools/app-voice/mirror-sim.cjs [url]      (default: this folder served locally) -> per phone ok/FAIL, then ALL OK */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };
const serve = () => new Promise(r => {
    const s = http.createServer((q, res) => {
        let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/lowispike/, ''); if (f === '/' || f === '') f = '/index.html';
        const fp = path.join(ROOT, f); if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}/lowispike/` }));
});
const PHONES = [
    { name: 'iPhone SE', engine: 'webkit', dev: 'iPhone SE', lang: 'en' },
    { name: 'iPhone 13', engine: 'webkit', dev: 'iPhone 13', lang: 'de' },
    { name: 'iPhone 15', engine: 'webkit', dev: 'iPhone 15', lang: 'es' },
    { name: 'Pixel 7 (camera)', engine: 'chromium', dev: 'Pixel 7', lang: 'en', cam: true },
];
(async () => {
    let srv = null, url = process.argv[2];
    if (!url) { srv = await serve(); url = srv.url; }
    const fails = [];
    for (const P of PHONES) {
        const browser = await pw[P.engine].launch(P.engine === 'chromium' ? { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] } : {});
        const ctx = await browser.newContext(Object.assign({}, pw.devices[P.dev], P.cam ? { permissions: ['camera'] } : {}));
        await ctx.addInitScript(lang => {
            try { localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.daily.seen', new Date().toISOString().slice(0, 10)); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.tutorial.done', '1'); localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'sim', user: { id: 'sim', email: 'sim@example.com', is_anonymous: false } })); if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Sim', bday: '1990-08-01' }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang } })); } catch (e) { }
            window.__dev = []; window.__said = [];
            const fake = { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() { }, resume() { }, addEventListener() { }, speak(u) { window.__dev.push(u.text); setTimeout(() => u.onend && u.onend(), 30); } };
            Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
            window.SpeechSynthesisUtterance = function (t) { this.text = t; };
            const iv = setInterval(() => { if (!window.LowiVoice || window.LowiVoice.__wrapped) return; const sp = window.LowiVoice.speak; window.LowiVoice.speak = (t, o) => { const h = sp(t, o); window.__said.push({ t, o: Object.assign({}, o), h }); return h; }; window.LowiVoice.__wrapped = 1; clearInterval(iv); }, 20);
        }, P.lang);
        const page = await ctx.newPage();
        const mp3 = []; page.on('response', r => { if (/\/app-voice\/[a-z]{2}\/[0-9a-z]+\.mp3/.test(r.url())) mp3.push(r.status()); });
        const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
        await page.goto(url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => !!(window.LowiMirror && window.LowiVoice && window.LowiVoice.__wrapped), null, { timeout: 30000 });
        await page.waitForFunction(() => !document.documentElement.classList.contains('gate-boot') && !document.documentElement.classList.contains('gate-up'), null, { timeout: 20000 }).catch(() => console.log('       (sign-in gate still up after 20 s: lifted by the script)'));
        await page.evaluate(() => { const H = document.documentElement; H.classList.remove('gate-boot', 'gate-up'); document.querySelectorAll('[data-gate-inert]').forEach(n => { n.inert = false; }); });
        await page.waitForTimeout(800);
        await page.evaluate(() => { document.querySelectorAll('.lt-ov,.lt-root,[data-tutorial]').forEach(n => n.remove()); window.LowiMirror.open(); });
        await page.locator('[data-mm="pick"]').first().tap();
        await page.locator(P.cam ? '[data-mm="cam"]' : '[data-mm="nocam"]').tap();
        await page.waitForTimeout(P.cam ? 20000 : 14000);
        const shot = path.join(os.tmpdir(), 'mirror-voice-' + P.name.replace(/\W+/g, '-') + '.png'); await page.screenshot({ path: shot });
        const r = await page.evaluate(() => ({ dev: window.__dev, said: window.__said.map(x => ({ t: x.t, clipsOnly: !!x.o.clipsOnly, lang: x.o.lang, clips: x.h.clips || 0, device: x.h.device || 0, skipped: x.h.skipped || 0, cancelled: !!x.h.cancelled })), st: window.LowiMirror._state() }));
        await browser.close();
        const bad = r.said.filter(x => !x.clipsOnly || x.lang !== P.lang || x.device);
        const ok = r.said.length >= 2 && !r.dev.length && !bad.length && mp3.length > 0 && mp3.every(s => s === 200);
        console.log((ok ? 'ok   ' : 'FAIL ') + P.name + ' [' + P.lang + ', ' + (P.cam ? 'camera ' + (r.st.stream ? 'on' : 'off') : 'without camera') + ']: ' + r.said.length + ' lines, ' +
            r.said.reduce((a, x) => a + x.clips, 0) + ' clips played, ' + r.said.reduce((a, x) => a + x.skipped, 0) + ' skipped, device voice ' + r.dev.length + ', clip downloads ' + mp3.length + ' (' + mp3.filter(s => s === 200).length + ' ok)' + (errs.length ? ', page errors: ' + errs.slice(0, 2).join(' | ') : ''));
        r.said.forEach(x => console.log('       "' + x.t + '"' + (x.cancelled ? ' (cut off by the next line)' : '')));
        console.log('       screenshot ' + shot);
        if (!ok) fails.push(P.name);
    }
    if (srv) srv.s.close();
    console.log(fails.length ? 'FAIL: ' + fails.join(', ') : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(2); });
