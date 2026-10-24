# Bubble

A news aggregator that shows only good news.

```
+-------------------------------+
| ingest/ (Daniel)              |
| fetch RSS, classify with Laya |
+-------------------------------+
                |
                v
+-------------------------------+
| db/bubble.db (SQLite)         |
| schema: db/schema.sql         |
+-------------------------------+
                |
                v
+-------------------------------+
| web/server.ts (Vat)           |
| JSON API on :3001             |
+-------------------------------+
                |
                v
+-------------------------------+
| web/src/ (Vat)                |
| React app, Vite on :5173      |
+-------------------------------+
```

## The interface

`db/schema.sql` is the contract. `ingest` writes `articles`, `web` only reads. `db/types.ts` holds the matching TypeScript types and `db/db.ts` holds `connect()`. Change `schema.sql` and `types.ts` together, then delete `db/bubble.db`.

- `categories`: our 10 standard categories, condensed from the 17 [IPTC Media Topics](https://cv.iptc.org/newscodes/mediatopic/). The classifier picks one per article from `description`, and the frontend shows `label`.
- `articles.good_score`: the classifier's probability (0 to 1) that the article is good news. The API decides the cut-off for "good" at request time.
- `articles.category` and `articles.good_score` are NULL until the classifier has processed the article. The API never returns those rows.

## Run

Working on the API or frontend only? Follow [`web/README.md`](web/README.md) instead. It skips ingest and the model download.

Requires Node.js 24 (it runs `.ts` files directly and has `node:sqlite` built in).

Ingest and classify run as two separate processes, in two terminals in `ingest/`. Ingest stores new articles every 10 minutes with `category` and `good_score` left NULL. Classify polls for those rows and fills both in. The first classify run downloads ~1.7 GB of Laya weights.

```sh
npm install
npm run ingest     # terminal 1
npm run classify   # terminal 2
npm run admin      # optional, terminal 3: dashboard on http://localhost:3002
```

Web, using two terminals in `web/`:

```sh
npm install
npm run seed 1000   # optional: 1000 fake articles, no model needed
npm run api         # terminal 1
npm run dev         # terminal 2, open http://localhost:5173
```

## API (owned by Vat, change freely)

- `GET /api/categories`: all categories, in display order.
- `GET /api/articles?category=science&min_score=0.7`: up to 100 articles with `good_score >= min_score`, newest first. Omit `category` for all categories. `min_score` defaults to 0.5.
