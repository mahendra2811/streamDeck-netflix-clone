import { motion } from 'framer-motion';
import { useConnectivity } from '../hooks/useConnectivity';
import './ConnectivityBanner.css';

export function ConnectivityBanner() {
  const isOnline = useConnectivity();

  return (
    <motion.div
      className="connectivity-banner"
      role="status"
      aria-live="polite"
      initial={{ y: -24, opacity: 0 }}
      animate={{
        y: 0,
        opacity: 1,
        // literal hex, not the CSS var, so framer-motion can interpolate the color smoothly
        backgroundColor: isOnline ? '#2ecc71' : '#e63946',
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="connectivity-banner__dot" />
      {isOnline ? 'Online' : 'Offline — showing cached shows'}
    </motion.div>
  );
}
