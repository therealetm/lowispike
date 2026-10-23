#!/usr/bin/env python3
"""LOWiSPIKE work queue: durable, checkpointed, bounded concurrency.

One JSON file (queue.json) guarded by an exclusive fcntl lock, so every agent on this
computer reads and writes it atomically. Limits (enforced on claim):
  - at most MAX_ACTIVE claimed steps at once (build/test/verify/release together) = 2
  - at most ONE step of kind 'release' at once (plus the flock in release-pipeline.sh)
A claim older than STALE_H hours is treated as abandoned (task hit its limit) and goes
back to 'queued' with its checkpoint kept, so the next worker resumes it.

Usage:
  q.py list [--all]                 board (open steps first)
  q.py show ID                      one step with its full checkpoint log
  q.py claim OWNER [--release-ok]   claim the next runnable step; prints JSON or NO_SLOT / NOTHING
  q.py claim-id ID OWNER            claim one named step (same limits)
  q.py checkpoint ID "note" [--commit SHA] [--next "next action"]   append progress, keep claim
  q.py done ID "note" [--status live|done|ready]   finish a step (ready = verified, release step may run)
  q.py block ID "why"               blocked: needs Emmanuel/account/branch; frees the slot
  q.py unclaim ID "why"             give the step back (e.g. budget nearly spent), checkpoint kept
  q.py add ID "title" --kind K [--branch B] [--deps A,B] [--prio N] [--next "..."]
  q.py render                       write QUEUE.md next to queue.json (for the repo)
"""
import fcntl, json, os, sys, time, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, 'queue.json')
LOCK = os.path.join(HERE, '.queue.lock')
MAX_ACTIVE = 2
STALE_H = 2.5
OPEN = ('queued', 'claimed', 'ready')
FINISHED = ('done', 'live')
ICON = {'live': '\u2705', 'done': '\u2705', 'claimed': '\U0001F504', 'ready': '\U0001F504',
        'queued': '\u23f8\ufe0f', 'blocked': '\u23f8\ufe0f'}


def now():
    return datetime.datetime.now().astimezone().isoformat(timespec='seconds')


def age_h(ts):
    try:
        return (time.time() - datetime.datetime.fromisoformat(ts).timestamp()) / 3600
    except Exception:
        return 999


class Q:
    def __enter__(self):
        self.lf = open(LOCK, 'a+')
        fcntl.flock(self.lf, fcntl.LOCK_EX)
        self.d = json.load(open(DB)) if os.path.exists(DB) else {'items': []}
        self.reap()
        return self

    def __exit__(self, *a):
        if a[0] is None:
            tmp = DB + '.tmp'
            json.dump(self.d, open(tmp, 'w'), indent=1, ensure_ascii=False)
            os.replace(tmp, DB)
        fcntl.flock(self.lf, fcntl.LOCK_UN)

    def get(self, i):
        for it in self.d['items']:
            if it['id'] == i:
                return it
        sys.exit('no such step ' + i)

    def log(self, it, msg):
        it.setdefault('log', []).append(now() + ' ' + msg)

    def reap(self):
        for it in self.d['items']:
            if it['status'] == 'claimed' and age_h(it.get('claimed_at', '')) > STALE_H:
                self.log(it, 'claim by %s went stale (task likely hit its limit); back to queue, resume from checkpoint' % it.get('owner'))
                it['status'] = it.get('prev_status', 'queued')
                it['owner'] = None

    def active(self):
        return [x for x in self.d['items'] if x['status'] == 'claimed']

    def deps_ok(self, it):
        st = {x['id']: x['status'] for x in self.d['items']}
        for dep in it.get('deps', []):
            if dep.startswith('EXT:'):
                if dep not in self.d.get('ext_done', []):
                    return False
            elif st.get(dep) not in FINISHED + (('ready',) if it['kind'] == 'release' else ()):
                return False
        return True

    def can_claim(self, it):
        act = self.active()
        if len(act) >= MAX_ACTIVE:
            return 'NO_SLOT: %d steps already active (%s)' % (len(act), ', '.join(a['id'] for a in act))
        if it['kind'] == 'release' and any(a['kind'] == 'release' for a in act):
            return 'NO_SLOT: a release is already running'
        br = it.get('branch')
        if br and any(a.get('branch') == br for a in act):
            return 'NO_SLOT: branch %s is in use by another step' % br
        return None

    def take(self, it, owner):
        it['prev_status'] = it['status']
        it['status'] = 'claimed'
        it['owner'] = owner
        it['claimed_at'] = now()
        self.log(it, 'claimed by ' + owner)


def runnable(q, release_ok):
    c = [x for x in q.d['items'] if x['status'] == 'queued' and q.deps_ok(x)]
    if not release_ok:
        c = [x for x in c if x['kind'] != 'release']
    # releases first when allowed (finished work should go live), then priority order
    c.sort(key=lambda x: (0 if x['kind'] == 'release' else 1, x.get('prio', 50), x['id']))
    return c


def opt(args, name, default=None):
    if name in args:
        i = args.index(name)
        v = args[i + 1]
        del args[i:i + 2]
        return v
    return default


