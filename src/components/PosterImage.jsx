import { useState } from 'react';
import './PosterImage.css';

// priority: for above-the-fold cards (first row of a row/grid) - native
// loading="lazy" actually delays the very first paint since browsers wait
// to confirm layout before fetching, which fights against "show photos from
// the top as fast as possible." Priority images skip that deferral.
export function PosterImage({ src, alt, priority = false }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="poster poster--fallback" aria-hidden="true">
        <span>{alt?.[0]?.toUpperCase() ?? '?'}</span>
      </div>
    );
  }

  return (
    <div className="poster">
      {!loaded && <div className="poster__shimmer" />}
      <img
        className="poster__img"
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  );
}
