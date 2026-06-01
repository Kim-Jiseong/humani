-- Enable pgvector (vector type + HNSW index + distance operators).
-- Available in this project as 0.8.0 but not yet installed.
-- Supabase convention: install into the dedicated `extensions` schema.
-- Apply in the Supabase SQL editor FIRST (before scenario-words.schema.sql). Idempotent.
create extension if not exists vector with schema extensions;

-- Verify where it landed (the RPC/index below qualify the type as extensions.vector):
--   select extnamespace::regnamespace from pg_extension where extname = 'vector';
