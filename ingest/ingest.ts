// Fetch RSS feeds, classify each new item, store it. Run: npm run ingest
import Parser from 'rss-parser';
import { connect, type Category } from '../db/db.ts';
import { classify } from './classify.ts';

const FEEDS: Record<string, string> = {
  BBC: 'https://feeds.bbci.co.uk/news/rss.xml',
  Guardian: 'https://www.theguardian.com/world/rss',
};

const db = connect();
const categories = db.prepare('SELECT * FROM categories').all() as unknown as Category[];
const exists = db.prepare('SELECT 1 FROM articles WHERE url = ?');
const insert = db.prepare(`
  INSERT INTO articles (url, source, source_category, title, summary, image_url, published_at, category, good_score)
  VALUES (:url, :source, :source_category, :title, :summary, :image_url, :published_at, :category, :good_score)`);

type Item = { thumbnail?: { $: { url: string } }; mediaContent?: { $: { url: string } } };
const parser = new Parser<{}, Item>({
  customFields: { item: [['media:thumbnail', 'thumbnail'], ['media:content', 'mediaContent']] },
});

for (const [source, feedUrl] of Object.entries(FEEDS)) {
  const feed = await parser.parseURL(feedUrl);
  let added = 0;
  for (const item of feed.items) {
    if (!item.link || !item.title || exists.get(item.link)) continue;
    const summary = item.contentSnippet ?? '';
    const { goodScore, category } = await classify(categories, item.title, summary);
    insert.run({
      url: item.link,
      source,
      source_category: item.categories?.[0] ?? null,
      title: item.title,
      summary,
      image_url: item.thumbnail?.$.url ?? item.mediaContent?.$.url ?? null,
      published_at: item.isoDate ?? null,
      category,
      good_score: goodScore,
    });
    added++;
  }
  console.log(`${source}: ${feed.items.length} items, ${added} new`);
}
process.exit(0);
