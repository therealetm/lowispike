/* evo-popup sim (Oct 22 2026): the evolution card ("MISTY COMET GREW!") must play once for a new form and never again on reload,
   with the real app, the fake cloud sign-in (so the herb prefs key really switches u:<name> -> uid while the app opens) and WebKit.
   Usage: node tools/sim/evo-seen.cjs ["iPhone 13"|"iPhone SE"] [en|de|es]. Browser simulation, not a real phone. */
'use strict';
const { open, sleep } = require('./harness.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en';
const HERB = 'lowi.herb.tamagotchi.v2:', SEEN = 'lowispike.evo.seen.v1';
(async () => {
    const R = await open({ device, lang, members: 6, messages: 20, posts: 4, probe: false });
    const page = R.page, out = { device, lang, checks: [] }, ok = (name, pass, extra) => { out.checks.push({ name, pass: !!pass, ...(extra || {}) }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (extra ? ' ' + JSON.stringify(extra) : '')); };
    const settle = async () => { await page.waitForFunction(() => window.LowiHerbTamagotchi && window.LOWI_CLOUD_X && window.LOWI_CLOUD_X.state().uid, null, { timeout: 60000 }).catch(() => { }); await sleep(2500); };
    /* the card waits for the skin (up to 15 s) and for open sheets; give it the whole window */
    const cardWithin = async (ms) => { const t = Date.now(); while (Date.now() - t < ms) { const on = await page.evaluate(() => !!document.getElementById('lhEvolution')).catch(() => false); if (on) return true; await sleep(400); } return false; };
    const closeBusy = () => page.evaluate(() => { document.querySelectorAll('#sheetwrap.open [data-act="close-sheet"], #lcUpd button, #drDay button').forEach(b => { try { b.click(); } catch (e) { } }); });
    try {
        await R.goto(); await settle();
        const st = await page.evaluate(() => { const x = window.LowiHerbTamagotchi.current(); return { index: x.m.index, uid: window.LOWI_CLOUD_X.state().uid, keys: Object.keys(localStorage).filter(k => k.startsWith('lowi.herb.tamagotchi.v2:')) }; });
        ok('signed in with a uid and the companion has a form', st.uid && st.index >= 1, st);
        /* the form just went up by one (as when XP arrives from the cloud): every herb record still says the form before */
        await page.evaluate(([H, S, i]) => { localStorage.removeItem(S); Object.keys(localStorage).filter(k => k.startsWith(H)).forEach(k => { const p = JSON.parse(localStorage.getItem(k)); p.lastSeenStage = i - 1; delete p.evoFrom; localStorage.setItem(k, JSON.stringify(p)); }); }, [HERB, SEEN, st.index]);
        await R.goto(); await settle(); await closeBusy();
        const first = await cardWithin(25000);
        const card = first ? await page.evaluate(() => { const e = document.getElementById('lhEvolution'); return { title: (e.querySelector('.lh-overline') || {}).textContent, lv: (e.querySelector('.lh-evo-lv') || {}).textContent, btn: (e.querySelector('button') || {}).textContent }; }) : null;
        ok('a new form celebrates once', first, card || undefined);
        if (first) { await R.tap('#lhEvolution button.lh-primary'); await sleep(800); }
        const after = await page.evaluate(([H, S]) => ({ seen: JSON.parse(localStorage.getItem(S) || 'null'), pending: Object.keys(localStorage).filter(k => k.startsWith(H)).filter(k => JSON.parse(localStorage.getItem(k)).evoFrom != null), card: !!document.getElementById('lhEvolution') }), [HERB, SEEN]);
        ok('closing the card remembers the form and clears every pending marker', after.seen && after.seen.stage === st.index && !after.pending.length && !after.card, after);
        for (let i = 1; i <= 3; i++) { await R.goto(); await settle(); await closeBusy(); const again = await cardWithin(18000); ok('reload ' + i + ': no replay', !again); }
        /* the state Emmanuel's phone is in today: a stale marker under u:<name>, none under the uid, no seen record yet */
        await page.evaluate(([H, S, i, uid]) => { localStorage.removeItem(S); const name = JSON.parse(localStorage.getItem('lowispike.v2') || '{}').user?.name || 'Emmanuel'; const base = JSON.parse(localStorage.getItem(H + uid) || '{}'); delete base.evoFrom; base.lastSeenStage = i; localStorage.setItem(H + uid, JSON.stringify(base)); localStorage.setItem(H + 'u:' + name, JSON.stringify(Object.assign({}, base, { lastSeenStage: i, evoFrom: i - 1 }))); }, [HERB, SEEN, st.index, st.uid]);
        await R.goto(); await settle(); await closeBusy();
        const dump = () => page.evaluate(([H, S]) => ({ seen: localStorage.getItem(S), herb: Object.keys(localStorage).filter(k => k.startsWith(H)).map(k => [k.slice(H.length, H.length + 12), (({ lastSeenStage, highestStage, evoFrom }) => ({ lastSeenStage, highestStage, evoFrom }))(JSON.parse(localStorage.getItem(k)))]), index: window.LowiHerbTamagotchi && window.LowiHerbTamagotchi.current().m.index, card: !!document.getElementById('lhEvolution') }), [HERB, SEEN]);
        const before = await dump(), stale = await cardWithin(18000);
        ok('a stale marker from the old build does not replay', !stale, stale ? { before, at: await dump() } : undefined);
        await R.goto(); await settle(); await closeBusy();
        ok('and stays quiet on the next reload', !(await cardWithin(18000)));
        await R.shot('/tmp/evo-seen-' + device.replace(/\W+/g, '') + '-' + lang + '.png');
        const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
        ok('no JavaScript errors', !errs.length, errs.length ? { errs: errs.slice(0, 3) } : undefined);
    } catch (e) { ok('sim ran', false, { e: String(e && e.message || e).slice(0, 300) }); }
    await R.close();
    const fails = out.checks.filter(c => !c.pass).length;
    console.log(JSON.stringify({ device, lang, pass: out.checks.length - fails, of: out.checks.length }));
    process.exit(fails ? 1 : 0);
})();
