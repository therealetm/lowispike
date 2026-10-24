/* Live/local check for the deadlift (hip hinge) in Mirror mode, Oct 23 2026.
   node tools/check-hinge-mirror.cjs [url] [outdir]
   A real camera and the real pose model cannot run here, so this feeds a fake camera picture and a fake pose model that returns a
   side-on person (built with LowiHingeCore) doing hinges. Everything else is the real app: the Move hero button, the setup sheet,
   the camera flow, the outline, the rep counter, form cues, Misty's set line, rest, skip rest, the done sheet, Move -> Mirror. */
'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const H = require('./sim/harness.cjs');
const URL0 = process.argv[2] || 'https://therealetm.github.io/lowispike/';  /* or a local folder */
const OUT = process.argv[3] || '/tmp/hinge-shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FAKE_MP = `export const FilesetResolver = { forVisionTasks: async () => ({}) };
export const PoseLandmarker = { createFromOptions: async () => ({ detectForVideo: () => ({ landmarks: window.__fakeLms ? [window.__fakeLms()].filter(Boolean) : [] }), close() {} }) };`;

const INIT = (lang) => {
    try {
        const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
        localStorage.setItem('lowi.lang', lang); localStorage.setItem('lowispike.lang', lang);
    } catch (e) { }
    /* fake front camera: a light canvas */
    const md = navigator.mediaDevices || (navigator.mediaDevices = {});
    md.getUserMedia = async () => {
        const c = document.createElement('canvas'); c.width = 640; c.height = 480; const x = c.getContext('2d');
        const paint = () => { const g = x.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, '#8a96a8'); g.addColorStop(1, '#5d6676'); x.fillStyle = g; x.fillRect(0, 0, 640, 480); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, 380, 640, 100); };
        paint(); setInterval(paint, 200);
        return c.captureStream(15);
    };
    /* the fake person: depth 0..1 from __fake (cycle = hinge every 3.6 s), faults, front-on, hidden */
    addEventListener('lowi:mirror-done', e => { window.__lastDone = e.detail; });
    window.__fake = { v: 'conv', mode: 'side', cycle: false, depth: 0, round: 0, hands: 0, knees: 0, t0: 0 };
    window.__fakeLms = () => {
        const F = window.__fake, HC = window.LowiHingeCore; if (!HC || F.mode === 'none') return null;
        const st = document.querySelector('.mm-stage'); const Wv = st ? st.clientWidth : innerWidth, Hv = st ? st.clientHeight : innerHeight;
        let d = F.depth;
        if (F.cycle) { const per = 3.6, c = ((performance.now() - F.t0) / 1000) % per; d = c < 0.8 ? 0 : c < 2.0 ? (c - 0.8) / 1.2 : c < 2.3 ? 1 : c < 3.2 ? 1 - (c - 2.3) / 0.9 : 0; }
        const A = HC.defaultAnchor(Wv, Hv, 1, F.v); A.ankle = [A.ankle[0] + 10, A.ankle[1] - 6];
        const P = HC.pose(d, F.v); if (F.knees && d > 0.5) P.s += F.knees;
        const G = HC.ghost(A, P);
        let head = G.head;
        if (F.round && d > 0.5) { const v = [head[0] - G.sh[0], head[1] - G.sh[1]], a = F.round * Math.PI / 180; head = [G.sh[0] + v[0] * Math.cos(a) - v[1] * Math.sin(a), G.sh[1] + v[0] * Math.sin(a) + v[1] * Math.cos(a)]; }
        const wr = [G.wr[0] + (F.hands && d > 0.5 ? F.hands : 0), G.wr[1]];
        const vw = 640, vh = 480, s = Math.max(Wv / vw, Hv / vh), ox = (Wv - vw * s) / 2, oy = (Hv - vh * s) / 2;
        const N = (p, v) => ({ x: 1 - (p[0] - ox) / (vw * s), y: (p[1] - oy) / (vh * s), visibility: v == null ? 0.95 : v });
        const lm = Array.from({ length: 33 }, () => N(G.hip, 0.1));
        const spread = F.mode === 'front' ? A.torso * 0.8 : 4;
        const near = { 11: G.sh, 13: G.el, 15: wr, 23: G.hip, 25: G.knee, 27: G.ankle, 29: G.heel, 31: G.toe, 7: head };
        for (const k in near) lm[k] = N(near[k]);
        lm[12] = N([G.sh[0] + spread, G.sh[1]], 0.6); lm[24] = N([G.hip[0] + spread * 0.7, G.hip[1]], 0.6);
        lm[0] = N([head[0] + A.headR * 0.8, head[1] + A.headR * 0.1], 0.9);
        return lm;
    };
};

async function run(name, vp, opt) {
    const o = { engine: 'chromium', members: 4, messages: 4, probe: false, lang: opt.lang }; if (/^https?:/.test(URL0)) o.url = URL0; else o.root = URL0;
    const R = await H.open(o), page = R.page, ctx = R.ctx, browser = { close: () => (R.close ? R.close() : ctx.browser() && ctx.browser().close()) };
    await page.setViewportSize(vp);
    await ctx.route('**/vision_bundle.mjs*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_MP }));
    await ctx.addInitScript(INIT, opt.lang);
    const errs = [], res = { name, ok: 0, fail: 0, cases: [] };
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::|supabase|fetch/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    const ck = (label, cond, extra) => { res.cases.push((cond ? 'PASS ' : 'FAIL ') + label + (extra ? ' :: ' + extra : '')); cond ? res.ok++ : res.fail++; };
    const shot = f => page.screenshot({ path: path.join(OUT, name + '-' + f + '.png') });
    const txt = sel => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : ''; }, sel);
    const waitFor = async (fn, ms, arg) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };
    await R.goto(); await sleep(5000);
    await waitFor(() => window.goTab && window.LowiMirror && window.LowiMirrorHinge, 60000);
    ck('scripts loaded (LowiHingeCore, LowiMirrorHinge)', await page.evaluate(() => !!(window.LowiHingeCore && window.LowiMirrorHinge)));
    await page.evaluate(() => { try { window.goTab('move'); } catch (e) { } });
    const hero = await waitFor(() => { const b = document.querySelector('.mm-hero-dl'); return b && b.getBoundingClientRect().height > 0; }, 15000);
    ck('Move hero shows the deadlift button', hero);
    if (hero) {
        const bb = await page.evaluate(() => { const b = document.querySelector('.mm-hero-dl'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { h: r.height, w: r.width, t: b.textContent }; });
        ck('deadlift button thumb-sized (>=44 px) and named', bb.h >= 44 && /Kreuzheben|Deadlift|Peso/.test(bb.t), JSON.stringify(bb));
        await sleep(400); await shot('1-hero');
        await page.click('.mm-hero-dl');
    } else await page.evaluate(() => { window.LowiMirror.open(); document.querySelector('[data-r="hinge"]').click(); });
    const sheet = await waitFor(() => /Kreuzheben|Deadlift|Peso muerto/.test((document.querySelector('.mm-sheet') || document.body).textContent) && !!document.querySelector('[data-mm="cam"]'), 8000);
    ck('one tap opens the deadlift setup (side-on placement, camera button)', sheet, (await txt('.mm-sheet')).slice(0, 120));
    /* Oct 24 2026: the three deadlifts. A centred row of three one-word pills; the one you pick names the sheet, is remembered and drives the outline */
    const V = opt.v || 'conv', NAMES = { de: { rdl: 'Rumänisches Kreuzheben', conv: 'Kreuzheben (konventionell)', sumo: 'Sumo-Kreuzheben' }, en: { rdl: 'Romanian Deadlift', conv: 'Conventional Deadlift', sumo: 'Sumo Deadlift' }, es: { rdl: 'Peso muerto rumano', conv: 'Peso muerto convencional', sumo: 'Peso muerto sumo' } }[opt.lang];
    const WORDS = { de: ['Rumänisch', 'Konventionell', 'Sumo'], en: ['Romanian', 'Conventional', 'Sumo'], es: ['Rumano', 'Convencional', 'Sumo'] }[opt.lang];
    const pills = await page.evaluate(() => { const g = document.querySelector('.mh-var'), sh = document.querySelector('.mm-sheet'); if (!g) return null; const gr = g.getBoundingClientRect(), sr = sh.getBoundingClientRect();
        return { role: g.getAttribute('role'), centre: Math.round(Math.abs((gr.left + gr.right) / 2 - (sr.left + sr.right) / 2)), inside: gr.left >= sr.left - 1 && gr.right <= sr.right + 1,
            b: [...g.querySelectorAll('.mh-vb')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent, a: b.getAttribute('aria-label'), on: b.getAttribute('aria-checked'), h: Math.round(r.height), w: Math.round(r.width), cut: b.scrollWidth > b.clientWidth + 1, top: Math.round(r.top) }; }) }; });
    ck('three deadlift pills, one word each, in order', !!pills && pills.b.length === 3 && pills.b.every((b, i) => b.t === WORDS[i]), JSON.stringify(pills && pills.b.map(b => b.t)));
    ck('pills: radio group, centred in the sheet, on one row, thumb-sized, no word cut off', !!pills && pills.role === 'radiogroup' && pills.centre <= 2 && pills.inside && new Set(pills.b.map(b => b.top)).size === 1 && pills.b.every(b => b.h >= 44 && !b.cut), JSON.stringify(pills));
    ck('screen reader hears the full names', !!pills && ['rdl', 'conv', 'sumo'].every((k, i) => pills.b[i].a === NAMES[k]), JSON.stringify(pills && pills.b.map(b => b.a)));
    ck('no pick yet: Conventional is picked', !!pills && pills.b[1].on === 'true' && pills.b[0].on === 'false' && pills.b[2].on === 'false');
    await page.click('.mh-vb[data-v="' + V + '"]');
    await sleep(250);
    const picked = await page.evaluate(() => ({ on: (document.querySelector('.mh-vb.on') || {}).dataset, title: document.querySelector('.mm-sheet .mm-ph b').textContent, store: localStorage.getItem('lowi.mm.dl'), cam: !!document.querySelector('[data-mm="cam"]'), focus: document.activeElement && document.activeElement.classList.contains('mh-vb') }));
    ck('picking ' + V + ': it lights up, names the sheet, is remembered, focus stays on it', picked.on && picked.on.v === V && picked.title === NAMES[V] && picked.store === V && picked.cam && picked.focus, JSON.stringify(picked));
    await page.evaluate(v => { window.__fake.v = v; }, V);
    await sleep(300); await shot('2-setup');
    await page.click('[data-mm="cam"]');
    await page.evaluate(() => { window.__fake.mode = 'front'; });
    const turn = await waitFor(() => /seitlich|sideways|de lado/i.test((document.querySelector('.mm-pill') || {}).textContent || ''), 15000);
    ck('front-on: asks you to turn sideways', turn, await txt('.mm-pill'));
    await page.evaluate(() => { window.__fake.mode = 'side'; });
    await sleep(500); await shot('3-align');
    const follow = await waitFor(() => /Satz 1\/3|Set 1\/3|Serie 1\/3/.test((document.querySelector('.mm-move b') || {}).textContent || ''), 15000);
    ck('side-on: hold still, 3-2-1, then set 1 starts', follow, await txt('.mm-move b'));
    await page.evaluate(() => { window.__fake.cycle = true; window.__fake.t0 = performance.now(); });
    const r1 = await waitFor(() => /^1\//.test((document.querySelector('.mm-left') || {}).textContent || '') && document.querySelector('.mh-rep.on b').textContent === '1', 9000);
    ck('a full hinge counts 1 rep (card + rep bubble)', r1, await txt('.mm-left'));
    ck('clean rep: teal bubble', await page.evaluate(() => document.querySelector('.mh-rep').classList.contains('clean')));
    await waitFor(() => (document.querySelector('.mm-left') || {}).textContent.startsWith('2/'), 6000);
    await sleep(1300); await shot('4-hinge');
    const lay = await page.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
        const st = document.querySelector('.mm-stage'), HC = window.LowiHingeCore, v = window.__fake.v, A = HC.defaultAnchor(st.clientWidth, st.clientHeight, 1, v), G = HC.ghost(A, HC.pose(1, v));
        return { rep: r('.mh-rep'), misty: r('.mh-misty'), pill: r('.mm-pill'), card: r('.mm-card'), title: r('.mm-title'), W: st.clientWidth, H: st.clientHeight, headX: Math.round(G.head[0] + G.headR), hipX: Math.round(G.hip[0] - G.w * 0.6), headY: Math.round(HC.ghost(A, HC.pose(0, v)).head[1] - A.headR) }; });
    const ov = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    ck('rep bubble clear of the title, the cue pill and the card', !ov(lay.rep, lay.pill) && !ov(lay.rep, lay.card) && !ov(lay.rep, lay.title), JSON.stringify(lay));
    ck('whole hinge fits on screen (head forward at the bottom, hips back)', lay.headX <= lay.W && lay.hipX >= 0 && lay.headY >= 0, lay.hipX + '..' + lay.headX + ' of ' + lay.W);
    await page.evaluate(() => { window.__fake.round = 70; });
    const back = await waitFor(() => /Rücken lang|back long|Espalda larga/.test(document.querySelector('.mm-pill').textContent) && document.querySelector('.mm-pill').classList.contains('form'), 9000);
    ck('rounded back: form cue in the bubble style', back, await txt('.mm-pill'));
    await sleep(150); await shot('5-cue');
    const faultRep = await waitFor(() => document.querySelector('.mh-rep').classList.contains('fault'), 6000);
    ck('that rep is marked not clean (amber bubble)', faultRep);
    await page.evaluate(() => { window.__fake.round = 0; });
    if (opt.full) {
        const rest = await waitFor(() => /Pause|Rest|Descanso/.test(document.querySelector('.mm-move b').textContent), 45000);
        ck('8 reps finish set 1, rest starts', rest, await txt('.mm-move b'));
        const misty = await waitFor(() => document.querySelector('.mh-misty.on') && /Satz 1 geschafft|Set 1 done|Serie 1 hecha/.test(document.querySelector('.mh-say').textContent), 3000);
        ck('Misty bubble: set 1 done line', misty, await txt('.mh-say'));
        await sleep(300); await shot('6-set');
        const skip = await page.evaluate(() => { const b = document.querySelector('[data-mm="skiprest"]'); return b && !b.hidden ? b.getBoundingClientRect().height : 0; });
        ck('skip rest button visible and thumb-sized', skip >= 44, String(skip));
        await page.click('[data-mm="skiprest"]');
        const s2 = await waitFor(() => /Satz 2\/3|Set 2\/3/.test(document.querySelector('.mm-move b').textContent), 4000);
        ck('skip rest: set 2 starts', s2, await txt('.mm-move b'));
        for (let i = 0; i < 2; i++) { await waitFor(() => /Pause|Rest/.test(document.querySelector('.mm-move b').textContent) || !!document.querySelector('.mh-sets'), 45000); if (await page.$('.mh-sets')) break; await page.click('[data-mm="skiprest"]').catch(() => { }); }
        const done = await waitFor(() => !!document.querySelector('.mh-sets') && document.querySelectorAll('.mh-sets li').length === 3, 45000);
        ck('3 sets: done sheet with sets, reps and clean reps, camera off', done, (await txt('.mm-sheet')).slice(0, 160));
        ck('done sheet names the deadlift you did', (await txt('.mm-sheet .mm-ph b')).indexOf(NAMES[V]) === 0, await txt('.mm-sheet .mm-ph b'));
        ck('done event carries routine hinge + variant', await page.evaluate(v => window.__lastDone && window.__lastDone.routine === 'hinge' && window.__lastDone.variant === v, V), await page.evaluate(() => JSON.stringify(window.__lastDone || null)));
        await sleep(400); await shot('7-done');
        await page.click('.mm-sheet [data-mm="close"]').catch(() => { });
    } else {
        await page.evaluate(() => { window.__fake.cycle = false; window.__fake.depth = 0; });
        await page.click('[data-mm="close"]').catch(() => { });
    }
    /* hold Move -> Mirror opens the chooser: the deadlift card is in it */
    await sleep(500);
    const chooser = await page.evaluate(() => { try { window.LowiMirror.open(); } catch (e) { return 'err ' + e.message; } const b = document.querySelector('.mm-rt[data-r="hinge"]'); return b ? Math.round(b.getBoundingClientRect().height) + ' ' + b.textContent : ''; });
    ck('Mirror chooser lists the deadlift card (thumb-sized)', /^\d+/.test(chooser) && parseInt(chooser, 10) >= 44, chooser.slice(0, 90));
    await sleep(300); await shot('8-chooser');
    ck('no errors on the page', !errs.length, errs.slice(0, 3).join(' | '));
    await browser.close();
    return res;
}

(async () => {
    const runs = [['iphone-de-rdl', { width: 390, height: 844 }, { lang: 'de', full: true, v: 'rdl' }], ['iphone-de-sumo', { width: 390, height: 844 }, { lang: 'de', full: true, v: 'sumo' }],
        ['small-en-conv', { width: 375, height: 667 }, { lang: 'en', full: true, v: 'conv' }], ['small-de-sumo', { width: 375, height: 667 }, { lang: 'de', full: false, v: 'sumo' }],
        ['ipad-es-sumo', { width: 820, height: 1180 }, { lang: 'es', full: false, v: 'sumo' }], ['ipadland-de-conv', { width: 1180, height: 820 }, { lang: 'de', full: false, v: 'conv' }]];
    if (process.env.ONLY) runs.splice(0, runs.length, ...runs.filter(r => r[0] === process.env.ONLY));
    let bad = 0;
    for (const [n, vp, o] of runs) { const r = await run(n, vp, o).catch(e => ({ name: n, ok: 0, fail: 1, cases: ['FAIL crashed: ' + e.message] })); console.log('\n' + r.name + ': ' + r.ok + '/' + (r.ok + r.fail)); r.cases.forEach(c => console.log('  ' + c)); bad += r.fail; }
    console.log(bad ? '\nFAILED' : '\nALL PASS'); process.exit(bad ? 1 : 0);
})();
