#!/usr/bin/env node
/* tools/app-voice/check.cjs: plays real lines from every part of the app in a browser and checks they come out as the recorded human
   voice (clips), and that only a sentence with no recording falls back to the device voice.
   Usage: node tools/app-voice/check.cjs            (this folder, served locally)
          LIVE=1 node tools/app-voice/check.cjs     (https://therealetm.github.io/lowispike/)  -> prints ALL OK or FAIL lines */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const ROOT = path.resolve(__dirname, '..', '..');
const P = require('./phrases.cjs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/lowispike/, ''); if (f === '/' || f === '') f = '/index.html';
            const fp = path.join(ROOT, f); if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'content-type': 'text/html' }); res.end('nope'); return; }
            res.writeHead(200, { 'content-type': TYPES[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(res);
        });
        s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}/lowispike/` }));
    });
}
(async () => {
    const h = P.harvest(false), pick = (lang, n, i) => [...h.out[lang]][i];
    /* one real line per part of the app, each a few sentences long, and one with a number nobody recorded */
    const C = require(path.join(ROOT, 'mirror-move-core.js'));
    const mv = Object.values(C.MOVES)[0];
    const lines = [
        { lang: 'en', what: 'Mirror mode cue', text: mv.n.en + '. ' + mv.cue.en },
        { lang: 'de', what: 'Mirror mode cue (German)', text: mv.n.de + '. ' + mv.cue.de },
        { lang: 'es', what: 'Mirror mode cue (Spanish)', text: mv.n.es + '. ' + mv.cue.es },
        { lang: 'en', what: 'Move player', text: 'Rest. Next, cool down' },
        { lang: 'en', what: 'Audio mode', text: 'Audio mode on. I\'ll keep it short.' },
        { lang: 'en', what: 'Learn while you move', text: 'Easy walking pace. Brisk pace now. You can still talk, but not sing.' },
        { lang: 'de', what: 'guide (German)', text: 'Hier ist es.' },
        { lang: 'es', what: 'guide news offer (Spanish)', text: '3 novedades en esta versi\u00f3n. \u00bfTe ense\u00f1o cada una?' },
        { lang: 'en', what: 'unrecorded line (device voice only for the 2nd sentence)', text: 'Rest. You walked 4321 steps on the moon.', device: 1 },
    ];
    let srv = null, url = 'https://therealetm.github.io/lowispike/';
    if (!process.env.LIVE) { srv = await serve(); url = srv.url; }
    const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
        window.__dev = [];
        const fake = { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() { }, resume() { }, addEventListener() { },
            speak(u) { window.__dev.push(u.text); setTimeout(() => u.onend && u.onend(), 30); } };
        Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
        window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    });
    const mp3 = []; page.on('response', r => { if (/\/app-voice\/[a-z]{2}\/[0-9a-z]+\.mp3/.test(r.url())) mp3.push(r.status()); });
    await page.goto(url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => !!window.LowiVoice, null, { timeout: 30000 });
    await page.mouse.click(5, 5).catch(() => { });
    const fails = [];
    for (const L of lines) {
        const r = await page.evaluate(L => new Promise(res => {
            window.__dev = []; const t0 = Date.now();
            const h = LowiVoice.speak(L.text, { lang: L.lang, onend: () => res({ clips: h.clips || 0, device: h.device || 0, dev: window.__dev.slice(), ms: Date.now() - t0, n: LowiVoice.pieces(L.text).length }) });
            setTimeout(() => res({ timeout: true, clips: h.clips || 0, device: h.device || 0 }), 30000);
        }), L);
        const want = L.device || 0, ok = !r.timeout && r.device === want && r.clips === r.n - want;
        console.log((ok ? 'ok   ' : 'FAIL ') + L.what + ': ' + r.clips + ' clips, ' + r.device + ' device' + (r.dev && r.dev.length ? ' (' + r.dev.join(' | ') + ')' : '') + (r.ms ? ', ' + (r.ms / 1000).toFixed(1) + ' s' : '') + (r.timeout ? ' TIMEOUT' : ''));
        if (!ok) fails.push(L.what);
    }
    console.log('clip downloads: ' + mp3.length + ' (' + mp3.filter(s => s === 200).length + ' ok)');
    await browser.close(); if (srv) srv.s.close();
    console.log(fails.length ? 'FAIL: ' + fails.join(', ') : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(2); });
