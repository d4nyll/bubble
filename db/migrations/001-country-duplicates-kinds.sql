-- Adds what the country map, duplicate merging and good-news kinds need.
CREATE TABLE good_kinds (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    description TEXT NOT NULL,
    position    INTEGER NOT NULL
);
ALTER TABLE articles ADD COLUMN source_country TEXT;
ALTER TABLE articles ADD COLUMN duplicate_of INTEGER REFERENCES articles(id);
ALTER TABLE articles ADD COLUMN good_kind TEXT REFERENCES good_kinds(id);
ALTER TABLE articles ADD COLUMN news_score REAL CHECK (news_score BETWEEN 0 AND 1);
