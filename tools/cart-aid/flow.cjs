'use strict';
/* Nov 5 2026 (cart lane, owner walkthrough + screenshot review): the money path end to end on a phone-sized screen.
   node tools/cart-aid/flow.cjs [root] [sizes] [langs]      ENG=chromium|webkit   sizes: iphone (390x844), se (320x568)
   Fake data only: an offline fake Give a hand server (LowiGiftBasket._api) and window.open caught in the page. Nothing is
   sent, posted or paid anywhere; no outside request leaves the browser (the harness blocks them).
   1 Plan my week with EUR 40 for 7 dinners for 2 people: never a plan silently far over the budget. Either it fits, or a
     plain note says the budget is too small, with "N dinners fit" and "Budget EUR X".
   2 "N dinners fit" makes a plan inside the budget.
   3 the week's list goes to the Cart with its pack counts (no item lost to 1) and the Cart total = the week's total.
   4 the Cart has two choices, I'll buy it and Someone else pays, and no Scan in the shop.
   5 Someone else pays: Give a hand gets EVERY cart food with its quantity and the cart estimate as the total (never EUR 5).
   6 the swipe feed shows a short preview with "+ N more" that opens the rest.
   7 swipe right opens the person's own Ko-fi page (window.open with exactly their link) and the card says nothing is paid
     yet; no basket is marked helped by the swipe.
   8 zero page errors. */
const H = require('../sim/harness.cjs');
process.env.SIM_WK_VIEWPORT = '1';
const SZ = { iphone: [390, 844], se: [320, 568] };
const KOFI = 'https://ko-fi.com/fakeperson';
const FEED = [{ id: 'b1', user_id: 'other', first_name: 'Sam', city: 'Fulda', total_eur: 31.5, pay_url: KOFI, status: 'open', created_at: new Date().toISOString(),
    items: [{ n: 'Eggs', q: 2 }, { n: 'Greek yogurt', q: 4 }, { n: 'Cucumber', q: 3 }, { n: 'Spinach' }, { n: 'Halloumi' }, { n: 'Zucchini', q: 2 }, { n: 'Feta' }, { n: 'Nori' }, { n: 'Salmon' }] }];
