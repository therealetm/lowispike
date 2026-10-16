/* LOWiSPIKE day-night atmosphere (Oct 15, 2026). E-man: "Not just a light or dark click, a scale like the volume,
   like controlling the world in a timelapse: morning mists, sunnier, golden hour, bluish mists, night stars."
   - Look & Ton: the old Night / Cloud / Sunrise card becomes "Day & night": quick Day | Night | Auto buttons and a
     volume-style slider over the whole timelapse. Dragging repaints the sky every frame (no snapping).
   - Top bar moon/sun button: one tap Day <-> Night (top-bar.js asks LowiAtmos.quick when it is here).
   - The sky: the base gradient is painted on #app (also restored in <head> before first paint), #atmSky (first
     child of #app, before #wxSky) adds sun/moon glow, mist bands and stars. In a manual look only the weather's
     time-of-day pieces (.wx-tint/.wx-orb/.wx-stars) step aside; clouds, rain, fog, frost and #ssnSky stay.
   - UI theme: lowi.theme is kept in sync (manual p < THRESH -> light, else dark; Auto -> 'sunrise', the old automatic,
     untouched). A change of lowi.theme from anywhere else wins and the slider follows (reconcile in the core).
   - 3D hub: haze + light lerp toward the chosen time of day after season.js, hub only, same renderer.
   Reduced motion: no twinkle, no mist drift. Pure maths lives in atmosphere-core.js. */
