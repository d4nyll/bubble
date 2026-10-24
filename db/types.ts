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
  category: CategoryId;
  good_score: number;
}
