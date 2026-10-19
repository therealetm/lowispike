/* LOWiSPIKE reading time: how long any text bubble stays up, from how much it says.
   One rule for the whole app (speech bubbles, Misty's lines, cell guides, toasts):
   about 200 words a minute (300 ms a word, or 55 ms a character for long-word languages like German, whichever is longer),
   plus a lead so the eye can find the bubble, never under the minimum and never forever.
   Only how long text stays up; no animation speed lives here. Pure, no DOM. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiReadTime = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
    'use strict';
    const WPM = 200, MS_WORD = 60000 / WPM, MS_CHAR = 55;
    const LEAD = 2000;          /* time to notice the bubble and start reading */
    const MIN_SPEECH = 4500;    /* a speech bubble never auto-hides sooner than this */
    const MIN_TOAST = 3000;     /* a short status toast ("Saved") */
    const FLOOR = 3000;         /* nothing auto-replaces a line before it has been up this long */
    const MAX = 24000;          /* never forever */
    function words(text) { const s = String(text == null ? '' : text).trim(); return s ? s.split(/\s+/).length : 0; }
    function chars(text) { return String(text == null ? '' : text).replace(/\s+/g, ' ').trim().length; }
    /* ms the text needs on screen. opts.min / opts.max override the bounds; opts.kind 'toast' uses the toast minimum. */
    function ms(text, opts) {
        const o = opts || {};
        const min = o.min != null ? o.min : (o.kind === 'toast' ? MIN_TOAST : MIN_SPEECH);
        const max = o.max != null ? o.max : MAX;
        const read = LEAD + Math.max(words(text) * MS_WORD, chars(text) * MS_CHAR);
        return Math.round(Math.min(Math.max(read, min), Math.max(min, max)));
    }
    /* a caller's own duration is respected only when it is longer than the reading time */
    function atLeast(text, given, opts) { const r = ms(text, opts); return given > r ? given : r; }
    /* how long the current line must stay before another one may replace it automatically:
       the full reading time, or, for a more important line, no sooner than the floor and 60% of the reading time */
    function holdMs(text, prio, newPrio, opts) {
        const r = ms(text, opts);
        return newPrio > prio ? Math.max(FLOOR, Math.round(r * 0.6)) : r;
    }
    return { WPM, MS_WORD, MS_CHAR, LEAD, MIN_SPEECH, MIN_TOAST, FLOOR, MAX, words, chars, ms, atLeast, holdMs };
});
