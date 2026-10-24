// Fetch RSS feeds every 10 minutes and store new articles unclassified.
// classify.ts picks them up. Started by server.ts.
import Parser from 'rss-parser';
import { connect } from '../db/db.ts';

const FEEDS: Record<string, string> = {
  BBC: 'https://feeds.bbci.co.uk/news/rss.xml',
  Guardian: 'https://www.theguardian.com/world/rss',
};
const INTERVAL_MS = 10 * 60 * 1000;

const db = connect();
const insert = db.prepare(`
  INSERT OR IGNORE INTO articles (url, source, source_category, title, summary, image_url, published_at)
  VALUES (:url, :source, :source_category, :title, :summary, :image_url, :published_at)`);

type Item = { thumbnail?: { $: { url: string } }; mediaContent?: { $: { url: string } } };
// BBC gives categories as strings, the Guardian as { _: 'Ebola', $: { domain } }.
type FeedCategory = string | { _?: string };
const categoryName = (c?: FeedCategory) => (typeof c === 'string' ? c : c?._) ?? null;
const parser = new Parser<{}, Item>({
  customFields: { item: [['media:thumbnail', 'thumbnail'], ['media:content', 'mediaContent']] },
});

async function ingest(source: string, feedUrl: string) {
  const feed = await parser.parseURL(feedUrl);
  let added = 0;
  for (const item of feed.items) {
    if (!item.link || !item.title) continue;
    added += Number(insert.run({
      url: item.link,
      source,
      source_category: categoryName(item.categories?.[0] as FeedCategory | undefined),
      title: item.title,
      summary: item.contentSnippet ?? '',
      image_url: item.thumbnail?.$.url ?? item.mediaContent?.$.url ?? null,
      published_at: item.isoDate ?? null,
    }).changes);
  }
  console.log(`ingest: ${source}: ${feed.items.length} items, ${added} new`);
}

export async function runIngest() {
  while (true) {
    for (const [source, feedUrl] of Object.entries(FEEDS)) {
      // One broken feed shouldn't stop the others.
      await ingest(source, feedUrl).catch((err) => console.error(`ingest: ${source}: ${err.message}`));
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}
