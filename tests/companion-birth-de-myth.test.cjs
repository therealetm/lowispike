'use strict';
/* Bug hunt Oct 23 19:03 (onboarding): the German sign reveal read "Geboren aus die zwei Fische von Aphrodite und Eros" /
   "Geboren aus der goldene Widder". "aus" takes the dative, so every German myth phrase must be in the dative
   ("aus den zwei Fischen", "aus dem goldenen Widder"). The phrase is only ever used after "Geboren aus". */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const decode = s => s.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
const C = require('../companion-birth-core.js');
const src = decode(fs.readFileSync(path.join(__dirname, '..', 'companion-birth.js'), 'utf8'));
const tpl = (src.match(/de:\{waking:[\s\S]*?myth:'([^']+)'/) || [])[1];

const WANT = {
    aries: 'dem goldenen Widder', taurus: 'dem Stier der Europa', gemini: 'den Zwillingen Castor und Pollux',
    cancer: 'dem Mondkrebs der Hera', leo: 'dem Sonnenlöwen von Nemea', virgo: 'der Sternenernte der Astraea',
    libra: 'der Waage der Themis', scorpio: 'dem Sternskorpion Antares', sagittarius: 'dem Bogenschützen Chiron',
    capricorn: 'der Meeresziege Amalthea', aquarius: 'dem Wasserträger Ganymed', pisces: 'den zwei Fischen von Aphrodite und Eros'
};

test('German reveal: "Geboren aus" is followed by the dative for every star sign', () => {
    assert.ok(tpl && tpl.startsWith('Geboren aus {myth}'), 'German template still starts with "Geboren aus {myth}"');
    for (const sign of C.SIGN_KEYS) {
        const line = tpl.replace('{myth}', C.myth(sign, 'de'));
        assert.doesNotMatch(line, /^Geboren aus (die|das) /, sign + ': ' + line);
        assert.equal(C.myth(sign, 'de'), WANT[sign], sign);
        assert.match(line, /^Geboren aus (dem|den|der) /, sign + ': ' + line);
    }
});

test('English and Spanish myth phrases are unchanged', () => {
    assert.equal(C.myth('pisces', 'en'), 'the two fish of Aphrodite and Eros');
    assert.equal(C.myth('aries', 'es'), 'el carnero dorado');
});
