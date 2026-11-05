'use strict';
/* Oct 25 2026: server-side spike word list for Give a hand baskets (gift_items_ok() in
   supabase/proposals/gift_baskets_20261025.sql). The app already refuses anything LowiFoodPolicy.rateName() does not
   rate JA; this list only stops a tampered app from posting obvious spike foods. It must never refuse a food the app
   accepts: tools/gift-basket/deny-corpus.cjs proves that against every food string in the repo.
   Each term: s = must start at a word start, e = must end at a word end (German compounds: 'saft' ends Apfelsaft). */
const { DENY_TERMS: TERMS, DENY_EXCEPT: EXCEPT } = require('../../gift-basket-core.js');  /* Nov 5 2026: the one word list lives in the app now */
/* phrases taken out before matching: sugar snap peas, sugar free, etc. */
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ -]?');
const JS_RE = TERMS.map(([t, s, e]) => (s ? '(?<![\\p{L}\\p{N}])' : '') + escRe(t) + (e ? '(?![\\p{L}\\p{N}])' : '')).join('|');
const SQL_RE = TERMS.map(([t, s, e]) => (s ? '\\m' : '') + escRe(t) + (e ? '\\M' : '')).join('|');
const EXCEPT_RE = EXCEPT.map(escRe).join('|');
const jsDeny = new RegExp(JS_RE, 'iu'), jsExcept = new RegExp(EXCEPT_RE, 'giu');
function refused(name) { const n = String(name || '').toLowerCase().replace(jsExcept, ' '); return jsDeny.test(n); }
module.exports = { TERMS, EXCEPT, JS_RE, SQL_RE, EXCEPT_RE, refused };
