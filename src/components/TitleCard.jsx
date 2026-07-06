// Memoized so that when useLazyTitles appends new items to the array,
// React only mounts/renders the *new* cards - already-rendered ones bail
// out because their props (a stable title object + stable onSelect) haven't
// changed.

import { memo } from 'react';
import { PosterImage } from './PosterImage';
import { Badge } from './ui/Badge';
import './TitleCard.css';

function TitleCardImpl({ title, onSelect, priority = false }) {
  const year = title.startYear ?? '—';
  const rating = title.rating?.aggregateRating;

  return (
    <button className="title-card" onClick={() => onSelect(title)} title={title.primaryTitle}>
      <div className="title-card__poster-wrap">
        <PosterImage src={title.primaryImage?.url} alt={title.primaryTitle} priority={priority} />
        {rating != null && (
          <Badge tone="neutral" className="title-card__rating">
            {rating.toFixed(1)}★
          </Badge>
        )}
      </div>
      <div className="title-card__meta">
        <span className="title-card__name">{title.primaryTitle}</span>
        <span className="title-card__year">{year}</span>
      </div>
    </button>
  );
}

function areEqual(prev, next) {
  return prev.title === next.title && prev.onSelect === next.onSelect && prev.priority === next.priority;
}

export const TitleCard = memo(TitleCardImpl, areEqual);
