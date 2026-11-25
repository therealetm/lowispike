/* companion-name.js (25 Nov 2026, Emmanuel: "Misty is the name of my specific companion, not the universal one ... Misty's a name nobody else
   should be seeing apart from me").
   Every place that shows a companion's name asks for it in this order: its brought-to-life name, a name the person typed, the saved herb
   name, and only then this default. The default was "Misty" for everyone; now:
     - on the owner's account it is "Misty" (lowispike.mine.misty, set once owner-admin.js confirms the owner; it also saves "Misty" as his
       companion's own typed name, and lowispike.* keys travel with the account, so his companion is Misty on every device);
     - for everyone else it is their companion's star-sign name (LowiHerbIdentity.autoName, e.g. "Moss Leaf"), else "Lumi". */
(function (W) {
    'use strict';
    if (!W || W.LowiDefaultName) return;
    var MINE = 'lowispike.mine.misty';
    function mine() { try { return localStorage.getItem(MINE) === '1'; } catch (e) { return false; } }
    W.LowiDefaultName = function () {
        if (mine()) return 'Misty';
        try { var I = W.LowiHerbIdentity, a = I && I.autoName && I.autoName(); if (a) return String(a).trim().slice(0, 24) || 'Lumi'; } catch (e) { }
        return 'Lumi';
    };
    W.LowiMarkMine = function () {
        if (mine()) return;
        try { localStorage.setItem(MINE, '1'); } catch (e) { }
        /* his companion keeps "Misty" as its own name (unless it already has one he chose) */
        try {
            var B = W.LowiBirthCompanion, born = B && B.has && B.has() && B.get() && B.get().name;
            var T = W.LowiHerbTamagotchi, p = T && T.readPrefs && T.readPrefs(), typed = p && String(p.name || '').trim();
            if (!born && !typed && W.LowiHerbIdentity && W.LowiHerbIdentity.setCustomName) W.LowiHerbIdentity.setCustomName('Misty');
        } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:companion-name')); } catch (e) { }
    };
})(typeof window !== 'undefined' ? window : null);
