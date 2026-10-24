import { useEffect, useState } from 'react';
import type { Article, Category } from '../../db/types.ts';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    fetch(category ? `/api/articles?category=${category}` : '/api/articles')
      .then((r) => r.json())
      .then(setArticles);
  }, [category]);

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Bubble</h1>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setCategory(null)} aria-pressed={category === null}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} aria-pressed={category === c.id}>
            {c.label}
          </button>
        ))}
      </nav>
      {articles.length === 0 && <p>No good news yet.</p>}
      {articles.map((a) => (
        <article key={a.id} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {a.image_url && <img src={a.image_url} alt="" width={120} height={80} style={{ objectFit: 'cover' }} />}
          <div>
            <a href={a.url}><strong>{a.title}</strong></a>
            <p>{a.summary}</p>
            <small>{a.source} · {a.category} · {a.published_at ?? a.fetched_at}</small>
          </div>
        </article>
      ))}
    </main>
  );
}
