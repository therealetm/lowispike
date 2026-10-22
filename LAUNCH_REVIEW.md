# LOWiSPIKE launch review: our own App Review-style check

Apple's App Review is mostly a completeness, honesty, privacy and safety check done by people, plus an automatic malware scan. It is not a security audit and it guarantees nothing. This checklist copies the parts of it that fit a web app, adds the security tests Apple does not do, and gives each item a clear pass or fail. Run it when the app is almost ready to launch (see "When we run it" at the end).

Researched on 22 October 2026 from Apple's own pages. The App Review Guidelines were last updated 16 October 2026. None of these checks has been run yet. The few app features named below were found by a keyword search of the code and have not been tested.

## What Apple's review really is

- **What you hand in:** the app build, its store listing, honest answers about what data you collect (the privacy label), an age rating, and notes for the reviewer with a working demo account ([App Review](https://developer.apple.com/distribute/app-review/)).
- **What Apple does:** "every app is reviewed by experts" and Apple scans "each app for malware and other software that may impact user safety, security, and privacy" ([Guidelines, Introduction](https://developer.apple.com/app-store/review/guidelines/)). About half of submissions are reviewed within 24 hours and 90% within 48 hours.
- **Why apps fail most:** over 40% of unresolved issues fall under guideline 2.1, App Completeness: crashes, placeholder content, incomplete information.
- **If rejected:** Apple names the guideline, you reply in App Store Connect, and you can appeal to the App Review Board.
- **What it does not do:** Apple's own pre-submission list "doesn't replace the guidelines or guarantee approval." The developer stays responsible for data security (guideline 1.6) and for every third-party service in the app. Approval is not a penetration test or a promise that an app cannot be hacked.

There is no Apple certificate for web apps, so we never call LOWiSPIKE "Apple verified" or put a badge we made ourselves on the site. What we can honestly say after this review is what we checked and when.

## What applies to us

LOWiSPIKE is a website (GitHub Pages plus Supabase), and Plus is planned as a Stripe purchase on the web. So:

- **Apple's payment rules don't apply to web sales.** In-app purchase (3.1.1), Apple's commission and the link-out rules only cover apps distributed through Apple. Apple itself says "there is always the open Internet" and Safari for apps that don't fit the App Store.
- **Apple's commission is not one flat 30%.** It depends on the program and region: the Small Business Program charges 15% ([Apple](https://developer.apple.com/app-store/small-business-program/)), and the EU terms in force since 1 October 2026 include a 5% Core Technology Commission for apps distributed outside the App Store and a commission on link-out sales within 7 days of the tap ([Apple, EU](https://developer.apple.com/support/dma-and-apps-in-the-eu/)). None of this touches a purchase on our website.
- **Native-only items we skip, with our web version instead:**
  - Permission text in the app file (Info.plist) becomes a short explainer screen before the browser asks.
  - The App Store privacy label becomes our own data list (section 3).
  - The reviewer demo account becomes a test account and notes for whoever runs this check.
  - Store screenshots and listing become the site, the scripts and the videos (section 2).
  - Accessibility Nutrition Labels (voluntary for now) become our accessibility pass (section 9).
- **If we ever wrap the site as an iPhone app:** guideline 4.2 rejects apps that are no more than "a repackaged website," and the payment rules above would then apply.

## The checklist

Each item says when it passes. Run it on the live build, write down the build number, the device and the date, and keep simulator results apart from real-phone results. An item only passes on Emmanuel's real iPhone if it touches sound, the camera, payments or the Community chat.

### 1. Complete and stable (guideline 2.1)

- **No crashes:** Home, Community then a chat room, Cook and Shuffle, Scan, Affiliates and checkout each run end to end on a real iPhone and an iPad without a crash. The Community to chat crash on Emmanuel's iPhone (item 29) is still open, so this fails until his phone confirms it.
- **Nothing unfinished:** no placeholder text, no empty pages, no dead links anywhere in the app or on the payment pages.
- **Contact and privacy reachable:** a support contact and the privacy policy open from inside the app in one or two taps (guidelines 1.5 and 5.1.1).
- **Backend live:** Supabase and every server function respond during the check; a test account works.

### 2. Honest claims, health safety (guidelines 2.3, 1.4.1, 1.4.5)

- **Everything promised exists:** every feature and price named in the app, the affiliate scripts, the videos and the site works as described. Apple removes apps for "promoting a false price" or features they don't offer.
- **Spike ratings are labelled as estimates:** the app says how a rating is worked out and never suggests it measures blood sugar. Apple rejects apps that claim to measure blood glucose with the phone alone.
- **Doctor reminder:** health screens remind people to check with a doctor before making medical decisions, as Apple asks of medical apps.
- **No risky challenge:** the 30-day challenge doesn't urge anything that risks physical harm (1.4.5). The "30 lb in 30 days" hook is framed as Emmanuel's own attempt, never as a promise to the viewer.

### 3. Privacy (guidelines 5.1.1, 5.1.2, 5.1.3)

- **Privacy policy:** linked inside the app and says what data is collected, how, and why; which outside services get it (Supabase, Stripe, any AI service, any affiliate tool); how long it is kept; and how to withdraw consent or delete it.
- **Our data list:** for each type of data (profile, photos, food logs, weight, chats, payments), we note whether it is linked to the person and whether it is used for tracking, the way Apple's privacy label asks ([Apple](https://developer.apple.com/app-store/app-privacy-details/)).
- **Consent first:** nothing is collected before the person agrees, and paid features never depend on agreeing to extra data use.
- **AI services:** if a food photo or text goes to an outside AI, the app says so and asks first. Apple now requires explicit permission for sharing with "third-party AI."
- **Health data stays health data:** weight and food data are never used for marketing or ads (5.1.3).
- **Minimum data:** we only ask for what a feature needs.

### 4. Accounts and account deletion (guideline 5.1.1(v))

- **Use without an account** wherever a feature doesn't need one.
- **Delete account in the app:** easy to find, deletes the whole account and its data, including posts, chats and photos shared with others, without an email or support request ([Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/)). A confirmation step is fine. Only deactivating the account is not enough.
- **It says what happens to billing:** the delete screen explains whether a Plus subscription is cancelled, and what, if anything, is kept by law.
- **Guest accounts too:** automatically created accounts can be deleted.
- **Existing code to test:** Settings already has "Delete account" with text promising to delete "your profile, posts, chats, photos and synced progress." Pass when a test account's rows are really gone on the server afterwards.

### 5. Security and data access (guideline 1.6, plus our own tests)

Apple only says apps must prevent unauthorised access. These tests are ours.

- **Row-level security:** with two test accounts and the public key, neither account can read or change the other's rows in any Supabase table, and a signed-out visitor can't either.
- **No secret keys in the site:** the service key and Stripe secret key appear nowhere in the public files.
- **Server functions check who is calling** and refuse other people's data.
- **Plus unlocks only from a verified payment:** access is granted by the server after Stripe confirms the payment (with a verified webhook), never by something the browser can fake.
- **Affiliate codes can't be gamed:** a made-up or self-referred code earns no commission, and a refund takes the commission back.

### 6. Community and chat (guideline 1.2)

Apple requires all four of these for any app with user posts:

- **Filter:** objectionable content is filtered before it's posted.
- **Report, with a timely answer:** reports reach a real person, and we name who handles them and how fast. The chat already has "Report message" and block; pass when a test report arrives and gets handled.
- **Block:** a blocked person's messages disappear for the blocker.
- **Published contact:** people can easily reach us.
- **Removal:** we can take down content that breaks the rules, and the age rating we state matches what can appear in chat.

### 7. Camera, microphone and other permissions (guidelines 5.1.1(ii) to (iv), 2.5.14)

- **Ask only when needed:** the camera prompt appears only when the person taps a feature that needs it, after a short line saying why. The tutorial never triggers it (item 34).
- **Works without it:** if someone says no, there is another way (for example typing the food in).
- **Visible recording:** whenever the camera or microphone is on, the screen shows it.

### 8. Payments, subscriptions, refunds and cancelling (Apple's 3.1.2 as a quality bar, plus German law)

Apple's subscription rules don't bind web sales, but they make a good bar:

- **Clear before paying:** what Plus includes, the price, the period and that it renews (3.1.2(c)).
- **Works everywhere:** Plus follows the account to every device (3.1.2(a)).
- **No extra tasks:** people get what they paid for without having to post, invite or check in (3.1.2(a)). This matters for the affiliate side.
- **No double subscriptions** when switching between monthly and yearly (3.1.2(b)), and no bait-and-switch.
- **Cancel button:** a "Vertrag hier kündigen" button on the site ([§312k BGB](https://www.gesetze-im-internet.de/bgb/__312k.html)), and after the first year a yearly plan can be cancelled with at most a month's notice ([§309 BGB](https://www.gesetze-im-internet.de/bgb/__309.html)). This comes from our earlier research, not from Apple; check it with a tax adviser or lawyer.
- **Stripe test mode run:** successful payment, declined card, card that needs an extra bank check, cancel, refund, and a failed renewal. Each ends in the right access state, and a refund removes Plus and the affiliate's commission.

### 9. Accessibility (Apple's Accessibility Nutrition Labels, voluntary)

Apple counts a feature as supported only if someone can finish the first-launch experience and common tasks with it ([Apple](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)).

- **Screen reader:** first launch, Shuffle, logging a meal and Community work with VoiceOver.
- **Larger text, enough contrast, reduced motion:** nothing gets cut off or unreadable, and the galaxy animations calm down when Reduce Motion is on.
- **Captions:** everything the tutorial voice says is also shown as text.

### 10. Devices, network and battery (guidelines 2.4.1, 2.4.2)

- **Screens:** iPhone SE to Pro Max and iPad in both orientations.
- **Bad network:** offline and slow connections show an honest message instead of a blank or a spinner forever.
- **Battery and heat:** ten minutes on the 3D screens doesn't make the phone hot or drain the battery fast.

## How we run it

- One area per small task, in the order above. Each task writes pass or fail per item, with the build, device, date and evidence.
- "Fail" on sections 1, 3, 4, 5 or 6 blocks launch. Sections 9 and 10 can launch with a written plan for the gaps.
- When it all passes, we write "reviewed on [date], build [number]" in our notes, not "verified."

## When we run it

The trigger is the first release that would let people pay real money for Plus through Stripe, or Emmanuel saying the app is ready to launch, whichever comes first. This is recorded in the project's handover notes and release instructions so the agent who builds checkout stops and tells Emmanuel it's time. Nothing watches the code automatically and no dated reminder was set.

## Sources

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), last updated 16 October 2026
- [App Review overview](https://developer.apple.com/distribute/app-review/)
- [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Accessibility Nutrition Labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/)
- [Apple and the EU Digital Markets Act](https://developer.apple.com/support/dma-and-apps-in-the-eu/)
- [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)
