-- Migration: Switch from OpenAI ada-002 embeddings to local all-MiniLM-L6-v2 (384 dimensions)
-- Old embeddings are incompatible with the new model and must be cleared.

-- Drop the old index
DROP INDEX IF EXISTS idx_faq_chunks_embedding;

-- Clear all existing embeddings (they're from a different model/dimension space)
UPDATE "faq_chunks" SET "embedding" = NULL;

-- Change the vector column dimension from 153/1536 to 384
ALTER TABLE "faq_chunks" ALTER COLUMN "embedding" TYPE vector(768);

-- Recreate the cosine similarity index
CREATE INDEX IF NOT EXISTS idx_faq_chunks_embedding ON "faq_chunks" USING ivfflat (embedding vector_cosine_ops);
