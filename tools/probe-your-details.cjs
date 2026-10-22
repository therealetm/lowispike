'use strict';
/* Your details probe (account UI step 1). usage: node tools/probe-your-details.cjs <device> [dirOrUrl] [out-prefix] [engine] [lang]
   Seeds a profile like Emmanuel's (107.6 kg, 182 cm, INTJ, goals, PCOS look-out), opens Profile, taps the header weight (expects
   Add weight with the value in), taps the Your details tile, screenshots night + day, checks the fixed header keeps one Back,
   overflow, small targets, then taps every row and checks its editor opens and Back on a panel comes back here. */
const H = require('./sim/harness.cjs'), path = require('path');
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), out = process.argv[4] || '/tmp/yd', engine = process.argv[5] || 'webkit', lang = process.argv[6] || 'en';
    const o = { device, engine, members: 10, messages: 20, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, res = { device, lang }, tag = device.replace(/\s+/g, '') + (lang === 'en' ? '' : '-' + lang);
    await R.goto(); await H.sleep(5000);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
    res.loaded = await P.evaluate(() => !!window.LowiYourDetails);
    await P.evaluate(l => {
        const S = LowiR2.S(); S.user = Object.assign(S.user || {}, { name: 'Emmanuel', bday: '1994-03-10', tags: ['Energy', 'Weight', 'PCOS'], gender: 'm', showWeight: true });
        S.health = S.health || {}; S.health.weight = '107.6'; S.health.heightCm = 182; S.health.weightPublic = true; LowiR2.save();
        try { const b = document.createElement('button'); b.setAttribute('data-r5', 'mbti'); b.setAttribute('data-v', 'INTJ'); document.body.appendChild(b); b.click(); b.remove(); } catch (e) { }
        if (l !== 'en') LowiLang.set(l);
    }, lang);
    await P.evaluate(() => { try { goTab('profile'); } catch (e) { } }); await H.sleep(1200);
    await P.evaluate(() => { try { LowiG2E.close(); } catch (e) { } window.scrollTo(0, 0); }); await H.sleep(500);
    res.hero = await P.evaluate(() => { const d = document.querySelector('.r3-det'); return d ? d.textContent.replace(/\s+/g, ' ').trim() : null; });
    res.heroWeightBtn = await P.evaluate(() => { const b = document.querySelector('.r3-det [data-yd="weight"]'); return b ? b.textContent : null; });
    res.tiles = await P.evaluate(() => [...document.querySelectorAll('#g2eTiles .g2e-tile')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
    await R.shot(out + '-' + tag + '-overview.png');
    /* 1 tap: header weight -> Add weight */
    if (res.heroWeightBtn) { await R.tap('.r3-det [data-yd="weight"]'); await H.sleep(900); }
    res.headerWeightTap = await P.evaluate(() => ({ wj: !!document.getElementById('wjOv'), val: (document.getElementById('wjVal') || {}).value || null }));
    await P.keyboard.press('Escape'); await H.sleep(500);
    if (await P.evaluate(() => !!document.getElementById('wjOv'))) await P.evaluate(() => LowiWeightJourney.close && LowiWeightJourney.close());
    /* tile -> Your details */
    await P.evaluate(() => { const t = document.querySelector('#g2eTiles .g2e-details'); if (t) t.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
    if (await P.evaluate(() => !!document.querySelector('#g2eTiles .g2e-details'))) await R.tap('#g2eTiles .g2e-details'); else await P.evaluate(() => LowiYourDetails.open());
    await H.sleep(700);
    const info = () => P.evaluate(() => {
        const ov = document.getElementById('ydOv'); if (!ov) return null; const r = ov.getBoundingClientRect(), hd = ov.querySelector('.yd-head').getBoundingClientRect();
        const over = [...ov.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).map(e => String(e.className));
        const small = [...ov.querySelectorAll('button')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.height < 43.5 || b.width < 43.5); }).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().height));
        const clipped = [...ov.querySelectorAll('.yd-l')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
        const top = document.elementFromPoint(r.width / 2, hd.top + hd.height / 2), covered = top && !ov.contains(top) ? String(top.className || top.id) : null;
        const fg = getComputedStyle(ov.querySelector('.yd-l')).color, bg = getComputedStyle(ov).backgroundImage.slice(0, 60);
        return { title: ov.querySelector('.yd-ht').textContent, backs: ov.querySelectorAll('.yd-back').length, sections: [...ov.querySelectorAll('.yd-sec h3')].map(e => e.textContent),
            rows: [...ov.querySelectorAll('.yd-row')].map(e => e.querySelector('.yd-l').textContent + ' = ' + (e.querySelector('.yd-v') || { textContent: '' }).textContent), full: [Math.round(r.width), Math.round(r.height), innerWidth, innerHeight], head: Math.round(hd.top) + '/' + Math.round(hd.height), over, small, clipped, covered, fg, bg };
    });
    res.night = await info();
    await R.shot(out + '-' + tag + '-night.png');
    /* header stays put while the list scrolls */
    res.headBefore = await P.evaluate(() => document.querySelector('#ydOv .yd-back').getBoundingClientRect().top);
    await P.evaluate(() => { const b = document.querySelector('#ydOv .yd-body'); b.scrollTop = b.scrollHeight; }); await H.sleep(300);
    res.headAfter = await P.evaluate(() => document.querySelector('#ydOv .yd-back').getBoundingClientRect().top);
    await R.shot(out + '-' + tag + '-night-bottom.png');
    await P.evaluate(() => { document.querySelector('#ydOv .yd-body').scrollTop = 0; });
    /* every row */
    res.rowsOpen = {};
    const ids = await P.evaluate(() => [...document.querySelectorAll('#ydOv [data-yd-go]')].map(b => b.getAttribute('data-yd-go')));
    for (const id of ids) {
        if (id === 'photo') { res.rowsOpen.photo = 'skipped (file picker)'; continue; }
        if (!(await P.evaluate(() => !!document.getElementById('ydOv')))) await P.evaluate(() => LowiYourDetails.open());
        await H.sleep(300);
        await P.evaluate(i => document.querySelector('#ydOv [data-yd-go="' + i + '"]').scrollIntoView({ block: 'center' }), id); await H.sleep(150);
        await R.tap('#ydOv [data-yd-go="' + id + '"]'); await H.sleep(900);
        res.rowsOpen[id] = await P.evaluate(() => {
            const h = document.documentElement, k = h.getAttribute('data-g2e-k');
            if (document.getElementById('wjOv')) return 'weight journey' + (document.getElementById('wjVal') ? ' + Add weight ' + document.getElementById('wjVal').value : '');
            if (document.getElementById('bsOv')) return 'weight & bmi';
            if (h.classList.contains('g2e-open') && k) return 'panel ' + k;
            const r2 = [...document.querySelectorAll('.r2-ov')].pop(); if (r2 && !r2.classList.contains('off')) return 'sheet ' + (r2.querySelector('h2,h3,b') || {}).textContent;
            const sh = document.querySelector('#sheetwrap.open'); if (sh) return 'r5 sheet ' + sh.textContent.replace(/\s+/g, ' ').trim().slice(0, 40);
            return 'NOTHING';
        });
        /* back out */
        const g2e = await P.evaluate(() => document.documentElement.classList.contains('g2e-open'));
        if (g2e) { await P.evaluate(() => { const b = document.querySelector('#g2eHead button, [data-g2e-back], .g2e-back'); if (b) b.click(); else LowiG2E.close(); }); await H.sleep(700); res.rowsOpen[id] += (await P.evaluate(() => !!document.getElementById('ydOv'))) ? ' (Back returns here)' : ' (Back did NOT return)'; }
        else { await P.keyboard.press('Escape'); await H.sleep(500); await P.evaluate(() => { try { LowiWeightJourney.close && LowiWeightJourney.close(); } catch (e) { } try { LowiBodyStats.close && LowiBodyStats.close(); } catch (e) { } try { LowiR2.closeAll && LowiR2.closeAll(); } catch (e) { } try { closeSheet(); } catch (e) { } }); await H.sleep(400); }
    }
    if (!(await P.evaluate(() => !!document.getElementById('ydOv')))) await P.evaluate(() => LowiYourDetails.open());
    await H.sleep(400);
    await P.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await H.sleep(500);
    res.day = await info();
    await R.shot(out + '-' + tag + '-day.png');
    await P.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await R.tap('#ydOv .yd-back'); await H.sleep(500);
    res.closedByBack = await P.evaluate(() => !document.getElementById('ydOv'));
    res.errors = R.errs;
    console.log(JSON.stringify(res, null, 1));
    await R.close();
})().catch(e => { console.error(e); process.exit(1); });
