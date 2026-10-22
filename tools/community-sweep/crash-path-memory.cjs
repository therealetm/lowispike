/* Item 29 / 33 (22 Oct 2026): the real-iPhone crash path, Home -> Community -> Chat -> a chat room, repeated, measuring what the
   page holds after each round: DOM nodes, canvases (and their pixels), live iframes, the heap (Chromium only) and the web content
   process memory (ps). Run once on the build to compare and once on main (root = a checkout of main) and compare the numbers.
   Simulator only: a desktop engine's memory is not an iPhone's, so this shows direction and leaks, not whether Safari survives.

   node tools/community-sweep/crash-path-memory.cjs [webkit|chromium] [root] [rounds] [first-tab]
   VIEWS=0 skips Creation/Affiliates, CHAT=0 skips the chat room (to find which part grows).
*/
'use strict';
/* pointerdown guard note: every programmatic goTab here first fires a pointerdown, like a real finger, because back-swipe.js
   pushes its history guard on pointerdown; without it WebKit's history.back() from section-nav walked off to about:blank. */
const H = require('../sim/harness.cjs');
const [engine = 'webkit', root = '', rounds = '8', first = 'room'] = process.argv.slice(2);
(async () => {
    const o = { engine, members: 40, messages: 300 }; if (root) o.root = root;
    const R = await H.open(o); const P = R.page; const rows = [];
    let loads = 0; P.on('load', () => { loads++; });
    let crashed = false; P.on('crash', () => { crashed = true; console.log('CRASH'); });
    const extra = () => P.evaluate(() => {
        let px = 0; document.querySelectorAll('canvas').forEach(c => { px += c.width * c.height; });
        const ifr = [...document.querySelectorAll('iframe')].filter(f => f.src && f.src !== 'about:blank').length;
        const pg = document.getElementById('tab-foryou');
        return { canvasMP: +(px / 1e6).toFixed(1), iframes: ifr, cmNodes: pg ? pg.getElementsByTagName('*').length : 0 };
    }).catch(e => ({ err: String(e.message).slice(0, 120) }));
    const take = async label => {
        const s = await R.snap(), x = await extra(), r = R.rss();
        const web = Object.entries(r).filter(([k]) => /WebKitWebProces|WebProcess|renderer|chrome/i.test(k)).reduce((m, [, v]) => Math.max(m, v), 0);
        const row = { label, nodes: s.nodes, cmNodes: x.cmNodes, canv: s.canv, canvasMP: x.canvasMP, iframes: x.iframes, heap: s.heap, webMB: web };
        rows.push(row); console.log(JSON.stringify(row));
    };
    try {
        await R.goto(); await H.sleep(6000);
        await P.evaluate(f => localStorage.setItem('lowispike.community.tabs', JSON.stringify([f, ...['room', 'chat', 'create', 'aff'].filter(x => x !== f)])), first);
        await take('home');
        for (let i = 1; i <= +rounds; i++) {
            await P.evaluate(() => (document.body.dispatchEvent(new Event('pointerdown',{bubbles:true})),window.goTab)('foryou')); await H.sleep(1800);
            if (i === 1) await take('community#1');
            /* the crash path: Chat, then into the room, scroll the messages */
            if (process.env.CHAT !== '0') {
            await P.evaluate(() => window.LowiRoomsUI.setTab(true)); await H.sleep(800);
            await P.evaluate(() => window.LowiCommunity.thread(true)); await H.sleep(1500);
            }
            await P.evaluate(() => { const l = document.getElementById('cmList'); if (l) { l.scrollTop = 0; } }); await H.sleep(600);
            await P.evaluate(() => { const l = document.getElementById('cmList'); if (l) { l.scrollTop = l.scrollHeight; } }); await H.sleep(600);
            if (i === 1 || i === +rounds) await take('chat-room#' + i);
            /* the other tabs, then back to Home */
            if (process.env.VIEWS !== '0') {
                await P.evaluate(() => window.LowiRoomsUI.showView('aff')); await H.sleep(900);
                await P.evaluate(() => window.LowiRoomsUI.showView('create')); await H.sleep(900);
            }
            await P.evaluate(() => (document.body.dispatchEvent(new Event('pointerdown',{bubbles:true})),window.goTab)('home')); await H.sleep(1500);
            if (i === 1 || i === +rounds) await take('home#' + i);
        }
        await H.sleep(3000); await take('home-settled');
    } catch (e) { console.log('ERR', e.message.slice(0, 300)); }
    console.log('RESULT', JSON.stringify({ engine, root: root || 'this checkout', first, rounds: +rounds, reloads: Math.max(0, loads - 1), crashed, errs: R.errs.slice(0, 6), rows }));
    await R.close();
})();
