import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWatchlist } from '../hooks/useWatchlist';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { signOut } from '../firebase/firebase';
import { TitleCard } from '../components/TitleCard';
import { TitleDetailModal } from '../components/TitleDetailModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import './ProfileScreen.css';

export function ProfileScreen({ onSelectTitle, selectedTitle, onCloseModal }) {
  const { user } = useAuth();
  const { titles: watchlist, loading: watchlistLoading, remove } = useWatchlist();
  const { entries: history, loading: historyLoading } = useWatchHistory();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const handleSignOut = () => {
    signOut().catch((err) => console.warn('[profile] sign-out failed:', err.message));
  };

  return (
    <div className="profile-screen">
      <header className="profile-screen__header">
        <div>
          <h1>Profile</h1>
          <p className="profile-screen__email">{user?.email}</p>
        </div>
        {confirmingSignOut ? (
          <div className="profile-screen__confirm">
            <span>Sign out?</span>
            <Button variant="secondary" size="sm" onClick={() => setConfirmingSignOut(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSignOut}>
              Confirm
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmingSignOut(true)}>
            Sign out
          </Button>
        )}
      </header>

      <section className="profile-screen__section">
        <h2>Watchlist</h2>
        {!watchlistLoading && watchlist.length === 0 && (
          <EmptyState title="Your watchlist is empty" description="Add shows from Home or Search." />
        )}
        {watchlist.length > 0 && (
          <div className="profile-screen__grid">
            {watchlist.map((title) => (
              <div className="profile-screen__item" key={title.id}>
                <TitleCard title={title} onSelect={onSelectTitle} />
                <button className="profile-screen__remove" onClick={() => remove(title.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="profile-screen__section">
        <h2>Watch history</h2>
        {!historyLoading && history.length === 0 && (
          <EmptyState title="No watch history yet" description="Shows you play will show up here." />
        )}
        {history.length > 0 && (
          <div className="profile-screen__grid">
            {history.map(({ title, watchedAt }) => (
              <div className="profile-screen__item" key={`${title.id}-${watchedAt}`}>
                <TitleCard title={title} onSelect={onSelectTitle} />
              </div>
            ))}
          </div>
        )}
      </section>

      <TitleDetailModal title={selectedTitle} onClose={onCloseModal} />
    </div>
  );
}
