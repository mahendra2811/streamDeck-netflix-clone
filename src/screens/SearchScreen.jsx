import { useCallback, useState } from 'react';
import { useSearchIndex } from '../hooks/useSearchIndex';
import { TitleCard } from '../components/TitleCard';
import { TitleDetailModal } from '../components/TitleDetailModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import './SearchScreen.css';

export function SearchScreen({ onSelectTitle, selectedTitle, onCloseModal }) {
  const { ready, search, indexSize } = useSearchIndex();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      setActiveIndex(-1);
      if (!value.trim()) {
        setResults([]);
        return;
      }
      search(value, setResults);
    },
    [search]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown' && results.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === 'ArrowUp' && results.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        const target = results[activeIndex] ?? results[0];
        if (target) onSelectTitle(target);
      } else if (e.key === 'Escape') {
        setQuery('');
        setResults([]);
        setActiveIndex(-1);
      }
    },
    [results, activeIndex, onSelectTitle]
  );

  const trimmed = query.trim();

  return (
    <div className="search-screen">
      <Input
        type="text"
        placeholder={ready ? 'Search by name, ID (tt...), or year' : 'Indexing cached titles...'}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={!ready}
        autoFocus
        autoComplete="off"
      />

      {trimmed && ready && (
        <p className="search-screen__hint">
          {results.length} result{results.length === 1 ? '' : 's'} — searching {indexSize.toLocaleString()} cached titles
        </p>
      )}

      {results.length > 0 && (
        <div className="search-screen__results" role="listbox">
          {results.map((title, i) => (
            <div
              key={title.id}
              role="option"
              aria-selected={i === activeIndex}
              className={`search-screen__result ${i === activeIndex ? 'search-screen__result--active' : ''}`}
            >
              <TitleCard title={title} onSelect={onSelectTitle} />
            </div>
          ))}
        </div>
      )}

      {ready && trimmed && results.length === 0 && (
        <EmptyState title="No matches" description="Nothing in the cached catalogue matches that search." />
      )}
      {!trimmed && (
        <EmptyState
          title="Search by name, ID, or year"
          description='Try a show title, an ID like "tt0903747", or a 4-digit year.'
        />
      )}

      <TitleDetailModal title={selectedTitle} onClose={onCloseModal} />
    </div>
  );
}
