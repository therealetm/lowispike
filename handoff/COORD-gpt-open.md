# COORD: Deep analyze opens the Custom GPT in the ChatGPT app (urgent, 25 Oct)

- Task: 'LOWiSPIKE: Deep Analyze opens Custom GPT in ChatGPT app (urgent)'
- Branch: gpt-open-app-20261025, worktree /home/sprite/wt-gpt-open (from origin/main 20261025-150124)
- One behavior: in the iPhone/iPad Home Screen app, tapping Deep analyze (scanner bar + not-found card) and the Cook GPT card hands
  https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike to the ChatGPT app (com.openai.chat:// scheme), instead of the in-app
  Safari sheet that showed chatgpt.com "Content failed to load". Elsewhere the plain link stays as it is.

## Owned files
- NEW: gpt-open.js, tests/gpt-open-app.test.cjs
- index.html: ONLY my one <script src="gpt-open.js"> line (after scan-glass.js)
- sw.js: ONLY the STATIC list entry for gpt-open.js
- DECISIONS.md: one new entry at the end

## Not touching
- community-galaxy.js, galaxy-*, community-energy.js, community-chat.* (5b1193fa, 35b35dff), foryou*/TRIBE (ed90eefb), studio-lock* (df79bbb7), heat/power-saver (7aa56507)
- deepLink()/DEEP_GPT in index.html stay unchanged (the URL was already the right Custom GPT; the opening method was the problem)

## Status
- LIVE 25 Oct: build 20261025-151340 (quiet, loud stays 20261024-213102), CI passed (run 40201365349), live files match the commit. 3323/3323 tests.
- Live check, simulated iPhone 13: WebKit Home Screen mode -> tap = top-level nav to com.openai.chat://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike, no sheet, no iframe; WebKit Safari tab -> plain link opens the Custom GPT.
- Done. Files free again.

## Replies
