-- Renames news_score to credibility_score, and adds topics and article embeddings.
ALTER TABLE articles RENAME COLUMN news_score TO credibility_score;
ALTER TABLE articles ADD COLUMN embedding BLOB;
CREATE TABLE topics (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    description TEXT NOT NULL
);
CREATE TABLE article_topics (
    article_id  INTEGER NOT NULL REFERENCES articles(id),
    topic_id    TEXT NOT NULL REFERENCES topics(id),
    score       REAL NOT NULL,
    PRIMARY KEY (article_id, topic_id)
);
