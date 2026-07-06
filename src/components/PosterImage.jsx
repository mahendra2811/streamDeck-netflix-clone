import { useState } from 'react';
import './PosterImage.css';

export function PosterImage({ src, alt }) {
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
        loading="lazy"
        decoding="async"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  );
}
