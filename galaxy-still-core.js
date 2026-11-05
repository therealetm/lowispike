/* Nov 5 2026, Calm mode (was "Still galaxy"). Pure part: the levels, the stored choice, the words. galaxy-still.js is the browser part.

   Owner, after trying the first Still galaxy on the iPhone (zoom the galaxy, save the view as a picture, then the app swapped to its
   layout without the 3D world): "It's a complete mess ... I didn't say it should create a new interface. I don't know why it's
   creating new circles, new bubbles". The saved picture was a screenshot of the 3D world, its glass bubbles and Misty included, and
   the app then drew its bubbles again on top of it: a ghost bubble behind every bubble and a thin ring around Misty, and Community and
   the long press on Move stopped working until the app was closed. All of that is gone: nothing is photographed, the 3D world is never
   let go, the interface is never swapped. Instead, one stepped choice, each level adding to the one before:
     0 off            everything as it always was
     1 world stays    no flying around the world: dragging, pinching and double tapping the world do nothing, places are not
                      travelled to; the joystick stays only to open all bubbles (hold it).
     2 still bg       the world's scenery stops moving too (the bloodstream, the cells, the slow turn of the camera)
     3 no bg          the scenery is taken away: plain black (Dark, Night) or plain light (Day) behind the same glass bubbles
     4 all still      the bubbles and Misty stop moving as well, and the world is only drawn again when something changes.
                      "If you're a grown-up and you don't need all this gamification, it just becomes a holographic bubble tracker."
   Every level applies at once, every tap keeps working, and nothing restarts. "The bubble is our thing": no level adds a circle, a
   ring or a second bubble.

   Stored per device (it is about this device's battery): localStorage 'lowi.calm' = '0'..'4'. The first Still galaxy's own record
   ('lowi.galaxyStill' {on:true}) becomes level 2 once, and its saved pictures are removed. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiGalaxyStillCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    const KEY = 'lowi.calm', MAX = 4;
    const OLD = { KEY: 'lowi.galaxyStill', THUMB: 'lowi.galaxyStill.thumb', FRAME: 'lowi.galaxyStill.frame', DB: 'lowi-galaxy-still' };
    /* html classes per level; each level keeps the ones below it */
    const CLS = ['cm-on', 'cm-nav', 'cm-bg', 'cm-nobg', 'cm-all'];
    function clamp(n) { n = Math.round(+n); return isFinite(n) ? Math.max(0, Math.min(MAX, n)) : 0; }
    function parse(raw) { if (raw == null || raw === '') return null; const n = +raw; return isFinite(n) ? clamp(n) : null; }
    /* the first Still galaxy: on = level 2 (the galaxy stood still, the interface stayed) */
    function migrate(oldRaw) {
        if (!oldRaw) return null;
        try { const o = JSON.parse(oldRaw); return o && o.on ? 2 : null; } catch (e) { return null; }
    }
    /* which html classes are on at a level: cm-on from 1, cm-nav from 1, cm-bg from 2, cm-nobg from 3, cm-all at 4 */
    function classes(lv) { lv = clamp(lv); if (!lv) return []; return ['cm-on', 'cm-nav'].concat(lv >= 2 ? ['cm-bg'] : [], lv >= 3 ? ['cm-nobg'] : [], lv >= 4 ? ['cm-all'] : []); }
    /* what each part of the app may do at a level */
    const navOff = lv => clamp(lv) >= 1;     /* world drag / pinch / double tap / travel, joystick steering (its hold still opens all bubbles) */
    const bgStill = lv => clamp(lv) >= 2;    /* world time, the camera's slow turn, the tilt */
    const bgGone = lv => clamp(lv) >= 3;     /* scenery not drawn, plain background */
    const allStill = lv => clamp(lv) >= 4;   /* bubbles, Misty, every endless animation; world drawn only on a change */
    /* the plain background at level 3+: black unless the app is in its light Day look */
    function plainBg(theme) { return theme === 'light' ? 0xf2f2f7 : 0x000000; }
    /* a three.js object that stays drawn when the scenery is taken away: lights, the companion's hub, and everything the app marks
       as "keep" (the living glass bubbles, Misty's sprites and face: userData.lwKeep, the same mark the world travel uses;
       userData.calmKeep marks the companion's own render group for Calm only, so it stays in No background / Everything still) */
    function keeps(o) { return !!(o && (o.isLight || o.name === 'lowi-hub' || (o.userData && (o.userData.lwKeep || o.userData.calmKeep)))); }

    const TX = {
        en: {
            row: 'Calm mode', sub: 'Less motion, saves battery', off: 'Off',
            title: 'Calm mode', intro: 'Each step adds to the one before. Everything you tap keeps working, nothing restarts.',
            l0: 'Off', d0: 'Everything moves as usual.',
            l1: 'World stays put', d1: 'No flying around the world. Hold the joystick to open all bubbles.',
            l2: 'Still background', d2: 'The world behind the bubbles stops moving.',
            l3: 'No background', d3: 'Plain black, or light in Day, behind the bubbles.',
            l4: 'Everything still', d4: 'The bubbles and your companion stop moving too. Saves the most battery.',
            done: 'Done'
        },
        de: {
            row: 'Ruhemodus', sub: 'Weniger Bewegung, spart Akku', off: 'Aus',
            title: 'Ruhemodus', intro: 'Jede Stufe legt etwas auf die vorige drauf. Alles, was du antippst, funktioniert weiter, nichts startet neu.',
            l0: 'Aus', d0: 'Alles bewegt sich wie gewohnt.',
            l1: 'Welt bleibt stehen', d1: 'Kein Herumfliegen in der Welt. Joystick halten \u00f6ffnet alle Bubbles.',
            l2: 'Ruhiger Hintergrund', d2: 'Die Welt hinter den Bubbles bewegt sich nicht mehr.',
            l3: 'Kein Hintergrund', d3: 'Schlichtes Schwarz, im Tag-Look Hell, hinter den Bubbles.',
            l4: 'Alles steht still', d4: 'Auch die Bubbles und dein Begleiter bewegen sich nicht mehr. Spart am meisten Akku.',
            done: 'Fertig'
        },
        es: {
            row: 'Modo calma', sub: 'Menos movimiento, ahorra bater\u00eda', off: 'No',
            title: 'Modo calma', intro: 'Cada paso se suma al anterior. Todo lo que tocas sigue funcionando y nada se reinicia.',
            l0: 'No', d0: 'Todo se mueve como siempre.',
            l1: 'Mundo fijo', d1: 'No se vuela por el mundo. Mant\u00e9n el joystick para abrir todas las burbujas.',
            l2: 'Fondo quieto', d2: 'El mundo detr\u00e1s de las burbujas deja de moverse.',
            l3: 'Sin fondo', d3: 'Negro liso, o claro en el modo D\u00eda, detr\u00e1s de las burbujas.',
            l4: 'Todo quieto', d4: 'Las burbujas y tu compa\u00f1ero tambi\u00e9n se quedan quietos. Ahorra m\u00e1s bater\u00eda.',
            done: 'Listo'
        }
    };
    const t = (l, k) => ((TX[l] || TX.en)[k]) || TX.en[k] || k;
    const levelName = (lv, l) => t(l, 'l' + clamp(lv));

    /* Kept from the first Still galaxy: the walk over a three.js scene that hands every geometry, material and texture back
       (body-world-3d-scene.js dispose(true) still uses it when the world is torn down for good). */
    function collect(scene) {
        const geo = new Set(), mat = new Set(), tex = new Set();
        const addTex = v => { if (v && v.isTexture) tex.add(v); };
        if (!scene || typeof scene.traverse !== 'function') return { geo, mat, tex };
        if (scene.background) addTex(scene.background);
        if (scene.environment) addTex(scene.environment);
        scene.traverse(o => {
            if (o.geometry && typeof o.geometry.dispose === 'function') geo.add(o.geometry);
            const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
            ms.forEach(m => {
                if (!m) return;
                mat.add(m);
                Object.keys(m).forEach(k => addTex(m[k]));
                const u = m.uniforms || {};
                Object.keys(u).forEach(k => { const v = u[k] && u[k].value; if (Array.isArray(v)) v.forEach(addTex); else addTex(v); });
            });
        });
        return { geo, mat, tex };
    }
    function disposeAll(scene) {
        const c = collect(scene), n = { geometries: 0, materials: 0, textures: 0 };
        c.tex.forEach(t => { try { t.dispose(); n.textures++; } catch (e) { } });
        c.mat.forEach(m => { try { m.dispose(); n.materials++; } catch (e) { } });
        c.geo.forEach(g => { try { g.dispose(); n.geometries++; } catch (e) { } });
        return n;
    }

    return { KEY, MAX, OLD, CLS, clamp, parse, migrate, classes, navOff, bgStill, bgGone, allStill, plainBg, keeps, TX, t, levelName, collect, disposeAll };
});
