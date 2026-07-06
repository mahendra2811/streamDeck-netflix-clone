import { useCallback, useEffect, useRef, useState } from 'react';
import { getWatchlist, getTitlesByIds, addToWatchlist as addToWatchlistDb, removeFromWatchlist as removeFromWatchlistDb } from '../lib/db';

export function useWatchlist() {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    const rows = await getWatchlist();
    const hydrated = await getTitlesByIds(rows.map((r) => r.id));
    if (!cancelledRef.current) setTitles(hydrated);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelledRef.current) setLoading(false);
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, [refresh]);

  const add = useCallback(async (id) => {
    await addToWatchlistDb(id);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await removeFromWatchlistDb(id);
    setTitles((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { titles, loading, add, remove, refresh };
}
