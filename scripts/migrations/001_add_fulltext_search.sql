-- Migration: Add full-text search support to documents and document_chunks
-- Run this after deploying the schema changes via Drizzle push/generate

-- Add tsvector columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS chunk_search_vector tsvector;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_chunks_search ON document_chunks USING GIN (chunk_search_vector);

-- Populate tsvector from existing data
UPDATE documents
SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(extracted_text, '') || ' ' || coalesce(tags, ''))
WHERE search_vector IS NULL;

UPDATE document_chunks
SET chunk_search_vector = to_tsvector('english', text)
WHERE chunk_search_vector IS NULL;

-- Create trigger to auto-update documents.search_vector on insert/update
CREATE OR REPLACE FUNCTION documents_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.extracted_text, '') || ' ' || coalesce(NEW.tags, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;
CREATE TRIGGER trg_documents_search_vector
  BEFORE INSERT OR UPDATE OF title, extracted_text, tags ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_trigger();

-- Create trigger to auto-update document_chunks.chunk_search_vector on insert/update
CREATE OR REPLACE FUNCTION chunks_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.chunk_search_vector := to_tsvector('english', NEW.text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chunks_search_vector ON document_chunks;
CREATE TRIGGER trg_chunks_search_vector
  BEFORE INSERT OR UPDATE OF text ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION chunks_search_vector_trigger();

-- Add human_reviews table
CREATE TABLE IF NOT EXISTS human_reviews (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id INTEGER NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  assigned_to_user_id VARCHAR,
  review_data JSONB NOT NULL,
  decision VARCHAR(20),
  feedback TEXT,
  modified_data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_human_review_org ON human_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_human_review_exec ON human_reviews(execution_id);
CREATE INDEX IF NOT EXISTS idx_human_review_assignee ON human_reviews(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_human_review_status ON human_reviews(status);
