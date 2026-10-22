/* misty-say look (Oct 22): Misty's speech bubble and nudge on Home, and a guide's bubble, in Day / Night and EN / DE / ES.
   Run: node tools/community-settings/probe.cjs --views se,i13,i15,px7 --out DIR --script tools/misty-say/look.js
   Fails when a bubble is wider than ~70% of the screen, taller than two lines, sits on a Home bubble or the joystick,
   or when two messages are up at once. */
const theme = async m => { await page.evaluate(m => { localStorage.setItem('lowi.theme', m); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme(m); else document.documentElement.setAttribute('data-theme', m); }, m); await sleep(500); };
const TWO = 54; /* two 13px lines at 1.3 + padding + rim, with a little slack */
const probe = () => page.evaluate(() => {
    const vw = innerWidth, g = id => { const e = document.getElementById(id); if (!e || !e.classList.contains('on')) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height, cls: e.className, fs: getComputedStyle(e).fontSize, tx: (e.dataset.text || e.textContent || '').slice(0, 40) }; };
    const p = g('lpPraise'), n = g('mhNudge');
    const hits = [];
    for (const box of [p, n]) if (box) document.querySelectorAll('[data-orbit], #whPad').forEach(e => {
        const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < .05) return;
        if (box.l < r.right - 2 && box.r > r.left + 2 && box.t < r.bottom - 2 && box.b > r.top + 2) hits.push((e.getAttribute('data-orbit') || e.id) + (box === p ? '/praise' : '/nudge'));
    });
    return { vw, p, n, hits, q: (window.LowiPraise.queued && LowiPraise.queued().length) || 0 };
});
const round = o => o && { w: Math.round(o.w), h: Math.round(o.h), l: Math.round(o.l), t: Math.round(o.t), fs: o.fs, cls: o.cls.replace(/\s+/g, ' '), tx: o.tx };
const LONG = { en: 'Clear skies, I am full of light! Every meal you log keeps the sun up and the storm away, and every Move shakes off a cloud. Triple-tap my controller to explore.', de: 'Klarer Himmel, ich leuchte! Jede Mahlzeit, die du einträgst, hält die Sonne oben und den Sturm fern, und jede Bewegung schüttelt eine Wolke ab.', es: '¡Cielo despejado, estoy llena de luz! Cada comida que registras mantiene el sol arriba y la tormenta lejos, y cada Movimiento quita una nube.' };
let nudgeDone = false;
await sleep(2500); /* let Home settle (bubbles fly in) */
for (const [m, lg] of [['light', 'en'], ['dark', 'de'], ['light', 'es'], ['dark', 'en'], ['light', 'de'], ['dark', 'es']]) {
    await theme(m); await page.evaluate(l => { try { window.LowiLang.set(l); } catch (e) { } }, lg); await sleep(500);
    const tag = m + '-' + lg;
    await page.evaluate(() => { try { LowiPraise.hide(); } catch (e) { } }); await sleep(700);
    /* 1. Misty's storm line: compact, clear of the bubbles */
    await page.evaluate(lg => { const H = window.LowiMistyHints; LowiPraise.say(H.tr('stormFood', lg)); }, lg); await sleep(800);
    let r = await probe();
    console.log('[cs] ' + tag + ' storm ' + JSON.stringify({ vw: r.vw, p: round(r.p), hits: r.hits }));
    if (!r.p) fail(tag + ' storm line not shown');
    else { if (r.p.w > r.vw * .72 + 1) fail(tag + ' bubble ' + Math.round(r.p.w) + 'px wide of ' + r.vw); if (r.p.h > TWO) fail(tag + ' bubble ' + Math.round(r.p.h) + 'px tall'); if (r.p.fs !== '13px') fail(tag + ' font ' + r.p.fs); }
    if (r.hits.length) fail(tag + ' covers ' + r.hits.join(','));
    await shot('after-' + tag);
    /* 2. a second line waits in the queue, it never stacks (checked in one go: a slow screenshot must not let the first line time out) */
    const waitText = async (re, on = true) => { for (let k = 0; k < 30; k++) { const t = await page.evaluate(() => { const e = document.getElementById('lpPraise'); return e && e.classList.contains('on') ? e.dataset.text : ''; }); if (on ? re.test(t) : !t) return true; await sleep(150); } return false; };
    await page.evaluate(() => LowiPraise.hide()); await waitText(null, false); await sleep(600);
    const qq = await page.evaluate(lg => { const H = window.LowiMistyHints; LowiPraise.say(H.tr('stormFood', lg)); LowiPraise.say(lg === 'de' ? 'Gut gemacht!' : lg === 'es' ? '\u00a1Bien hecho!' : 'Nice one!'); const e = document.getElementById('lpPraise'); return { q: LowiPraise.queued().length, up: e && e.classList.contains('on') ? e.dataset.text.slice(0, 30) : '' }; }, lg);
    if (qq.q !== 1 || !qq.up) fail(tag + ' second line not queued ' + JSON.stringify(qq));
    /* 3. closing the first brings the queued one; a long line: two lines, tap opens it, tap closes it */
    await page.evaluate(() => LowiPraise.hide());
    if (!(await waitText(/Nice|Gut|Bien/))) fail(tag + ' queued line did not follow');
    await page.evaluate(() => LowiPraise.hide()); await waitText(null, false); await sleep(600);
    await page.evaluate(([t]) => LowiPraise.say(t), [LONG[lg]]); await waitText(/./); await sleep(500);
    r = await probe();
    if (!r.p || !/lp-more/.test(r.p.cls)) fail(tag + ' long line not clamped ' + JSON.stringify(round(r.p)));
    else {
        if (r.p.h > TWO) fail(tag + ' long line ' + Math.round(r.p.h) + 'px tall before tap');
        await page.touchscreen.tap(r.p.l + r.p.w / 2, r.p.t + r.p.h / 2); await sleep(500);
        const o = await probe(); if (!o.p || !/lp-open/.test(o.p.cls) || o.p.h <= r.p.h) fail(tag + ' tap did not open the line ' + JSON.stringify(round(o.p)));
        else { console.log('[cs] ' + tag + ' open ' + JSON.stringify(round(o.p))); if (o.hits.length) console.log('[cs] ' + tag + ' note: opened line (tapped to read) overlaps ' + o.hits.join(',')); }
        if (tag === 'dark-de') await shot('after-open-' + tag);
        await page.touchscreen.tap(o.p.l + o.p.w / 2, o.p.t + o.p.h / 2); await sleep(500);
        const c = await probe(); if (c.p) fail(tag + ' second tap did not close it');
    }
    /* 4. Misty's nudge: compact, and Misty's line waits until it is gone (once per phone: the nudge has a 90 s gap) */
    if (!nudgeDone) {
        nudgeDone = true;
        await page.evaluate(() => { try { LowiPraise.hide(); } catch (e) { } const h = document.getElementById('spHome'); if (h && !h.querySelector('[data-bt="bar"].back')) { const d = document.createElement('div'); d.setAttribute('data-bt', 'bar'); d.className = 'back'; d.style.display = 'none'; d.id = 'msFakeTrip'; h.appendChild(d); } try { localStorage.removeItem('lowi.mh.nudges'); } catch (e) { } });
        let n = null; for (let k = 0; k < 14 && !n; k++) { await sleep(700); n = (await probe()).n; }
        if (!n) console.log('[cs] ' + tag + ' nudge did not come (quiet rules), skipped');
        else {
            await page.evaluate(() => LowiPraise.say('Hello from Misty')); await sleep(700);
            r = await probe();
            console.log('[cs] ' + tag + ' nudge ' + JSON.stringify({ n: round(r.n), praiseUp: !!r.p, q: r.q, hits: r.hits }));
            if (r.p) fail(tag + ' speech bubble stacked on the nudge');
            if (r.n.w > r.vw * .72 + 1) fail(tag + ' nudge ' + Math.round(r.n.w) + 'px wide'); if (r.n.h > TWO) fail(tag + ' nudge ' + Math.round(r.n.h) + 'px tall');
            if (r.hits.length) fail(tag + ' nudge covers ' + r.hits.join(','));
            await shot('after-nudge-' + tag);
            await page.evaluate(() => { document.getElementById('mhNudge').classList.remove('on'); const d = document.getElementById('msFakeTrip'); d && d.remove(); }); await sleep(1300);
            r = await probe(); if (!r.p) fail(tag + ' line did not follow the nudge'); if (r.n) fail(tag + ' nudge and line both up');
        }
    }
    /* 5. a guide's bubble (same CSS the cell worlds use) */
    const pal = await page.evaluate(lg => {
        const C = window.LowiRegionPalsCore || null; const t = (C && C.GUIDE ? C.GUIDE.sense[['en', 'de', 'es'].indexOf(lg)] : 'I sense {k} sugar crumbs here.').replace('{k}', '6').replace('{n}', 'Hexa');
        const d = document.createElement('div'); d.className = 'rp-pal rp-talk rp-s-ar'; d.id = 'msFakePal'; d.style.cssText = 'position:fixed;left:24px;top:40%;z-index:99';
        d.innerHTML = '<div class="rp-say" style="position:relative;opacity:1;transform:none"><span class="rp-tx"></span><small>tap</small></div>'; d.querySelector('.rp-tx').textContent = t; document.body.appendChild(d);
        const b = d.querySelector('.rp-say').getBoundingClientRect(), cs = getComputedStyle(d.querySelector('.rp-say')); const out = { w: Math.round(b.width), h: Math.round(b.height), fs: cs.fontSize, vw: innerWidth, t }; return out;
    }, lg);
    console.log('[cs] ' + tag + ' guide ' + JSON.stringify(pal));
    if (pal.w > pal.vw * .72 + 1 || pal.h > TWO || pal.fs !== '13px') fail(tag + ' guide bubble ' + JSON.stringify(pal));
    if (tag === 'light-en' || tag === 'dark-de') await shot('after-guide-' + tag);
    await page.evaluate(() => { const d = document.getElementById('msFakePal'); d && d.remove(); try { LowiPraise.hide(); } catch (e) { } }); await sleep(400);
}
