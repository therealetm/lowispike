'use strict';
/* Tutorial visuals check (item 42, Oct 22 2026): node tools/tutorial-show/check.cjs [--url URL] [--out DIR] [--runs engine:device:lang,...]
   Simulated phones, audio stubbed (every clip ends after 2.2 s), camera counted. Server, setup and stubs copied from
   tools/tutorial-voice/handsfree-check.cjs. Not a real iPhone. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..', '..')), OUT = path.resolve(arg('out', '/tmp/tutorial-show-out'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const BASE = '/lowispike/', sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]);
            if (!u.startsWith(BASE)) { res.writeHead(404); res.end(); return; }
            u = u.slice(BASE.length - 1); if (u === '/' || u.endsWith('/')) u += 'index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}${BASE}` }));
    });
}
const msrc = fs.readFileSync(path.join(ROOT, 'tools/startup/measure.cjs'), 'utf8');
const INIT_SRC = msrc.slice(msrc.indexOf('const INIT = () => {') + 'const INIT = '.length, msrc.indexOf('\n};\n', msrc.indexOf('const INIT = () => {')) + 2);
const PRE = lang => `(() => { try {
  if (!sessionStorage.getItem('thf')) { sessionStorage.setItem('thf', '1');
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Tester', bday: '1990-03-05', tags: [] }, xp: 1254, ledger: [], logs: [], saved: [], settings: { lang: '${lang}' } }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '1990-03-05', btime: '07:45', n: 0, name: 'Misty', created: 1 }));
  localStorage.setItem('lowi.hint.communityHold', '1'); localStorage.setItem('lowispike.lang', '${lang}'); localStorage.setItem('lowi.tutorial.voice.v1', '${process.env.VOICE === '0' ? '0' : '1'}'); }
} catch (e) { } })();`;
/* audio: each clip ends after 300 ms; camera: counted, answered like a dismissed permission sheet */
const STUB = `(() => {
  window.__gum = 0; window.__plays = [];
  const md = navigator.mediaDevices || {};
  try { if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true }); } catch (e) { }
  md.getUserMedia = function () { window.__gum++; return Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })); };
  const P = HTMLMediaElement.prototype;
  P.play = function () { const a = this, silent = /^data:/.test(a.src || ''); if (!silent) window.__plays.push(String(a.src).split('/').slice(-2).join('/')); clearTimeout(a.__t); a.__t = setTimeout(() => a.dispatchEvent(new Event('ended')), silent ? 20 : (window.__clipMs || 300)); return Promise.resolve(); };
  P.pause = function () { clearTimeout(this.__t); };
  try { speechSynthesis.speak = () => { }; } catch (e) { }
})();`;

async function newPage(browser, dev, lang) {
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { colorScheme: 'dark', serviceWorkers: 'block' }));
    await ctx.addInitScript(PRE(lang)); await ctx.addInitScript(STUB); await ctx.addInitScript('(' + INIT_SRC + ')()');
    const page = await ctx.newPage();
    page.errs = []; page.on('pageerror', e => page.errs.push(String(e.message || e)));
    return { ctx, page };
}
async function boot(page, url) {
    await page.goto(url + '?thf=' + Date.now(), { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('[data-orbit]') && window.LowiTutorial && window.LowiTutorialVoice, null, { timeout: 45000 }).catch(() => { });
    await sleep(3500);
    await page.evaluate(() => document.querySelectorAll('[aria-modal="true"]').forEach(d => { if (!d.closest('#ltTour')) d.remove(); }));
}

module.exports = { pw, serve, newPage, boot, sleep, ROOT };
