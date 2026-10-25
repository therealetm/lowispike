# Give a hand: gift a healthy basket

A first version of paying for someone else's healthy groceries in LOWiSPIKE, after the Instagram app "A little help". The key decision is Emmanuel's: LOWiSPIKE never touches the money. Each person who wants help adds their own payment link, and givers pay them there directly.

## Where it lives

Fuel > Shop. A "Give a hand" row sits in the Kitchen tab under the shopping cart, and at the bottom of the Supermarket tab. It opens its own glass panel on top of Shop, and Back or X returns to Shop. The panel has two tabs:

- **Give a hand:** a calm, scrollable list of baskets. There's no swiping on people.
- **I could use a hand:** build and share your own basket, add your receipt, and see your badge.

The row appears only once the server has the basket table. Until the database change is applied, the release changes nothing anyone can see.

## Asking for a hand

- **The basket is food, not hardship.** It holds 1 to 12 foods, taken from the person's shopping cart, typed in, or tapped from a list of healthy staples in English, German or Spanish.
- **Only low-spike food:** each item is checked with the app's own food rating (LowiFoodPolicy.rateName), and only foods rated low-spike (JA) can go in. Cola, toast or bananas are refused with a reason, and unknown names ask for a plainer name. Cart items that aren't low-spike are listed as "Not for a basket". This is the guard against abuse.
- **A rough total** from 5 to 150 euros.
- **Their own payment link:** a Ko-fi page, a Stripe Payment Link, or a PayPal.me link. The check is strict, in the app and again on the server:
  - https only, with exactly these hosts: ko-fi.com, buy.stripe.com, donate.stripe.com, paypal.me (www. allowed for Ko-fi and PayPal).
  - A plain page path: a Ko-fi username, a Stripe link code, or a PayPal.me name with an optional amount.
  - Ko-fi dashboard pages such as ko-fi.com/Manage are refused.
  - No login part, no port, and anything after ? or # is dropped. At most 120 characters.
  - Look-alike hosts (ko-fi.com.evil.com), http, javascript: and other sites are refused.
- **Who they are:** the first name is optional, there's a "Stay anonymous" switch (then no name is ever sent), and the city is optional.
- **One open basket per person.** It goes away by itself after 3 weeks, and it can be taken down any time before someone helps.

## Giving a hand

- Each card shows the first name (or "Someone"), the city, the verified badge, the foods and the rough total.
- "Pay with Ko-fi / Stripe / PayPal" opens the person's own link in the browser (new tab, noopener). LOWiSPIKE embeds no payment form, loads no Stripe code and never sees card details. There's no Stripe Connect, so LOWiSPIKE is never a platform that takes money.
- Back in the app, the giver taps **I helped**. The first "I helped" takes the basket, so two people never pay the same groceries. If someone else was a moment faster, the giver is thanked and told.
- **Care board:** one sunbeam per basket (the app's "other" kind, capped per day like every habit), never per euro. There's no ranking of who gave most.
- **Every screen says the same thing in English, German and Spanish:** money goes straight to the person through their own link, and LOWiSPIKE doesn't handle, check or guarantee payments.

## Receipt and verified badge

This is Emmanuel's addition, like rating an Uber driver after the ride.

- After a basket is helped, the person has **7 days** to photograph their grocery receipt in the app.
- **Privacy:** before the photo, the app tells them to cover their card number and address. By default it blurs the bottom 18% of the photo, where card and payment lines usually are. The person sees a preview and can switch the blur off. The photo is shrunk to at most 1280 px and saved as JPEG.
- The photo goes into a private storage bucket. Only the person and that basket's giver can open it.
- The giver sees the receipt next to the basket, with a "Your basket arrived" moment, and taps **Verified ✓** or **Doesn't match**.
- **Fairness guard:** if the giver doesn't answer within 7 days of the receipt, it counts as verified.
- **The score** is verified baskets divided by counted helped baskets, rounded down, so only a clean record shows 100%.
  - Counted: Verified, Doesn't match, no receipt within 7 days, and a receipt left unanswered for 7 days.
  - Not counted yet: baskets still inside a 7-day window.
- **The badge** shows on the person's basket card and in their own "I could use a hand" tab:
  - "New" until something has counted, so nobody starts at a free 100%.
  - After that it shows the real percentage, for example "100% verified" or "75% verified".
  - A miss with nothing verified shows 0%, not New, so a bad record can't hide behind New.
- **Example:** two verified, one auto-verified and one missed gives 3 of 4, so 75%. Nine verified and one slip gives 90%.
- **Auto-match:** the app has no receipt text reading (no OCR) today, so the giver compares the photo with the basket by eye. When Scan learns to read receipts, the match should be shown next to the photo (see next steps).

## The honest trade-off

Because the money goes straight to the person, LOWiSPIKE can't guarantee it's spent on groceries. LOWiSPIKE never holds it, so it can't hold it back, refund it or redirect it. The receipt photo and the verified percentage are soft proof: they show givers who has a track record. A determined cheater can still post a receipt from another shop, and the giver is the only check.

Giving here is a personal gift between two people. A donation receipt or a tax write-off would need a registered non-profit partner (for example a local Tafel) to receive the money, and that is out of scope for now.

## Server

The database change is in supabase/proposals/gift_baskets_20261025.sql. It can be run more than once safely.

- **Table gift_baskets**, with Row Level Security:
  - Open baskets are readable by signed-in users.
  - Owners write only their own open basket. Helped baskets can't be edited or deleted, because they're the person's history.
  - Kicked members are hidden and can't post.
  - Server-side checks: link pattern, 1 to 12 items, 5 to 150 euros, name and city lengths, no name when anonymous, and nobody helping their own basket.
- **Help, receipt and verdict go only through functions** (gift_help, gift_receipt, gift_verdict), which enforce "first helper wins" and both 7-day windows. Owners can't write those columns themselves.
- **gift_trust(uids)** returns counts only: counted, verified, pending. Never who gave or how much.
- **Private bucket gift-receipts:** JPEG only, up to 1.5 MB, readable by the owner and that basket's giver only.
- **Deleting an account** removes its baskets (on delete cascade). A giver who deletes their account leaves the basket's history in place, with the giver removed.

## Next steps

- Apply the SQL. Until then the Shop row stays hidden.
- **Misty carries a little basket** to the other person's companion as a thank-you. This isn't built: the galaxy code belongs to another running task.
- **Verified badge on the profile card.** For now it's only on basket cards and in the person's own tab.
- **Receipt reading (OCR)** to auto-match receipt lines to basket foods for the giver.
- **A push or in-app ping** when someone helps, when a receipt arrives, and when the receipt window is about to close. Today people see it when they open Give a hand.
- **Reporting a basket**, and owner tools to take one down.
- The low-spike rule is checked in the app. A modified app could post other food names, so a server-side list of allowed foods would close that gap.
