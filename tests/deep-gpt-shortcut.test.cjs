// Oct 21, 2026 evening (E-man): "That deep analyze button is simply a shortcut to my custom GPT. It should be very quick. I open the app,
// I click on Scan, I click on Deep analyze, and I get to the custom GPT really fast."
// Deep analyze on the Scan screen and on the not-found card is one plain link to the GPT recovered from git history (Oct 15, 9d517f2).
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const GPT = 'https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike';

const cut = (a, b) => { const i = html.indexOf(a); assert.ok(i > 0, a + ' missing'); const j = html.indexOf(b, i); assert.ok(j > i, b + ' missing'); return html.slice(i, j); };

function build() {
    const src = cut('function deepLink(cls, attrs, title, sub){', 'function camAct(act){');
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const deepURL = () => GPT;
    // eslint-disable-next-line no-new-func
    return new Function('esc', 'deepURL', 'IC_SPARK', 'IC', src + '; return deepLink;')(esc, deepURL, '<svg/>', { chev: '<svg/>' });
}

test('the GPT is the one already in the app (Oct 15 scanner link), not an invented URL', () => {
    assert.ok(html.includes('const DEEP_GPT = "' + GPT + '";'));
    assert.ok(html.includes('gpt:"' + GPT + '"'), 'same GPT as the vitals bridge');
});

test('deepLink renders a real link straight to the GPT that opens outside the app', () => {
    const a = build()('b3-deep', 'id="b3Deep"', 'Deep analyze', 'Opens the LOWiSPIKE GPT in ChatGPT');
    assert.ok(a.startsWith('<a class="b3-deep" id="b3Deep" href="' + GPT + '" target="_blank" rel="noopener">'), a);
    assert.ok(!/data-b3/.test(a), 'no data-b3: the scanner click handler calls preventDefault on those and would swallow the tap');
    assert.ok(!/onclick|capture|<input/.test(a), 'no photo step, no camera');
});

test('the scanner click handler leaves the link alone (it only handles [data-b3])', () => {
    const h = cut('document.addEventListener("click", e => {\n  const b = e.target.closest("[data-b3]"); if (!b) return;', 'case "camact"');
    assert.ok(h.indexOf('if (!b) return;') < h.indexOf('e.preventDefault()'), 'returns before preventDefault for elements without data-b3');
});

test('Scan bar and not-found card both use the link; the in-app sheet and its camera path are gone', () => {
    const bar = cut('function camBar(){', 'function deepLink(');
    assert.ok(bar.includes('deepLink("b3-deep", \'id="b3Deep"\', t("deep"), t("deepS"))'));
    assert.ok(!/<button[^>]*b3-deep/.test(bar));
    const man = cut('function manualHTML(p){', '/* prod-verdict');
    assert.ok(man.includes('deepLink("b3-nfdeep", \'id="b3NfDeep"\', t("deepNf"), t("deepNfS"))'));
    assert.ok(!/act === "deep"/.test(html), 'camAct has no Deep analyze branch any more');
    assert.ok(!fs.existsSync(path.join(root, 'deep-analyze.js')));
});

test('Deep analyze texts in en, de and es say where the tap goes', () => {
    for (const k of ['deepS', 'deepNfS']) {
        const m = html.match(new RegExp('\\n  ' + k + ': \\[("[^"]+"), ("[^"]+"), ("[^"]+")\\]'));
        assert.ok(m, k);
        assert.ok(m.slice(1).every(x => /GPT/.test(x)), k + ' names the GPT in every language');
        assert.ok(!m.slice(1).some(x => /photo|Foto|foto/.test(x)), k + ' promises no photo');
    }
});
