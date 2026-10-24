/* Cycle live check in English and German (Oct 24 2026): a woman with tracking on sees her phase on Home (Misty's card section),
   My cycle opens with day, phase, the How are you today? check-in and the rough-guide line that says it is not for birth control;
   a man gets no cycle UI. iPhone 13 runs in WebKit; the iPad runs in Chromium at 834x1194 @2x (WebKit iPad freezes in this VM,
   see MAYA-HANDOFF 2026-10-24 03:30). URL=https://therealetm.github.io/lowispike/ node tools/check-cycle-live-lang.cjs */
const H = require('./sim/harness.cjs');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/cycle-lang';
fs.mkdirSync(OUT, { recursive: true });
const ok = [], bad = [];
const check = (c, m) => { (c ? ok : bad).push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
const RUNS = (process.env.RUNS || 'iphone:en,iphone:de,ipad:en,ipad:de').split(',');
const NOBC = { en: /Not for birth control/, de: /Nicht zur Verhütung/ };

async function run(dev, lang) {
    const tag = dev + '-' + lang;
    const o = dev === 'iphone' ? { engine: 'webkit', device: 'iPhone 13' } : { engine: 'chromium', viewport: { width: 834, height: 1194 }, dpr: 2 };
    const R = await H.open(Object.assign(o, { url: process.env.URL || '', lang, probe: false }));
    const p = R.page;
    try {
        await R.goto(); await H.sleep(7000);
        await p.evaluate(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(1200);
        const b = await p.evaluate(() => ({ build: (document.querySelector('meta[name=lowi-build]') || {}).content, vp: innerWidth + 'x' + innerHeight, lang: window.LowiLang && LowiLang.get() }));
        check(true, tag + ': build ' + b.build + ', viewport ' + b.vp + ', app language ' + b.lang);
        /* a woman who said yes, period started 9 days ago */
        const st = await p.evaluate(() => {
            const s = LowiR2.S(); s.user.gender = 'f'; s.setupDone = true; delete (s.health || {}).cyc;
            LowiCycle.setShow(true);
            const d = new Date(); d.setDate(d.getDate() - 9); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            LowiCycle.markStart(k);
            try { LowiCycleWorld.paintRing(); } catch (e) { }
            const m = LowiCycle.model();
            return { on: LowiCycle.enabled(), day: m && m.day, ph: m && m.ph, hub: (LowiCycleWorld.hubHtml() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) };
        });
        check(st.on && st.day === 10 && st.ph === 'follicular', tag + ': tracking on, day ' + st.day + ', phase ' + st.ph);
        check(st.hub.length > 5, tag + ': Your cycle section for Misty\'s card: "' + st.hub + '"');
        await p.evaluate(() => LowiCycleWorld.open()); await H.sleep(1500);
        const sh = await p.evaluate(l => ({ open: LowiCycleWorld.isOpen(), txt: (document.getElementById('cwSheet') || {}).innerText || '', cls: (document.querySelector('#cwSheet .cw-svg') || { getAttribute: () => '' }).getAttribute('class'), grow: LowiCycleWorld.cellOf('follicular', l).name, feel: LowiCycleWorld.strings[l].feelT, hedge: (document.querySelector('#cwSheet .cw-hedge') || {}).textContent || '', chips: document.querySelectorAll('#cwSheet [data-cw="feel"]').length }), lang);
        check(sh.open && /cw-grow/.test(sh.cls) && sh.txt.indexOf(sh.grow) >= 0 && /10/.test(sh.txt), tag + ': My cycle opens on day 10, ' + sh.grow + ' cell');
        check(sh.txt.indexOf(sh.feel) >= 0 && sh.chips >= 8, tag + ': check-in "' + sh.feel + '" with ' + sh.chips + ' symptom chips');
        check(NOBC[lang].test(sh.hedge), tag + ': note "' + sh.hedge.trim() + '"');
        await R.shot(OUT + '/' + tag + '-1-sheet.png');
        /* log cramps, the gentle-day offer appears */
        await p.evaluate(() => { const e = document.querySelector('#cwSheet [data-cw="feel"][data-v="cramps"]'); if (e) e.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
        await R.tapEl(p.locator('#cwSheet [data-cw="feel"][data-v="cramps"]').first()); await H.sleep(900);
        const fl = await p.evaluate(() => ({ pressed: (document.querySelector('#cwSheet [data-cw="feel"][data-v="cramps"]') || {}).getAttribute && document.querySelector('#cwSheet [data-cw="feel"][data-v="cramps"]').getAttribute('aria-pressed'), gentle: !!document.querySelector('#cwSheet [data-cw="gentle"]') }));
        check(fl.pressed === 'true' && fl.gentle, tag + ': tapping Cramps saves it and offers a gentle day ' + JSON.stringify(fl));
        const fit = await p.evaluate(() => [...document.querySelectorAll('#cwSheet *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).length);
        check(fit === 0, tag + ': nothing spills sideways');
        await R.shot(OUT + '/' + tag + '-2-feel.png');
        /* privacy: cycle data is not in the account backup */
        const priv = await p.evaluate(() => { try { const s = JSON.stringify(window.LowiAccountSync && LowiAccountSync.payload ? LowiAccountSync.payload() : null); return s === 'null' ? 'n/a' : (/"cyc"/.test(s) ? 'in backup' : 'not in backup'); } catch (e) { return 'n/a'; } });
        check(priv !== 'in backup', tag + ': cycle data and account backup: ' + priv);
        /* a man: nothing */
        await p.evaluate(() => { document.querySelectorAll('.r2-ov').forEach(o => { try { LowiR2.close(o); } catch (e) { } }); const s = LowiR2.S(); s.user.gender = 'm'; delete s.health.cyc; }); await H.sleep(600);
        const man = await p.evaluate(() => ({ on: LowiCycle.enabled(), open: LowiCycleWorld.open(), hub: LowiCycleWorld.hubHtml() || '' }));
        check(!man.on && man.open === false && !man.hub, tag + ': a man gets no cycle UI ' + JSON.stringify({ on: man.on, open: man.open, hub: man.hub.length }));
        check(R.errs.length === 0, tag + ': page errors ' + R.errs.length + (R.errs.length ? ' ' + JSON.stringify(R.errs.slice(0, 2)) : ''));
    } catch (e) { check(false, tag + ': ' + String(e.message).slice(0, 200)); }
    finally { await R.browser.close().catch(() => { }); if (R.srv) R.srv.close(); }
}
(async () => {
    for (const r of RUNS) { const [d, l] = r.split(':'); await run(d, l); }
    console.log('\n' + ok.length + ' pass, ' + bad.length + ' fail');
    process.exit(bad.length ? 1 : 0);
})();
