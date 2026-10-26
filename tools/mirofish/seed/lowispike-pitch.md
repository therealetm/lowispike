# LOWiSPIKE: product pitch (seed material for a MiroFish market simulation)

Written 26 Oct 2026 from the project's own docs (MAYA-HANDOFF.md section 1, SUCCESSOR_HANDOFF.md section 4, CONTEXT.md). It describes what the app is today and what is planned. It makes no medical claims.

## One line

LOWiSPIKE is a free phone game about your everyday food and energy habits: you care for a glowing glass companion creature, and only real actions (drinking water, logging meals, moving, sleeping, keeping a gap between meals, scanning food at the shop) make her stronger.

## The problem it goes after

Many people want gentler support with food, blood sugar spikes and movement, but calorie trackers feel like homework and health apps often feel clinical, preachy or shaming. People quit them within weeks.

## What the app is

- A mobile-first web app (a PWA you add to the iPhone home screen), live at https://therealetm.github.io/lowispike/ . It works in English, German and Spanish.
- The founder calls it a game, not a tracker. Stats behave like character stats.
- **The companion.** Each new person gets their own companion: a glass, water-like bubble creature. A birthday (and birth time) "reveal" during setup creates a unique look and a name. Meals, water, movement and scans make her stronger. Spiky meals earn nothing, and nothing ever goes negative: daily small improvement, not punishment.
- **Energy.** Her energy comes from food (40%), water (30%) and movement (30%). It shows in her face, how fast she flies and how bright her world glows. New accounts start at full energy for their first day.
- **Home.** One screen: the companion in the middle, eight round glass bubbles around her: Settings, Scan, Fuel (food), Hydration, Move, Gap (time since your last meal, i.e. fasting), Sleep and a joystick to steer her.
- **Scan and Snap food.** Scan a barcode at the shop to get a product card with a verdict, details and cheaper stores. Or photograph a meal: an AI estimates the dishes, portion, calories, protein, carbs, sugar, fiber and fat. Three free photo checks per person per day; typing a meal is unlimited.
- **Fuel.** Shop, Cook and Log meal, with breakfast, lunch, dinner and snack slots and nutrition stats against daily targets. Recipes and swaps for lower-spike versions of meals.
- **Move.** Short movement sessions, including in-bed and seated options for low energy or low mobility, and a Mirror mode that uses the camera.
- **Worlds.** Zoom out and the companion flies through a galaxy of everyone's companions joined by threads of light. She can dive into body-organ "cell worlds" (liver, lungs and more) where guide characters teach real body science and quiz you later. 25 levels of evolution.
- **Community.** Profiles, friends, a weekly ranking, a Care board that ranks daily care (meals, water, moves, scans), sharing meal photos with the AI estimate under them (you review it before posting), and a sci-fi style chat room.
- **Tone.** Supportive education. No diagnosis, no promises, no guilt about food.

## Who it is for (the founder's view)

People who want clearer, gentler support with food and movement without shame or medical language: people watching blood sugar spikes or weight, intermittent fasting fans, people with low energy or limited mobility, and people who like cute collectible games (Tamagotchi, Pokemon-style evolution, Japanese convenience-store cuteness).

## Business model (planned, not built yet)

- The app is free today. Nobody can pay for anything yet.
- Planned: a paid "Plus" subscription sold through Stripe on the website. What exactly Plus includes and its price are not decided.
- Planned: affiliate links to products and grocery stores.

## Stage and team

- Beta. One founder (Emmanuel, based in Flensburg, Germany) builds it with a team of AI coding agents that ship small fixes many times a day.
- Most testing so far is the founder on his own iPhone plus automated tests.

## Known open questions and risks

- Will people keep caring for a companion after the first two weeks?
- Is the app too much at once (many bubbles, worlds, a galaxy, a chat room) for someone who just wants to eat better?
- Trust: AI food-photo estimates can be wrong; health topics like blood sugar need careful, honest wording.
- Privacy: meal photos stay on the phone unless the person shares one to Community.
- It is a web app, not in the App Store yet.
