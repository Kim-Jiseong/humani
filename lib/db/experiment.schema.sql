-- Experiment tables for the ergonomics study (참가자 설문 + 2회 trial + 사후 설문).
-- Apply via Supabase SQL editor or `mcp apply_migration` (name: experiment_tables).
-- This file is ADDITIVE and idempotent — it never touches public.chats / public.messages.
-- Do NOT re-run lib/db/schema.sql (its head DROPs the messages table).

-- Global assignment counter. Drives 4k+n group balancing; allocation is atomic
-- under concurrent inserts, so simultaneous first-time participants get distinct seq.
create sequence if not exists public.experiment_participant_seq;

-- One row per participant. seq/group_type are assigned server-side by the trigger
-- below, so the client never supplies them and no cross-row read is needed (RLS-safe).
create table if not exists public.experiment_participants (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  seq            bigint not null,
  group_type     smallint not null,                              -- ((seq-1) % 4) + 1  → 1..4
  age            smallint not null check (age between 1 and 120),
  gender         text not null check (gender in ('male','female')),
  llm_frequency  text not null check (llm_frequency in ('low','mid','high')),
  current_step   text not null default 'survey',                 -- state-machine pointer
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create unique index if not exists experiment_participants_seq_idx
  on public.experiment_participants (seq);

-- BEFORE INSERT: the trigger itself pulls from the sequence and computes group_type,
-- so we never depend on identity-vs-trigger evaluation order.
-- SECURITY DEFINER + an explicit grant guarantee nextval() works for the
-- `authenticated` role regardless of project default privileges. search_path is
-- pinned empty (everything below is fully qualified) per SECURITY DEFINER hygiene.
create or replace function public.assign_experiment_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.seq is null or new.seq = 0 then
    new.seq := nextval('public.experiment_participant_seq');
  end if;
  new.group_type := ((new.seq - 1) % 4) + 1;
  return new;
end;
$$;

grant usage on sequence public.experiment_participant_seq to authenticated;

drop trigger if exists trg_assign_experiment_group on public.experiment_participants;
create trigger trg_assign_experiment_group
  before insert on public.experiment_participants
  for each row execute function public.assign_experiment_group();

-- One row per (participant, trial). scenario/condition are derived from group_type
-- at creation time and frozen here, so the chat page is a pure read.
create table if not exists public.experiment_trials (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  trial_index  smallint not null check (trial_index in (1, 2)),
  scenario     text not null check (scenario in ('A', 'B')),
  condition    text not null check (condition in ('baseline', 'related')),
  chat_id      uuid references public.chats(id) on delete set null,
  created_at   timestamptz not null default now(),
  submitted_at timestamptz,                                      -- set when the 1 chat turn completes
  unique (user_id, trial_index)
);

create index if not exists experiment_trials_user_idx
  on public.experiment_trials (user_id, trial_index);

-- Post-trial survey responses. Shape is a placeholder (answers jsonb) until the
-- real questionnaire is designed.
create table if not exists public.experiment_survey_responses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  trial_index  smallint check (trial_index in (1, 2)),          -- null = end-of-study survey
  answers      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists experiment_survey_user_idx
  on public.experiment_survey_responses (user_id);

-- RLS — mirrors the existing "own chats" / "own messages" policies.
alter table public.experiment_participants      enable row level security;
alter table public.experiment_trials            enable row level security;
alter table public.experiment_survey_responses  enable row level security;

drop policy if exists "own participant" on public.experiment_participants;
drop policy if exists "own trials"      on public.experiment_trials;
drop policy if exists "own survey"      on public.experiment_survey_responses;

create policy "own participant" on public.experiment_participants
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own trials" on public.experiment_trials
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own survey" on public.experiment_survey_responses
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
