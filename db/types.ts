// Row types for db/schema.sql. No Node imports, so the browser code can use them too.
export type CategoryId =
  | 'world' | 'politics' | 'business' | 'science' | 'technology'
  | 'health' | 'environment' | 'sport' | 'culture' | 'people';

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
  position: number;
}

export type GoodKindId = 'breakthrough' | 'nature' | 'systems' | 'peace' | 'inspiring' | 'kindness';

export interface GoodKind {
  id: GoodKindId;
  label: string;
  description: string;
  position: number;
}

export interface Article {
  id: number;
  url: string;
  source: string;
  source_category: string | null;
  title: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  fetched_at: string;
  source_country: string | null;   // ISO 3166-1 alpha-2, e.g. 'NG'; null for international outlets
  duplicate_of: number | null;     // id of the first article for the same story; null if this is it
  category: CategoryId | null;     // null until classified
  good_score: number | null;       // null until classified
  good_kind: GoodKindId | null;    // null until classified
  news_score: number | null;       // null until classified
}
