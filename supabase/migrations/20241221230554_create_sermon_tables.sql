-- Reset everything first
DROP FUNCTION IF EXISTS match_documents;
DROP FUNCTION IF EXISTS get_topic_overview;
DROP TABLE IF EXISTS sermon_chunks cascade;
DROP TABLE IF EXISTS sermon_processing cascade;
DROP TABLE IF EXISTS sermons cascade;

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create sermon table with metadata fields
CREATE TABLE sermons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core metadata
    title TEXT NOT NULL,
    date DATE,
    series TEXT,
    primary_scripture TEXT,
    scriptures TEXT[],  -- Array of scripture references
    sermon_type TEXT CHECK (sermon_type IN ('expository', 'textual', 'topical', 'narrative')),
    confidence_scores JSONB,  -- Confidence scores for metadata extraction
    
    -- Content classification
    topics TEXT[],  -- Array of topics covered
    tags TEXT[],    -- Array of tags
    
    -- Rich content
    summary TEXT,   -- Brief summary of the sermon
    key_points TEXT[],  -- Key points or outline
    illustrations TEXT[],  -- Array of illustrations used
    
    -- File info
    file_path TEXT,  -- Path to the sermon file
    file_type TEXT,  -- Type of the sermon file (e.g., PDF, Word)
    file_name TEXT,  -- Name of the file
    file_size INTEGER,  -- Size of the file in bytes
    file_pages INTEGER,  -- Number of pages in the file (if applicable)
    
    -- New metadata fields
    themes TEXT[],  -- Array of sermon themes
    calls_to_action TEXT[],  -- Array of calls to action
    personal_stories TEXT[],  -- Array of personal stories or anecdotes
    tone TEXT,  -- Emotional tone of the sermon (e.g., hopeful, reflective)
    mentioned_people TEXT[],  -- Array of people mentioned
    mentioned_events TEXT[],  -- Array of events referenced
    word_count INTEGER,  -- Total word count of the sermon
    keywords TEXT[],  -- Array of frequently used keywords
    
    -- Preacher and location metadata
    preacher TEXT,  
    location TEXT, 
    
    -- Processing reference
    processing_id UUID,  -- Reference to the processing record
    
    -- Auditing timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User association
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create chunks table for embeddings with CASCADE DELETE
CREATE TABLE sermon_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_type TEXT CHECK (chunk_type IN ('content', 'illustration', 'scripture_exposition')),
    embedding VECTOR(1536),
    chunk_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create processing table with CASCADE DELETE
CREATE TABLE sermon_processing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('uploaded', 'parsed', 'vectorized', 'completed', 'error')),
    sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE,
    
    -- File information
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    file_path TEXT,
    
    -- Content
    text TEXT,                    -- Extracted text from PDF
    error_message TEXT,           -- Store any error messages
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Add RLS policies
ALTER TABLE sermon_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_chunks ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert their own processing records" ON sermon_processing;
DROP POLICY IF EXISTS "Users can view their own processing records" ON sermon_processing;
DROP POLICY IF EXISTS "Users can update their own processing records" ON sermon_processing;

DROP POLICY IF EXISTS "Users can insert their own sermons" ON sermons;
DROP POLICY IF EXISTS "Users can view their own sermons" ON sermons;
DROP POLICY IF EXISTS "Users can update their own sermons" ON sermons;
DROP POLICY IF EXISTS "Users can delete their own sermons" ON sermons;

DROP POLICY IF EXISTS "Users can insert their own sermon chunks" ON sermon_chunks;
DROP POLICY IF EXISTS "Users can view their own sermon chunks" ON sermon_chunks;

DROP POLICY IF EXISTS "Authenticated users can upload sermons" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own sermons" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own sermons" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sermons" ON storage.objects;

-- Recreate all policies
-- Processing table policies
CREATE POLICY "Users can insert their own processing records"
    ON sermon_processing FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own processing records"
    ON sermon_processing FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing records"
    ON sermon_processing FOR UPDATE
    USING (auth.uid() = user_id);

-- Sermons table policies
CREATE POLICY "Users can insert their own sermons"
    ON sermons FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sermons"
    ON sermons FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sermons"
    ON sermons FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sermons"
    ON sermons FOR DELETE
    USING (auth.uid() = user_id);

-- Sermon chunks policies
CREATE POLICY "Users can insert their own sermon chunks"
    ON sermon_chunks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sermons
            WHERE id = sermon_chunks.sermon_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own sermon chunks"
    ON sermon_chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sermons
            WHERE id = sermon_chunks.sermon_id
            AND user_id = auth.uid()
        )
    );

-- Storage policies
-- Create indexes
CREATE INDEX idx_sermon_processing_user_id ON sermon_processing(user_id);
CREATE INDEX idx_sermon_processing_status ON sermon_processing(status);
CREATE INDEX idx_sermons_user_id ON sermons(user_id);
CREATE INDEX idx_sermons_topics ON sermons USING GIN(topics);
CREATE INDEX idx_sermons_tags ON sermons USING GIN(tags);
CREATE INDEX idx_sermon_chunks_sermon_id ON sermon_chunks(sermon_id);
CREATE INDEX idx_sermon_chunks_embedding ON sermon_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sermon_processing_updated_at
    BEFORE UPDATE ON sermon_processing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sermons_updated_at
    BEFORE UPDATE ON sermons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to match documents using embeddings
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT,
    p_user_id UUID
)
RETURNS TABLE (
    sermon_id UUID,
    content TEXT,
    similarity FLOAT,
    title TEXT,
    date DATE,
    preacher TEXT,
    location TEXT,
    scripture TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as sermon_id,
        sc.content,
        1 - (sc.embedding <=> query_embedding) as similarity,
        s.title,
        s.date,
        s.preacher,
        s.location,
        s.primary_scripture as scripture
    FROM sermon_chunks sc
    JOIN sermons s ON s.id = sc.sermon_id
    WHERE 1 - (sc.embedding <=> query_embedding) > match_threshold
    AND s.user_id = p_user_id
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Create storage bucket and policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sermons', 'sermons', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create simpler storage policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sermons');

CREATE POLICY "Allow authenticated reads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'sermons');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sermons');