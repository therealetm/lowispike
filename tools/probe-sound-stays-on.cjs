'use strict';
/* Sound stays on probe (Oct 22 2026). usage: node tools/probe-sound-stays-on.cjs <device> [dirOrUrl] [engine]
   Emmanuel: "When user turns sound on it should stay on all the time even if they leave the app. And it should stay on or turn on
   when they come back on the app." An init script makes audio behave like iOS Safari: until a tap, an AudioContext starts
   suspended, resume() and media play() are refused; after the app was hidden, a new tap is needed again (the strict case).
   Steps: World sound on by real taps (Sound button -> switch), hide the page, come back (with and without the strict lock),
   page cache hide/show, reload, first tap anywhere, then the tutorial voice and the app sounds, then switch off + reload stays off. */
const H = require('./sim/harness.cjs'), path = require('path');
const LOCK = () => {
    window.__g = false; window.__strict = false;
    const mark = () => { window.__g = true; };
    ['touchend', 'click'].forEach(t => document.addEventListener(t, mark, true));   /* Escape is no user activation */
    document.addEventListener('visibilitychange', () => { if (document.hidden && window.__strict) window.__g = false; }, true);
    const O = window.AudioContext || window.webkitAudioContext; if (!O) return;
    const res = O.prototype.resume;
    class P extends O { constructor(...a) { super(...a); if (!window.__g) { try { O.prototype.suspend.call(this); } catch (e) { } } } }
    P.prototype.resume = function () { if (!window.__g) return Promise.reject(new DOMException('needs a tap', 'NotAllowedError')); return res.call(this); };
    window.AudioContext = P; window.webkitAudioContext = P;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!window.__g) return Promise.reject(new DOMException('needs a tap', 'NotAllowedError')); return play.call(this); };
    /* a controllable document.hidden for the hide/return steps */
    let hid = false; Object.defineProperty(document, 'hidden', { configurable: true, get: () => hid });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hid ? 'hidden' : 'visible' });
    window.__hide = h => { hid = !!h; document.dispatchEvent(new Event('visibilitychange')); };
};
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), engine = process.argv[4] || 'webkit';
    const o = { device, engine, members: 10, messages: 20, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, res = { device, engine }, fails = [], errors = [];
    P.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
    await R.ctx.addInitScript(LOCK);
    await R.goto(); await H.sleep(5000);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
    const W = () => P.evaluate(() => { const A = window.LowiWorldAudio; let s = {}; try { s = JSON.parse(localStorage.getItem('lowi.worldAudio') || '{}'); } catch (e) { }
        const b = document.querySelector('.wa-btn'); return { on: A && A.on, state: A && A.state, ambient: A && A.ambient, stored: s.on === true, btn: b ? b.dataset.on : null }; });
    const blank = async () => { const v = P.viewportSize(); await P.touchscreen.tap(Math.round(v.width / 2), 6); await H.sleep(900); };
    const check = (name, s, want) => { res[name] = s; for (const k of Object.keys(want)) if (s[k] !== want[k]) fails.push(name + ': ' + k + '=' + s[k] + ' (want ' + want[k] + ')'); };
    check('fresh', await W(), { on: false, stored: false });
    /* 1. turn World sound on by real taps on Home */
    await P.evaluate(() => { try { window.goTab && goTab('home'); } catch (e) { } }); await H.sleep(1500);
    let tapped = false;
    try { await R.tap('.wa-btn'); await H.sleep(700); await R.tap('.wa-panel:not(.mb-ghost) [data-wa=on]'); tapped = true; } catch (e) { }
    if (!tapped || !(await W()).on) { res.onFallback = true; await blank(); await P.evaluate(() => LowiWorldAudio.setOn(true)); }
    await H.sleep(1500);
    check('on', await W(), { on: true, stored: true, state: 'running', ambient: true });
    await P.evaluate(() => window.LowiWorldAudio && LowiWorldAudio.close()); await H.sleep(400);
    /* 2. hide (switch apps / lock) and come back: no new tap needed (normal case) */
    await P.evaluate(() => __hide(true)); await H.sleep(900);
    check('hidden', await W(), { on: true, stored: true, state: 'suspended', ambient: false });
    await P.evaluate(() => __hide(false)); await H.sleep(1500);
    check('back', await W(), { on: true, stored: true, state: 'running', ambient: true });
    /* 3. strict iOS: after the background the browser wants a new tap. Stays ON, first tap anywhere brings it back */
    await P.evaluate(() => { window.__strict = true; __hide(true); }); await H.sleep(900);
    await P.evaluate(() => __hide(false)); await H.sleep(1500);
    check('backStrict', await W(), { on: true, stored: true });
    await blank();
    check('backStrictTap', await W(), { on: true, state: 'running', ambient: true });
    /* 4. page cache: pagehide closes the context, pageshow(persisted) starts it again */
    await P.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); }); await H.sleep(500);
    await P.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }); await H.sleep(1500);
    check('pageCache', await W(), { on: true, stored: true, state: 'running', ambient: true });
    /* 5. reload / fresh open: ON at once (blocked until a tap), first tap anywhere plays, no prompt */
    await P.evaluate(() => { localStorage.setItem('lowi.tutorial.voice.v1', '1'); });
    await R.goto(); await H.sleep(5000);
    check('reload', await W(), { on: true, stored: true });
    res.reloadBlocked = (await W()).state;   /* no tap yet: the strict lock keeps it 'suspended', the switch must still say ON */
    res.reloadBtn = (await W()).btn;
    if (res.reloadBtn != null && res.reloadBtn !== '1') fails.push('Sound button not ON after reload: ' + res.reloadBtn);
    res.prompt = await P.evaluate(() => !!document.querySelector('.wa-panel:not(.mb-ghost), [role=alertdialog]'));
    await blank();
    check('reloadTap', await W(), { on: true, stored: true, state: 'running', ambient: true });
    /* 6. tutorial voice and app sounds keep their stored on */
    res.tutorial = await P.evaluate(() => ({ on: window.LowiTutorialVoice ? LowiTutorialVoice.isOn() : 'not loaded', sfx: window.LowiSFX ? LowiSFX.state() : null }));
    if (res.tutorial.on === false) fails.push('tutorial voice not on after reload');
    await P.evaluate(() => __hide(true)); await H.sleep(500); await P.evaluate(() => __hide(false)); await H.sleep(800); await blank();
    res.tutorialBack = await P.evaluate(() => ({ on: window.LowiTutorialVoice ? LowiTutorialVoice.isOn() : 'not loaded', sfx: window.LowiSFX ? LowiSFX.state() : null, world: window.LowiWorldAudio && LowiWorldAudio.state }));
    if (res.tutorialBack.on === false) fails.push('tutorial voice turned off by leaving');
    if (res.tutorialBack.sfx && res.tutorialBack.sfx.on && res.tutorialBack.sfx.ctx !== 'running' && res.tutorialBack.sfx.ctx !== 'none') fails.push('app sounds not awake after tap: ' + res.tutorialBack.sfx.ctx);
    if (res.tutorialBack.world !== 'running') fails.push('world sound not running after strict return + tap: ' + res.tutorialBack.world);
    /* 7. only the user turns it off: off + reload stays off */
    await P.evaluate(() => LowiWorldAudio.setOn(false)); await H.sleep(800);
    await R.goto(); await H.sleep(4500);
    check('offReload', await W(), { on: false, stored: false });
    res.errors = errors.filter(e => !/AudioContext|NotAllowed|needs a tap|play\(\)|access control|supabase/.test(e));
    if (res.errors.length) fails.push('page errors');
    res.fails = fails;
    console.log(JSON.stringify(res, null, 1));
    console.log(fails.length ? 'FAIL ' + device + ' ' + engine + ': ' + fails.join('; ') : 'PASS ' + device + ' ' + engine);
    await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
