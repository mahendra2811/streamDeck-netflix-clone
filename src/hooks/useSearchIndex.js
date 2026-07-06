// src/hooks/useSearchIndex.js
//
// Hydrates the module-level `searchIndex` (see lib/searchIndex.js) from
// IndexedDB exactly once per app session (not once per component mount -
// guarded by a module-level flag), then gives components a debounced
// `search(query)` function for the autocomplete box.

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAllTitles } from '../lib/db';
import { searchIndex } from '../lib/searchIndex';

let hydrated = false;
let hydratingPromise = null;

async function ensureHydrated() {
  if (hydrated) return;
  if (!hydratingPromise) {
    hydratingPromise = getAllTitles().then((titles) => {
      const start = import.meta.env.DEV ? performance.now() : 0;
      searchIndex.addTitles(titles);
      if (import.meta.env.DEV) {
        const ms = (performance.now() - start).toFixed(1);
        console.info(`[searchIndex] built hash-maps + trie for ${titles.length} titles in ${ms}ms`);
      }
      hydrated = true;
    });
  }
  await hydratingPromise;
}

export function useSearchIndex() {
  const [ready, setReady] = useState(hydrated);
  const debounceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    ensureHydrated().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Debounced so we run at most one trie walk per ~150ms of typing, not one
  // per keystroke.
  const search = useCallback((query, callback) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const start = import.meta.env.DEV ? performance.now() : 0;
      const results = searchIndex.search(query);
      if (import.meta.env.DEV) {
        const ms = (performance.now() - start).toFixed(2);
        console.info(`[searchIndex] lookup "${query}" -> ${results.length} results in ${ms}ms`);
      }
      callback(results);
    }, 150);
  }, []);

  // Clean up any pending debounce timer on unmount.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { ready, search, indexSize: searchIndex.size };
}
