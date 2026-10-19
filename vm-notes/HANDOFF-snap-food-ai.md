# HANDOFF: Snap food photo AI

Worktree /home/sprite/wt-snap-ai, branch snap-food-ai (base origin/main 73fc57f, build 20261019-144057). Coord: /home/sprite/COORD-snap-food-ai.md.
If you pick this up: read this file, then `git -C /home/sprite/wt-snap-ai log --oneline -5` and `git status`.

## Findings
- Scanner > Snap food = spirit.js photo() -> shutter() -> photoSheet(): only asks "What is it?". No AI anywhere (the old Scan tab onPhoto in index.html is a 1.8 s fake scan line).
- Hosting: GitHub Pages (static). Backend: Supabase project vnfwmifmsfecascwaody with edge functions (auth-handoff, n1-push). Agents have NO Supabase admin/deploy access (SUCCESSOR_HANDOFF: owner does dashboard steps). No secrets in gh.
- MEAL worker (COORD-meal-names.md) removes Snap food from the Log meal panel and owns typed name parsing. I only touch the food camera flow.

## Pick (research done)
Google Gemini API free tier via a Supabase Edge Function `food-photo` holding GEMINI_API_KEY as a Supabase secret.
- Pricing page https://ai.google.dev/gemini-api/docs/pricing : Flash-Lite models "Free of charge" on Free Tier, free tier data "Used to improve our products: Yes" (paid: No). Paid per 1M tokens: 3.5 Flash-Lite $0.30 in / $2.50 out; 3.1 Flash-Lite $0.25/$1.50; 2.5 Flash-Lite $0.10/$0.40.
- Models page: 2.5 models limited to users who used them before; new projects use 3.5 Flash-Lite or 3.8 Flash. Deprecations: gemini-3.1-flash-lite shuts down May 7 2027.
- Free tier ~1,000 requests/day for Flash-Lite (third-party summaries; exact number shown in AI Studio).
- Others: Groq Llama 4 Scout $0.11/$0.34, free 1,000 RPD/30 RPM; Cloudflare Workers AI 10,000 neurons/day free, Llama 3.2 11B Vision; OpenRouter :free 50 req/day (<$10 credits) or 1,000; LogMeal from EUR 144/month; Passio from $99/month; Calorie Mama paid plans.

## Plan / steps (tick)
- [ ] supabase/functions/food-photo/index.ts (CORS github.io+localhost, needs a signed-in Supabase session token incl. guests, per-user soft limit, 1.5 MB cap, JSON schema output, model fallback chain, no logging of images; GET -> {ok, configured})
- [ ] food-photo-ai.js (window.LowiFoodAI: available(), analyse(dataURL) -> {dishes[], total}); pure parts in food-photo-core.js testable in node
- [ ] spirit.js photoSheet: when AI available, "Looking at your plate" -> dishes list with portion + kcal/protein/fiber/sugar/carbs, remove a dish, title prefilled, macros go into hidden inputs -> finishMeal logs them. Not available -> the old "What is it?" form + a small note. Never breaks.
- [ ] index.html script include + sw.js STATIC
- [ ] tests that fail on old code; full suite
- [ ] DECISIONS.md, news json, release.sh, wait-ci, verify-live, webkit iPhone 13 check
- [ ] voice note + final message with Emmanuel's steps

## Status log
- research + code reading done
- CODE DONE (uncommitted at first): food-photo-ai.js, supabase/functions/food-photo/index.ts, spirit.js photoSheet hook, index.html script, sw.js, scan-screens.css, tests/food-photo-ai.test.cjs (7 tests, all fail on old code). WebKit iPhone 13 probe BUGHUNT/playtest/probe-foodai.cjs on|off PASS locally. NEXT: full suite, DECISIONS, news, commit, release.
- committed 3ef2361; releasing
- RELEASED 20261019-150120 (main 9f9f77e), CI success run 39256686691, live OK. NEXT: live webkit probe, voice note, final message
- DONE: live webkit iPhone 13 probe on (mocked function) + off PASS on 20261019-150120; deno check OK; voice note f6a6ef6e40266e68c3775cfa628b4ed1. Waiting on Emmanuel: Gemini key -> Supabase secret GEMINI_API_KEY, deploy function food-photo. Then: real-photo check + What's New entry.
- Oct 19 15:32 CEST: Emmanuel set GEMINI_API_KEY. Deploy task signed the cloud browser into the Supabase dashboard (Continue with GitHub as therealetm, already signed in) and deployed food-photo v1 from origin/main 61b6598 via the Management API, verify_jwt=false (the app sends the sb_publishable key, not a JWT, on the GET probe; the function checks the session itself, same as auth-handoff and n1-push). Other functions and the 11 secrets untouched.
- Verified: GET -> {ok:true, configured:true}; POST without session -> 401 sign_in; CORS preflight from therealetm.github.io OK; curl POST with a real guest session + Commons photo of spaghetti bolognese -> 200, 1 dish, 650 kcal, gemini-3.5-flash-lite, 2.5 s. Live app in WebKit iPhone 13 with a real guest session (BUGHUNT/playtest/probe-foodai-real.cjs, REAL_SESSION=<session json>) -> sheet fai-done, title 'Spaghetti Bolognese with Grated Cheese', macros filled (620 kcal). Logging could not be tapped there because guests get the sign-in gate; mocked probe-foodai.cjs on live -> PASS (logging path). Leftover: one test guest user 023d3d58-5805-46a4-97fb-71ddaf4981c5 in auth.users.
- Still open: What's New entry announcing photo recognition; real iPhone check by Emmanuel. Repo docs (DECISIONS/SUCCESSOR_HANDOFF) do not yet say food-photo is deployed.
