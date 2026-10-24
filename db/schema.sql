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
    credibility_score REAL CHECK (credibility_score BETWEEN 0 AND 1),  -- P(it's a credible, factual news
                                                              -- report, not clickbait, rumour, opinion, a podcast...)
    -- all-MiniLM-L6-v2 vector of title and summary: 384 float32s. NULL until ingest/embedder.ts has
    -- processed the article, which also sets duplicate_of and the article's topics.
    embedding       BLOB
);

CREATE INDEX IF NOT EXISTS articles_feed ON articles (category, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_country ON articles (source_country);
CREATE INDEX IF NOT EXISTS articles_duplicate ON articles (duplicate_of);

-- Tags that cut across categories: an AI story filed under Science can be tagged 'ai' and
-- 'biochemistry'. An article has 0 to 3. `description` is what ingest/embedder.ts compares an article
-- with, `label` is what the frontend shows. To add a topic, add a row here.
CREATE TABLE IF NOT EXISTS topics (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    description TEXT NOT NULL
);

INSERT OR REPLACE INTO topics (id, label, description) VALUES
    ('ai', 'AI', 'artificial intelligence, machine learning, chatbots and AI models'),
    ('space', 'Space', 'space exploration, astronomy, planets, rockets and satellites'),
    ('climate', 'Climate', 'climate change, global warming, emissions and net zero'),
    ('renewable-energy', 'Renewable energy', 'solar power, wind power, batteries and clean energy'),
    ('conservation', 'Conservation', 'protecting endangered species and habitats, wildlife conservation'),
    ('wildlife', 'Wildlife', 'wild animals, birds, insects and marine life'),
    ('oceans', 'Oceans', 'oceans, seas, coral reefs, whales and fisheries'),
    ('forests', 'Trees & forests', 'trees, forests, deforestation and reforestation'),
    ('pollution', 'Pollution', 'air pollution, plastic waste, water contamination and toxic chemicals'),
    ('farming', 'Farming & food', 'agriculture, farmers, crops, food production and food security'),
    ('water', 'Water', 'drinking water, sanitation, drought and floods'),
    ('weather', 'Weather', 'storms, typhoons, hurricanes, heatwaves and extreme weather'),
    ('disasters', 'Disasters', 'earthquakes, building collapses, accidents and emergency rescues'),
    ('medicine', 'Medicine', 'new drugs, treatments, clinical trials and doctors'),
    ('vaccines', 'Vaccines', 'vaccines, vaccination and immunisation programmes'),
    ('cancer', 'Cancer', 'cancer, tumours, chemotherapy and cancer research'),
    ('infectious-disease', 'Infectious disease', 'outbreaks, epidemics, Ebola, malaria, HIV and viruses'),
    ('mental-health', 'Mental health', 'mental health, depression, anxiety and wellbeing'),
    ('public-health', 'Public health', 'healthcare systems, hospitals, health policy and life expectancy'),
    ('genetics', 'Genetics', 'genes, DNA, genome editing and heredity'),
    ('neuroscience', 'Neuroscience', 'the brain, neurons, dementia and Alzheimer''s'),
    ('biochemistry', 'Biochemistry', 'proteins, enzymes, molecules and cell biology'),
    ('physics', 'Physics', 'physics, particles, quantum mechanics and materials'),
    ('archaeology', 'Archaeology', 'archaeology, ancient history, fossils and excavations'),
    ('computing', 'Computing', 'software, computers, the internet, smartphones and cybersecurity'),
    ('transport', 'Transport', 'trains, cars, electric vehicles, aviation and public transport'),
    ('cities', 'Cities', 'cities, urban planning, parks and infrastructure'),
    ('housing', 'Housing', 'housing, rent, homelessness and affordable homes'),
    ('poverty', 'Poverty', 'poverty, inequality, food banks and cost of living'),
    ('jobs', 'Jobs & work', 'jobs, employment, wages, workers and unions'),
    ('economy', 'Economy', 'economic growth, inflation, markets, trade and investment'),
    ('education', 'Education', 'schools, teachers, students, universities and learning'),
    ('children', 'Children', 'children, young people, babies and families'),
    ('older-people', 'Older people', 'elderly people, pensioners, retirement and ageing'),
    ('women', 'Women', 'women''s rights, gender equality and maternal health'),
    ('human-rights', 'Human rights', 'human rights, civil liberties, freedom of speech and justice'),
    ('refugees', 'Refugees & migration', 'refugees, migrants, asylum and immigration'),
    ('disability', 'Disability', 'disabled people, accessibility and disability rights'),
    ('peace', 'Peace & conflict', 'war, ceasefires, peace talks, armed conflict and the military'),
    ('elections', 'Elections', 'elections, voting, candidates and political parties'),
    ('law', 'Law & courts', 'courts, judges, trials, laws and legislation'),
    ('crime', 'Crime', 'crime, police, arrests, violence and prisons'),
    ('charity', 'Charity & volunteering', 'charities, donations, fundraising and volunteers'),
    ('community', 'Community', 'local communities, neighbours helping each other and community projects'),
    ('sport', 'Sport', 'football, athletes, matches, tournaments and the Olympics'),
    ('arts', 'Arts', 'art, museums, theatre, film and music'),
    ('books', 'Books', 'books, authors, literature and libraries'),
    ('religion', 'Religion', 'religion, faith, churches, mosques and temples'),
    ('travel', 'Travel', 'tourism, travel, visas and holidays'),
    ('business', 'Business', 'companies, start-ups, profits and products');

CREATE TABLE IF NOT EXISTS article_topics (
    article_id  INTEGER NOT NULL REFERENCES articles(id),
    topic_id    TEXT NOT NULL REFERENCES topics(id),
    score       REAL NOT NULL,  -- similarity between the article and the topic, higher is closer
    PRIMARY KEY (article_id, topic_id)
);

CREATE INDEX IF NOT EXISTS article_topics_topic ON article_topics (topic_id);
