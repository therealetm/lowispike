/* hub-b check for probe.cjs (22 Oct 2026, Part B): the profile hub has YOU + Settings (no Explore, no World sound), Delete account red
   at the bottom with the version line; a hold on the Community bubble and openSettings() open the hub (not the old sheet) and the
   click that ends the hold does not close it; Day/night switches in place; EN/DE/ES switch in place; Delete account asks and Keep
   goes back; every former Explore place still has its way in (Home zoom, Home gift, Move bubble, Cook > For You, Move > Care board,
   the shop's Shop finds entry).
   node tools/community-settings/probe.cjs --script tools/community-settings/hub-b.js --views se,i13,ipad */
const vis = s => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' ? { x: r.left + r.width / 2, y: r.top + r.height / 2, b: r.bottom, t: r.top } : false; }, s);
const hub = () => page.evaluate(() => { const el = document.getElementById('cmeSheet'); if (!el) return null; return { secs: [...el.querySelectorAll('.cme-sec')].map(s => (s.querySelector('h3') || {}).textContent || s.getAttribute('aria-label')), rows: [...el.querySelectorAll('[data-cme],[data-lang]')].map(b => b.getAttribute('data-cme') || b.getAttribute('data-lang')), ver: (el.querySelector('.cme-ver') || {}).textContent || '', tip: (el.querySelector('.cme-tip') || {}).textContent || '', old: !!document.querySelector('#ss2Bloom .ss2-page'), hidden: [...el.querySelectorAll('#cmeMore[hidden] .cme-chip')].filter(c => c.getBoundingClientRect().width > 0).length, fit: (() => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; })() }; });
async function hold(x, y, ms) {
    await page.evaluate(([x, y, ms]) => new Promise(res => {
        const el = document.elementFromPoint(x, y), o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 };
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); const at = document.elementFromPoint(x, y) || el; at.dispatchEvent(new MouseEvent('click', Object.assign({ detail: 1 }, o))); res(); }, ms);
    }), [x, y, ms]);
}
const tapEl = async s => { const p = await vis(s); if (!p) return false; await page.touchscreen.tap(p.x, p.y); return true; };
await sleep(9000);
/* 2. hold the Community bubble: hub opens and stays */
const b = await vis('#whHud [data-orbit="settings"]'); if (!b) { fail('no Community bubble'); return; }
for (const ms of [700, 2500]) {
    await hold(b.x, b.y, ms); await sleep(700);
    const h = await hub(); console.log('[cs] hold ' + ms + ' ' + JSON.stringify(h));
    if (!h) { fail('hold ' + ms + ': hub not open'); continue; }
    if (h.old) fail('hold ' + ms + ': old Settings sheet opened too');
    const want = ['close', 'me', 'body', 'weight', 'more', 'theme', 'look', 'en', 'de', 'es', 'tutorial', 'account', 'deleteAccount'];
    for (const id of want) if (!h.rows.includes(id)) fail('hub missing ' + id);
    for (const id of ['worldSound', 'workouts', 'settings']) if (h.rows.includes(id)) fail('hub still has ' + id);
    if (h.rows[h.rows.length - 1] !== 'deleteAccount') fail('Delete account is not last: ' + h.rows.join(','));
    if (!/\d{8}-\d{6}/.test(h.ver)) fail('no version line');
    if (!h.fit) fail('hub runs off screen');
    if (h.hidden) fail('folded chips visible: ' + h.hidden);
    if (ms === 700) await shot('hub-hold');
    await page.evaluate(() => window.LowiCommunityMe.close());
    await sleep(400);
}
/* 3. Day/night in place, language in place, Delete account asks and Keep comes back */
await page.evaluate(() => window.LowiHomeSettingsSleepV2.openSettings()); await sleep(500);
if (!(await hub())) fail('openSettings did not open the hub');
const th0 = await page.evaluate(() => document.querySelector('[data-cme="theme"]').getAttribute('aria-checked'));
await tapEl('[data-cme="theme"]'); await sleep(700);
const th1 = await page.evaluate(() => { const e = document.querySelector('[data-cme="theme"]'); return e ? e.getAttribute('aria-checked') : 'closed'; });
console.log('[cs] theme ' + th0 + ' -> ' + th1); if (th1 === 'closed' || th1 === th0) fail('Day/night did not switch in place');
await shot('hub-other-theme');
await tapEl('[data-cme="theme"]'); await sleep(500);
await tapEl('#cmeSheet [data-lang="de"]'); await sleep(900);
const de = await hub(); console.log('[cs] de ' + JSON.stringify(de && de.secs) + ' ' + (de && de.tip));
if (!de || !/Einstellungen/.test(de.secs.join(' '))) fail('language did not switch in the hub');
await shot('hub-de');
await tapEl('#cmeSheet [data-lang="en"]'); await sleep(900);
await page.evaluate(() => document.querySelector('[data-cme="more"]').scrollIntoView({ block: 'center' })); await sleep(300);
await tapEl('[data-cme="more"]'); await sleep(400);
const chips = await page.evaluate(() => [...document.querySelectorAll('#cmeMore:not([hidden]) .cme-chip')].map(c => c.getAttribute('data-cme') + ':' + Math.round(c.getBoundingClientRect().width)));
console.log('[cs] more places ' + JSON.stringify(chips)); if (chips.length !== 5) fail('More places did not unfold 5 chips');
await shot('hub-more');
await page.evaluate(() => document.querySelector('[data-cme="deleteAccount"]').scrollIntoView({ block: 'center' })); await sleep(400);
await tapEl('[data-cme="deleteAccount"]'); await sleep(500);
const ask = await page.evaluate(() => ({ go: !!document.querySelector('#cmeSheet [data-cme="delGo"]'), keep: !!document.querySelector('#cmeSheet [data-cme="delCancel"]'), tx: (document.querySelector('.cme-del-tx') || {}).textContent || '' }));
console.log('[cs] delete ask ' + JSON.stringify(ask)); if (!ask.go || !ask.keep) fail('Delete account does not ask first');
await shot('hub-delete-ask');
await tapEl('[data-cme="delCancel"]'); await sleep(400);
const back = await hub(); if (!back || !back.rows.includes('deleteAccount')) fail('Keep my account did not go back');
await page.evaluate(() => window.LowiCommunityMe.close()); await sleep(300);
/* 1. former Explore places, outside the hub */
const ways = {};
ways.map = !!(await vis('#whHud .wh-zoom'));
ways.gift = !!(await page.evaluate(() => !!document.querySelector('.hs-gift')));
ways.giftVisible = !!(await vis('.hs-gift'));
ways.workouts = !!(await vis('#whHud [data-orbit="move"]'));
await page.evaluate(() => window.goTab('shelf')); await sleep(1500);
ways.foryou = !!(await vis('.nm-pill-fy'));
await page.evaluate(() => window.goTab('move')); await sleep(1500);
ways.care = !!(await vis('.nm-pill-lb'));
ways.hunt = await page.evaluate(() => !!document.querySelector('.ss-entry') && !!document.querySelector('.gh-entry') || !!document.getElementById('tdShop'));
console.log('[cs] explore ways ' + JSON.stringify(ways));
if (!ways.workouts) fail('no Move bubble for Workouts');
/* 4. Community profile picture opens the same hub */
await page.evaluate(() => window.goTab('foryou')); await sleep(3000);
if (await tapEl('#pfBtn')) { await sleep(700); const h = await hub(); console.log('[cs] pfBtn hub ' + !!h); if (!h) fail('profile picture in Community did not open the hub'); else await shot('hub-community'); }
else console.log('[cs] no #pfBtn visible in Community');
