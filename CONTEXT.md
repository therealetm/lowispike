# LOWiSPIKE product context

## What it is

LOWiSPIKE is a mobile-first health and food PWA that turns everyday metabolic habits into a personal game. It helps people scan packaged food, log meals, choose swaps, cook, move, follow fasting progress, and complete daily quests. The experience is a mirror of the user's energy and habits, not a clinical dashboard.

The central metaphor is a living herb companion. Real actions inside LOWiSPIKE care for it and evolve it. The user is effectively playing their own life: the companion makes invisible progress feel visible, collectible, and emotionally rewarding.

## Who it is for

People who want clearer, gentler support for food and movement choices without shame or medicalized language. The product should be understandable at a glance, especially on an iPhone, and useful even when the user has little energy or mobility.

## Product promise

- Make the user's metabolic routine feel alive and legible.
- Reward real actions rather than empty engagement.
- Offer one obvious next action, not a wall of modules.
- Be playful and personal without becoming noisy, childish, or preachy.
- Treat accessibility and low-mobility options as core product behavior.

## Experience direction

The target is Tamagotchi care, Pokémon-like evolution clarity, Japanese convenience-store cuteness, and a distinctive premium holographic living-core aesthetic. The herb breathes, sways, blinks, reacts, and visibly changes across six stages. Bio-organic materials, constellation light, depth, and restrained glow are appropriate; generic RPG chrome and dense dashboard cards are not.

A separate global “biopunk mode” has been discussed but is not a shipped product mode. Do not describe it as complete. The settled direction is currently the living holographic herb within the existing app.

## Information architecture

The persistent primary navigation is:

1. Today — companion summary, daily quest, fasting state, and essential shortcuts.
2. Community — discussion and shared discoveries.
3. Scan — the central capture action for barcode or meal photo.
4. Cook — food ideas, swaps, recipes, and shuffle.
5. Move — accessible movement sessions, including in-bed and seated options.

The floating bubble centered above Scan belongs to the herb. It is the bridge between the app and the companion's full-screen terrarium/home. There must never be a separate orb and herb competing for that role.

## Companion model

- Stages: Seed, Sprout, Young Herb, Flourishing Herb, Radiant Herb, Legendary Bloom.
- Thresholds: 0, 100, 300, 700, 1500, 3000 XP.
- XP: one cumulative ledger; event-based and deduplicated.
- Care: meal → water; swap → sunlight; movement → dance; scan → vitamin sparkle; completed recipe → bloom.
- Mood: warm visual state that can become gently sleepy/droopy and recover after one healthy action.
- Personality: influenced by star sign. Pisces is dreamy and sweet; other signs should be equally recognizable without stereotyping or obscuring meaning.
- Speech: short and situational. It responds to intention, not routine navigation.

## UX principles

- One-screen first: fit each primary tab's essential action and state in the available viewport. Scroll belongs to detail, archives, and long lists.
- One hero per screen: the herb on Today, capture on Scan, the current result on Cook, and the session choice on Move.
- Progressive disclosure: secondary controls live in sheets or dedicated views.
- Motion communicates state: idle life, a clear tap reaction, care feedback, a short evolution reveal, or a shuffle that visibly changes candidates.
- Respect reduced motion and never require animation to understand the outcome.
- Health copy is supportive education. No diagnosis, promises, guilt, panic, or moral judgment about food or behavior.

## Technical shape

LOWiSPIKE is a static GitHub Pages PWA. Most legacy application logic lives in `index.html`, with feature modules layered around it. There is no heavy application framework or package build step. Node's built-in test runner executes the regression suite.

The live source is `therealetm/lowispike` on `main`; the public app is `https://therealetm.github.io/lowispike/`. GitHub Pages deployment is the authoritative proof that a release is live.

Because `index.html` is large, edits should be narrow and protected by regression tests. New code should strengthen module boundaries rather than add another parallel implementation. Do not perform a wholesale rewrite while fixing a user-visible issue.

## Current shipped baseline

As of build `20261014-002000` at commit `bc68a96ddf0062e1a791c60639b08e399e376794`:

- The herb is the single companion and uses the Scan bubble.
- Page navigation no longer triggers constant companion speech.
- Today, Scan, Cook, and Move received mobile compaction work.
- Scan consolidates barcode and meal-photo capture.
- Cook shuffle visibly cycles before settling.
- The automated suite contains 39 passing tests.

Treat this as historical baseline, not a substitute for checking the current remote SHA before work.

