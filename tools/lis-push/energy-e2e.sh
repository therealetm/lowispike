#!/usr/bin/env bash
# Called by mozilla-e2e.cjs (ENERGY_SQL_CMD): links the test subscription to one test account and lands one energy shot on it
# from another test account (test accounts only: the energy_gifts guard keeps them away from real people).
set -euo pipefail
P=vnfwmifmsfecascwaody; T=$(cat /home/sprite/.push-home/.sbtoken)
Q="select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false);
with p as (select pr.id from public.profiles pr join auth.users u on u.id = pr.id where pr.test and not coalesce(pr.bot,false) order by pr.id limit 2),
a as (select (select id from p order by id limit 1) id), b as (select (select id from p order by id desc limit 1) id),
u as (update public.n1_push set uid = (select id from b) where endpoint = '${E2E_ENDPOINT}' returning 1)
insert into public.energy_gifts (from_id, to_id, to_online) select a.id, b.id, false from a, b where a.id <> b.id and (select count(*) from u) = 1
returning id, from_id, to_id;"
curl -s -X POST "https://api.supabase.com/v1/projects/$P/database/query" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d "$(jq -n --arg q "$Q" '{query:$q}')"
