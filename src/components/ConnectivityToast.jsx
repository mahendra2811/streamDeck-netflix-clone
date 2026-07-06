// Fires a transient toast on every online<->offline transition, on top of
// the persistent ConnectivityBanner - the banner tells you the current
// state at a glance, this calls out the *moment* it changed.

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useConnectivity } from '../hooks/useConnectivity';
import './ConnectivityToast.css';

const DISMISS_MS = 3500;

export function ConnectivityToast() {
  const isOnline = useConnectivity();
  const [toast, setToast] = useState(null);
  const prevRef = useRef(isOnline);
  const timerRef = useRef(null);

  useEffect(() => {
    if (prevRef.current === isOnline) return; // initial mount, not a real transition
    prevRef.current = isOnline;

    setToast({ key: Date.now(), online: isOnline });

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), DISMISS_MS);
  }, [isOnline]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="connectivity-toast-region" aria-live="assertive">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            className={`connectivity-toast connectivity-toast--${toast.online ? 'online' : 'offline'}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="connectivity-toast__dot" />
            {toast.online ? 'Back online — content is updating' : "You're offline — showing cached shows"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
