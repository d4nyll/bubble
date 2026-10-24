// Classify unclassified articles with Laya, an open-weight Jev-compatible decision model
// (https://github.com/receptron/laya). Downloads ~1.7 GB of weights on first run.
// Run: npm run classify. The `good_score IS NULL` rows in the DB are the queue.
import { Laya } from '@receptron/laya';
import { connect, type Article, type Category } from '../db/db.ts';

const POLL_MS = 5000;

const db = connect();
const categories = db.prepare('SELECT * FROM categories').all() as unknown as Category[];
const next = db.prepare(`
  SELECT id, title, summary FROM articles
  WHERE good_score IS NULL AND id > :after
  ORDER BY id LIMIT 20`);
const save = db.prepare('UPDATE articles SET category = :category, good_score = :good_score WHERE id = :id');

const laya = await Laya.load();
console.log('Laya loaded, waiting for articles');

// ponytail: an article that fails is skipped until this process restarts; add an attempts column if failures pile up
let after = 0;
while (true) {
  const batch = next.all({ after }) as unknown as Pick<Article, 'id' | 'title' | 'summary'>[];
  if (batch.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    continue;
  }
  for (const article of batch) {
    after = article.id;
    try {
      const { answers } = await laya.systemOne(
        { title: article.title, summary: article.summary ?? '' },
        {
          good: {
            type: 'noul',
            instructions: 'Is this good news: positive, hopeful or uplifting for the reader?',
            criteria: { true: 'good news', false: 'bad, sad, worrying or neutral news' },
          },
          category: {
            type: 'choice',
            instructions: 'Which category does this news article belong to?',
            criteria: Object.fromEntries(categories.map((c) => [c.id, c.description])),
          },
        },
      );
      save.run({ id: article.id, category: answers.category.choice, good_score: answers.good.noul });
      console.log(`${answers.good.noul.toFixed(2)} ${answers.category.choice.padEnd(11)} ${article.title}`);
    } catch (err) {
      console.error(`Article ${article.id} failed: ${(err as Error).message}`);
    }
  }
}
