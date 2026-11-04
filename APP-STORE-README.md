# LOWiSPIKE in the App Store: what changed and what's left

Branch `app-store-prep`, November 3, 2026. Nothing here is on `main` yet, so the live site is unchanged until you merge.

## What I changed, fix by fix

1. **iPhone app wrapper (Capacitor 8).** I added `package.json`, `capacitor.config.json`, `scripts/cap-copy.cjs` and a ready Xcode project in `ios/`. The app runs the same `index.html` as the website, with no rebuild of your code. The app ID is `com.therealetm.lowispike`; change it in `capacitor.config.json` and in Xcode if you want another one. It's iPhone only and portrait only. The icon and splash screen are made from `icon-512.png`, scaled up to 1024 pixels, so a sharper 1024-pixel icon would be better.
2. **No "Add to Home Screen" in the app.** Inside the app, LOWiSPIKE now counts as installed. You won't see the install guide, the "You did it!" card or the web push opt-in. The website behaves exactly as before.
3. **Privacy policy and support contact.** I added `privacy.html` in English, German and Spanish. It covers what's stored, Supabase in Frankfurt, Google Gemini (only after Allow), Open Food Facts, Open-Meteo/OpenStreetMap, account deletion and your rights. You can open it inside the app from Profile > About & info, which also shows the support email. **You fill in:** your full name and postal address, marked [OWNER] in the file, which a German privacy policy needs. Change the support address (therealetm@gmail.com) in `privacy.html` and `store-ready.js` if you want another one.
4. **Asking before photos go to Google Gemini.** The first photo check now shows a sheet: what goes to Google, Allow or Not now, and a link to the privacy policy. On Not now, nothing is sent: the photo check says to type the food, and typed names fall back to the app's own rules. Tapping Try again asks once more. You can switch it on or off any time in About & info. Typed food names count too, because they also go to Gemini.
5. **Ko-fi tip and "Premium · coming soon" hidden in the app.** The support row, the Ko-fi view and the Premium wardrobe items don't appear in the iPhone app. The website still has them. The gift-basket links stay, because those go straight to the person you're gifting.
6. **Age check.** The birthday step in onboarding now stops anyone under 16. Change the number in `store-ready.js` (MIN_AGE) and the age sentence in `privacy.html`. Your App Store age rating has to match it.
7. **"Not medical advice."** It already appeared in About & info. It now also shows on the first onboarding step and under every photo check result.
8. **Galaxy white screen.** I couldn't recreate this without an iPhone, so this is a likely fix, not a proven one. The big glass cable on the string ride now renders at no more than 1.5x sharpness while it's on screen (it was up to 2x). That is the heaviest graphics moment in the app. There are also never more than two cables fading out at once. The crash log now records when the 3D graphics drop out and whether it happened on the strings.
9. **Crash from Community into the chat.** Reading the code didn't show a clear cause, and the old crash guard is still in place. What's new: the crash log has a Copy button in About & info, and it records your build, iPhone or web, and the device. Next time it crashes, copy the log and send it to me, and I can fix the real cause.

I also made the AI sheet and the privacy policy work above the sign-in screen, and added four tests. The full test suite passes: 4,283 passed, 0 failed. The release check passes too.

## Must-do on the server (the app won't pass without these)

- **Report and Block don't work on the live database right now.** The tables `community_reports` and `community_blocks` don't exist there: on November 3 they returned "not found", so every Report or Block fails. To fix it, open Supabase, go to SQL Editor, paste all of `supabase/app-store-moderation.sql` and press Run. Apple's reviewers test Report and Block in apps with chat.
- **Redeploy the four edge functions** (`food-photo`, `delete-my-account`, `auth-handoff`, `owner-delete-account`). They now accept the iPhone app's address, `capacitor://localhost`. Without the redeploy, the photo check and account deletion fail inside the app.

## What only you can do

- **A Mac with Xcode** and an **Apple Developer account** ($99 a year).
- **On the Mac:** install Node. In the repo folder, run `npm install`, then `npm run ios:sync`, then `npm run ios:open`. In Xcode, pick your Team under Signing & Capabilities, choose Product > Archive, then Distribute App > App Store Connect.
- **App Store Connect:** app name, description, keywords, category Health & Fitness, the privacy policy URL `https://therealetm.github.io/lowispike/privacy.html` (works once this is on main), a support URL (the same page works), the age rating, and the privacy labels. For the labels: email, name, photos, user content, and health and fitness (meals) are collected, linked to the user, and not used for tracking. You also need screenshots of a 6.9-inch iPhone, and a test account (email and password) for the reviewer.
- **Tip:** in the review notes, write that meal photos go to Google Gemini only after the user taps Allow.

## Getting this onto GitHub without touching the live site

**On a computer:** open github.com/therealetm/lowispike and tap **Add file > Upload files**. Drag in everything from this zip, keeping the folders. Under "Commit changes", pick **Create a new branch** and name it `app-store-prep`, then press Propose changes. Don't merge it yet. Merging to main makes the website live with these changes.

**With Abacus (cheapest prompt):** upload the zip and paste this:

> Unzip the attached file. In the GitHub repo therealetm/lowispike, create a new branch called app-store-prep from main and commit every file from the zip at the same paths, replacing existing files. Do not change main, do not merge, do not edit any file. Reply with the branch link only.
