'use strict';
/* Reload-crash probe (code error sweep 22 Oct 18:02): live app in WebKit, one step (plain, tabs, chat = Community chat room open + Escape, scan), Home, then 2 reloads; reports renderer crashes.
   node tools/probe-chat-reload.cjs [device] [case...]   NORELOAD=1: wait 12 s instead of reloading */
const H = require('./sim/harness.cjs');
const [device = 'iPhone 15', ...cases] = process.argv.slice(2);
const url = 'https://therealetm.github.io/lowispike/index.html';
const go = (P, t) => P.evaluate(x => { try { window.goTab(x); } catch (e) { } }, t);
const steps = {
    plain: async P => { },
    tabs: async P => { for (const t of ['foryou', 'shelf', 'profile', 'move']) { await go(P, t); await H.sleep(2600); } },
    chat: async P => { await go(P, 'foryou'); await H.sleep(2600); await P.evaluate(() => { try { window.LowiRoomsUI.setTab(true); window.LowiCommunity.thread(true); } catch (e) { } }); await H.sleep(1800); await P.keyboard.press('Escape').catch(() => { }); await H.sleep(600); },
    scan: async P => { await go(P, 'scan'); await H.sleep(2600); await P.keyboard.press('Escape').catch(() => { }); await H.sleep(500); },
};
(async () => {
    for (const c of (cases.length ? cases : Object.keys(steps))) {
        let R, res;
        try {
            R = await H.open({ engine: 'webkit', device, url }); const P = R.page;
            await R.goto(); await H.sleep(6000);
            await steps[c](P);
            await go(P, 'home'); await H.sleep(800);
            if (process.env.NORELOAD) { await H.sleep(12000); } else for (let i = 1; i <= 2; i++) { await P.reload({ waitUntil: 'load' }); await H.sleep(5000); }
            res = { ok: true, crashed: R.crashed, errs: R.errs.length };
        } catch (e) { res = { ok: false, err: e.message.split('\n')[0], crashed: R && R.crashed }; }
        if (R) await R.close().catch(() => { });
        console.log(device, c, JSON.stringify(res));
    }
})();
