import { useEffect, useState } from 'react';
import type { Article, Category } from '../../db/types.ts';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [path] = useState(() => window.location.pathname);
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const pathSegments = path.split('/').filter(Boolean);
  const categorySlug = pathSegments[0]?.toLowerCase() ?? null;
  const category = categories.find((item) => item.id.toLowerCase() === categorySlug);
  const isNotFound = pathSegments.length > 1
    || (categories.length > 0 && categorySlug !== null && category === undefined);

  useEffect(() => {
    fetch('/api/categories')
      .then((response) => {
        if (!response.ok) throw new Error(`Categories request failed (${response.status})`);
        return response.json() as Promise<Category[]>;
      })
      .then(setCategories)
      .catch((requestError: unknown) => {
        setCategoriesError(requestError instanceof Error ? requestError.message : 'Failed to load categories');
      });
  }, []);

  useEffect(() => {
    if (isNotFound) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      min_score: '0.8',
      limit: category ? '20' : '10',
      page: String(page),
    });
    if (category) params.set('category', category.id);
    else if (categorySlug) params.set('category', categorySlug);

    setArticlesError(null);
    if (page === 1) {
      setArticles([]);
      setHasMore(false);
    }

    fetch(`/api/articles?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Articles request failed (${response.status})`);
        return response.json() as Promise<{
          articles: Article[];
          hasMore: boolean;
        }>;
      })
      .then((result) => {
        setArticles((current) => page === 1 ? result.articles : [...current, ...result.articles]);
        setHasMore(result.hasMore);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setArticlesError(requestError instanceof Error ? requestError.message : 'Failed to load articles');
        }
      });

    return () => controller.abort();
  }, [category, categorySlug, isNotFound, page]);

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>{category?.label ?? 'Bubble'}</h1>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <a href="/" aria-current={categorySlug === null ? 'page' : undefined}>Home</a>
        {categories.map((c) => (
          <a
            key={c.id}
            href={`/${c.id}`}
            aria-current={category?.id === c.id ? 'page' : undefined}
          >
            {c.label}
          </a>
        ))}
      </nav>
      {categoriesError && <p role="alert">{categoriesError}</p>}
      {isNotFound && <p>Category not found.</p>}
      {articlesError && <p role="alert">{articlesError}</p>}
      {!isNotFound && !articlesError && articles.length === 0 && <p>No good news yet.</p>}
      {!isNotFound && articles.map((a) => (
        <article key={a.id} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {a.image_url && <img src={a.image_url} alt="" width={120} height={80} style={{ objectFit: 'cover' }} />}
          <div>
            <a href={a.url}><strong>{a.title}</strong></a>
            <p>{a.summary}</p>
            <small>{a.source} · {a.category} · {a.published_at ?? a.fetched_at}</small>
          </div>
        </article>
      ))}
      {hasMore && <button onClick={() => setPage((current) => current + 1)}>Load more</button>}
    </main>
  );
}
