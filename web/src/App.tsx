import { useEffect, useState } from 'react';
import type { Article, Category, GoodKind } from '../../db/types.ts';

type ArticleFilters = {
  goodKind: string;
  country: string;
  minScore: number;
};

type FilterOptions = {
  goodKinds: GoodKind[];
  countries: { code: string; name: string }[];
};

const DEFAULT_FILTERS: ArticleFilters = { goodKind: '', country: '', minScore: 0.8 };

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [path] = useState(() => window.location.pathname);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
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
    if (!category) return;

    const controller = new AbortController();
    setFiltersError(null);
    setFilterOptions(null);

    fetch(`/api/article-filters?category=${encodeURIComponent(category.id)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Filter options request failed (${response.status})`);
        return response.json() as Promise<FilterOptions>;
      })
      .then(setFilterOptions)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setFiltersError(requestError instanceof Error ? requestError.message : 'Failed to load filter options');
        }
      });

    return () => controller.abort();
  }, [category]);

  useEffect(() => {
    if (isNotFound) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      min_score: String(category ? appliedFilters.minScore : DEFAULT_FILTERS.minScore),
      limit: categorySlug ? '20' : '10',
      page: String(page),
    });
    if (category) params.set('category', category.id);
    else if (categorySlug) params.set('category', categorySlug);
    if (category && appliedFilters.goodKind) params.set('good_kind', appliedFilters.goodKind);
    if (category && appliedFilters.country) params.set('country', appliedFilters.country);

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
  }, [appliedFilters, category, categorySlug, isNotFound, page]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  };

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
      {category && (
        <details style={{ marginBottom: 24 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Filter stories</summary>
          {filtersError && <p role="alert">{filtersError}</p>}
          {!filtersError && !filterOptions && <p>Loading filters…</p>}
          {filterOptions && (
            <div style={{ display: 'grid', gap: 16, padding: '16px 0' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                Good-news type
                <select
                  value={draftFilters.goodKind}
                  onChange={(event) => setDraftFilters({ ...draftFilters, goodKind: event.target.value })}
                >
                  <option value="">All types</option>
                  {filterOptions.goodKinds.map((kind) => (
                    <option key={kind.id} value={kind.id}>{kind.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                Source country
                <select
                  value={draftFilters.country}
                  onChange={(event) => setDraftFilters({ ...draftFilters, country: event.target.value })}
                >
                  <option value="">All countries</option>
                  {filterOptions.countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                Minimum good-news score: {draftFilters.minScore.toFixed(2)}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={draftFilters.minScore}
                  onChange={(event) => setDraftFilters({
                    ...draftFilters,
                    minScore: Number(event.target.value),
                  })}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={applyFilters}>Apply filters</button>
                <button type="button" onClick={resetFilters}>Reset</button>
              </div>
            </div>
          )}
        </details>
      )}
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
