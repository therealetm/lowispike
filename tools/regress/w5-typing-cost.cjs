#!/usr/bin/env node
/* W5 cost of one keystroke in the Community chat box (task 29188430). W1 saw typing run 4 to 7 times slower than the
   keys were pressed. This measures, inside the page, what one 'input' event costs: handler time, DOM mutations, and
   localStorage writes, with a quiet room and with a busy one (300 messages). Machine load does not change the counts.
   Usage: node tools/regress/w5-typing-cost.cjs [--engine chromium|webkit] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'chromium');
const log = N.logger('w5-' + ENGINE);
const measure = R => R.page.evaluate(async () => {
    const inp = document.getElementById('cmInput'); if (!inp) return { missing: true };
    inp.focus({ preventScroll: true });
    let muts = 0, nodesTouched = 0; const mo = new MutationObserver(l => { muts += l.length; for (const r of l) nodesTouched += (r.addedNodes ? r.addedNodes.length : 0) + (r.removedNodes ? r.removedNodes.length : 0); });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    let writes = 0, bytes = 0; const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { writes++; bytes += String(v).length; return orig.call(this, k, v); };
    const text = 'hello everyone this is a typing cost test 123'; const per = [];
    inp.value = '';
    for (const ch of text) {
        inp.value += ch; const t = performance.now();
        inp.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
        per.push(performance.now() - t);
        await new Promise(r => requestAnimationFrame(() => r()));
    }
    await new Promise(r => setTimeout(r, 300));
    mo.disconnect(); Storage.prototype.setItem = orig;
    per.sort((a, b) => a - b);
    const keys = text.length;
    return { keys, msMedian: +per[keys >> 1].toFixed(2), msP90: +per[Math.floor(keys * .9)].toFixed(2), msMax: +per[keys - 1].toFixed(2), mutationsPerKey: +(muts / keys).toFixed(1), nodesAddedRemovedPerKey: +(nodesTouched / keys).toFixed(1), storageWritesPerKey: +(writes / keys).toFixed(2), storageBytesPerKey: Math.round(bytes / keys), msgs: document.querySelectorAll('[data-mid],.cs-msg').length };
}).catch(e => ({ err: e.message }));
(async () => {
    const res = { engine: ENGINE, runs: [] };
    for (const msgs of [20, 300]) {
        const R = await open({ engine: ENGINE, members: 45, messages: msgs });
        await R.goto(); await N.sleep(2500); await N.openCommunity(R, log); await N.sleep(800);
        const quiet = await measure(R);
        const busy = setInterval(() => { try { R.sim.say(); } catch (e) { } }, 400);
        const loud = await measure(R);
        clearInterval(busy);
        /* the same with the Chat history open (the full list is on screen) */
        await R.page.locator('.cg-hist').first().click({ timeout: 4000, force: true }).catch(() => { }); await N.sleep(800);
        const hist = await measure(R);
        res.runs.push({ seeded: msgs, quiet, busyRoom: loud, historyOpen: hist, errs: R.errs.length });
        log('seeded ' + msgs, { quiet, busyRoom: loud, historyOpen: hist });
        await R.close();
    }
    fs.writeFileSync(path.join(__dirname, 'out', 'w5-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE'); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
