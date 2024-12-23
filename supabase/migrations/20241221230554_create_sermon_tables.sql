-- Reset everything first
DROP FUNCTION IF EXISTS match_documents;
DROP FUNCTION IF EXISTS get_topic_overview;
DROP TABLE IF EXISTS sermon_chunks;
DROP TABLE IF EXISTS sermons;

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
    engagement_tags TEXT[],  -- Array of audience engagement prompts
    word_count INTEGER,  -- Total word count of the sermon
    keywords TEXT[],  -- Array of frequently used keywords
    
    -- Preacher and location metadata
    preacher TEXT,  
    location TEXT, 
    
    -- Auditing timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User association (if applicable)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create chunks table for embeddings
CREATE TABLE sermon_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_type TEXT CHECK (chunk_type IN ('content', 'illustration', 'scripture_exposition')),
    embedding VECTOR(1536),
    chunk_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Create indexes
CREATE INDEX idx_sermons_user_id ON sermons(user_id);
CREATE INDEX idx_sermons_topics ON sermons USING GIN(topics);
CREATE INDEX idx_sermons_tags ON sermons USING GIN(tags);
CREATE INDEX idx_sermon_chunks_sermon_id ON sermon_chunks(sermon_id);
CREATE INDEX idx_sermon_chunks_embedding ON sermon_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create storage bucket and policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sermons', 'sermons', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Authenticated users can upload sermons" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'sermons' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view their own sermons" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'sermons' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own sermons" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'sermons' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own sermons" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'sermons' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );