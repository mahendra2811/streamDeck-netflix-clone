// src/lib/imdbApi.js
//
// Thin client around https://api.imdbapi.dev
// Docs: https://imdbapi.dev/imdbapi.swagger.yaml
//
// Every function accepts an optional AbortSignal so callers (React effects)
// can cancel in-flight requests on unmount -- this is one of the two or
// three places most "memory leak" bugs in list-heavy React apps come from
// (a fetch resolves after the component that started it is gone, and calls
// setState on an unmounted component / stale closure).

const BASE_URL = 'https://api.imdbapi.dev';

async function request(path, { signal } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { signal });
  if (!res.ok) {
    const err = new Error(`IMDbAPI ${res.status}: ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * List one page of titles.
 * types: e.g. ['TV_SERIES', 'TV_MINI_SERIES'] - restrict to "TV shows" per the brief.
 * pageToken: opaque cursor returned by the previous call, or undefined for page 1.
 */
export async function listTitles({
  types = ['TV_SERIES', 'TV_MINI_SERIES'],
  sortBy = 'SORT_BY_POPULARITY',
  sortOrder = 'DESC',
  pageToken,
  signal,
} = {}) {
  const params = new URLSearchParams();
  types.forEach((t) => params.append('types', t));
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  if (pageToken) params.set('pageToken', pageToken);

  const data = await request(`/titles?${params.toString()}`, { signal });
  return {
    titles: data.titles ?? [],
    nextPageToken: data.nextPageToken ?? null,
    totalCount: data.totalCount ?? null,
  };
}

export async function getTitle(titleId, { signal } = {}) {
  return request(`/titles/${titleId}`, { signal });
}

/** Server-side search - used as a fallback / verification against our local hash-map index. */
export async function searchTitlesRemote(query, { limit = 20, signal } = {}) {
  const params = new URLSearchParams({ query, limit: String(limit) });
  const data = await request(`/search/titles?${params.toString()}`, { signal });
  return data.titles ?? [];
}
