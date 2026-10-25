#!/bin/bash
# One-time live rollout for Nibblo meal notifications (task f1489750, 25 Oct 2026). Run once; every step is safe to repeat.
#  1. deploy n1-push (verify_jwt off, as before) with nibblo.ts
#  2. apply supabase/proposals/nibblo_push_20261025.sql (adds nibblo_log.pushed_at + insert trigger; Nibblo's functions untouched)
#  3. dry run: who WOULD get tonight's post right now (nothing sent)
#  4. ONE test notification of tonight's post to Emmanuel's account only (action nbtest, cron key)
#  5. trigger check with a fake 2020 slot that has no message: claimed, nothing sent, row removed again
set -u
ROOT=/home/sprite/wt-nibblo-push; PH=/home/sprite/.push-home; FN=https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push
EMAN=83077af7-8475-4628-9328-25bd335db240
echo "== 1 deploy"
mkdir -p $PH/dl/supabase/functions/n1-push && cp $ROOT/supabase/functions/n1-push/*.ts $PH/dl/supabase/functions/n1-push/
$PH/sb.sh functions deploy n1-push --project-ref vnfwmifmsfecascwaody --no-verify-jwt --use-api 2>&1 | tail -3
echo "== 2 sql"
$PH/q.sh "$(cat $ROOT/supabase/proposals/nibblo_push_20261025.sql)" | tail -3
$PH/q.sh "select tgname, tgenabled from pg_trigger where tgname='nibblo_push_ping'"
$PH/q.sh "select id, posted_at, pushed_at from public.nibblo_log order by posted_at desc limit 3"
KEY=$(Q_FMT=json $PH/q.sh "select substring(command from 'x-n1-key\":\"([0-9a-f]+)') k from cron.job where jobname='n1-push-5min'" | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["k"])')
echo "== 3 dry run (nothing sent)"
curl -sS -m 40 -X POST $FN -H 'Content-Type: application/json' -H "x-n1-key: $KEY" -d '{"a":"nibblo","dry":true,"id":"nb-20261025-e"}'; echo
echo "== 4 test push to Emmanuel only"
curl -sS -m 40 -X POST $FN -H 'Content-Type: application/json' -H "x-n1-key: $KEY" -d "{\"a\":\"nbtest\",\"uid\":\"$EMAN\",\"id\":\"nb-20261025-e\"}"; echo
echo "== 5 trigger check (fake 2020 slot, no message, nothing sent)"
$PH/q.sh "insert into public.nibblo_log (id, posted_at) values ('nb-20200101-m', now()) on conflict (id) do nothing" | tail -1
sleep 12
$PH/q.sh "select id, pushed_at is not null as claimed from public.nibblo_log where id='nb-20200101-m'"
$PH/q.sh "select status_code, left(content, 200) from net._http_response where created > now() - interval '2 minutes' order by created desc limit 3"
$PH/q.sh "delete from public.nibblo_log where id='nb-20200101-m'" | tail -1
$PH/q.sh "select count(*) fake_left from public.nibblo_log where id='nb-20200101-m'"
