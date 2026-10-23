// Oct 22 2026 (Emmanuel, iPhone screenshot 14:51, Misty leaving a world: "these white boxes are annoying. Fix it. That doesn't look
// cool."): a THREE.Points or Sprite with no texture draws every particle as a solid square; her sparkle trail had none, so with the
// camera right behind her on the way out each sparkle became a big square, and additive mint over the light sky / a red planet is
// solid white. Every particle in the app is textured and transparent, sparkles never grow past SPARK.MAX_PX on screen, and with no
// texture nothing is drawn. The browser check of the real way out is tests/exit-sparkles-live.cjs.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../world-home-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const appJs = fs.readdirSync(root).filter(f => f.endsWith('.js') && !/^(three|sw)\b/.test(f) && !f.includes('.min.'));

/* the full `new THREE.PointsMaterial({ ... })` / SpriteMaterial call, balanced braces */
function calls(src, kind) {
    const out = [], re = new RegExp('new\\s+[A-Za-z_$.]*' + kind + '\\s*\\(', 'g'); let m;
    while ((m = re.exec(src))) {
        let i = m.index + m[0].length, depth = 1; const s = i;
        while (i < src.length && depth) { const ch = src[i++]; if (ch === '(') depth++; else if (ch === ')') depth--; }
        out.push({ at: src.slice(0, m.index).split('\n').length, body: src.slice(s, i - 1) });
    }
    return out;
}

test('every particle material in the app has a texture and is transparent (no bare squares)', () => {
    const bad = [];
    let n = 0;
    for (const f of appJs) {
        const src = read(f);
        for (const c of calls(src, 'PointsMaterial')) { n++; if (!/\bmap\s*:/.test(c.body)) bad.push(`${f}:${c.at} PointsMaterial without map`); if (!/transparent\s*:\s*true/.test(c.body)) bad.push(`${f}:${c.at} PointsMaterial not transparent`); }
    }
    assert.ok(n >= 3, 'found the particle materials (' + n + ')');
    assert.deepStrictEqual(bad, []);
});

test('her sparkle trail (wh-misty-sparkles) is a soft dot, and makes nothing without it', () => {
    const wh = read('world-home.js');
    const i = wh.indexOf("A.pts.name = 'wh-misty-sparkles'"); assert.ok(i > 0);
    const build = wh.slice(Math.max(0, i - 900), i);
    assert.match(build, /softDot\(THREE, D\)/);
    assert.match(build, /map: dot/);
    assert.match(build, /userData\.noTex = !dot/);
    const b = wh.slice(wh.indexOf('function burst(A, p, n, spread)'), wh.indexOf('function burst(A, p, n, spread)') + 400);
    assert.match(b, /noTex \|\| !A\.pts\.material\.map\) return/);
    assert.match(b, /sparkBlend\(/, 'plain alpha on a light sky, glow on a dark one');
    assert.match(wh, /C\.sparkTooBig\(sz, halfH, z\)/, 'a sparkle that grows past the cap ends');
});

test('the facing dots and the energy shot hide rather than draw without their dot', () => {
    const mt = read('misty-turn.js');
    assert.match(mt, /function dotMap\(THREE\)/);
    assert.strictEqual((mt.match(/map: dotMap\(THREE\)/g) || []).length, 2);
    assert.match(mt, /SH\.obj\.visible = !!SH\.obj\.material\.map/);
    assert.match(mt, /S\.pts\.visible = !!m\.map/);
});

test('Misty sprites never show before their picture is there (a Sprite with no map is a white box)', () => {
    const wh = read('world-home.js'), mf = read('misty-flight.js');
    assert.match(wh, /wand\.visible = wand\.material\.opacity > 0\.01 && !!wand\.material\.map/);
    assert.match(mf, /wand\.visible = wand\.material\.opacity > 0\.01 && !!wand\.material\.map/);
    assert.match(wh, /const vis = show && !!st\.misty\.material\.map;[^\n]*\n\s*if \(st\.misty\.visible !== vis\) st\.misty\.visible = vis;/);
    for (const f of appJs) for (const c of calls(read(f), 'SpriteMaterial')) {
        if (/\bmap\s*:/.test(c.body)) continue;
        assert.ok(['world-home.js'].includes(f), `${f}:${c.at} SpriteMaterial without map must be guarded`);
    }
});

