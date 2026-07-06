// Hand-rolled virtualization (no react-window - keeps the dependency
// surface to what CLAUDE.md allows): the grid container is sized to its
// full scroll height up front, then on every scroll/resize we recompute
// which row range is inside the viewport (+ overscan) and only mount
// TitleCards for that range, absolutely positioned. DOM node count stays
// bounded no matter how far into the 10k-item catalogue the user scrolls.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyTitles, useInfiniteScrollSentinel } from '../hooks/useLazyTitles';
import { TitleCard } from './TitleCard';
import { EmptyState } from './ui/EmptyState';
import { Spinner } from './ui/Spinner';
import './TitleGrid.css';

const MIN_CARD_WIDTH = 150;
const GAP = 16;
const META_HEIGHT = 44; // title + year line below the poster
const POSTER_RATIO = 1.5; // 2:3 poster -> height = width * 1.5
const OVERSCAN_ROWS = 2;

export function TitleGrid({ onSelectTitle, syncedCount }) {
  const { items, loading, exhausted, loadMore } = useLazyTitles(syncedCount);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ startRow: 0, endRow: 0 });

  const handleSelect = useCallback((title) => onSelectTitle(title), [onSelectTitle]);
  const sentinelRef = useInfiniteScrollSentinel(loadMore, [loadMore]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Columns are however many MIN_CARD_WIDTH-ish cards fit, but the card
  // width itself is stretched to exactly fill the row - no leftover strip
  // of empty space on wide viewports the way a fixed card width would leave.
  const columns = Math.max(1, Math.floor((containerWidth + GAP) / (MIN_CARD_WIDTH + GAP)));
  const cardWidth = containerWidth > 0 ? (containerWidth - (columns - 1) * GAP) / columns : MIN_CARD_WIDTH;
  const cardHeight = cardWidth * POSTER_RATIO + META_HEIGHT;
  const rowHeight = cardHeight + GAP;
  const totalRows = Math.ceil(items.length / columns);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let rafId = null;
    const recompute = () => {
      rafId = null;
      const rect = node.getBoundingClientRect();
      const scrolledPastTop = Math.max(0, -rect.top);
      const startRow = Math.max(0, Math.floor(scrolledPastTop / rowHeight) - OVERSCAN_ROWS);
      const endRow = Math.ceil((scrolledPastTop + window.innerHeight) / rowHeight) + OVERSCAN_ROWS;
      setVisibleRange({ startRow, endRow });
    };
    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(recompute);
    };

    recompute();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [rowHeight]);

  const startIndex = visibleRange.startRow * columns;
  const endIndex = Math.min(items.length, visibleRange.endRow * columns);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div className="title-grid-wrapper">
      <div
        ref={containerRef}
        className="title-grid"
        role="list"
        style={{ height: totalRows * rowHeight }}
      >
        {containerWidth > 0 &&
          visibleItems.map((title, i) => {
            const index = startIndex + i;
            const row = Math.floor(index / columns);
            const col = index % columns;
            return (
              <div
                key={title.id}
                className="title-grid__cell"
                style={{ top: row * rowHeight, left: col * (cardWidth + GAP), width: cardWidth }}
              >
                <TitleCard title={title} onSelect={handleSelect} priority={row === 0} />
              </div>
            );
          })}
      </div>

      {!exhausted && (
        <div ref={sentinelRef} className="title-grid__sentinel">
          {loading && <Spinner size={20} />}
        </div>
      )}

      {exhausted && items.length === 0 && (
        <EmptyState
          title="Nothing cached yet"
          description="Connect to the internet once to let the initial sync run."
        />
      )}
    </div>
  );
}
