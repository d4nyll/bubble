// Fetch RSS feeds every 10 minutes and store new articles unclassified.
// classify.ts picks them up. Started by server.ts.
import Parser from 'rss-parser';
import { connect } from '../db/db.ts';

// Any RSS or Atom feed works here: rss-parser gives every feed the same item shape,
// and imageOf(), categoryOf() and summaryOf() below handle the few ways outlets differ.
const FEEDS = [
  // General news
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { source: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
  { source: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/home.xml' },
  { source: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { source: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
  { source: 'New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { source: 'ABC News (Australia)', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  // Science and technology
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
  { source: 'Guardian', url: 'https://www.theguardian.com/science/rss' },
  { source: 'The Conversation', url: 'https://theconversation.com/uk/articles.atom' },
  { source: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { source: 'Wired', url: 'https://www.wired.com/feed/rss' },
  // Good-news outlets
  { source: 'Positive News', url: 'https://www.positive.news/feed/' },
  { source: 'Good News Network', url: 'https://www.goodnewsnetwork.org/feed/' },
  { source: 'Reasons to be Cheerful', url: 'https://reasonstobecheerful.world/feed/' },
];
const SUMMARY_MAX = 500;
const INTERVAL_MS = 10 * 60 * 1000;

const db = connect();
const insert = db.prepare(`
  INSERT OR IGNORE INTO articles (url, source, source_category, title, summary, image_url, published_at)
  VALUES (:url, :source, :source_category, :title, :summary, :image_url, :published_at)`);

type Media = { $?: { url?: string } };
type CustomFields = {
  thumbnail?: Media;
  mediaContent?: Media;
  mediaGroup?: { 'media:content'?: Media[] };
  contentEncoded?: string;
};
const parser = new Parser<{}, CustomFields>({
  timeout: 20000,
  customFields: {
    item: [
      ['media:thumbnail', 'thumbnail'],
      ['media:content', 'mediaContent'],
      ['media:group', 'mediaGroup'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});
type Item = Parser.Item & CustomFields;

// Outlets put the picture in different places. Al Jazeera, Positive News and
// Good News Network put none in their feeds, so their articles get no image.
function imageOf(item: Item): string | null {
  return item.thumbnail?.$?.url // BBC, Sky News
    ?? item.mediaContent?.$?.url // Guardian, New York Times, Wired, Ars Technica
    ?? item.mediaGroup?.['media:content']?.[0]?.$?.url // ABC News
    ?? (item.enclosure?.type?.startsWith('image/') ? item.enclosure.url : undefined)
    ?? /<img[^>]+src=["']([^"']+)["']/.exec(item.contentEncoded ?? item.content ?? '')?.[1] // NPR, The Conversation
    ?? null;
}

// Most outlets give categories as strings, the Guardian and New York Times as { _: 'Ebola', $: { domain } }.
function categoryOf(item: Item): string | null {
  const c: unknown = item.categories?.[0];
  return (typeof c === 'string' ? c : (c as { _?: string } | undefined)?._) ?? null;
}

// Some feeds (The Conversation) carry the whole article. Keep the first SUMMARY_MAX characters, cut at a word.
function summaryOf(item: Item): string {
  const text = (item.contentSnippet ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= SUMMARY_MAX ? text : text.slice(0, text.lastIndexOf(' ', SUMMARY_MAX)) + '…';
}

async function ingest(source: string, feedUrl: string) {
  const feed = await parser.parseURL(feedUrl);
  let added = 0;
  for (const item of feed.items) {
    if (!item.link || !item.title) continue;
    added += Number(insert.run({
      url: item.link,
      source,
      source_category: categoryOf(item),
      title: item.title.trim(),
      summary: summaryOf(item),
      image_url: imageOf(item),
      published_at: item.isoDate ?? null,
    }).changes);
  }
  console.log(`ingest: ${source} ${feedUrl}: ${feed.items.length} items, ${added} new`);
}

export async function runIngest() {
  while (true) {
    for (const { source, url } of FEEDS) {
      // One broken feed shouldn't stop the others.
      await ingest(source, url).catch((err) => console.error(`ingest: ${url}: ${err.message}`));
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}
