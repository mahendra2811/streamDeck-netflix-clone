import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { useConnectivity } from './hooks/useConnectivity';
import { runInitialSync, registerReconnectSync, registerPeriodicResume } from './lib/syncEngine';
import { NavBar } from './components/NavBar';
import { ConnectivityBanner } from './components/ConnectivityBanner';
import { ConnectivityToast } from './components/ConnectivityToast';
import { SyncProgress } from './components/SyncProgress';
import { PageTransition } from './components/PageTransition';
import { Spinner } from './components/ui/Spinner';
import { SignUpScreen } from './screens/SignUpScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SearchScreen } from './screens/SearchScreen';

export default function App() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  useConnectivity(); // subscribed here so the connectivity store starts emitting immediately

  const [syncProgress, setSyncProgress] = useState({ cached: 0, target: 10000 });
  const [selectedTitle, setSelectedTitle] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    runInitialSync(setSyncProgress, controller.signal);
    const unregisterReconnect = registerReconnectSync(setSyncProgress);
    const unregisterPeriodic = registerPeriodicResume(setSyncProgress);

    return () => {
      controller.abort();
      unregisterReconnect();
      unregisterPeriodic();
    };
  }, []);

  const handleSelectTitle = useCallback((title) => setSelectedTitle(title), []);
  const handleCloseModal = useCallback(() => setSelectedTitle(null), []);

  if (isLoading) {
    return (
      <div className="app-splash">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <ConnectivityBanner />
      <ConnectivityToast />
      {isAuthenticated && (
        <>
          <NavBar email={user.email} />
          <SyncProgress cached={syncProgress.cached} target={syncProgress.target} />
        </>
      )}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <PageTransition>
                  <SignUpScreen />
                </PageTransition>
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <PageTransition>
                  <HomeScreen
                    onSelectTitle={handleSelectTitle}
                    selectedTitle={selectedTitle}
                    onCloseModal={handleCloseModal}
                    syncedCount={syncProgress.cached}
                  />
                </PageTransition>
              ) : (
                <Navigate to="/signup" replace />
              )
            }
          />
          <Route
            path="/search"
            element={
              isAuthenticated ? (
                <PageTransition>
                  <SearchScreen
                    onSelectTitle={handleSelectTitle}
                    selectedTitle={selectedTitle}
                    onCloseModal={handleCloseModal}
                  />
                </PageTransition>
              ) : (
                <Navigate to="/signup" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <PageTransition>
                  <ProfileScreen
                    onSelectTitle={handleSelectTitle}
                    selectedTitle={selectedTitle}
                    onCloseModal={handleCloseModal}
                  />
                </PageTransition>
              ) : (
                <Navigate to="/signup" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/signup'} replace />} />
        </Routes>
      </AnimatePresence>
    </MotionConfig>
  );
}
