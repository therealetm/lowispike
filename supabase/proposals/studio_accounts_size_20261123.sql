-- 23 Nov 2026 bug (Emmanuel: "Not saved. Check your connection ... keeps appearing even though the things have been saved"): with seven
-- accounts and their pictures the Studio profile doc grew past the 300 KB check, so every cloud save since the morning was refused (the
-- phone kept its copy). Room for many more accounts, drafts and inspo; still a bound against abuse.
alter table public.studio_accounts drop constraint if exists studio_accounts_size;
alter table public.studio_accounts add constraint studio_accounts_size check (pg_column_size(doc) <= 3000000);
