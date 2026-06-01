-- One row per shown suggestion in 연관(related) trials. Ties to post-trial
-- survey Q7/Q8 (did the participant notice / use the presented words).
-- User-owned; RLS mirrors the other experiment tables. Apply anytime (additive).
-- Logs HITS only (a word was shown). To analyze the "no suggestion" denominator
-- later, make suggested_word/similarity nullable and log misses too.

create table if not exists public.experiment_suggestions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  trial_index    smallint not null check (trial_index in (1, 2)),
  scenario       text not null check (scenario in ('A', 'B')),
  query_eojeol   text not null,        -- raw eojeol before the space (e.g. "여행을")
  query_word     text not null,        -- 조사-stripped stem that was embedded (e.g. "여행")
  suggested_word text not null,        -- top-1 match shown above the input
  similarity     float8 not null,      -- cosine similarity of the top-1 match
  created_at     timestamptz not null default now()
);

create index if not exists experiment_suggestions_user_idx
  on public.experiment_suggestions (user_id, trial_index);

alter table public.experiment_suggestions enable row level security;

drop policy if exists "own suggestions" on public.experiment_suggestions;
create policy "own suggestions" on public.experiment_suggestions
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
