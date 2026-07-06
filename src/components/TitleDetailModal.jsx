import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { PosterImage } from './PosterImage';
import { recordWatch } from '../lib/db';
import { useWatchlistToggle } from '../hooks/useWatchlistToggle';
import { usePlayAction } from '../hooks/usePlayAction';
import './TitleDetailModal.css';

export function TitleDetailModal({ title, onClose }) {
  // Keep rendering the last title while the modal animates closed, instead
  // of the content disappearing a frame before the exit transition finishes.
  const [displayTitle, setDisplayTitle] = useState(title);
  useEffect(() => {
    if (title) setDisplayTitle(title);
  }, [title]);

  const { inWatchlist, toggle: toggleWatchlist } = useWatchlistToggle(displayTitle?.id);
  const { isLoading: playLoading, play } = usePlayAction(() => {
    if (displayTitle) recordWatch(displayTitle.id);
  });

  if (!displayTitle) return null;

  const rating = displayTitle.rating?.aggregateRating;

  return (
    <Modal open={Boolean(title)} onClose={onClose} labelledBy="title-detail-heading">
      <div className="title-detail">
        <div className="title-detail__poster">
          <PosterImage src={displayTitle.primaryImage?.url} alt={displayTitle.primaryTitle} />
        </div>
        <div className="title-detail__body">
          <h2 id="title-detail-heading" className="title-detail__title">
            {displayTitle.primaryTitle}
          </h2>
          <div className="title-detail__meta">
            <span>{displayTitle.startYear ?? '—'}</span>
            {rating != null && <Badge>{rating.toFixed(1)}★</Badge>}
            {displayTitle.genres?.length > 0 && (
              <span className="title-detail__genres">{displayTitle.genres.join(', ')}</span>
            )}
          </div>
          {displayTitle.plot && <p className="title-detail__plot">{displayTitle.plot}</p>}
          <div className="title-detail__actions">
            <Button onClick={play} disabled={playLoading}>
              {playLoading ? <Spinner size={16} /> : '▶ Play'}
            </Button>
            <Button variant="secondary" active={inWatchlist} onClick={toggleWatchlist}>
              {inWatchlist ? '✓ Added' : '+ Watchlist'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
