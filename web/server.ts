// API over the shared DB. Run: npm run api (listens on :3001)
import { createServer } from 'node:http';
import { connect } from '../db/db.ts';

const DEFAULT_MIN_SCORE = 0.8;
// Below 0.4 are mostly horoscopes, quizzes, podcasts, adverts and miracle claims. In a sample of
// 300 real articles, none scored below 0.4. Articles not yet scored for credibility are shown.
const MIN_CREDIBILITY = 0.4;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const db = connect();

createServer((req, res) => {
  const url = new URL(req.url!, 'http://localhost');

  if (url.pathname === '/api/categories') {
    const categories = db.prepare('SELECT * FROM categories ORDER BY position').all();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(categories));
    return;
  }

  if (url.pathname === '/api/articles') {
    const minScore = Number(url.searchParams.get('min_score') ?? DEFAULT_MIN_SCORE);
    const limit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
    const page = Number(url.searchParams.get('page') ?? 1);

    if (!Number.isFinite(minScore) || minScore < 0 || minScore > 1
      || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT
      || !Number.isInteger(page) || page < 1) {
      res.writeHead(400, { 'content-type': 'application/json' })
        .end(JSON.stringify({ error: 'min_score must be 0-1, limit 1-100, and page a positive integer' }));
      return;
    }

    const rows = db.prepare(`
      SELECT *,
        -- How many other outlets covered the same story. Their copies point here and aren't listed.
        (SELECT count(*) FROM articles d WHERE d.duplicate_of = articles.id) AS other_outlets
      FROM articles
      WHERE good_score >= :min_score AND (:category IS NULL OR category = :category)
        AND duplicate_of IS NULL
        AND coalesce(credibility_score, 1) >= :min_credibility
      ORDER BY COALESCE(published_at, fetched_at) DESC, id DESC
      LIMIT :limit OFFSET :offset`).all({
      category: url.searchParams.get('category'),
      min_score: minScore,
      min_credibility: MIN_CREDIBILITY,
      limit: limit + 1,
      offset: (page - 1) * limit,
    });

    const body = {
      // embedding is 1.5 KB of numbers per article that the frontend has no use for.
      articles: rows.slice(0, limit).map(({ embedding, ...article }) => article),
      page,
      limit,
      hasMore: rows.length > limit,
    };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    return;
  }

  res.writeHead(404).end();
}).listen(3001, () => console.log('API on http://localhost:3001'));
