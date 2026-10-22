'use strict';
/* Code error sweep 22 Oct 20:02: GPU/canvas counts around a Community chat room (queue item: iPhone 15 crash on reload after a chat room).
   Boot, snap; then N cycles of chat room open (snap) + Escape + Home (snap). Uses the crash-probe counters (ctxGL, gpuMB, canv, raf).
   node tools/probe-chat-gl.cjs [device] [cycles] [url|root] */
const H = require('./sim/harness.cjs');
const [device = 'iPhone 15', cyc = '3', where = 'https://therealetm.github.io/lowispike/index.html'] = process.argv.slice(2);
const go = (P, t) => P.evaluate(x => { try { window.goTab(x); } catch (e) { } }, t);
(async () => {
    const o = { engine: 'webkit', device }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o); const P = R.page; const rows = [];
    const snap = async (label) => { const s = await R.snap(); const extra = await P.evaluate(() => { const z = window.__cs && window.__cs.snap ? window.__cs.snap() : {}; return { ctxBy: z.ctxBy, canvMB: z.canvMB, glCanv: [...document.querySelectorAll('canvas')].map(cv => (cv.id || cv.className || cv.parentElement && (cv.parentElement.id || cv.parentElement.className) || '?').toString().slice(0, 30) + ' ' + cv.width + 'x' + cv.height + (cv.isConnected ? '' : ' detached')) }; }).catch(e => ({ err: e.message })); rows.push({ label, ...s, ...extra, rss: R.rss() }); console.log(label, JSON.stringify({ ...s, ...extra })); };
    try {
        await R.goto(); await H.sleep(6000); await snap('boot');
        for (let i = 1; i <= +cyc; i++) {
            await go(P, 'foryou'); await H.sleep(2600);
            await P.evaluate(() => { try { window.LowiRoomsUI.setTab(true); window.LowiCommunity.thread(true); } catch (e) { } }); await H.sleep(2500); await snap('chat' + i);
            await P.keyboard.press('Escape').catch(() => { }); await H.sleep(600); await go(P, 'home'); await H.sleep(2500); await snap('home' + i);
        }
    } catch (e) { console.log('ERR', e.message.split('\n')[0]); }
    console.log('crashed', R.crashed, 'errs', JSON.stringify(R.errs.slice(0, 5)));
    await R.close();
})();
