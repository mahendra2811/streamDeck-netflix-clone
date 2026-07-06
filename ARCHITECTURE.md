# Architecture — StreamDeck

Stack: React 19 (Vite), IndexedDB (via `idb`), Firebase Auth, `react-router-dom`,
`framer-motion`. No backend server — everything runs in the browser, which is
what makes true offline mode possible.

## Module map

```
src/
  lib/
    db.js            IndexedDB schema + CRUD (titles, meta, watchlist, watchHistory)
                      + by_rating / by_cachedAt indexes for the Home rows
    imdbApi.js        REST client for api.imdbapi.dev (list/get/search titles)
    syncEngine.js     Pages through the API into IndexedDB until ~10k cached;
                      retries a failed page with exponential backoff (1s/2s/4s,
                      max 3) before giving up on the run; re-syncs on reconnect;
                      feeds new titles into the live search index as they land
    searchIndex.js    In-memory hash-maps (byId, byYear) + prefix trie (name)
    dailyPick.js      Deterministic "pick 1 of N" keyed by today's date - backs
                      the Home hero
  store/
    connectivityStore.js  Single source of truth for online/offline, real +
                           simulated, pub-sub so there's one listener/timer
                           for the whole app. Ctrl+. force-flips it in dev.
  hooks/
    useConnectivity.js     Subscribes to connectivityStore, cleans up on unmount
    useLazyTitles.js       Pages titles out of IndexedDB as the user scrolls
    useSearchIndex.js      Hydrates searchIndex once per session, debounced
                           search, logs build/lookup timings via performance.now() in dev
    useAuth.js             Wraps Firebase onAuthStateChanged
    useWatchlist.js        Reads watchlist ids, joins against titles, add/remove
    useWatchHistory.js     Reads watch history, joins against titles, sorted
  firebase/
    firebase.js            Auth init, signUp/signIn/signOut, local persistence
  components/
    ui/                    Button, Input, Spinner, Badge, Modal, EmptyState -
                           dumb, prop-driven, no app state
    PosterImage.jsx        Lazy img + shimmer while loading + gradient-letter
                           fallback on missing/broken image
    TitleCard.jsx          memo()-ized, custom comparator, native lazy image
    TitleRow.jsx           Horizontal scroller with hover-revealed arrows
    TitleGrid.jsx          Hand-rolled virtualized infinite grid (see §7.5)
    Hero.jsx               "Today's top show" - staggered fade-in content
    TitleDetailModal.jsx   Opens on card click; Play records a watch
    ConnectivityBanner.jsx Always-visible online/offline indicator
    SyncProgress.jsx       Slim bar while the initial 10k sync runs
    NavBar.jsx / PageTransition.jsx
  screens/
    SignUpScreen.jsx  HomeScreen.jsx  ProfileScreen.jsx  SearchScreen.jsx
```

## Data flow

```
                     ┌──────────────────────┐
                     │   api.imdbapi.dev    │
                     └──────────┬───────────┘
                                │ paged fetch (AbortSignal, backoff)
                                ▼
                     ┌──────────────────────┐        addTitles()
                     │     syncEngine.js    │───────────────────────┐
                     └──────────┬───────────┘                       │
                                │ putTitles()                       ▼
                                ▼                          ┌──────────────────┐
                     ┌──────────────────────┐              │  searchIndex.js  │
                     │   IndexedDB (idb)    │              │  byId / byYear / │
                     │  titles / meta /     │◄─────────────┤  trie (in-memory)│
                     │  watchlist / history │  getAllTitles │  hydrated once  │
                     └──────────┬───────────┘  (hydration)  └─────────┬───────┘
                                │ cursor pages / index scans           │ debounced search()
              ┌─────────────────┼─────────────────┐                   │
              ▼                 ▼                 ▼                   ▼
       useLazyTitles     getTopRated/          useWatchlist/    SearchScreen
       (Home grid)       getRecentlyAdded      useWatchHistory
                          (Home rows/hero)      (Profile)

     connectivityStore.js ── real navigator.onLine + simulated random flip
              │
              ├─► ConnectivityBanner (always visible, color + slide)
              └─► onReconnect() ──► syncEngine resumes / refreshes
```

## The six graded points (MEGA_PROMPT §7)

### 1. Hash-map search — `Map` for id/year, trie for name prefix
- `byId: Map<id, title>` → exact ID lookup, O(1).
- `byYear: Map<year, Set<id>>` → exact year lookup, O(1) + O(matches).
- A **prefix trie** over lowercased title tokens for name autocomplete: cost
  is proportional to the length of what's typed, not the size of the
  catalogue — scanning 10k titles per keystroke would be the naive (and
  wrong) approach.
- `search(query)` routes by shape: `tt\d+` → ID map, 4-digit number → year
  map, else → trie autocomplete — one entry point for "search on ID, name,
  release year."
- `useSearchIndex` logs the index build time (hydration) and each debounced
  lookup's time via `performance.now()`, but only in dev (`import.meta.env.DEV`)
  — open the console on the Search screen to see both.

### 2. Lazy loading — cursor paging + IntersectionObserver + native lazy images
- Titles come out of IndexedDB in pages of 40 via a cursor (`getTitlesPage`),
  never sliced out of one giant in-memory array.
