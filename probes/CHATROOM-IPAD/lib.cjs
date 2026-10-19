'use strict';
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const base = L.VIEWS.ipadL[1];
const mk = (w, h) => ['webkit', Object.assign({}, base, { viewport: { width: w, height: h }, screen: { width: w, height: h } })];
Object.assign(L.VIEWS, { ipadL: mk(1180, 820), ipadP: mk(820, 1180), pro13L: mk(1366, 1024), pro13P: mk(1024, 1366) });
module.exports = L;
