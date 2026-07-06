// src/lib/searchIndex.js
//
// "Implement search with hash-map with autocomplete support. Search done on
// ID, name, release year."
//
// Three structures, all built once from the cached titles and kept in
// memory (rebuilt incrementally as new titles get synced in):
//
//   byId    : Map<id, title>                     -> O(1) exact ID lookup
//   byYear  : Map<year, Set<id>>                  -> O(1) exact year lookup
//   trie    : prefix tree over lowercased word    -> O(k) autocomplete,
//             tokens from primaryTitle              k = length of the typed prefix
//             each trie node stores a Set<id> of titles whose tokens pass through it
//
// A trie (rather than scanning all 10k titles per keystroke) is what makes
// autocomplete cheap: the cost of suggesting matches is proportional to the
// length of what the user typed, not the size of the catalogue.

function tokenize(title) {
  return (title || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

class TrieNode {
  constructor() {
    this.children = new Map(); // char -> TrieNode
    this.titleIds = new Set(); // ids of titles that have a token passing through this node
  }
}

export class SearchIndex {
  constructor() {
    this.byId = new Map();
    this.byYear = new Map();
    this.root = new TrieNode();
  }

  /** Add or update a batch of titles in all three structures. */
  addTitles(titles) {
    for (const title of titles) {
      this.byId.set(title.id, title);

      if (title.startYear) {
        if (!this.byYear.has(title.startYear)) this.byYear.set(title.startYear, new Set());
        this.byYear.get(title.startYear).add(title.id);
      }

      for (const token of tokenize(title.primaryTitle)) {
        this._insertToken(token, title.id);
      }
    }
  }

  _insertToken(token, titleId) {
    let node = this.root;
    for (const ch of token) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
      node.titleIds.add(titleId);
    }
  }

  /** Exact ID lookup - O(1). */
  findById(id) {
    return this.byId.get(id) ?? null;
  }

  /** Exact release-year lookup - O(1) plus O(m) to materialize m results. */
  findByYear(year) {
    const ids = this.byYear.get(Number(year));
    if (!ids) return [];
    return Array.from(ids, (id) => this.byId.get(id)).filter(Boolean);
  }

  /**
   * Autocomplete: returns titles whose name contains a token starting with
   * `prefix`. Walks the trie by the prefix's characters (O(prefix length)),
   * then collects the id set stored at that node.
   */
  autocomplete(prefix, { limit = 10 } = {}) {
    const p = prefix.toLowerCase().trim();
    if (!p) return [];

    let node = this.root;
    for (const ch of p) {
      const next = node.children.get(ch);
      if (!next) return []; // no titles have any token with this prefix
      node = next;
    }

    const results = [];
    for (const id of node.titleIds) {
      results.push(this.byId.get(id));
      if (results.length >= limit) break;
    }
    return results;
  }

  /**
   * Unified search entry point used by the Search screen: routes to the
   * right structure based on what the query looks like.
   *   - "tt1234567" / "nm1234567"  -> ID lookup
   *   - a 4-digit number           -> year lookup
   *   - anything else              -> name autocomplete
   */
  search(query, opts) {
    const q = query.trim();
    if (/^tt\d+$/i.test(q)) {
      const hit = this.findById(q.toLowerCase());
      return hit ? [hit] : [];
    }
    if (/^\d{4}$/.test(q)) {
      return this.findByYear(q);
    }
    return this.autocomplete(q, opts);
  }

  get size() {
    return this.byId.size;
  }
}

// Single shared instance for the app (populated by the sync engine /
// hydrated from IndexedDB at startup - see hooks/useSearchIndex.js).
export const searchIndex = new SearchIndex();
