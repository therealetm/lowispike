/* Browser check for the personal habit nudges (habit-nudges.js, Oct 24 2026). Script calls only, no synthetic gestures except
   the Off chip in the reminder sheet (CLICK=1). Seeds: no water today, a shop plan for today's weekday, five days of meals at
   12:30, then asks for a pass at 15:00 today: the Water dew, the Scan basket and the Fuel glint show, one line is spoken
   (first person, no fixed companion name), logging water removes the dew, the Off row removes every cue, reduce motion stops
   the animation, and N1 no longer offers its generic water line. URL=... ENGINE=chromium|webkit VIEW=390x844 OUT=dir */
const H = require('./sim/harness.cjs');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/habit-nudges';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
    const eng = process.env.ENGINE || 'chromium', vw = (process.env.VIEW || '390x844').split('x').map(Number);
    const R = await H.open({ engine: eng, url: process.env.URL || '', probe: false, viewport: { width: vw[0], height: vw[1] }, dpr: vw[0] > 600 ? 2 : 3, lang: process.env.LANG2 || 'en', device: process.env.DEVICE || 'iPhone 13' });
    const p = R.page, out = { engine: eng, view: process.env.VIEW || '390x844' };
    const cues = () => p.evaluate(() => {
        const one = sel => { const b = document.querySelector(sel), c = b && b.querySelector(':scope > .hn-cue'); if (!c) return null; const r = c.getBoundingClientRect(), br = b.getBoundingClientRect(), cs = getComputedStyle(c);
            const hits = [...b.querySelectorAll('*')].filter(e => e !== c && !c.contains(e) && !e.contains(c) && e.children.length === 0 && (e.textContent.trim() || /^(svg|img|path|i|canvas)$/i.test(e.tagName))).map(e => ({ e, q: e.getBoundingClientRect() })).filter(o => o.q.width > 1 && o.q.width < br.width * 0.8 && o.q.left < r.right - 1 && o.q.right > r.left + 1 && o.q.top < r.bottom - 1 && o.q.bottom > r.top + 1).map(o => o.e.tagName + '.' + String(o.e.className && o.e.className.baseVal != null ? o.e.className.baseVal : o.e.className).slice(0, 30) + ':' + o.e.textContent.trim().slice(0, 12));
            return { overlaps: hits, bubble: Math.round(br.width), w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= br.left && r.right <= br.right && r.top >= br.top && r.bottom <= br.bottom, anim: cs.animationName, pe: cs.pointerEvents, say: c.classList.contains('hn-say'), aria: c.getAttribute('aria-hidden') }; };
        return { water: one('#whHud .wh-water'), shop: one('#whHud .o8-scan'), log: one('#whHud .wh-meals') };
    });
    const praise = () => p.evaluate(() => { const all = [].concat(...Object.values(LowiHabitNudgeCore.LINES).map(o => [].concat(...Object.values(o)))); const b = [...document.querySelectorAll('body *')].filter(e => e.children.length <= 2 && all.some(t => e.textContent.indexOf(t.slice(0, 20)) >= 0)).pop(); const L = window.LowiPraise; return { talking: !!(L && L.talking && L.talking()), visible: !!b && b.getBoundingClientRect().width > 0, cls: b ? String(b.className).slice(0, 40) : '', txt: b ? b.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : '' }; });
    try {
        await R.goto(); await H.sleep(+(process.env.WAIT || 10000));
        out.build = await p.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content || (window.LOWI_BUILD || ''));
        out.loaded = await p.evaluate(() => !!(window.LowiHabitNudge && window.LowiHabitNudgeCore));
        out.afterBoot = await p.evaluate(() => window.LowiHabitNudge && LowiHabitNudge.last());
        out.free = await p.evaluate(async () => { for (let i = 0; i < 20; i++) { if (LowiHabitNudge.free()) return { free: true, waited: i }; await new Promise(r => setTimeout(r, 500)); } const L = window.LowiPraise; return { free: false, home: !!document.querySelector('#tab-home.active'), cls: document.documentElement.className.slice(0, 200), talking: !!(L && L.talking && L.talking()), g1: window.LowiG1 && LowiG1.state && LowiG1.state() }; });
        out.seed = await p.evaluate(() => {
            const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); f.water = f.water || {}; f.water[k] = 0; localStorage.setItem('lowi_fast_v1', JSON.stringify(f));
            localStorage.setItem('lowispike.shopplan.v1', JSON.stringify({ every: 7, days: [d.getDay()] }));
            const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); s.logs = s.logs || [];
            for (let i = 1; i <= 5; i++) { const t = new Date(); t.setDate(t.getDate() - i); t.setHours(12, 30, 0, 0); s.logs.push({ id: 'hn' + i, ts: t.getTime(), name: 'Lunch' }); }
            localStorage.setItem('lowispike.v2', JSON.stringify(s));
            LowiHabitNudge._reset();
            const at = new Date(); at.setHours(15, 0, 0, 0);
            window.__hnAt = at.getTime();
            return { day: k, weekday: d.getDay() };
        });
        out.pass1 = await p.evaluate(() => LowiHabitNudge.evaluate({ now: window.__hnAt + 60 * 60e3, force: !LowiHabitNudge.free() }));
        await H.sleep(900);
        out.cues1 = await cues(); out.praise1 = await praise();
        await R.shot(OUT + '/1-home-cues.png');
        const box = await p.evaluate(() => { const r = document.getElementById('whHud').getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(innerWidth, r.width), height: Math.min(innerHeight - Math.max(0, r.y), r.height) }; }).catch(() => null);
        if (box && box.width > 10) await p.screenshot({ path: OUT + '/1b-ring.png', clip: box }).catch(() => { });
        out.said = await p.evaluate(() => LowiHabitNudge.state().said);
        out.again = await p.evaluate(() => LowiHabitNudge.evaluate({ now: window.__hnAt + 61 * 60e3 }).said); /* no second line right away */
        out.n1Water = await p.evaluate(() => { try { const q = LowiN1.quests(); const t = new Date(); t.setHours(14, 0, 0, 0); const pk = LowiN1.pick(t, {}), any = LowiN1.pick(t, { any: true }); return { quests: q.map(x => x.id + (x.done ? ':done' : '')), pick14: pk && pk.id, pickAny: any && any.id }; } catch (e) { return String(e); } });
        /* water logged: the dew goes away */
        await p.evaluate(() => { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); f.water[k] = 1; localStorage.setItem('lowi_fast_v1', JSON.stringify(f)); });
        out.pass2 = await p.evaluate(() => LowiHabitNudge.evaluate({ now: window.__hnAt + 62 * 60e3, quietOnly: true }));
        out.cues2 = await cues();
        /* reduce motion */
        await p.emulateMedia({ reducedMotion: 'reduce' }); await H.sleep(400);
        out.cuesRM = await cues();
        await p.emulateMedia({ reducedMotion: 'no-preference' });
        /* the row in the reminder sheet */
        await p.evaluate(() => LowiN1.openSet()); await H.sleep(1500);
        out.row = await p.evaluate(() => { const r = document.querySelector('.hn-row'); if (!r) return null; const b = r.getBoundingClientRect(); return { txt: r.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(b.height), onScreen: b.bottom > 0 && b.top < innerHeight }; });
        await p.evaluate(() => { const r = document.querySelector('.hn-row'); if (r) r.scrollIntoView({ block: 'center' }); }); await H.sleep(500);
        await R.shot(OUT + '/2-sheet-row.png');
        if (process.env.CLICK !== '0') { await R.tap('.hn-row [data-hn="cues"][data-v="0"]').catch(e => { out.tapErr = String(e).slice(0, 200); }); await H.sleep(800); }
        else await p.evaluate(() => LowiHabitNudge.setCues(false));
        out.offState = await p.evaluate(() => ({ cues: LowiHabitNudge.state().cues, pressed: (document.querySelector('.hn-row [data-v="0"]') || {}).className || '', left: document.querySelectorAll('#whHud .hn-cue').length }));
        await R.shot(OUT + '/3-sheet-off.png');
        await p.evaluate(() => LowiHabitNudge.setCues(true));
        out.errs = R.errs.slice(0, 6);
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 500); }
    console.log(JSON.stringify(out, null, 1));
    await R.close();
})();
