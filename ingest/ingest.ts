// Fetch every feed in feeds.ts every 10 minutes and store new articles unclassified.
// classify.ts picks them up. Started by server.ts.
import Parser from 'rss-parser';
import { connect } from '../db/db.ts';
import { FEEDS, type Feed } from './feeds.ts';

const SUMMARY_MAX = 500;
const INTERVAL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 60 * 1000;
// Reddit answers 429 Too Many Requests to quick unauthenticated requests, so space them out.
const REDDIT_GAP_MS = 30 * 1000;
// Journal feeds also list corrections, retractions and tables of contents, which aren't news.
const NOT_ARTICLES = /^(author correction|correction|publisher correction|erratum|retraction|expression of concern|in this issue)\b/i;
const USER_AGENT = 'bubble-news-aggregator/0.1 (https://github.com/d4nyll/bubble)';

const db = connect();
const insert = db.prepare(`
  INSERT OR IGNORE INTO articles (url, source, source_category, title, summary, image_url, published_at, source_country)
  VALUES (:url, :source, :source_category, :title, :summary, :image_url, :published_at, :source_country)`);
// Fills in the country on articles stored before the source_country column existed.
const backfillCountry = db.prepare('UPDATE articles SET source_country = ? WHERE url = ? AND source_country IS NULL');

type Row = {
  url: string;
  source_category: string | null;
  title: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
};

type Media = { $?: { url?: string } };
type CustomFields = {
  thumbnail?: Media;
  mediaContent?: Media;
  mediaGroup?: { 'media:content'?: Media[] };
  contentEncoded?: string;
};
const parser = new Parser<{}, CustomFields>({
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

// fetch() rather than parser.parseURL(), because fetch decompresses gzip and brotli responses
// (The Independent, The Tico Times) and rss-parser doesn't.
async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const decodeEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|hellip);/g, (_, e: string) =>
      ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…' })[e]!);
const stripHtml = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, ' '));

// Collapse whitespace. Some feeds (The Conversation) carry the whole article, so keep the first
// SUMMARY_MAX characters, cut at a word.
function summarise(text: string | undefined): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= SUMMARY_MAX ? t : t.slice(0, t.lastIndexOf(' ', SUMMARY_MAX)) + '…';
}

// Outlets put the picture in different places. Some (Al Jazeera, Positive News) put none in their feeds.
function imageOf(item: Item): string | null {
  return item.thumbnail?.$?.url // BBC, Sky News, Reddit
    ?? item.mediaContent?.$?.url // Guardian, New York Times, Wired
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

// Feeds that put raw HTML in a title (The Daily Star wraps it in <a>) come out of rss-parser as nested
// objects. Collect the text from them.
function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textOf).join(' ');
  if (value && typeof value === 'object') {
    return Object.entries(value).filter(([key]) => key !== '$').map(([, v]) => textOf(v)).join(' ');
  }
  return '';
}

// A Reddit post's feed entry links to the comments page. The article it shares is the "[link]" in the content.
// Text posts link back to Reddit itself, so they have no article and get skipped.
function redditArticleUrl(item: Item): string | null {
  const url = /<a href="([^"]+)">\[link\]<\/a>/.exec(item.content ?? '')?.[1];
  return url && !new URL(url).hostname.endsWith('reddit.com') ? url : null;
}

async function fetchRss(feed: Feed): Promise<Row[]> {
  const { items } = await parser.parseString(await get(feed.url));
  const reddit = feed.kind === 'reddit';
  return items.flatMap((item: Item) => {
    const url = reddit ? redditArticleUrl(item) : item.link;
    const title = decodeEntities(textOf(item.title)).replace(/\s+/g, ' ').trim();
    if (!url || !title || NOT_ARTICLES.test(title)) return [];
    return [{
      url,
      // A subreddit entry's only category is the subreddit, and its content is "submitted by /u/...".
      source_category: reddit ? null : categoryOf(item),
      title,
      summary: reddit ? null : summarise(item.contentSnippet),
      image_url: imageOf(item),
      published_at: item.isoDate ?? null,
    }];
  });
}

// For WordPress sites without a working feed (Citi Newsroom). feed.url is the site's /wp-json/wp/v2/posts endpoint.
type WordPressPost = { link: string; date_gmt: string; title: { rendered: string }; excerpt: { rendered: string } };
async function fetchWordPress(feed: Feed): Promise<Row[]> {
  const posts = JSON.parse(await get(feed.url)) as WordPressPost[];
  return posts.map((p) => ({
    url: p.link,
    source_category: null,
    title: stripHtml(p.title.rendered).trim(),
    summary: summarise(stripHtml(p.excerpt.rendered)),
    image_url: null,
    published_at: `${p.date_gmt}Z`,
  }));
}

export const fetchFeed = (feed: Feed) => (feed.kind === 'wordpress' ? fetchWordPress(feed) : fetchRss(feed));

async function ingest(feed: Feed) {
  const rows = await fetchFeed(feed);
  let added = 0;
  for (const row of rows) {
    added += Number(insert.run({ ...row, source: feed.source, source_country: feed.country ?? null }).changes);
    if (feed.country) backfillCountry.run(feed.country, row.url);
  }
  console.log(`ingest: ${feed.source} ${feed.url}: ${rows.length} items, ${added} new`);
}

export async function runIngest() {
  while (true) {
    for (const feed of FEEDS) {
      if (feed.kind === 'reddit') await new Promise((resolve) => setTimeout(resolve, REDDIT_GAP_MS));
      // One broken feed shouldn't stop the others.
      await ingest(feed).catch((err) => console.error(`ingest: ${feed.url}: ${err.message}`));
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}
