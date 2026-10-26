# MiroFish market simulation for LOWiSPIKE

Added 26 Oct 2026 after Emmanuel sent an Instagram reel (Nick Saraev, @nicksaraev) about MiroFish and said "let's do what this guy talks about".

## What MiroFish is

MiroFish (github.com/666ghj/MiroFish, AGPL-3.0, about 82k stars) is an open-source "swarm intelligence" engine. You give it seed material (a pitch, a report, a story) and a question in plain words. It builds a knowledge graph from the seed (Zep Cloud memory), creates many simulated people with their own personalities and memories, and lets them post, reply and argue on a simulated Twitter and Reddit (the OASIS engine from CAMEL-AI). Then a report agent writes up what happened, and you can interview any simulated person.

The reel's pitch: test a product or business idea on thousands of AI people before you build or launch it. Treat that as a lead, not proof: the people are language-model agents, so the result is a cheap early signal about objections, confusion and wording, not real market data. Real users still decide.

## What is here

- `seed/lowispike-pitch.md`: what LOWiSPIKE is today and what is planned, written from MAYA-HANDOFF.md and SUCCESSOR_HANDOFF.md. Update it when the product changes.
- `requirement.txt`: the question the simulation answers (who loves it, who quits, what confuses, health and privacy worries, would they pay for Plus and how much, the one change to make before a wider launch).
- `run.py`: headless driver for a running MiroFish backend. Steps: ontology, graph, simulated people, simulation (default 20 rounds on Twitter and Reddit), three interview questions to everyone, report. Writes `report.md`, `interviews.json`, `profiles.json`, `posts-*.json`, `run.json`. `--preflight` only checks that the LLM key answers.
- `.github/workflows/mirofish.yml`: manual GitHub Action "MiroFish simulation". Never runs on push, never touches the app or a release. Pins MiroFish to commit 7657031a. The result is the run's artifact `mirofish-report-<n>` (kept 30 days).

## What it needs (once)

Two repository secrets (GitHub, lowispike, Settings, Secrets and variables, Actions, New repository secret):

- `MIROFISH_LLM_API_KEY`: any OpenAI-compatible key. Default setup is a Google AI Studio Gemini key (aistudio.google.com) through Gemini's official OpenAI-compatible endpoint `https://generativelanguage.googleapis.com/v1beta/openai/` with model `gemini-3.8-flash` (both from ai.google.dev/gemini-api/docs/openai). Another provider works by changing the workflow inputs `base_url` and `model`.
- `MIROFISH_ZEP_API_KEY`: free Zep Cloud key from app.getzep.com (the free plan has 10,000 credits a month per getzep.com/pricing). MiroFish 7657031a only works with Zep Cloud.

Keys only ever live in GitHub secrets. They are never in the repo, the artifact or chat.

## How a Maya runs it

```
gh workflow run mirofish.yml -R therealetm/lowispike -f rounds=20
gh run list -R therealetm/lowispike -w mirofish.yml -L 1
gh run download <run-id> -R therealetm/lowispike -n mirofish-report-<n> -D /home/sprite/MIROFISH/out-<n>
```

Then read `report.md` and `interviews.json` and give Emmanuel the top findings in his checklist format. Turn concrete findings into normal LOWiSPIKE tasks; never change the app straight from a simulation result without checking it against real users and the docs.

On the Sesame VM the backend is already installed at /home/sprite/MIROFISH/MiroFish (uv venv in backend/.venv). With keys in the environment: `cd backend && .venv/bin/python run.py` then `python3 tools/mirofish/run.py --out <dir>`.

## Cost and limits

MiroFish's own README warns that simulations are token-heavy and suggests under 40 rounds first. Start at 20. The run stops early with a clear message if a key is missing or wrong. On a free Gemini key, rate limits can make a run slow; the job allows 5.5 hours.

## Checked on 26 Oct 2026

On the VM, the backend installed and started, `/health` answered, the pitch uploaded and was read (4,434 characters), and with a dummy key both the preflight and the first LLM call failed cleanly with HTTP 400. A full run has not happened yet because the two keys don't exist yet.
