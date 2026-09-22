-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Document embeddings table for RAG retrieval
CREATE TABLE document_embeddings (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    college_id  TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id   TEXT,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(384) NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embeddings_college ON document_embeddings(college_id);
CREATE INDEX idx_embeddings_source ON document_embeddings(source_type, source_id);
CREATE INDEX idx_embeddings_vector ON document_embeddings
    USING hnsw (embedding vector_cosine_ops);

-- AI chat message history
CREATE TABLE ai_chat_messages (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id     TEXT NOT NULL,
    college_id     TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role           TEXT NOT NULL,
    content        TEXT NOT NULL,
    sources        JSONB DEFAULT '[]',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_session ON ai_chat_messages(session_id, created_at);
CREATE INDEX idx_chat_user ON ai_chat_messages(user_id, created_at);
