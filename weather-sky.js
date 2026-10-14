/* LOWiSPIKE weather sky: the whole app background follows the real weather outside.
   Reads the Open-Meteo reading spirit.js already fetches (lowi.weather.v1, location only with granted permission,
   never a prompt from here). Rain outside: rain in the app. Sun: sun. Dark: dark. Cold: frost.
   No reading (no permission, offline, stale): the local clock sets day/night and no weather is invented.
   One layer behind all content, pointer-events none, transforms/opacity only, paused when hidden or reduced motion. */
(function () {
    'use strict';
    const D = document, H = D.documentElement, KEY = 'lowi.weather.v1', OFF = 'lowi.sky.off';
    const core = window.LowiSkyCore;
    if (!core || window.LowiSky) return;
    let layer = null, last = '', timer = 0;

    function reading() {
        try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
    }
    function enabled() {
        try { return localStorage.getItem(OFF) !== '1'; } catch (e) { return true; }
    }
    function current(now) { return core.sky(reading(), now || Date.now()); }

    function build() {
        const app = D.getElementById('app');
        if (!app) return null;
        if (layer && layer.parentNode === app) return layer;
        layer = D.getElementById('wxSky') || D.createElement('div');
        layer.id = 'wxSky';
        layer.setAttribute('aria-hidden', 'true');
        layer.innerHTML = '<i class="wx-tint"></i><i class="wx-orb"></i><i class="wx-stars"></i><i class="wx-cloud wx-c1"></i><i class="wx-cloud wx-c2"></i><i class="wx-fog"></i><i class="wx-fall wx-f1"></i><i class="wx-fall wx-f2"></i><i class="wx-flash"></i><i class="wx-frost"></i><i class="wx-heat"></i>';
        app.insertBefore(layer, app.firstChild);
        return layer;
    }

    /* Sunrise (automatic) mode follows the real sun instead of a fixed 7:00-19:00; Night and Cloud stay as the user chose */
    function hookTheme() {
        const R2 = window.LowiR2;
        if (!R2 || !R2.themeEffective || R2.themeEffective.__sky) return;
        const base = R2.themeEffective;
        const fx = function (mode, now) {
            const m = mode || (R2.theme ? R2.theme() : 'dark');
            if (m !== 'sunrise') return base.apply(this, arguments);
            try { return core.sky(reading(), +(now || new Date())).day ? 'light' : 'dark'; } catch (e) { return base.apply(this, arguments); }
        };
        fx.__sky = true;
        R2.themeEffective = fx;
    }

    function apply() {
        const s = current(), on = enabled();
        const sig = [on, s.src, s.cond, s.temp, s.day, s.phase].join('|');
        if (on) build();
        if (sig === last) return s;
        last = sig;
        if (!on) {
            ['wxSrc', 'wxCond', 'wxTemp', 'wxDay', 'wxPhase', 'wxWet', 'wxStars'].forEach(k => delete H.dataset[k]);
            if (layer) layer.hidden = true;
        } else {
            if (layer) layer.hidden = false;
            H.dataset.wxSrc = s.src;
            H.dataset.wxCond = s.cond;
            H.dataset.wxTemp = s.temp;
            H.dataset.wxDay = s.day ? 'day' : 'night';
            H.dataset.wxPhase = s.phase;
            H.dataset.wxWet = s.wet ? '1' : '0';
            H.dataset.wxStars = s.stars ? '1' : '0';
        }
        const R2 = window.LowiR2;
        try {
            if (R2 && R2.theme && R2.theme() === 'sunrise' && R2.applyTheme && H.getAttribute('data-theme') !== R2.themeEffective('sunrise')) R2.applyTheme();
        } catch (e) {}
        try { D.dispatchEvent(new CustomEvent('lowi:sky', { detail: s })); } catch (e) {}
        return s;
    }

    /* one switch in the Appearance sheet: live weather sky on/off (on by default) */
    const WORDS = { en: ['Live weather sky', 'The background follows the weather outside.'], de: ['Live-Wetter im Hintergrund', 'Der Hintergrund folgt dem Wetter draußen.'], es: ['Cielo en vivo', 'El fondo sigue el tiempo de afuera.'] };
    function addToggle(panel) {
        const sheet = panel && !panel.hidden && panel.querySelector('.ap-sheet');
        if (!sheet || sheet.querySelector('#wxToggle')) return;
        const w = WORDS[(H.lang || 'en').slice(0, 2)] || WORDS.en;
        const b = D.createElement('button');
        b.type = 'button'; b.id = 'wxToggle'; b.className = 'wx-toggle';
        const paintBtn = () => { b.setAttribute('aria-pressed', String(enabled())); b.innerHTML = '<span><b>' + w[0] + '</b><small>' + w[1] + '</small></span><i aria-hidden="true"></i>'; };
        paintBtn();
        b.addEventListener('click', e => { e.stopPropagation(); window.LowiSky.setEnabled(!enabled()); paintBtn(); });
        sheet.appendChild(b);
    }
    function watchPanel() {
        const panel = D.getElementById('appearancePanel');
        if (!panel || panel.__wx || typeof MutationObserver === 'undefined') return;
        panel.__wx = true;
        new MutationObserver(() => addToggle(panel)).observe(panel, { attributes: true, attributeFilter: ['hidden'], childList: true });
    }

    function boot() {
        hookTheme();
        watchPanel();
        apply();
        D.addEventListener('lowi:weather', apply);
        window.addEventListener('storage', e => { if (e.key === KEY || e.key === OFF) apply(); });
        D.addEventListener('visibilitychange', () => { if (!D.hidden) apply(); });
        clearInterval(timer);
        timer = setInterval(() => { if (!D.hidden) apply(); }, 60000);
    }

    window.LowiSky = {
        state: () => current(),
        isDay: now => current(now).day,
        apply,
        setEnabled: on => { try { on ? localStorage.removeItem(OFF) : localStorage.setItem(OFF, '1'); } catch (e) {} last = ''; return apply(); }
    };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
