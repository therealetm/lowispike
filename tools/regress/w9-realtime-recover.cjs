#!/usr/bin/env node
/* W9 live chat after a network drop (task 29188430, follow-up to W4 S4 where a message sent after the drop never showed).
   A. the realtime socket drops (server side close); log every rejoin; a member writes after the rejoin: does it arrive?
   B. the phone goes offline for 8 s; two members write meanwhile; back online: are the missed messages fetched?
   Usage: node tools/regress/w9-realtime-recover.cjs [--engine webkit|chromium] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'webkit');
const log = N.logger('w9-' + ENGINE);
const inPage = (R, tok) => R.page.evaluate(t => (document.getElementById('tab-foryou') || document.body).textContent.split(t).length - 1, tok).catch(() => -1);
const waitFor = async (R, tok, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await inPage(R, tok) > 0) return Date.now() - t0; await N.sleep(500); } return null; };
(async () => {
    const R = await open({ engine: ENGINE });
    const joins = []; const set0 = R.sim.topics.set.bind(R.sim.topics);
    R.sim.topics.set = (k, v) => { joins.push({ at: Date.now(), topic: k }); return set0(k, v); };
    const res = { engine: ENGINE };
    await R.goto(); await N.sleep(2500); await N.openCommunity(R, log); await N.sleep(1500);
    /* control: a message with the line up */
    const c = 'W9ctl' + (Date.now() % 1e5); R.sim.say('control ' + c); res.controlArrivedMs = await waitFor(R, c, 8000);
    log('control', res.controlArrivedMs);
    /* A */
    const j0 = joins.length, rest0 = R.sim.counts.rest;
    for (const w of [...R.sim.sockets]) { try { await w.close({ code: 1006, reason: 'sim drop' }); } catch (e) { } }
    const t0 = Date.now(); while (Date.now() - t0 < 30000 && joins.length === j0) await N.sleep(500);
    res.A = { rejoinedAfterMs: joins.length > j0 ? joins[j0].at - t0 : null, rejoins: joins.length - j0, topics: [...R.sim.topics.keys()], restCalls: R.sim.counts.rest - rest0 };
    await N.sleep(800);
    const a = 'W9A' + (Date.now() % 1e5); R.sim.say('after drop ' + a); res.A.arrivedMs = await waitFor(R, a, 15000);
    log('A', res.A);
    /* B */
    const rest1 = R.sim.counts.rest;
    await R.ctx.setOffline(true); await R.page.evaluate(() => window.dispatchEvent(new Event('offline'))).catch(() => { });
    for (const w of [...R.sim.sockets]) { try { await w.close({ code: 1006, reason: 'offline' }); } catch (e) { } }
    await N.sleep(1500);
    const b1 = 'W9B1' + (Date.now() % 1e5), b2 = 'W9B2' + (Date.now() % 1e5);
    R.sim.say('missed one ' + b1); await N.sleep(1500); R.sim.say('missed two ' + b2); await N.sleep(5000);
    await R.ctx.setOffline(false); await R.page.evaluate(() => window.dispatchEvent(new Event('online'))).catch(() => { });
    const m1 = await waitFor(R, b1, 25000), m2 = await inPage(R, b2);
    res.B = { missed1ShownAfterMs: m1, missed2Shown: m2 > 0, restCallsSinceOffline: R.sim.counts.rest - rest1, rejoins: joins.length };
    const nb = 'W9B3' + (Date.now() % 1e5); R.sim.say('live after online ' + nb); res.B.liveAfterOnlineMs = await waitFor(R, nb, 15000);
    res.B.notice = await R.page.evaluate(() => { const n = document.getElementById('csNotice'); return n ? n.textContent.trim() : null; }).catch(() => null);
    log('B', res.B);
    res.joins = joins.map(j => ({ s: ((j.at - joins[0].at) / 1000).toFixed(1), topic: j.topic })); res.errs = R.errs.map(e => e.m.slice(0, 160)); res.log = R.sim.log.slice(-10);
    fs.writeFileSync(path.join(__dirname, 'out', 'w9-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE'); await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
