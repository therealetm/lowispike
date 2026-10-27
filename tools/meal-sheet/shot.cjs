/* Meal sheet look check (simulated Chromium, phone/SE/iPad sizes, de/en/es): opens Log meal with a few past meals and
   screenshots it. Usage: node tools/meal-sheet/shot.cjs [outdir] [url]. */
'use strict';
const path = require('path'), fs = require('fs');
const H = require('../sim/harness.cjs');
const OUT = process.argv[2] || '/tmp/mealsheet', URL = process.argv[3] || '';
const SIZES = (process.env.SIZES || 'phone,se,ipad').split(',');
const LANGS = (process.env.LANGS || 'de,en,es').split(',');
const VP = { phone: { width: 390, height: 844 }, se: { width: 320, height: 568 }, ipad: { width: 820, height: 1180 } };
const PAST = ['Lettuce wraps with ground beef', 'Scrambled eggs with spinach', 'Greek yogurt with berries', 'Chicken salad', 'Oatmeal with walnuts'];
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const report = [];
    for (const size of SIZES) for (const lang of LANGS) {
        const R = await H.open({ engine: 'chromium', lang, url: URL, viewport: VP[size], dpr: size === 'ipad' ? 2 : 2, members: 5, messages: 10 });
        try {
            await R.goto();
            await R.page.evaluate(([past, lang]) => {
                const S = JSON.parse(localStorage.getItem('lowispike.v2'));
                const now = Date.now(), H = 3600e3;
                const dk = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
                S.logs = past.map((n, i) => ({ id: 'm' + i, eventId: 'm' + i, ts: now - (past.length - i) * 26 * H, day: dk(now - (past.length - i) * 26 * H), t: n, slot: 'meal', r: 'low', lvl: 'low', e: '', via: 'spirit' }));
                localStorage.setItem('lowispike.v2', JSON.stringify(S));
                localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.lang', lang);
            }, [PAST, lang]);
            await R.goto();
            await H.sleep(1500);
            await R.page.evaluate((l) => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang);
            await H.sleep(600);
            await R.page.evaluate(() => window.LowiSpirit && window.LowiSpirit.meal());
            if (process.env.PICK) { await H.sleep(800); await R.page.evaluate(() => { const b = document.querySelector('.sp-sheet [data-sp="slot"][data-slot="meal"]'); if (b) b.click(); }); }
            await H.sleep(1200);
            const f = path.join(OUT, `${size}-${lang}.png`);
            await R.shot(f);
            if (process.env.SNACK) await R.page.evaluate(() => { const b = document.querySelector('[data-sp="lmKind"][data-slot="snack"]'); if (b) b.click(); });
            const info = await R.page.evaluate(() => {
                const sh = document.querySelector('.sp-sheet'); if (!sh) return { sheet: false };
                const W = innerWidth, Hh = innerHeight, bad = []; const sc = sh.querySelector('.r2-shb') || sh; sc.scrollTop = 0; const pos = {}; ['.lm-kind', '#lmTitle', '.lm-alt', '.lm-row', '.lm-save', '.sp-fast-note', '.lm-usual', '.lm-idea', '.lm-today', '.lm-foot'].forEach(k => { const e = sh.querySelector(k); if (e) { const r = e.getBoundingClientRect(); pos[k] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; } });
                sh.querySelectorAll('button,input,summary,select,a').forEach(b => {
                    const r = b.getBoundingClientRect(); if (!r.width || !r.height) return;
                    if (getComputedStyle(b).visibility === 'hidden') return;
                    if (r.left < -1 || r.right > W + 1) bad.push(['offX', (b.textContent || b.getAttribute('aria-label') || b.className).trim().slice(0, 40), Math.round(r.left), Math.round(r.right)]);
                    b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect();
                    const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
                    const top = document.elementFromPoint(cx, cy); const cn = el => el ? (el.closest('[class]') ? String(el.closest('[class]').className.baseVal != null ? el.closest('[class]').className.baseVal : el.closest('[class]').className) : el.tagName) : 'none';
                    if (!top || (top !== b && !b.contains(top) && !top.contains(b) && !(b.closest('label') && b.closest('label').contains(top)))) bad.push(['covered', (b.textContent || b.getAttribute('aria-label') || b.className).trim().slice(0, 40), cn(top).slice(0, 50), cn(top && top.parentElement).slice(0, 50), Math.round(cy)]);
                    if (q.height < (b.matches('.lm-kind *') ? 39 : 43) && !b.matches('.lm-foot *, .sp-td *, .sp-today *, .mic-btn, [class*=mic]')) bad.push(['small', (b.textContent || b.getAttribute('aria-label') || b.className).trim().slice(0, 30), Math.round(q.width) + 'x' + Math.round(q.height)]);
                });
                return { sheet: true, pos, h: Math.round(sh.getBoundingClientRect().height), sh: sh.scrollHeight, text: sh.innerText.replace(/\n+/g, ' | ').slice(0, 900), bad };
            });
            report.push({ size, lang, errs: R.errs.slice(0, 5), ...info });
            console.log(size, lang, JSON.stringify(info).slice(0, 1400), R.errs.length ? 'ERRS ' + JSON.stringify(R.errs.slice(0, 3)) : '');
        } catch (e) { console.log(size, lang, 'FAIL', e.message); report.push({ size, lang, fail: e.message }); }
        await R.close();
    }
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
})();
