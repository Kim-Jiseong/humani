-- Migrate experiment_suggestions from single-word to array storage.
-- Was: suggested_word text, similarity float8 (top-1).
-- Now: suggested_words text[], similarities float8[] (top-6 shown; query word excluded).
-- Apply in the Supabase SQL editor. Idempotent. (Drops the old single-value
-- columns; existing test rows lose their old values — acceptable pre-launch.)

alter table public.experiment_suggestions
  drop column if exists suggested_word,
  drop column if exists similarity,
  add column if not exists suggested_words text[] not null default '{}',
  add column if not exists similarities    float8[] not null default '{}';
