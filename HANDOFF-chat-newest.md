# HANDOFF: chats open at the newest message (25 Oct 2026)

Emmanuel (voice): "when opening the chat room from the circle, also general, it doesn't start from the most recent message. It's on, like, then you have to scroll down."

## Cause
- The Community chat (#cmList in #cgThread) scrolled to the bottom once, when the rows were first painted. Photos (`loading="lazy"`, `height:auto`) then decoded and grew by 150-300 px each, pushing the newest messages below the composer. After the first photo grew the list was more than 90 px from the bottom, so later repaints no longer pinned either. Measured on main in a simulated iPhone 13 (Chromium): 503 px above the bottom after 4.5 s. On WebKit the first painted frame was 687 px above the bottom (a visible jump).
- Circles are gone (one Community chat since 24 Oct), so every entry point (Chat tab, the Chat button under the galaxy, back + reopen, replies) goes through `thread()` in community-chat.js.

## Fix
- New `chat-stick-core.js` (`window.LowiChatStick`), pure, loaded before community-chat.js, in sw.js STATIC. It keeps a list stuck to the bottom: a ResizeObserver on the list and every row re-pins before paint while stuck; `load`/`loadedmetadata` re-pin too. It lets go only when the user scrolls up (touch/wheel/pointer/key on the list within 1.5 s, or scrollTop going up while the box size stayed the same) and sticks again near the bottom (90 px). When let go, the row being read keeps its place when rows above change (WebKit has no native scroll anchoring).
- community-chat.js: `stickOn(list)` (re-created if the list element is rebuilt), `thread()` pins on every open/close (a message opened by id is centred instead), paint uses the stick state for pinning and for the "New messages" pill (now "↓ New messages"), the pill and `latest` pin, `earlier` and `goPinned` release. While scrolled up, new messages grow the 60-row window so the top row is not pushed out.

## Proof
- tests/chat-open-newest.test.cjs (6 tests, failed on main: no core, no wiring).
- tools/chat-newest/check.cjs: 300+ messages, 25 photos among the newest 50, photos answered 0.8-2.6 s late; entry points A Chat tab, B Room -> Chat button under the galaxy (after scrolling up), C back + Chat tab; then scrolled up + new message (place kept, pill shows), pill tap, pinned new photo. `node tools/chat-newest/check.cjs outDir [url] [cases]`.
- tools/chat-newest/debug.cjs logs every scrollTop write and the stick state on one open.
- WebKit on the shared test VM can drop to one frame per 10-60 s under load (main is equally slow); the check waits for state up to 150 s there.

## Not touched
Galaxy/roster/energy code (task 5b1193fa), foryou, push, tutorial, shop.
