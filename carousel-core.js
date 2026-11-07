/* LOWiSPIKE · carousel posts (6 Nov 2026, Emmanuel: carousels on For You, "swipe right through the pictures").
   Pure rules, no DOM: which pictures a post swipes through, where each one is stored, which files go when the post is deleted,
   which dot is lit. A carousel is a post with 2 to 6 photos; the first is the cover (photo / photo_url, as every photo post has).
   The others are stored next to it in the same bucket folder (<uid>/<id>-2.jpg ... <id>-6.jpg) and the whole list rides in the
   post's meta.slides, so the posts table needs no new column. On the phone a shared carousel keeps the links, not six pictures. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiCarousel = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
    'use strict';
    /* Nov 7 2026: 8 = the week carousel's cart plus seven dinners (was 6) */
    const MAX = 8;
    /* a picture we draw: our own https link, or a photo still on this phone (a data URL from the picker) */
    const okSrc = s => typeof s === 'string' && (/^https:\/\/[^\s"'<>]+$/.test(s) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s));
    /* the pictures of a post, cover first; null when it is no carousel (fewer than 2 usable pictures) */
    function slidesOf(p) {
        if (!p || typeof p !== 'object') return null;
        const src = Array.isArray(p.slides) ? p.slides : p.meta && Array.isArray(p.meta.slides) ? p.meta.slides : null;
        if (!src) return null;
        const out = [];
        src.forEach(s => { if (okSrc(s) && out.indexOf(s) < 0 && out.length < MAX) out.push(s); });
        return out.length >= 2 ? out : null;
    }
    /* where picture i of a post is stored (0 = the cover, as before) */
    function path(uid, id, i) { return i > 0 ? uid + '/' + id + '-' + (i + 1) + '.jpg' : uid + '/' + id + '.jpg'; }
    /* every file a post can have in the bucket, for its delete: the cover, the video kinds, the carousel pictures */
    function files(uid, id) {
        const out = ['jpg', 'mp4', 'mov', 'webm'].map(x => uid + '/' + id + '.' + x);
        for (let i = 1; i < MAX; i++) out.push(path(uid, id, i));
        return out;
    }
    /* the lit dot for a swipe position */
    function dot(scrollLeft, width, n) {
        if (!(width > 0) || !(n > 0)) return 0;
        return Math.max(0, Math.min(n - 1, Math.round((+scrollLeft || 0) / width)));
    }
    /* from the photo picker: pictures only, and never more than still fit */
    function take(list, have) {
        const room = Math.max(0, MAX - (+have || 0));
        return Array.prototype.filter.call(list || [], f => !!f && /^image\//.test(f.type || 'image/jpeg')).slice(0, room);
    }
    return { MAX, okSrc, slidesOf, path, files, dot, take };
});
