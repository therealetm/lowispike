'use strict';
/* Nov 5 2026 (Emmanuel: "nuke the bloat" in My day; a photo of toothpaste still offered the eat time and Log as meal).
   My day: one Today card (Catch up on today + Day recap) and short grouped rows instead of ten equal round bubbles.
   Photo result: when the check sees no food, only the line, Retake photo and "It's food, let me type it"; the form, eat time,
   Save photo and GPT link come back only after that tap. The AI consent points to Settings, where About & info really is. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fnBody = (s, head) => { const i = s.indexOf(head); assert.ok(i >= 0, head); let d = 0, j = s.indexOf('{', i); for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } } return s.slice(i); };

const hub = src('misty-hub.js'), hubCss = src('misty-hub.css');

test('My day: a Today card and grouped rows, no round bubbles', () => {
    const h = fnBody(hub, 'function dayHtml()');
    assert.match(h, /mh-dcard/, 'Today card');
    assert.match(h, /data-myday="catchup"/, 'Catch up on today is the card\'s main button');
    assert.match(h, /data-myday="recap"/, 'Day recap is the second button');
    assert.match(h, /\['food',[^\]]*\], \['body',[^\]]*\], \['more'/, 'three groups: Food, Body, More');
    assert.doesNotMatch(h, /orb\(/, 'no round bubbles in My day any more');
    assert.match(fnBody(hub, 'function dayRow('), /class="mh-row" data-myday=/, 'every row keeps data-myday, so the old click handler still runs it');
});

test('My day: clear names instead of Extras / Your plate, every old part still there', () => {
    const items = fnBody(hub, 'function dayItems()');
    for (const k of ['catchup', 'recap', 'macro', 'inside']) assert.match(items, new RegExp("k: '" + k + "'"), k);
    assert.match(items, /#g2hTiles \[data-g2h-open\]/, 'rows still mirror the old shortcut tiles');
    assert.match(hub, /plan: \['Food log'/);
    assert.match(hub, /more: \['SOS & streak'/);
    assert.match(hub, /const DAY_GROUP = \{ plan: 'food', meals: 'food', book: 'food', morn: 'body', meds: 'body', have: 'more', more: 'more' \}/);
    const act = fnBody(hub, 'function dayAct(');
    assert.match(act, /proxy\('data-g2h-open', k\.slice\(2\)\)/, 'a row does what its old tile did');
    assert.match(act, /proxy\('data-sp', 'goals'\)/);
    assert.match(act, /LowiDayRecap\.open/);
    assert.match(act, /LowiEveningCatchup\.open/);
});

test('My day look: 44 pt+ targets, neutral greys (no navy), calm under Reduce Motion', () => {
    const i = hubCss.indexOf('My day without the bloat'); assert.ok(i > 0);
    const css = hubCss.slice(i);
    assert.match(css, /\.mh-row \{[^}]*min-height: 56px/);
    assert.match(css, /\.mh-dbtn \{[^}]*min-height: 44px/);
    assert.doesNotMatch(css, /rgba\(\s*(1[0-9]|[0-9]),\s*(1[0-9]|2[0-9]),\s*(3[0-9]|4[0-9])/, 'no navy tint');
    assert.match(css, /prefers-reduced-motion: reduce\) \{ \.mh-dbtn \{ transition: none/);
});

const fai = src('food-photo-ai.js'), scanCss = src('scan-screens.css'), spirit = src('spirit.js');

test('not food: Retake photo first, the meal form waits for "It\'s food"', () => {
    assert.match(fai, /const sayNone = \(\) => \{/);
    assert.match(fnBody(fai, 'const sayNone = () =>'), /class="fai-retake" data-sp="photo"/, 'Retake reuses the camera action');
    assert.match(fnBody(fai, 'const sayNone = () =>'), /data-fai-type/);
    assert.match(fai, /if \(!res\.isFood\) \{ sayNone\(\); return res; \}/);
    assert.match(fai, /if \(dishes\.length\) paint\(res\); else sayNone\(\);/, 'removing every dish ends in the same not-food view');
    assert.match(fai, /box\.className = 'sp-ai fai fai-wait'; noFood\(false\);/, 'a new look (Try again) clears it');
    for (const k of ['noneRetake', 'noneType']) assert.strictEqual((fai.match(new RegExp(k + ": '", 'g')) || []).length, 3, k + ' in EN/DE/ES');
    assert.match(scanCss, /\.r2-sh\.fai-nofood:not\(\.fai-typing\) :is\(\.sp-photo-form, \.sp-photo-acts, \.sp-gpt\) \{ display: none !important; \}/);
    assert.match(scanCss, /\.fai-retake \{[^}]*min-height: 50px/);
});

test('photo sheet: the long GPT upload line is gone, the GPT link stays', () => {
    const ps = fnBody(spirit, 'function photoSheet()');
    assert.doesNotMatch(ps, /photoGptHint/);
    assert.match(ps, /gptHTML\(\)/);
});

test('AI consent: remembered, and it points to Settings > About & info', () => {
    const sr = src('store-ready.js');
    assert.match(sr, /if \(!force && v\) return Promise\.resolve\(v === 'yes'\)/, 'once answered it is not asked again');
    assert.match(sr, /Settings > About & info/);
    assert.match(sr, /Einstellungen > \u00dcber & Hinweise/);
    assert.doesNotMatch(sr, /Profile > About & info|Profil > \u00dcber/);
    assert.match(src('home-settings-sleep-v2.js'), /SETTINGS_IDS = \[[^\]]*'about'/, 'About & info really is in Settings');
});
