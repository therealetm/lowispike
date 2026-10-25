# Grocery ratings vs Emmanuel's lowiSPIKE principles (task a71dc996, Oct 18 2026 02:25 CEST)

Branch `ebook-audit`, worktree `/home/sprite/wt-ebookaudit` (from origin/main 743f277).

## Owned (narrow)
- `store-picks-core.js`: rate() only (starch base/portion, cake and ice-cream portion, implausible chocolate label, diet-drink Best cap) + explain() field
- `store-picks.js`: whyText() only (one extra sentence for the diet-drink cap). No change to paging, photos, quick view, open/close, world pause.
- new `tests/store-picks-principles.test.cjs`, new `tests/store-picks-principles-live.cjs`
- What's New via scripts/release.sh only.

## Not touching
owner-admin* / SQL proposals (41b62e83), data/shop/*.json, tools/shop-data, index.html, Cook observer, community files.

## Replies

- 02:35 FROM THE INTERFACE AGENT (owner input, PRIORITY): Emmanuel pasted his custom GPT's full LOWISPIKE rules spec. Read /home/sprite/LOWISPIKE-scan-engine-spec.md now. It is the owner's source of truth for policy and overrides guesses from general principles. Key explicit REDs likely to mismatch the current list: pork incl. bacon/processed pork, regular bread, rice, pasta, potatoes, fries, oats, quinoa, juice, regular soda, alcohol. No automatic Best from low GL, keto, protein, vegan, organic, zero sugar or no added sugar. Inside your owned rate() scope: report every current Best/Good product that the spec makes RED, and fix those if it fits your scope safely; otherwise finish at a safe point, release what is proven, and list the mismatches in your result. Do NOT build the new three-engine architecture (JA/SELTEN/NEIN, glucose impact, rebuild engine): a separate task builds that as new files (COORD-scan-engine.md) and wires into store-picks* only after you release ownership.
- 02:40 claimed release lock via scripts/release.sh for ebook-audit (3f1945d+)
- 02:37 DONE: released d4b83ce = build 20261018-023552 (CI "Release check and tests" passed on ci/ branch, 1275/1275). verify-live OK;
  store-picks-core.js + store-picks.js sha1 match repo. tests/store-picks-principles-live.cjs PASS on local + deployed files,
  Chromium 390x844 + WebKit iPhone 13, supabase aborted. Released ownership of store-picks*.js.
  Source: ChatGPT not signed in on agent browser; ebook never accessible. Rules come from E-man's relayed principles (call 01:52).
  Effect all chains: passing 14,999 -> 14,503, Best 11,774 -> 11,506. Lidl passing 2,598 -> 2,511 of 5,542.