test('sparkle size cap: three.js point size on screen, capped at SPARK.MAX_PX', () => {
    assert.ok(C.SPARK.MAX_PX >= 10 && C.SPARK.MAX_PX <= 24);
    assert.strictEqual(C.sparkPx(0.11, 422, 4), 0.11 * 422 / 4);
    assert.strictEqual(C.sparkPx(0.11, 422, 0), Infinity);
    assert.ok(!C.sparkTooBig(0.11, 422, 6), 'a normal sparkle at home stays');
    assert.ok(C.sparkTooBig(0.11, 422, 0.5), 'a sparkle half a unit from the camera (~93 px) ends');
    assert.ok(C.sparkTooBig(0.11, 422, 2, 20), 'explicit cap');
});

test('capPoints: the points shader clamps gl_PointSize, and says when it took', () => {
    const m = { userData: {} }; C.capPoints(m, 54);
    assert.strictEqual(m.userData.maxPS.value, 54);
    const vs = 'void main() {\n\tgl_PointSize = size;\n\t#ifdef USE_SIZEATTENUATION\n\t\tgl_PointSize *= ( scale / - mvPosition.z );\n\t#endif\n\t#include <logdepthbuf_vertex>\n}';
    const sh = { uniforms: {}, vertexShader: vs }; m.onBeforeCompile(sh);
    assert.strictEqual(m.userData.capped, true);
    assert.strictEqual(sh.uniforms.maxPS, m.userData.maxPS, 'live uniform, updated every frame');
    assert.ok(sh.vertexShader.indexOf('gl_PointSize = min( gl_PointSize, maxPS );') > sh.vertexShader.indexOf('scale / - mvPosition.z'), 'clamped after the distance scaling');
    assert.match(sh.vertexShader, /^uniform float maxPS;/);
    const m2 = { userData: {} }; C.capPoints(m2, 10); m2.onBeforeCompile({ uniforms: {}, vertexShader: 'void main(){}' });
    assert.ok(!m2.userData.capped, 'a shader without points code is left alone, and the JS drop stays on');
    C.capPoints(m, 60); assert.strictEqual(m.userData.maxPS.value, 60);
    const v = fs.readFileSync(path.join(root, 'vendor', fs.readdirSync(path.join(root, 'vendor')).find(f => /^three-.*module\.min\.js$/.test(f))), 'utf8');
    assert.ok(/gl_PointSize \*= \( scale \/ - mvPosition\.z \);\\n\\t#endif\\n\\t#include <logdepthbuf_vertex>/.test(v), 'the vendored three.js points shader still has the line the cap hooks on');
    const wh = read('world-home.js'), mt = read('misty-turn.js');
    assert.match(wh, /C\.capPoints\(A\.pts\.material/);
    assert.strictEqual((mt.match(/capped\(p\.material, a\)/g) || []).length, 2);
});

test('softDot: a round, soft, transparent texture, or null when the canvas cannot draw', () => {
    const stops = [];
    const ctx = { createRadialGradient: () => ({ addColorStop: (o, c) => stops.push([o, c]) }), fillRect() { }, set fillStyle(v) { } };
    const doc = { createElement: () => ({ getContext: () => ctx }) };
    function CanvasTexture(cv) { this.image = cv; }
    const t = C.softDot({ CanvasTexture }, doc);
    assert.ok(t && t.image, 'a texture');
    assert.strictEqual(t.image.width, C.SPARK.TEX);
    assert.match(stops[0][1], /rgba\(255,255,255,1\)/);
    assert.match(stops[stops.length - 1][1], /rgba\(255,255,255,0\)/, 'edge fully transparent: round, never a square');
    assert.strictEqual(C.softDot({ CanvasTexture }, { createElement: () => ({ getContext: () => null }) }), null);
    assert.strictEqual(C.softDot({}, doc), null);
    const T = { NormalBlending: 1, AdditiveBlending: 2 };
    assert.strictEqual(C.sparkBlend(T, true), 1);
    assert.strictEqual(C.sparkBlend(T, false), 2);
});
