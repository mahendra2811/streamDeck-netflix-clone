import { useCallback, useEffect, useRef, useState } from 'react';

const LOADER_MS = 2000;

// Stands in for buffering, since there's no real video player here: the
// Play button shows a spinner for a couple seconds, then runs the actual
// action (record the watch, open the detail modal, etc).
export function usePlayAction(onPlay) {
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const play = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    timerRef.current = setTimeout(() => {
      setIsLoading(false);
      onPlay();
    }, LOADER_MS);
  }, [isLoading, onPlay]);

  return { isLoading, play };
}
