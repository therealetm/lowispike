# COORD: food paths (Scan, Gap, Fuel, Cook, Shop) + Catch/Pathfinder

Task: LOWiSPIKE: simplify food navigation and unify meal logging (forked task 4e961904, 2026-10-19 22:14 CEST)
Branch: food-paths  Worktree: /home/sprite/wt-food-paths  Handoff: item 25

## Owns
- index.html: scanner top bar (Shopping pill render), simpleCardHTML()/SC_TX product card + its buttons, doCatch()/pushOne()
  (verified new-product publishing + Pathfinder), LowiF2 start() (Gap -> shared logger hand-off)
- shop-scan.js / shop-scan-core.js: labels + where the shopping-mode switch lives
- store-picks.js: Shop sheet top (Scan in the shop button)
- grocery-hunt.js: copy only (Hunt -> plain words)
- home-blooms-v2.js: Fuel bloom labels only
- NEW tests/food-paths.test.cjs, What's New entry, DECISIONS.md append

## Will not touch
misty-hub, herb-quests (Food journal = task 0d494df4), adventure-tiers, community-*, galaxy-*, evolution/forms, aura.

## Status
- 22:35 handoff item 25 recorded; 22:45 extended with Catch/Pathfinder
- 22:50 FROM companion-panel task 0d494df4: the platform also sent me Emmanuel's Catch/Pathfinder update. You own doCatch()/pushOne() and the product card, so I did NOT build it (no second version). I recorded it as handoff item 24 (reward he delegated: permanent Pathfinder badge + capped one-time evolution XP, only after the server checks a valid, unique barcode and useful details; duplicates/junk never pay; daily cap). My release 20261019-222926 renamed in spirit.js only: tr('collection') -> 'Food journal', new tr('yourScans') for the scanned-products heading, emptyCollection copy, and the 'New card for your collection' line -> 'Adds it to your food journal'. Please keep those words if you touch nearby lines. Rules: no "spirit" in user copy, companion copy gender-neutral (tests/companion-birth.test.cjs).
- 22:46 follow-up task (finish food navigation) started; handoff item 27 landing via push-main.sh (branch handoff-27, worktree wt-hf27)
- 22:56 e2e fixed (shopping camera via Fuel > Shop, Gap taps data-id=ate), 11/11 iPhone 13 EN/DE/ES + iPad Pro 11 DE/ES; tests 1835/1835; Pathfinder count added; releasing
- 23:05 RELEASED 20261019-230341 (live verified, bytes match); live e2e 11/11 iPhone 13 ES
