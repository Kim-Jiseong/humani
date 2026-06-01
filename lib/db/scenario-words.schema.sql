-- Per-scenario reference vocabulary with embeddings (gemini-embedding-001, 768-dim).
-- Shared READ-ONLY reference data (not user-owned). Seeded once via
-- scripts/seed-scenario-words.ts using the service-role key.
-- Apply AFTER pgvector.schema.sql. Additive + idempotent.
-- NOTE: pgvector lives in the `extensions` schema, so the vector type and the
-- cosine opclass are fully qualified (the RPC pins search_path='').

create table if not exists public.scenario_words (
  id         bigint generated always as identity primary key,
  scenario   text not null check (scenario in ('A', 'B')),
  category   text not null,
  word       text not null,
  embedding  extensions.vector(768) not null,
  created_at timestamptz not null default now(),
  unique (scenario, word)                       -- idempotent seed key; dedupes repeats
);

-- HNSW cosine index (matches the `<=>` operator used by match_scenario_words).
create index if not exists scenario_words_embedding_hnsw
  on public.scenario_words
  using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists scenario_words_scenario_idx
  on public.scenario_words (scenario);

-- RLS: any authenticated participant may READ; no write policy (the seed runs as
-- service_role, which bypasses RLS), so participants can never mutate the set.
alter table public.scenario_words enable row level security;

drop policy if exists "read scenario words" on public.scenario_words;
create policy "read scenario words" on public.scenario_words
  for select
  to authenticated
  using (true);

-- Similarity-search RPC. Runs the scenario filter + threshold gate + top-N
-- server-side so we never ship vectors to the client. SECURITY DEFINER +
-- search_path='' hygiene mirrors public.assign_experiment_group; everything is
-- fully schema-qualified so it is injection-safe.
create or replace function public.match_scenario_words(
  p_scenario        text,
  p_query_embedding extensions.vector(768),
  p_threshold       float8,
  p_match_count     int
)
returns table (word text, category text, similarity float8)
language sql
stable
security definer
set search_path = ''
as $$
  -- search_path='' so the pgvector `<=>` operator (in the extensions schema)
  -- must be schema-qualified via OPERATOR(extensions.<=>).
  select
    sw.word,
    sw.category,
    1 - (sw.embedding operator(extensions.<=>) p_query_embedding) as similarity
  from public.scenario_words sw
  where sw.scenario = p_scenario
    and 1 - (sw.embedding operator(extensions.<=>) p_query_embedding) >= p_threshold
  order by sw.embedding operator(extensions.<=>) p_query_embedding   -- ascending distance = best first
  limit p_match_count;
$$;

revoke all on function public.match_scenario_words(text, extensions.vector, float8, int) from public;
grant execute on function public.match_scenario_words(text, extensions.vector, float8, int) to authenticated;
