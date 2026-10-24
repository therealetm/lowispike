/* Probe (Oct 24 2026, cycle benefits audit): with cycle tracking on, which of the old cycle pieces in index.html are on screen
   anywhere a person can reach: the Today card (#cyToday), the old sheet (#cySheet, LowiCycle.open), the Daily Quest tip quest
   (cycleInfo().quest, "Cycle mode"), the Move badge (data-cyb), the PCOS tip. Local folder by default, URL=... for live. */
const H = require('./sim/harness.cjs');
(async () => {
    const R = await H.open({ engine: process.env.ENGINE || 'chromium', url: process.env.URL || '', probe: false, device: process.env.DEVICE || 'iPhone 13' });
    const p = R.page, out = {};
    const vis = sel => p.evaluate(sel => Array.from(document.querySelectorAll(sel)).map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); let hid = false; for (let n = e; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0 || n.hidden) { hid = true; break; } } return { w: Math.round(r.width), h: Math.round(r.height), hid, txt: (e.textContent || '').trim().slice(0, 80) }; }), sel);
    const textOn = re => p.evaluate(re => { const rx = new RegExp(re, 'i'); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const hits = []; let n; while ((n = w.nextNode())) { if (rx.test(n.nodeValue)) { const e = n.parentElement; let hid = false; for (let q = e; q && q !== document.body; q = q.parentElement) { const c = getComputedStyle(q); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0 || q.hidden) { hid = true; break; } } const r = e.getBoundingClientRect(); hits.push({ t: n.nodeValue.trim().slice(0, 70), hid, w: Math.round(r.width) }); } } return hits.slice(0, 6); }, re);
    try {
        await R.goto(); await H.sleep(8000);
        out.build = await p.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content);
        out.setup = await p.evaluate(() => { const s = LowiR2.S(); s.user.gender = 'f'; LowiCycle.setShow(true); const d = new Date(); d.setDate(d.getDate() - 7); const k = d.toISOString().slice(0, 10); LowiCycle.markStart(k); return LowiCycle.model() && { day: LowiCycle.model().day, ph: LowiCycle.model().ph, info: typeof cycleInfo === 'function' ? cycleInfo() : null }; });
        await H.sleep(2500);
        for (const tab of ['home', 'today', 'move', 'cook', 'profile']) {
            await p.evaluate(t => { try { goTab(t); } catch (e) { const b = document.querySelector('[data-tab="' + t + '"]'); b && b.click(); } }, tab); await H.sleep(2200);
            if (tab === 'today') { await p.evaluate(() => { try { LowiWorldHome.openToday(true); } catch (e) { } }); await H.sleep(1800); }
            out[tab] = { cyToday: await vis('#cyToday'), cyCard: await vis('.cy-card'), cyOpenBtn: await vis('[data-cy="open"]'), cyb: await vis('[data-cyb]'), cycleMode: await textOn('Cycle mode|Zyklus-Modus'), pcos: await textOn('PCOS'), cwOpen: await vis('[data-cw="open"]') };
        }
        out.oldSheet = await p.evaluate(() => { try { LowiCycle.open(); } catch (e) { return 'err ' + e.message; } return !!document.getElementById('cySheet'); });
        out.quests = await p.evaluate(() => { try { return curQuests().map(q => q.id + ':' + q.t); } catch (e) { return 'n/a ' + e.message; } });
        out.errs = R.errs.slice(0, 5);
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 500); }
    console.log(JSON.stringify(out, null, 1));
    await R.close();
})();
