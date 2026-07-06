import { useCallback, useEffect, useState } from 'react';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '../lib/db';

// Drives the +Watchlist / Added state for a single title - checks current
// membership on mount, then flips optimistically on click so the button
// reflects the change immediately instead of waiting on the IndexedDB write.
export function useWatchlistToggle(titleId) {
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (!titleId) return;
    let cancelled = false;
    isInWatchlist(titleId).then((result) => {
      if (!cancelled) setInWatchlist(result);
    });
    return () => {
      cancelled = true;
    };
  }, [titleId]);

  const toggle = useCallback(() => {
    if (!titleId) return;
    if (inWatchlist) {
      setInWatchlist(false);
      removeFromWatchlist(titleId);
    } else {
      setInWatchlist(true);
      addToWatchlist(titleId);
    }
  }, [titleId, inWatchlist]);

  return { inWatchlist, toggle };
}
