'use strict';
/* BH-006 probe: which name does Home use for the companion? The old herb identity name ("Moss Leaf", from the star sign) must never show.
   Expected name = own birth companion's name, else a name the user typed, else "Misty".
   usage: node probe-name.cjs <view> <url|dir> [scenario: fresh|own|renamed] */
const L = require('./lib.cjs');
(async () => {
    const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', sc = process.argv[4] || 'fresh';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const pre = sc === 'own' ? `try{localStorage.setItem('lowispike.companion.v1',JSON.stringify({v:1,bday:'1990-01-01',btime:'',n:0,name:'Zorbo',created:1}));}catch(e){}` :
        sc === 'renamed' ? `try{const k='lowi.herb.prefs';}catch(e){}` : '';
    const h = await L.open({ view, url, preInit: pre || undefined, settle: 7000 });
    const { page } = h;
    if (sc === 'renamed') { await page.evaluate(() => { try { const t = window.LowiHerbTamagotchi, c = t.current(); const p = t.readPrefs(); p.name = 'Bubbles'; t.savePrefs(p); } catch (e) { } }); }
    const r = await page.evaluate(async () => {
        const q = s => { const e = document.querySelector(s); return e ? (e.textContent || '').trim() : null; };
        const o = {};
        try { const t = window.LowiHerbTamagotchi, c = t.current(); o.herb = t.name(c.p, c.m); o.herbP = c.p.name || ''; } catch (e) { o.herb = 'ERR ' + e.message; }
        try { const c = window.LowiBirthCompanion.get(); o.birth = c.name; o.birthMisty = !!c.misty; } catch (e) { o.birth = 'ERR'; }
        o.spBubbleName = q('.sp-bubble-name'); o.spAria = (document.querySelector('#spBubble') || {}).getAttribute ? document.querySelector('#spBubble').getAttribute('aria-label') : null;
        o.scale = (() => { try { const d = document.createElement('div'); d.innerHTML = window.LowiMistyScale.html(); return d.textContent.slice(0, 120); } catch (e) { return 'ERR ' + e.message; } })();
        try { const d = document.createElement('div'); d.innerHTML = window.LowiMistyHub._html ? window.LowiMistyHub._html() : ''; o.hub = (d.querySelector('.mh-id h2') || {}).textContent || d.textContent.slice(0, 80); } catch (e) { o.hub = 'ERR ' + e.message; }
        try { window.LowiWorldHome.openMisty(); await new Promise(r => setTimeout(r, 1500)); o.card = q('.wh-ms-id h2'); } catch (e) { o.card = 'ERR ' + e.message; }
        o.build = (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '';
        return o;
    });
    const want = sc === 'own' ? 'Zorbo' : sc === 'renamed' ? 'Bubbles' : 'Misty';
    const shown = { card: r.card, hub: r.hub, spBubbleName: r.spBubbleName };
    const bad = Object.entries(shown).filter(([k, v]) => v != null && v !== '' && v !== want).map(([k, v]) => k + '=' + v);
    if (r.scale && r.herb && r.herb !== want && r.scale.includes(r.herb)) bad.push('scale contains ' + r.herb);
    if (r.spAria && r.herb && r.herb !== want && r.spAria.includes(r.herb)) bad.push('spAria=' + r.spAria);
    const s = await L.snap(h);
    console.log(JSON.stringify({ view, sc, want, r, err: s.err, rej: s.rej, pageerror: h.log.pageerror }, null, 0));
    console.log(bad.length ? 'FAIL ' + bad.join(' ; ') : 'PASS');
    await h.browser.close(); if (srv) srv.close();
    process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
