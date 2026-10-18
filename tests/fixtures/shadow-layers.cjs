'use strict';
/* Shadow-layer parsing shared by tests/bubble-bottom-shadow.test.cjs and tests/bubble-bottom-shadow-live.cjs. Not a test file. */
function splitTop(s) { const out = []; let depth = 0, cur = ''; for (const ch of String(s)) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
function lengths(layer) { const noFn = layer.replace(/[a-z-]+\([^()]*(\([^()]*\)[^()]*)*\)/gi, ' '); return (noFn.match(/-?\d*\.?\d+(px)?(?=\s|$)/g) || []).map(parseFloat); }
function shadowLayers(value) {
    if (!value || value === 'none') return [];
    return splitTop(value).map(l => { const n = lengths(l); return { raw: l, inset: /\binset\b/.test(l), x: n[0] || 0, y: n[1] || 0, blur: n[2] || 0 }; });
}
/* a bottom shadow: a drop shadow pushed below the shape, or an inset shade coming up from its lower edge */
function bottomLayers(value) { return shadowLayers(value).filter(L => (!L.inset && L.y > 0) || (L.inset && L.y < 0)); }
function dropShadowsBelow(filter, maxY) { const out = []; const re = /drop-shadow\(([^()]*(\([^()]*\)[^()]*)*)\)/g; let m; while ((m = re.exec(String(filter)))) { const n = lengths(m[1]); if ((n[1] || 0) > maxY) out.push(m[0]); } return out; }

module.exports = { splitTop, lengths, shadowLayers, bottomLayers, dropShadowsBelow };