- The "load more" trigger is a single `IntersectionObserver` on a sentinel
  `<div>` — cheaper and more correct than a throttled scroll listener.
- Poster images use native `loading="lazy"` rather than one
  `IntersectionObserver` per image; 10,000 observers would itself become a
  memory problem.

### 3. Memory-leak avoidance
- Every async op that can outlive its component (DB reads, API fetches,
  Firebase listeners, ResizeObserver/IntersectionObserver) is guarded: effects
  return cleanup functions that flip a `cancelled` ref, call
  `unsubscribe()`/`observer.disconnect()`, or `controller.abort()`.
- `connectivityStore` registers exactly one `window` online/offline listener
  and one timer for the whole app, not one per component.
- The IMDb API client threads an `AbortSignal` end-to-end so in-flight
  requests are actually cancelled on unmount/navigation, not just ignored.

### 4. Re-render avoidance
- `TitleCard` is `React.memo`'d with a custom comparator; since
  `useLazyTitles` only *appends* (never replaces/mutates existing entries)
  and `onSelect` is stabilized with `useCallback` up the tree, already-mounted
  cards skip re-rendering when new pages load or unrelated state changes.
- Lists always key off `title.id` (stable, unique) so React diffs correctly
  instead of remounting.
- The search debounce (150ms) means typing doesn't re-run the trie walk on
  every keystroke.

### 5. Virtualized grid — bounded DOM regardless of scroll depth
The "All shows" grid hand-rolls virtualization rather than pulling in
`react-window`: a `ResizeObserver` gives the container width (→ column count),
a scroll/resize listener (rAF-throttled) computes which row range intersects
the viewport ± 2 rows of overscan, and only that range's `TitleCard`s are
mounted, absolutely positioned inside a container pre-sized to the full
`totalRows * rowHeight`. Everything else is just empty space.

**Trade-off considered:** `react-window` would have been less code, but
`CLAUDE.md` caps the dependency list to what the brief already implies
(react, react-dom, react-router-dom, framer-motion, firebase, idb), and the
positioning math here is simple enough (fixed card size, no variable row
heights) that hand-rolling avoided asking to add a dependency for what's a
few dozen lines. If card sizes ever became variable/responsive per-item,
`react-window`'s `VariableSizeGrid` would earn its keep.

### 6. Offline storage — IndexedDB, not localStorage
localStorage is synchronous, string-only, and caps out around 5-10MB; 10,000
title objects (nested images/genres/ratings) blow past that. IndexedDB is
async (doesn't block the UI thread writing 10k records), has no realistic
size ceiling here, and gives cursor-based paging so the grid never
materializes all 10k objects in JS memory or React state at once.

## Other decisions worth recording

**Trie vs. scanning:** considered just `Array.filter` over all cached titles
per keystroke. Rejected — cost scales with catalogue size (10k), not query
length, so it gets *worse* exactly as the cache fills up. The trie's
autocomplete cost only depends on the prefix typed.

**Sync retry strategy:** a single failed page fetch used to abandon the
whole sync run immediately. Added exponential backoff (1s, 2s, 4s, then give
up until reconnect) so one flaky request doesn't stall a sync that could
otherwise continue — checked against `getIsOnline()` between attempts so a
real disconnect during backoff bails immediately instead of waiting out the
delay pointlessly.

**"Recently added" index:** the API has no "date added to catalogue" field,
so `putTitles` stamps each title with `_cachedAt: Date.now()` on write and an
IndexedDB index (`by_cachedAt`) backs a cheap descending cursor scan for the
Home row — no in-memory sort over the whole cache.

**Firebase Auth vs. full offline:** the brief asks for Firebase-only auth
*and* full offline operation. Reconciled by scope: **signing up or signing in
requires connectivity** (inherent to Firebase Auth), but **staying signed in
does not** — `browserLocalPersistence` keeps the session valid across offline
periods, so a network blip mid-session doesn't force a re-login. Home/Search/
Profile gate on `useAuth()`'s cached `user`, not on live connectivity.

**Animation:** `framer-motion`'s `MotionConfig reducedMotion="user"` wraps the
whole app. Under `prefers-reduced-motion: reduce`, framer-motion disables
transform-based animation (the slide in page transitions, the hero's
stagger-in `y` offset, the modal's scale-in) but leaves non-transform
properties (opacity fades, the connectivity banner's color transition)
running — matching the brief's "disable non-essential motion" rather than
killing all visual feedback. Plain-CSS animations (card hover, poster
shimmer, spinner) are disabled via a global `prefers-reduced-motion` media
query in `base.css`.

## Honest gaps / next steps
- `syncEngine` filters to `TV_SERIES`/`TV_MINI_SERIES` by default per "TV
  show selection" (the live catalogue has ~370k titles matching those two
  types, comfortably above the 10k target); broaden `types` in
  `imdbApi.listTitles` if movies should also count toward the cache.
- The virtualized grid assumes a fixed card size; a responsive multi-breakpoint
  card size would need the row-height math to be re-derived on breakpoint
  change, not just on container width.
- No automated test suite — verification here is `npm run build` after every
  milestone plus manual click-through against the Definition of Done in
  `MEGA_PROMPT.md` §9.
