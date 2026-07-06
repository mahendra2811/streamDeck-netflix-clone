// src/lib/db.js
//
// Single IndexedDB database backing the whole app so it can run offline
// with "full API access" (i.e. full access to whatever we've already cached).
//
// Object stores:
//   titles        - keyPath 'id'  (tt1234567 -> full imdbapiTitle object)
//   meta          - keyPath 'key' (small key/value bag: pageToken cursor, lastSyncedAt, totalCached)
//   watchlist     - keyPath 'id'  (title ids the user added)
//   watchHistory  - keyPath 'id'  (title ids the user opened, with watchedAt timestamp)
//
// We use the `idb` package (thin promise wrapper around the native
// IndexedDB API) instead of hand-rolled callback code so the rest of the
// app can just `await` everything.

import { openDB } from 'idb';

const DB_NAME = 'shortform-media-db';
const DB_VERSION = 2;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        let titles;
        if (!db.objectStoreNames.contains('titles')) {
          titles = db.createObjectStore('titles', { keyPath: 'id' });
          titles.createIndex('by_startYear', 'startYear');
          titles.createIndex('by_primaryTitle', 'primaryTitle');
        } else {
          titles = tx.objectStore('titles');
        }
        // v2: indexes backing the Home screen's "Top rated" / "Recently
        // added" rows, so those reads are index scans, not full-table scans.
        if (oldVersion < 2) {
          titles.createIndex('by_rating', 'rating.aggregateRating');
          titles.createIndex('by_cachedAt', '_cachedAt');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('watchlist')) {
          db.createObjectStore('watchlist', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('watchHistory')) {
          db.createObjectStore('watchHistory', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ---- titles ----------------------------------------------------------

export async function putTitles(titleArray) {
  const db = await getDB();
  const tx = db.transaction('titles', 'readwrite');
  const cachedAt = Date.now();
  await Promise.all([
    // _cachedAt tracks when *we* cached it, not the show's release date -
    // that's what "Recently added" on the Home screen sorts by.
    ...titleArray.map((t) => tx.store.put({ ...t, _cachedAt: cachedAt })),
    tx.done,
  ]);
}

export async function getAllTitles() {
  const db = await getDB();
  return db.getAll('titles');
}

export async function getTitleCount() {
  const db = await getDB();
  return db.count('titles');
}

export async function getTitle(id) {
  const db = await getDB();
  return db.get('titles', id);
}

export async function getTitlesByIds(ids) {
  const db = await getDB();
  const tx = db.transaction('titles');
  const results = await Promise.all(ids.map((id) => tx.store.get(id)));
  await tx.done;
  return results.filter(Boolean);
}

// Walks the by_rating index in descending order - cheap compared to
// loading all titles into memory and sorting there.
export async function getTopRated(limit = 20) {
  const db = await getDB();
  const tx = db.transaction('titles');
  const index = tx.store.index('by_rating');
  const results = [];
  let cursor = await index.openCursor(null, 'prev');
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }
  await tx.done;
  return results;
}

// Walks the by_cachedAt index in descending order - most recently synced first.
export async function getRecentlyAdded(limit = 20) {
  const db = await getDB();
  const tx = db.transaction('titles');
  const index = tx.store.index('by_cachedAt');
  const results = [];
  let cursor = await index.openCursor(null, 'prev');
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }
  await tx.done;
  return results;
}

// Cursor-based paged read straight from IndexedDB, used by the lazy-loading
// grid so we never hold all 10k objects in React state at once.
export async function getTitlesPage({ offset = 0, limit = 40 } = {}) {
  const db = await getDB();
  const tx = db.transaction('titles');
  let cursor = await tx.store.openCursor();
  if (offset > 0 && cursor) {
    cursor = await cursor.advance(offset);
  }
  const page = [];
  while (cursor && page.length < limit) {
    page.push(cursor.value);
    cursor = await cursor.continue();
  }
  await tx.done;
  return page;
}

// ---- meta (sync cursor, counters) ------------------------------------

export async function getMeta(key) {
  const db = await getDB();
  const row = await db.get('meta', key);
  return row?.value;
}

export async function setMeta(key, value) {
  const db = await getDB();
  await db.put('meta', { key, value });
}

// ---- watchlist / history ----------------------------------------------

export async function addToWatchlist(titleId) {
  const db = await getDB();
  await db.put('watchlist', { id: titleId, addedAt: Date.now() });
}

export async function removeFromWatchlist(titleId) {
  const db = await getDB();
  await db.delete('watchlist', titleId);
}

export async function getWatchlist() {
  const db = await getDB();
  return db.getAll('watchlist');
}

export async function recordWatch(titleId) {
  const db = await getDB();
  await db.put('watchHistory', { id: titleId, watchedAt: Date.now() });
}

export async function getWatchHistory() {
  const db = await getDB();
  const rows = await db.getAll('watchHistory');
  return rows.sort((a, b) => b.watchedAt - a.watchedAt);
}
