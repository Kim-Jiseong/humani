-- Run this in Supabase SQL Editor.
-- WARNING: This DROPs the existing messages table (data loss).
-- Existing `chats` rows are kept; only message contents are wiped.

drop table if exists public.messages cascade;

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_updated_idx
  on public.chats (user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  client_id text not null,                              -- UIMessage.id from AI SDK; used for upsert
  position integer not null,                            -- chat-local monotonic index; canonical order
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null,                                 -- full UIMessage.parts
  created_at timestamptz not null default now(),
  unique (chat_id, client_id)                           -- composite key for upsert conflict
);

create index messages_chat_pos_idx
  on public.messages (chat_id, position);

alter table public.chats    enable row level security;
alter table public.messages enable row level security;

drop policy if exists "own chats"    on public.chats;
drop policy if exists "own messages" on public.messages;

create policy "own chats" on public.chats
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own messages" on public.messages
  for all
  using (
    exists (select 1 from public.chats c
            where c.id = messages.chat_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.chats c
            where c.id = messages.chat_id and c.user_id = auth.uid())
  );
