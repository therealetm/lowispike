/* Live diagnostic: open a person card as a fresh (test-marked) account and report what sits on top of its buttons.
   node tools/community-remove/diag-tap.cjs <engine> <url>   prints IDS <uid> for cleanup.sh */
const H = require('../sim/harness.cjs');
const engine = process.argv[2] || 'chromium', url = process.argv[3] || 'https://therealetm.github.io/lowispike/';
(async () => {
    const R = await H.open({ engine, lang: 'de', url, name: 'CR Test', fresh: true, cloud: false });
    const P = R.page;
    try {
        await R.goto(); await H.sleep(9000);
        await P.waitForFunction(() => { try { const s = LOWI_CLOUD_X.state(); return s && s.uid && s.live; } catch (e) { return false; } }, null, { timeout: 90000 }).catch(() => { });
        const me = await P.evaluate(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } });
        console.log('IDS ' + me);
        await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
        const rep = async label => console.log(label + ' ' + JSON.stringify(await P.evaluate(() => {
            const d = el => { const p = []; for (let i = 0; el && i < 3; i++, el = el.parentElement) p.push(el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).slice(0, 30)); return p.join(' < '); };
            const card = document.querySelector('.cp-card'); const o = { html: document.documentElement.className.slice(0, 200), activeTab: [...document.querySelectorAll('.tab.active,[id^=tab-].active')].map(x => x.id).join(','), card: !!card };
            if (!card) return o;
            const chain = []; for (let el = card; el && el !== document.body; el = el.parentElement) { const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || cs.pointerEvents === 'none' || cs.display === 'none' || +cs.opacity < 1 || cs.transform !== 'none') chain.push(d(el).split(' < ')[0] + ' vis=' + cs.visibility + ' pe=' + cs.pointerEvents + ' op=' + cs.opacity + ' tf=' + cs.transform.slice(0, 40) + ' z=' + cs.zIndex); }
            o.chain = chain;
            const btns = [...card.querySelectorAll('button')].slice(-4).map(b => { const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; const st = y > 0 && y < innerHeight ? document.elementsFromPoint(x, y).slice(0, 4).map(d1 => d1.tagName + (d1.id ? '#' + d1.id : '') + '.' + String(d1.className).slice(0, 25)) : ['offscreen']; return { t: b.textContent.trim().slice(0, 24), y: Math.round(r.top), h: Math.round(r.height), stack: st }; });
            o.btns = btns; return o;
        })));
        await P.evaluate(() => window.goTab('foryou')); await H.sleep(2000);
        await rep('TAB');
        await P.evaluate(() => LowiCommunity.openProfile('83077af7-8475-4628-9328-25bd335db240', 'eman'));
        await P.waitForSelector('.cp-card', { timeout: 20000 }).catch(() => { }); await H.sleep(2500);
        await rep('CARD');
        await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot', 'gate-up'); }); await H.sleep(400);
        await rep('UNGATED');
        console.log('RULES ' + JSON.stringify(await P.evaluate(() => { const out = []; const ov = document.querySelector('.cp-card') && document.querySelector('.cp-card').closest('.r2-ov'); if (!ov) return 'no ov';
            for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } for (const r of rs) { if (!r.selectorText || !/visibility|pointer-events/.test(r.cssText)) continue; try { if (ov.matches(r.selectorText) || document.querySelector('.cp-card').matches(r.selectorText) || ov.parentElement.matches(r.selectorText)) out.push(r.cssText.slice(0, 200)); } catch (e) { } } }
            return { parent: ov.parentElement.tagName + '#' + ov.parentElement.id + '.' + ov.parentElement.className, rules: out.slice(0, 12), html: document.documentElement.className.slice(0, 120) }; })));
        await R.shot('/tmp/cr-shots/diag-' + engine + '.png').catch(() => { });
    } catch (e) { console.log('ERR ' + e.message); }
    await R.close().catch(() => { }); process.exit(0);
})();
