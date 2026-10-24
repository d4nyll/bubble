// API over the shared DB. Run: npm run api (listens on :3001)
import { createServer } from 'node:http';
import { connect } from '../db/db.ts';

// ponytail: starting cut-off, tune against real scores in the DB
const DEFAULT_MIN_SCORE = 0.5;

const db = connect();
const categories = db.prepare('SELECT * FROM categories ORDER BY position');
const articles = db.prepare(`
  SELECT * FROM articles
  WHERE good_score >= :min_score AND (:category IS NULL OR category = :category)
  ORDER BY COALESCE(published_at, fetched_at) DESC
  LIMIT 100`);

createServer((req, res) => {
  const url = new URL(req.url!, 'http://localhost');
  let body;
  if (url.pathname === '/api/categories') body = categories.all();
  else if (url.pathname === '/api/articles') body = articles.all({
      category: url.searchParams.get('category'),
      min_score: Number(url.searchParams.get('min_score') ?? DEFAULT_MIN_SCORE),
    });
  else {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}).listen(3001, () => console.log('API on http://localhost:3001'));
