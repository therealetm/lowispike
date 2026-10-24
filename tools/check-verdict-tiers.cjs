'use strict';
/* Food verdict tiers check (Oct 24 2026). Opens the scan card for the funny-frisch "Sweet & Spicy Curry Style" chips
   (Emmanuel's case) and reads it: top spike card, Food check tier word + line, the "if you eat it anyway" line, no
   frequency words anywhere on the card, the Seller Zone heading without a second language, Seller Zone names never
   broken mid-word, nothing wider than the screen, page errors.
   node tools/check-verdict-tiers.cjs <device> <lang en|de|es> [live] [WxH]   (Chromium by default; ENG=webkit). Not a real phone. */
const fs = require('fs'), path = require('path');
const { launch, openApp, sleep, BASE, existingSeed } = require('./interface-audit/lib.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', live = process.argv[4] === 'live', vp = process.argv[5];
const OUT = process.env.VT_OUT || '/home/sprite/vt-shots';
const CHIPS = { barcode: '4003586000999', name: 'Sweet & Spicy Curry Style', brand: 'funny-frisch', cat: 'snack',
    facts: { c: 49, s: 3, p: 6, fat: 33, f: 4, kcal: 530, salt: 1.5, q: '110 g' },
    ingredients: 'Kartoffeln, Sonnenblumenöl, Gewürzmischung (Zucker, Salz, Gewürze, Currypulver, Paprikapulver, Zwiebelpulver, Knoblauchpulver, Hefeextrakt, Säuerungsmittel Citronensäure, Raucharoma)' };
const T = {
    en: { word: 'Skip it', sub: 'Higher spike estimate', anyway: 'anyway', head: 'Buy this instead' },
    de: { word: 'Lieber nicht', sub: 'Höhere Spike-Schätzung', anyway: 'Isst du es trotzdem?', head: 'Kauf lieber das' },
    es: { word: 'Mejor no', sub: '', anyway: '', head: 'Mejor compra esto' }
}[lang];
const FREQ = /now and then|now-and-then|ab und zu|de vez en cuando|once in a while|okay sometimes|\bRARELY\b|\bA VECES\b|keep it occasional|lieber selten|SELTEN/i;
(async () => {
    const seed = existingSeed({ lang, kv: { 'lowispike.lang': lang, 'lowi.lang': lang } });
    const o = { device, engine: process.env.ENG || 'chromium', seed, lang };
    if (vp) { const [w, h] = vp.split('x').map(Number); o.viewport = { width: w, height: h }; }
    const h = await launch(o);
    if (live) await h.ctx.route(u => String(u).startsWith(BASE), r => r.request().method() === 'GET' ? r.continue() : r.abort());
    await openApp(h, { query: '?vt=' + Date.now() });
    const P = h.page;
    await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang);
    await sleep(800);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(300); }
    const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
    await P.evaluate(p => LowiDex.reveal(p, true), CHIPS);
    await P.waitForSelector('#b3Card', { timeout: 30000 });
    await sleep(2500);
    const res = await P.evaluate(async ({ T, FREQ_SRC }) => {
        const FREQ = new RegExp(FREQ_SRC, 'i');
        const card = document.querySelector('#b3Card'); const sh = card.closest('.r2-sh') || card.parentElement;
        const txt = card.innerText;
        const top = card.querySelector('.sc-verd strong'), word = card.querySelector('.fc-word');
        const fcard = card.querySelector('.fc-card');
        const heads = [...card.querySelectorAll('h4')].map(e => e.textContent.trim());
        /* Seller Zone names: a word whose range has two line boxes is broken mid-word */
        const broken = [], names = [];
        for (const b of card.querySelectorAll('.sz-mini b')) {
            names.push(b.textContent.trim());
            const tn = [...b.childNodes].find(n => n.nodeType === 3); if (!tn) continue;
            const s = tn.textContent; const re = /\S+/g; let m;
            while ((m = re.exec(s))) { const r = document.createRange(); r.setStart(tn, m.index); r.setEnd(tn, m.index + m[0].length); const tops = new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))); if (tops.size > 1) broken.push(m[0]); }
        }
        const hy = card.querySelector('.sz-mini b') ? getComputedStyle(card.querySelector('.sz-mini b')).hyphens : null;
        const wide = [...card.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1) && !e.closest('.sz-row, .sz-strip-row, [style*="overflow"]'); }).map(e => e.className || e.tagName).slice(0, 5);
        const freq = (txt.match(FREQ) || [])[0] || null;
        return { vw: innerWidth, top: top && top.textContent, word: word && word.textContent, fcard: fcard && fcard.innerText.replace(/\s+/g, ' ').slice(0, 400), heads, names, broken, hy, wide, freq,
            hasSub: !T.sub || txt.includes(T.sub), hasAnyway: !T.anyway || txt.includes(T.anyway), hasHead: heads.includes(T.head) };
    }, { T, FREQ_SRC: FREQ.source });
    res.ok = res.word === T.word && res.hasSub && res.hasAnyway && !res.freq && !res.broken.length && !res.wide.length && !h.errors.length;
    res.device = device; res.lang = lang; res.live = live; res.build = build; res.errors = h.errors;
    fs.mkdirSync(OUT, { recursive: true });
    const tag = device.replace(/\W/g, '') + (vp ? '-' + vp : '') + '-' + lang + (live ? '-live' : '');
    await P.screenshot({ path: path.join(OUT, tag + '-top.png') });
    await P.evaluate(() => { const c = document.querySelector('#b3Card .fc-card') || document.querySelector('#b3Card .sz-mini'); if (c) c.scrollIntoView({ block: 'center' }); });
    await sleep(400); await P.screenshot({ path: path.join(OUT, tag + '-food.png') });
    console.log(JSON.stringify(res));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
