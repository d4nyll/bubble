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

`db/schema.sql` is the contract. `ingest` writes `articles`, `web` only reads. `db/types.ts` holds the matching TypeScript types and `db/db.ts` holds `connect()`.

- `categories`: our 10 standard categories, condensed from the 17 [IPTC Media Topics](https://cv.iptc.org/newscodes/mediatopic/). The classifier picks one per article from `description`, and the frontend shows `label`.
- `good_kinds`: the 6 kinds of good news (breakthrough, nature, systems, peace, inspiring, kindness), for filtering. Same `description`/`label` split as `categories`. `kindness` is the mildest kind.
- `articles.good_score`: the classifier's probability (0 to 1) that the article is good news. The API decides the cut-off for "good" at request time.
- `articles.credibility_score`: how likely (0 to 1) the article is a credible news report rather than a horoscope, quiz, podcast, advert, opinion column or clickbait. `ingest/credibility.ts` works it out. The API hides articles below 0.4: in a sample of 300 real articles none scored below 0.4, while made-up horoscopes, quizzes, podcasts, adverts and miracle cures scored 0.04 to 0.19. Clickbait headlines, satire and live blogs still scored above 0.6, so the score doesn't catch those.
- `articles.category`, `good_score`, `good_kind` and `credibility_score` are NULL until the classifier has processed the article.
- `topics` and `article_topics`: tags that cut across categories, such as `ai` and `biochemistry` on a Science story. An article has 0 to 3, each with the `score` it matched with. `ingest/embedder.ts` picks them by comparing the article with each topic's `description`. To add a topic, add a row to `db/schema.sql`.
- `articles.embedding`: the article's all-MiniLM-L6-v2 vector, which `embedder.ts` uses to find duplicates. The API leaves it out of responses.
- `articles.source_country`: the ISO 3166-1 alpha-2 code (such as `NG`) of the outlet's home country, from `ingest/feeds.ts`. NULL for international outlets, journals and Reddit. `new Intl.DisplayNames(['en'], { type: 'region' }).of('NG')` turns a code into "Nigeria".
- `articles.duplicate_of`: when several outlets cover the same story, every article after the first points to the first one's `id`. `embedder.ts` sets it when two articles from different outlets, published within 3 days of each other, have vectors with a cosine similarity of 0.8 or more. `/api/articles` lists only the first and returns `other_outlets`, the number of copies.

### Tuning what counts as good

`ingest/good.ts` defines good news, the yes/no questions Laya answers, and how `goodScore()` combines the answers into `good_score`. It also holds headlines that Daniel and Vat scored by hand. `npm run calibrate` (in `ingest/`) scores those headlines and prints how far `good_score` is from the hand-given score. Add a headline whenever the site gets one wrong.

After changing `good.ts`, restart `npm run ingest-server`. To score every stored article again, run `sqlite3 db/bubble.db "UPDATE articles SET good_kind = NULL"`. The classifier treats articles with no `good_kind` as its queue, scores new articles first, and the old scores stay on the site until it replaces them.

### Migrating an existing database

You don't need to do anything. `connect()` in `db/db.ts` checks the database every time a process opens it:

- A new database gets the full schema from `db/schema.sql`.
- An existing database gets every file in `db/migrations/` it hasn't had yet, in filename order. `PRAGMA user_version` records how many it has had, so each file runs once.

So after pulling a schema change, restart `npm run ingest-server`, `npm run admin` and `npm run api`. The first one to start migrates the database, and the existing articles are kept.

To check which version a database is at, run `sqlite3 db/bubble.db "PRAGMA user_version"`. To start again from nothing instead, stop every server and delete `db/bubble.db`, `db/bubble.db-wal` and `db/bubble.db-shm`.

### Changing the schema

Agree the change with the other person first, then in one commit:

1. Edit `db/schema.sql` so it describes the new full schema. New databases are built from it.
2. Add `db/migrations/NNN-short-name.sql`, numbered one above the last file, containing the SQL that turns the previous schema into the new one (`ALTER TABLE ... ADD COLUMN ...`, `CREATE TABLE ...`). Existing databases are upgraded with it. Never edit a migration that has already been pushed.
3. Update `db/types.ts` to match.

## Run

Working on the API or frontend only? Follow [`web/README.md`](web/README.md) instead. It skips ingest and the model download.

Requires Node.js 24 (it runs `.ts` files directly and has `node:sqlite` built in).

`npm run ingest-server` runs ingest, classify and embed together in one process, and stopping it stops all three. Embed downloads the 23 MB all-MiniLM-L6-v2 model on first run. Ingest stores new articles every 10 minutes with `category` and `good_score` left NULL. Classify polls for those rows and fills both in. The first run downloads ~1.7 GB of Laya weights. The admin dashboard is a separate server.

```sh
npm install
npm run ingest-server   # terminal 1
npm run admin           # optional, terminal 2: dashboard on http://localhost:3002
```

Web, using two terminals in `web/`:

```sh
npm install
npm run seed 1000   # optional: 1000 fake articles, no model needed
npm run api         # terminal 1
npm run dev         # terminal 2, open http://localhost:5173
```

## API (owned by Vat, change freely)

[`web/README.md`](web/README.md) lists the endpoints.
