'use strict';
/* Oct 28 2026 slim structure batch 7 (Emmanuel: "Ich möchte, dass du jetzt alles umsetzt"): Community clean-up, conservative.
   C-08: welcome and the community rules are one card (4 steps, "I agree" under the rules).
   C-06: chat settings live in Profile only (Profil › Dein Auftritt), the Community menu has no second Chat settings row.
   Kept: the tabs, the galaxy and Affiliates. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'community-rooms-ui.js'), 'utf8');
const me = fs.readFileSync(path.join(__dirname, '..', 'community-me.js'), 'utf8');

test('C-08: welcome card carries the rules, 4 steps', () => {
    assert.match(js, /if\(obI===0\)return[^\n]*\n[^\n]*rm-ob-rules-h[^\n]*obR1/);
    assert.match(js, /obI===0\?tr\('obAgree'\)/);
    assert.match(js, /aria-valuemax="4"/);
    assert.match(js, /const last=obI===3/);
    assert.match(js, /if\(obI===2\)\{const f=/, 'profile step is the third');
});

test('C-06: no Chat settings row in the Community menu, Profile keeps the way in', () => {
    const m = js.slice(js.indexOf('function menuItems()'), js.indexOf('function paintMenu()'));
    assert.doesNotMatch(m, /it\.push\(\['settings'/);
    assert.match(m, /it\.push\(\['welcome'/, 'Welcome & rules stays in the menu');
    assert.match(m, /it\.push\(\['profile'/, 'Profile stays in the menu');
    assert.match(me, /has\('presence'\)/, 'Profile has the presence tile that opens LowiCommunity.settings');
});
