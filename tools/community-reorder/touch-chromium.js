/* real touch through CDP (chromium): hold aff, drag to first, release */
const T0 = Date.now(); const lg = m => console.log('[cs] ' + ((Date.now() - T0) / 1000).toFixed(1) + ' ' + m);
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
await page.evaluate(() => goTab('foryou'));
await sleep(3000);
const box = async id => page.evaluate(id => { const r = document.querySelector('#cmPaneChat .rm-tab[data-rm="' + id + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);
const st = () => page.evaluate(() => JSON.stringify({ o: [...document.querySelectorAll('.rm-tab')].map(x => x.dataset.rm + (x.getAttribute('aria-selected') === 'true' ? '*' : '')).join(','), c: document.querySelector('.rm-tabs').className, s: localStorage.getItem('lowispike.community.tabs'), sy: scrollY }));
await page.evaluate(() => { window.addEventListener('error', e => { window.__ev['ERR ' + e.message] = 1; }); window.__ev = {}; ['pointerdown','pointermove','pointerup','pointercancel','touchmove','touchend','touchcancel','contextmenu','lostpointercapture','gotpointercapture'].forEach(n => window.addEventListener(n, e => { const k = n + '@' + (e.target && e.target.className || e.target.nodeName) + (n==='pointermove'?':'+Math.round(e.clientX)+':'+e.pointerId:''); window.__ev[k] = (window.__ev[k] || 0) + 1; }, true)); });
/* 1: a quick swipe (scroll) over the tabs never lifts */
let b = await box('chat');
await touch('touchStart', b.x, b.y); for (let i = 1; i <= 6; i++) { await touch('touchMove', b.x, b.y + i * 12); await sleep(30); } await touch('touchEnd'); await sleep(700);
lg('swipe ' + await st());
/* 2: plain tap */
await touch('touchStart', b.x, b.y); await sleep(60); await touch('touchEnd'); await sleep(700);
lg('tap ' + await st());
/* 3: hold + drag */
b = await box('aff'); const f = await box('room');
await touch('touchStart', b.x, b.y); await sleep(800);
lg('held ' + await st()); await page.evaluate(() => { window.__ev = {}; const t = document.querySelector('.rm-tabs'); t.addEventListener('pointermove', e => { window.__ev['T:' + e.pointerId + ':' + JSON.stringify(LowiCommunityTabs._drag())] = 1; }); });
for (let i = 1; i <= 10; i++) { await touch('touchMove', b.x - (b.x - f.x + 12) * i / 10, b.y + (i % 2)); await sleep(40); }
await sleep(300);
lg('dragging ' + await st());
await shot('B-reorder-in-progress');
await touch('touchEnd'); await sleep(800);
lg('dropped ' + await st());
lg('ev ' + await page.evaluate(() => JSON.stringify(window.__ev)));
await page.evaluate(() => goTab('today')); await sleep(1500);
await page.evaluate(() => goTab('foryou')); await sleep(2500);
lg('reopen ' + await st());
await shot('C-reopen');
