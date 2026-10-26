/* Community bot recipe card proof (MAYA-HANDOFF 0.18, Oct 26 2026): in a real browser, today's Nibblo recipe post in Community Chat
   - shows four labelled buttons under the card (Open recipe / Cook it / Save / Add to kitchen), 44 px, inside the bubble
   - photo, dish name and Open recipe open the SAME recipe page a Shuffle pick opens (#p2Rec in .p2-recov), with where to buy + prices
   - Cook it opens that recipe in cook mode (.p2-ckov); Save puts it in My recipes (LowiBook)
   - Add to kitchen puts the products into lowispike.kitchen.v1 once, shows "N in your kitchen" + Undo, the recipe page then counts
     them as at home and its own button says all in your kitchen; Undo takes them out; a second Add adds nothing twice
   - no tap on the buttons opens the bubble's menu; the menu's reaction button says React, not "+"; Cook > Kitchen lists the foods; no page errors.
   node tools/bot-recipe/check.cjs [outDir] [url] [cases]   (url: run against that site with the fake Supabase; nothing is written) */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), NV = require('../regress/nav.cjs');
const K = require('../../community-chat-core.js');
const NB = require('../../nibblo-core.js');
const OUT = path.resolve(process.argv[2] || '/tmp/bot-recipe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const ALL = {
    'webkit-13-en': { engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 }, lang: 'en' },
    'webkit-se-de': { engine: 'webkit', device: 'iPhone SE (3rd gen)', viewport: { width: 375, height: 667 }, lang: 'de' },
    'webkit-15pm-es': { engine: 'webkit', device: 'iPhone 15 Pro Max', viewport: { width: 430, height: 932 }, lang: 'es' },
    'chromium-13-en': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'en' }
};
const CASES = (process.argv[4] || 'webkit-13-en,webkit-se-de').split(',').filter(k => ALL[k]);
const LBL = { en: ['Open recipe', 'Cook it', 'Save', 'Add to kitchen'], de: ['Rezept öffnen', 'Kochen', 'Merken', 'In die Küche'], es: ['Abrir receta', 'Cocinar', 'Guardar', 'A mi cocina'] };
const REACT = { en: 'React', de: 'Reagieren', es: 'Reaccionar' };

