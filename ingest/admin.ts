// Admin dashboard for ingest, classify and embed. Run: npm run admin (http://localhost:3002)
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect } from '../db/db.ts';

const db = connect();
const html = new URL('./admin.html', import.meta.url);
// The site's API hides duplicates and articles below this credibility (MIN_CREDIBILITY in web/server.ts).
const MIN_CREDIBILITY = 0.4;
// Whether the site shows an article at a given cut-off, matching /api/articles. `a` is the table alias.
const shown = (a = 'articles') =>
  `${a}.good_score >= :min_score AND ${a}.duplicate_of IS NULL AND coalesce(${a}.credibility_score, 1) >= ${MIN_CREDIBILITY}`;

const q = {
  totals: db.prepare(`
    SELECT count(*) AS total,
           count(good_kind) AS classified,
           count(*) - count(good_kind) AS classify_queue,
           count(*) - count(embedding) AS embed_queue,
           count(duplicate_of) AS duplicates,
           coalesce(sum(credibility_score < ${MIN_CREDIBILITY}), 0) AS low_credibility,
           coalesce(sum(${shown()}), 0) AS shown
    FROM articles`),
  perHour: db.prepare(`
    SELECT strftime('%Y-%m-%dT%H:00:00Z', fetched_at) AS hour, count(*) AS count
    FROM articles WHERE fetched_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-24 hours')
    GROUP BY hour`),
  scores: db.prepare(`
    SELECT min(cast(good_score * 10 AS INTEGER), 9) AS bin, count(*) AS count
    FROM articles WHERE good_kind IS NOT NULL GROUP BY bin`),
  credibility: db.prepare(`
    SELECT min(cast(credibility_score * 10 AS INTEGER), 9) AS bin, count(*) AS count
    FROM articles WHERE good_kind IS NOT NULL GROUP BY bin`),
  categories: db.prepare(`
    SELECT c.label, count(a.id) AS count, coalesce(sum(${shown('a')}), 0) AS shown
    FROM categories c LEFT JOIN articles a ON a.category = c.id AND a.good_kind IS NOT NULL
    GROUP BY c.id ORDER BY c.position`),
  kinds: db.prepare(`
    SELECT k.label, count(a.id) AS count, coalesce(sum(${shown('a')}), 0) AS shown
    FROM good_kinds k LEFT JOIN articles a ON a.good_kind = k.id
    GROUP BY k.id ORDER BY k.position`),
  topics: db.prepare(`
    SELECT t.label, count(*) AS count FROM article_topics at JOIN topics t ON t.id = at.topic_id
    GROUP BY t.id ORDER BY count DESC LIMIT 15`),
  countries: db.prepare(`
    SELECT source_country AS code, count(*) AS count, coalesce(sum(${shown()}), 0) AS shown
    FROM articles WHERE source_country IS NOT NULL GROUP BY 1 ORDER BY count DESC LIMIT 15`),
  sources: db.prepare(`
    SELECT source, count(*) AS total, count(good_kind) AS classified, coalesce(sum(${shown()}), 0) AS shown,
           avg(good_score) AS avg_score, avg(credibility_score) AS avg_credibility, max(fetched_at) AS last_fetched
    FROM articles GROUP BY source ORDER BY total DESC`),
  recent: db.prepare(`
    SELECT a.id, a.fetched_at, a.source, a.source_country, a.title, a.url, c.label AS category,
           k.label AS kind, a.good_score, a.credibility_score, a.duplicate_of, a.embedding IS NOT NULL AS embedded,
           (SELECT group_concat(t.label, ', ') FROM article_topics at JOIN topics t ON t.id = at.topic_id
            WHERE at.article_id = a.id) AS topics
    FROM articles a LEFT JOIN categories c ON c.id = a.category LEFT JOIN good_kinds k ON k.id = a.good_kind
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
      credibility: q.credibility.all(),
      categories: q.categories.all(params),
      kinds: q.kinds.all(params),
      topics: q.topics.all(),
      countries: q.countries.all(params),
      sources: q.sources.all(params),
      recent: q.recent.all(),
      minCredibility: MIN_CREDIBILITY,
    };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  } else {
    res.writeHead(404).end();
  }
}).listen(3002, () => console.log('Admin on http://localhost:3002'));
