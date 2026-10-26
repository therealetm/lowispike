# LOWiSPIKE AI playbook

How to brief, run, check and hand off AI coding agents on this repo. `AGENTS.md` stays the rulebook. This file adds
what people who build with agents every day recommend, each point tied to something that actually happened here.
The step-by-step version for an agent is `.agents/skills/lowispike-change/SKILL.md`.

Last checked 18 October 2026. Sources and what could not be read are at the end.

## 1. One task, one owner, one worktree

**What people do.** Simon Willison and the incident.io team run several agents at once, each in its own checkout or
git worktree, so they never edit the same files. Peter Steinberger runs three to eight agents, mostly in one folder,
and keeps them apart differently: he sizes every change by its "blast radius" and has each agent commit exactly the
files it edited. Here tasks did collide, so separate worktrees are the safer choice.

**What happened here.** On 17 October one task stopped because another running task already owned the same item, and
another hit its working budget three times and left unpushed work in `wt-warp9737`. The coordination files that
appeared on 18 October (`/home/sprite/COORD-*.md`) fixed the first problem by hand.

**Do this.**

- Read every `/home/sprite/COORD-*.md` before you start. If a file you need is owned, ask under "Replies". Don't edit it.
- Write your own `COORD-<topic>.md`: task id, branch, worktree, files you own, files you won't touch.
- Start from the remote, never from someone's dirty checkout:
  `git -C /home/sprite/lowispike fetch && git -C /home/sprite/lowispike worktree add -b <branch> /home/sprite/wt-<topic> origin/main`
- Only the task that owns the runtime files bumps the build id. Push to `main` only while holding
  `/tmp/lowispike-release.lock`, after fetch and rebase, never with force.

## 2. Brief it like an issue, not a wish

**What people do.** GitHub's guide for its coding agent asks for a clear problem, acceptance criteria and the files
involved, and says to keep vague, sensitive or production-critical work with a human. Anthropic's guide says to be
specific up front, and to explore and plan before writing code.

**Brief template.** Copy it into the task goal.

```
Goal (one behavior):
What the user saw (screenshot or exact words):
Done when (test name + visible check at 390x844):
Files you may edit:
Do not touch:
Out of scope (write a ticket instead):
```

**Example.** "The care line on the Move card stops rewriting itself every frame. Done when a test proves it is written
only when the sunbeam count changes, and the Care board month view stays open for five minutes in WebKit without errors."

## 3. Reproduce first, then fix

**What people do.** Anthropic's guide and the superpowers skills (Jesse Vincent) both say: write the failing test
first, commit it, then change the code without touching that test.

**What happened here.** Release 20261018-000407 fixed the Care board heat and crashes. The Move card compared its
`textContent` with the new text, but `spirit.js` swaps the sun emoji for an icon, so the two never matched and the line
was rewritten every frame, even after leaving Move.

**Do this.** In any frame loop, compare with the value you last wrote (keep it in a variable or `dataset`), never with
what you read back from the page. A bug fix lands with a test that failed before the fix.

## 4. Tests are the contract, so never weaken them

**What people do.** Kent Beck lists the warning signs that an AI assistant is going off track: loops, features nobody
asked for, and "cheating, for example by disabling or deleting tests".

**Do this.** A commit that removes or loosens a test says why in its message. Every release subject records the pass
count (`tests 1205/1205`), and that number only goes up. The workflow task has been asked to turn this into a check.

## 5. Prove it in the closest browser you have

**What people do.** Anthropic recommends giving the agent screenshots and a way to check its own result in a browser.

**The ladder, lowest to highest.** Report the highest rung you actually reached.

1. `node --test tests/*.test.cjs`
2. A headless Chromium fixture (`tests/*-live.cjs`)
3. Playwright WebKit with an iPhone profile
4. A physical iPhone

**What works here.** Playwright WebKit 27.2 runs on the VM. On 18 October it loaded the live build 20261018-000407 with
an iPhone 13 profile and showed no page errors:

```js
const { webkit, devices } = require('/tmp/pw/node_modules/playwright');
const b = await webkit.launch();
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
p.on('pageerror', e => console.log('ERR', e));
await p.goto('https://therealetm.github.io/lowispike/');
```

WebKit on Linux is not Safari on an iPhone. It has no heat throttling and no iOS memory limit, so heat and memory
crashes still need the phone.

## 6. Keep instructions short and true

**What people do.** HumanLayer finds that models reliably follow only a limited number of instructions, so the root
file should be short and point to other docs ("read X when you touch Y"). Use tools, not prose, for anything a check
can enforce. The AGENTS.md format (agents.md) works the same way: a README for agents, and the nearest file wins.

**What happened here.** `AGENTS.md` asks for seven documents (about 1,000 lines) before any task. `AGENTS.md` and
`CONTEXT.md` still describe "the herb" and Home/Scan/Cook. Misty, her bubble and the worlds aren't mentioned.

**Do this.** Until the product owner updates them, the live app and the latest What's New win over those two docs.
When a release changes what's true, the doc changes in the same commit, as `AGENTS.md` already asks.

