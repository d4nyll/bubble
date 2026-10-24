-- The interface between ingest (Daniel) and web (Vat).
-- ingest writes `articles`; web only reads. Change this file together.
-- This file is the full, current schema, and it creates a new database from scratch.
-- An existing database is brought up to date by the files in migrations/ (see README.md).

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;  -- lets the ingest, classify and API processes share the file
PRAGMA busy_timeout = 5000; -- wait up to 5 s for another process's write instead of failing

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

-- The kinds of good news, for filtering. The classifier picks one per good article from
-- `description`, and the frontend shows `label`. 'kindness' is the mildest kind.
CREATE TABLE IF NOT EXISTS good_kinds (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    description TEXT NOT NULL,
    position    INTEGER NOT NULL  -- display order
);

INSERT OR REPLACE INTO good_kinds (id, label, description, position) VALUES
    ('breakthrough', 'Breakthroughs',      'A scientific, medical or technological advance', 1),
    ('nature',       'Nature recovering',  'Wildlife, ecosystems or the climate getting better', 2),
    ('systems',      'Better systems',     'A law, policy, institution or community fixing a problem at its root', 3),
    ('peace',        'Peace & rights',     'A conflict ending, rights won or justice done', 4),
    ('inspiring',    'Inspiring people',   'A person whose example inspires others to do good', 5),
    ('kindness',     'Kindness',           'A small act of kindness or community spirit', 6);

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
    -- ISO 3166-1 alpha-2 code of the outlet's home country, e.g. 'NG', set from feeds.ts.
    -- NULL for international outlets, journals and Reddit.
    source_country  TEXT,
    -- The first article stored for the same story, when this one repeats it. NULL when this
    -- article is the first (or only) one, which is the one to show.
    duplicate_of    INTEGER REFERENCES articles(id),
    -- All four NULL until the classifier has processed the article.
    category        TEXT REFERENCES categories(id),
    good_score      REAL CHECK (good_score BETWEEN 0 AND 1),  -- classifier's P(good news)
    good_kind       TEXT REFERENCES good_kinds(id),           -- which kind of good news it is
    news_score      REAL CHECK (news_score BETWEEN 0 AND 1)   -- P(it's a news report, not a podcast,
                                                              -- horoscope, live blog or round-up)
);

CREATE INDEX IF NOT EXISTS articles_feed ON articles (category, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_country ON articles (source_country);
CREATE INDEX IF NOT EXISTS articles_duplicate ON articles (duplicate_of);
