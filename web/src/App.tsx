import { useEffect, useState } from 'react';
import type { Article, Category, GoodKind } from '../../db/types.ts';
import WorldMap from './WorldMap.tsx';
import './App.css';

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

function ArticleCard({ article }: { article: Article }) {
  const published = article.published_at ?? article.fetched_at;
  const date = new Date(published);
  const score = article.good_score === null ? null : Math.round(article.good_score * 100);

  return (
    <article className="article-card">
      <div className="article-image">
        {article.image_url
          ? <img src={article.image_url} alt="" loading="lazy" />
          : <span>Bubble news</span>}
      </div>
      <div className="article-content">
        <a className="article-title" href={article.url} target="_blank" rel="noreferrer">
          {article.title}
        </a>
        {article.summary && <p className="article-summary">{article.summary}</p>}
        <div className="article-meta">
          {score !== null && <span className="score-badge">{score}% good</span>}
          <span>{article.source}</span>
          <span aria-hidden="true">·</span>
          <span>{article.category}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={published}>
            {Number.isNaN(date.valueOf()) ? published : date.toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [path] = useState(() => window.location.pathname);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
    if (isNotFound) {
      setIsLoading(false);
      return;
    }

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
    setIsLoading(true);
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
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
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
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Bubble home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Bubble</span>
        </a>
        <span className="model-badge">Sorted by good news</span>
      </header>

      <nav className="category-nav" aria-label="News categories">
        <a href="/" aria-current={categorySlug === null ? 'page' : undefined}>Home</a>
        {categories.map((item) => (
          <a
            key={item.id}
            href={`/${item.id}`}
            aria-current={category?.id === item.id ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {categoriesError && <p role="alert">{categoriesError}</p>}
      {isNotFound && <p className="empty-state">Category not found.</p>}

      {!category && !isNotFound && (
        <>
          <section className="home-intro">
            <h1>Good news, only.</h1>
            <p>We read headlines from lots of outlets and keep the ones that will make your day better. No doomscrolling.</p>
          </section>
          <WorldMap />
          <div className="feed-heading">
            <h2>Today&apos;s good news</h2>
            <p>Mixed from every category · latest 10 · 80%+ good</p>
          </div>
        </>
      )}

      {category && (
        <>
          <section className="category-intro">
            <a className="back-home" href="/">← Back to home</a>
            <h1>{category.label}</h1>
            <p>Only stories rated 80% good or higher. Showing the latest 20.</p>
          </section>
          <details className="filter-panel">
            <summary>Filter stories</summary>
            {filtersError && <p className="status-message" role="alert">{filtersError}</p>}
            {!filtersError && !filterOptions && <p className="status-message">Loading filters…</p>}
            {filterOptions && (
              <div className="filter-controls">
                <label>
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
                <label>
                  Source country
                  <select
                    value={draftFilters.country}
                    onChange={(event) => setDraftFilters({ ...draftFilters, country: event.target.value })}
                  >
                    <option value="">All countries</option>
                    {filterOptions.countries.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
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
                <div className="filter-actions">
                  <button className="button-primary" type="button" onClick={applyFilters}>Apply filters</button>
                  <button className="button-secondary" type="button" onClick={resetFilters}>Reset</button>
                </div>
              </div>
            )}
          </details>
        </>
      )}

      {articlesError && <p className="status-message" role="alert">{articlesError}</p>}
      {isLoading && !articlesError && <p className="status-message">Finding the latest good news…</p>}
      {!isLoading && !articlesError && !isNotFound && articles.length === 0 && (
        <p className="empty-state">No good news yet.</p>
      )}
      {!isNotFound && articles.length > 0 && (
        <section className={category ? 'article-list' : 'article-grid'} aria-label="Good news articles">
          {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
        </section>
      )}
      {hasMore && (
        <div className="feed-actions">
          <button className="load-more" onClick={() => setPage((current) => current + 1)}>
            Load more stories
          </button>
          <span className="feed-count">Showing {articles.length} stories</span>
        </div>
      )}

      <footer className="site-footer">
        <p>Headlines link to the original publishers. Stories are selected for their good-news score.</p>
        <p>Open source · MIT licence</p>
      </footer>
    </main>
  );
}
