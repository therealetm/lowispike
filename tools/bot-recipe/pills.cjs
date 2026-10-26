/* Recipe card pills proof (MAYA-HANDOFF 0.27, Oct 26 2026). Emmanuel: "Added to your kitchen, it looks so clunky and big ...
   That's not even normal written words anymore." In a real browser, today's Nibblo recipe post in Community Chat:
   - every button label is on ONE line, no word is split across lines (letter-by-letter), before and after Add to kitchen
   - the buttons are compact pills (visible height <= 40 px) but still 44 px to the finger (hit area)
   - after Add to kitchen: one pill "✓ N in your kitchen · Undo"; the row keeps its height and the kitchen pill keeps its place
   - no toast covers the post after Add to kitchen / Undo from the card; Undo is not under the centre of Add to kitchen
   - every button inside the bubble; a person's meal post (Add to kitchen only) too; no page errors
   node tools/bot-recipe/pills.cjs [outDir] [url] [cases] [reduce]   (url: that site with the fake Supabase; nothing is written) */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), NV = require('../regress/nav.cjs');
const K = require('../../community-chat-core.js');
const NB = require('../../nibblo-core.js');
const OUT = path.resolve(process.argv[2] || '/tmp/recipe-pills'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] && process.argv[3] !== '-' ? process.argv[3] : '';
const ALL = {
    'webkit-13-en': { engine: 'webkit', device: 'iPhone 13', lang: 'en' },
    'webkit-13-de': { engine: 'webkit', device: 'iPhone 13', lang: 'de' },
    'webkit-13-es': { engine: 'webkit', device: 'iPhone 13', lang: 'es' },
    'webkit-se-de': { engine: 'webkit', device: 'iPhone SE (3rd gen)', lang: 'de' },
    'webkit-ipad-de': { engine: 'webkit', device: 'iPad Pro 11', lang: 'de' },
    'webkit-ipadl-es': { engine: 'webkit', device: 'iPad Pro 11 landscape', lang: 'es' },
    'chromium-13-en': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'en' }
};
const CASES = (process.argv[4] || 'webkit-13-en,webkit-13-de,webkit-13-es').split(',').filter(k => ALL[k]);
const REDUCE = process.argv[5] === 'reduce';

