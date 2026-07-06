# Mentor notes

Talking points for walking through StreamDeck in a review. First person,
plain, no marketing.

## What I built

A Netflix-style browser app that caches up to 10,000 TV shows from
api.imdbapi.dev into IndexedDB, works fully offline once cached, and has
four screens: sign-up/sign-in (Firebase), home (hero + rows + a virtualized
grid of everything cached), search (hash-map + trie autocomplete, works
offline), and profile (watchlist, watch history, sign-out). Connectivity
flips between online and offline both from the real network and a simulated
random flip, and the UI reflects whichever one is currently "worse."

## The hardest problems, and how I solved them

**Getting 10,000 records into the browser without it feeling like it.**
The naive version pages through the API and just keeps calling
`setState` with the growing array — that gets slow and memory-heavy well
before 10k. Instead the sync engine writes each page straight into
IndexedDB as it arrives and never holds more than one page in memory. The
UI never reads "all the titles" either — the grid asks IndexedDB for the
next 40 via a cursor. The pagination cursor itself is persisted, so if you
refresh mid-sync it picks up where it left off instead of starting over.

**Virtualizing the grid without adding a dependency.** The brief and my own
rule (keep the dependency list to what's actually needed) both pointed away
from just `npm install react-window`. So I measured the grid container with
a `ResizeObserver` to get column count, and on scroll I compute which row
range is inside the viewport (plus two rows of overscan) and only mount
`TitleCard`s for that range, absolutely positioned. It's more code than
`react-window` would have been, but it's not complicated code — fixed card
size keeps the math simple. If cards ever needed to be responsive per-item
I'd probably reach for `react-window` at that point rather than extend the
hand-rolled version.

**Leak-proofing every effect.** This is the boring one but it's where most
of the actual bugs would have hidden. Every `useEffect` that starts
something async — a DB read, an API fetch, a Firebase listener, an
observer — has a cleanup that either flips a `cancelled` flag before calling
`setState`, or explicitly unsubscribes/disconnects/aborts. I leaned on this
being consistent rather than clever: the pattern is the same everywhere
(`useLazyTitles`, `useWatchlist`, `useWatchHistory`, `useConnectivity`), so
there's nothing subtle to remember per-hook.

**Firebase Auth wanting a network, offline mode not wanting to need one.**
These two requirements are in tension by definition — you can't create or
verify a Firebase session without hitting Google's servers. I resolved it
by scoping where connectivity is required: signing up or signing in needs
it, staying signed in doesn't. `browserLocalPersistence` keeps the session
valid through a network blip, and the route guard checks the cached
Firebase user, not live connectivity. So the app can go offline mid-session
and nothing kicks the user back to the sign-up screen.

**Search that doesn't get slower as the cache grows.** A trie means
autocomplete cost depends on how much you've typed, not how many titles are
cached — that's the whole point of not just doing
`titles.filter(t => t.name.includes(query))`. I added `performance.now()`
timing around the index build and each lookup (console-only, dev builds
only) so this is a measured claim, not just an assumed one.

## What I'd do next with more time

- A real automated test pass — right now correctness is "build passes +
  manual click-through against the Definition of Done," which is fine for
  an assessment but I wouldn't ship it to production without unit tests
  around the search index and the sync engine's resume logic.
- Responsive card sizing in the grid — right now it's a fixed 160px card,
  which keeps the virtualization math simple but doesn't adapt below
  desktop widths the way a real product would need to.
- The "recently added" row is sorted by when *I* cached a title, not by
  the show's actual release date, because the API doesn't expose a
  catalogue-add timestamp. It's honest about what it's showing, but a real
  backend would probably want to expose that field directly.
