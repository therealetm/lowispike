/* Item 33 (22 Oct 2026, Emmanuel: "when I open Community something different is supposed to be the first thing that opens, but it
   always opens the chat. And then after that it opens what I set my first page to be").
   Opens Community from Home's Community bubble with each tab order and records, every animation frame for the first 2.5 s,
   which section is on screen: the selected tab, the open view, whether the chat room (thread) or the channel list is showing.
   A run passes when the very first painted Community frame already shows the first tab of the saved order and nothing else
   shows in between. Also covers reopening after leaving Community from inside the chat room, Creation and Affiliates.

   node tools/community-sweep/first-tab.cjs [webkit|chromium] [root|url] */
'use strict';
/* pointerdown guard note: every programmatic goTab here first fires a pointerdown, like a real finger, because back-swipe.js
   pushes its history guard on pointerdown; without it WebKit's history.back() from section-nav walked off to about:blank. */
const H = require('../sim/harness.cjs');
const [engine = 'webkit', where = ''] = process.argv.slice(2);
const REC = () => {
    /* runs in the page: sample every frame until stopped */
    const out = []; let on = true;
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .02 && r.bottom > 0 && r.top < innerHeight; };
    const look = () => {
        const page = document.getElementById('tab-foryou');
        if (!page || !page.classList.contains('active')) return 'closed';
        const sel = document.querySelector('#cmPaneChat .rm-tab[aria-selected="true"]');
        const pane = document.getElementById('cmPaneChat');
        const th = document.getElementById('cgThread');
        const room = th && th.hasAttribute('data-open') && vis(document.getElementById('cmList'));
        const chans = vis(document.querySelector('#cmPaneChat > .rm-chans'));
        const v = pane && pane.getAttribute('data-rm-view');
        const frame = [...document.querySelectorAll('#cmPaneChat .rm-frame')].find(f => !f.hidden && vis(f));
        const what = room ? 'chat-room' : chans ? 'chat' : frame ? frame.dataset.view : v ? 'view:' + v : (vis(document.getElementById('cmPaneChat')) ? 'room' : 'blank');
        return (sel ? sel.dataset.rm : '-') + '|' + what;
    };
    const tick = () => { if (!on) return; const s = look(); if (!out.length || out[out.length - 1].s !== s) out.push({ t: Math.round(performance.now()), s }); requestAnimationFrame(tick); };
    window.__ft = { stop: () => { on = false; return out; }, t0: performance.now() };
    requestAnimationFrame(tick);
};
const ORDERS = [['aff', 'room', 'chat', 'create'], ['room', 'chat', 'create', 'aff'], ['create', 'aff', 'room', 'chat'], ['chat', 'room', 'create', 'aff']];
const expectOf = id => id === 'room' ? 'room|room' : id === 'chat' ? 'chat|chat-room' : id + '|' + id;   /* item 36: Chat opens the chat room itself */
(async () => {
    const o = { engine, members: 30, messages: 120 }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
    const R = await H.open(o); const P = R.page; const results = [];
    let loads = 0; P.on('load', () => { loads++; if (loads > 1) console.log('NOTE page reloaded (' + loads + ') ' + P.url().slice(-60)); });
    P.on('crash', () => console.log('NOTE page crashed'));
    const ready = async () => { for (let i = 0; i < 40; i++) { if (await P.evaluate(() => typeof window.goTab === 'function' && !!window.LowiRoomsUI).catch(() => false)) return; await H.sleep(500); } };
    const openCommunity = async () => {
        await P.evaluate(REC);
        /* Home's Community bubble (the one that used to be Settings) */
        /* the bubble's tap handler calls goTab('foryou') (home-orbit-v2.js); call it the same way so a missed tap on a
           floating bubble can't hide the result. TAP=1 taps the real bubble instead. */
        const b = P.locator('#whHud .o8-settings').first();
        if (process.env.TAP && await b.count()) await R.tapEl(b); else await P.evaluate(() => (document.body.dispatchEvent(new Event('pointerdown',{bubbles:true})),window.goTab)('foryou'));
        await H.sleep(2500);
        return P.evaluate(() => { const o = window.__ft.stop(); const t0 = window.__ft.t0; return o.map(x => ({ t: x.t - Math.round(t0), s: x.s })); });
    };
    const goHome = async () => { await P.evaluate(() => (document.body.dispatchEvent(new Event('pointerdown',{bubbles:true})),window.goTab)('home')); await H.sleep(1200); };
    try {
        R.step = 'boot'; await R.goto(); await H.sleep(5000);
        for (const ord of ORDERS) {
            await P.evaluate(o => localStorage.setItem('lowispike.community.tabs', JSON.stringify(o)), ord);
            for (const before of ['fresh', 'left-in-chat-room', 'left-in-chat', 'left-in-aff', 'left-in-room']) {
                R.step = ord[0] + '/' + before;
                await ready();
                if (before !== 'fresh') {
                    /* get into that place first, then leave to Home */
                    await P.evaluate(() => (document.body.dispatchEvent(new Event('pointerdown',{bubbles:true})),window.goTab)('foryou')); await H.sleep(1500);
                    await P.evaluate(b => {
                        const U = window.LowiRoomsUI, C = window.LowiCommunity;
                        if (b === 'left-in-chat-room') { U.setTab(true); C.thread(true); }
                        else if (b === 'left-in-chat') U.setTab(true);
                        else if (b === 'left-in-aff') U.showView('aff');
                        else U.setTab(false);
                    }, before); await H.sleep(1200);
                    await goHome();
                }
                const seq = await openCommunity();
                const want = expectOf(ord[0]);
                const painted = seq.filter(x => x.s !== 'closed');
                const ok = painted.length > 0 && painted[0].s === want && painted.every(x => x.s === want || x.s.startsWith(ord[0] + '|'));
                results.push({ order: ord.join(','), before, ok, seq: painted.map(x => x.t + 'ms ' + x.s).join('  >  ') });
                console.log(ok ? 'PASS' : 'FAIL', ord.join(','), before, painted.map(x => x.t + 'ms ' + x.s).join('  >  '));
                await goHome();
            }
        }
        /* a reply from a Home visit (openMessage) must still land in the chat room on that message, whatever the order */
        for (const ord of [ORDERS[0], ORDERS[2]]) {
            await P.evaluate(o => localStorage.setItem('lowispike.community.tabs', JSON.stringify(o)), ord);
            R.step = ord[0] + '/home-reply';
            await P.evaluate(REC);
            await P.evaluate(() => { const C = window.LowiCommunity, l = C.latest && C.latest(); document.body.dispatchEvent(new Event('pointerdown',{bubbles:true})); C.openMessage(l ? l.uid : '', l ? l.id : ''); });
            await H.sleep(2500);
            const seq = (await P.evaluate(() => window.__ft.stop())).filter(x => x.s !== 'closed');
            const ok = seq.length > 0 && seq.every(x => x.s === 'chat|chat-room');
            results.push({ order: ord.join(','), before: 'home-reply', ok });
            console.log(ok ? 'PASS' : 'FAIL', ord.join(','), 'home-reply', seq.map(x => x.s).join('  >  '));
            await goHome();
        }
    } catch (e) { console.log('ERR', R.step, e.message.slice(0, 300)); }
    const fails = results.filter(r => !r.ok).length;
    console.log('RESULT', JSON.stringify({ engine, runs: results.length, fails, errs: R.errs.slice(0, 10) }));
    await R.close();
    process.exit(fails ? 1 : 0);
})();
