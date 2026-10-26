#!/usr/bin/env python3
"""Headless MiroFish run for LOWiSPIKE: pitch in, simulated public reaction + report out.

Talks only to a MiroFish backend that is already running (default http://127.0.0.1:5001).
Standard library only. Never prints or writes any key.

  python3 tools/mirofish/run.py --out mirofish-out [--rounds 20] [--base http://127.0.0.1:5001]
  python3 tools/mirofish/run.py --preflight      # only checks that the LLM key answers

Steps (MiroFish 7657031a API): ontology/generate -> graph/build -> simulation/create ->
simulation/prepare -> simulation/start -> interview/all (3 questions) -> report/generate.
Outputs in --out: report.md, interviews.json, posts-reddit.json, posts-twitter.json, run.json.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
QUESTIONS = [
    "You have read exactly what a new person sees in LOWiSPIKE. Would you install it, and would you honestly still be using it after two weeks? Why or why not? Answer in the language you naturally speak every day, in 2 to 4 sentences.",
    "What is the one thing you would change or add first in LOWiSPIKE, based on the experience you read? Answer in the language you naturally speak every day, in 2 to 4 sentences.",
    "The founder has not set any price for LOWiSPIKE Plus yet. Based on the experience you read, what would Plus need to include for you to pay for it, and what monthly price would be ideal for you? Give one specific monthly price (with currency), and the monthly price at which it would be too expensive for you. If you would never pay, say so. Answer in the language you naturally speak every day, in 2 to 4 sentences.",
]


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")

    def _send(self, method, path, body=None, headers=None, timeout=600):
        h = {"Accept-Language": "en"}
        h.update(headers or {})
        req = urllib.request.Request(self.base + path, data=body, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                data = json.loads(raw)
            except ValueError:
                raise SystemExit(f"FAILED {method} {path}: HTTP {e.code} {raw[:300]!r}")
            raise SystemExit(f"FAILED {method} {path}: HTTP {e.code} {data.get('error') or data}")
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except ValueError:
            return {"raw": raw.decode("utf-8", "replace")}

    def get(self, path, timeout=120):
        return self._send("GET", path, timeout=timeout)

    def post(self, path, payload, timeout=600):
        return self._send("POST", path, json.dumps(payload).encode(), {"Content-Type": "application/json"}, timeout)

    def post_files(self, path, fields, files):
        boundary = "----mirofish" + uuid.uuid4().hex
        parts = []
        for k, v in fields.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        for fp in files:
            with open(fp, "rb") as f:
                data = f.read()
            name = os.path.basename(fp)
            parts.append(
                f'--{boundary}\r\nContent-Disposition: form-data; name="files"; filename="{name}"\r\n'
                f"Content-Type: text/markdown\r\n\r\n".encode() + data + b"\r\n"
            )
        parts.append(f"--{boundary}--\r\n".encode())
        return self._send("POST", path, b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={boundary}"}, 900)


def data_of(resp, step):
    if not resp.get("success", False):
        raise SystemExit(f"FAILED at {step}: {resp.get('error') or resp}")
    return resp.get("data") or {}


def wait(step, poll, done, failed, every=10, limit_s=3 * 3600):
    start, last = time.time(), None
    while True:
        d = poll()
        note = f"{d.get('status') or d.get('runner_status')} {d.get('progress') or d.get('progress_percent') or ''} {str(d.get('message') or '')[:120]}".strip()
        if note != last:
            log(f"{step}: {note}")
            last = note
        if done(d):
            return d
        if failed(d):
            raise SystemExit(f"FAILED at {step}: {d.get('error') or d.get('message') or d}")
        if time.time() - start > limit_s:
            raise SystemExit(f"FAILED at {step}: still not done after {limit_s // 60} min")
        time.sleep(every)


def preflight():
    """One tiny chat call so a bad or missing LLM key fails in seconds, not an hour in."""
    key = os.environ.get("LLM_API_KEY", "")
    base = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.environ.get("LLM_MODEL_NAME", "gpt-4o-mini")
    if not key:
        raise SystemExit("FAILED preflight: LLM_API_KEY is not set")
    if not os.environ.get("ZEP_API_KEY"):
        raise SystemExit("FAILED preflight: ZEP_API_KEY is not set")
    body = json.dumps({"model": model, "messages": [{"role": "user", "content": "Reply with the word ok."}], "max_tokens": 5}).encode()
    req = urllib.request.Request(base + "/chat/completions", data=body, method="POST",
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + key})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"FAILED preflight: the LLM endpoint said HTTP {e.code} for model {model} (check the key and model name)")
    except urllib.error.URLError as e:
        raise SystemExit(f"FAILED preflight: cannot reach the LLM endpoint ({e.reason})")
    log(f"preflight ok: model {model} answers")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:5001")
    ap.add_argument("--out", default="mirofish-out")
    ap.add_argument("--rounds", type=int, default=20, help="cap on simulation rounds (MiroFish advises under 40)")
    ap.add_argument("--platform", default="parallel", choices=["parallel", "reddit", "twitter"])
    ap.add_argument("--profiles-parallel", type=int, default=3)
    ap.add_argument("--seed", action="append", help="seed file(s); default tools/mirofish/seed/*.md")
    ap.add_argument("--preflight", action="store_true")
    a = ap.parse_args()

    if a.preflight:
        preflight()
        return
    seeds = a.seed or sorted(os.path.join(HERE, "seed", f) for f in os.listdir(os.path.join(HERE, "seed")) if f.endswith(".md"))
    with open(os.path.join(HERE, "requirement.txt"), encoding="utf-8") as f:
        requirement = f.read().strip()
    os.makedirs(a.out, exist_ok=True)
    api = Api(a.base)
    run = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "rounds_cap": a.rounds, "platform": a.platform,
           "model": os.environ.get("LLM_MODEL_NAME", ""), "seeds": [os.path.basename(s) for s in seeds]}

    def save():
        with open(os.path.join(a.out, "run.json"), "w") as f:
            json.dump(run, f, indent=2, ensure_ascii=False)

    h = api.get("/health")
    log(f"backend: {h}")

    log("1/7 reading the pitch and building the ontology")
    d = data_of(api.post_files("/api/graph/ontology/generate",
                               {"simulation_requirement": requirement, "project_name": "LOWiSPIKE launch reaction",
                                "additional_context": "LOWiSPIKE is a beta health and food game PWA. The seed is a factual walkthrough of the live app. The ONLY entities to simulate as agents are the twelve people of the beta reader panel in section 10, each as a Person-type entity; do not create agents for the app, the founder, companies, groups or platforms. Output in English, except that each simulated person speaks their own everyday language."},
                               seeds), "ontology")
    pid = run["project_id"] = d["project_id"]
    run["entity_types"] = [e.get("name") for e in (d.get("ontology") or {}).get("entity_types", [])]
    save()

    log("2/7 building the knowledge graph (Zep)")
    task = data_of(api.post("/api/graph/build", {"project_id": pid}), "graph build")["task_id"]
    wait("graph", lambda: data_of(api.get(f"/api/graph/task/{task}"), "graph task"),
         lambda d: d.get("status") == "completed", lambda d: d.get("status") == "failed")
    proj = data_of(api.get(f"/api/graph/project/{pid}"), "project")
    run["graph_id"] = proj.get("graph_id")
    save()

    log("3/7 creating the simulation")
    sim = data_of(api.post("/api/simulation/create", {"project_id": pid, "enable_twitter": a.platform != "reddit",
                                                      "enable_reddit": a.platform != "twitter"}), "create")
    sid = run["simulation_id"] = sim["simulation_id"]
    save()

    log("4/7 generating the simulated people and the simulation settings")
    p = data_of(api.post("/api/simulation/prepare", {"simulation_id": sid, "use_llm_for_profiles": True,
                                                     "parallel_profile_count": a.profiles_parallel}), "prepare")
    if not p.get("already_prepared"):
        ptask = p.get("task_id")
        wait("prepare", lambda: data_of(api.post("/api/simulation/prepare/status", {"task_id": ptask, "simulation_id": sid}), "prepare status"),
             lambda d: d.get("status") in ("completed", "ready") or d.get("already_prepared"), lambda d: d.get("status") == "failed")
    try:
        prof = data_of(api.get(f"/api/simulation/{sid}/profiles"), "profiles")
        with open(os.path.join(a.out, "profiles.json"), "w") as f:
            json.dump(prof, f, indent=2, ensure_ascii=False)
    except SystemExit as e:
        log(f"profiles not saved: {e}")

    log(f"5/7 running the simulation (up to {a.rounds} rounds, {a.platform})")
    data_of(api.post("/api/simulation/start", {"simulation_id": sid, "platform": a.platform, "max_rounds": a.rounds,
                                               "enable_graph_memory_update": False}), "start")
    st = wait("simulation", lambda: data_of(api.get(f"/api/simulation/{sid}/run-status"), "run status"),
              lambda d: d.get("runner_status") in ("completed", "stopped"), lambda d: d.get("runner_status") == "failed", every=20)
    run["actions"] = st.get("total_actions_count")
    run["rounds_done"] = st.get("current_round")
    save()
    for plat in (["reddit", "twitter"] if a.platform == "parallel" else [a.platform]):
        try:
            posts = data_of(api.get(f"/api/simulation/{sid}/posts?platform={plat}&limit=500"), "posts")
            with open(os.path.join(a.out, f"posts-{plat}.json"), "w") as f:
                json.dump(posts, f, indent=2, ensure_ascii=False)
        except SystemExit as e:
            log(f"{plat} posts not saved: {e}")

    log("6/7 interviewing every simulated person")
    interviews = {}
    for q in QUESTIONS:
        try:
            interviews[q] = data_of(api.post("/api/simulation/interview/all", {"simulation_id": sid, "prompt": q, "timeout": 600},
                                             timeout=900), "interview")
        except SystemExit as e:
            interviews[q] = {"error": str(e)}
            log(str(e))
    with open(os.path.join(a.out, "interviews.json"), "w") as f:
        json.dump(interviews, f, indent=2, ensure_ascii=False)

    log("7/7 writing the report")
    g = data_of(api.post("/api/report/generate", {"simulation_id": sid}), "report")
    rtask = g.get("task_id")
    wait("report", lambda: data_of(api.post("/api/report/generate/status", {"task_id": rtask, "simulation_id": sid}), "report status"),
         lambda d: d.get("status") == "completed", lambda d: d.get("status") == "failed", every=15)
    rep = data_of(api.get(f"/api/report/by-simulation/{sid}"), "report fetch")
    run["report_id"] = rep.get("report_id")
    with open(os.path.join(a.out, "report.md"), "w", encoding="utf-8") as f:
        f.write(rep.get("markdown_content") or json.dumps(rep, indent=2, ensure_ascii=False))
    try:
        api.post("/api/simulation/close-env", {"simulation_id": sid}, timeout=120)
    except SystemExit:
        pass
    run["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
    save()
    log(f"done: {os.path.join(a.out, 'report.md')}")


if __name__ == "__main__":
    main()
