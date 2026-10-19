'use strict';
/* Probe (aura-rename task, Oct 19 2026): Emmanuel's path. Open Misty's card, Glow -> pick an aura -> back to the card: the card and
   Home show it, a reload keeps it. Then rename from the pencil on the card: typed name shows on the card, Home and the labels,
   survives a reload, Escape cancels only the field, '!!!' is refused, empty goes back to the generated name.
   node playtest/probe-aura-rename.cjs <view> [url] */
const path = require('path');
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
    const view = process.argv[2] || 'iphone13';
    let url = process.argv[3], srv = null;
    if (!url) { srv = await L.serve(path.resolve(__dirname, '..')); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const out = path.join('/tmp', 'ar-' + view);
    require('fs').mkdirSync(out, { recursive: true });
    const h = await L.open({ view, url, settle: 7000 });
    const p = h.page, r = { checks: {} };
    process.on('exit', () => { if (!r.done) console.log(JSON.stringify(r)); });
    const ok = (k, v, info) => { r.checks[k] = v ? 'PASS' : 'FAIL'; if (info !== undefined) r[k] = info; };
    const look = () => p.evaluate(() => {
        const H = document.documentElement, cs = getComputedStyle(H);
        const plant = document.querySelector('#spBubble svg.tmg-plant'), bub = document.getElementById('spBubble');
        const hub = document.getElementById('mistyHub');
        const B = window.LowiBirthCompanion;
        return {
            aura: H.dataset.whAura, set: H.dataset.whAuraSet || '', va: cs.getPropertyValue('--wh-aura-a').trim(),
            plantFilter: plant && getComputedStyle(plant).filter, rim: bub && getComputedStyle(bub).borderTopColor,
            hubA: hub && hub.style.getPropertyValue('--a'), hubName: hub && (hub.querySelector('.mh-id h2') || {}).textContent,
            pen: hub && (hub.querySelector('.mh-rn') || { getAttribute: () => null }).getAttribute('aria-label'),
            lsNew: localStorage.getItem('lowispike.aura.v1'), lsOld: localStorage.getItem('lowi.aura'),
            bc: B && B.get && B.get().name, has: B && B.has && B.has(), auto: B && B.get && B.get().autoName,
            bubLabel: bub && (bub.getAttribute('aria-label') || (bub.querySelector('[aria-label]') || { getAttribute: () => '' }).getAttribute('aria-label')),
            homeName: (document.querySelector('.wh-name') || {}).textContent || ''
        };
    });
    const tapSel = async (sel) => {
        await p.evaluate(s => { const b = document.querySelector(s); b && b.scrollIntoView({ block: 'center' }); }, sel); await L.sleep(350);
        const c = await L.center(h, sel); if (!c) return false;
        r.taps = (r.taps || []).concat(sel + '@' + Math.round(c.x) + ',' + Math.round(c.y) + '=' + await p.evaluate(c => { const e = document.elementFromPoint(c.x, c.y); return e ? (e.className && e.className.baseVal !== undefined ? 'svg' : e.className) : 'null'; }, c)); await L.tap(h, c.x, c.y); await L.sleep(700); return true;
    };
    /* legacy key migration: put an aura in the old device-wide key, reload */
    await p.evaluate(() => { localStorage.removeItem('lowispike.aura.v1'); localStorage.setItem('lowi.aura', 'dew'); });
    await p.reload({ waitUntil: 'load' }); await L.sleep(7500);
    const m = await look(); ok('legacyMoved', m.lsNew === 'dew' && m.lsOld === null && m.set === '1', { lsNew: m.lsNew, lsOld: m.lsOld, set: m.set });
    await p.evaluate(() => { localStorage.removeItem('lowispike.aura.v1'); }); await p.reload({ waitUntil: 'load' }); await L.sleep(7500);
    r.before = await look(); ok('noPickKeepsStarGlow', !r.before.set, r.before.plantFilter);
    await p.screenshot({ path: out + '/1-home.png' });
    await p.evaluate(() => window.LowiMistyHub.open()); await L.sleep(3000);
    r.hub0 = await look();
    ok('penLabel', /Rename|umbenennen|Cambiar/.test(r.hub0.pen || ''), r.hub0.pen);
    await tapSel('#mistyHub [data-mh="glow"]'); await L.sleep(2500);
    r.afterGlow = await p.evaluate(() => ({ ovs: [...document.querySelectorAll('.r2-ov')].map(o => o.className), coral: !!document.querySelector('[data-wh="aura"][data-id="coral"]'), y: (document.querySelector('#mistyHub [data-mh="glow"]') || { getBoundingClientRect: () => ({}) }).getBoundingClientRect().top }));
    const picked = await tapSel('[data-wh="aura"][data-id="coral"]');
    await p.screenshot({ path: out + '/2-picked.png' });
    /* back to the card the way a phone does it: close the Glow sheet on top (Escape does not close these sheets reliably) */
    await p.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov.wh-ms-ov:not(.mh-ov)')].pop(); if (o) window.LowiR2.close(o); }); await L.sleep(1200);
    r.ovsBack = await p.evaluate(() => [...document.querySelectorAll('.r2-ov')].map(o => o.className));
    r.hub1 = await look();
    ok('auraSaved', picked && r.hub1.lsNew === 'coral' && r.hub1.aura === 'coral' && r.hub1.set === '1', { picked, ls: r.hub1.lsNew });
    ok('cardShowsAura', !!r.hub1.hubA && r.hub1.hubA.toLowerCase() === r.hub1.va.toLowerCase() && r.hub1.hubA !== r.hub0.hubA, { before: r.hub0.hubA, after: r.hub1.hubA, va: r.hub1.va });
    await p.screenshot({ path: out + '/3-card.png' });
    /* rename */
    r.layout = await p.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
        return { pen: q('#mistyHub .mh-rn'), name: q('#mistyHub .mh-name'), bar: q('#mistyHub .wh-ms-bar'), grab: q('.mh-ov .r2-grab'), sh: q('.mh-ov .r2-sh'), id: q('#mistyHub .mh-id'), st: (document.querySelector('.mh-ov .r2-sh') || {}).scrollTop }; });
    await tapSel('#mistyHub .mh-rn');
    const formOpen = await p.evaluate(() => !!document.querySelector('#mistyHub .mh-rnf input') && document.activeElement === document.querySelector('#mistyHub .mh-rnf input'));
    ok('renameFieldOpensFocused', formOpen);
    await p.screenshot({ path: out + '/4-field.png' });
    await p.keyboard.press('Escape'); await L.sleep(500);
    const esc = await p.evaluate(() => ({ hub: !!document.getElementById('mistyHub'), form: !!document.querySelector('#mistyHub .mh-rnf') }));
    ok('escapeCancelsOnlyField', esc.hub && !esc.form, esc);
    r.reopen = await tapSel('#mistyHub .mh-rn');
    r.reopenState = await p.evaluate(() => ({ hub: !!document.getElementById('mistyHub'), form: !!document.querySelector('#mistyHub .mh-rnf'), nameHidden: (document.querySelector('#mistyHub .mh-name') || {}).hidden, act: document.activeElement && document.activeElement.className }));
    await p.evaluate(() => { const i = document.querySelector('#mistyHub .mh-rnf input'); i.value = ''; });
    await p.keyboard.type('!!!'); await p.keyboard.press('Enter'); await L.sleep(500);
    const bad = await p.evaluate(() => ({ err: (document.querySelector('#mistyHub .mh-rne') || {}).textContent, hidden: (document.querySelector('#mistyHub .mh-rne') || {}).hidden, form: !!document.querySelector('#mistyHub .mh-rnf') }));
    ok('symbolsRefused', bad.form && !bad.hidden && !!bad.err, bad);
    await p.evaluate(() => { const i = document.querySelector('#mistyHub .mh-rnf input'); i.value = ''; i.focus(); });
    await p.keyboard.type('Zephyr Nova'); await p.keyboard.press('Enter'); await L.sleep(900);
    r.renamed = await look();
    ok('cardRenamed', r.renamed.hubName === 'Zephyr Nova' && /Zephyr Nova/.test(r.renamed.pen || ''), { name: r.renamed.hubName, pen: r.renamed.pen });
    await p.screenshot({ path: out + '/5-renamed.png' });
    await p.keyboard.press('Escape'); await L.sleep(400); try { await p.evaluate(() => window.LowiMistyHub.close()); } catch (e) { } await L.sleep(1200);
    r.homeAfter = await look();
    r.nameSpots = await p.evaluate(() => { const t = document.body.innerText; const lab = [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).filter(s => /Zephyr|Misty/.test(s)).slice(0, 8); return { visibleZephyr: (t.match(/Zephyr Nova/g) || []).length, visibleMisty: (t.match(/\bMisty\b/g) || []).length, labels: lab }; });
    await p.screenshot({ path: out + '/6-home.png' });
    await p.reload({ waitUntil: 'load' }); await L.sleep(8000);
    r.reload = await look();
    await p.evaluate(() => window.LowiMistyHub.open()); await L.sleep(3000);
    const rl = await look();
    ok('reloadKeepsBoth', rl.lsNew === 'coral' && rl.set === '1' && rl.hubName === 'Zephyr Nova', { ls: rl.lsNew, name: rl.hubName, filter: r.reload.plantFilter, rim: r.reload.rim });
    /* empty -> generated name */
    await tapSel('#mistyHub .mh-rn');
    await p.evaluate(() => { const i = document.querySelector('#mistyHub .mh-rnf input'); i.value = ''; i.focus(); });
    await p.keyboard.press('Enter'); await L.sleep(900);
    const back = await look();
    ok('emptyGoesBack', back.hubName && back.hubName !== 'Zephyr Nova', { name: back.hubName, auto: back.auto, has: back.has });
    r.errors = await L.snap(h); r.log = h.log;
    r.done = 1; console.log(JSON.stringify(r, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.log(String(e).slice(0, 300)); process.exit(1); });
