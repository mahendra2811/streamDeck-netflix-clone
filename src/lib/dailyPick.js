// Deterministic "pick one of N" keyed by today's date, so the Home hero
// changes daily but stays stable across reloads within the same day -
// same inputs (date + list) always hash to the same index.

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickDaily(items) {
  if (items.length === 0) return null;
  const dateKey = new Date().toISOString().slice(0, 10);
  return items[hashString(dateKey) % items.length];
}
