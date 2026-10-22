/* Item 33 Community sweep (22 Oct 2026): drives Community with real finger taps on one device and checks each step.
   Devices: se (iPhone SE 375x667), 15 (iPhone 15 393x852), max (iPhone 15 Pro Max 430x932), ipad (iPad 820x1180).
   Steps: open from Home's bubble, every tab by tap, Chat channel list -> a room, type with the iOS-like keyboard, send,
   the room's back button, the phone's back (history), every tab again, leave and reopen, 3 fast open/close cycles,
   tab switching x20, and a long session (the room open with live traffic for 60 s).
   Checks per step: the tab bar is on screen and not covered, nothing wider than the screen, the selected tab matches what shows,
   the X (back to Home) is on screen, page errors, and the input stays above the keyboard. Screenshots to /tmp/sim/sweep-<dev>-*.png.
   node tools/community-sweep/sweep.cjs [webkit|chromium] [se|15|max|ipad] [root|url] */
'use strict';
const H = require('../sim/harness.cjs');
const [engine = 'webkit', dev = 'se', where = ''] = process.argv.slice(2);
const DEV = { se: 'iPhone SE', '15': 'iPhone 15', max: 'iPhone 15 Pro Max', ipad: 'iPad (gen 7)' };
(async () => {
    const o = { engine, members: 40, messages: 300, keyboard: true, device: DEV[dev] || 'iPhone SE' };
    if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
    const R = await H.open(o); const P = R.page; const issues = []; const log = [];
    let loads = 0; P.on('load', () => { loads++; });
    P.on('crash', () => issues.push('page crashed'));
    const shot = n => R.shot('/tmp/sim/sweep-' + dev + '-' + n + '.png');
    const look = () => P.evaluate(() => {
        const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05 && r.bottom > 0 && r.top < innerHeight; };
        const pg = document.getElementById('tab-foryou'), open = !!(pg && pg.classList.contains('active'));
        const bar = document.querySelector('#cmPaneChat .rm-bar, #cmPaneChat .rm-tabs');
        const sel = document.querySelector('#cmPaneChat .rm-tab[aria-selected="true"]');
        const th = document.getElementById('cgThread'), room = !!(th && th.hasAttribute('data-open'));
        const view = window.LowiRoomsUI && window.LowiRoomsUI.view();
        let covered = null;
        if (bar && vis(bar) && !room) { const r = bar.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const e = document.elementFromPoint(x, y); if (e && !bar.contains(e) && !e.closest('.rm-bar')) covered = (e.id || e.className || e.tagName).toString().slice(0, 60); }
        const sw = document.documentElement.scrollWidth, wide = sw > innerWidth + 2 ? sw : 0;
        let wideEl = ''; if (wide) { for (const e of document.querySelectorAll('#tab-foryou *')) { const r = e.getBoundingClientRect(); if (r.right > innerWidth + 4 && r.width > 0 && vis(e)) { wideEl = (e.id || e.className || e.tagName).toString().slice(0, 60); break; } } }
        const x = document.querySelector('.sec-x, #secX, [data-sec-x]');
        const inp = document.getElementById('cmInput');
        const kb = window.__kb ? window.__kb.h || 0 : 0;
        const inpR = inp && vis(inp) ? inp.getBoundingClientRect() : null;
        const vv = window.visualViewport ? window.visualViewport.height : innerHeight;
        return { open, bar: !!(bar && vis(bar)), sel: sel ? sel.dataset.rm : null, room, view, covered, wide, wideEl, x: !!(x && vis(x)), inpBottom: inpR ? Math.round(inpR.bottom) : null, vv: Math.round(vv), kb, nodes: document.getElementsByTagName('*').length };
    }).catch(e => ({ err: e.message.slice(0, 100) }));
    const step = async (name, want) => {
        const s = await look(); log.push(name + ' ' + JSON.stringify(s));
        const bad = [];
        if (s.err) bad.push(s.err);
        if (want.open !== undefined && s.open !== want.open) bad.push('open=' + s.open);
        if (want.sel && s.sel !== want.sel) bad.push('selected tab ' + s.sel + ' (want ' + want.sel + ')');
        if (want.room !== undefined && s.room !== want.room) bad.push('chat room open=' + s.room);
        if (s.open && !s.room && !s.bar) bad.push('tab bar not on screen');
        if (s.covered) bad.push('tab bar covered by ' + s.covered);
        if (s.wide) bad.push('page ' + s.wide + 'px wide (' + s.wideEl + ')');
        if (s.open && !s.x && !s.room) bad.push('no X back to Home on screen');
        if (want.kb && s.inpBottom && s.inpBottom > s.vv + 2) bad.push('input below the keyboard (' + s.inpBottom + ' > ' + s.vv + ')');
        if (bad.length) { issues.push(name + ': ' + bad.join('; ')); await shot(name.replace(/\W+/g, '_')); }
        return s;
    };
    const tapTab = async id => { await R.tap('#cmPaneChat .rm-tab[data-rm="' + id + '"]'); await H.sleep(900); };
    const errs0 = () => R.errs.length;
    try {
        await R.goto(); await H.sleep(6000);
        await P.evaluate(() => localStorage.setItem('lowispike.community.tabs', JSON.stringify(['room', 'chat', 'create', 'aff'])));
        /* 1. open from Home's Community bubble with a real tap */
        const bub = P.locator('#whHud .o8-settings').first();
        if (await bub.count()) { await R.tapEl(bub); } else { issues.push('no Community bubble on Home'); await P.evaluate(() => window.goTab('foryou')); }
        await H.sleep(2200);
        await step('open', { open: true, sel: 'room', room: false }); await shot('01-open');
        /* 2. every tab by tap */
        for (const id of ['chat', 'create', 'aff', 'room']) { await tapTab(id); await step('tab-' + id, { open: true, sel: id }); await shot('02-tab-' + id); }
        /* 3. Chat -> a room, type, send, back button */
        await tapTab('chat');
        const ch = P.locator('#cmPaneChat .rm-chans .rm-ch:not([disabled])').first();
        if (await ch.count()) { await R.tapEl(ch); await H.sleep(1500); } else issues.push('no channel row in Chat');
        await step('chat-room', { open: true, room: true }); await shot('03-room');
        const inp = P.locator('#cmInput');
        if (await inp.count()) {
            await R.tapEl(inp); await H.sleep(900);
            await P.keyboard.type('sweep test ' + dev, { delay: 30 }); await H.sleep(500);
            await step('typing', { open: true, room: true, kb: true }); await shot('04-typing');
            const send = P.locator('#cmPaneChat [data-chat="send"]').first();
            if (await send.count() && await send.isVisible()) { await R.tapEl(send); await H.sleep(1200); }
            else { await P.keyboard.press('Enter'); await H.sleep(1200); }
            const sent = await P.evaluate(() => [...document.querySelectorAll('#cmList .cm-t')].some(e => /sweep test/.test(e.textContent)));
            if (!sent) issues.push('sent message not in the room');
            const left = await P.evaluate(() => (document.getElementById('cmInput') || {}).value || '');
            if (left) issues.push('input not cleared after send: ' + left);
            await P.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await H.sleep(600);
        } else issues.push('no message field in the room');
        const back = P.locator('#cmPaneChat [data-chat="close-thread"]').first();
        if (await back.count() && await back.isVisible()) { await R.tapEl(back); await H.sleep(1000); } else issues.push('no back button in the room');
        await step('room-back', { open: true, room: false, sel: 'chat' });
        /* 4. the phone's back from a room: room closes, Community stays */
        await R.tapEl(P.locator('#cmPaneChat .rm-chans .rm-ch:not([disabled])').first()); await H.sleep(1200);
        await P.evaluate(() => history.back()); await H.sleep(1500);
        await step('history-back-from-room', { open: true, room: false });
        /* 5. back from Community: Home */
        await P.evaluate(() => history.back()); await H.sleep(1500);
        const h = await look(); if (h.open) issues.push('history back from Community did not go Home');
        /* 6. reopen: first tab, with nothing left over */
        if (await bub.count()) await R.tapEl(bub); else await P.evaluate(() => window.goTab('foryou'));
        await H.sleep(2000);
        await step('reopen', { open: true, sel: 'room', room: false });
        /* 7. X back to Home */
        const x = P.locator('.sec-x, #secX, [data-sec-x]').first();
        if (await x.count() && await x.isVisible()) { await R.tapEl(x); await H.sleep(1500); } else { issues.push('no X'); await P.evaluate(() => window.goTab('home')); await H.sleep(1200); }
        if ((await look()).open) issues.push('X did not go Home');
        /* 8. fast open/close x3 */
        for (let i = 0; i < 3; i++) { await P.evaluate(() => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); window.goTab('foryou'); }); await H.sleep(350); await P.evaluate(() => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); window.goTab('home'); }); await H.sleep(350); }
        await P.evaluate(() => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); window.goTab('foryou'); }); await H.sleep(2000);
        await step('after-fast-cycles', { open: true, sel: 'room', room: false });
        /* 9. tab switching x20 */
        const n0 = (await look()).nodes;
        const ids = ['chat', 'create', 'aff', 'room'];
        for (let i = 0; i < 20; i++) { await R.tap('#cmPaneChat .rm-tab[data-rm="' + ids[i % 4] + '"]'); await H.sleep(250); }
        await H.sleep(1200);
        const s9 = await step('after-20-switches', { open: true, sel: 'room' });
        log.push('nodes before/after 20 switches ' + n0 + ' / ' + s9.nodes);
        /* 10. long session: the room open 60 s with traffic */
        await tapTab('chat'); await R.tapEl(P.locator('#cmPaneChat .rm-chans .rm-ch:not([disabled])').first()); await H.sleep(1000);
        const m0 = await R.snap();
        const room = await P.evaluate(() => window.LowiRooms ? LowiRooms.room() : 'all').catch(() => 'all');
        for (let i = 0; i < 60; i++) { try { if (i % 10 === 3) R.sim.photoSay(); else R.sim.say(undefined, undefined, room); } catch (e) { } await H.sleep(1000); }
        const m1 = await R.snap();
        log.push('long session nodes ' + m0.nodes + ' -> ' + m1.nodes + ', canvases ' + m0.canv + ' -> ' + m1.canv + ', heap ' + m0.heap + ' -> ' + m1.heap);
        await step('long-session', { open: true, room: true }); await shot('10-long');
    } catch (e) { issues.push('ERR ' + e.message.slice(0, 200)); await shot('err'); }
    const pageErrs = R.errs.filter(e => !/closest is not a function/.test(e.m || ''));
    for (const e of pageErrs.slice(0, 8)) issues.push('page error at ' + e.step + ': ' + String(e.m).slice(0, 160));
    if (loads > 1) issues.push('page reloaded ' + (loads - 1) + 'x');
    log.forEach(l => console.log('LOG', l.slice(0, 400)));
    issues.forEach(i => console.log('ISSUE', i));
    console.log('RESULT', JSON.stringify({ engine, dev, issues: issues.length }));
    await R.close();
})();
