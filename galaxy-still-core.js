/* Nov 5 2026, Still galaxy (owner: an optional Settings battery-save mode that turns the active galaxy exploration into a beautiful
   STATIC background, "not an animated screensaver"; then refined: hold Community to open Settings, switch it on, go back Home, zoom and
   frame the galaxy with the interface still on screen, and tap Save in the corner to keep exactly that view as the background).

   Pure part (no DOM): the saved state, what the 3D world may do at launch, which background to paint, the words, and the walk over a
   three.js scene that collects every geometry, material and texture so they can be released. galaxy-still.js is the browser part;
   body-world-3d.js asks LowiGalaxyStill.on() before it builds the world; tests/galaxy-still-*.test.cjs check this file directly.

   Stored per device (it is about this device's battery):
   localStorage 'lowi.galaxyStill'       {v:1, on:true, at:<ms>, w, h, pic:'idb'|'thumb'|'none'}
   localStorage 'lowi.galaxyStill.thumb' a small JPEG data URL of the saved view (shown at once on launch, and the fallback when the
                                          full picture is gone)
   IndexedDB 'lowi-galaxy-still' / 'pics' / 'bg'  {blob:<JPEG>, at, w, h}: the full-size picture
   sessionStorage 'lowi.galaxyStill.frame' = '1': the next launch starts the live galaxy once so a new view can be chosen. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiGalaxyStillCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    const KEY = 'lowi.galaxyStill', THUMB_KEY = 'lowi.galaxyStill.thumb', FRAME_KEY = 'lowi.galaxyStill.frame';
    const DB = 'lowi-galaxy-still', STORE = 'pics', PIC = 'bg';
    const THUMB_W = 540;   /* the launch / fallback copy: small enough for localStorage (~40-120 KB as JPEG) */
    const FULL_MAX = 2600; /* longest side of the full picture; a 3x iPhone screen is 2532 px tall */

    function parse(raw) {
        if (!raw) return null;
        try { const s = JSON.parse(raw); return s && s.v === 1 && s.on === true ? s : null; } catch (e) { return null; }
    }
    /* the 3D world at launch: Still keeps it from starting at all, except for the one launch that was asked for to choose a new view */
    function worldAtLaunch(saved, framing) { return saved && !framing ? 'off' : 'live'; }
    /* which picture to paint: the full one when it loaded, else the small copy, else the plain still background (CSS) */
    function pick(full, thumb) { return full ? 'full' : thumb ? 'thumb' : 'plain'; }
    /* where the picture ended up, so the words can tell the truth */
    function storedAs(idbOk, thumbOk) { return idbOk ? 'idb' : thumbOk ? 'thumb' : 'none'; }
    function fitSize(w, h, max) {
        w = Math.max(1, w | 0); h = Math.max(1, h | 0); max = max || FULL_MAX;
        const k = Math.min(1, max / Math.max(w, h));
        return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
    }
    function record(o) { return { v: 1, on: true, at: o.at || Date.now(), w: o.w | 0, h: o.h | 0, pic: o.pic || 'none' }; }

    /* every geometry, material and texture a three.js scene holds (meshes, points, sprites, instanced meshes, shader uniforms), each
       once, so the world can hand them all back to the graphics chip and not just stop drawing them */
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

    const TX = {
        en: {
            row: 'Still galaxy', sub: 'Saves battery', on: 'On', off: 'Off', missing: 'Picture missing, choose again',
            hint: 'Zoom and move the galaxy, then tap Save.', save: 'Save', cancel: 'Cancel',
            saved: 'Background saved. The galaxy stands still now and no longer runs in the background.',
            savedThumb: 'Background saved, in lower quality: this device could not keep the full picture.',
            savedNone: 'This device could not store the picture, so a calm plain background is used.',
            no3d: 'The moving galaxy is not running on this device right now, so a calm plain background is used.',
            fail: 'The picture could not be taken. Nothing was changed.',
            title: 'Still galaxy', body: 'The galaxy is a still picture now. The app restarts for a moment to start the moving galaxy again.',
            reframe: 'Choose a new view', explore: 'Explore the galaxy again', keep: 'Keep it still'
        },
        de: {
            row: 'Ruhige Galaxie', sub: 'Spart Akku', on: 'An', off: 'Aus', missing: 'Bild fehlt, neu w\u00e4hlen',
            hint: 'Zoome und verschiebe die Galaxie, dann tippe auf Speichern.', save: 'Speichern', cancel: 'Abbrechen',
            saved: 'Hintergrund gespeichert. Die Galaxie steht jetzt still und l\u00e4uft nicht mehr im Hintergrund.',
            savedThumb: 'Hintergrund gespeichert, in geringerer Qualit\u00e4t: Dieses Ger\u00e4t konnte das ganze Bild nicht behalten.',
            savedNone: 'Dieses Ger\u00e4t konnte das Bild nicht speichern, deshalb gibt es einen ruhigen schlichten Hintergrund.',
            no3d: 'Die bewegte Galaxie l\u00e4uft auf diesem Ger\u00e4t gerade nicht, deshalb gibt es einen ruhigen schlichten Hintergrund.',
            fail: 'Das Bild konnte nicht aufgenommen werden. Es wurde nichts ge\u00e4ndert.',
            title: 'Ruhige Galaxie', body: 'Die Galaxie ist gerade ein stilles Bild. Die App startet kurz neu, um die bewegte Galaxie wieder zu starten.',
            reframe: 'Neuen Ausschnitt w\u00e4hlen', explore: 'Galaxie wieder erkunden', keep: 'Ruhig lassen'
        },
        es: {
            row: 'Galaxia quieta', sub: 'Ahorra bater\u00eda', on: 'S\u00ed', off: 'No', missing: 'Falta la imagen, elige otra vez',
            hint: 'Haz zoom y mueve la galaxia; luego toca Guardar.', save: 'Guardar', cancel: 'Cancelar',
            saved: 'Fondo guardado. La galaxia ahora est\u00e1 quieta y ya no se mueve en segundo plano.',
            savedThumb: 'Fondo guardado, con menos calidad: este dispositivo no pudo guardar la imagen completa.',
            savedNone: 'Este dispositivo no pudo guardar la imagen, as\u00ed que se usa un fondo sencillo y tranquilo.',
            no3d: 'La galaxia en movimiento no funciona ahora en este dispositivo, as\u00ed que se usa un fondo sencillo y tranquilo.',
            fail: 'No se pudo tomar la imagen. No se cambi\u00f3 nada.',
            title: 'Galaxia quieta', body: 'La galaxia es ahora una imagen quieta. La app se reinicia un momento para volver a iniciar la galaxia en movimiento.',
            reframe: 'Elegir otra vista', explore: 'Explorar la galaxia otra vez', keep: 'Dejarla quieta'
        }
    };
    const t = (l, k) => ((TX[l] || TX.en)[k]) || TX.en[k] || k;
    function savedText(pic, l) { return t(l, pic === 'idb' ? 'saved' : pic === 'thumb' ? 'savedThumb' : 'savedNone'); }

    return { KEY, THUMB_KEY, FRAME_KEY, DB, STORE, PIC, THUMB_W, FULL_MAX, parse, worldAtLaunch, pick, storedAs, fitSize, record, collect, disposeAll, TX, t, savedText };
});
