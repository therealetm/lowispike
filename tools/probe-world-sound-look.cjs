'use strict';
/* World sound inside Look & sound probe (Oct 22 2026). usage: node tools/probe-world-sound-look.cjs <device> [dirOrUrl] [out-prefix] [engine]
   Seeds a saved World sound volume of 70 like an existing user, opens Settings, checks there is no World sound row, taps
   Look & sound, finds the World sound card, taps its switch on and off, moves the volume, then taps "Open the sound pad" and
   checks Home's Body sound panel opens. Reports overflow, small controls and page errors. */
const H = require('./sim/harness.cjs'), path = require('path');
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), out = process.argv[4] || '/tmp/wsl', engine = process.argv[5] || 'webkit';
    const o = { device, engine, members: 10, messages: 20, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, res = { device }, errors = [], fails = [];
    P.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
    await P.addInitScript(() => { try { if (!localStorage.getItem('lowi.wsl.seeded')) { localStorage.setItem('lowi.worldAudio', JSON.stringify({ vol: 70, warp: false })); localStorage.setItem('lowi.wsl.seeded', '1'); } } catch (e) { } });
    await R.goto(); await H.sleep(5000);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
    const S = () => window.LowiHomeSettingsSleepV2;
    res.settingsRows = await P.evaluate(() => window.LowiHomeSettingsSleepV2 ? LowiHomeSettingsSleepV2.available().settings : null);
    if (!res.settingsRows || res.settingsRows.includes('worldSound')) fails.push('World sound row still in Settings');
    if (res.settingsRows && !res.settingsRows.includes('look')) fails.push('Look & sound row missing');
    /* Settings page -> Look & sound by a tap */
    await P.evaluate(() => LowiHomeSettingsSleepV2.openSettings()); await H.sleep(900);
    res.pageText = await P.evaluate(() => { const t = document.body.innerText; return { world: /World sound|Weltklang|Sonido del mundo/.test([...document.querySelectorAll('[class*="hs"], [class*="o8"]')].map(e => e.innerText).join(' ')) }; });
    const lookSel = await P.evaluate(() => { const el = [...document.querySelectorAll('button, [role=button], a')].find(b => b.offsetParent && /^\s*(Look & sound|Aussehen & Ton|Aspecto y sonido)/.test(b.textContent)); if (!el) return null; el.setAttribute('data-wsl-look', ''); return el.textContent.trim().slice(0, 40); });
    res.lookRow = lookSel;
    if (lookSel) { await R.tap('[data-wsl-look]'); } else { fails.push('no Look & sound row to tap'); await P.evaluate(() => LowiHomeSettingsSleepV2.run('look')); }
    await H.sleep(1500);
    res.card = await P.evaluate(() => { const c = document.querySelector('#tab-profile .wa-look'); if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(), tab = document.getElementById('tab-profile');
        const shown = c.offsetParent !== null && r.height > 0, prev = c.previousElementSibling ? c.previousElementSibling.className : '';
        const over = [...c.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).map(e => e.className).slice(0, 4);
        const small = [...c.querySelectorAll('button')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height < 30; }).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().height));
        return { shown, prev, over, small, part: c.getAttribute('data-g2e') || c.dataset.g2e || null, text: c.innerText.replace(/\s+/g, ' ').trim(), vol: (c.querySelector('input') || {}).value, onAria: c.querySelector('[data-wa-look=on]').getAttribute('aria-checked'), w: Math.round(r.width), vw: innerWidth }; });
    if (!res.card) fails.push('no World sound card in Look & sound');
    else { if (!res.card.shown) fails.push('card hidden'); if (res.card.over.length) fails.push('overflow ' + res.card.over); if (res.card.small.length) fails.push('small ' + res.card.small); if (res.card.vol !== '70') fails.push('saved volume not shown: ' + res.card.vol); }
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-off.png');
    if (res.card) {
        await R.tap('#tab-profile .wa-look [data-wa-look=on]'); await H.sleep(700);
        res.afterOn = await P.evaluate(() => ({ api: LowiWorldAudio.on, aria: document.querySelector('#tab-profile .wa-look [data-wa-look=on]').getAttribute('aria-checked'), slider: !document.querySelector('#tab-profile .wa-look input').disabled }));
        if (!res.afterOn.api || res.afterOn.aria !== 'true' || !res.afterOn.slider) fails.push('switch on did not take ' + JSON.stringify(res.afterOn));
        await R.shot(out + '-' + device.replace(/\s+/g, '') + '-on.png');
        await P.evaluate(() => { const r = document.querySelector('#tab-profile .wa-look input'); r.value = '35'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }); await H.sleep(300);
        res.vol = await P.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('lowi.worldAudio') || '{}').vol, label: document.querySelector('#tab-profile .wa-look [data-wa-look=n]').textContent }));
        if (res.vol.saved !== 35 || res.vol.label !== '35%') fails.push('volume ' + JSON.stringify(res.vol));
        await R.tap('#tab-profile .wa-look [data-wa-look=on]'); await H.sleep(500);
        res.afterOff = await P.evaluate(() => ({ api: LowiWorldAudio.on, aria: document.querySelector('#tab-profile .wa-look [data-wa-look=on]').getAttribute('aria-checked') }));
        if (res.afterOff.api || res.afterOff.aria !== 'false') fails.push('switch off did not take');
        await R.tap('#tab-profile .wa-look [data-wa-look=pad]'); await H.sleep(4500);
        res.pad = await P.evaluate(() => ({ panel: !!document.querySelector('.wa-panel:not(.mb-ghost)'), home: document.documentElement.classList.contains('wh-world-live') }));
        if (!res.pad.panel) fails.push('sound pad did not open ' + JSON.stringify(res.pad));
        await R.shot(out + '-' + device.replace(/\s+/g, '') + '-pad.png');
    }
    res.errors = errors.filter(e => !/AudioContext|NotAllowed|play\(\)/.test(e));
    if (res.errors.length) fails.push('page errors');
    res.fails = fails;
    console.log(JSON.stringify(res, null, 1));
    console.log(fails.length ? 'FAIL ' + device + ': ' + fails.join('; ') : 'PASS ' + device);
    await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
