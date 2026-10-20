#!/usr/bin/env node
/* W8 two precise checks (task 29188430), with a pure finger tap (mouse at x,y; no Playwright focus or fill):
   A. Visit Community, go Home, visit again (player's path each time). On each visit tap the chat box: does the keyboard
      target (document.activeElement) become #cmInput? Is #cmPaneChat inert? Then type with real key presses.
   B. After a send that the server accepts, how long until the box is empty again? Polls the box and the saved draft.
   Usage: node tools/regress/w8-tap-and-clear.cjs [--engine chromium|webkit] [--visits 4] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'chromium'), VISITS = +arg('visits', 4);
const TAG = process.env.REGRESS_TAG ? '-' + process.env.REGRESS_TAG : '';
const log = N.logger('w8-' + ENGINE + TAG);
const look = R => R.page.evaluate(() => {
    const i = document.getElementById('cmInput'), pane = document.getElementById('cmPaneChat');
    const k = Object.keys(localStorage).find(x => x.startsWith('lowi.community.draft.v1:'));
    let d = null; try { d = k && JSON.parse(localStorage.getItem(k)); } catch (e) { }
    return { box: i ? i.value : null, draft: d && d.draft ? d.draft.text : null, outbox: d && d.outbox ? d.outbox.map(m => m.status) : null, active: document.activeElement && (document.activeElement.id || document.activeElement.tagName), paneInert: pane ? pane.hasAttribute('inert') : null, trackKids: [...document.querySelectorAll('#cmTrack > .ls-pane')].map(p => p.id + (p.hasAttribute('inert') ? '(inert)' : '')).join(','), view: (typeof CMV !== 'undefined' && CMV.view) || '?' };
}).catch(e => ({ err: e.message }));
(async () => {
    const R = await open({ engine: ENGINE });
    const res = { engine: ENGINE, visits: [], clear: [] };
    await R.goto(); await N.sleep(3000);
    for (let v = 1; v <= VISITS; v++) {
        const row = { v };
        await N.openCommunity(R, log); await N.sleep(1200);
        row.before = await look(R);
        const hit = await N.hitTest(R, '#cmInput'); row.hitTop = hit.top;
        await R.page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()).catch(() => { });
        if (hit.x) { await R.page.mouse.click(hit.x, hit.y); await N.sleep(400); }
        row.afterTap = await look(R);
        row.tapFocusedBox = row.afterTap.active === 'cmInput';
        await R.page.keyboard.type('v' + v, { delay: 30 }); await N.sleep(300);
        row.afterType = await look(R);
        row.keysLanded = (row.afterType.box || '').endsWith('v' + v);
        /* clean the box for the next visit, the way a player would (select all, delete) only if it landed */
        if (row.keysLanded) { for (let k = 0; k < 2 + String(v).length; k++) await R.page.keyboard.press('Backspace'); }
        res.visits.push(row); log('visit', { v, hitTop: row.hitTop, paneInert: row.before.paneInert, track: row.before.trackKids, view: row.before.view, tapFocusedBox: row.tapFocusedBox, keysLanded: row.keysLanded });
        if (v < VISITS) { await N.goHome(R, log); await N.sleep(1000); }
    }
    /* B: send, poll the box */
    for (let n = 1; n <= 2; n++) {
        await R.page.evaluate(() => { const i = document.getElementById('cmInput'); if (i) i.removeAttribute('disabled'); }).catch(() => { });
        const hit = await N.hitTest(R, '#cmInput');
        await R.page.evaluate(() => { const p = document.getElementById('cmPaneChat'); if (p) p.removeAttribute('inert'); }).catch(() => { }); /* make sure B measures clearing, not tapping */
        await R.page.mouse.click(hit.x, hit.y); await R.page.keyboard.type('clear test ' + n, { delay: 20 });
        const p0 = R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').length;
        await R.page.keyboard.press('Enter');
        const t0 = Date.now(), trace = [];
        while (Date.now() - t0 < 4000) { const s = await look(R); trace.push({ ms: Date.now() - t0, box: s.box, draft: s.draft, outbox: s.outbox }); if (s.box === '' && Date.now() - t0 > 500) break; await N.sleep(250); }
        const r = { n, posted: R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').length - p0, clearedAtMs: (trace.find(t => t.box === '') || {}).ms ?? null, draftClearedAtMs: (trace.find(t => t.draft === '') || {}).ms ?? null, last: trace[trace.length - 1] };
        res.clear.push(r); log('clear', r);
    }
    res.errs = R.errs.map(e => e.step + ': ' + e.m.slice(0, 200)); res.crashed = R.crashed;
    fs.writeFileSync(path.join(__dirname, 'out', 'w8-' + ENGINE + TAG + '.json'), JSON.stringify(res, null, 1));
    log('DONE errs=' + R.errs.length); await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
