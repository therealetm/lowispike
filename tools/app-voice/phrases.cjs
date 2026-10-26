#!/usr/bin/env node
/* tools/app-voice/phrases.cjs: every sentence the app can say out loud, per language, for tools/app-voice/build.py (and the tests).
   Reads the words straight from the code that speaks them, so a changed cue or chapter shows up here (and gets recorded) by itself:
   - Mirror mode (mirror-move-core.js MOVES + HINTS, the T('..','..','..') lines mirror-move.js says, counts)   en de es
   - the scan-ball guide (index.html g1js ROWS, the news offer lines, version.json news: text, lead, steps)      en de es
   - the Move player cues (index.html MOVES), Audio mode, Listen and learn (FORMATS, MOVES, BODY), food picks       en
   - Learn while you move (index.html R3W_BOOK and the coach lines around it)                                   en
   - Audio mode reading notifications aloud: every fixed toast("...") text                                          en
   - Gap's "After your meal" phase cards (gap-view.js mcSpoken)                                                       en de es
   - the Move grand finish (move-finish-core.js SAY)                                                                  en de es
   Usage: node tools/app-voice/phrases.cjs            -> JSON {sources:{name:count}, pieces:{lang:[sentence...]}}
          node tools/app-voice/phrases.cjs --news     -> only version.json's news (what a release adds) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const V = require(path.join(ROOT, 'app-voice.js'));
const LANGS = ['en', 'de', 'es'];
const NEWS_PARAS = 3; /* index.html g1js say() reads the same 3 */

