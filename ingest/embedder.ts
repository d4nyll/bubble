// Embeds each article with all-MiniLM-L6-v2, then uses the vector to mark repeats of a story
// another outlet already covered (duplicate_of) and to tag topics. The rows with no embedding
// are the queue, taken in the order they were stored so the first article of a story is the one
// kept. Started by server.ts.
import { connect, type Topic } from '../db/db.ts';
import { loadEmbedder, similarity } from './embed.ts';

const POLL_MS = 5000;
// Two articles from different outlets are the same story when their vectors are at least this
// similar and they were published within DUPLICATE_WINDOW_DAYS of each other. Sampled pairs at
// 0.80 and above were the same story; between 0.75 and 0.80 some were only the same subject.
const DUPLICATE_SIMILARITY = 0.8;
const DUPLICATE_WINDOW_MS = 3 * 24 * 3600 * 1000;
// An article gets up to TOPIC_MAX topics that score at least TOPIC_MIN and are within TOPIC_GAP of its best one.
const TOPIC_MIN = 0.25;
const TOPIC_GAP = 0.06;
const TOPIC_MAX = 3;

const db = connect();
const TOPICS = db.prepare('SELECT * FROM topics').all() as unknown as Topic[];

type Row = { id: number; source: string; title: string; summary: string | null; at: string };
const next = db.prepare(`
  SELECT id, source, title, summary, coalesce(published_at, fetched_at) AS at FROM articles
  WHERE embedding IS NULL ORDER BY id LIMIT 50`);
const save = db.prepare('UPDATE articles SET embedding = :embedding, duplicate_of = :duplicate_of WHERE id = :id');
const tag = db.prepare('INSERT OR REPLACE INTO article_topics (article_id, topic_id, score) VALUES (?, ?, ?)');

// Every article already embedded that isn't itself a repeat: what a new article can be a repeat of.
type Story = { id: number; source: string; at: number; vector: Float32Array };
const stories: Story[] = (db.prepare(`
  SELECT id, source, coalesce(published_at, fetched_at) AS at, embedding FROM articles
  WHERE embedding IS NOT NULL AND duplicate_of IS NULL`).all() as { id: number; source: string; at: string; embedding: Uint8Array }[])
  .map((r) => ({ id: r.id, source: r.source, at: Date.parse(r.at), vector: new Float32Array(r.embedding.slice().buffer) }));

function firstCoverage(vector: Float32Array, source: string, at: number): number | null {
  let best: Story | null = null;
  let bestScore = DUPLICATE_SIMILARITY;
  for (const story of stories) {
    // Written as !(<=) so an unparseable date (NaN) counts as outside the window.
    if (story.source === source || !(Math.abs(story.at - at) <= DUPLICATE_WINDOW_MS)) continue;
    const score = similarity(vector, story.vector);
    if (score >= bestScore) [best, bestScore] = [story, score];
  }
  return best?.id ?? null;
}

export async function runEmbedder() {
  const embed = await loadEmbedder();
  const topicVectors = await Promise.all(TOPICS.map((t) => embed(`${t.label}: ${t.description}`)));
  console.log(`embed: model loaded, ${stories.length} stories in memory`);
  while (true) {
    const batch = next.all() as Row[];
    if (batch.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      continue;
    }
    for (const article of batch) {
      const vector = await embed(`${article.title}. ${article.summary ?? ''}`);
      const at = Date.parse(article.at);
      const duplicateOf = firstCoverage(vector, article.source, at);
      const scored = TOPICS.map((t, i) => ({ id: t.id, score: similarity(vector, topicVectors[i]) }))
        .sort((a, b) => b.score - a.score);
      const topics = scored
        .filter((t) => t.score >= TOPIC_MIN && t.score >= scored[0].score - TOPIC_GAP)
        .slice(0, TOPIC_MAX);

      db.exec('BEGIN');
      save.run({ id: article.id, embedding: new Uint8Array(vector.buffer), duplicate_of: duplicateOf });
      for (const t of topics) tag.run(article.id, t.id, t.score);
      db.exec('COMMIT');

      if (duplicateOf === null) stories.push({ id: article.id, source: article.source, at, vector });
      else console.log(`embed: ${article.id} repeats ${duplicateOf}: ${article.title}`);
    }
  }
}