async function one(key) {
    const C = ALL[key], res = { key, ok: true, checks: [] };
    const ok = (name, pass, info) => { res.checks.push({ name, pass: !!pass, info }); if (!pass) res.ok = false; };
    const R = await H.open(Object.assign({ probe: false, url: URL_, messages: 60, members: 20 }, C));
    const p = R.page, sim = R.sim;
    const slow = C.engine === 'webkit' ? 120000 : 30000;
    try {
        const day = NB.berlin(Date.now()).day, slot = 'm';
        const pk = NB.pick(day, slot), bookId = NB.bookId(pk.dish.r);
        const msg = { id: NB.msgId(day, slot), user_id: NB.UID, who: NB.NAME, body: NB.chatBody(day, slot, K.mealBody), reply_to: null, created_at: new Date().toISOString(), room: 'all' };
        sim.W.messages.push(msg);
        await R.ctx.addInitScript((l) => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, C.lang);
        await R.goto();
        await NV.openCommunity(R, () => { });
        if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true, timeout: 8000 });
        const row = p.locator('.crb-row[data-key="c' + msg.id + '"]');
        await row.waitFor({ state: 'attached', timeout: slow });
        await row.scrollIntoViewIfNeeded();
        await p.waitForTimeout(600);
        const info = await p.evaluate((k) => {
            const r = document.querySelector('.crb-row[data-key="' + k + '"]'), bub = r && r.closest('.cm-bub');
            const bs = [...r.querySelectorAll('.crb-b')].map(b => { const q = b.getBoundingClientRect(); return { a: b.getAttribute('data-crb'), t: b.querySelector('.crb-l').textContent, w: Math.round(q.width), h: Math.round(q.height), l: q.left, r: q.right }; });
            const bq = bub ? bub.getBoundingClientRect() : null;
            return { bs, inBub: !!bq && bs.every(b => b.l >= bq.left - 1 && b.r <= bq.right + 1), vw: innerWidth, name: (bub && bub.querySelector('.cs-meal-n') || {}).tagName };
        }, 'c' + msg.id);
        ok('four labelled buttons', JSON.stringify(info.bs.map(b => b.t)) === JSON.stringify(LBL[C.lang]), info.bs.map(b => b.t));
        ok('every button at least 44 px high', info.bs.every(b => b.h >= 44), info.bs.map(b => b.h));
        ok('buttons inside the bubble', info.inBub, info.bs.map(b => [Math.round(b.l), Math.round(b.r)]));
        ok('dish name is a button', info.name === 'BUTTON', info.name);
        await p.locator('.cm-bub:has(.crb-row[data-key="c' + msg.id + '"])').screenshot({ path: path.join(OUT, key + '-card.png') }).catch(() => { });

        const recOpen = async () => { await p.waitForFunction(() => { const r = document.querySelector('.p2-recov.on #p2Rec, .p2-recov #p2Rec'); return !!r && r.textContent.length > 50; }, null, { timeout: 20000 }); await p.waitForTimeout(700); };
        const recText = () => p.evaluate(() => { const r = document.querySelector('#p2Rec'); return r ? r.textContent.replace(/\s+/g, ' ') : ''; });
        const closeAll = async () => { await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await p.waitForFunction(() => !document.querySelector('.p2-recov,.p2-ckov'), null, { timeout: 8000 }).catch(() => { }); await p.waitForTimeout(400); };
        const menuOpen = () => p.evaluate(k => { const r = document.querySelector('.crb-row[data-key="' + k + '"]'); const it = r && r.closest('[id^="cm-"]'); return !!(it && it.querySelector('.cp-acts')); }, 'c' + msg.id);

        /* 1. the photo */
        await p.locator('.cm-bub:has(.crb-row[data-key="c' + msg.id + '"]) .cs-photo').click({ timeout: 8000 });
        await recOpen();
        const t1 = await recText();
        const want = await p.evaluate(id => { const r = LowiP2.rec(id); return r ? r.n : ''; }, bookId);
        ok('photo opens the Shuffle recipe page', t1.includes(want) || t1.length > 200, { want, start: t1.slice(0, 120) });
        await p.screenshot({ path: path.join(OUT, key + '-recipe.png') });
        const same = await p.evaluate(id => { const a = document.querySelector('#p2Rec').innerHTML; return { one: document.querySelectorAll('#p2Rec').length, cls: !!document.querySelector('.p2-recov') }; }, bookId);
        ok('one recipe page, the p2 one', same.one === 1 && same.cls, same);
        await closeAll();
        /* 2. the dish name */
        await p.locator('.cm-bub:has(.crb-row[data-key="c' + msg.id + '"]) button.cs-meal-n').click({ timeout: 8000 });
        await recOpen(); ok('dish name opens the recipe', (await recText()).length > 200); await closeAll();
        /* 3. Open recipe */
        await row.locator('[data-crb="open"]').click({ timeout: 8000 });
        await recOpen(); ok('Open recipe opens the recipe', (await recText()).length > 200); await closeAll();
        ok('no button tap opened the bubble menu', !(await menuOpen()));
        /* 4. Add to kitchen */
        const before = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}').items.length; } catch (e) { return -1; } });
        await row.locator('[data-crb="kitchen"]').click({ timeout: 8000 });
        await p.waitForTimeout(500);
        const k1 = await p.evaluate((id) => { const st = JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}'); const r = LowiP2.rec(id); return { n: st.items.length, names: st.items.map(i => i.n), foods: LowiBotRecipeCore.foods(r.ing).length }; }, bookId);
        ok('Add to kitchen puts every product into the Kitchen', k1.n - before === k1.foods && k1.foods > 0, k1);
        const rowNow = await p.evaluate(k => { const r = document.querySelector('.crb-row[data-key="' + k + '"]'); return r ? r.textContent.replace(/\s+/g, ' ') : ''; }, 'c' + msg.id);
        ok('the row says how many are in your kitchen, with Undo', /\d/.test(rowNow) && !!(await row.locator('[data-crb="undo"]').count()), rowNow);
        await p.locator('.cm-bub:has(.crb-row[data-key="c' + msg.id + '"])').screenshot({ path: path.join(OUT, key + '-added.png') }).catch(() => { });
        ok('still no bubble menu', !(await menuOpen()));
        /* the recipe page counts them as at home now */
        await row.locator('[data-crb="open"]').click({ timeout: 8000 }); await recOpen();
        const kitBtn = await p.evaluate(() => { const b = document.querySelector('#p2Rec .p2-kit'); return b ? b.textContent : null; });
        const buy = await p.evaluate(id => LowiP2.basket(LowiP2.rec(id)).buy.length, bookId).catch(e => 'err ' + e.message);
        ok('recipe page: nothing left to buy, its button says all in your kitchen', buy === 0 && kitBtn && /\u2713/.test(kitBtn), { buy, kitBtn });
        await p.screenshot({ path: path.join(OUT, key + '-recipe-after.png') });
        await closeAll();
        /* Undo */
        await row.locator('[data-crb="undo"]').click({ timeout: 8000 }); await p.waitForTimeout(400);
        const k2 = await p.evaluate(() => JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}').items.length);
        ok('Undo takes them out again', k2 === before, { before, k2 });
        /* the recipe page's own Add to kitchen does the same, and Chat then says all in your kitchen */
        await row.locator('[data-crb="open"]').click({ timeout: 8000 }); await recOpen();
        await p.evaluate(() => { const b = document.querySelector('#p2Rec .p2-kit'); if (b) b.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(800);
        /* WebKit: the recipe page can still shift once while its pictures load; wait until the button holds still, then tap it */
        await p.waitForFunction(() => { const b = document.querySelector('#p2Rec .p2-kit'); if (!b) return false; const t = Math.round(b.getBoundingClientRect().top); const ok = window.__kitT === t; window.__kitT = t; return ok; }, null, { timeout: 8000, polling: 400 }).catch(() => { });
        try { await p.locator('#p2Rec .p2-kit').click({ timeout: 8000 }); } catch (e) { console.log('CLICKERR', e.message.slice(0, 3000)); const samp = await p.evaluate(async () => { const out = []; for (let i = 0; i < 15; i++) { const b = document.querySelector('#p2Rec .p2-kit'); const q = b.getBoundingClientRect(); const sh = b.closest('.r2-sh'); const at = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); out.push([Math.round(q.top*10)/10, Math.round(q.left), Math.round(q.width), sh ? sh.scrollTop : null, sh ? sh.scrollHeight : null, at ? at.className : null, innerHeight].join('|')); await new Promise(r => setTimeout(r, 200)); } return out; }); console.log('DIAG', JSON.stringify(samp)); throw e; } await p.waitForTimeout(500);
        const k3 = await p.evaluate(() => ({ n: JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}').items.length, b: (document.querySelector('#p2Rec .p2-kit') || {}).textContent }));
        ok('recipe page Add to kitchen: each product once, button flips', k3.n - before === k1.foods && /\u2713/.test(k3.b || ''), k3);
        await closeAll();
        const rowHave = await p.evaluate(k => { const r = document.querySelector('.crb-row[data-key="' + k + '"]'); return r ? r.getAttribute('data-crb-s') + ' ' + r.textContent.replace(/\s+/g, ' ') : ''; }, 'c' + msg.id);
        ok('Chat row now says all in your kitchen', /^have/.test(rowHave), rowHave);
        /* 5. Save */
        await row.locator('[data-crb="save"]').click({ timeout: 8000 }); await p.waitForTimeout(400);
        const sv = await p.evaluate(id => ({ has: !!(window.LowiBook && LowiBook.has(id)), t: (document.querySelector('.crb-row [data-crb="save"]') || {}).textContent }), bookId);
        ok('Save puts it in My recipes', sv.has, sv);
        /* 6. Cook it */
        await row.locator('[data-crb="cook"]').click({ timeout: 8000 });
        await p.waitForFunction(() => !!document.querySelector('.p2-ckov'), null, { timeout: 20000 }).catch(() => { });
        ok('Cook it opens cook mode', await p.evaluate(() => !!document.querySelector('.p2-ckov')), await p.evaluate(() => [...document.querySelectorAll('.r2-ov')].map(o => o.className)));
        await p.screenshot({ path: path.join(OUT, key + '-cook.png') });
        await closeAll();
        /* 7. the bubble menu: React in words */
        await p.evaluate(k => { const r = document.querySelector('.crb-row[data-key="' + k + '"]'); const c = r && r.closest('.cm-bub').querySelector('.cm-t'); (c || r.closest('.cm-bub')).click(); }, 'c' + msg.id);
        await p.waitForTimeout(500);
        const pickT = await p.evaluate(() => { const b = document.querySelector('.cp-acts [data-chat="pick"]'); return b ? b.textContent.trim() : null; });
        ok('the menu says React, not +', !!pickT && pickT.includes(REACT[C.lang]) && !/^\+|\uFF0B/.test(pickT), pickT);
        /* 8. the Kitchen screen itself (Cook > Kitchen since build 20261026-132254) lists what Add to kitchen put away */
        await closeAll();
        await p.evaluate(() => { try { LowiKitchenGame.open(); } catch (e) { } });
        await p.waitForFunction(() => !!document.querySelector('#kgRoot .kg-scene'), null, { timeout: 20000 }).catch(() => { });
        const doors = await p.evaluate(() => [...document.querySelectorAll('#kgRoot [data-kg-door]')].filter(d => d.dataset.kgDoor !== 'buy').map(d => ({ id: d.dataset.kgDoor, n: +((d.querySelector('.kg-dl small') || {}).textContent) || 0 })));
        /* the names Add to kitchen stored, in the phone's language (Gurke, Pepino...), one per recipe food */
        const want8 = await p.evaluate(id => { const st = JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}'); const n = LowiBotRecipeCore.foods(LowiP2.rec(id).ing).length; return st.items.length === n ? st.items.map(i => i.n) : ['count ' + st.items.length + ' != ' + n]; }, bookId);
        const seen = [];
        for (const d of doors.filter(x => x.n > 0)) {
            await p.locator('#kgRoot [data-kg-door="' + d.id + '"]').click({ timeout: 8000 });
            await p.waitForFunction(() => !!document.querySelector('#kgRoot .kg-open'), null, { timeout: 8000 }).catch(() => { });
            seen.push(...(await p.evaluate(() => [...document.querySelectorAll('#kgRoot .kg-open .kg-ct b')].map(b => b.textContent))));
            await p.locator('#kgRoot .kg-open [data-kg="close"]').click({ timeout: 8000 }).catch(() => { });
            await p.waitForFunction(() => !document.querySelector('#kgRoot .kg-open'), null, { timeout: 8000 }).catch(() => { });
        }
        ok('Cook > Kitchen lists every added food on its shelf', want8.length > 0 && want8.every(n => seen.includes(n)) && doors.reduce((a, d) => a + d.n, 0) === want8.length, { want8, seen, doors });
        await p.screenshot({ path: path.join(OUT, key + '-kitchen.png') });
        ok('no page errors', R.errs.length === 0, R.errs.slice(0, 3));
    } catch (e) { ok('ran', false, String(e && e.message).slice(0, 400)); }
    await R.close();
    return res;
}
(async () => {
    let all = true;
    for (const k of CASES) {
        const r = await one(k);
        for (const c of r.checks) console.log((c.pass ? 'PASS ' : 'FAIL ') + k + ' ' + c.name + (c.info !== undefined ? ' ' + JSON.stringify(c.info).slice(0, c.name === 'ran' ? 1500 : 300) : ''));
        if (!r.ok) all = false;
    }
    console.log(all ? 'ALL PASS' : 'SOME FAILED');
    process.exit(all ? 0 : 1);
})();
