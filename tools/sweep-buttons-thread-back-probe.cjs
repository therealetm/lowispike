/* Button sweep 10:20 (Oct 24) lead: Community room > tap a speech bubble (opens the conversation), then back / X.
   Prints the state after each step: still in the app? which layers are open? which tab?
   node tools/sweep-buttons-thread-back-probe.cjs [url|root] --engine chromium --mode back|x|esc|reset */
'use strict';
const H = require('./sim/harness.cjs');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const where = args[0] && !args[0].startsWith('--') ? args[0] : 'https://therealetm.github.io/lowispike/index.html';
const via = opt('via', 'bubble');
const engine = opt('engine', 'chromium'), mode = opt('mode', 'back'), lang = opt('lang', 'en');
(async () => {
    const o = { engine, lang, members: 12, messages: 30 }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (engine === 'chromium') { o.viewport = { width: 390, height: 844 }; o.dpr = 2; } else o.device = opt('device', 'iPhone 13');
    const R = await H.open(o); const P = R.page;
    P.on('framenavigated', f => { if (f === P.mainFrame()) console.log('NAV', f.url()); });
    await R.goto(); await H.sleep(7000);
    const st = async n => { const s = await P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 20 && r.height > 20 && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > .1; }; return { goTab: typeof window.goTab, hist: history.length, sec: document.documentElement.className.match(/\b(sec-[\w-]+|in-[\w-]+|comm[\w-]*)\b/g), layers: [...document.querySelectorAll('[aria-modal=true],dialog[open],.r2-ov.on,#sheetwrap.open,.cc-thread,.cm-thread,[class*=thread]')].filter(vis).map(e => e.id || String(e.className).slice(0, 40)).slice(0, 8), active: [...document.querySelectorAll('.tab-panel.active,section.active,[data-tab].on')].map(e => e.id || e.dataset.tab).slice(0, 4) }; }).catch(e => ({ dead: e.message.slice(0, 60) })); console.log(n, P.url().replace(/^.*\//, ''), JSON.stringify(s)); return s; };
    await st('BOOT');
    await P.evaluate(() => goTab('foryou')); await H.sleep(3000); await st('COMMUNITY');
    const pt = await P.evaluate(via => { const b = [...document.querySelectorAll(via === 'chat' ? '.rm-tab' : '.cg-bub')].filter(b => via !== 'chat' || /^(chat)$/i.test(b.textContent.trim())).find(b => { const r = b.getBoundingClientRect(); return r.width > 6 && r.top > (via === 'chat' ? 0 : 60) && r.top < innerHeight - 60; }); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: b.getAttribute('aria-label') || b.textContent }; }, via);
    console.log('BUBBLE', JSON.stringify(pt)); if (!pt) process.exit(0);
    await P.touchscreen.tap(pt.x, pt.y); await H.sleep(2500); await st('THREAD');
    for (let i = 1; i <= 3; i++) {
        if (mode === 'back') await P.evaluate(() => history.back());
        else if (mode === 'esc') await P.keyboard.press('Escape');
        else if (mode === 'reset') await P.evaluate(() => { for (let i = 0; i < 3; i++) { try { LowiBackSwipe.escape(); } catch (e) { } } try { LowiR2.closeAll(); } catch (e) { } try { LowiSections.close(); } catch (e) { } try { goTab('home'); } catch (e) { } });
        else { const x = await P.evaluate(() => { const c = [...document.querySelectorAll('button,[role=button]')].filter(b => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.width > 6 && (t === b || b.contains(t)) && (/^(close|back|zur|schlie|cerrar|volver)/i.test(b.getAttribute('aria-label') || '') || /^[\u00d7\u2715\u2039<]$/.test((b.textContent || '').trim())); }); const b = c.pop(); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: b.getAttribute('aria-label') || b.className }; }); console.log('X', JSON.stringify(x)); if (x) await P.touchscreen.tap(x.x, x.y); }
        await H.sleep(2000); const s = await st(mode.toUpperCase() + ' ' + i); if (s.dead || s.goTab !== 'function') break;
    }
    console.log('LOADS', R.loads, 'CRASHED', R.crashed, 'ERRS', JSON.stringify(R.errs.map(e => e.m.slice(0, 140)).slice(0, 6)));
    await R.close().catch(() => { }); process.exit(0);
})();
