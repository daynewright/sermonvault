-- 1. Create storage bucket for sermons if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('sermons', 'sermons', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Update the documents table to include file information
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- 3. Storage policies for secure access
CREATE POLICY "Users can upload their own sermons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sermons' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own sermons"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'sermons' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own sermons"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sermons' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Drop existing function first
DROP FUNCTION IF EXISTS match_documents(vector(1536), float, int, uuid);

-- 5. Create updated match_documents function
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
  location text,
  file_path text,
  file_name text
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
    documents.location,
    documents.file_path,
    documents.file_name
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  AND user_id = p_user_id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;