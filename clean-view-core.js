/* LOWiSPIKE clean flight view: the pure part (no DOM), shared by clean-view.js and the tests.
   While Misty flies on autopilot, or while you steer her yourself, the distracting UI fades away so only Misty and the
   living world are left. One tap anywhere brings it all back, and that tap does nothing else.
   - autopilot: everything fades, the controller too.
   - steering: everything fades except the controller (you are holding it).
   - restoring never stops the flight and nothing fades again by itself: only a new autopilot start or a new steering
     move on the controller hides it again.
   - Oct 17 (E-man: "the menu comes back by itself about a second after leaving a world"): nothing comes back by itself
     either. She leaving a world, floating home, stopping, the autopilot ending or a world warp keep the view clean; only
     your tap (or a key) brings the menu back. Switching to another tab is the one exception (nothing hidden on another page).
   - Oct 17 (E-man: "when Misty gets out of the world ... on autopilot, all of a sudden the whole interface appears, which is not
     supposed to"): inside a cell world a tap can only bring back what a world shows (the controller and the World map stick;
     Home's menus stay away there, WORLD_HIDE). That tap used to count as "menus back" all the same, so the moment she flew
     out of the world Home's whole interface jumped in although you never asked for it there. Now a reveal tap inside a world
     is remembered as a world tap: leaving the world keeps Home's menus hidden (the controller you brought back stays), and
     the next tap on Home brings them back as always. */
(function (root) {
    'use strict';
    /* faded in both views (Home and inside a world). The controller (#whPad + its chip) is extra in autopilot. */
    const HIDE = [
        '#tabbar', '#tbTheme', '#pfBtn', '#tab-home .sp-top',
        '#spFast', '#f3Board', '#hcLine', '#whHint',
        '#whHud > :not(#whPad):not(#whPadChip):not(#mhNudge):not(#rpPal):not(.wh-scrim):not([data-clean-keep])',
        '.wh-move', '.wm-float', '#bwrLabel', '#arrCard', '#hqSlot', '[data-clean-hide]'
    ];
    const HIDE_AUTO = ['#whPad', '#whPadChip'];
    /* Oct 17 (Emmanuel, iPad screenshots inside the heart world: "inside the cell world the panels appear, that's not supposed to
       happen" + "the menu, the menu bar and stuff like that ... it's a mistake that it pops up"): inside a cell world (html.wh-away:
       Misty is in a place of Home's own world) Home's menus and panels are never shown, not even after the reveal tap. The side rail /
       tab bar, greeting row, weather, Daily Quest with its world line, arrival card, XP cards, Today, VR, Sound, Day/Night and the
       hints stay away. Left: Misty, her cell, the cell guide and its speech bubble, the controller (misty-pad.css rules) and the
       bottom-centre X back to Misty (the old World map stick was removed on Oct 22 2026). */
    /* Oct 22 2026: the World map stick is removed; the way out of a world is the bottom-centre X (#whX, outside #whHud) */
    const WORLD_HIDE = HIDE.slice()
        .concat(['.hq-pop', '.r3m-pop']);
    function worldCss() { return WORLD_HIDE.map(s => 'html.wh-home.wh-away ' + s).join(',\n'); }
    /* never faded: Misty, her cell, the world, the speech bubbles (cell guide .rp-*, Misty's nudge).
       Oct 17 (handoff item 7): the cell guide (#rpPal) lives inside #whHud on Home, so the HUD rule used to fade it with the
       rest; it is excluded there now, so the guide and its bubble stay while she flies. */
    const KEEP = ['#spBubble', '#bw3Stage', '.bw3-canvas', '#rpPal', '.rp-body', '.rp-say', '#mhNudge'];

    const FLY = { auto: 1, drive: 1 };
    function init() { return { mode: '', clean: false, view: '', worldTap: false }; }
    /* ev: {type:'mode', mode} | {type:'steer'} | {type:'tap', inWorld} | {type:'leave'} | {type:'world-left'}
       returns { st, act: 'hide' | 'show' | 'view' | null } (view = still hidden, the controller's visibility changed) */
    function step(st, ev) {
        const s = Object.assign({}, st || init());
        let act = null;
        if (!ev) return { st: s, act };
        if (ev.type === 'mode') {
            const prev = s.mode, m = ev.mode || '';
            s.mode = m;
            if (m === 'auto' && prev !== 'auto') { act = s.clean ? (s.view !== 'auto' ? 'view' : null) : 'hide'; s.clean = true; s.view = 'auto'; s.worldTap = false; }
            else if (m === 'drive') { if (s.clean && s.view !== 'drive') { s.view = 'drive'; act = 'view'; } }
            /* she stopped, went home or left a world: the view stays as it is until you tap (no automatic return) */
            else if (!FLY[m]) { act = null; }
        } else if (ev.type === 'steer') {
            /* a real steering move on the controller: a drag, a hold or an arrow key */
            if (s.mode !== 'auto') s.mode = 'drive';
            if (!s.clean) act = 'hide'; else if (s.view !== 'drive') act = 'view';
            s.clean = true; s.view = 'drive'; s.worldTap = false;
        } else if (ev.type === 'tap' || ev.type === 'leave') {   /* leave = another tab, never a world transition */
            if (s.clean) act = 'show';
            /* a reveal tap inside a cell world only brought back what a world shows (Home's menus stay away there) */
            if (ev.type === 'tap') s.worldTap = !!(ev.inWorld && (s.clean || s.worldTap)); else s.worldTap = false;
            s.clean = false; s.view = '';
            if (ev.type === 'leave') s.mode = ev.mode || '';   /* where she is now: coming back to Home never fades by itself */
        } else if (ev.type === 'world-left') {
            /* she flew out of a cell world: Home's menus you never brought back there stay hidden (the controller you did bring
               back stays usable); with no world tap nothing changes, whatever was shown stays shown */
            if (!s.clean && s.worldTap) { s.clean = true; s.view = 'drive'; act = 'hide'; }
            s.worldTap = false;
        }
        return { st: s, act };
    }
    /* the controller stays touchable only while you steer */
    function padLive(st) { return !st.clean || st.view === 'drive'; }
    /* a press that never moved far and was let go soon is a tap (same numbers as the world's own tap) */
    function isTap(moved, ms) { return moved < 10 && ms < 450; }
    const SAY = {
        en: 'Controls hidden while Misty flies. Tap anywhere to show them.',
        de: 'Bedienelemente ausgeblendet, solange Misty fliegt. Tippe irgendwo, um sie zu zeigen.',
        es: 'Controles ocultos mientras Misty vuela. Toca en cualquier sitio para mostrarlos.'
    };
    function say(lang) { return SAY[lang] || SAY.en; }
    function css() {
        const all = HIDE.map(s => 'html.lw-clean ' + s).concat(HIDE_AUTO.map(s => 'html.lw-clean.lw-clean-auto ' + s)).join(',\n');
        return all;
    }
    const api = { HIDE, HIDE_AUTO, WORLD_HIDE, KEEP, init, step, padLive, isTap, say, css, worldCss };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiCleanCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
