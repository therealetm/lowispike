# HANDOFF (24 Oct 2026)

Done on this branch, NOT released: Seller Zone Category/Region rows (tests/seller-zone-filters.test.cjs fails on main, passes here; full node suite passed). Still to do: 390x844 Chromium+WebKit check, rebase, scripts/release.sh, check version.json + CI.

Queued, not started: Shop = Supermarket / Seller Zone / Kitchen tabs (store-picks.js). Kitchen = products bought or at home, private, persisted (lowispike.kitchen.v1), bin -> remove + optional Buy again into the cart, never auto-add. Einkaufswagen = EXISTING SH.list in index.html (no second list). Saving another member product -> cart, not Kitchen. Bought -> moves cart item to Kitchen. EN/DE/ES, day/night, accessible. Keep grocery bucket working. Max two tasks; coordinate with fc941ed5 via COORD before shared files.
