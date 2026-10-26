# Bug hunt HANDOFF (after run 38, 26 Oct 10:25 UTC)
Last shipped: BH-038 LIVE 20261026-111102 (Community menu: a double tap on the menu button no longer opens and shuts it; community-rooms-ui.js toggleMenu marks on show + spends closing taps). Run 38 finished cleanly.
P-REUSED-OVERLAY: #whX, #sheetwrap, .rm-menu done; #appearancePanel unreachable (button display:none).
Run 39 first: 1) #spWorld (spirit.js, made once, hidden toggled): does a double tap that opens it press a world button under the finger? 2) P-CLOSE-UNDER-FINGER siblings: sheet option rows, Misty card buttons, a person's card in Community. 3) still open: VoiceOver losing its place; level-up/badge saved too early; soak (20-min, offline mid-action, language switch) on current build.
Every probe: mock-cloud or route block (P-LIVE-WRITE). iPhone 13 viewport is 390x664 (tap relative to innerHeight). Release with nohup scripts/release.sh "..." --quiet. Never `cat > /dev/null` in exec (waits on stdin).
