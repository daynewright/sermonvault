-- Add new columns to the documents table
ALTER TABLE documents 
ADD COLUMN title TEXT,
ADD COLUMN sermon_date DATE,
ADD COLUMN preacher TEXT,
ADD COLUMN location TEXT,
ADD COLUMN metadata_confidence JSONB;

-- Drop the existing function first
DROP FUNCTION IF EXISTS match_documents;

-- Create updated function with new columns
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float,
  title text,
  sermon_date date,
  preacher text,
  location text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity,
    documents.title,
    documents.sermon_date,
    documents.preacher,
    documents.location
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  AND user_id = p_user_id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;