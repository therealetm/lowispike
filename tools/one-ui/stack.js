/* stacked-sheet check (22 Oct 2026, Forms backdrop fix). Emmanuel's iPhone: opening a door in Misty's sheet (Glow: Aura / Growth /
   Discovered, or Forms) drew the new sheet on top of Misty's sheet and Misty's rows showed through it ("Misty" twice, Food journal,
   Misty's energy, Star cell XP readable through the panel). For every sub-sheet opened from Misty's sheet or the profile hub this
   measures: the sheet under it is hidden (or fully covered by an opaque layer), the top sheet's own surface is opaque, and closing
   it brings the sheet underneath back cleanly.
   node tools/community-settings/probe.cjs --script tools/one-ui/stack.js --views se,i13,i15,px7 */
const theme = async m => { await page.evaluate(m => { localStorage.setItem('lowi.theme', m); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme(m); else document.documentElement.setAttribute('data-theme', m); }, m); await sleep(500); };
const closeAll = async () => { await page.evaluate(() => { try { window.LowiCompanion && LowiCompanion.close(); } catch (e) { } try { window.LowiCommunityMe && LowiCommunityMe.close(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } try { if (typeof goTab === 'function') goTab('home'); } catch (e) { } }); await sleep(700); for (let i = 0; i < 40; i++) { if (!(await page.evaluate(() => document.querySelectorAll('.r2-ov, .cf-ov').length))) break; await sleep(250); } };
/* is any text of the sheet below readable through the top layer? hit-test the centre of every text node of the lower sheet that
   lies inside the top layer's box: it must not be visible (visibility / opacity), or the top layer's surface must be opaque */
const probe = () => page.evaluate(() => {
    const alpha = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
    const shown = el => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) return false; } return true; };
    const ovs = [...document.querySelectorAll('.r2-ov.on:not(.off), .cf-ov')].filter(o => o.isConnected && getComputedStyle(o).display !== 'none');
    if (ovs.length < 2) return { n: ovs.length };
    const top = ovs[ovs.length - 1], lower = ovs.slice(0, -1);
    const panel = top.querySelector('.r2-sh, .cf-panel') || top, pr = panel.getBoundingClientRect(), ps = getComputedStyle(panel);
    const leaks = [];
    lower.forEach(o => o.querySelectorAll('h2, b, small, p, span').forEach(n => {
        if (!n.textContent.trim() || n.children.length > 2) return; const r = n.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < pr.left || cx > pr.right || cy < pr.top || cy > pr.bottom) return;
        if (shown(n)) leaks.push(n.textContent.trim().slice(0, 28));
    }));
    /* the top surface must be opaque: a solid colour, or a background image whose last layer is a solid gradient */
    const layers = ps.backgroundImage.split(/,\s*(?=(?:linear|radial|repeating)-gradient)/);
    const last = layers[layers.length - 1] || '';
    const stops = (last.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || []);
    const solidImg = last !== 'none' && stops.length > 0 && stops.every(c => alpha(c) >= 0.99);
    return { n: ovs.length, top: top.className.slice(0, 60), bg: ps.backgroundColor, opaque: alpha(ps.backgroundColor) >= 0.99 || solidImg, color: ps.color, leaks: [...new Set(leaks)].slice(0, 8) };
});
const hubShown = () => page.evaluate(() => { const h = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); if (!h) return false; const ov = h.closest('.r2-ov'); const s = getComputedStyle(ov); const r = h.getBoundingClientRect(); return s.visibility !== 'hidden' && getComputedStyle(h).visibility !== 'hidden' && parseFloat(s.opacity) > .5 && r.height > 50; });
const nOv = () => page.evaluate(() => [...document.querySelectorAll('.r2-ov:not(.off), .cf-ov')].length);
/* the machine can be busy: wait for states, not fixed times */
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 15000)) { try { if (await fn()) return true; } catch (e) { } await sleep(250); } return false; };
const openHub = async () => { for (let i = 0; i < 3; i++) { await page.evaluate(() => window.LowiMistyHub.open()); if (await until(() => page.evaluate(() => { const h = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); return !!(h && h.closest('.r2-ov.on')); }), 8000)) { await sleep(700); return true; } } return false; };
const door = async k => { for (let i = 0; i < 3; i++) { await page.evaluate(k => { const b = [...document.querySelectorAll('#mistyHub [data-mh="' + k + '"]')].filter(e => !e.closest('.r2-ov.off')).pop(); b && b.click(); }, k); if (await until(async () => (await nOv()) >= 2, 6000)) { await sleep(900); return; } } };
const check = (tag, p) => {
    console.log('[cs] ' + tag + ' ' + JSON.stringify(p));
    if (!p || p.n < 2) { fail(tag + ': sub-sheet did not open on top (' + (p && p.n) + ')'); return; }
    if (p.leaks.length) fail(tag + ': text under it shows through: ' + p.leaks.join(' | '));
    if (!p.opaque) fail(tag + ': its own surface is see-through');
};
for (const [m, lg] of [['light', 'en'], ['dark', 'de']]) {
    await theme(m); await page.evaluate(l => { try { window.LowiLang.set(l); } catch (e) { } }, lg); await sleep(400);
    for (const k of ['glow', 'forms']) {
        await closeAll();
        if (!(await openHub())) { fail(m + ' ' + k + ': Misty\'s sheet did not open'); continue; }
        await door(k);
        check(m + ' ' + k, await probe()); await shot(m + '-' + k);
        /* light text on the dark glass: no dark text unless it sits on a light fill (selected tab, primary button) */
        const dark = await page.evaluate(() => { const ov = [...document.querySelectorAll('.r2-ov:not(.off), .cf-ov')].pop(); const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g); if (!m) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
            const fillLight = n => { for (let e = n; e && e !== ov; e = e.parentElement) { const s = getComputedStyle(e); const a = (s.backgroundColor.match(/[\d.]+/g) || []); const al = a.length > 3 ? +a[3] : (a.length ? 1 : 0); if ((al > .5 && lum(s.backgroundColor) > .5) || /gradient/.test(s.backgroundImage) && e.matches('button, .wh-ms-pri, [class*=pri]')) return true; } return false; };
            return [...ov.querySelectorAll('b, small, p, span, h2, h3, button')].filter(n => { const r = n.getBoundingClientRect(); return r.width > 4 && r.height > 4 && n.textContent.trim() && n.children.length === 0 && getComputedStyle(n).visibility !== 'hidden' && lum(getComputedStyle(n).color) < .35 && !fillLight(n); }).map(n => n.textContent.trim().slice(0, 20)).slice(0, 6); });
        if (dark.length) fail(m + ' ' + k + ': dark text on the dark glass: ' + dark.join(' | '));
        /* close the top sheet only: Misty's sheet must come back */
        await page.evaluate(() => { const cf = document.querySelector('.cf-ov'); if (cf && window.LowiCompanion) { LowiCompanion.close(); return; } const o = [...document.querySelectorAll('.r2-ov.on:not(.off)')].pop(); if (o && LowiR2.close) LowiR2.close(o); });
        await until(hubShown, 8000);
        if (!(await hubShown())) fail(m + ' ' + k + ': Misty\'s sheet is not back after closing'); await shot(m + '-' + k + '-back');
    }
    /* the profile hub: every door that leaves a sheet stacked on the hub must hide the hub the same way */
    for (const id of ['me', 'body', 'weight', 'look', 'account']) {
        await closeAll();
        await page.evaluate(() => window.LowiCommunityMe.open()); await until(() => page.evaluate(() => !!document.querySelector('#cmeSheet [data-cme]')), 8000); await sleep(600);
        const ok = await page.evaluate(id => { const b = document.querySelector('#cmeSheet [data-cme="' + id + '"]'); if (!b) return false; b.click(); return true; }, id);
        if (!ok) { console.log('[cs] ' + m + ' hub ' + id + ' (no door)'); continue; }
        await sleep(2500);
        const p = await probe();
        console.log('[cs] ' + m + ' hub ' + id + ' ' + JSON.stringify(p));
        if (p && p.n >= 2 && p.leaks.length) fail(m + ' hub ' + id + ': text under it shows through: ' + p.leaks.join(' | '));
        if (p && p.n >= 2) await shot(m + '-hub-' + id);
    }
    await closeAll();
}
await closeAll();
