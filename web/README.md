# Web: API and frontend

This half of Bubble reads articles from the SQLite database and shows them. It doesn't need the ingest code or the classification model. A seed script fills the database with fake articles, so you can build the API and the frontend before real data exists.

## Set up

You need Node.js 24 or later, because it runs `.ts` files directly and has SQLite built in. Check with `node --version`.

```sh
git clone https://github.com/d4nyll/bubble.git
cd bubble/web
npm install
npm run seed 1000   # adds 1000 fake articles to ../db/bubble.db
```

The seed script adds to whatever is already there. To start over, delete `db/bubble.db` and run it again.

## Run

Use two terminals, both in `web/`:

```sh
npm run api   # JSON API on http://localhost:3001
npm run dev   # React app on http://localhost:5173
```

Vite forwards every `/api` request from port 5173 to the API on port 3001, so the React code calls `fetch('/api/...')` with no host.

The homepage at `/` shows the latest 10 articles. Each category has a URL based on its ID, such as `/technology` or `/world`. Category pages show 20 articles at a time and provide a load-more button.

`GET /api/articles` supports `min_score`, `category`, `good_kind`, `country`, `limit`, and `page` query parameters. It defaults to a score of 0.8 and sorts articles newest first. Category pages get available kind and country options from `GET /api/article-filters?category=technology`.

## What you own

- `server.ts`: the API. Its routes are yours to change.
- `src/`: the React app.
- `seed.ts`: the fake data. Change it if you need different test cases.

`npm run typecheck` checks both the React app and the API.

## What you share with Daniel

The `articles`, `categories`, `good_kinds`, `topics` and `article_topics` tables in `../db/schema.sql`, and their TypeScript types in `../db/types.ts`. Daniel's ingest job writes the rows and your API only reads them. The root [`README.md`](../README.md#the-interface) describes every column.

- `articles.good_score` is the classifier's probability (0 to 1) that the article is good news. Your API decides the cut-off. `/api/articles` uses `min_score`, which defaults to 0.8.
- `articles.category` and `articles.good_score` are NULL until Daniel's classifier has processed the article. The API's `good_score >= min_score` check already leaves those rows out, so the frontend only sees classified articles.
- `articles.category` is one of the 10 `categories.id` values once classified. Show `categories.label` to readers.
- `summary` is plain text with no HTML.
- `published_at` can be null. Fall back to `fetched_at`.

After pulling a schema change, restart `npm run api`. It migrates your existing database when it opens it, and keeps your articles. To change the schema yourself, agree it with Daniel first and follow [Changing the schema](../README.md#changing-the-schema).
