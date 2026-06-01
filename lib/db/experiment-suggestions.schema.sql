-- One row per shown suggestion in 연관(related) trials. Ties to post-trial
-- survey Q7/Q8 (did the participant notice / use the presented words).
-- User-owned; RLS mirrors the other experiment tables. Apply anytime (additive).
-- Logs HITS only (>=1 word shown). Each row stores the presented word set as
-- parallel arrays (suggested_words / similarities). To analyze the "no
-- suggestion" denominator later, log empty-result events too.

create table if not exists public.experiment_suggestions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  trial_index    smallint not null check (trial_index in (1, 2)),
  scenario       text not null check (scenario in ('A', 'B')),
  query_eojeol    text not null,       -- raw eojeol before the space (e.g. "여행을")
  query_word      text not null,       -- 조사-stripped stem that was embedded (e.g. "여행")
  suggested_words text[] not null,     -- words shown above the input (top-6, query word excluded), rank order
  similarities    float8[] not null,   -- parallel cosine similarities (same order as suggested_words)
  created_at      timestamptz not null default now()
);

create index if not exists experiment_suggestions_user_idx
  on public.experiment_suggestions (user_id, trial_index);

alter table public.experiment_suggestions enable row level security;

drop policy if exists "own suggestions" on public.experiment_suggestions;
create policy "own suggestions" on public.experiment_suggestions
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
