import { useEffect, useState } from 'react';
import { getTopRated, getRecentlyAdded } from '../lib/db';
import { pickDaily } from '../lib/dailyPick';
import { Hero } from '../components/Hero';
import { TitleRow } from '../components/TitleRow';
import { TitleGrid } from '../components/TitleGrid';
import { TitleDetailModal } from '../components/TitleDetailModal';
import './HomeScreen.css';

export function HomeScreen({ onSelectTitle, selectedTitle, onCloseModal }) {
  const [topRated, setTopRated] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [top, recent] = await Promise.all([getTopRated(20), getRecentlyAdded(20)]);
      if (cancelled) return;
      setTopRated(top);
      setRecentlyAdded(recent);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = pickDaily(topRated);

  return (
    <div className="home-screen">
      {hero && <Hero title={hero} onSelect={onSelectTitle} />}

      {topRated.length > 0 && <TitleRow heading="Top rated" items={topRated} onSelectTitle={onSelectTitle} />}
      {recentlyAdded.length > 0 && (
        <TitleRow heading="Recently added" items={recentlyAdded} onSelectTitle={onSelectTitle} />
      )}

      <h2 className="home-screen__all-heading">All shows</h2>
      <TitleGrid onSelectTitle={onSelectTitle} />

      <TitleDetailModal title={selectedTitle} onClose={onCloseModal} />
    </div>
  );
}
