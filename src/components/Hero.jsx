import { motion } from 'framer-motion';
import { addToWatchlist, recordWatch } from '../lib/db';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import './Hero.css';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero({ title, onSelect }) {
  const rating = title.rating?.aggregateRating;

  const handlePlay = () => {
    recordWatch(title.id);
    onSelect(title);
  };

  return (
    <div className="hero" style={{ backgroundImage: `url(${title.primaryImage?.url ?? ''})` }}>
      <div className="hero__scrim" />
      <motion.div
        className="hero__content"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.p className="hero__eyebrow" variants={fadeUp}>
          Today's top show
        </motion.p>
        <motion.h1 className="hero__title" variants={fadeUp}>
          {title.primaryTitle}
        </motion.h1>
        <motion.div className="hero__meta" variants={fadeUp}>
          <span>{title.startYear ?? '—'}</span>
          {rating != null && <Badge>{rating.toFixed(1)}★</Badge>}
        </motion.div>
        {title.plot && (
          <motion.p className="hero__plot" variants={fadeUp}>
            {title.plot}
          </motion.p>
        )}
        <motion.div className="hero__actions" variants={fadeUp}>
          <Button size="lg" onClick={handlePlay}>
            ▶ Play
          </Button>
          <Button size="lg" variant="secondary" onClick={() => addToWatchlist(title.id)}>
            + Watchlist
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
