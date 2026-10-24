// Classify an article with Laya, an open-weight Jev-compatible decision model
// (https://github.com/receptron/laya). Downloads ~1.7 GB of weights on first run.
import { Laya } from '@receptron/laya';
import type { Category, CategoryId } from '../db/db.ts';

const laya = await Laya.load();

export async function classify(categories: Category[], title: string, summary: string) {
  const { answers } = await laya.systemOne(
    { title, summary },
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
  return { goodScore: answers.good.noul, category: answers.category.choice as CategoryId };
}
