// Fill db/bubble.db with fake articles for frontend work. Run: npm run seed 1000
// Appends to existing rows. Delete db/bubble.db to start over.
import { faker } from '@faker-js/faker';
import { connect, type Category } from '../db/db.ts';

const count = Number(process.argv[2] ?? 100);
if (!Number.isInteger(count) || count < 1) {
  console.error('Usage: npm run seed <number of articles>');
  process.exit(1);
}

const db = connect();
const categories = db.prepare('SELECT id FROM categories').all() as unknown as Pick<Category, 'id'>[];
const insert = db.prepare(`
  INSERT INTO articles (url, source, source_category, title, summary, image_url, published_at, category, good_score,
                        source_country, good_kind, credibility_score, duplicate_of)
  VALUES (:url, :source, :source_category, :title, :summary, :image_url, :published_at, :category, :good_score,
          :source_country, :good_kind, :credibility_score, :duplicate_of)`);
const kinds = db.prepare('SELECT id FROM good_kinds').all() as { id: string }[];
const COUNTRIES = ['NG', 'GH', 'KE', 'ZA', 'IN', 'HK', 'JP', 'BR', 'MX', 'DE', 'FR', 'UA', 'AU', 'NZ', 'CA'];
const topics = db.prepare('SELECT id FROM topics').all() as { id: string }[];
const tag = db.prepare('INSERT OR IGNORE INTO article_topics (article_id, topic_id, score) VALUES (?, ?, ?)');
const lastId = () => (db.prepare('SELECT max(id) AS id FROM articles').get() as { id: number | null }).id;

// Drop milliseconds to match the schema's 'YYYY-MM-DDTHH:MM:SSZ' format.
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
// Random English words, so text lengths look like real headlines.
const sentence = (min: number, max: number) => {
  const words = faker.word.words({ count: { min, max } });
  return words[0].toUpperCase() + words.slice(1);
};

db.exec('BEGIN');
for (let i = 0; i < count; i++) {
  insert.run({
    url: `https://example.com/news/${faker.string.uuid()}`,
    source: faker.helpers.arrayElement(['BBC', 'Guardian', 'Reuters', 'Sky News']),
    source_category: faker.word.noun(),
    title: sentence(6, 14),
    summary: faker.helpers.multiple(() => `${sentence(8, 20)}.`, { count: { min: 1, max: 3 } }).join(' '),
    image_url: faker.helpers.maybe(() => faker.image.urlPicsumPhotos({ width: 640, height: 360, grayscale: false, blur: 0 }), { probability: 0.9 }) ?? null,
    published_at: faker.helpers.maybe(() => iso(faker.date.recent({ days: 7 })), { probability: 0.95 }) ?? null,
    category: faker.helpers.arrayElement(categories).id,
    good_score: faker.number.float({ min: 0, max: 1, fractionDigits: 3 }),
    // Half the articles get a country, as if they came from a regional outlet.
    source_country: faker.helpers.maybe(() => faker.helpers.arrayElement(COUNTRIES), { probability: 0.5 }) ?? null,
    good_kind: faker.helpers.arrayElement(kinds).id,
    credibility_score: faker.number.float({ min: 0, max: 1, fractionDigits: 3 }),
    // About 1 in 10 repeats the article before it, as if another outlet covered the same story.
    duplicate_of: i > 0 && faker.datatype.boolean(0.1) ? lastId() : null,
  });
  for (const topic of faker.helpers.arrayElements(topics, { min: 0, max: 3 })) {
    tag.run(lastId(), topic.id, faker.number.float({ min: 0.25, max: 0.6, fractionDigits: 3 }));
  }
}
db.exec('COMMIT');
console.log(`Inserted ${count} fake articles into db/bubble.db`);