/* a literal (array/object) written in the source, evaluated with every unknown name as a harmless stub */
function literalAt(src, at, what) {
    if (at < 0) throw new Error('app-voice phrases: cannot find ' + what);
    let i = src.indexOf('=', at) + 1; while (/\s/.test(src[i])) i++;
    const open = src[i], close = open === '[' ? ']' : '}'; let depth = 0, j = i, q = null;
    for (; j < src.length; j++) {
        const c = src[j];
        if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
        if (c === '"' || c === "'" || c === '`') { q = c; continue; }
        if (c === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); continue; }
        if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j) + 1; continue; }
        if (c === open) depth++; else if (c === close && --depth === 0) break;
    }
    const stub = new Proxy(function () { return stub; }, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : stub, apply: () => stub });
    const ctx = vm.createContext(new Proxy({}, { has: () => true, get: (t, k) => (k in globalThis ? globalThis[k] : stub) }));
    return vm.runInContext('(' + src.slice(i, j + 1) + ')', ctx);
}
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function harvest(newsOnly) {
    const out = {}, src = {};
    const add = (name, lang, ...texts) => { for (const t of texts) { if (t == null || t === '') continue; for (const p of V.pieces(t)) { (out[lang] = out[lang] || new Set()).add(p); src[name] = (src[name] || 0) + 1; } } };
    const tri = (name, o) => { if (!o) return; if (typeof o === 'string') return add(name, 'en', o); for (const l of LANGS) add(name, l, o[l] || o.en); };

    /* ---- news (each release records its own, scripts/release.sh) ---- */
    let ver = {}; try { ver = JSON.parse(read('version.json')); } catch (e) { }
    const n = ver.news || {};
    /* the guide reads only the newest part of the news (the text keeps every release's notes, newest first): NEWS_PARAS paragraphs */
    const top = o => { if (!o || typeof o !== 'object') return o; const r = {}; for (const l of Object.keys(o)) r[l] = String(o[l] || '').split(/\n\s*\n/).slice(0, NEWS_PARAS).join('\n\n'); return r; };
    tri('news', top(n.text)); tri('news', n.lead); (n.steps || []).forEach(s => tri('news', s && s.text));
    if (newsOnly) return { out, src };

    const html = read('index.html');

    /* ---- Mirror mode ---- */
    global.window = undefined;
    const C = require(path.join(ROOT, 'mirror-move-core.js'));
    const txt = (o, l) => (o && typeof o === 'object') ? (o[l] || o.en || '') : (o || '');
    for (const l of LANGS) {
        Object.values(C.MOVES || {}).forEach(m => add('mirror', l, txt(m.n, l) + '. ' + txt(m.cue, l), txt(m.n, l)));
        Object.values(C.HINTS || {}).forEach(h => add('mirror', l, txt(h, l)));
        for (let k = 1; k <= 10; k++) add('mirror', l, String(k));
    }
    const mm = read('mirror-move.js');
    for (const m of mm.matchAll(/say\(T\('((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\)/g)) { add('mirror', 'en', m[1]); add('mirror', 'de', m[2]); add('mirror', 'es', m[3]); }

    /* ---- Move grand finish (move-finish-core.js SAY, the companion's line at the end of a session) ---- */
    const MF = require(path.join(ROOT, 'move-finish-core.js'));
    for (const l of LANGS) (MF.SAY[l] || []).forEach(s => add('move-finish', l, s));

    /* ---- scan-ball guide ---- */
    const g1 = html.indexOf('id="g1js"');
    const ROWS = literalAt(html, html.indexOf('const ROWS = [', g1), 'g1js ROWS');
    ROWS.forEach(r => { if (r[1] && r[1].length > 12) { add('guide', 'en', r[1]); add('guide', 'de', r[2]); add('guide', 'es', r[3]); } });
    tri('guide', { en: 'Here it is.', de: 'Hier ist es.', es: 'Aquí está.' });
    tri('guide', { en: 'One new thing in this update. Want me to show you where?', de: 'Eine neue Sache in diesem Update. Soll ich dir zeigen, wo?', es: 'Una novedad en esta versión. ¿Te enseño dónde?' });
    for (let k = 2; k <= 15; k++) tri('guide', { en: k + ' new things in this update. Want me to show you each one?', de: k + ' neue Sachen in diesem Update. Soll ich dir jede zeigen?', es: k + ' novedades en esta versión. ¿Te enseño cada una?' });

    /* ---- Move player, Audio mode, Listen and learn (English) ---- */
    const mvAt = html.indexOf('window.MOVE = {showTab');
    const MOVES = literalAt(html, html.lastIndexOf('const MOVES = {', mvAt), 'Move MOVES');
    const FORMATS = literalAt(html, html.lastIndexOf('const FORMATS = {', mvAt), 'Move FORMATS');
    const BODY = literalAt(html, html.lastIndexOf('const BODY = {', mvAt), 'Move BODY');
    const ms = Object.values(MOVES);
    ms.forEach(m => add('move', 'en', m.n, m.n + '. ' + (m.cue || ''), 'Next, ' + m.n, 'Next up: ' + m.n + '.', 'First: ' + m.n + '.', m.easy ? 'Easier version: ' + m.easy : ''));
    add('move', 'en', 'Rest. Next, cool down', 'Audio on', 'Voice cues on', 'Audio mode on. I\'ll keep it short.',
        'Your session. Listen once now, and again before you move. Repeating it is how it sticks.',
        'That\'s it. Moving soon after a meal helps your muscles pull sugar out of your blood. Stop if anything hurts.');
    Object.values(FORMATS).forEach(f => add('move', 'en', (f.n || 'Your session') + '. ' + (f.sub || '')));
    Object.values(BODY).forEach(list => (list || []).forEach(b => add('move', 'en', b.t + '. ' + b.d)));
    const RB = literalAt(html, html.indexOf('const RECIPE_BOOK = ['), 'RECIPE_BOOK');
    add('move', 'en', 'Your pick:'); RB.forEach(r => r && r.r !== 'nein' && r.n && add('food', 'en', r.n));

    /* ---- Learn while you move (English) ---- */
    const BOOK = literalAt(html, html.indexOf('const R3W_BOOK = ['), 'R3W_BOOK');
    let num = 0;
    BOOK.forEach(c => {
        if (!c.once) num++;
        const title = c.once ? c.t + '.' : 'Chapter ' + num + '. ' + c.t + '.';
        add('book', 'en', title, 'Picking up ' + title, c.k, 'Quick recap. ' + (c.k || ''));
        (c.s || []).forEach(s => add('book', 'en', s));
    });
    add('book', 'en', 'Easy walking.', 'Rest.', 'Cool-down.', 'Easy walking pace.', 'First: Easy walking pace.', 'Cool-down. Easy walking pace.', 'Brisk pace now. You can still talk, but not sing.',
        'We\'ll finish this chapter next time. Nice work.', 'That\'s it for today. Nice work.', 'That\'s the whole book. Let\'s go again from the top. The second listen is where it sticks.');

    /* ---- notifications read aloud (Audio mode): the fixed toast texts, cleaned like the reader cleans them ---- */
    const clean = s => s.replace(/[^\p{L}\p{N}\s.,!?€%:'’-]/gu, '');
    for (const m of html.matchAll(/\b(?:toast|r5toast)\(\s*"((?:[^"\\]|\\.){3,160})"\s*\)/g)) { const t = m[1]; if (!/\\u|<|\$\{/.test(t)) add('toast', 'en', clean(t.replace(/\\'/g, "'"))); }
    for (const m of html.matchAll(/\b(?:toast|r5toast)\(\s*'((?:[^'\\]|\\.){3,160})'\s*\)/g)) { const t = m[1]; if (!/\\u|<|\$\{/.test(t)) add('toast', 'en', clean(t.replace(/\\'/g, "'"))); }
    /* ---- Affiliates page: every script line read aloud (22 Oct 2026, affiliates/script-voice.js) ---- */
    const AB = require(path.join(ROOT, 'affiliates', 'blueprint-core.js')), AV = require(path.join(ROOT, 'affiliates', 'script-voice.js'));
    for (const l of LANGS) AV.sayable(AB, l).forEach(x => add('affiliates', l, x));
    /* ---- Gap's "After your meal" cards read aloud (24 Oct 2026, gap-view.js mcSpoken: title, time, the two lines, the levers) ---- */
    const GV = require(path.join(ROOT, 'gap-view.js'));
    for (const l of LANGS) GV.phases.forEach((p, i) => add('gap', l, GV.mcSpoken(i, l)));
    return { out, src };
}

if (require.main === module) {
    const { out, src } = harvest(process.argv.includes('--news'));
    const pieces = {}; for (const l of Object.keys(out).sort()) pieces[l] = [...out[l]];
    process.stdout.write(JSON.stringify({ sources: src, pieces }));
}
module.exports = { harvest, literalAt, NEWS_PARAS };
