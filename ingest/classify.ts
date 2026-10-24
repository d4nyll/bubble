// Classify unclassified articles with Laya, an open-weight Jev-compatible decision model
// (https://github.com/receptron/laya). Downloads ~1.7 GB of weights on first run.
// The rows with no good_kind are the queue: new articles, and articles scored before the current
// questions. Set good_kind to NULL to have articles scored again. Started by server.ts.
import { Laya } from '@receptron/laya';
import { connect, type Article, type Category, type GoodKind } from '../db/db.ts';
import { GOOD_QUESTIONS, goodScore } from './good.ts';

const POLL_MS = 5000;

const db = connect();
const categories = db.prepare('SELECT * FROM categories').all() as unknown as Category[];
const goodKinds = db.prepare('SELECT * FROM good_kinds').all() as unknown as GoodKind[];
// Unscored articles first, newest first, so new articles don't wait behind a re-score.
const next = db.prepare(`
  SELECT id, title, summary FROM articles
  WHERE good_kind IS NULL AND id NOT IN (SELECT value FROM json_each(:failed))
  ORDER BY good_score IS NOT NULL, id DESC LIMIT 20`);
const save = db.prepare(`
  UPDATE articles SET category = :category, good_score = :good_score, good_kind = :good_kind, news_score = :news_score
  WHERE id = :id`);

// ponytail: an article that fails is skipped until the server restarts; add an attempts column if failures pile up
export async function runClassifier() {
  const laya = await Laya.load();
  console.log('classify: Laya loaded, waiting for articles');
  const failed: number[] = [];
  while (true) {
    const batch = next.all({ failed: JSON.stringify(failed) }) as unknown as Pick<Article, 'id' | 'title' | 'summary'>[];
    if (batch.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      continue;
    }
    for (const article of batch) {
      try {
        const { answers } = await laya.systemOne(
          { title: article.title, summary: article.summary ?? '' },
          {
            ...GOOD_QUESTIONS,
            category: {
              type: 'choice',
              instructions: 'Which category does this news article belong to?',
              criteria: Object.fromEntries(categories.map((c) => [c.id, c.description])),
            },
            kind: {
              type: 'choice',
              instructions: 'If this is good news, what kind of good news is it?',
              criteria: Object.fromEntries(goodKinds.map((k) => [k.id, k.description])),
            },
            news: {
              type: 'noul',
              instructions: 'Is this a news report about something that happened, rather than a podcast, '
                + 'horoscope, quiz, live blog, opinion column or weekly round-up?',
            },
          },
        );
        const good_score = goodScore(answers);
        save.run({
          id: article.id,
          category: answers.category.choice,
          good_score,
          good_kind: answers.kind.choice,
          news_score: answers.news.noul,
        });
        console.log(`classify: ${good_score.toFixed(2)} ${answers.category.choice.padEnd(11)} ${answers.kind.choice.padEnd(12)} ${article.title}`);
      } catch (err) {
        failed.push(article.id);
        console.error(`classify: article ${article.id} failed: ${(err as Error).message}`);
      }
    }
  }
}
