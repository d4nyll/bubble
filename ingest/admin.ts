// Admin dashboard for ingest and classify. Run: npm run admin (http://localhost:3002)
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect } from '../db/db.ts';

const db = connect();
const html = new URL('./admin.html', import.meta.url);
const q = {
  totals: db.prepare(`
    SELECT count(*) AS total, count(good_score) AS classified,
           count(*) - count(good_score) AS queued,
           coalesce(sum(good_score >= :min_score), 0) AS good
    FROM articles`),
  perHour: db.prepare(`
    SELECT strftime('%Y-%m-%dT%H:00:00Z', fetched_at) AS hour, count(*) AS count
    FROM articles WHERE fetched_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-24 hours')
    GROUP BY hour`),
  scores: db.prepare(`
    SELECT min(cast(good_score * 10 AS INTEGER), 9) AS bin, count(*) AS count
    FROM articles WHERE good_score IS NOT NULL GROUP BY bin`),
  categories: db.prepare(`
    SELECT c.id, c.label, count(a.id) AS count,
           coalesce(sum(a.good_score >= :min_score), 0) AS good
    FROM categories c LEFT JOIN articles a ON a.category = c.id
    GROUP BY c.id ORDER BY c.position`),
  sources: db.prepare(`
    SELECT source, count(*) AS total, count(good_score) AS classified,
           avg(good_score) AS avg_score, max(fetched_at) AS last_fetched
    FROM articles GROUP BY source ORDER BY source`),
  recent: db.prepare(`
    SELECT a.id, a.fetched_at, a.source, a.source_category, a.title, a.url, c.label AS category, a.good_score
    FROM articles a LEFT JOIN categories c ON c.id = a.category
    ORDER BY a.id DESC LIMIT 50`),
};

createServer((req, res) => {
  const url = new URL(req.url!, 'http://localhost');
  if (url.pathname === '/') {
    // Read on every request so edits to admin.html show on refresh.
    res.writeHead(200, { 'content-type': 'text/html' }).end(readFileSync(html));
  } else if (url.pathname === '/api/stats') {
    const params = { min_score: Number(url.searchParams.get('min_score') ?? 0.5) };
    const body = {
      totals: q.totals.get(params),
      perHour: q.perHour.all(),
      scores: q.scores.all(),
      categories: q.categories.all(params),
      sources: q.sources.all(),
      recent: q.recent.all(),
    };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  } else {
    res.writeHead(404).end();
  }
}).listen(3002, () => console.log('Admin on http://localhost:3002'));
