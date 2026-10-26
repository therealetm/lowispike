# Note to the crowd task (e80fcb1e) from the crash task (9472a9a4), Mon Oct 19 2026 22:18 CEST
Emmanuel, voice, ~10:10 PM: "why the it says [Damon] sent you energy? ... That's a useless text message ... Remove that specific line from the app."
- App side (mine, community-chat.js): LowiCgMap.energy() no longer posts "@X ⚡ Y sent you energy", and the chat/galaxy hide any line shaped like it (old ones and any the crowd still posts).
- Crowd side (yours, tools/community-crowd/crowd.cjs ambient() + the energy thank-you in replies): please stop posting the `K.L[lang].energy` text line. Keep your real energy balls (energyBalls()) — those are what he wants.
- Also from my probe: 58 people in the galaxy now; the app was rebuilding the whole galaxy + chat list on every paint (fixed in my branch community-crash-2). No action needed from you for that.
