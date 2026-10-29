'use strict';
/* Oct 28 2026 slim structure batch 9 (Emmanuel: "Ich möchte, dass du jetzt alles umsetzt"): every setting in Profile.
   The notification master controls (LowiN1 sheet: on/off, how often, quiet hours, phone push) and About & info join Settings,
   which Profile (Du) and the Community hold's Settings share as one list. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'home-settings-sleep-v2.js'), 'utf8');
const SS = require('../home-settings-sleep-v2.js');

test('Settings has Mitteilungen and Über & Hinweise, in German, English and Spanish', () => {
    assert.ok(SS.SETTINGS_IDS.includes('notifications'));
    assert.ok(SS.SETTINGS_IDS.includes('about'));
    assert.strictEqual(SS.SETTINGS_IDS[SS.SETTINGS_IDS.length - 1], 'about', 'About is last');
    assert.match(js, /notifications: 'Mitteilungen', (support: '[^']*', )?about: '\\u00dcber & Hinweise'/);
    assert.match(js, /notifications: 'Notifications', (support: '[^']*', )?about: 'About & info'/);
    assert.match(js, /notifications: 'Avisos', (support: '[^']*', )?about: 'Acerca de'/);
});

test('Mitteilungen opens the one notification sheet, About opens a small info sheet', () => {
    assert.match(js, /notifications: \{ has: \(\) => !!\(root\.LowiN1 && fn\(root\.LowiN1, 'openSet'\)\), run: \(\) => root\.LowiN1\.openSet\(\) \}/);
    assert.match(js, /about: \{ has: \(\) => !!\(root\.LowiR2 && fn\(root\.LowiR2, 'sheet'\)\), run: openAbout \}/);
    const a = js.slice(js.indexOf('function openAbout()'), js.indexOf('const ROUTES = {'));
    assert.match(a, /not medical advice/);
    assert.match(a, /keine medizinische Beratung/);
    assert.match(a, /Open Food Facts/);
});

test('the one settings page (Oct 29 2026) lists Notifications and About & info and runs them through the same routes', () => {
    const M = require('../community-me.js');
    const ids = M.groups(() => true).flatMap(g => g.ids);
    assert.ok(ids.includes('notifications') && ids.includes('about'));
    assert.ok(!M.OWN.includes('notifications') && !M.OWN.includes('about'), 'both run through the Settings routes');
});
