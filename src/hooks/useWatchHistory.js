import { useEffect, useRef, useState } from 'react';
import { getWatchHistory, getTitlesByIds } from '../lib/db';

export function useWatchHistory() {
  const [entries, setEntries] = useState([]); // [{ title, watchedAt }], most recent first
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      const rows = await getWatchHistory();
      const titles = await getTitlesByIds(rows.map((r) => r.id));
      const byId = new Map(titles.map((t) => [t.id, t]));
      const hydrated = rows.map((r) => ({ title: byId.get(r.id), watchedAt: r.watchedAt })).filter((e) => e.title);
      if (!cancelledRef.current) {
        setEntries(hydrated);
        setLoading(false);
      }
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return { entries, loading };
}
