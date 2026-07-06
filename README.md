# StreamDeck

A Netflix-style desktop web app for browsing TV shows. Built for an assessment
brief: cache 10,000 titles from a public REST API into IndexedDB, keep the app
fully usable offline, and support hash-map/trie search with autocomplete.
React + Vite, plain CSS, Firebase for auth only.

## Stack

- React 19 (Vite, JavaScript/ES6 — no TypeScript)
- `react-router-dom` for routing
- `framer-motion` for screen transitions and micro-interactions
- `firebase` (Auth only — email/password)
- `idb` (IndexedDB wrapper)
- Plain CSS with custom properties — no Tailwind, no CSS-in-JS

## Setup

```bash
npm install
cp .env.example .env
```

Then create a Firebase project and fill in `.env`:

1. [console.firebase.google.com](https://console.firebase.google.com) → Add project.
2. Build → Authentication → Get started → enable the **Email/Password** sign-in method.
3. Project settings → Your apps → add a Web app → copy the config values into `.env`.

`.env` is gitignored; never commit real Firebase keys.

## Run

```bash
npm run dev       # dev server
npm run build     # production build
npm run preview   # preview the production build
```

## Known limitations

- The "recently added" row is sorted by when *we* cached a title, not by the
  show's actual release date — there's no server-side "date added to catalogue"
  field to sort on.
- Random connectivity flips are simulated client-side (biased 80% online); it
  is not tied to an actual network condition beyond the real `navigator.onLine`
  state, so a demo can look "offline" while your own connection is fine.
- Desktop-first, minimum layout width ~1024px, per the brief; no dedicated
  mobile layout.