def line(it):
    s = '%s %s [%s] %s' % (ICON.get(it['status'], '?'), it['id'], it['status'], it['title'])
    if it.get('branch'):
        s += '  (branch %s)' % it['branch']
    if it.get('deps'):
        s += '  after ' + ','.join(it['deps'])
    if it.get('owner') and it['status'] == 'claimed':
        s += '  owner ' + it['owner']
    return s


def main(a):
    if not a:
        print(__doc__); return
    cmd = a.pop(0)
    with Q() as q:
        if cmd == 'list':
            items = q.d['items'] if '--all' in a else [x for x in q.d['items'] if x['status'] not in FINISHED]
            for it in sorted(items, key=lambda x: (x['status'] != 'claimed', x.get('prio', 50), x['id'])):
                print(line(it))
                if it.get('next'):
                    print('     next: ' + it['next'])
            print('active %d/%d' % (len(q.active()), MAX_ACTIVE))
        elif cmd == 'show':
            print(json.dumps(q.get(a[0]), indent=1, ensure_ascii=False))
        elif cmd in ('claim', 'claim-id'):
            if cmd == 'claim-id':
                it = q.get(a[0]); owner = a[1]
                if it['status'] != 'queued' or not q.deps_ok(it):
                    print('NOT_RUNNABLE: status %s, deps %s' % (it['status'], it.get('deps'))); return
            else:
                owner = a[0]
                c = runnable(q, '--release-ok' in a)
                c = [x for x in c if not q.can_claim(x)] or c
                if not c:
                    print('NOTHING: no runnable step (all done, blocked or waiting on deps)'); return
                it = c[0]
            why = q.can_claim(it)
            if why:
                print(why); return
            q.take(it, owner)
            print(json.dumps(it, indent=1, ensure_ascii=False))
        elif cmd == 'checkpoint':
            it = q.get(a.pop(0)); c = opt(a, '--commit'); n = opt(a, '--next')
            if c: it['commit'] = c
            if n: it['next'] = n
            it['claimed_at'] = now() if it['status'] == 'claimed' else it.get('claimed_at')
            q.log(it, ' '.join(a)); print(line(it))
        elif cmd == 'done':
            it = q.get(a.pop(0)); st = opt(a, '--status', 'done'); c = opt(a, '--commit')
            if c: it['commit'] = c
            it['status'] = st; it['owner'] = None; it['next'] = '' if st in FINISHED else it.get('next', '')
            q.log(it, '%s: %s' % (st, ' '.join(a))); print(line(it))
        elif cmd in ('block', 'unclaim'):
            it = q.get(a.pop(0))
            it['status'] = 'blocked' if cmd == 'block' else it.get('prev_status', 'queued')
            if it['status'] == 'claimed': it['status'] = 'queued'
            it['owner'] = None; q.log(it, cmd + ': ' + ' '.join(a)); print(line(it))
        elif cmd == 'unblock':
            it = q.get(a.pop(0)); it['status'] = 'queued'; q.log(it, 'unblocked: ' + ' '.join(a)); print(line(it))
        elif cmd == 'ext-done':
            q.d.setdefault('ext_done', []).append('EXT:' + a[0]); print('marked EXT:' + a[0])
        elif cmd == 'add':
            i = a.pop(0); t = a.pop(0)
            if any(x['id'] == i for x in q.d['items']): sys.exit('exists ' + i)
            it = {'id': i, 'title': t, 'kind': opt(a, '--kind', 'work'), 'branch': opt(a, '--branch'),
                  'deps': [x for x in (opt(a, '--deps', '') or '').split(',') if x],
                  'prio': int(opt(a, '--prio', 50)), 'next': opt(a, '--next', ''),
                  'status': opt(a, '--status', 'queued'), 'owner': None, 'log': []}
            q.log(it, 'added'); q.d['items'].append(it); print(line(it))
        elif cmd == 'render':
            out = ['# LOWiSPIKE work queue', '',
                   'Generated from the queue tool (queue/q.py on the agent computer) at %s. Edit through the tool, not by hand.' % now(),
                   'Limits: at most %d steps active at once, at most one release (release-pipeline.sh holds an exclusive lock).' % MAX_ACTIVE,
                   'A claim older than %.1f hours is treated as abandoned and goes back to the queue with its checkpoint.' % STALE_H,
                   'Icons: \u2705 live/done, \U0001F504 in progress, \u23f8\ufe0f queued, waiting or blocked.', '']
            for title, sts in (('Active', ('claimed',)), ('Verified, waiting for its release step', ('ready',)),
                               ('Queued', ('queued',)), ('Blocked', ('blocked',)), ('Finished', FINISHED)):
                rows = [x for x in q.d['items'] if x['status'] in sts]
                if not rows: continue
                out += ['## ' + title, '']
                for it in sorted(rows, key=lambda x: (x.get('prio', 50), x['id'])):
                    out.append('- ' + line(it))
                    if it.get('next'): out.append('  - next: ' + it['next'])
                    if it.get('log'): out.append('  - last: ' + it['log'][-1])
                out.append('')
            open(os.path.join(HERE, 'QUEUE.md'), 'w').write('\n'.join(out))
            print('wrote QUEUE.md')
        else:
            print(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