(async () => {
    const where = process.argv[2] || '.', sizes = (process.argv[3] || 'iphone').split(','), langs = (process.argv[4] || 'en').split(','), engine = process.env.ENG || 'chromium';
    let pass = 0, fail = 0; const bad = [];
    for (const sz of sizes) for (const lang of langs) {
        const [w, h] = SZ[sz], tag = sz + '-' + lang + '-' + engine;
        const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } };
        if (/^https?:/.test(where)) o.url = where; else o.root = where;
        const R = await H.open(o), P = R.page, errs = [];
        P.on('pageerror', e => errs.push(String(e && e.message || e)));
        /* a finger tap after scrolling the thing into view, like a person on a small phone */
        const tapIn = async sel => { await P.evaluate(q => { const e = document.querySelector(q); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await H.sleep(350); await R.tap(sel); };
        const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 700))); };
        try {
            if (engine === 'chromium') await P.setViewportSize({ width: w, height: h });
            await R.ctx.addInitScript(a => { try { if (sessionStorage.getItem('cf-seeded')) return; sessionStorage.setItem('cf-seeded', '1');
                localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.storePicks.tab', 'shop');
                localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() }));
                localStorage.setItem('lowispike.weekshop.v1', JSON.stringify({ people: 2, nights: 7, budget: 40, store: 'lidl', setup: true, kit: ['hob', 'oven'] })); } catch (e) { } }, { l: lang });
            await R.ctx.addInitScript(feed => { window.__shares = []; window.__opened = []; window.__helped = [];
                const real = window.open; window.open = (u, t, f) => { window.__opened.push([String(u), t, f]); return null; };
                const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
                    window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => true, open: async () => feed, mine: async () => [], given: async () => [], trust: async () => [],
                        helped: async id => { window.__helped.push(id); return {}; }, help: async id => { window.__helped.push(id); return {}; },
                        share: async (row, id) => { window.__shares.push({ row, id }); return Object.assign({ id: 'fake-' + window.__shares.length, user_id: 'me', status: 'open', created_at: new Date().toISOString() }, row); } }; } }, 50); }, FEED);
            await R.goto(); await H.sleep(6000);

            /* 1 + 2: the week */
            await P.evaluate(() => LowiWeekBasket.open()); await H.sleep(1500);
            const wk = await P.evaluate(() => { const S = LowiWeekBasket._state(), c = LowiWeekBasket._ctx();
                return { sum: c && c.sum, budget: S.budget, nights: S.nights, plan: S.plan.length, over: (document.querySelector('.wb-over') || {}).innerText || '',
                    fewer: (document.querySelector('[data-wb="fewer"]') || {}).innerText || '', need: (document.querySelector('[data-wb="needbud"]') || {}).innerText || '' }; });
            ok('1 EUR 40 / 7 dinners: fits, or says plainly it can\'t with two ways out', wk.sum <= wk.budget || (!!wk.over && !!wk.fewer && !!wk.need), wk);
            if (wk.sum > wk.budget) { await tapIn('[data-wb="fewer"]'); await H.sleep(1200); }
            const wk2 = await P.evaluate(() => { const S = LowiWeekBasket._state(), c = LowiWeekBasket._ctx(); return { sum: c.sum, budget: S.budget, nights: S.nights, plan: S.plan.length, items: c.items.filter(i => !c.have[i.k]).map(i => [i.n, i.packs, Math.round((window.LowiStoreList.price(i, S.store) || 0) * 100) / 100]) }; });
            ok('2 the week is inside the budget now', wk2.sum <= wk2.budget && wk2.plan === wk2.nights && wk2.plan >= 1, { sum: wk2.sum, budget: wk2.budget, nights: wk2.nights });

            /* 3: list -> cart */
            await tapIn('[data-wb="view"][data-v="list"]'); await H.sleep(1000);
            await tapIn('[data-wb="list"]'); await H.sleep(1500);
            const cart = await P.evaluate(() => ({ lines: LOWI_SHELF.cartLines().map(l => [l.n, l.q, l.pe != null ? l.pe : l.p]), tot: LOWI_SHELF.cartTotal() }));
            if (process.env.DBG) console.log('DBG', JSON.stringify({ week: wk2.items, cart: cart.lines }));
            const want = wk2.items.reduce((a, x) => a + x[1], 0), got = cart.lines.reduce((a, l) => a + l[1], 0);
            /* a member-reported shop price (p) beats the week's estimate in the Cart; every estimate (pe) must be the week's own */
            const cl = await P.evaluate(() => LOWI_SHELF.cartLines().map(l => ({ n: l.n, q: l.q, p: l.p, pe: l.pe, line: l.line })));
            const estOk = wk2.items.every(w => { const l = cl.find(x => x.n === w[0]); return l && l.q === w[1] && (l.p != null || Math.abs(l.pe - w[2]) < 0.006); });
            const sumOk = Math.abs(cart.tot.sum - cl.reduce((a, l) => a + (l.line || 0), 0)) < 0.02;
            const realDiff = cl.filter(l => l.p != null).map(l => l.n);
            ok('3 the Cart has every pack of the week, each estimate as in the week, total = sum of the lines', cart.lines.length === wk2.items.length && got === want && estOk && sumOk && cart.tot.complete,
                { lines: cart.lines.length, items: wk2.items.length, packs: [got, want], cart: cart.tot.sum, week: wk2.sum, memberPrices: realDiff });
            await P.evaluate(() => { try { LowiWeekBasket.close && LowiWeekBasket.close(); } catch (e) {} document.querySelectorAll('.wb-ov').forEach(x => x.remove()); });

            /* 4: the cart sheet */
            await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
            await tapIn('.stp-card .stp-cartbtn'); await H.sleep(1200);
            const sh = await P.evaluate(() => { const q = s => document.querySelector(s); return { btns: [...document.querySelectorAll('.stp-cart-acts button')].map(b => b.dataset.stp),
                scan: /scan in the shop|im laden scannen|escanear en la tienda/i.test((q('.stp-cartv') || {}).innerText || ''), total: (q('.stp-cart-total b') || {}).textContent || '',
                lineSums: document.querySelectorAll('.stp-cart-line').length }; });
            ok('4 Cart: I\'ll buy it + Someone else pays, no Scan in the shop, a total, line sums for more than one', sh.btns.join() === 'mylist,giftcart' && !sh.scan && !!sh.total && sh.lineSums > 0, sh);

            /* 5: whole cart to Give a hand */
            await tapIn('.stp-cart-acts [data-stp="giftcart"]'); await H.sleep(2000);
            const g = await P.evaluate(() => { const st = LowiGiftBasket._state(); return { tab: st.tab, items: st.fromCartPick && st.fromCartPick.items, left: st.fromCartPick && st.fromCartPick.left, est: st.fromCartPick && st.fromCartPick.est,
                field: (document.querySelector('#gb-total') || {}).value, note: (document.querySelector('.gb-fromcart') || {}).innerText || '' }; });
                        /* the live server still takes 12 foods per basket until gift_baskets_open_cart_20261105.sql runs: then the rest is
               named, never silent, and the asked total is what goes in. With the open-cart limits everything goes in. */
            const gIn = (g.items || []).length, fullOnly = (g.left || []).every(x => x.why === 'full');
            const leftNamed = (g.left || []).every(x => g.note.indexOf(x.n) >= 0 || g.note.indexOf('…') >= 0);
            const inSum = await P.evaluate(([left, lg]) => { const fn = n => (window.LowiFoodNames && LowiFoodNames.name ? LowiFoodNames.name(n, lg) : n) || n;
                return LOWI_SHELF.cartLines().filter(l => !left.some(x => x.n === l.n || x.n === fn(l.n))).reduce((a, l) => a + (l.line || 0), 0); }, [g.left || [], lang]);
            ok('5a live rules (12 per basket): up to 12 go in, the rest named, total = what goes in, never EUR 5', g.tab === 'mine' && gIn === Math.min(12, cart.lines.length) && fullOnly && leftNamed && Math.abs(+g.field - inSum) < 0.02 && +g.field !== 5,
                { items: gIn, left: g.left, field: g.field, inSum: Math.round(inSum * 100) / 100, note: g.note.slice(0, 300) });
            await P.evaluate(() => { LowiGiftBasket._api.limits = async () => ({ any_food: true, max_items: 60 }); LowiGiftBasket.close(); }); await H.sleep(500);
            await P.evaluate(() => LowiGiftBasket.fromCart('shop')); await H.sleep(1500);
            const g2 = await P.evaluate(() => { const st = LowiGiftBasket._state(); return { items: st.fromCartPick && st.fromCartPick.items, left: st.fromCartPick && st.fromCartPick.left, field: (document.querySelector('#gb-total') || {}).value }; });
            const gq2 = (g2.items || []).reduce((a, x) => a + (x.q || 1), 0);
            ok('5b open-cart rules: every cart food with its quantity, total = the cart total', g2.items && g2.items.length === cart.lines.length && gq2 === got && !g2.left.length && Math.abs(+g2.field - cart.tot.sum) < 0.01,
                { items: g2.items && g2.items.length, packs: [gq2, got], field: g2.field, cart: cart.tot.sum });

            /* 6 + 7: the feed */
            await P.evaluate(() => { LowiGiftBasket.close(); }); await H.sleep(600);
            await P.evaluate(() => LowiGiftBasket.open('shop', 'give')); await H.sleep(2000);
            const f = await P.evaluate(() => { const c = document.querySelector('.gb-swipe'); if (!c) return null; const d = c.querySelector('.gb-more');
                return { shown: [...c.querySelectorAll(':scope > .gb-items li, .gb-items:not(.gb-more .gb-items) li')].filter(li => !li.closest('details') || li.closest('details').open).length, more: d ? d.querySelector('summary').textContent : '' }; });
            if (f && f.more) { await tapIn('.gb-swipe .gb-more summary'); await H.sleep(400); }
            const f2 = await P.evaluate(() => { const d = document.querySelector('.gb-swipe .gb-more'); return { open: !!(d && d.open), all: document.querySelectorAll('.gb-swipe .gb-items li').length }; });
            ok('6 the card previews 4 foods with "+ 5 more", tap shows all 9', f && f.shown === 4 && /5/.test(f.more) && f2.open && f2.all === 9, { f, f2 });
            const box = await P.locator('.gb-swipe').first().boundingBox();
            const y = box.y + Math.min(box.height / 2, 80), x0 = box.x + box.width * 0.3;
            await P.mouse.move(x0, y); await P.mouse.down();
            for (let i = 1; i <= 8; i++) { await P.mouse.move(x0 + i * 30, y); await H.sleep(16); }
            await P.mouse.up(); await H.sleep(900);
            const pay = await P.evaluate(() => ({ opened: window.__opened, helped: window.__helped, msg: (document.querySelector('.gb-pick-msg') || {}).textContent || '', picked: !!document.querySelector('.gb-swipe.gb-picked'),
                helpedBtn: !!document.querySelector('.gb-swipe .gb-helped') }));
            ok('7 swipe right opens exactly their Ko-fi page, says nothing is paid yet, marks nothing helped', pay.opened.length === 1 && pay.opened[0][0] === KOFI && /noopener/.test(pay.opened[0][2] || '') && pay.picked && /nothing is paid|bezahlt ist erst|no se paga/i.test(pay.msg) && !pay.helped.length, pay);
            ok('8 zero page errors', !errs.length, errs.slice(0, 3));
            if (process.env.SHOT) await P.screenshot({ path: process.env.SHOT.replace('%', tag) });
        } catch (e) { fail++; bad.push(tag + ' crashed'); console.log('FAIL ' + tag + ' crashed ' + String(e && e.stack || e).slice(0, 600)); }
        await R.close();
    }
    console.log('TOTAL pass ' + pass + ' fail ' + fail + (bad.length ? ' :: ' + bad.join(' | ') : ''));
    process.exit(fail ? 1 : 0);
})();
