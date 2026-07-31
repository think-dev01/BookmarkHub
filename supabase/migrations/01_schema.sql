-- BookmarkAI Hub v1.1 - Database Schema
-- Run this script inside Supabase SQL Editor

-- 1. Enable Vector Extension for Semantic Search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table: Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table: Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    user_note TEXT,
    audio_transcript TEXT, -- Speech-To-Text from Groq Whisper API
    processing_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'processing' | 'done' | 'failed'
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tags TEXT[],
    source_platform VARCHAR(30), -- 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'other'
    ai_raw_response JSONB,
    embedding VECTOR(768), -- Gemini text-embedding-004 vector length (768)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_bookmarks_status ON bookmarks(processing_status);

-- Full Text Search Index (English + Indonesian text support)
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(user_note, '') || ' ' || coalesce(audio_transcript, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_bookmarks_fts ON bookmarks USING GIN(fts);

-- 5. RPC Function for Semantic Vector Similarity Search
CREATE OR REPLACE FUNCTION match_bookmarks (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  summary TEXT,
  user_note TEXT,
  audio_transcript TEXT,
  processing_status VARCHAR(20),
  category_id UUID,
  tags TEXT[],
  source_platform VARCHAR(30),
  created_at TIMESTAMP WITH TIME ZONE,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.url,
    b.title,
    b.summary,
    b.user_note,
    b.audio_transcript,
    b.processing_status,
    b.category_id,
    b.tags,
    b.source_platform,
    b.created_at,
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM bookmarks b
  WHERE 1 - (b.embedding <=> query_embedding) > match_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
