/* Who may open the full Affiliates templates (script, shot list, caption, skill note). Eman controls this list.
   Only hashes live here, never a code: PBKDF2-SHA-256(code without dashes, salt, iter). Codes go out once, to the person.
   - kind "buyer": the code printed in the Beacons delivery of that product, one per product. Rotate it by adding a new one and revoking the old.
   - kind "legacy": one personal code per legacy member (free access). Revoke one and only that person is locked out.
   - buy: the Beacons product page per series. Empty = the Buy button asks Eman on WhatsApp instead.
   Edit with tools/affiliates/codes.cjs (add / revoke / list), then release. */
(function (root) {
  var d = /*DATA*/{
  "v": 1,
  "salt": "lowispike-affiliates-v1",
  "iter": 120000,
  "buy": {
    "webdesign": "https://shop.beacons.ai/emanuristic/6ff76533-65e2-49bf-b1c0-d4d3d08aab88",
    "ugc": ""
  },
  "codes": [
    {
      "h": "dfb5d09958ef5810da4afd0185d13961528eaa78296aa155491ceb4b0f4aa7ac",
      "tracks": [
        "webdesign"
      ],
      "kind": "buyer",
      "note": "Webdesign buyers (Beacons delivery)",
      "added": "2026-10-21"
    },
    {
      "h": "defdaf1d4292d05a3e8df35270902c4cf1cf47539469fe0a8de9d9fef97da46d",
      "tracks": [
        "ugc"
      ],
      "kind": "buyer",
      "note": "UGC buyers (Beacons delivery)",
      "added": "2026-10-21"
    },
    {
      "h": "5f808a9a1011e75e7bfb759df810aaa0774f7bd0e58b9c4fb193df92c13e4d3f",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #1",
      "added": "2026-10-21"
    },
    {
      "h": "393c3481067597cd6cd392f7ff56029b12586d723cb9bc697a53770764faabdb",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #2",
      "added": "2026-10-21"
    },
    {
      "h": "d375ebb436f207a2b06cd9aa090854f1466e56507ebe3b2a2d8c20ba875a9a78",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #3",
      "added": "2026-10-21"
    },
    {
      "h": "3c0a9766f65a1d79068ae38d06a283932a190ed61e878e341bdd59298bce8a2a",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #4",
      "added": "2026-10-21"
    },
    {
      "h": "d5afd402558360a542fb6d90ec814c157293ebf3d8cb8b03c6fa560a523f959b",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #5",
      "added": "2026-10-21"
    },
    {
      "h": "9e0308a02ef1204d553b542493f38b2e4a6fb96e7652a21f668540efa708bdef",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #6",
      "added": "2026-10-21"
    },
    {
      "h": "788a2bcf6cea648285c5202b7f3929a2c2d6f637785ad313e619e2cc0cc8167c",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #7",
      "added": "2026-10-21"
    },
    {
      "h": "8322399a864e944b3f1d67473bacef64b91b9bd36de1acba172f6034472d9970",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #8",
      "added": "2026-10-21"
    },
    {
      "h": "c09a478ec97914f30040681013b58900a596232ab257cacd3d3a0ef9a469e8e5",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #9",
      "added": "2026-10-21"
    },
    {
      "h": "a781f6adb84c7c771b1f9eeae9fd95a3db173742274c310f5834905921e49742",
      "tracks": [
        "webdesign",
        "ugc"
      ],
      "kind": "legacy",
      "note": "legacy #10",
      "added": "2026-10-21"
    }
  ]
}/*END*/;
  if (typeof module === 'object' && module.exports) module.exports = d; else root.LOWI_AFF_ACCESS = d;
})(typeof self !== 'undefined' ? self : this);
