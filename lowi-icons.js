/* LOWiSPIKE custom icon set. One place for every UI symbol.
   24px grid, 1.7 round stroke, soft duotone fill. Replaces emoji in UI chrome via
   spirit.js symbols() and upgrades LowiSpiritCore.icon/paths so the herb world,
   rewards, zodiac and care controls all draw from the same set.
   API: LowiIcons.svg(name, {label, cls}) / kind(emoji) / fromEmoji(emoji, {alone, label}) / has(name) / names() */
(function (root) {
  'use strict';
  var DUO = ' fill="currentColor" fill-opacity=".16"';
  function P(d) { return '<path d="' + d + '"/>'; }
  function D(d) { return '<path' + DUO + ' d="' + d + '"/>'; }
  function C(cx, cy, r, duo) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + (duo ? DUO : '') + '/>'; }
  function DOT(cx, cy) { return '<circle cx="' + cx + '" cy="' + cy + '" r=".9" fill="currentColor" stroke="none"/>'; }
  var FACE = C(12, 12, 9, 1), EYES = DOT(9, 9.8) + DOT(15, 9.8);
  var CLOUD = function (y) { return D('M7 ' + y + 'h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.4A3.4 3.4 0 0 0 7 ' + y + 'Z'); };

  /* zodiac: single clean strokes, also reused as the herb pot emblem path */
  var ZODIAC = {
    Aries: 'M12 20.5V9.5M12 9.5C12 5.5 9.8 3.5 7.3 3.5S3.5 5.5 3.5 7.5c0 1.6 1 2.8 2.5 3M12 9.5c0-4 2.2-6 4.7-6s3.8 2 3.8 4c0 1.6-1 2.8-2.5 3',
    Taurus: 'M12 9a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM4 3.5c0 3.5 3.5 5.5 8 5.5s8-2 8-5.5',
    Gemini: 'M4.5 4c4.8 1.5 10.2 1.5 15 0M4.5 20c4.8-1.5 10.2-1.5 15 0M9 5v14M15 5v14',
    Cancer: 'M7 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17 11.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM7 7.5C9 5 12 4 14.5 4.3s4.7 1.4 6 3.2M17 16.5c-2 2.5-5 3.5-7.5 3.2S4.8 18.3 3.5 16.5',
    Leo: 'M7 12.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM10 15.5c0-3-2-5-2-8a4.5 4.5 0 0 1 9 0c0 3.5-3 6-3 9.5 0 2 1.2 3 2.8 3 1.2 0 2-.5 2.7-1.5',
    Virgo: 'M3.5 6.2c1.4-.9 3-.8 3 1.6V19M6.5 7.8c0-2.4 3-2.4 3 0V19M9.5 7.8c0-2.4 3-2.4 3 0v8.4c0 2.4 1.4 3.8 3.6 4.3M12.5 13c1.6-2.6 5.2-2.7 5.8-.4.6 2.4-1.8 5.2-6.3 7.9',
    Libra: 'M3.5 20.5h17M3.5 16h5.2a4.3 4.3 0 1 1 6.6 0h5.2',
    Scorpio: 'M3.5 6.2c1.4-.9 3-.8 3 1.6V18M6.5 7.8c0-2.4 3-2.4 3 0V18M9.5 7.8c0-2.4 3-2.4 3 0v9c0 1.9 1 3.2 3 3.2h4.5M17.8 17.6l2.4 2.4-2.4 2.4',
    Sagittarius: 'M4 20 20 4M12.5 4H20v7.5M7 11l6 6',
    Capricorn: 'M3.5 5c2.2 0 3.6 1.8 3.6 4.6V18M7.1 9.6C7.1 6.8 8.7 5 10.6 5s3.5 1.8 3.5 4.6v6.2c0 2.6 1.4 4.2 3.4 4.2a2.6 2.6 0 0 0 0-5.2c-1.9 0-3.4 1.6-3.4 3.9',
    Aquarius: 'M3 9.5l3-2.5 3 2.5 3-2.5 3 2.5 3-2.5 3 2.5M3 16.5l3-2.5 3 2.5 3-2.5 3 2.5 3-2.5 3 2.5',
    Pisces: 'M6 3.5c3.5 2.5 3.5 14.5 0 17M18 3.5c-3.5 2.5-3.5 14.5 0 17M4.5 12h15'
  };

  var I = {
    /* rewards & progress */
    flame: D('M12 21.5c-3.6 0-6.5-2.7-6.5-6.3 0-3.2 2-5.4 3.6-7.5.4 1.5 1.2 2.6 2.3 3.1C11.6 7.4 13 4.6 15.2 2.5c.2 3.1 3.3 5.6 3.3 10.1 0 5.3-2.9 8.9-6.5 8.9Z') + P('M12 21.5c-1.7 0-3-1.3-3-3 0-1.9 1.6-3 2.4-4.6.9 1.3 3.6 2.3 3.6 4.9 0 1.5-1.3 2.7-3 2.7Z'),
    shield: D('M12 2.8 19.5 5.6v5.6c0 4.8-3.1 8.6-7.5 10-4.4-1.4-7.5-5.2-7.5-10V5.6Z') + P('M8.8 12.2l2.2 2.2 4.3-4.6'),
    trophy: D('M7.5 3.5h9v5.2a4.5 4.5 0 0 1-9 0Z') + P('M7.5 5.5h-3c0 3 1.3 4.6 3.4 5M16.5 5.5h3c0 3-1.3 4.6-3.4 5M12 13.2v3.6M8 20.5h8M9.5 16.8h5v3.7h-5Z'),
    medal: P('M8 2.8l2.6 6M16 2.8l-2.6 6') + C(12, 15, 5.5, 1) + P('M12 12.3l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z'),
    crown: D('M3.5 8.5l4.2 3.5L12 5.5l4.3 6.5 4.2-3.5-1.7 10H5.2Z') + P('M5.5 21h13'),
    star: D('M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.6l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8Z'),
    sparkle: D('M11 2.8c.7 4.6 2.6 6.5 7.2 7.2-4.6.7-6.5 2.6-7.2 7.2-.7-4.6-2.6-6.5-7.2-7.2 4.6-.7 6.5-2.6 7.2-7.2Z') + P('M18.5 15.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8Z'),
    comet: D('M16.5 3.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4Z') + P('M12.5 11.5 4 20M14.5 14.5 9.5 19.5M9.5 9.5l-5 5'),
    gift: D('M4 10h16v10.5H4Z') + P('M3 7h18v3H3ZM12 7v13.5M12 7C10.5 3.5 6.5 2.8 6.5 5.2 6.5 6.7 9.3 7 12 7Zm0 0c1.5-3.5 5.5-4.2 5.5-1.8 0 1.5-2.8 1.8-5.5 1.8Z'),
    gem: D('M7 4h10l4 5-9 11L3 9Z') + P('M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5'),
    lock: D('M7 10.5h10a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19v-7A1.5 1.5 0 0 1 7 10.5Z') + P('M8.5 10.5v-3a3.5 3.5 0 0 1 7 0v3M12 14.5V17'),
    check: P('M5 12.5l4.5 4.5L19 7.5'),
    checkCircle: C(12, 12, 9, 1) + P('M8 12.3l2.8 2.8 5.2-5.6'),
    bolt: D('M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6Z'),
    target: C(12, 12, 9) + C(12, 12, 5.5) + C(12, 12, 2, 1),
    heart: D('M12 20.5s-8-4.7-8-10.6A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 8 2.7c0 5.9-8 10.6-8 10.6Z'),
    cake: D('M4.5 13h15v7.5h-15Z') + P('M3 20.5h18M4.5 16.2c1.9 1.4 3.9 1.4 5 0 1.2 1.4 3.8 1.4 5 0 1.1 1.4 3.1 1.4 5 0M8 13v-3M12 13v-3M16 13v-3M8 7.8c-.8-.8-.3-1.9 0-2.8.4.9.9 2 0 2.8ZM12 7.8c-.8-.8-.3-1.9 0-2.8.4.9.9 2 0 2.8ZM16 7.8c-.8-.8-.3-1.9 0-2.8.4.9.9 2 0 2.8Z'),
    party: D('M4 20l4.5-12 7.5 7.5Z') + P('M13 3.5c.5 1.5 0 2.5-1 3.5M20.5 11c-1.5-.5-2.5 0-3.5 1M16 3l.5 2M21 8l-2 .5M15.5 8.5l2-2'),
    chart: P('M4 4v16.5h16.5M7.5 15.5l4-4.5 3 2.5 5-6M16 7.5h3.5V11'),
    /* people & personality */
    puzzle: D('M5 7.5h3.5a2 2 0 1 1 4 0H16V11a2 2 0 1 1 0 4v3.5h-3.5a2 2 0 1 0-4 0H5V15a2 2 0 1 0 0-4Z'),
    user: C(12, 8, 3.8, 1) + P('M4.5 20.5c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6'),
    users: C(9, 8.5, 3.2, 1) + P('M3 20c.6-3.3 2.9-5.2 6-5.2s5.4 1.9 6 5.2M15.5 5.5a3.2 3.2 0 0 1 0 6.2M17 14.9c2.2.5 3.6 2.2 4 5.1'),
    hand: D('M8 13V6.5a1.5 1.5 0 0 1 3 0V11V4.8a1.5 1.5 0 0 1 3 0V11V6a1.5 1.5 0 0 1 3 0v7.5c0 4.2-2.6 7-6.3 7-2.6 0-4.1-1.3-5.5-3.4L3.4 13a1.5 1.5 0 0 1 2.5-1.6L8 14') + P('M19.5 3.5c1 .7 1.7 1.7 2 3'),
    hands: D('M9 21v-3.5L5.5 13a2 2 0 0 1 .3-2.6l3.7-3.9c.6-.6 1.5-.1 1.4.8L10.5 11M15 21v-3.5l3.5-4.5a2 2 0 0 0-.3-2.6l-3.7-3.9c-.6-.6-1.5-.1-1.4.8l.4 3.7') + P('M12 3v1.5M8.5 4l.7 1.2M15.5 4l-.7 1.2'),
    thumb: D('M7.5 10.5v9.5h-3v-9.5ZM7.5 10.5 11 3.8c1.6 0 2.6 1.2 2.3 2.8l-.5 2.9h5.4a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.7H7.5'),
    brain: D('M12 5.5a3 3 0 0 0-5.6-1A3 3 0 0 0 4.5 9.5a3.2 3.2 0 0 0 .8 5.6A3 3 0 0 0 9 19.8a3 3 0 0 0 3-.8Zm0 0a3 3 0 0 1 5.6-1 3 3 0 0 1 1.9 5 3.2 3.2 0 0 1-.8 5.6 3 3 0 0 1-3.7 4.7A3 3 0 0 1 12 19') + P('M12 5.5V19'),
    muscle: D('M5 18.5c3.5 1.5 9 1.5 13-1 2.5-1.6 2.5-5.5-.5-6.5-2-.7-3.7.3-4.5 1.5L11 8.5c.8-.6 1.2-1.8.5-3L9.5 4 7 5.5l1.5 2.2C6 10 4.5 14 5 18.5Z'),
    eye: D('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z') + C(12, 12, 3),
    'face-happy': FACE + EYES + P('M8.5 14c.9 1.4 2.1 2 3.5 2s2.6-.6 3.5-2'),
    'face-laugh': FACE + P('M8 13.5h8a4 4 0 0 1-8 0ZM7.8 10l1.4-1 1.4 1M13.4 10l1.4-1 1.4 1'),
    'face-meh': FACE + EYES + P('M8.5 15h7'),
    'face-sad': FACE + EYES + P('M8.5 16c.9-1.3 2.1-2 3.5-2s2.6.7 3.5 2'),
    'face-tired': FACE + P('M8 10.5c.7.6 1.5.6 2.2 0M13.8 10.5c.7.6 1.5.6 2.2 0M10.5 15.5h3'),
    'face-dizzy': FACE + P('M7.8 8.8l2.4 2.4M10.2 8.8l-2.4 2.4M13.8 8.8l2.4 2.4M16.2 8.8l-2.4 2.4M10 15.5c1.3-.8 2.7-.8 4 0'),
    /* care & body */
    water: D('M12 3.2c-2.8 3.9-6.5 8-6.5 11.8a6.5 6.5 0 0 0 13 0c0-3.8-3.7-7.9-6.5-11.8Z') + P('M9 15.2a3 3 0 0 0 3 3'),
    bubbles: C(9, 14, 4.5, 1) + C(16.5, 8, 3) + C(17, 16.5, 1.8) + P('M7 12.5a2 2 0 0 1 2-1.5'),
    medicine: D('M10.5 4.5a4.2 4.2 0 0 1 6 0l3 3a4.2 4.2 0 0 1 0 6l-6 6a4.2 4.2 0 0 1-6 0l-3-3a4.2 4.2 0 0 1 0-6Z') + P('M7.5 10.5l6 6'),
    move: C(14.5, 4.6, 2, 1) + P('M8 21l3-6 3 2v4M6.5 11.5 9 8.5l4 1 2.5 3.5H19M11 15l2-5'),
    meditate: C(12, 5, 2, 1) + P('M12 7.5v5M7 10.5c1.8 1.5 3.3 2 5 2s3.2-.5 5-2M8 15.5l-2 4h12l-2-4M4.5 19.5h15'),
    note: D('M9 17.5a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 9 17.5ZM19 15.5a2.5 2.5 0 1 1-2.5-2.5 2.5 2.5 0 0 1 2.5 2.5Z') + P('M9 17.5V6l10-2v11.5M9 9.5l10-2'),
    feet: D('M7.5 3.5c1.8 0 2.8 2 2.8 4.5S9.5 13 7.8 13 5 10.8 5 8.2s.7-4.7 2.5-4.7ZM16.5 9c1.8 0 2.5 2 2.5 4.6s-1.3 4.9-2.8 4.9-2.5-2-2.5-4.6.9-4.9 2.8-4.9Z') + P('M6.3 15.5h3.2M15 20.5h3.2'),
    chair: P('M7 3.5v17M7 12.5h10v8M7 9h10V3.5') + D('M7 12.5h10V15H7Z'),
    bed: D('M3.5 13h17v4.5h-17Z') + P('M3.5 6v14.5M20.5 13v7.5M3.5 17.5h17') + C(7.5, 10, 1.8, 1),
    repeat: P('M4 12a7 7 0 0 1 12-4.9l2.5 2.4M18.5 4.5v5h-5M20 12a7 7 0 0 1-12 4.9l-2.5-2.4M5.5 19.5v-5h5'),
    wind: P('M3 8.5h11a2.5 2.5 0 1 0-2.5-2.5M3 12.5h15.5a2.5 2.5 0 1 1-2.5 2.5M3 16.5h8'),
    spiral: P('M12 12a1.5 1.5 0 1 1 1.5 1.5 3 3 0 0 1-3-3A4.5 4.5 0 0 1 15 6a6 6 0 0 1 6 6 7.5 7.5 0 0 1-7.5 7.5 9 9 0 0 1-9-9'),
    bridge: P('M2.5 16.5h19M5 16.5v4M19 16.5v4M5 16.5c2-5 4.5-7.5 7-7.5s5 2.5 7 7.5M9 11v5.5M15 11v5.5'),
    paw: C(12, 15.5, 4, 1) + C(6, 10, 1.8) + C(9.5, 6, 1.8) + C(14.5, 6, 1.8) + C(18, 10, 1.8),
    cat: D('M5 20.5V9L4 3.5l4.5 3h7L20 3.5 19 9v11.5Z') + DOT(9.5, 12) + DOT(14.5, 12) + P('M11 15.5h2'),
    bug: D('M8 10a4 4 0 0 1 8 0v4.5a4 4 0 0 1-8 0Z') + P('M12 10v8.5M8 12H4.5M16 12h3.5M8 16l-3 2M16 16l3 2M8.5 8 6 5.5M15.5 8 18 5.5'),
    heartbeat: D('M12 20.5s-8-4.7-8-10.6A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 8 2.7c0 5.9-8 10.6-8 10.6Z') + P('M5 12.5h3.5l1.5-2.5 2.5 5 1.5-2.5H19'),
    /* weather & time of day */
    sun: C(12, 12, 4.2, 1) + P('M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6'),
    moon: D('M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z') + P('M17 3.5V6M15.75 4.75h2.5'),
    sunrise: D('M7 17.5a5 5 0 0 1 10 0Z') + P('M3 17.5h18M7 20.5h10M12 4v3M5.6 8.1l1.8 1.8M18.4 8.1l-1.8 1.8'),
    cloud: CLOUD('18.5'),
    cloudsun: P('M8.5 3.5V5M3.5 8.5H5M4.9 4.9 6 6M12.1 4.9 11 6M5.8 11.3a3.5 3.5 0 0 1 6.5-2.6') + D('M9 20h8.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A2.9 2.9 0 0 0 9 20Z'),
    rain: CLOUD('15') + P('M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5'),
    snow: CLOUD('15') + DOT(8, 18.5) + DOT(12, 20) + DOT(16, 18.5) + DOT(10, 22) + DOT(14, 22),
    storm: CLOUD('15') + P('M12.5 14.5 10.5 18h3l-2 3.5'),
    fog: P('M4 9h16M6 13h12M4 17h16M8 5h8'),
    snowflake: P('M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5'),
    wave: P('M2.5 9c2 0 2.8-2 4.7-2s2.8 2 4.8 2 2.8-2 4.8-2 2.7 2 4.7 2M2.5 13.5c2 0 2.8-2 4.7-2s2.8 2 4.8 2 2.8-2 4.8-2 2.7 2 4.7 2M2.5 18c2 0 2.8-2 4.7-2s2.8 2 4.8 2 2.8-2 4.8-2 2.7 2 4.7 2'),
    clock: C(12, 12, 9, 1) + P('M12 7.5V12l3 2'),
    hourglass: P('M6.5 3.5h11M6.5 20.5h11') + D('M7.5 3.5c0 4 4.5 5.5 4.5 8.5s-4.5 4.5-4.5 8.5h9c0-4-4.5-5.5-4.5-8.5s4.5-4.5 4.5-8.5Z'),
    calendar: D('M4 6h16v14.5H4Z') + P('M4 10h16M8 3.5V7M16 3.5V7'),
    /* plants & the herb */
    leaf: D('M5 19C3 10 8.5 3.5 20 4c.5 11-5.5 16.5-15 15Z') + P('M5 19 14.5 9.5'),
    herb: P('M12 21V5') + D('M12 9C9.5 9 7.5 7.5 7 4.5 9.5 4.5 11.5 6 12 9ZM12 13c2.5 0 4.5-1.5 5-4.5-2.5 0-4.5 1.5-5 4.5ZM12 17c-2.5 0-4.5-1.5-5-4.5 2.5 0 4.5 1.5 5 4.5Z'),
    sprout: P('M12 21v-8.5M8 21h8') + D('M12 12.5C12 8 9 5.5 4.5 5.5 4.5 10 7.5 12.5 12 12.5Z') + D('M12 10.5c0-3.5 2.5-6 7.5-6 0 4-2.5 6-7.5 6Z'),
    potted: D('M6.5 13.5h11l-1.5 7h-8Z') + P('M5.5 13.5h13M12 13.5V8') + D('M12 9c-.5-3-2.5-4.5-5.5-4.5C6.5 7.5 8.5 9 12 9Z') + D('M12 8c.3-2.8 2.3-4.5 5.5-4.5 0 3-2 4.5-5.5 4.5Z'),
    blossom: C(12, 6.6, 2.8, 1) + C(17.1, 10.3, 2.8, 1) + C(15.2, 16.3, 2.8, 1) + C(8.8, 16.3, 2.8, 1) + C(6.9, 10.3, 2.8, 1) + C(12, 12, 1.8),
    pot: D('M5.5 9h13l-1.8 11H7.3Z') + P('M4 9h16M9 5.5c1.5 1.5 4.5 1.5 6 0'),
    hat: D('M7 18 8.5 6.5h7L17 18Z') + P('M3.5 18.5h17M8 13h8'),
    /* navigation & actions */
    home: D('M4 10.5 12 4l8 6.5v9a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z'),
    scan: P('M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7.5 8.5v7M10.5 8.5v7M13.5 8.5v7M16.5 8.5v7'),
    camera: D('M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5L9 4.5h6L16.5 7H19a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5Z') + C(12, 13.3, 3.6),
    search: C(10.5, 10.5, 6, 1) + P('M15 15l5.5 5.5'),
    settings: P('M4 7h9M17 7h3M4 17h3M11 17h9') + C(15, 7, 2, 1) + C(9, 17, 2, 1),
    bell: D('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z') + P('M10 20.5h4'),
    chat: D('M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H10l-5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z') + P('M8 10h8M8 13.2h5'),
    mail: D('M4 5.5h16A1.5 1.5 0 0 1 21.5 7v10a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 17V7A1.5 1.5 0 0 1 4 5.5Z') + P('M3 7l9 6.5L21 7'),
    megaphone: D('M4 10v4h3l8 4.5v-13L7 10Z') + P('M7 14l1.2 5h2.3l-.9-4.4M18 9.5a3.5 3.5 0 0 1 0 5'),
    film: D('M3.5 6h17v12h-17Z') + P('M7.5 6v12M16.5 6v12M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4'),
    book: D('M12 6.5C10 5 7 4.5 3.5 5v14c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z') + P('M12 6.5v14'),
    bag: D('M5 8h14l1.5 12.5h-17Z') + P('M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8'),
    cart: D('M6.2 7h14l-2 8H7.6Z') + P('M3 4h2.2l2.4 11h10.9') + C(9, 19.3, 1.4) + C(17, 19.3, 1.4),
    tag: D('M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0Z') + C(8, 8, 1.4),
    pin: D('M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z') + C(12, 10, 2.3),
    plane: D('M21 3 3 10.5l6.5 2.5L12 20.5Z') + P('M9.5 13 21 3'),
    lifebuoy: C(12, 12, 9, 1) + C(12, 12, 4) + P('M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6'),
    info: C(12, 12, 9, 1) + P('M12 11v5.5') + DOT(12, 7.8),
    mystery: C(12, 12, 9, 1) + P('M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5') + DOT(12, 16.9),
    warn: D('M10.3 4.3a2 2 0 0 1 3.4 0l7.4 12.9a2 2 0 0 1-1.7 3H4.6a2 2 0 0 1-1.7-3Z') + P('M12 9.5V14') + DOT(12, 17),
    battery: D('M3.5 8h15v8h-15Z') + P('M21 10.5v3M6 11v2'),
    plus: P('M12 5v14M5 12h14'),
    close: P('M6 6l12 12M18 6 6 18'),
    arrow: P('M5 12h14M13 6l6 6-6 6'),
    chevron: P('M9 6l6 6-6 6'),
    pause: P('M8.5 5.5v13M15.5 5.5v13'),
    play: D('M7.5 4.8 19 12 7.5 19.2Z'),
    dot: C(12, 12, 5, 1),
    /* food: stand-ins for ingredient emoji */
    plate: C(12, 12, 6) + C(12, 12, 3.5, 1) + P('M2.5 4v4.5a1.5 1.5 0 0 0 3 0V4M4 8.5V20M21.5 20V4c-2 1-3 3.5-3 6.5h3'),
    cutlery: P('M7 3.5v6a2 2 0 0 0 2 2v9M11 3.5v6a2 2 0 0 1-2 2M9 3.5v5M17 20.5v-17c-2.2 1.5-3 4-3 7.5h3'),
    bowl: D('M3.5 11h17a8.5 8.5 0 0 1-17 0Z') + P('M9 7.5c0-1 1-1.5 1-2.5M13 7.5c0-1 1-1.5 1-2.5M8 20.5h8'),
    salad: D('M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z') + P('M7.5 11.5c-.8-2.4.7-4.8 3.2-4.8.6-2 3.6-2.4 4.6-.4 2-.4 3.4 1.6 2.9 4.2M12 11.5l1.5-3'),
    noodles: D('M3.5 12h17a8.5 8.5 0 0 1-17 0Z') + P('M14 3.5 9.5 12M19.5 5l-8 7M7 12c0-1.5 1-2 2.5-2s2 1 3.5 1 2-.8 3-.8'),
    cheese: D('M3 14.5 15.5 6l5.5 4.5v8.5H3Z') + P('M3 14.5h18') + C(8.5, 17, 1) + C(15.5, 12, 0.9),
    milk: D('M7 3.5h10l-1.4 16.3a1 1 0 0 1-1 .9H9.4a1 1 0 0 1-1-.9Z') + P('M7.6 10h8.8'),
    greens: D('M12 20.5c-4.5 0-7.5-3.5-7.5-8 0-3.3 1.6-5.6 3.6-6.5C9 4 10.4 3.2 12 3.2s3 .8 3.9 2.8c2 .9 3.6 3.2 3.6 6.5 0 4.5-3 8-7.5 8Z') + P('M12 20.5V8M12 13l-3-2.5M12 16l3.5-3'),
    broccoli: D('M7.2 13.8a3.4 3.4 0 0 1-.4-6.7 4 4 0 0 1 7.6-1.6 3.4 3.4 0 0 1 3.4 5.9 2.8 2.8 0 0 1-1.6 2.4Z') + P('M10 13.8l-1 6.7h6l-1-6.7M12 13.8V11'),
    cucumber: D('M5.2 18.8c-2-2-.8-6 3.5-10.3S17 3.2 19 5.2s.8 6-3.5 10.3-8.3 5.3-10.3 3.3Z') + DOT(8.5, 13.5) + DOT(12, 10.5) + DOT(14.8, 8) + DOT(11, 15.5),
    carrot: D('M15.5 8.5c-1.5-1.5-3.5-1.5-5 0L3.5 19c-.6.6-.1 1.5.5 1.5l11.5-7c1.5-1 1.5-3.5 0-5Z') + P('M15.5 8.5 19 5M15.5 8.5 20.5 8M15.5 8.5 16 3.5M7 15.5l1.5 1M10 12l1.5 1'),
    pepper: D('M12 7.5c-4 0-6.5 2.8-6.5 6.8 0 4 2.5 6.2 4.2 6.2 1 0 1.5-.6 2.3-.6s1.3.6 2.3.6c1.7 0 4.2-2.2 4.2-6.2 0-4-2.5-6.8-6.5-6.8Z') + P('M12 7.5c0-2 .8-3.3 2.5-4M10.5 9.5c-.5 2-.5 6.5 1 9'),
    chili: D('M18.5 6.5c-.5 6.5-5.5 13-14 13 4.5-2.5 6-7 7.5-10.5 1.5-2.5 4-3.2 6.5-2.5Z') + P('M18.5 6.5c.5-1.5 1.5-2.5 3-3'),
    onion: D('M12 3.5c0 2-6.5 5-6.5 10a6.5 6.5 0 0 0 13 0c0-5-6.5-8-6.5-10Z') + P('M12 9c-2 2.5-2.5 6-1.5 11M12 9c2 2.5 2.5 6 1.5 11'),
    mushroom: D('M3.5 12.5C3.5 7.5 7.3 4 12 4s8.5 3.5 8.5 8.5Z') + P('M9.5 12.5V18a2.5 2.5 0 0 0 5 0v-5.5'),
    avocado: D('M12 3c-2.5 0-3.6 2.4-4.6 5.3-.7 2-2.4 3.6-2.4 6.2a7 7 0 0 0 14 0c0-2.6-1.7-4.2-2.4-6.2C15.6 5.4 14.5 3 12 3Z') + C(12, 14.5, 2.8, 1),
    tomato: D('M12 6.5c4.5 0 8 2.8 8 7s-3.5 7-8 7-8-2.8-8-7 3.5-7 8-7Z') + P('M12 6.5 10 4.5M12 6.5l2-2M12 6.5 8.5 7M12 6.5l3.5.5'),
    apple: D('M12 7.5c-1.5-1-5.5-1.5-6.8 2.5-1.2 3.6.6 8.5 3.3 10 1.3.7 2.2.2 3.5.2s2.2.5 3.5-.2c2.7-1.5 4.5-6.4 3.3-10-1.3-4-5.3-3.5-6.8-2.5Z') + P('M12 7.5c0-2 .5-3.3 1.8-4.2'),
    lemon: D('M4 12c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5-3.6 7.5-8 7.5S4 16.4 4 12Z') + P('M2.5 12H4M20 12h1.5'),
    berries: C(8, 15, 3.5, 1) + C(15.5, 15.5, 3.5, 1) + C(12, 9, 3.5, 1) + P('M12 5.5c0-1.2.6-2 1.8-2.5'),
    banana: D('M4 13.5c3 3.5 8.5 4.5 12.5 1.5 2.8-2.1 3.8-5.8 3-9.5l-1.8-.5c.3 3.3-.9 6.1-3.5 7.6C11 14.5 7 14.5 4 13.5Z') + P('M18.5 5l.5-2'),
    nut: D('M12 4c4.5 0 7.5 3 7.5 6.5h-15C4.5 7 7.5 4 12 4Z') + D('M5 10.5h14c0 5-3.2 9-7 9.5-3.8-.5-7-4.5-7-9.5Z') + P('M12 4V2.5'),
    olive: D('M7.5 16.5c-2.5-2.5-2-6.7 1-9.7s7.2-3.5 9.7-1 2 6.7-1 9.7-7.2 3.5-9.7 1Z') + P('M18.2 5.8 21 3'),
    egg: D('M12 3.5c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0c0-4.5 3-10 6.5-10Z'),
    pan: C(10, 12, 6.5, 1) + C(10, 12, 2.3) + P('M16.2 14.5l5.3 3'),
    drumstick: D('M14.5 3.5a6 6 0 0 1 4.3 10.2c-2.4 2.4-5.5 2.2-7 1.6l-2.6 2.6a2 2 0 1 1-2.6 2.6 2 2 0 1 1-2.6-2.6l2.6-2.6c-.6-1.5-.8-4.6 1.6-7a6 6 0 0 1 6.3-4.8Z'),
    steak: D('M6.5 6c3.5-3 9.5-3 12.3.6 2.5 3.2 1.6 8.5-2.3 11.4-3.5 2.6-9 3.4-11.5.4C3 15.6 3 9 6.5 6Z') + C(14.5, 10, 2),
    burger: D('M4 11c0-3.9 3.6-6.5 8-6.5s8 2.6 8 6.5Z') + P('M3.5 14c1.5 1 2.5-1 4 0s2.5 1 4 0 2.5-1 4 0 2.5 1 4.5 0') + D('M4.5 16.5h15V18a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 18Z'),
    fish: D('M3 12c3-4.5 8-6 12.5-4.2L20.5 5v14l-5-2.8C11 18 6 16.5 3 12Z') + DOT(8, 11.5),
    shrimp: D('M18.5 6.5A8 8 0 0 0 5 12c0 4 3 7 7 7.5l2-2.5-2.5-2a3 3 0 0 1 0-6c2.5 0 4 1 6.5 1.5Z') + P('M18.5 6.5 21 4M18.5 6.5 21 8.5'),
    bread: D('M5 10.5a3.5 3.5 0 0 1 1-6.5h12a3.5 3.5 0 0 1 1 6.5v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z'),
    pancakes: D('M4 9.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5-3.6 2.5-8 2.5-8-1.1-8-2.5Z') + P('M4 9.5V12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V9.5M4 12v2.5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V12M4 14.5V17c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-2.5'),
    rice: D('M12 4c2.2 0 8.5 9.5 8.5 13a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3C3.5 13.5 9.8 4 12 4Z') + P('M8.5 14h7v6h-7Z'),
    chocolate: D('M6 3.5h12v17H6Z') + P('M6 9h12M6 14.5h12M12 3.5v17'),
    cookie: C(12, 12, 8.5, 1) + DOT(9, 9) + DOT(14.5, 8.5) + DOT(15.5, 14) + DOT(10, 15) + DOT(12, 12),
    pudding: D('M7 9h10l2 9.5H5Z') + P('M3.5 18.5h17M9 9c0-2.5 1.5-4 3-4s3 1.5 3 4'),
    icecream: D('M7.5 10a4.5 4.5 0 0 1 9 0Z') + P('M7.5 10 12 21l4.5-11'),
    coffee: D('M4.5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z') + P('M16.5 10.5H18a2.5 2.5 0 0 1 0 5h-1.5M8.5 3.5c-.8 1 .8 2 0 3M12.5 3.5c-.8 1 .8 2 0 3'),
    tea: D('M4.5 10h13l-.8 6.5a4 4 0 0 1-4 3.5H9.3a4 4 0 0 1-4-3.5Z') + P('M17.5 11.5h1a2.3 2.3 0 0 1 0 4.6H17M8 4.5c1 1 1 2 0 3.2M12 4.5c1 1 1 2 0 3.2'),
    cup: D('M6.5 7.5h11l-1.5 13H8Z') + P('M5.5 7.5h13M12.5 7.5 14 2.5l3-.5'),
    bottle: D('M9.5 8.5 10 6h4l.5 2.5c1.5.8 2 1.8 2 3.5v8a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-8c0-1.7.5-2.7 2-3.5Z') + P('M10 3.5h4V6h-4Z'),
    salt: D('M8 9.5h8l.8 10.2a1 1 0 0 1-1 1.1H8.2a1 1 0 0 1-1-1.1Z') + P('M8 9.5c0-3.5 1.6-6 4-6s4 2.5 4 6') + DOT(10.5, 6.6) + DOT(13.5, 6.6) + DOT(12, 5),
    jar: D('M6.5 8.5h11v11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1Z') + P('M7.5 4h9v4.5h-9ZM9.5 13.5h5'),
    ice: D('M5 8 12 4.5 19 8v8l-7 3.5L5 16Z') + P('M5 8l7 3.5L19 8M12 11.5v8'),
    knife: D('M4 20 15 9l1.5 1.5c-2 4-6.5 8-12.5 9.5Z') + P('M15 9l3.5-3.5a1.4 1.4 0 0 1 2 2L17 11')
  };
  Object.keys(ZODIAC).forEach(function (k) { I[k] = P(ZODIAC[k]); });
  I.drop = I.water;

  /* emoji -> icon. Keys are emoji with variation selectors and skin tones removed. */
  var MAP = {};
  function add(name, list) { Array.from(list).forEach(function (ch) { MAP[ch] = name; }); }
  var GROUPS = [
    ['flame', '🔥'], ['shield', '🛡'], ['trophy', '🏆'], ['medal', '🥇🥈🥉🏅🎖'], ['crown', '👑'], ['star', '⭐🌟'],
    ['sparkle', '✨❇✳🎇🎆'], ['comet', '💫☄🌠'], ['gift', '🎁🎀'], ['gem', '💎💍'], ['lock', '🔒🔐🔏'],
    ['checkCircle', '✅☑✔'], ['bolt', '⚡'], ['target', '🎯'], ['chart', '📈📊📉'],
    ['heart', '❤🧡💛💚💙💜🖤🤍🤎💕💞💓💗💖💘💝♥😍🥰😘'], ['cake', '🎂🍰🧁'], ['party', '🎉🎊🥳🪅'],
    ['puzzle', '🧩'], ['user', '👤🧑👩👨🧒🙋💁'], ['users', '👥👫👬👭👪'], ['hand', '👋✋🖐🤚'], ['hands', '🙏👏🙌🤝🫶👐'],
    ['thumb', '👍👌✌🤙💯'], ['brain', '🧠🤯'], ['muscle', '💪🦾🦿🏋'], ['eye', '👀👁🔭'],
    ['face-happy', '🙂😊☺😀😃😄😁😋🤤😇🤗😌🥲'], ['face-laugh', '😂🤣😆😅😜😝😛'], ['face-meh', '😐😑😶🫤😮😯😬🙄😏'],
    ['face-sad', '😕🙁☹😞😔😢😭😖😣😫😩😟😥😰😓😤😠😡🥺'], ['face-tired', '😴😪🥱💤'], ['face-dizzy', '😵🥴🤢🤮🤒🤕🤧'],
    ['mystery', '🤔❔❓⁉‼'], ['info', 'ℹ📝📋📄📃🗒'], ['warn', '⚠🚨⛔🚫❌❗❕'], ['lifebuoy', '🆘🛟'],
    ['water', '💧💦🚰🚿'], ['bubbles', '🫧'], ['medicine', '💊💉🩹🧴'], ['heartbeat', '🩺🫀'], ['move', '🏃🚶🤸⛹🚴🏊🤾🏌🧗💃🕺'],
    ['meditate', '🧘🧎🙆🙇'], ['note', '🎵🎶🎧🎤🎼'], ['feet', '🦶👣🦵👟👠🥾🩴'], ['chair', '🪑💺'], ['bed', '🛏🛌'],
    ['repeat', '🔄🔁🔃♻'], ['wind', '🌬🫁💨'], ['spiral', '🌀🌪🐚'], ['bridge', '🌉🌁'], ['paw', '🐻🐾🐶🐕🦮🐼🐨'], ['cat', '🐈🐱'],
    ['bug', '🪲🐛🐞🦋🐜'], ['sun', '☀🌞🔆😎'], ['moon', '🌙🌚🌛🌜🌝🌑🌒🌓🌔🌕🌖🌗🌘🌃'], ['sunrise', '🌅🌄🌇🌆'],
    ['cloud', '☁'], ['cloudsun', '⛅🌤🌥🌦'], ['rain', '🌧☔☂'], ['snow', '🌨☃⛄'], ['storm', '⛈🌩'], ['fog', '🌫'],
    ['snowflake', '❄'], ['wave', '🌊'], ['clock', '🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛⏰⏱⏲🕰⌚'], ['hourglass', '⏳⌛'], ['calendar', '📅📆🗓'],
    ['herb', '🌿🍃☘🍀🌾🌴🌳🌲🎋🎍'], ['sprout', '🌱'], ['potted', '🪴'], ['blossom', '🌸🌺🌷💐🌹🌻🌼🏵🪷🪻'], ['leaf', '🍂🍁'],
    ['hat', '🎩🧢👒🎓🪖'], ['home', '🏠🏡🏘'], ['scan', '🔖'], ['camera', '📷📸🤳📹🎥'], ['search', '🔍🔎'],
    ['settings', '⚙🛠🔧🎛'], ['bell', '🔔🔕'], ['chat', '💬🗨💭🗯'], ['mail', '✉📧📨📩💌📬📮'], ['megaphone', '📣📢'],
    ['film', '🎬🎞📺📽'], ['book', '📖📚📕📗📘📙📓📔'], ['bag', '🛍👜🎒'], ['cart', '🛒'], ['tag', '🏷💶💰💸💳🪙'], ['pin', '📍📌🗺'],
    ['plane', '✈🛫🛬🚀'], ['battery', '🪫🔋'], ['plus', '➕'], ['close', '✖❎'], ['arrow', '➡⬆⬇⬅↗↘↙↖▶⏩'], ['pause', '⏸'], ['play', '⏯'],
    ['dot', '🔵🟣🟢⚪🔘'], ['jar', '🟡🟩🟤🟠🔴⚫🟥🟧🟨🟦🟪🟫⬛⬜🫙🥫🍯'],
    ['plate', '🍽🍱'], ['cutlery', '🍴🥄🥢'], ['bowl', '🥣🍲🫕🥘🍛'], ['salad', '🥗'], ['noodles', '🍝🍜'], ['cheese', '🧀'],
    ['milk', '🥛🍼'], ['greens', '🥬'], ['broccoli', '🥦'], ['cucumber', '🥒🫛'], ['carrot', '🥕'], ['pepper', '🫑'],
    ['chili', '🌶'], ['onion', '🧅🧄🫚'], ['mushroom', '🍄'], ['avocado', '🥑🥝'], ['tomato', '🍅🍆🥔🍠'], ['apple', '🍎🍏🍐🍑'],
    ['lemon', '🍋🍊🥭🍍🥥'], ['berries', '🫐🍇🍓🍒'], ['banana', '🍌'], ['nut', '🌰🥜🌽'], ['olive', '🫒'], ['egg', '🥚'],
    ['pan', '🍳'], ['drumstick', '🍗🦃🐔🐓'], ['steak', '🥩🍖🥓🐷🐄🐂'], ['burger', '🍔🌭🌮🌯🥙🥪🍕🍟🫔'], ['fish', '🐟🐠🍣🐡🦈'],
    ['shrimp', '🦐🦞🦀🦑🦪🍤'], ['bread', '🍞🥖🥨🫓🧆'], ['pancakes', '🥞🧇🥐🥯'], ['rice', '🍙🍚🍘🥟'], ['chocolate', '🍫'], ['cookie', '🍪🥠🍩'],
    ['pudding', '🍮🥧'], ['icecream', '🍦🍨🍧'], ['coffee', '☕'], ['tea', '🍵🫖🧉'], ['cup', '🥤🧃🧋🍹🍸🥂🍷🍺🍻🥃🍶'], ['bottle', '🍾'],
    ['salt', '🧂'], ['ice', '🧊'], ['knife', '🔪🗡'],
    ['Aries', '♈'], ['Taurus', '♉'], ['Gemini', '♊'], ['Cancer', '♋'], ['Leo', '♌'], ['Virgo', '♍'],
    ['Libra', '♎'], ['Scorpio', '♏'], ['Sagittarius', '♐'], ['Capricorn', '♑'], ['Aquarius', '♒'], ['Pisces', '♓']
  ];
  GROUPS.forEach(function (g) { add(g[0], g[1]); });

  var LABEL = {
    flame: 'Streak', shield: 'Shield', trophy: 'Trophy', medal: 'Medal', crown: 'Crown', star: 'Star', sparkle: 'Sparkle', comet: 'Shooting star',
    gift: 'Gift', gem: 'Gem', lock: 'Locked', check: 'Done', checkCircle: 'Done', bolt: 'Energy', target: 'Goal', heart: 'Heart', cake: 'Birthday',
    party: 'Celebrate', chart: 'Progress', puzzle: 'Personality', user: 'Profile', users: 'Community', hand: 'Hello', hands: 'Thanks', thumb: 'Good',
    brain: 'Mind', muscle: 'Strength', eye: 'Look', 'face-happy': 'Good', 'face-laugh': 'Laughing', 'face-meh': 'Okay', 'face-sad': 'Low',
    'face-tired': 'Tired', 'face-dizzy': 'Unwell', water: 'Water', drop: 'Water', bubbles: 'Bubbles', medicine: 'Vitamin', heartbeat: 'Health',
    move: 'Move', meditate: 'Calm', note: 'Dance', feet: 'Steps', chair: 'Chair', bed: 'Rest', repeat: 'Repeat', wind: 'Breath', spiral: 'Twist',
    bridge: 'Bridge', paw: 'Animal', cat: 'Cat', bug: 'Bug', sun: 'Sun', moon: 'Night', sunrise: 'Sunrise', cloud: 'Cloudy', cloudsun: 'Partly cloudy',
    rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm', fog: 'Fog', snowflake: 'Cold', wave: 'Wave', clock: 'Time', hourglass: 'Fasting', calendar: 'Calendar',
    leaf: 'Leaf', herb: 'Herb', sprout: 'Sprout', potted: 'Plant', blossom: 'Bloom', pot: 'Pot', hat: 'Outfit', home: 'Home', scan: 'Scan',
    camera: 'Camera', search: 'Search', settings: 'Settings', bell: 'Notifications', chat: 'Chat', mail: 'Message', megaphone: 'Share', film: 'Video',
    book: 'Book', bag: 'Bag', cart: 'Shopping list', tag: 'Price', pin: 'Place', plane: 'Travel', lifebuoy: 'Help', info: 'Info', mystery: 'Question',
    warn: 'Warning', battery: 'Low energy', plus: 'Add', close: 'Close', arrow: 'Next', chevron: 'Next', pause: 'Pause', play: 'Play', dot: 'Dot',
    plate: 'Meal', cutlery: 'Food', bowl: 'Bowl', salad: 'Salad', noodles: 'Noodles', cheese: 'Cheese', milk: 'Milk', greens: 'Greens',
    broccoli: 'Broccoli', cucumber: 'Cucumber', carrot: 'Carrot', pepper: 'Pepper', chili: 'Chili', onion: 'Onion', mushroom: 'Mushroom',
    avocado: 'Avocado', tomato: 'Tomato', apple: 'Fruit', lemon: 'Citrus', berries: 'Berries', banana: 'Banana', nut: 'Nuts', olive: 'Olive',
    egg: 'Egg', pan: 'Fried egg', drumstick: 'Chicken', steak: 'Meat', burger: 'Burger', fish: 'Fish', shrimp: 'Seafood', bread: 'Bread',
    pancakes: 'Pancakes', rice: 'Rice', chocolate: 'Chocolate', cookie: 'Cookie', pudding: 'Dessert', icecream: 'Ice cream', coffee: 'Coffee',
    tea: 'Tea', cup: 'Drink', bottle: 'Bottle', salt: 'Spice', jar: 'Condiment', ice: 'Ice', knife: 'Knife'
  };
  Object.keys(ZODIAC).forEach(function (z) { LABEL[z] = z; });

  function norm(s) { return String(s || '').replace(/[\uFE0E\uFE0F]/g, '').replace(/[\u{1F3FB}-\u{1F3FF}]/gu, ''); }
  function fallback(cp) {
    if ((cp >= 0x1F600 && cp <= 0x1F64F) || (cp >= 0x1F910 && cp <= 0x1F92F) || (cp >= 0x1F970 && cp <= 0x1F97A)) return 'face-happy';
    if ((cp >= 0x1F32D && cp <= 0x1F37F) || (cp >= 0x1F950 && cp <= 0x1F96F) || (cp >= 0x1F9C0 && cp <= 0x1F9CB) || (cp >= 0x1FAD0 && cp <= 0x1FADB)) return 'cutlery';
    if (cp >= 0x1F331 && cp <= 0x1F344) return 'herb';
    if ((cp >= 0x1F44A && cp <= 0x1F450) || (cp >= 0x1F918 && cp <= 0x1F91F)) return 'hands';
    if ((cp >= 0x1F400 && cp <= 0x1F43F) || (cp >= 0x1F980 && cp <= 0x1F9AE)) return 'paw';
    if (cp >= 0x1F300 && cp <= 0x1F321) return 'cloudsun';
    return 'sparkle';
  }
  function kind(e) {
    var s = norm(e);
    if (!s) return 'sparkle';
    if (MAP[s]) return MAP[s];
    var parts = s.split('\u200D');
    if (MAP[parts[0]]) return MAP[parts[0]];
    var first = Array.from(parts[0])[0];
    if (MAP[first]) return MAP[first];
    if (/^[0-9#*]\u20E3$/.test(s)) return 'dot';
    return fallback(first.codePointAt(0));
  }
  function escAttr(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* own label words, so icon names never touch the app's shared dictionary */
  var L10N = {
    de: { Streak: 'Serie', Shield: 'Schild', Trophy: 'Pokal', Medal: 'Medaille', Crown: 'Krone', Star: 'Stern', Sparkle: 'Funkeln', 'Shooting star': 'Sternschnuppe', Gift: 'Geschenk', Gem: 'Juwel', Locked: 'Gesperrt', Done: 'Erledigt', Energy: 'Energie', Goal: 'Ziel', Heart: 'Herz', Birthday: 'Geburtstag', Celebrate: 'Feiern', Progress: 'Fortschritt', Personality: 'Persönlichkeit', Profile: 'Profil', Community: 'Community', Hello: 'Hallo', Thanks: 'Danke', Good: 'Gut', Laughing: 'Lachen', Okay: 'Okay', Low: 'Mies', Tired: 'Müde', Unwell: 'Unwohl', Water: 'Wasser', Vitamin: 'Vitamin', Move: 'Bewegung', Calm: 'Ruhe', Dance: 'Tanzen', Steps: 'Schritte', Rest: 'Ruhe', Breath: 'Atem', Sun: 'Sonne', Night: 'Nacht', Sunrise: 'Sonnenaufgang', Cloudy: 'Bewölkt', 'Partly cloudy': 'Teils bewölkt', Rain: 'Regen', Snow: 'Schnee', Thunderstorm: 'Gewitter', Fog: 'Nebel', Cold: 'Kalt', Time: 'Zeit', Fasting: 'Fasten', Calendar: 'Kalender', Leaf: 'Blatt', Herb: 'Kraut', Sprout: 'Spross', Plant: 'Pflanze', Bloom: 'Blüte', Outfit: 'Outfit', Home: 'Home', Scan: 'Scan', Camera: 'Kamera', Search: 'Suche', Settings: 'Einstellungen', Notifications: 'Mitteilungen', Message: 'Nachricht', Share: 'Teilen', 'Shopping list': 'Einkaufsliste', Help: 'Hilfe', Info: 'Info', Question: 'Frage', Warning: 'Warnung', Meal: 'Mahlzeit', Food: 'Essen', Drink: 'Getränk', Look: 'Ansehen', Aries: 'Widder', Taurus: 'Stier', Gemini: 'Zwillinge', Cancer: 'Krebs', Leo: 'Löwe', Virgo: 'Jungfrau', Libra: 'Waage', Scorpio: 'Skorpion', Sagittarius: 'Schütze', Capricorn: 'Steinbock', Aquarius: 'Wassermann', Pisces: 'Fische', /* button sweep 16:20: food, move and control icons */ Mind: 'Geist', Strength: 'Kraft', Bubbles: 'Blasen', Health: 'Gesundheit', Chair: 'Stuhl', Repeat: 'Wiederholen', Twist: 'Drehung', Bridge: 'Brücke', Animal: 'Tier', Cat: 'Katze', Bug: 'Käfer', Wave: 'Welle', Pot: 'Topf', Chat: 'Chat', Video: 'Video', Book: 'Buch', Bag: 'Tasche', Price: 'Preis', Place: 'Ort', Travel: 'Reise', 'Low energy': 'Wenig Energie', Add: 'Hinzufügen', Close: 'Schließen', Next: 'Weiter', Pause: 'Pause', Play: 'Abspielen', Dot: 'Punkt', Bowl: 'Schüssel', Salad: 'Salat', Noodles: 'Nudeln', Cheese: 'Käse', Milk: 'Milch', Greens: 'Grünzeug', Broccoli: 'Brokkoli', Cucumber: 'Gurke', Carrot: 'Karotte', Pepper: 'Paprika', Chili: 'Chili', Onion: 'Zwiebel', Mushroom: 'Pilz', Avocado: 'Avocado', Tomato: 'Tomate', Fruit: 'Obst', Citrus: 'Zitrus', Berries: 'Beeren', Banana: 'Banane', Nuts: 'Nüsse', Olive: 'Olive', Egg: 'Ei', 'Fried egg': 'Spiegelei', Chicken: 'Hähnchen', Meat: 'Fleisch', Burger: 'Burger', Fish: 'Fisch', Seafood: 'Meeresfrüchte', Bread: 'Brot', Pancakes: 'Pfannkuchen', Rice: 'Reis', Chocolate: 'Schokolade', Cookie: 'Keks', Dessert: 'Dessert', 'Ice cream': 'Eis', Coffee: 'Kaffee', Tea: 'Tee', Bottle: 'Flasche', Spice: 'Gewürz', Condiment: 'Soße', Ice: 'Eiswürfel', Knife: 'Messer' },
    es: { Streak: 'Racha', Shield: 'Escudo', Trophy: 'Trofeo', Medal: 'Medalla', Crown: 'Corona', Star: 'Estrella', Sparkle: 'Brillo', 'Shooting star': 'Estrella fugaz', Gift: 'Regalo', Gem: 'Gema', Locked: 'Bloqueado', Done: 'Hecho', Energy: 'Energía', Goal: 'Meta', Heart: 'Corazón', Birthday: 'Cumpleaños', Celebrate: 'Celebrar', Progress: 'Progreso', Personality: 'Personalidad', Profile: 'Perfil', Community: 'Comunidad', Hello: 'Hola', Thanks: 'Gracias', Good: 'Bien', Laughing: 'Risa', Okay: 'Normal', Low: 'Bajón', Tired: 'Cansancio', Unwell: 'Malestar', Water: 'Agua', Vitamin: 'Vitamina', Move: 'Movimiento', Calm: 'Calma', Dance: 'Baile', Steps: 'Pasos', Rest: 'Descanso', Breath: 'Respiración', Sun: 'Sol', Night: 'Noche', Sunrise: 'Amanecer', Cloudy: 'Nublado', 'Partly cloudy': 'Parcialmente nublado', Rain: 'Lluvia', Snow: 'Nieve', Thunderstorm: 'Tormenta', Fog: 'Niebla', Cold: 'Frío', Time: 'Hora', Fasting: 'Ayuno', Calendar: 'Calendario', Leaf: 'Hoja', Herb: 'Hierba', Sprout: 'Brote', Plant: 'Planta', Bloom: 'Flor', Outfit: 'Atuendo', Home: 'Inicio', Scan: 'Escanear', Camera: 'Cámara', Search: 'Buscar', Settings: 'Ajustes', Notifications: 'Avisos', Message: 'Mensaje', Share: 'Compartir', 'Shopping list': 'Lista de compra', Help: 'Ayuda', Info: 'Info', Question: 'Pregunta', Warning: 'Aviso', Meal: 'Comida', Food: 'Comida', Drink: 'Bebida', Look: 'Ver', Aries: 'Aries', Taurus: 'Tauro', Gemini: 'Géminis', Cancer: 'Cáncer', Leo: 'Leo', Virgo: 'Virgo', Libra: 'Libra', Scorpio: 'Escorpio', Sagittarius: 'Sagitario', Capricorn: 'Capricornio', Aquarius: 'Acuario', Pisces: 'Piscis', /* button sweep 16:20 */ Mind: 'Mente', Strength: 'Fuerza', Bubbles: 'Burbujas', Health: 'Salud', Chair: 'Silla', Repeat: 'Repetir', Twist: 'Giro', Bridge: 'Puente', Animal: 'Animal', Cat: 'Gato', Bug: 'Bicho', Wave: 'Ola', Pot: 'Olla', Chat: 'Chat', Video: 'Vídeo', Book: 'Libro', Bag: 'Bolsa', Price: 'Precio', Place: 'Lugar', Travel: 'Viaje', 'Low energy': 'Poca energía', Add: 'Añadir', Close: 'Cerrar', Next: 'Siguiente', Pause: 'Pausa', Play: 'Reproducir', Dot: 'Punto', Bowl: 'Cuenco', Salad: 'Ensalada', Noodles: 'Fideos', Cheese: 'Queso', Milk: 'Leche', Greens: 'Verduras', Broccoli: 'Brócoli', Cucumber: 'Pepino', Carrot: 'Zanahoria', Pepper: 'Pimiento', Chili: 'Guindilla', Onion: 'Cebolla', Mushroom: 'Seta', Avocado: 'Aguacate', Tomato: 'Tomate', Fruit: 'Fruta', Citrus: 'Cítricos', Berries: 'Bayas', Banana: 'Plátano', Nuts: 'Frutos secos', Olive: 'Aceituna', Egg: 'Huevo', 'Fried egg': 'Huevo frito', Chicken: 'Pollo', Meat: 'Carne', Burger: 'Hamburguesa', Fish: 'Pescado', Seafood: 'Marisco', Bread: 'Pan', Pancakes: 'Tortitas', Rice: 'Arroz', Chocolate: 'Chocolate', Cookie: 'Galleta', Dessert: 'Postre', 'Ice cream': 'Helado', Coffee: 'Café', Tea: 'Té', Bottle: 'Botella', Spice: 'Especia', Condiment: 'Salsa', Ice: 'Hielo', Knife: 'Cuchillo' }
  };
  function tr(s) {
    try {
      var lang = root.LowiLang && root.LowiLang.get ? root.LowiLang.get() : 'en';
      return (L10N[lang] && L10N[lang][s]) || s;
    } catch (e) { return s; }
  }
  function svg(name, o) {
    o = o || {};
    if (!I[name]) name = 'sparkle';
    var a11y = o.label ? ' role="img" aria-label="' + escAttr(o.label) + '"' : ' aria-hidden="true"';
    return '<svg class="sp-symbol li li-' + name + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false"' + a11y + '>' + I[name] + '</svg>';
  }
  /* an emoji in UI text becomes an icon. alone: it was the only text in its slot, so it carries the meaning and gets a label */
  function fromEmoji(e, o) {
    o = o || {};
    var k = kind(e);
    return svg(k, { label: o.alone ? (o.label || tr(LABEL[k] || 'Icon')) : '' });
  }
  function label(name) { return LABEL[name] || name; }

  var api = {
    svg: svg, kind: kind, fromEmoji: fromEmoji, label: label, zodiac: ZODIAC, map: MAP, version: '20261014-icons',
    has: function (n) { return Object.prototype.hasOwnProperty.call(I, n); },
    names: function () { return Object.keys(I); }
  };

  /* one shared set: the herb world draws through LowiSpiritCore.icon, so upgrade it in place */
  var K = root.LowiSpiritCore;
  if (K && !K.__liIcons) {
    K.__liIcons = true;
    var oldIcon = K.icon;
    K.icon = function (k) { return Object.prototype.hasOwnProperty.call(I, k) ? svg(k) : oldIcon(k); };
    if (K.paths) Object.keys(ZODIAC).forEach(function (z) { K.paths[z] = ZODIAC[z]; });
  }
  /* the streak-shield count line is translated by a pattern that starts with its emoji; once the emoji is an icon the rest still needs German/Spanish */
  (function addLang(n) {
    if (!root.LowiLang || !root.LowiLang.add) { if (n < 40 && root.document && root.setTimeout) root.setTimeout(function () { addLang(n + 1); }, 300); return; }
    root.LowiLang.add([[/^\s*(\d+) shields?$/, '$1 × Schild', '$1 × escudo']]);
  })(0);
  root.LowiIcons = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
