CREATE INDEX IF NOT EXISTS chunk_embeddings_cosine_idx
    ON chunk_embeddings
    USING hnsw (embedding vector_cosine_ops);

COMMENT ON INDEX chunk_embeddings_cosine_idx IS 'Hybrid search cosine lookups. document_chunks.embedding stays unused.';
