// src/lib/syncEngine.js
//
// Owns the process of getting ~10,000 titles from imdbapi.dev into
// IndexedDB, and re-syncing when the app comes back online. This is the
// module that satisfies:
//   - "10,000 different TV show selection UI ... using REST API"
//   - "app should be able to run offline with full API access"
//   - "when app is re-connected to internet, the content has to be updated"
//
// Strategy:
//   1. First run (or resume): page through /titles using pageToken cursor,
//      writing each page straight into IndexedDB as it arrives (not
//      accumulated in memory) until we hit TARGET_COUNT or run out of pages.
//      The cursor itself is persisted in `meta` so a refresh mid-sync
//      resumes instead of restarting from page 1.
//   2. On reconnect: re-fetch page 1 sorted by SORT_BY_RELEASE_DATE DESC
//      and upsert - new/changed titles overwrite by id (IndexedDB `put`),
//      which is enough to surface newly-released shows without re-pulling
//      all 10k. A full background top-up continues if we're still under
//      TARGET_COUNT (e.g. first sync got interrupted by going offline).

import { listTitles } from './imdbApi';
import { putTitles, getMeta, setMeta, getTitleCount } from './db';
import { onReconnect, getIsOnline } from '../store/connectivityStore';
import { searchIndex } from './searchIndex';

export const TARGET_COUNT = 10000;
// v2: bumped because the sort order changed (popularity -> user rating
// count, see imdbApi.js) - a cursor persisted under the old sort is
// meaningless under the new one, so old sessions just start over cleanly
// instead of resuming into wrong results.
const PAGE_TOKEN_KEY = 'sync.pageToken.v2';
const DONE_KEY = 'sync.initialSyncDone.v2';

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;
const RATE_LIMIT_BACKOFF_MS = 8000; // this API's 429s need real seconds to clear, not a quick retry
const PAGE_DELAY_MS = 300; // small gap between pages - the API rate-limits back-to-back requests

// Retries a single page fetch with backoff before giving up on this run - a
// flaky request shouldn't stall the whole sync, but we also don't want to
// hammer the API in a tight loop. Rate-limit errors get a much longer wait
// than generic ones, since retrying after 1-2s just hits the same limit again.
async function fetchPageWithBackoff(pageToken, signal) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted || !getIsOnline()) return null;
    try {
      return await listTitles({ pageToken, signal });
    } catch (err) {
      if (err.name === 'AbortError') return null;
      if (attempt === MAX_RETRIES) {
        console.warn('[syncEngine] page fetch failed after retries, will resume later:', err.message);
        return null;
      }
      const delay = err.isRateLimited ? RATE_LIMIT_BACKOFF_MS * (attempt + 1) : BACKOFF_BASE_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
}

// Guards against two runInitialSync loops racing each other - the periodic
// resume timer (see registerPeriodicResume below) can otherwise overlap with
// a run that's still working through its own backoff/retry delay.
let syncInFlight = false;

/**
 * Runs the bulk initial sync. Safe to call multiple times (idempotent) -
 * it no-ops once TARGET_COUNT is reached and DONE_KEY is set, and it's a
 * no-op while another call is already in flight.
 *
 * @param {(progress: {cached: number, target: number}) => void} onProgress
 * @param {AbortSignal} signal - abort if e.g. the app unmounts or goes offline mid-sync
 */
export async function runInitialSync(onProgress, signal) {
  if (syncInFlight) return;
  syncInFlight = true;

  try {
    const alreadyDone = await getMeta(DONE_KEY);
    let cached = await getTitleCount();
    onProgress?.({ cached, target: TARGET_COUNT });

    if (alreadyDone && cached >= TARGET_COUNT) return;

    let pageToken = await getMeta(PAGE_TOKEN_KEY);

    while (cached < TARGET_COUNT) {
      if (signal?.aborted) return;         // component unmounted / went offline
      if (!getIsOnline()) return;          // stop cleanly, resume later on reconnect

      const page = await fetchPageWithBackoff(pageToken, signal);
      if (!page) return; // aborted, went offline mid-backoff, or exhausted retries - periodic resume picks this up

      if (page.titles.length === 0) break; // exhausted the API's dataset

      await putTitles(page.titles);
      // Feed straight into the live search index too, so newly-synced titles
      // are searchable immediately without waiting for a full index rebuild.
      searchIndex.addTitles(page.titles);
      cached += page.titles.length;
      await setMeta(PAGE_TOKEN_KEY, page.nextPageToken);
      onProgress?.({ cached, target: TARGET_COUNT });

      if (!page.nextPageToken) break; // no more pages available
      pageToken = page.nextPageToken;

      await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
    }

    if (cached >= TARGET_COUNT) {
      await setMeta(DONE_KEY, true);
    }
  } finally {
    syncInFlight = false;
  }
}

/**
 * A rate-limit isn't a connectivity change, so it never fires the
 * onReconnect resume - without this, a sync that gives up mid-run because
 * the API rate-limited it would just stay stuck forever while the user
 * still shows as "online." Nudges runInitialSync periodically as a
 * self-heal; each call is a no-op once the target is reached or another
 * run is already in flight, so this is safe to leave running.
 */
export function registerPeriodicResume(onProgress, { intervalMs = 45000 } = {}) {
  const timer = setInterval(() => {
    runInitialSync(onProgress);
  }, intervalMs);
  return () => clearInterval(timer);
}

/**
 * Call once at app startup: wires up "when we come back online, refresh
 * content" per the brief. Returns an unsubscribe function.
 */
export function registerReconnectSync(onProgress) {
  return onReconnect(async () => {
    // 1) Pull the freshest page (newest releases / popularity re-ranked)
    //    and upsert - cheap, gives visibly "updated" content immediately.
    try {
      const freshPage = await listTitles({ sortBy: 'SORT_BY_RELEASE_DATE', sortOrder: 'DESC' });
      await putTitles(freshPage.titles);
      searchIndex.addTitles(freshPage.titles);
    } catch (err) {
      console.warn('[syncEngine] reconnect refresh failed:', err.message);
    }

    // 2) Resume the bulk top-up in case initial sync never reached 10k.
    const controller = new AbortController();
    runInitialSync(onProgress, controller.signal);
  });
}
