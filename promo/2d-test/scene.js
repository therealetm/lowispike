/* PROMO6 cartoon: flat 2D, early-2000s look (bold outlines, flat muted colours). Connie is a code puppet; every pose is computed per frame.
   The companion is NOT drawn here: it is the real companion captured from the live app (comp/*.png), placed on the canvas layer. */
const NS = 'http://www.w3.org/2000/svg';
const FPS = 30, DT = 1 / FPS;
const TL = window.TL; // injected timeline (mouth envelopes + captions)
const N = Math.round(8.4 * FPS); // cartoon part: 0 .. 8.4 s, then the cut to the real app
const INK = '#1c1613', SKIN = '#8b5a3c', SKIN_D = '#73472e', HAIR = '#2a1c18', CARD = '#c8963e', CARD_D = '#a87a2c', SHIRT = '#eee5d3', GOLD = '#d9b04c';
const C_A = '#b7ecff', C_B = '#c7a1ff'; // the real companion's own colours (from the app's SVG)

/* ---------- helpers ---------- */
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (t, t0, t1) => { const k = clamp((t - t0) / (t1 - t0), 0, 1); return k * k * (3 - 2 * k); };
const keyAt = (keys, t) => { let v = keys[0][1]; for (const [kt, kv] of keys) if (t >= kt) v = kv; return v; };
/* spring-driven track: targets step at key times, the value follows with a damped spring (real overshoot + settle) */
function spring(keys, k = 170, c = 20) {
  const out = [], vel = []; const sub = 8, h = DT / sub;
  let x = Array.isArray(keys[0][1]) ? keys[0][1].slice() : [keys[0][1]], v = x.map(() => 0);
  for (let f = 0; f < N + 2; f++) {
    for (let s = 0; s < sub; s++) { const t = f * DT + s * h; let g = keyAt(keys, t); g = Array.isArray(g) ? g : [g]; for (let i = 0; i < x.length; i++) { const a = k * (g[i] - x[i]) - c * v[i]; v[i] += a * h; x[i] += v[i] * h; } }
    out.push(x.slice()); vel.push(v.slice());
  }
  return { at: f => out[clamp(f, 0, out.length - 1)], vel: f => vel[clamp(f, 0, vel.length - 1)] };
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---------- the performance (seconds) ---------- */
const T_BUZZ = 4.05, T_REACH = 4.3, T_HOLD = 4.62, T_POP = 5.1, T_SURPRISE = 5.12, T_LISTEN = 5.7, T_SMILE = 6.45, T_DIVE = 7.86, T_IN = 8.2, T_LOOKDOWN = 7.95;
const headS = spring([[0, [0, 0, 0]], [0.4, [0, 8, -3]], [1.9, [0, 20, -5]], [3.85, [0, 30, -6]], [4.12, [-20, 12, -8]], [4.7, [-10, 2, -4]], [T_SURPRISE, [14, -18, 5]], [T_LISTEN, [16, -6, 4]], [T_SMILE, [12, -4, 3]], [T_LOOKDOWN, [-8, 8, -3]]], 120, 16);
const gazeS = spring([[0, [0, 0.45]], [1.85, [0.1, 0.15]], [2.7, [0, 0.05]], [4.1, [-0.95, 0.9]], [4.66, [-0.6, 0.5]], [5.18, [0.55, -0.6]], [5.6, [0.9, -0.15]], [T_LOOKDOWN, [-0.6, 0.55]]], 380, 34);
const browS = spring([[0, [1, 0]], [4.1, [0.35, 0]], [T_SURPRISE, [0, 1]], [T_LISTEN, [0, 0.35]], [T_SMILE, [-0.1, 0.25]]], 200, 22); // [worry, raise]
const lidS = spring([[0, 0.36], [1.9, 0.42], [4.1, 0.12], [T_SURPRISE, 0], [T_LISTEN, 0.06], [T_SMILE, 0.16]], 160, 20);
const bodyS = spring([[0, 0], [1.9, 8], [3.85, 18], [4.12, 6], [T_SURPRISE, -10], [T_LISTEN, -3], [T_LOOKDOWN, 4]], 90, 14);
// hand targets in scene px: right hand (frame-left) wheel -> phone in the mount -> holds the phone up. Left hand never leaves the wheel.
const WHEEL_R = [312, 1282], WHEEL_L = [768, 1282], MOUNT = [176, 1540], HOLD = [372, 1082];
const handRS = spring([[0, WHEEL_R], [T_REACH, MOUNT], [T_HOLD, HOLD], [T_LOOKDOWN, [380, 1100]]], 230, 23);
const comp = spring([[0, [0, 0]], [T_POP, [0, 0]], [T_POP + 0.02, [1, 1]]], 150, 13); // pop progress
const blinks = [1.25, 3.25, 6.15, 7.45];

/* precompute phone attach + companion path */
const phone = []; let attached = false, attachDist = null;
for (let f = 0; f <= N + 1; f++) {
  const t = f * DT, h = handRS.at(f);
  if (!attached && t >= T_HOLD - 0.06) { const d = Math.hypot(h[0] - MOUNT[0], h[1] - MOUNT[1]); if (d < 40 || t > T_HOLD + 0.03) { attached = true; attachDist = d; } }
  const buzz = (t >= T_BUZZ && t < T_BUZZ + 0.45 && !attached) ? Math.sin(t * 90) * 4 : 0;
  phone.push(attached ? { x: h[0] + 4, y: h[1] - 40, r: -7 + Math.sin(t * 2.1) * 1.2, held: true } : { x: MOUNT[0] + buzz, y: MOUNT[1] + 30, r: buzz * 0.6, held: false });
}
window.ATTACH = { attachDist };
const COMP_HOME = [868, 790];
const compPos = spring([[0, [0, 0]], [T_POP, [0, 0]], [T_POP + 0.01, [1, 0]], [T_DIVE, [1, -1]], [T_DIVE + 0.12, [0, 1]]], 95, 12); // [toward home, anticipation]

/* ---------- build the static parts ---------- */
const back = document.getElementById('back'), front = document.getElementById('front');
back.innerHTML = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b4d72"/><stop offset=".62" stop-color="#8f7b98"/><stop offset="1" stop-color="#c79a86"/></linearGradient>
<radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".75"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient>
<radialGradient id="pglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C_A}" stop-opacity=".9"/><stop offset=".55" stop-color="${C_B}" stop-opacity=".35"/><stop offset="1" stop-color="${C_B}" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".48" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>
<clipPath id="rw"><path d="M170 360 Q540 300 910 360 L960 760 Q540 790 120 760 Z"/></clipPath>
<clipPath id="eyeL"><ellipse cx="0" cy="0" rx="31" ry="37"/></clipPath>
<clipPath id="eyeR"><ellipse cx="0" cy="0" rx="31" ry="37"/></clipPath>
</defs><g id="cam"></g>`;
const cam = back.querySelector('#cam');
front.innerHTML = '<g id="camF"></g>'; const camF = front.querySelector('#camF');

// outside, seen through the rear window (moves a little slower than the cabin = depth)
const outside = el('g', { 'clip-path': 'url(#rw)' }, cam);
const outsideInner = el('g', {}, outside);
outsideInner.innerHTML = `<rect x="0" y="280" width="1080" height="520" fill="url(#sky)"/>
<rect x="60" y="470" width="960" height="230" fill="#5b6079" stroke="${INK}" stroke-width="5"/>
<rect x="60" y="455" width="960" height="26" fill="#474b62" stroke="${INK}" stroke-width="5"/>
<g id="winrow"></g>
<rect x="355" y="392" width="370" height="74" rx="12" fill="#3e4258" stroke="${INK}" stroke-width="5"/>
<text id="sign" x="540" y="447" text-anchor="middle" font-family="InterX,sans-serif" font-size="50" letter-spacing="6" fill="#f0cf74" stroke="${INK}" stroke-width="2">GROCERY</text>
<rect x="0" y="690" width="1080" height="120" fill="#3c3f52"/>
<path d="M0 732 H1080" stroke="#e9e2c9" stroke-width="4" stroke-dasharray="40 36" opacity=".5"/>
<g id="lampG"><rect x="868" y="380" width="10" height="330" fill="#2c2e3c" stroke="${INK}" stroke-width="3"/><rect x="846" y="370" width="54" height="18" rx="8" fill="#2c2e3c" stroke="${INK}" stroke-width="3"/><circle id="lampGlow" cx="873" cy="392" r="120" fill="url(#lamp)"/></g>
<g fill="#2f3242" stroke="${INK}" stroke-width="5"><path d="M120 760 Q130 690 200 682 L330 680 Q390 684 410 760 Z"/><path d="M640 760 Q650 700 720 692 L820 690 Q880 696 890 760 Z"/></g>
<g stroke="#c9c2b0" stroke-width="5" fill="none" opacity=".8"><path d="M520 700 h56 l-8 34 h-40 z"/><path d="M528 734 v10 M564 734 v10"/></g>
<g id="rain" stroke="#d9e3f2" stroke-width="3" stroke-linecap="round" opacity=".45"></g>`;
const winrow = outsideInner.querySelector('#winrow');
for (let i = 0; i < 8; i++) el('rect', { x: 92 + i * 116, y: 510, width: 82, height: 120, rx: 6, fill: i === 3 || i === 4 ? '#3d4157' : '#f2d88f', opacity: i === 3 || i === 4 ? 1 : 0.78, stroke: INK, 'stroke-width': 4 }, winrow);
const rainG = outsideInner.querySelector('#rain'); const R0 = rng(7); const drops = [];
for (let i = 0; i < 26; i++) drops.push({ x: 140 + R0() * 800, y: 300 + R0() * 480, v: 60 + R0() * 90, l: 10 + R0() * 18, e: el('line', {}, rainG) });

// cabin: roof, pillars, rear window frame, back seat
cam.insertAdjacentHTML('beforeend', `
<path d="M0 0 H1080 V430 Q960 330 910 360 Q540 300 170 360 Q120 330 0 430 Z" fill="#353847"/>
<path d="M0 430 Q120 330 170 360 L120 760 Q60 800 0 820 Z" fill="#2f3240" stroke="${INK}" stroke-width="6"/>
<path d="M1080 430 Q960 330 910 360 L960 760 Q1020 800 1080 820 Z" fill="#2f3240" stroke="${INK}" stroke-width="6"/>
<path d="M170 360 Q540 300 910 360 L960 760 Q540 790 120 760 Z" fill="none" stroke="${INK}" stroke-width="8"/>
<path d="M60 120 Q540 40 1020 120" stroke="#2c2f3c" stroke-width="10" fill="none"/>
<path d="M0 820 Q60 800 120 760 Q540 790 960 760 Q1020 800 1080 820 V1920 H0 Z" fill="#3d4150" stroke="${INK}" stroke-width="6"/>
<path d="M40 900 Q540 860 1040 900" stroke="#33364300" fill="none"/>
<g fill="#454a5a" stroke="${INK}" stroke-width="6"><rect x="40" y="870" width="230" height="420" rx="60"/><rect x="810" y="870" width="230" height="420" rx="60"/></g>`);

// Connie's seat
const seatG = el('g', {}, cam);
seatG.innerHTML = `<rect x="420" y="640" width="240" height="190" rx="70" fill="#505668" stroke="${INK}" stroke-width="7"/>
<rect x="512" y="810" width="16" height="80" fill="#8b8f9c" stroke="${INK}" stroke-width="4"/><rect x="552" y="810" width="16" height="80" fill="#8b8f9c" stroke="${INK}" stroke-width="4"/>
<path d="M270 1000 Q275 880 380 870 L700 870 Q805 880 810 1000 L830 1920 H250 Z" fill="#4d5264" stroke="${INK}" stroke-width="7"/>
<path d="M330 1010 Q540 980 750 1010" stroke="#444959" stroke-width="8" fill="none"/>`;

/* Connie (puppet). body group -> torso, arms; head group -> hair puff (lagging), face parts */
const body = el('g', {}, cam);
const torso = el('g', {}, body);
torso.innerHTML = `<path d="M500 1000 h80 v120 h-80 z" fill="${SKIN_D}" stroke="${INK}" stroke-width="7"/>
<path d="M330 1215 Q338 1110 440 1088 Q540 1070 640 1088 Q742 1110 750 1215 L770 1920 H310 Z" fill="${CARD}" stroke="${INK}" stroke-width="8"/>
<path d="M478 1086 L540 1250 L602 1086 Q540 1100 478 1086 Z" fill="${SHIRT}" stroke="${INK}" stroke-width="6"/>
<path d="M500 1093 Q540 1135 580 1093" fill="${SKIN_D}" stroke="${INK}" stroke-width="5"/>
<path d="M540 1250 L540 1920" stroke="${CARD_D}" stroke-width="6"/>
<g fill="#e9dcc0" stroke="${INK}" stroke-width="4"><circle cx="516" cy="1330" r="9"/><circle cx="516" cy="1420" r="9"/><circle cx="516" cy="1510" r="9"/></g>
<path d="M712 1100 L742 1135 L392 1700 L352 1670 Z" fill="#2c2e35" stroke="${INK}" stroke-width="6"/>
<path d="M722 1112 L388 1680" stroke="#45474f" stroke-width="3" stroke-dasharray="10 10"/>`;
const armBack = el('g', {}, body); // both arms (sleeves) behind the wheel
const mkArm = (parent) => ({ o: el('path', { fill: 'none', stroke: INK, 'stroke-width': 80, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent), i: el('path', { fill: 'none', stroke: CARD, 'stroke-width': 66, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent), cuff: el('path', { fill: 'none', stroke: CARD_D, 'stroke-width': 66, 'stroke-linecap': 'butt' }, parent) });
const armR = mkArm(armBack), armL = mkArm(armBack);

// head
const head = el('g', {}, body);
const puff = el('g', {}, head);
(() => { const R = rng(3); const g = el('g', { fill: HAIR, stroke: INK, 'stroke-width': 7 }, puff);
  const pts = []; for (let i = 0; i < 15; i++) { const a = (i / 15) * Math.PI * 2; pts.push([Math.cos(a) * 112, -250 + Math.sin(a) * 92, 52 + R() * 16]); }
  pts.forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r }, g)); el('ellipse', { cx: 0, cy: -250, rx: 120, ry: 98, stroke: 'none' }, g);
  const hl = el('g', { fill: 'none', stroke: '#4a3530', 'stroke-width': 5, 'stroke-linecap': 'round' }, puff); for (let i = 0; i < 7; i++) { const x = -80 + i * 27, y = -300 + (i % 3) * 30; el('path', { d: `M${x} ${y} q12 -12 24 0` }, hl); }
  el('rect', { x: -78, y: -176, width: 156, height: 40, rx: 20, fill: GOLD, stroke: INK, 'stroke-width': 7 }, puff);
  el('path', { d: 'M-50 -156 q8 -10 16 0 M-6 -156 q8 -10 16 0 M38 -156 q8 -10 16 0', fill: 'none', stroke: '#b58c32', 'stroke-width': 4 }, puff); })();
const ears = el('g', {}, head);
const hoopL = el('g', {}, ears), hoopR = el('g', {}, ears);
el('ellipse', { cx: -150, cy: 10, rx: 26, ry: 36, fill: SKIN, stroke: INK, 'stroke-width': 7 }, ears);
el('ellipse', { cx: 150, cy: 10, rx: 26, ry: 36, fill: SKIN, stroke: INK, 'stroke-width': 7 }, ears);
el('circle', { cx: 0, cy: 30, r: 26, fill: 'none', stroke: INK, 'stroke-width': 13 }, hoopL); el('circle', { cx: 0, cy: 30, r: 26, fill: 'none', stroke: GOLD, 'stroke-width': 7 }, hoopL);
el('circle', { cx: 0, cy: 30, r: 26, fill: 'none', stroke: INK, 'stroke-width': 13 }, hoopR); el('circle', { cx: 0, cy: 30, r: 26, fill: 'none', stroke: GOLD, 'stroke-width': 7 }, hoopR);
const faceShape = el('path', { d: 'M-142 -40 Q-146 -160 0 -168 Q146 -160 142 -40 Q140 90 70 140 Q0 182 -70 140 Q-140 90 -142 -40 Z', fill: SKIN, stroke: INK, 'stroke-width': 8 }, head);
const hairline = el('path', { d: 'M-140 -60 Q-150 -150 -60 -168 Q0 -180 60 -168 Q150 -150 140 -60 Q120 -120 60 -132 Q0 -112 -60 -132 Q-120 -120 -140 -60 Z', fill: HAIR, stroke: INK, 'stroke-width': 7 }, head);
const glowFace = el('ellipse', { cx: -40, cy: 30, rx: 190, ry: 200, fill: 'url(#pglow)', opacity: 0, style: 'mix-blend-mode:screen' }, head);
const blush = el('g', { fill: '#c0574f', opacity: 0 }, head); el('ellipse', { cx: -88, cy: 52, rx: 26, ry: 14 }, blush); el('ellipse', { cx: 88, cy: 52, rx: 26, ry: 14 }, blush);
const mkEye = (cx, clip) => { const g = el('g', { transform: `translate(${cx} -8)` }, head); const inner = el('g', { 'clip-path': `url(#${clip})` }, g);
  el('ellipse', { cx: 0, cy: 0, rx: 31, ry: 37, fill: '#fbf7ef' }, inner); const iris = el('g', {}, inner); el('circle', { r: 18, fill: '#4a2c18' }, iris); el('circle', { r: 9, fill: '#110905' }, iris); el('circle', { cx: -6, cy: -7, r: 5, fill: '#fff' }, iris);
  const lid = el('rect', { x: -40, y: -50, width: 80, height: 0, fill: SKIN }, inner); const lidLine = el('path', { fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
  el('ellipse', { cx: 0, cy: 0, rx: 31, ry: 37, fill: 'none', stroke: INK, 'stroke-width': 6 }, g); return { g, iris, lid, lidLine }; };
const eyeR = mkEye(-58, 'eyeR'), eyeL = mkEye(58, 'eyeL');
const browR = el('path', { fill: 'none', stroke: HAIR, 'stroke-width': 14, 'stroke-linecap': 'round' }, head), browL = el('path', { fill: 'none', stroke: HAIR, 'stroke-width': 14, 'stroke-linecap': 'round' }, head);
el('path', { d: 'M-6 22 Q-16 52 2 58 Q14 60 18 52', fill: 'none', stroke: SKIN_D, 'stroke-width': 6, 'stroke-linecap': 'round' }, head);
const mouthG = el('g', { transform: 'translate(0 96)' }, head);
const mouthFill = el('path', { fill: '#4b1b1d', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, mouthG);
const teeth = el('path', { fill: '#fff' }, mouthG); const tongue = el('ellipse', { fill: '#c45a5a' }, mouthG);
const mouthLine = el('path', { fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, mouthG);

// steering wheel (in front of her body, behind her hands)
const wheel = el('g', {}, cam);
wheel.innerHTML = `<path d="M500 1920 L520 1500 H560 L580 1920 Z" fill="#24262e" stroke="${INK}" stroke-width="7"/>
<g fill="none" stroke-linecap="round"><path d="M262 1452 L470 1462 M818 1452 L610 1462 M540 1520 L540 1676" stroke="${INK}" stroke-width="52"/><path d="M262 1452 L470 1462 M818 1452 L610 1462 M540 1520 L540 1676" stroke="#30333d" stroke-width="38"/></g>
<ellipse cx="540" cy="1470" rx="96" ry="74" fill="#30333d" stroke="${INK}" stroke-width="8"/><ellipse cx="540" cy="1466" rx="50" ry="34" fill="#3a3e4a" stroke="${INK}" stroke-width="5"/>
<ellipse cx="540" cy="1430" rx="300" ry="250" fill="none" stroke="${INK}" stroke-width="60"/><ellipse cx="540" cy="1430" rx="300" ry="250" fill="none" stroke="#30333d" stroke-width="44"/>
<path d="M300 1300 Q420 1190 540 1186" fill="none" stroke="#4b4f5c" stroke-width="8" stroke-linecap="round"/>`;
// dashboard + phone mount (foreground)
const dash = el('g', {}, cam);
dash.innerHTML = `<path d="M0 1700 Q540 1640 1080 1700 V1920 H0 Z" fill="#262833" stroke="${INK}" stroke-width="8"/>
<path d="M30 1735 Q540 1680 1050 1735" stroke="#33364300" stroke-width="6" fill="none"/>
<path d="M150 1700 L160 1650 H192 L202 1700 Z" fill="#1d1f27" stroke="${INK}" stroke-width="6"/>
<path d="M104 1600 Q104 1650 176 1650 Q248 1650 248 1600" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M104 1600 Q104 1650 176 1650 Q248 1650 248 1600" fill="none" stroke="#3a3d48" stroke-width="10" stroke-linecap="round"/>`;
const glowWorld = el('ellipse', { rx: 260, ry: 260, fill: 'url(#pglow)', opacity: 0, style: 'mix-blend-mode:screen' }, cam);
// hands: right hand (frame-left) is drawn on the FRONT svg when it holds the phone (phone in front of the companion), else on the back svg
const mkHand = (parent, mirror) => { const g = el('g', {}, parent); const palm = el('ellipse', { rx: 42, ry: 38, fill: SKIN, stroke: INK, 'stroke-width': 7 }, g);
  const thumb = el('ellipse', { rx: 15, ry: 24, fill: SKIN, stroke: INK, 'stroke-width': 6 }, g); const fingers = el('path', { fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, g); return { g, palm, thumb, fingers, mirror }; };
const handLBack = mkHand(cam, 1);
const phoneG = el('g', {}, camF);
phoneG.innerHTML = `<g id="pglowRim" opacity="0"><rect x="-72" y="-128" width="144" height="256" rx="30" fill="none" stroke="${C_A}" stroke-width="22" opacity=".55"/><rect x="-80" y="-136" width="160" height="272" rx="36" fill="none" stroke="${C_B}" stroke-width="14" opacity=".35"/></g>
<rect x="-60" y="-116" width="120" height="232" rx="22" fill="#34405a" stroke="${INK}" stroke-width="7"/>
<rect x="-44" y="-100" width="46" height="50" rx="12" fill="#2a3248" stroke="${INK}" stroke-width="4"/><circle cx="-30" cy="-86" r="8" fill="#15192a" stroke="#56607a" stroke-width="2"/><circle cx="-12" cy="-66" r="8" fill="#15192a" stroke="#56607a" stroke-width="2"/>`;
const pglowRim = phoneG.querySelector('#pglowRim');
const handRFront = mkHand(camF, 0), handRBack = mkHand(cam, 0);
const vig = el('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: 'url(#vig)' }, back);

/* hand pose drawing */
function drawHand(H, x, y, pose, rot) {
  const m = H.mirror ? -1 : 1;
  H.g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot || 0})`);
  if (pose === 'grip') { H.palm.setAttribute('rx', 44); H.palm.setAttribute('ry', 36); H.thumb.setAttribute('cx', 26 * m); H.thumb.setAttribute('cy', -24); H.thumb.setAttribute('transform', `rotate(${-40 * m} ${26 * m} -24)`); H.fingers.setAttribute('d', 'M-26 8 q0 16 0 22 M-8 12 q0 16 0 22 M10 12 q0 16 0 22 M28 8 q0 14 0 18'); }
  else if (pose === 'open') { H.palm.setAttribute('rx', 40); H.palm.setAttribute('ry', 40); H.thumb.setAttribute('cx', 40 * m); H.thumb.setAttribute('cy', -6); H.thumb.setAttribute('transform', `rotate(${-70 * m} ${40 * m} -6)`); H.fingers.setAttribute('d', 'M-22 24 q-2 12 -4 18 M-6 28 q0 12 0 18 M10 28 q2 12 2 16'); }
  else { /* hold: hand wraps the phone's lower half, thumb on its edge */ H.palm.setAttribute('rx', 46); H.palm.setAttribute('ry', 40); H.thumb.setAttribute('cx', -50); H.thumb.setAttribute('cy', -22); H.thumb.setAttribute('transform', 'rotate(20 -50 -22)'); H.fingers.setAttribute('d', 'M14 -14 q22 0 30 4 M14 4 q22 0 30 4 M14 22 q20 0 26 4'); }
}
function armPath(A, sx, sy, hx, hy, outward) {
  const d = Math.hypot(hx - sx, hy - sy); const L = Math.max(d * 1.22, 230); const a = L / 2;
  const th = Math.atan2(hy - sy, hx - sx); const al = Math.acos(clamp(d / (2 * a), -1, 1));
  const e1 = [sx + a * Math.cos(th + al), sy + a * Math.sin(th + al)], e2 = [sx + a * Math.cos(th - al), sy + a * Math.sin(th - al)];
  const e = (outward < 0 ? (e1[0] < e2[0]) : (e1[0] > e2[0])) ? e1 : e2;
  const p = `M${sx} ${sy} L${e[0].toFixed(1)} ${e[1].toFixed(1)} L${hx.toFixed(1)} ${hy.toFixed(1)}`;
  A.o.setAttribute('d', p); A.i.setAttribute('d', p);
  const ux = (hx - e[0]) / (a || 1), uy = (hy - e[1]) / (a || 1); A.cuff.setAttribute('d', `M${(hx - ux * 52).toFixed(1)} ${(hy - uy * 52).toFixed(1)} L${(hx - ux * 30).toFixed(1)} ${(hy - uy * 30).toFixed(1)}`);
  return e;
}

/* companion frames (real app captures) */
const IMG = {}; const COMP_N = 110;
function loadImgs() { const ps = []; for (const v of ['rest', 'talk', 'surprised']) for (let i = 0; i < COMP_N; i++) { const im = new Image(); im.src = `comp/${v}-${String(i).padStart(4, '0')}.png`; IMG[v + i] = im; ps.push(im.decode()); } return Promise.all(ps); }
const CW = 600, CH = 597, CAX = 303, CAY = 323; // anchor = centre of the companion's own pixels in the capture
const cv = document.getElementById('cv'), cx = cv.getContext('2d');
const SP = []; { const R = rng(11); for (let i = 0; i < 40; i++) SP.push({ a: R() * Math.PI * 2, s: 260 + R() * 420, r: 7 + R() * 10, c: [C_A, C_B, '#ffffff'][i % 3], d: R() * 0.25, which: i < 24 ? 'pop' : 'dive' }); }
function star(x, y, r, c, al) { cx.save(); cx.globalAlpha = al; cx.fillStyle = c; cx.strokeStyle = INK; cx.lineWidth = 3; cx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.38 : r; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); cx.fill(); cx.stroke(); cx.restore(); }

const capEl = document.getElementById('cap');
window.STATE = {};
/* ---------- per-frame render ---------- */
window.render = function (f) {
  const t = f * DT; const S = {};
  // camera: slow push, shake on the buzz, punch on the pop, push into the phone at the end
  const ph = phone[f];
  let s = 1.0 + 0.045 * smooth(t, 0, 4.0) + 0.02 * smooth(t, 5.1, 5.6), ccx = 540 + 30 * smooth(t, 5.0, 5.8), ccy = 1000 - 40 * smooth(t, 0, 4) ;
  const pin = smooth(t, 7.98, 8.4); s = lerp(s, 2.3, pin * pin); ccx = lerp(ccx, ph.x, pin); ccy = lerp(ccy, ph.y - 20, pin);
  const shake = (t > T_BUZZ && t < T_BUZZ + 0.35) ? Math.sin(t * 70) * 5 * (1 - (t - T_BUZZ) / 0.35) : 0;
  const M = [s, 0, 0, s, 540 - s * ccx + shake, 960 - s * ccy];
  cam.setAttribute('transform', `matrix(${M.join(' ')})`); camF.setAttribute('transform', `matrix(${M.join(' ')})`);
  outsideInner.setAttribute('transform', `translate(${(ccx - 540) * 0.25} ${(ccy - 960) * 0.12})`);
  drops.forEach(d => { const y = 300 + ((d.y - 300 + t * d.v) % 480); d.e.setAttribute('x1', d.x); d.e.setAttribute('y1', y); d.e.setAttribute('x2', d.x - 3); d.e.setAttribute('y2', y + d.l); });
  const sign = outsideInner.querySelector('#sign'); sign.setAttribute('opacity', (t > 2.2 && t < 2.32) || (t > 2.42 && t < 2.5) ? 0.45 : 1);

  // body + head
  const hd = headS.at(f), hv = headS.vel(f), by = bodyS.at(f)[0];
  const breath = Math.sin(t * 2 * Math.PI / 3.2) * 4 + (t > 3.75 && t < 4.15 ? -10 * Math.sin((t - 3.75) / 0.4 * Math.PI) : 0);
  body.setAttribute('transform', `translate(0 ${(by + breath * 0.6).toFixed(2)})`);
  head.setAttribute('transform', `translate(${(540 + hd[0]).toFixed(2)} ${(860 + hd[1] + breath).toFixed(2)}) rotate(${hd[2].toFixed(2)})`);
  puff.setAttribute('transform', `translate(${(-hv[0] * 0.035).toFixed(2)} ${(-hv[1] * 0.05).toFixed(2)}) rotate(${(-hv[0] * 0.012).toFixed(2)} 0 -170)`);
  const sw = clamp(-hv[0] * 0.25 - hv[2] * 0.6, -28, 28);
  hoopR.setAttribute('transform', `translate(-150 44) rotate(${sw.toFixed(1)})`); hoopL.setAttribute('transform', `translate(150 44) rotate(${sw.toFixed(1)})`);
  // eyes
  const gz = gazeS.at(f), lidBase = lidS.at(f)[0];
  let bl = 0; for (const b of blinks) { const k = (t - b) / 0.16; if (k >= 0 && k <= 1) bl = Math.sin(k * Math.PI); }
  const lid = clamp(Math.max(lidBase, bl), 0, 1);
  for (const E of [eyeR, eyeL]) { E.iris.setAttribute('transform', `translate(${(gz[0] * 13).toFixed(2)} ${(gz[1] * 12).toFixed(2)})`); const ly = -37 + 74 * lid; E.lid.setAttribute('y', -60); E.lid.setAttribute('height', (ly + 60).toFixed(2)); E.lidLine.setAttribute('d', lid > 0.02 ? `M-30 ${ly.toFixed(1)} Q0 ${(ly + 6).toFixed(1)} 30 ${ly.toFixed(1)}` : 'M0 0'); }
  S.lid = +lid.toFixed(2); S.gaze = gz.map(v => +v.toFixed(2));
  // brows
  const [worry, raise] = browS.at(f); const by0 = -70 - raise * 20;
  browR.setAttribute('d', `M-100 ${(by0 + 8 - worry * 2).toFixed(1)} Q-66 ${(by0 - 8).toFixed(1)} -26 ${(by0 - worry * 18).toFixed(1)}`);
  browL.setAttribute('d', `M100 ${(by0 + 8 - worry * 2).toFixed(1)} Q66 ${(by0 - 8).toFixed(1)} 26 ${(by0 - worry * 18).toFixed(1)}`);
  // mouth: real audio drives the opening while she talks, else the expression of the moment
  const mv = TL.mouth.connie[f] || 0; let mode;
  mouthFill.setAttribute('d', 'M0 0'); teeth.setAttribute('d', 'M0 0'); tongue.setAttribute('rx', 0); tongue.setAttribute('ry', 0); mouthLine.setAttribute('d', 'M0 0');
  if (mv > 0.12) { mode = 'talk'; const k = clamp(mv, 0, 1.1); const osc = 0.5 + 0.5 * Math.sin(f * 1.7); const h = 8 + 34 * k, w = 66 - 20 * k * osc; mouthFill.setAttribute('d', `M${-w / 2} 0 Q0 ${-h * 0.22} ${w / 2} 0 Q0 ${h * 1.15} ${-w / 2} 0 Z`); if (h > 14) teeth.setAttribute('d', `M${-w / 2 + 8} 1 Q0 ${-h * 0.15} ${w / 2 - 8} 1 L${w / 2 - 12} 7 Q0 9 ${-w / 2 + 12} 7 Z`); if (h > 20) { tongue.setAttribute('cy', h * 0.62); tongue.setAttribute('rx', w * 0.26); tongue.setAttribute('ry', h * 0.18); } }
  else if (t >= T_SURPRISE && t < T_LISTEN) { mode = 'oh'; const k = smooth(t, T_SURPRISE, T_SURPRISE + 0.12); mouthFill.setAttribute('d', `M0 ${-14 * k} C${22 * k} ${-14 * k} ${22 * k} ${26 * k} 0 ${26 * k} C${-22 * k} ${26 * k} ${-22 * k} ${-14 * k} 0 ${-14 * k} Z`); }
  else if (t >= T_SMILE) { mode = 'smile'; const k = smooth(t, T_SMILE, T_SMILE + 0.3); mouthFill.setAttribute('d', `M-44 -8 Q0 ${-2 + 4 * k} 44 -8 Q0 ${8 + 36 * k} -44 -8 Z`); teeth.setAttribute('d', `M-36 -5 Q0 ${0 + 3 * k} 36 -5 L32 ${2 + 6 * k} Q0 ${6 + 8 * k} -32 ${2 + 6 * k} Z`); }
  else if (t < 4.1) { mode = 'frown'; mouthLine.setAttribute('d', 'M-34 8 Q0 -8 34 8'); }
  else { mode = 'neutral'; mouthLine.setAttribute('d', 'M-30 2 Q0 8 30 2'); }
  S.mouth = mode; S.mv = +mv.toFixed(2);
  blush.setAttribute('opacity', (0.5 * smooth(t, T_SMILE, T_SMILE + 0.5)).toFixed(2));
  // phone glow
  const glow = t < T_BUZZ ? 0 : clamp(0.55 + 0.25 * Math.sin(t * 9) * (t < T_BUZZ + 0.45 ? 1 : 0) + 0.45 * Math.exp(-Math.pow((t - T_POP) / 0.18, 2)) + 0.5 * Math.exp(-Math.pow((t - T_IN) / 0.12, 2)), 0, 1);
  glowFace.setAttribute('opacity', (glow * 0.45).toFixed(3));
  glowWorld.setAttribute('cx', ph.x); glowWorld.setAttribute('cy', ph.y); glowWorld.setAttribute('opacity', (glow * 0.6).toFixed(3));
  pglowRim.setAttribute('opacity', glow.toFixed(3));
  // arms + hands (one pair of hands, always): left stays on the wheel; right: wheel -> mount -> holds the phone
  const sy = 1150 + by + breath * 0.6; const hr = handRS.at(f);
  const lSq = Math.sin(t * 1.3) * 2; const bodyOff = by + breath * 0.6;
  armPath(armL, 712, sy, WHEEL_L[0], WHEEL_L[1] + lSq, 1);
  armPath(armR, 368, sy, hr[0], hr[1] + (ph.held ? 0 : 0), -1);
  drawHand(handLBack, WHEEL_L[0], WHEEL_L[1] + lSq, 'grip', 8);
  const onWheel = t < T_REACH + 0.02; const reaching = !onWheel && !ph.held;
  const poseR = onWheel ? 'grip' : (reaching ? 'open' : 'hold');
  // phone: in the mount until the hand reaches it, then in the hand
  phoneG.setAttribute('transform', `translate(${ph.x.toFixed(1)} ${ph.y.toFixed(1)}) rotate(${ph.r.toFixed(2)})`);
  if (ph.held) { handRBack.g.setAttribute('opacity', 0); handRFront.g.setAttribute('opacity', 1); drawHand(handRFront, hr[0], hr[1] + 16, 'hold', ph.r); }
  else { handRFront.g.setAttribute('opacity', 0); handRBack.g.setAttribute('opacity', 1); drawHand(handRBack, hr[0], hr[1], poseR, onWheel ? -8 : 20); }
  S.hands = { left: 'wheel', right: onWheel ? 'wheel' : (ph.held ? 'phone' : 'reaching') }; S.phone = ph.held ? 'in right hand' : 'in mount'; S.hr = hr.map(v => Math.round(v));
  // when the right hand holds the phone, the phone is in front -> mount is empty; when not, phone sits in the mount (front svg keeps it above the dash)

  // companion (real capture), drawn on the canvas between the cabin and the phone
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, 1080, 1920); cx.setTransform(M[0], 0, 0, M[3], M[4], M[5]);
  const cp = compPos.at(f), cpv = compPos.vel(f);
  S.comp = 'hidden';
  if (t >= T_POP && t < T_IN + 0.02) {
    const top = [ph.x + 62, ph.y + 6]; // emerge from the phone's side, below her chin
    // pop: spring out of the phone to its spot; dive: a short anticipation hop, then an ease-in plunge back into the phone
    let k = cp[0]; let hop = 0; const D0 = T_DIVE, D1 = T_DIVE + 0.1;
    if (t >= D0) { hop = Math.sin(clamp((t - D0) / 0.1, 0, 1) * Math.PI / 2) * (t < D1 ? 1 : 1 - smooth(t, D1, D1 + 0.1)); }
    if (t >= D1) { const q = clamp((t - D1) / (T_IN - D1), 0, 1); k = 1 - q * q * q; }
    // curved path that passes below her chin (in front of her chest), never across her face
    const CP = [800, 1290]; const u = 1 - k;
    let x = u * u * top[0] + 2 * u * k * CP[0] + k * k * COMP_HOME[0], y = u * u * top[1] + 2 * u * k * CP[1] + k * k * COMP_HOME[1] + Math.sin(t * 2.4) * 8 * k - 30 * hop;
    let sc = 0.88 * clamp(0.12 + 0.88 * Math.min(1, k * 1.15), 0, 1.2);
    const pv = t >= D1 ? 3 * Math.pow(clamp((t - D1) / (T_IN - D1), 0, 1), 2) / (T_IN - D1) : cpv[0];
    const vy = pv * Math.abs(COMP_HOME[1] - top[1]); const st = clamp(Math.abs(vy) / 1800, 0, 0.34) - (t >= D0 && t < D1 ? 0.14 * Math.sin((t - D0) / 0.1 * Math.PI) : 0);
    const sx2 = sc * (1 - st * 0.55), sy2 = sc * (1 + st);
    const ci = clamp(f - Math.round(T_POP * FPS), 0, COMP_N - 1);
    const cm = TL.mouth.comp[f] || 0; const face = (t < T_POP + 0.45) ? 'surprised' : (cm > 0.15 && (f % 4 !== 3) ? 'talk' : 'rest');
    const im = IMG[face + ci];
    const ang = Math.atan2(COMP_HOME[1] - top[1], COMP_HOME[0] - top[0]) + Math.PI / 2; const rot = clamp(cpv[0], -3, 3) * 0.06 * Math.sin(ang);
    cx.save(); cx.translate(x, y); cx.rotate(rot); cx.scale(sx2, sy2); cx.drawImage(im, -CAX, -CAY, CW, CH); cx.restore();
    S.comp = { x: Math.round(x), y: Math.round(y), scr: [Math.round(M[0] * x + M[4]), Math.round(M[3] * y + M[5])], sx: +sx2.toFixed(3), sy: +sy2.toFixed(3), face, frame: ci, w: Math.round(300 * sx2), h: Math.round(364 * sy2) };
  }
  // sparkles (pop + dive)
  for (const p of SP) { const t0 = (p.which === 'pop' ? T_POP : T_DIVE + 0.1) + p.d * 0.3; const k = (t - t0) / 0.7; if (k < 0 || k > 1) continue; const o = p.which === 'pop' ? [ph.x + 62, ph.y - 4] : [ph.x + 62, ph.y + 6];
    const e = 1 - Math.pow(1 - k, 3); star(o[0] + Math.cos(p.a) * p.s * e * 0.6, o[1] + Math.sin(p.a) * p.s * e * 0.45 - 60 * k, p.r * (1 - k * 0.5), p.c, 1 - k); }

  // caption: one whole sentence, one line, dark rounded box near the top
  let cap = null; for (const c of TL.caps) if (t >= c.t0 && t < c.t1) cap = c;
  if (cap) { if (capEl.textContent !== cap.text) { capEl.textContent = cap.text; capEl.style.fontSize = '50px'; let fs = 50; while (capEl.offsetWidth > 990 && fs > 34) { fs -= 2; capEl.style.fontSize = fs + 'px'; } }
    capEl.className = cap.who === 'comp' ? 'comp' : ''; const a = Math.min(smooth(t, cap.t0, cap.t0 + 0.1), 1 - smooth(t, cap.t1 - 0.1, cap.t1)); capEl.style.opacity = a.toFixed(3); }
  else capEl.style.opacity = 0;
  S.cap = cap ? cap.text : ''; S.capBox = cap ? (() => { const r = capEl.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })() : null;
  S.headBox = (() => { const r = head.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })();
  const bb = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  S.faceBox = bb(faceShape); S.mouthBox = bb(mouthG); S.eyeBoxes = [bb(eyeR.g), bb(eyeL.g)];
  S.handsVisible = [handLBack, handRBack, handRFront].filter(H => H.g.getAttribute('opacity') !== '0').length;
  S.handBoxes = [handLBack, handRBack, handRFront].filter(H => H.g.getAttribute('opacity') !== '0').map(H => bb(H.g));
  S.phoneBox = bb(phoneG.querySelector('rect:not([fill=none])') || phoneG);
  if (S.comp !== 'hidden') { const c = S.comp; S.compBox = [Math.round(c.scr[0] - 123 * c.sx * M[0]), Math.round(c.scr[1] - 159 * c.sy * M[0]), Math.round(248 * c.sx * M[0]), Math.round(321 * c.sy * M[0])]; /* the companion's real pixels in the capture */ }
  S.t = +t.toFixed(3);
  window.STATE = S; return S;
};
window.READY = loadImgs().then(() => { window.N = N; return true; });