## 7. Hand off before the budget runs out

**What people do.** "Document and clear" (described by DataCamp from incident.io and others) and Anthropic's guide:
write the plan and progress to a file, then start fresh from it instead of pushing a worn-out session.

**Do this.** Once a task is past half its budget, or is about to stop, commit what you have to its branch (not
`main`), push the branch, and leave `HANDOFF.md` in the worktree:

```
Branch and last commit:
Done (and how it was checked):
Not done:
Next exact step:
Traps found:
```

The warp task that stopped three times would have left exactly this.

## 8. A second pair of eyes before release

**What people do.** Anthropic suggests one agent writes and a fresh one reviews. Superpowers has a code-review step
before a branch is finished.

**Do this.** Before a release, a separate check reads only `git diff origin/main...HEAD` against the brief. It looks
for scope creep, deleted or weakened tests, duplicate listeners, frame loops that write to the page, and docs that
are now wrong.

## 9. Small slices, released often

**What people do.** The DORA 2025 report on AI-assisted development finds that AI is an amplifier of a team's
existing strengths and weaknesses. Its companion model names seven capabilities, and two of them are working in small
batches and version control as "a critical safety net as AI accelerates" changes.

This matches the existing rule in `AGENTS.md`: freeze scope, ship the smallest complete slice, verify it, then start
the next one.

**Updates always ship silently, never send update notifications (product owner, 26 Oct 2026).** "It's annoying when
people get notified of every update. So, no more notification updates." No release ever puts a "New version" or
"I've got something new for you!" ask on a phone, shows "Update loaded", sends a push or posts to Community about
itself. `version.json` keeps `"loud":"20000101-000000"` right after `"build"` forever, because builds already on
phones read it; `scripts/bump-build.cjs` writes it and `scripts/release-check.cjs` fails anything else. A new build
loads by itself on the next open, or quietly when the app comes back after 10 minutes away. The What's New tour inside
the app stays, and every tour card has its speaker in EN/DE/ES (`tests/silent-updates-always.test.cjs`,
`tests/tutorial-speaker-every-card.test.cjs`).

## 10. Outside skills and social media tips are leads, not authority

- `.agents/skills/apple-design` comes from `emilkowalski/skills` and is pinned by hash in `skills-lock.json`. Read
  outside skills as text. Don't run their scripts, and don't add new ones without the owner's yes.
- The most popular #claudecode reels on Instagram on 18 October were mostly promotion. One 2-million-view reel pushes a
  plugin that routes your code through "over 200 free AI providers". Don't use that on this repo: the code and any
  keys in the session would go to unknown services.

## What was read, and what couldn't be

- **Read directly:** Anthropic's Claude Code best practices, Simon Willison on parallel agents, GitHub's coding agent
  guide, the agents.md site, the `anthropics/skills` and `obra/superpowers` repositories, HumanLayer's CLAUDE.md post,
  Peter Steinberger's "Just Talk To It", Kent Beck's "Augmented Coding", Addy Osmani's workflow post, the incident.io
  worktree post, and DORA's 2025 report page and capabilities list.
- **Search summary only (the site blocked the download):** DataCamp's best practices write-up.
- **YouTube:** Cal Rueb's talk "Claude Code best practices" (Anthropic, 22 May 2025) was found, but YouTube refused
  the transcript request from this server ("too many requests"). Only its description and published summaries were
  read. Nobody watched the video.
- **TikTok:** search shows only a login wall without an account. Nothing was read.
- **Instagram:** the public #claudecode page was readable without logging in. Captions only, no videos watched.

## Sources

- Anthropic, Claude Code best practices: https://www.anthropic.com/engineering/claude-code-best-practices
- Simon Willison, Embracing the parallel coding agent lifestyle: https://simonwillison.net/2025/Oct/5/parallel-coding-agents/
- GitHub Docs, Best results with Copilot coding agent: https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results
- AGENTS.md format: https://agents.md/
- Anthropic skills repository (SKILL.md format): https://github.com/anthropics/skills
- Jesse Vincent, superpowers skills: https://github.com/obra/superpowers
- HumanLayer, Writing a good CLAUDE.md: https://www.humanlayer.dev/blog/writing-a-good-claude-md
- DataCamp, Claude Code best practices: https://www.datacamp.com/tutorial/claude-code-best-practices
- incident.io, Shipping faster with Claude Code and git worktrees: https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees
- Addy Osmani, My LLM coding workflow going into 2026: https://addyosmani.com/blog/ai-coding-workflow/
- Peter Steinberger, Just Talk To It: https://steipete.me/posts/just-talk-to-it
- Kent Beck, Augmented Coding: Beyond the Vibes: https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes
- DORA 2025 report: https://dora.dev/research/2025/dora-report/
- DORA capabilities: https://dora.dev/capabilities/
- Cal Rueb, Claude Code best practices (video): https://www.youtube.com/watch?v=gv0WHhKelSE
- Instagram #claudecode: https://www.instagram.com/popular/claudecode/
