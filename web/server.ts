// API over the shared DB. Run: npm run api (listens on :3001)
import { createServer, type ServerResponse } from 'node:http';
import { connect } from '../db/db.ts';

const DEFAULT_MIN_SCORE = 0.8;
// Below 0.4 are mostly horoscopes, quizzes, podcasts, adverts and miracle claims. In a sample of
// 300 real articles, none scored below 0.4. Articles not yet scored for credibility are shown.
const MIN_CREDIBILITY = 0.4;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const db = connect();

// The mood dial's min_score, or the default. NaN when the value isn't a number from 0 to 1.
function minScoreOf(url: URL): number {
  const value = Number(url.searchParams.get('min_score') ?? DEFAULT_MIN_SCORE);
  return value >= 0 && value <= 1 ? value : NaN;
}

function badRequest(res: ServerResponse, error: string) {
  res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error }));
}

createServer((req, res) => {
  const url = new URL(req.url!, 'http://localhost');

  if (url.pathname === '/api/categories') {
    const categories = db.prepare('SELECT * FROM categories ORDER BY position').all();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(categories));
    return;
  }

  if (url.pathname === '/api/topics') {
    const topics = db.prepare('SELECT id, label FROM topics ORDER BY label').all();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(topics));
    return;
  }

  if (url.pathname === '/api/article-filters') {
    const category = url.searchParams.get('category');
    const minScore = minScoreOf(url);
    if (!category || Number.isNaN(minScore)) {
      badRequest(res, 'category is required, and min_score must be 0-1');
      return;
    }

    const goodKinds = db.prepare('SELECT * FROM good_kinds ORDER BY position').all();
    const countries = db.prepare(`
      SELECT DISTINCT source_country
      FROM articles
      WHERE category = :category
        AND good_score >= :min_score
        AND source_country IS NOT NULL
        AND duplicate_of IS NULL
        AND coalesce(credibility_score, 1) >= :min_credibility
      ORDER BY source_country`).all({
      category,
      min_score: minScore,
      min_credibility: MIN_CREDIBILITY,
    }) as { source_country: string }[];
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const body = {
      goodKinds,
      countries: countries.map(({ source_country: code }) => ({
        code,
        name: displayNames.of(code) ?? code,
      })),
    };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    return;
  }

  if (url.pathname === '/api/map-countries') {
    const minScore = minScoreOf(url);
    if (Number.isNaN(minScore)) {
      badRequest(res, 'min_score must be 0-1');
      return;
    }
    const countries = db.prepare(`
      SELECT source_country AS code, count(*) AS article_count
      FROM articles
      WHERE source_country IS NOT NULL
        AND good_score >= :min_score
        AND duplicate_of IS NULL
        AND coalesce(credibility_score, 1) >= :min_credibility
      GROUP BY source_country
      ORDER BY source_country`).all({
      min_score: minScore,
      min_credibility: MIN_CREDIBILITY,
    }) as { code: string; article_count: number }[];
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const body = countries.map(({ code, article_count }) => ({
      code,
      name: displayNames.of(code) ?? code,
      article_count,
    }));
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    return;
  }

  if (url.pathname === '/api/articles') {
    const minScore = minScoreOf(url);
    const limit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
    const page = Number(url.searchParams.get('page') ?? 1);

    if (Number.isNaN(minScore)
      || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT
      || !Number.isInteger(page) || page < 1) {
      res.writeHead(400, { 'content-type': 'application/json' })
        .end(JSON.stringify({ error: 'min_score must be 0-1, limit 1-100, and page a positive integer' }));
      return;
    }

    const rows = db.prepare(`
      SELECT *,
        -- How many other outlets covered the same story. Their copies point here and aren't listed.
        (SELECT count(*) FROM articles d WHERE d.duplicate_of = articles.id) AS other_outlets,
        (SELECT json_group_array(json_object('id', t.id, 'label', t.label))
         FROM article_topics at JOIN topics t ON t.id = at.topic_id
         WHERE at.article_id = articles.id) AS topics
      FROM articles
      WHERE good_score >= :min_score AND (:category IS NULL OR category = :category)
        AND (:good_kind IS NULL OR good_kind = :good_kind)
        AND (:country IS NULL OR source_country = :country)
        AND (:topic IS NULL OR id IN (SELECT article_id FROM article_topics WHERE topic_id = :topic))
        AND duplicate_of IS NULL
        AND coalesce(credibility_score, 1) >= :min_credibility
      ORDER BY COALESCE(published_at, fetched_at) DESC, id DESC
      LIMIT :limit OFFSET :offset`).all({
      category: url.searchParams.get('category'),
      good_kind: url.searchParams.get('good_kind'),
      country: url.searchParams.get('country'),
      topic: url.searchParams.get('topic'),
      min_score: minScore,
      min_credibility: MIN_CREDIBILITY,
      limit: limit + 1,
      offset: (page - 1) * limit,
    });

    const body = {
      // embedding is 1.5 KB of numbers per article that the frontend has no use for.
      articles: rows.slice(0, limit).map(({ embedding, topics, ...article }) => ({
        ...article,
        topics: JSON.parse(topics as string) as { id: string; label: string }[],
      })),
      page,
      limit,
      hasMore: rows.length > limit,
    };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    return;
  }

  res.writeHead(404).end();
}).listen(3001, () => console.log('API on http://localhost:3001'));
