-- Create a table for storing documents and their embeddings
create table documents (
  id bigint primary key generated always as identity,
  content text not null,
  metadata jsonb,
  embedding vector(1536),
  user_id uuid not null references auth.users(id) on delete cascade,  -- Changed from text to uuid
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to search documents by similarity
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid    -- Changed from text to uuid
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where user_id = p_user_id
  and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- Create an index for faster similarity searches
create index on documents
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Enable Row Level Security (RLS)
alter table documents enable row level security;

-- Create a policy that only allows users to see their own documents
create policy "Users can only see their own documents"
  on documents for all
  using (auth.uid() = user_id);