-- One survey response per (participant, trial). Enables upsert on conflict so a
-- re-submit overwrites instead of creating a duplicate row.
-- Apply in the Supabase SQL editor (additive, safe to run once).
-- NOTE: trial_index is nullable (reserved for a future end-of-study survey);
-- Postgres treats NULLs as distinct, so this index only constrains the per-trial
-- rows (trial_index = 1 or 2), which is exactly what we want.
create unique index if not exists experiment_survey_resp_user_trial_uniq
  on public.experiment_survey_responses (user_id, trial_index);