(function () {
    'use strict';
    if (window.LowiAtmos) return;
    const H = document.documentElement, C = window.LowiAtmosCore;
    if (!C) return;
    const RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
    const lang = () => { const l = (H.lang || ls.get('lowispike.lang') || 'en').slice(0, 2); return C.LANGS.includes(l) ? l : 'en'; };
    const W = k => C.word(k, lang());
    const R2 = () => window.LowiR2;

    (function css() {
        if (document.querySelector('link[data-atm-css]')) return;
        const base = (document.querySelector('script[src*="atmosphere.js"]') || {}).src || '';
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-atm-css', '');
        l.href = base ? base.replace(/atmosphere\.js(\?.*)?$/, 'atmosphere.css$1') : 'atmosphere.css';
        document.head.appendChild(l);
    })();

    let state = C.reconcile(C.parse(ls.get(C.KEY), ls.get('lowi.theme')), ls.get('lowi.theme'));
    let busy = false, painted = null, raf = 0, pendingP = null;

    /* ---------- painting ---------- */
    const VAR_NAMES = Object.keys(C.vars(0));
    function paint(p) {
        const v = C.vars(p);
        for (const k of VAR_NAMES) H.style.setProperty(k, v[k]);
        H.setAttribute('data-atm', 'manual');
        const k = C.look(p);
        H.setAttribute('data-atm-stars', k.star > 0.02 ? '1' : '0');
        H.setAttribute('data-atm-mist', k.mistA > 0.03 ? '1' : '0');
        H.setAttribute('data-atm-mark', k.mark);
        const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', k.top);
        painted = k.p;
        setTheme(k.theme);
        updateUI();
    }
    function unpaint() {
        for (const k of VAR_NAMES) H.style.removeProperty(k);
        ['data-atm', 'data-atm-stars', 'data-atm-mist', 'data-atm-mark'].forEach(a => H.removeAttribute(a));
        painted = null;
    }
    function setTheme(t) {
        const r = R2();
        if (!r || !r.applyTheme) { H.setAttribute('data-theme', t === 'sunrise' ? H.getAttribute('data-theme') || 'dark' : t); ls.set('lowi.theme', t); return; }
        if (r.theme() === t && (t === 'sunrise' || H.getAttribute('data-theme') === t)) return;
        busy = true; try { r.applyTheme(t); } finally { busy = false; }
        if (state.mode === 'manual') { const k = C.look(state.p); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', k.top); }
    }
    function save() {
        ls.set(C.KEY, C.serialize(state));
        if (state.mode === 'manual') ls.set(C.CSS_KEY, C.cssText(state.p)); else ls.del(C.CSS_KEY);
    }
    function apply(next, opts) {
        state = next.mode === 'auto' ? { mode: 'auto', p: null } : { mode: 'manual', p: C.clampP(next.p) };
        if (state.mode === 'manual') paint(state.p);
        else { unpaint(); setTheme('sunrise'); updateUI(); }
        if (!opts || opts.save !== false) save();
        try { window.dispatchEvent(new CustomEvent('lowi:atmos', { detail: { mode: state.mode, p: state.p } })); } catch (e) {}
    }
    /* while dragging: paint at most once per frame, save on release */
    function scrub(p) {
        pendingP = p;
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; const q = pendingP; pendingP = null; state = { mode: 'manual', p: C.clampP(q) }; paint(state.p); });
    }

    /* ---------- the Look & Ton card ---------- */
    function ico(n) { const r = R2(); return (r && r.ico && r.ico[n]) || ''; }
    function cardHTML() {
        const l = lang();
        const marks = C.MARKS.map(m => '<button type="button" class="atm-mark" data-atm-goto="' + m.p + '">' + C.markWord(m.id, l) + '</button>').join('');
        return '<div class="r2-lookrow"><div><b>' + W('title') + '</b><small>' + W('sub') + '</small></div>' +
            '<div class="r2-seg atm-quick" role="group" aria-label="' + W('title') + '">' +
            '<button type="button" data-atm-quick="day">' + ico('sun') + '<span>' + W('day') + '</span></button>' +
            '<button type="button" data-atm-quick="night">' + ico('moon') + '<span>' + W('night') + '</span></button>' +
            '<button type="button" data-atm-quick="auto">' + ico('sunrise') + '<span>' + W('auto') + '</span></button></div></div>' +
            '<div class="atm-slider"><div class="atm-now" aria-hidden="true"></div>' +
            '<div class="atm-trackwrap"><div class="atm-track" style="background:' + C.trackGradient() + '"></div>' +
            '<input class="atm-range" type="range" min="0" max="100" step="0.5" aria-label="' + W('slider') + '"></div>' +
            '<div class="atm-marks">' + marks + '</div><small class="atm-autonote">' + W('autoLong') + '</small></div>';
    }
    function shownP() { return state.mode === 'manual' ? state.p : C.clockP(Date.now()); }
    function updateUI() {
        document.querySelectorAll('[data-atm-card]').forEach(card => {
            const p = shownP(), k = C.look(p), l = lang();
            const r = card.querySelector('.atm-range');
            if (r && document.activeElement !== r && Math.abs(+r.value - p) > 0.01) r.value = String(p);
            if (r) { r.setAttribute('aria-valuetext', C.markWord(k.mark, l)); r.style.setProperty('--fill', p + '%'); }
            const now = card.querySelector('.atm-now'); if (now) { now.textContent = C.markWord(k.mark, l); now.style.setProperty('--x', p + '%'); }
            const q = state.mode === 'auto' ? 'auto' : state.p === C.DAY ? 'day' : state.p === C.NIGHT ? 'night' : '';
            card.querySelectorAll('[data-atm-quick]').forEach(b => { const on = b.getAttribute('data-atm-quick') === q; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
            card.querySelectorAll('.atm-mark').forEach(b => b.classList.toggle('on', state.mode === 'manual' && b.getAttribute('data-atm-goto') === String(k.mark === 'night' ? C.NIGHT : (C.MARKS.find(m => m.id === k.mark) || {}).p)));
            card.classList.toggle('atm-is-auto', state.mode === 'auto');
        });
    }
    function mountCard() {
        document.querySelectorAll('.r2-look:not([data-atm-card])').forEach(card => {
            card.setAttribute('data-atm-card', ''); card.setAttribute('data-noi18n', ''); card.setAttribute('lang', lang());
            card.innerHTML = cardHTML();
            const r = card.querySelector('.atm-range');
            r.addEventListener('input', () => scrub(+r.value));
            r.addEventListener('change', () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } apply({ mode: 'manual', p: +r.value }); });
        });
        updateUI();
    }
    function toast(k) { const r = R2(); if (r && r.toast) r.toast(W(k)); }
    function quick(which, opts) {
        if (which === 'auto') apply({ mode: 'auto' });
        else apply({ mode: 'manual', p: which === 'day' ? C.DAY : C.NIGHT });
        if (!opts || opts.toast !== false) toast(which === 'auto' ? 'autoOn' : which === 'day' ? 'dayOn' : 'nightOn');
    }
    document.addEventListener('click', e => {
        const q = e.target.closest && e.target.closest('[data-atm-quick]');
        if (q) { quick(q.getAttribute('data-atm-quick')); return; }
        const g = e.target.closest && e.target.closest('[data-atm-goto]');
        if (g) apply({ mode: 'manual', p: +g.getAttribute('data-atm-goto') });
    });

    /* ---------- the sky layer ---------- */
    function mountSky() {
        const app = document.getElementById('app');
        if (!app) return;
        let sky = document.getElementById('atmSky');
        if (!sky) {
            sky = document.createElement('div'); sky.id = 'atmSky'; sky.setAttribute('aria-hidden', 'true');
            sky.innerHTML = '<i class="atm-glow"></i><i class="atm-stars"></i><i class="atm-stars atm-stars2"></i><i class="atm-mist atm-mist1"></i><i class="atm-mist atm-mist2"></i>';
        }
        if (app.firstElementChild !== sky) app.insertBefore(sky, app.firstChild);
    }

    /* ---------- something else changed the theme (older switch, Auto timer): follow it ---------- */
    function hookTheme() {
        const r = R2();
        if (!r || !r.applyTheme || r.applyTheme.__atm) return !!(r && r.applyTheme && r.applyTheme.__atm);
        const orig = r.applyTheme;
        const wrapped = function () {
            const out = orig.apply(this, arguments);
            if (!busy) {
                const next = C.reconcile(state, r.theme());
                if (next.mode !== state.mode || next.p !== state.p) apply(next);
                else if (state.mode === 'manual') { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', C.look(state.p).top); }
            }
            return out;
        };
        wrapped.__atm = true; r.applyTheme = wrapped;
        return true;
    }

    /* ---------- 3D hub: haze + light toward the chosen time of day (after season.js) ---------- */
    let hooked3d = false, hazeCol = null, tintCol = null;
    const lightBase = new WeakMap();
    function inRegion(a) { try { return !!(a.hub && a.camera && !a.hub.layers.test(a.camera.layers)); } catch (e) { return false; } }
    function riding() { try { return !!(window.LowiRide && window.LowiRide.active); } catch (e) { return false; } }
    function frame3d() {
        const a = window.LowiWorld3D;
        if (!a || !a.scene) return;
        const on = state.mode === 'manual' && !inRegion(a) && !riding();
        /* the world's own continuous curve (C.world), not the sky's theme-split one, so the hue never snaps.
           Oct 16: while the slider is being dragged/animated, state.p moves in half steps; the world follows it smoothly */
        const k = on ? (C.world ? C.world(smoothP()) : C.look(state.p)) : null;
        const kids = a.scene.children;
        for (let i = 0; i < kids.length; i++) {
            const o = kids[i];
            if (!o || !(o.isHemisphereLight || o.isDirectionalLight || o.isAmbientLight)) continue;
            /* Oct 16: the light itself also takes the time-of-day colour (golden = orange light, blue mist = blue light), so the
               slider swings the whole world's hue, not just the far haze */
            if (on) { if (!o.userData.atmOn) { lightBase.set(o, { i: o.intensity, c: o.color ? o.color.clone() : null }); o.userData.atmOn = true; } const b0 = lightBase.get(o); o.intensity = b0.i * k.light; if (b0.c && o.color && a.THREE) { tintCol = tintCol || new a.THREE.Color(); tintCol.set(k.tint || '#ffffff'); o.color.copy(b0.c).lerp(tintCol, k.tintA || 0); } }
            else if (o.userData.atmOn) { const b0 = lightBase.get(o); o.intensity = b0.i; if (b0.c && o.color) o.color.copy(b0.c); o.userData.atmOn = false; }
        }
        if (!on || !a.THREE) return;
        hazeCol = hazeCol || new a.THREE.Color();
        hazeCol.set(k.haze);
        const bg = a.scene.background, f = a.scene.fog;
        if (bg && bg.isColor) { bg.lerp(hazeCol, k.amt); if (f && f.color) f.color.copy(bg); }
    }
    /* the 3D world eases toward the chosen time over ~1 s (exponential follow), so even a tap on a named stop
       (Day / Night quick buttons) glides like a timelapse instead of cutting */
    let curP = null, lastT = 0;
    function smoothP() {
        const target = state.p == null ? C.DAY : state.p, now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (curP == null) { curP = target; lastT = now; return curP; }
        const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000)); lastT = now;
        curP += (target - curP) * (1 - Math.exp(-dt * 3.2));
        if (Math.abs(target - curP) < 0.05) curP = target;
        return curP;
    }
    function hook3d() {
        const a = window.LowiWorld3D;
        if (hooked3d || !a || typeof a.onFrame !== 'function') return;
        hooked3d = true;
        a.onFrame(() => { try { frame3d(); } catch (e) {} });
    }

    /* ---------- boot ---------- */
    function tick() {
        mountSky();
        hookTheme();
        hook3d();
        mountCard();
    }
    const API = {
        state: () => ({ mode: state.mode, p: state.p }),
        look: () => (state.mode === 'manual' ? C.look(state.p) : null),
        set: p => apply({ mode: 'manual', p }),
        auto: () => apply({ mode: 'auto' }),
        quick, scrub,
        /* Oct 16: the Day & night adjuster on its own (long-press on the moon/sun button). mountCard fills the .r2-look. */
        openSheet: () => {
            const r = R2(); if (!r || typeof r.sheet !== 'function') return null;
            const old = document.querySelector('.atm-ov'); if (old) return old;
            const ov = r.sheet('<div class="atm-sheet" data-noi18n><div class="r2-look"></div></div>', { cls: 'atm-ov' });
            mountCard(); updateUI();
            return ov;
        },
        isNight: () => (state.mode === 'manual' ? C.themeFor(state.p) === 'dark' : H.getAttribute('data-theme') !== 'light'),
        clockP: () => C.clockP(Date.now())
    };
    window.LowiAtmos = API;
    function start() {
        tick();
        apply(state, { save: !!C.parse(ls.get(C.KEY), ls.get('lowi.theme')).legacy || ls.get(C.KEY) !== C.serialize(state) });
        let pending = false;
        new MutationObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; if (!document.getElementById('atmSky') || document.querySelector('.r2-look:not([data-atm-card])')) tick(); else { hookTheme(); hook3d(); } }); })
            .observe(document.body, { childList: true, subtree: true });
        if (RM.addEventListener) RM.addEventListener('change', updateUI);
        setInterval(() => { if (state.mode === 'auto') updateUI(); hook3d(); }, 60000);
        new MutationObserver(() => { document.querySelectorAll('[data-atm-card]').forEach(c => c.removeAttribute('data-atm-card')); mountCard(); }).observe(H, { attributes: true, attributeFilter: ['lang'] });
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
