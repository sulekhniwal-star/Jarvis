-- Migration: 20261116000001_match_memories_rpc.sql
-- Function to perform cosine similarity search over public.memories using pgvector

CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
  filter_project_id uuid DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  project_id uuid,
  category text,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.project_id,
    m.category,
    m.content,
    m.metadata,
    (1 - (m.embedding <=> query_embedding))::float AS similarity,
    m.created_at,
    m.updated_at
  FROM public.memories m
  WHERE (filter_user_id IS NULL OR m.user_id = filter_user_id)
    AND (filter_project_id IS NULL OR m.project_id = filter_project_id OR m.project_id IS NULL)
    AND (filter_category IS NULL OR m.category = filter_category)
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> query_embedding)) >= match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
