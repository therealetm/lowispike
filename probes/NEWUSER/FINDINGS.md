# New-user walkthrough findings (iPhone 13 WebKit 390x664, fresh profile)
1. Onboarding step 1/2 copy: "Tap a bubble like Meals or Move" / habits list "Meals": the ring bubble is called Fuel. (check)
2. Name step (and other bubble steps): speech bubble overflows above scene, covers back button + progress dots, top -6px off screen. Cause: herb-start.css l.144 `.hs-misty{--hs-m:min(46vw,184px)}` overrides the max-height:700 rule at l.47 (132px); scene max-height 190.
3. Brand-new user: Gap bubble already shows a running fast "15 h 25 min of 16 h" (index.html fasting st() guesses last meal = 20:00 yesterday). Never asked. (design: consider)
4. Before birthday, Home behind setup shows companion name "Minti Leaf"; joystick aria "drag to fly Misty" (rule: not Misty before birthday).
5. Fuel ring bubble shows only "0/3" with no label (check after setup).
- harness: headless WebKit/Chromium freeze on speechSynthesis -> stub TTS in harness (not an app bug)
