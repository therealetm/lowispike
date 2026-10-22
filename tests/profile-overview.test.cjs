/* Oct 22 2026 (Emmanuel: "one click on account and then you see this overview ... so it's more übersichtlich", and the round arrow
   sitting on the Account "Back" pill). Every way into Profile opens the overview, Back from a part goes to the overview, there is one
   back control in a part's header, and Profile never reopens the part that was open last. The browser check is
   tools/probe-profile-overview.cjs (iPhone SE / 13 / 15 with a pretend notch / Pixel 7). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html'), hs = read('home-settings-sleep-v2.js'), sn = read('section-nav.js'), snc = read('section-nav.css');
const g2e = (() => { const i = html.indexOf('window.LowiG2E = {'); assert.ok(i > 0, 'the Profile overview module is in index.html'); return html.slice(html.lastIndexOf('<script', i), html.indexOf('</script>', i)); })();

test('entries: Settings > Account, Me and Look & sound open the Profile overview, never a sub-panel', () => {
    const routes = hs.slice(hs.indexOf('const ROUTES = {'), hs.indexOf('};', hs.indexOf('const ROUTES = {')));
    for (const id of ['me', 'account', 'look']) assert.match(routes, new RegExp('\\b' + id + ': \\{[^}]*run: profileHome'), id + ' opens the overview');
    assert.doesNotMatch(hs, /profileTile|LowiG2E\.open|G\.open\(/, 'nothing in Settings opens a Profile part directly');
    assert.match(hs, /const profileHome = \(\) => \{[^\n]*G\.overview\(\)/);
});

test('entries: no file outside the overview opens a Profile part by itself', () => {
    /* your-details.js is the one exception: a row for one field (gender, blood pressure, order) opens About you to edit that field */
    const ALLOW = { 'your-details.js': true };
    const files = fs.readdirSync(path.join(__dirname, '..')).filter(f => /\.js$/.test(f));
    for (const f of files) {
        const src = read(f);
        assert.doesNotMatch(src, /LowiG2E\.open\(\s*['"]acct/, f + ' must not open the Account part directly');
        if (!ALLOW[f]) assert.doesNotMatch(src, /LowiG2E\.open\(/, f + ' must not open a Profile part');
    }
    const rest = html.replace(g2e, '');
    assert.doesNotMatch(rest, /LowiG2E\.open\(/, 'index.html outside the overview module must not open a Profile part');
});

test('overview(): closes any open part and goes to Profile; coming back to Profile resets to the overview', () => {
    assert.match(g2e, /window\.LowiG2E = \{open:openPanel, close:closePanel, overview,/);
    const ov = g2e.slice(g2e.indexOf('function overview(){'), g2e.indexOf('window.LowiG2E = {'));
    assert.match(ov, /classList\.remove\("g2e-open"\)/);
    assert.match(ov, /lowiOpen\("profile"\)|goTab\("profile"\)/);
    /* no last-panel memory: Profile becoming visible again drops a part left open */
    assert.match(g2e, /if \(vis && !wasShown && H\.classList\.contains\("g2e-open"\)\) \{ H\.classList\.remove\("g2e-open"\)/);
    assert.doesNotMatch(g2e, /localStorage|sessionStorage/, 'the open part is never stored');
    /* a tile tap marks Profile as shown so the reset does not undo it */
    assert.match(g2e, /wasShown = shown\(t\); H\.setAttribute\("data-g2e-k", k\); H\.classList\.add\("g2e-open"\)/);
});

test('back: one back control in a part; the round Home arrow hides there; system back / swipe returns to the overview', () => {
    assert.match(snc, /html\.g2e-on\.g2e-open \.sec-x\{display:none!important\}/, 'the round arrow no longer sits on the Back pill');
    assert.match(sn, /tabOf\(\) === 'profile' && H\.classList\.contains\('g2e-open'\)\) \{ try \{ W\.LowiG2E\.close\(\); return true;/);
    /* the header Back pill keeps a 44px tap target and goes to the overview */
    assert.match(html, /\.g2e-back\{[^}]*min-height:44px/);
    /* the title stops before the theme switch and the X on the right (iPhone SE: "Look & sound" ran under them) */
    assert.match(read('top-bar.css'), /html\.g2e-on\.g2e-open #tab-profile > #g2eHead\{padding-right:124px!important\}/);
    assert.match(g2e, /data-g2e-back[\s\S]{0,200}closePanel\(\)|closest\("\[data-g2e-back\]"\)[\s\S]{0,120}closePanel/);
});

test('probe: the browser check exists and covers every entry, every tile, day mode, DE/ES and the notch', () => {
    const p = read('tools/probe-profile-overview.cjs');
    for (const s of ["run(id)", "'account', 'me'", '#pfBtn', 'data-g2e-open', "'de', 'es'", 'NOTCH', 'back too small', 'covered by', 'title under']) assert.ok(p.includes(s), 'probe checks ' + s);
});