/* in the page: the shape of one row */
const MEASURE = (k) => {
    const r = document.querySelector('.crb-row[data-key="' + k + '"]'); if (!r) return null;
    const bub = r.closest('.cm-bub'), bq = bub ? bub.getBoundingClientRect() : null, rq = r.getBoundingClientRect();
    const split = el => {
        /* a word split across lines: its own text range has more than one line box */
        const out = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n; while ((n = tw.nextNode())) { const s = n.textContent; const re = /\S+/g; let m;
            while ((m = re.exec(s))) { const g = document.createRange(); g.setStart(n, m.index); g.setEnd(n, m.index + m[0].length);
                const tops = new Set([...g.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))); if (tops.size > 1) out.push(m[0]); } }
        return out;
    };
    const lines = el => { const g = document.createRange(); g.selectNodeContents(el); return new Set([...g.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size; };
    const ctl = [...r.querySelectorAll('.crb-b, .crb-undo')].map(b => {
        const q = b.getBoundingClientRect(), lab = b.querySelector('.crb-l') || b;
        const hit = getComputedStyle(b, '::before'); const ins = hit && hit.content !== 'none' ? parseFloat(hit.top) || 0 : 0;
        return { a: b.getAttribute('data-crb') || b.className, t: b.textContent.replace(/\s+/g, ' ').trim(), w: Math.round(q.width), h: Math.round(q.height), hitH: Math.round(q.height - 2 * Math.min(0, ins)),
            l: Math.round(q.left), r: Math.round(q.right), top: Math.round(q.top), lines: lines(lab), split: split(b) };
    });
    const kit = r.querySelector('.crb-kitchen'); const kq = kit ? kit.getBoundingClientRect() : null;
    const toast = document.querySelector('#toast.show');
    const tq = toast ? toast.getBoundingClientRect() : null;
    return { rowH: Math.round(rq.height), rowTop: Math.round(rq.top), kit: kq ? [Math.round(kq.left), Math.round(kq.top), Math.round(kq.width), Math.round(kq.height)] : null,
        inBub: !!bq && ctl.every(b => b.l >= bq.left - 1 && b.r <= bq.right + 1), bubW: bq ? Math.round(bq.width) : 0, ctl,
        toast: tq && tq.height ? { t: toast.textContent.slice(0, 80), over: !!bq && tq.bottom > bq.top && tq.top < bq.bottom && tq.right > bq.left && tq.left < bq.right } : null };
};

async function one(key) {
    const C = ALL[key], res = { key, ok: true, checks: [] };
    const ok = (name, pass, info) => { res.checks.push({ name, pass: !!pass, info }); if (!pass) res.ok = false; };
    const dev = C.device && C.device.endsWith(' landscape') ? C.device : C.device;
    const R = await H.open(Object.assign({ probe: false, url: URL_, messages: 40, members: 20 }, C, { device: dev }));
    const p = R.page, sim = R.sim;
    const slow = C.engine === 'webkit' ? 120000 : 30000;
    try {
        if (REDUCE) await p.emulateMedia({ reducedMotion: 'reduce' });
        const day = NB.berlin(Date.now()).day, slot = 'm';
        const msg = { id: NB.msgId(day, slot), user_id: NB.UID, who: NB.NAME, body: NB.chatBody(day, slot, K.mealBody), reply_to: null, created_at: new Date().toISOString(), room: 'all' };
        sim.W.messages.push(msg);
        await R.ctx.addInitScript((l) => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, C.lang);
        await R.goto();
        await NV.openCommunity(R, () => { });
        if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true, timeout: 8000 });
        const k = 'c' + msg.id, row = () => p.locator('.crb-row[data-key="' + k + '"]');
        await row().waitFor({ state: 'attached', timeout: slow });
        await p.evaluate(k => { const r = document.querySelector('.crb-row[data-key="' + k + '"]'); r && r.scrollIntoView({ block: 'center' }); }, k); await p.waitForTimeout(900);
        const shot = n => p.locator('.cm-bub:has(.crb-row[data-key="' + k + '"])').screenshot({ path: path.join(OUT, key + '-' + n + '.png') }).catch(() => { });
        const a = await p.evaluate(MEASURE, k); await shot('before');
        const lab = s => s.ctl.map(b => b.t + ':' + b.lines + 'L/' + b.h + 'h');
        ok('before: every label on one line', a.ctl.every(b => b.lines === 1), lab(a));
        ok('before: no word split across lines', a.ctl.every(b => !b.split.length), a.ctl.filter(b => b.split.length).map(b => b.split));
        ok('before: compact pills (<= 40 px), 44 px to the finger', a.ctl.every(b => b.h <= 40 && b.hitH >= 44), a.ctl.map(b => b.h + '/' + b.hitH));
        ok('before: buttons inside the bubble', a.inBub, { bub: a.bubW, ctl: a.ctl.map(b => [b.l, b.r]) });
        /* three labelled pills cannot sit side by side in a 228 px bubble in German, so: Open recipe | Cook it · Save | kitchen,
           and the whole row must still be no taller than the old 2x2 tiles (128 px) */
        ok('before: at most 3 tidy rows, no taller than the old tiles (128 px)', new Set(a.ctl.map(b => b.top)).size <= 3 && a.rowH <= 128, { rows: a.ctl.map(b => b.top), h: a.rowH });
        /* Add to kitchen (a real tap) */
        const kb = await p.evaluate(k => { const b = document.querySelector('.crb-row[data-key="' + k + '"] [data-crb="kitchen"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, k);
        if (C.engine === 'webkit') await p.touchscreen.tap(kb.x, kb.y); else await p.mouse.click(kb.x, kb.y);
        await p.waitForTimeout(450);
        const b = await p.evaluate(MEASURE, k); await shot('after');
        const pill = b.ctl.find(c => /crb-kitchen/.test(c.a) || c.a === 'kitchen') || {};
        ok('after: one readable pill "N in your kitchen · Undo"', b.ctl.some(c => c.a === 'undo') && /\d/.test((b.ctl.find(c => /\d/.test(c.t)) || {}).t || ''), b.ctl.map(c => c.t));
        ok('after: every label on one line', b.ctl.every(c => c.lines === 1), lab(b));
        ok('after: no word split across lines', b.ctl.every(c => !c.split.length), b.ctl.filter(c => c.split.length).map(c => c.split));
        ok('after: compact, 44 px to the finger', b.ctl.every(c => c.h <= 40 && c.hitH >= 44), b.ctl.map(c => c.a + ' ' + c.h + '/' + c.hitH));
        ok('after: same row height, kitchen pill in the same place', a.rowH === b.rowH && a.kit && b.kit && a.kit[1] - a.rowTop === b.kit[1] - b.rowTop && a.kit[0] === b.kit[0] && a.kit[2] === b.kit[2] && a.kit[3] === b.kit[3], { before: [a.rowH, a.kit], after: [b.rowH, b.kit] });
        const un = b.ctl.find(c => c.a === 'undo');
        ok('after: Undo is not under the centre of Add to kitchen', !!un && !(kb.x >= un.l && kb.x <= un.r && kb.y >= un.top && kb.y <= un.top + un.h), { tap: [Math.round(kb.x), Math.round(kb.y)], undo: un && [un.l, un.top, un.w, un.h] });
        ok('after: no toast covers the post', !b.toast || !b.toast.over, b.toast);
        ok('after: inside the bubble', b.inBub, { bub: b.bubW, ctl: b.ctl.map(c => [c.l, c.r]) });
        /* Undo */
        await p.waitForTimeout(600);
        const ub = await p.evaluate(k => { const b = document.querySelector('.crb-row[data-key="' + k + '"] [data-crb="undo"]'); if (!b) return null; const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, k);
        if (ub) { if (C.engine === 'webkit') await p.touchscreen.tap(ub.x, ub.y); else await p.mouse.click(ub.x, ub.y); }
        await p.waitForTimeout(450);
        const c = await p.evaluate(MEASURE, k);
        ok('Undo: back to Add to kitchen, same height, no toast over the post', c.ctl.some(x => x.a === 'kitchen') && c.rowH === a.rowH && (!c.toast || !c.toast.over), { rowH: c.rowH, toast: c.toast });
        const kn = await p.evaluate(() => JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}').items.length);
        ok('Undo: kitchen empty again', kn === 0, kn);
        /* a person's meal post with foods: Add to kitchen only, same pill */
        const one1 = await p.evaluate((l) => { const C = LowiBotRecipeCore; const bub = document.querySelector('.cm-bub:has(.crb-row)'); const box = document.createElement('div'); box.className = 'cm-bub'; box.style.cssText = 'width:' + (bub ? bub.getBoundingClientRect().width : 280) + 'px'; (bub ? bub.parentNode : document.body).appendChild(box);
            const out = []; for (const st of [{ kitchen: 'add', count: 3 }, { kitchen: 'done', added: 3, undo: true }, { kitchen: 'have' }]) { box.innerHTML = C.rowHTML(Object.assign({ key: 'cx', foods: ['A', 'B', 'C'] }, st), l); const r = box.querySelector('.crb-row'); const q = r.getBoundingClientRect(); out.push({ st: st.kitchen, h: Math.round(q.height), t: r.textContent.replace(/\s+/g, ' '), ok: [...r.querySelectorAll('.crb-l')].every(e => { const g = document.createRange(); g.selectNodeContents(e); return new Set([...g.getClientRects()].filter(x => x.width).map(x => Math.round(x.top))).size === 1; }) }); }
            box.remove(); return out; }, C.lang);
        ok("a person's meal: one line in every state, same height", one1.every(x => x.ok) && new Set(one1.map(x => x.h)).size === 1, one1);
        ok('no page errors', R.errs.length === 0, R.errs.slice(0, 3));
    } catch (e) { ok('ran', false, String(e && e.message).slice(0, 600)); }
    await R.close();
    return res;
}
(async () => {
    let all = true;
    for (const k of CASES) {
        const r = await one(k);
        for (const c of r.checks) console.log((c.pass ? 'PASS ' : 'FAIL ') + k + ' ' + c.name + (c.info !== undefined ? ' ' + JSON.stringify(c.info).slice(0, 500) : ''));
        if (!r.ok) all = false;
    }
    console.log(all ? 'ALL PASS' : 'SOME FAILED');
    process.exit(all ? 0 : 1);
})();
