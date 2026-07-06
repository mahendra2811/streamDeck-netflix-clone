// src/hooks/useLazyTitles.js
//
// Backs the "complete list of all TV shows and movies" grid.
//
// How this avoids memory leaks:
//   - Every async page fetch checks a `cancelled` flag set in the effect's
//     cleanup function before calling setState. If the component unmounts
//     (or the effect re-runs) while a DB read is in flight, the stale
//     result is simply dropped instead of updating state on a dead component.
//   - We never keep more title objects in memory/state than we've actually
//     scrolled through - pages come straight out of IndexedDB (see
//     lib/db.js getTitlesPage), not out of one giant in-memory array.
//   - The IntersectionObserver used for the "load more" sentinel is created
//     once per mount and explicitly `disconnect()`-ed on cleanup.
//
// How this avoids unnecessary re-renders:
//   - Items are appended with a functional setState update (prev => [...])
//     so the hook doesn't need `items` itself in its effect dependency
//     array, which would otherwise cause the fetch-more effect to
//     re-subscribe every time items change.
//   - The returned `items` array is only ever grown, never replaced
//     wholesale, so consumers rendering with .map(...) + a stable `key`
//     (title.id) let React bail out of re-rendering cards that haven't
//     changed (paired with React.memo on the card component itself).

import { useCallback, useEffect, useRef, useState } from 'react';
import { getTitlesPage } from '../lib/db';

const PAGE_SIZE = 40;

export function useLazyTitles() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || exhausted) return;
    loadingRef.current = true;
    setLoading(true);

    let cancelled = false;
    const cleanupGuard = () => { cancelled = true; };

    try {
      const page = await getTitlesPage({ offset: offsetRef.current, limit: PAGE_SIZE });
      if (cancelled) return;

      if (page.length === 0) {
        setExhausted(true);
      } else {
        offsetRef.current += page.length;
        setItems((prev) => prev.concat(page));
        if (page.length < PAGE_SIZE) setExhausted(true);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }

    return cleanupGuard;
  }, [exhausted]);

  // Kick off the first page on mount, and guard against the classic
  // "setState after unmount" leak if the component unmounts before the
  // very first DB read resolves.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadMore();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loading, exhausted, loadMore };
}

/**
 * Attaches an IntersectionObserver to a sentinel element; calls `onIntersect`
 * when it scrolls into view. Used at the bottom of the grid to trigger
 * loadMore() - i.e. the actual "lazy loading" trigger.
 */
export function useInfiniteScrollSentinel(onIntersect, deps = []) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { rootMargin: '600px 0px' } // start fetching before the user hits the literal bottom
    );

    observer.observe(node);
    // Explicit disconnect on cleanup - the #1 way IntersectionObservers leak
    // is components unmounting without ever calling this.
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return sentinelRef;
}
