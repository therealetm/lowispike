/* LOWiSPIKE For You: videos from other platforms open THERE, never here (25 Oct 2026)
   Emmanuel (voice, 25 Oct 10:02): "if we post something on our For You page and it's a video from someone else, it
   shouldn't play in our platform. It should take them to their platform. That way we give them views, and also motivate
   our followers to support them ... We're a supportive tribe."
   Until today this file played YouTube, TikTok, Instagram and Vimeo inside the slide (Oct 16). It now guarantees the
   opposite: a tap on a creator's video (the big play button, the "Watch on ..." card, the source line) opens the original
   on the creator's platform in a new tab, so iOS can hand it to the YouTube / TikTok / Instagram app. The slide shows the
   creator, the platform and the support line (index.html fyOut, foryou-core.js love). No iframe player is ever built.
   A member's OWN uploaded video (FYV, vid:1) is not a link and still plays in the feed.
   The old API (closeAll, close, place) stays, so the callers in nav-moves.js and community-rooms-ui.js keep working; they
   now only clear a leftover player from an older build that might still be on screen. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiFyEmbed) return;
    const core = () => W.LowiForYouCore || null;

    /* {plat, name, url} when the link is a creator platform's (pure, tested), else null */
    function outFor(url) { const C = core(); return C ? C.external(url) : null; }

    /* open the original; returns true when it did */
    function openOut(p) {
        const ex = p && outFor(p.url); if (!ex) return false;
        try { W.open(ex.url, '_blank', 'noopener'); } catch (e) { return false; }
        return true;
    }
    function closeAll() { try { D.querySelectorAll('.fy-slide > .fye').forEach(n => n.remove()); D.querySelectorAll('.fy-slide.fye-on, .fy-slide.fye-tall').forEach(s => s.classList.remove('fye-on', 'fye-tall')); } catch (e) { /* nothing on screen */ } }
    function close(slide) { if (!slide) return; const n = slide.querySelector(':scope > .fye'); if (n) n.remove(); slide.classList.remove('fye-on', 'fye-tall'); }
    function place() { /* no in-app player any more */ }

    W.LowiFyEmbed = { outFor, openOut, closeAll, close, place };
})();
