/* tools/tutorial-new/probe.cjs (Nov 5 2026): what the current app really shows, for writing the new tutorial. Read-only, local server,
   simulated iPhone 13. node tools/tutorial-new/probe.cjs [lang] */
const H = require('../tutorial-short/harness.cjs');
const lang = process.argv[2] || 'de';
(async () => {
    const srv = await H.serve(); const br = await H.pw.chromium.launch();
    const { ctx, page } = await H.newPage(br, 'iPhone 13', lang);
    await H.boot(page, srv.url);
    const txt = el => el ? (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 120) : null;
    const out = {};
    out.ring = await page.evaluate(() => [...document.querySelectorAll('#whHud [class*="wh-"], #whHud [class*="o8-"], [data-orbit]')].filter(e => e.getBoundingClientRect().width > 10).map(e => (e.className.baseVal || e.className) + ' | ' + (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').slice(0, 50)).slice(0, 30));
    out.doors = await page.evaluate(() => window.LowiStorePicks && LowiStorePicks.doors().map(d => d.id + ':' + d.label + ' (' + (d.sub || '') + ')'));
    await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await H.sleep(2500);
    out.community = await page.evaluate(() => ({ tab: (document.querySelector('.tab.active, [id^="tab-"].active') || {}).id, bar: [...document.querySelectorAll('.rm-tab, .cm-tab, [role=tab]')].filter(e => e.getBoundingClientRect().width > 4).map(e => (e.dataset.rm || e.dataset.tab || '') + ':' + (e.innerText || '').trim()).slice(0, 12), name: (document.querySelector('.rm-menu-btn') || {}).innerText, nameVis: (() => { const e = document.querySelector('.rm-menu-btn'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); })() }));
    await page.screenshot({ path: '/tmp/tn-community.png' });
    out.settingsOpen = await page.evaluate(() => { try { return LowiCommunityMe.open(); } catch (e) { return String(e); } }); await H.sleep(1500);
    out.settings = await page.evaluate(() => [...document.querySelectorAll('.cme-ov [data-id], .cme-ov button, .cme-ov h2, .cme-ov h3')].filter(e => e.getBoundingClientRect().height > 2).map(e => (e.dataset.id || e.tagName) + ':' + (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60)).slice(0, 50));
    await page.screenshot({ path: '/tmp/tn-settings.png' });
    await page.evaluate(() => { try { LowiCommunityMe.close(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(1500);
    out.shop = await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); const o = {}; for (const t of ['shop', 'sz']) { LowiStorePicks.openAt(t); await w(1500); const c = document.querySelector('.stp-card'); o[t] = c ? c.innerText.replace(/\s+/g, ' ').slice(0, 400) : null; } LowiStorePicks.close(); await w(800); return o; });
    out.gift = await page.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); try { LowiStorePicks.openAt('gift'); } catch (e) { return String(e); } await w(2000); const d = [...document.querySelectorAll('[aria-modal="true"], .gb-ov, .stp-card')].filter(e => e.getBoundingClientRect().height > 50).map(e => (e.className || '') + ' :: ' + e.innerText.replace(/\s+/g, ' ').slice(0, 300)); return d; });
    await page.screenshot({ path: '/tmp/tn-gift.png' });
    out.errs = page.errs.slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await ctx.close(); await br.close(); srv.s.close();
})();
