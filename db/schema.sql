-- The interface between ingest (Daniel) and web (Vat).
-- ingest writes `articles`; web only reads. Change this file together.

PRAGMA foreign_keys = ON;

-- Our standard categories, condensed from the 17 IPTC Media Topics
-- (https://cv.iptc.org/newscodes/mediatopic/). `description` is what the
-- classifier sees, `label` is what the frontend shows.
CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    description TEXT NOT NULL,
    position    INTEGER NOT NULL  -- display order
);

INSERT OR REPLACE INTO categories (id, label, description, position) VALUES
    ('world',       'World',               'International affairs, diplomacy, peace deals and events in other countries', 1),
    ('politics',    'Politics',            'Government, elections, parliament and public policy', 2),
    ('business',    'Business & Economy',  'Companies, markets, jobs, work and the economy', 3),
    ('science',     'Science',             'Scientific research, discoveries, space and nature', 4),
    ('technology',  'Technology',          'Computing, the internet, gadgets, AI and engineering', 5),
    ('health',      'Health',              'Medicine, healthcare, wellbeing and disease', 6),
    ('environment', 'Environment',         'Climate, wildlife, conservation, energy and weather', 7),
    ('sport',       'Sport',               'Sports, matches, athletes and competitions', 8),
    ('culture',     'Arts & Culture',      'Film, music, books, art, media, entertainment and religion', 9),
    ('people',      'People & Community',  'Human interest, community, education, lifestyle and acts of kindness', 10);

CREATE TABLE IF NOT EXISTS articles (
    id              INTEGER PRIMARY KEY,
    url             TEXT NOT NULL UNIQUE,    -- canonical link, dedup key
    source          TEXT NOT NULL,           -- outlet name, e.g. 'BBC', 'Guardian'
    source_category TEXT,                    -- the outlet's own section, kept for debugging
    title           TEXT NOT NULL,
    summary         TEXT,                    -- plain text, no HTML
    image_url       TEXT,
    published_at    TEXT,                    -- ISO 8601 UTC, e.g. '2026-10-24T09:22:07Z'
    fetched_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    category        TEXT NOT NULL REFERENCES categories(id),
    good_score      REAL NOT NULL CHECK (good_score BETWEEN 0 AND 1)  -- classifier's P(good news)
);

CREATE INDEX IF NOT EXISTS articles_feed ON articles (category, published_at DESC);
