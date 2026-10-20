#!/usr/bin/env node
/* W1 chat lifecycle (task 29188430). Emmanuel's crash path, done many times in a row with the things a real phone adds:
   Home -> Settings -> Community -> tap the box -> type letter by letter while the room is busy -> keyboard opens (viewport
   shrinks) -> half the rounds send, half leave a draft -> app hidden and shown mid-typing -> open the Chat history and
   scroll -> leave by the menu bar or the browser back gesture. Counts per round what makes iOS kill a tab.
   Usage: node tools/regress/w1-chat-lifecycle.cjs [--engine webkit|chromium] [--rounds 10] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'webkit'), ROUNDS = +arg('rounds', 10);
const log = N.logger('w1-' + ENGINE);
const fs = require('fs'), path = require('path');
(async () => {
    const R = await open({ engine: ENGINE, members: 45, messages: 300 });
    const res = { engine: ENGINE, rounds: [], findings: [], sends: 0 };
    await R.goto(); await N.sleep(2500);
    log('booted', await R.snap());
    let busy = null;
    for (let i = 1; i <= ROUNDS && !R.crashed; i++) {
        R.step = 'round ' + i;
        const row = { i };
        await N.openCommunity(R, log);
        row.tab = await N.tab(R);
        /* the room is busy: a message every 350 ms, a photo now and then, reactions */
        busy = setInterval(() => { try { if (Math.random() < .15) R.sim.photoSay(); else R.sim.say(); if (Math.random() < .3) R.sim.react(R.sim.W.messages[R.sim.W.messages.length - 2].id); } catch (e) { } }, 350);
        const input = R.page.locator('#cmInput');
        try { await input.tap({ timeout: 5000 }); } catch (e) { row.tapErr = String(e.message).split('\n')[0]; await input.focus().catch(() => { }); }
        /* keyboard up: the visible area shrinks (desktop engines can only resize the layout viewport) */
        await R.page.setViewportSize({ width: 390, height: 844 - 336 }).catch(() => { });
        await N.sleep(300);
        row.inputHitKb = await N.hitTest(R, '#cmInput');
        const text = 'round ' + i + ' typing like Emmanuel does 🙂 ' + 'abcdefghij'.slice(0, i % 10);
        const tt = Date.now();
        await N.within(input.pressSequentially(text, { delay: 35 }), 30000, 'typing', log);
        row.typeMs = Date.now() - tt;
        if (i % 3 === 0) { row.hid = await N.hideShow(R, 1500); }
        row.valueAfterType = await R.page.evaluate(() => (document.getElementById('cmInput') || {}).value || '').catch(() => '?');
        row.draftKept = row.valueAfterType === text;
        if (i % 2 === 0) {
            const before = R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').length;
            await R.page.keyboard.press('Enter').catch(() => { });
            await N.sleep(900);
            let after = R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').length;
            if (after === before) { await R.page.locator('#cmSend').tap({ timeout: 3000 }).catch(() => { }); await N.sleep(900); after = R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').length; row.sendNeededButton = true; }
            row.posted = after - before; res.sends++;
            row.boxAfterSend = await R.page.evaluate(() => (document.getElementById('cmInput') || {}).value || '').catch(() => '?');
        }
        await R.page.setViewportSize({ width: 390, height: 844 }).catch(() => { });
        await N.sleep(300);
        /* the Chat history, scrolled up and down hard */
        try {
            await R.page.locator('.cg-hist').first().tap({ timeout: 4000 });
            await N.sleep(700);
            row.histOverlays = await N.overlays(R);
            for (let s = 0; s < 6; s++) { await R.page.mouse.move(195, 400); await R.page.mouse.wheel(0, s % 2 ? 2500 : -2500); await N.sleep(150); }
        } catch (e) { row.histErr = String(e.message).split('\n')[0]; }
        clearInterval(busy); busy = null;
        /* leave: alternate browser back (iOS edge swipe) and the menu bar / Home */
        if (i % 2) {
            const u0 = R.page.url(), l0 = R.loads;
            await R.page.goBack({ timeout: 5000 }).catch(e => { row.backErr = String(e.message).split('\n')[0]; });
            await N.sleep(1200);
            row.back = { urlChanged: R.page.url() !== u0, reloaded: R.loads !== l0, tab: await N.tab(R), overlays: await N.overlays(R) };
            if (row.back.reloaded || row.back.urlChanged) { log('back left the page; reopening'); await R.goto(); await N.sleep(2000); }
        }
        row.home = await N.goHome(R, log);
        await N.sleep(500);
        row.overlaysAtHome = await N.overlays(R);
        row.snap = await N.within(R.snap(), 20000, 'snap', log);
        row.errs = R.errs.length;
        res.rounds.push(row);
        log('round', row);
    }
    if (busy) clearInterval(busy);
    /* reopen once more: does the draft from the last unsent round come back? */
    await N.openCommunity(R, log);
    res.finalBox = await R.page.evaluate(() => (document.getElementById('cmInput') || {}).value || '').catch(() => '?');
    res.crashed = R.crashed; res.loads = R.loads; res.errs = R.errs; res.writes = R.sim.writes.filter(w => w.t === 'messages').map(w => ({ m: w.m, body: w.body && w.body.body }));
    await R.shot(path.join(__dirname, 'out', 'w1-' + ENGINE + '-end.png'));
    fs.writeFileSync(path.join(__dirname, 'out', 'w1-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE crashed=' + R.crashed + ' loads=' + R.loads + ' errs=' + R.errs.length + ' sends=' + res.sends + ' posted=' + res.writes.filter(w => w.m === 'POST').length);
    await R.close();
    process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
