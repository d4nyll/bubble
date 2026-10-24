import { useEffect, useState } from 'react';
import * as isoCountries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import worldMapUrl from 'world-atlas/countries-110m.json?url';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import type { Article } from '../../db/types.ts';

type MapCountry = {
  code: string;
  name: string;
  article_count: number;
};

type ArticlesResponse = {
  articles: Article[];
};

isoCountries.registerLocale(enLocale);

export default function WorldMap({ minScore }: { minScore: number }) {
  const [countries, setCountries] = useState<MapCountry[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [story, setStory] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);
  const availableCodes = new Set(countries.map((country) => country.code));
  const activeCountry = countries.find((country) => country.code === activeCode);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/map-countries?min_score=${minScore}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Map countries request failed (${response.status})`);
        return response.json() as Promise<MapCountry[]>;
      })
      .then(setCountries)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setCountriesError(requestError instanceof Error ? requestError.message : 'Failed to load map countries');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCountriesLoaded(true);
      });

    return () => controller.abort();
  }, [minScore]);

  useEffect(() => {
    if (!activeCode) {
      setStory(null);
      setLoading(false);
      setStoryError(null);
      return;
    }

    const controller = new AbortController();
    setStory(null);
    setLoading(true);
    setStoryError(null);

    const params = new URLSearchParams({
      country: activeCode,
      min_score: String(minScore),
      limit: '1',
      page: '1',
    });
    fetch(`/api/articles?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Country stories request failed (${response.status})`);
        return response.json() as Promise<ArticlesResponse>;
      })
      .then((result) => setStory(result.articles[0] ?? null))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setStoryError(requestError instanceof Error ? requestError.message : 'Failed to load country story');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeCode, minScore]);

  return (
    <section className="world-map-section" aria-label="Good news around the world">
      <div className="world-map-frame" onMouseLeave={() => setActiveCode(null)}>
        <ComposableMap
          className="world-map"
          projection="geoEqualEarth"
          projectionConfig={{ scale: 150 }}
          aria-label="World map. Hover or focus a highlighted country to preview its latest good news."
        >
          <Geographies geography={worldMapUrl}>
            {({ geographies }) => geographies.map((geography) => {
              const code = geography.id === undefined
                ? undefined
                : isoCountries.numericToAlpha2(String(geography.id).padStart(3, '0'));
              const available = code !== undefined && availableCodes.has(code);
              const name = code ? isoCountries.getName(code, 'en') ?? code : 'Country';

              return (
                <Geography
                  key={geography.rsmKey}
                  geography={geography}
                  className={available ? 'map-country map-country--available' : 'map-country'}
                  aria-label={`${name}${available ? ', has good-news stories' : ''}`}
                  role={available ? 'button' : undefined}
                  tabIndex={available ? 0 : -1}
                  onMouseEnter={() => available && code && setActiveCode(code)}
                  onFocus={() => available && code && setActiveCode(code)}
                  onClick={() => available && code && setActiveCode(code)}
                  onKeyDown={(event) => {
                    if (available && code && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setActiveCode(code);
                    }
                  }}
                />
              );
            })}
          </Geographies>
        </ComposableMap>
        <div className="map-hint" role={countriesError ? 'alert' : undefined}>
          {countriesError
            ? countriesError
            : countriesLoaded && countries.length === 0
              ? 'Country stories will appear here as country-tagged articles arrive'
              : 'Hover over a highlighted country to preview a story'}
        </div>
        {activeCountry && (
          <aside className="map-story-card" aria-live="polite">
            <div className="map-story-meta">
              <span className="score-badge">
                {story?.good_score === null || story?.good_score === undefined
                  ? 'Good news'
                  : `${Math.round(story.good_score * 100)}% good`}
              </span>
              <span>{activeCountry.name} · {story?.source ?? `${activeCountry.article_count} stories`}</span>
            </div>
            {loading && <p>Finding a story…</p>}
            {!loading && storyError && <p role="alert">{storyError}</p>}
            {!loading && !storyError && story && (
              <>
                <strong>{story.title}</strong>
                <a href={story.url} target="_blank" rel="noreferrer">Read story <span aria-hidden="true">→</span></a>
              </>
            )}
            {!loading && !storyError && !story && <p>No matching stories right now.</p>}
          </aside>
        )}
      </div>
    </section>
  );
}
