/* Shared steps for the parallel regression workers (task 29188430, 20 Oct 2026). The way a player gets there, with a
   programmatic fallback that is logged (a fallback is itself a finding when the visible path failed). */
'use strict';
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const within = (p, ms, what, log) => { let tm; return Promise.race([p, new Promise(r => { tm = setTimeout(() => { (log || console.log)('NO ANSWER in ' + ms / 1000 + ' s: ' + what); r('__timeout'); }, ms); })]).finally(() => clearTimeout(tm)); };

function logger(name) {
    const out = path.join(__dirname, 'out', name + '.log');
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, '');
    const t0 = Date.now();
    const log = (...a) => { const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); fs.appendFileSync(out, s + '\n'); console.log('[' + name + ']', s); };
    return log;
}

const tab = R => R.page.evaluate(() => { try { return (window.LowiHost && LowiHost.tab && LowiHost.tab()) || (typeof TAB !== 'undefined' ? TAB : '?'); } catch (e) { return '?'; } }).catch(() => '?');

/* Home -> Settings bubble -> Community row (the path Emmanuel uses with the menu bar off) */
async function openCommunity(R, log) {
    const p = R.page;
    try {
        if (await tab(R) !== 'home') await goHome(R, log);
        /* the ring bubbles float all the time (living-bubbles), so Playwright's 'stable' wait never passes: tap like a finger */
        await p.locator('.o8-settings').first().click({ timeout: 6000, force: true });
        await p.locator('[data-ss2="community"]').first().waitFor({ state: 'visible', timeout: 6000 });
        await p.locator('[data-ss2="community"]').first().click({ timeout: 6000, force: true });
    } catch (e) {
        log && log('FALLBACK openCommunity: visible path failed: ' + String(e.message).split('\n')[0] + ' | settings bubble ' + JSON.stringify(await hitTest(R, '.o8-settings')) + ' | community row ' + JSON.stringify(await hitTest(R, '[data-ss2="community"]')));
        await p.evaluate(() => window.goTab && goTab('foryou')).catch(() => { });
    }
    await p.waitForFunction(() => { const i = document.getElementById('cmInput'); return i && i.getBoundingClientRect().width > 20; }, null, { timeout: 15000 }).catch(() => log && log('composer never showed after opening Community'));
    await sleep(600);
}

async function goHome(R, log) {
    const p = R.page;
    const ok = await p.evaluate(() => { const b = document.querySelector('#tabbar .tb[data-tab="home"]'); if (b && b.getBoundingClientRect().width > 0 && getComputedStyle(b).visibility !== 'hidden') { b.click(); return 'tabbar'; } if (window.goTab) { goTab('home'); return 'goTab'; } return 'none'; }).catch(() => 'err');
    await sleep(700);
    return ok;
}

/* fake page hide / show (iOS app switcher, lock screen): document.hidden flips, visibilitychange + pagehide/pageshow fire */
const hideShow = (R, ms) => R.page.evaluate(async (ms) => {
    const set = h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => h ? 'hidden' : 'visible' }); };
    set(true); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    await new Promise(r => setTimeout(r, ms));
    set(false); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
}, ms || 1500).catch(e => 'err ' + e.message);

/* the topmost element at the centre of a node: is it reachable, or is something sitting on it? */
const hitTest = (R, sel) => R.page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return { sel, missing: true };
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return { sel, hidden: true };
    const x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    const d = t => t ? (t.tagName.toLowerCase() + (t.id ? '#' + t.id : '') + (t.className && typeof t.className === 'string' ? '.' + t.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) : null;
    return { sel, ok: !!top && (top === el || el.contains(top) || top.contains(el) && false), top: d(top), x: Math.round(x), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height), inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, vh: innerHeight };
}, sel).catch(e => ({ sel, err: e.message }));

const overlays = R => R.page.evaluate(() => {
    const q = '.sheet.open,.lw-sheet,.o8-sheet,.ss2-panel,.cs-overlay,.cg-photo,[aria-modal="true"],.r2-sheet,.r2-ov,dialog[open]';
    return [...document.querySelectorAll(q)].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 10 && r.height > 10 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05; }).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).trim().split(/\s+/).slice(0, 2).join('.'));
}).catch(() => ['?']);

module.exports = { sleep, within, logger, tab, openCommunity, goHome, hideShow, hitTest, overlays };
