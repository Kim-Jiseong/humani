-- One row per typing "멈칫" (pause) detected after the first keystroke, in ANY
-- chat (free chat + both experiment conditions). 멈칫 count = row count; each row
-- carries its own duration. Apply anytime (additive). User-owned; RLS mirrors the
-- other experiment tables.
--
-- Each row makes three facts explicit for analysis:
--   1. WHO        -> user_id
--   2. WHICH      -> scenario (null in free chat)
--   3. WORD-SHOWN -> suggest_active (true only in the related condition, where the
--                    word cloud is displayed). Whether words were ACTUALLY captured
--                    for this pause is suggested_words IS NOT NULL (fetch completed
--                    before the pause ended, i.e. before the next keystroke).
--
-- duration_ms is measured from the 300ms idle threshold to the resume (next input
-- or submit) — i.e. the full silence minus the 300ms detection window.

create table if not exists public.chat_pause_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  chat_id         uuid not null references public.chats(id) on delete cascade,
  trial_index     smallint check (trial_index in (1, 2)),          -- null: free chat
  scenario        text     check (scenario in ('A', 'B')),         -- null: free chat
  condition       text     check (condition in ('baseline', 'related')), -- null: free chat
  suggest_active  boolean  not null,        -- word cloud shown? related=true, baseline/free=false
  seq             smallint not null,        -- order of this pause within the message (1-based)
  duration_ms     integer  not null check (duration_ms >= 0), -- 300ms threshold -> resume
  query_eojeol    text,                     -- the eojeol being typed at the pause
  suggested_words text[],                   -- words shown if the fetch resolved before resume; else null
  created_at      timestamptz not null default now()
);

create index if not exists chat_pause_events_chat_idx
  on public.chat_pause_events (chat_id);
create index if not exists chat_pause_events_user_trial_idx
  on public.chat_pause_events (user_id, trial_index);

alter table public.chat_pause_events enable row level security;

drop policy if exists "own pause events" on public.chat_pause_events;
create policy "own pause events" on public.chat_pause_events
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
