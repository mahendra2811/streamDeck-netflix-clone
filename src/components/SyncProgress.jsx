import { motion } from 'framer-motion';
import './SyncProgress.css';

export function SyncProgress({ cached, target }) {
  if (cached >= target) return null;
  const pct = Math.min(100, (cached / target) * 100);

  return (
    <div className="sync-progress" role="status">
      <div className="sync-progress__track">
        <motion.div
          className="sync-progress__fill"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="sync-progress__label">
        Caching shows for offline use: {cached.toLocaleString()} / {target.toLocaleString()}
      </span>
    </div>
  );
}
