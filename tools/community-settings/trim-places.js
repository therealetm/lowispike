/* trim-places check for probe.cjs (22 Oct 2026, Emmanuel: "Remove the entire 'More places' section from the Community long-press
   menu, including all its entries"). The hub has no More places row and no chips (EN/DE, Day and Night); its rows still work
   (Day/night in place, Delete account asks, Keep goes back); For You still opens from Cook and the Care board from Move.
   node tools/community-settings/probe.cjs --script tools/community-settings/trim-places.js --views se,i13,i15,px7,ipad */
const vis = s => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, s);
const tapEl = async s => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, s); await sleep(350); const p = await vis(s); if (!p) return false; await page.touchscreen.tap(p.x, p.y); return true; };
const hub = () => page.evaluate(() => { const el = document.getElementById('cmeSheet'); if (!el || !el.offsetParent && getComputedStyle(el).position !== 'fixed') return null; const r = el.getBoundingClientRect(); return { rows: [...el.querySelectorAll('[data-cme],[data-lang]')].map(b => b.getAttribute('data-cme') || b.getAttribute('data-lang')), more: !!el.querySelector('[data-cme="more"],.cme-more,.cme-chip,#cmeMore'), txt: /More places|Weitere Orte|M\u00e1s lugares/.test(el.textContent), inView: r.left >= -1 && r.right <= innerWidth + 1, theme: document.documentElement.getAttribute('data-theme') || 'dark' }; });
await sleep(9000);
await page.evaluate(() => window.LowiHomeSettingsSleepV2.openSettings()); await sleep(800);
let h = await hub(); console.log('[cs] hub ' + JSON.stringify(h));
if (!h) { fail('hub did not open'); return; }
if (h.more || h.txt) fail('More places still in the hub');
for (const id of ['foryou', 'care', 'map', 'gift', 'hunt']) if (h.rows.includes(id)) fail('hub still lists ' + id);
for (const id of ['me', 'body', 'weight', 'theme', 'look', 'en', 'de', 'es', 'tutorial', 'account', 'deleteAccount']) if (!h.rows.includes(id)) fail('hub lost ' + id);
if (!h.inView) fail('hub wider than the screen');
await shot('hub-' + h.theme);
const th0 = await page.evaluate(() => document.querySelector('[data-cme="theme"]').getAttribute('aria-checked'));
await tapEl('#cmeSheet [data-cme="theme"]'); await sleep(800);
const th1 = await page.evaluate(() => { const e = document.querySelector('#cmeSheet [data-cme="theme"]'); return e ? e.getAttribute('aria-checked') : 'closed'; });
h = await hub(); console.log('[cs] theme ' + th0 + ' -> ' + th1 + ' ' + JSON.stringify(h && { more: h.more, theme: h.theme }));
if (th1 === 'closed' || th1 === th0) fail('Day/night did not switch in place');
if (h && (h.more || h.txt)) fail('More places back after Day/night');
await page.evaluate(() => { const b = document.querySelector('#cmeSheet .cme-body') || document.getElementById('cmeSheet'); b.scrollTop = 0; }); await sleep(200);
await shot('hub-' + (h && h.theme));
await tapEl('#cmeSheet [data-cme="theme"]'); await sleep(600);
await tapEl('#cmeSheet [data-lang="de"]'); await sleep(900);
h = await hub(); console.log('[cs] de ' + JSON.stringify(h && { more: h.more, txt: h.txt })); if (h && (h.more || h.txt)) fail('More places in DE');
await shot('hub-de');
await tapEl('#cmeSheet [data-lang="en"]'); await sleep(900);
await tapEl('#cmeSheet [data-cme="deleteAccount"]'); await sleep(600);
const ask = await page.evaluate(() => ({ go: !!document.querySelector('#cmeSheet [data-cme="delGo"]'), keep: !!document.querySelector('#cmeSheet [data-cme="delCancel"]') }));
console.log('[cs] delete ask ' + JSON.stringify(ask)); if (!ask.go || !ask.keep) fail('Delete account does not ask first');
await tapEl('#cmeSheet [data-cme="delCancel"]'); await sleep(500);
h = await hub(); if (!h || !h.rows.includes('deleteAccount')) fail('Keep my account did not go back');
await page.evaluate(() => window.LowiCommunityMe.close()); await sleep(400);
/* the kept destinations */
await page.evaluate(() => window.goTab('shelf')); await sleep(1800);
const fy = await tapEl('.ck-fy'); await sleep(1500);
const fyOpen = !!(await vis('#cmPaneFeed'));
console.log('[cs] cook for you ' + fy + ' open ' + fyOpen); if (!fy || !fyOpen) fail('For You does not open from Cook');
await shot('cook-foryou');
await page.evaluate(() => window.goTab('home')); await sleep(1200); await page.evaluate(() => window.goTab('move')); await sleep(4000);
const lb = await tapEl('.nm-lbcard'); await sleep(1500);
const lbOpen = !!(await vis('#cmPaneBoard'));
console.log('[cs] move care board ' + lb + ' open ' + lbOpen); if (!lb || !lbOpen) fail('Care board does not open from Move');
await shot('move-care');
