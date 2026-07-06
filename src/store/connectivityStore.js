// src/store/connectivityStore.js
//
// The brief asks for two things that sound contradictory at first:
//   1. The app should run offline with "full API access" (i.e. full access
//      to previously-cached data), and randomly flip between online/offline.
//   2. The UI must always show current connection status, and re-sync when
//      back online.
//
// Design: a single module-level store (not a React hook by itself) so there
// is exactly ONE setInterval / ONE 'online'/'offline' listener for the whole
// app, no matter how many components care about connectivity. Components
// subscribe via the useConnectivity() hook (see hooks/useConnectivity.js).
// This avoids the classic mistake of registering a `window.addEventListener`
// inside every card/list component that needs to know the network state,
// which is both wasteful and a common source of leaked listeners.

const listeners = new Set();

const state = {
  // Real browser network state.
  browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  // Simulated flakiness layered on top, per the assessment's requirement
  // that the app "will be switched to online and offline mode randomly."
  simulatedOnline: true,
};

function computeEffective() {
  return state.browserOnline && state.simulatedOnline;
}

function emit() {
  const snapshot = {
    isOnline: computeEffective(),
    browserOnline: state.browserOnline,
    simulatedOnline: state.simulatedOnline,
  };
  listeners.forEach((cb) => cb(snapshot));
}

let wasOnline = computeEffective();

function checkTransition() {
  const now = computeEffective();
  if (now && !wasOnline) {
    // Went offline -> online: tell anyone listening for reconnect events.
    reconnectListeners.forEach((cb) => cb());
  }
  wasOnline = now;
}

const reconnectListeners = new Set();

export function onReconnect(cb) {
  reconnectListeners.add(cb);
  return () => reconnectListeners.delete(cb);
}

export function subscribe(cb) {
  listeners.add(cb);
  // Fire immediately with current state so late subscribers don't wait.
  cb({ isOnline: computeEffective(), browserOnline: state.browserOnline, simulatedOnline: state.simulatedOnline });
  return () => listeners.delete(cb);
}

export function getIsOnline() {
  return computeEffective();
}

// --- wire up real browser events (registered once, module load time) -----

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    state.browserOnline = true;
    emit();
    checkTransition();
  });
  window.addEventListener('offline', () => {
    state.browserOnline = false;
    emit();
    checkTransition();
  });
}

// --- random simulated flakiness -------------------------------------------

let simTimer = null;

/**
 * Starts randomly toggling `simulatedOnline`. Call once, e.g. from main.jsx.
 * Interval bounds are configurable so tests/demos can speed this up.
 */
export function startConnectivitySimulation({ minMs = 8000, maxMs = 20000 } = {}) {
  if (simTimer) return; // idempotent - don't stack multiple intervals
  const tick = () => {
    // Bias toward "online" (80%) so the app is usable most of the time,
    // while still regularly exercising the offline path.
    state.simulatedOnline = Math.random() < 0.8;
    emit();
    checkTransition();
    const delay = minMs + Math.random() * (maxMs - minMs);
    simTimer = setTimeout(tick, delay);
  };
  const delay = minMs + Math.random() * (maxMs - minMs);
  simTimer = setTimeout(tick, delay);
}

export function stopConnectivitySimulation() {
  if (simTimer) {
    clearTimeout(simTimer);
    simTimer = null;
  }
}

/** For a manual "Go offline" toggle in a dev/demo panel. */
export function forceSimulatedState(isOnline) {
  state.simulatedOnline = isOnline;
  emit();
  checkTransition();
}

// Ctrl+. flips simulatedOnline on the spot, for demoing the offline UI
// without waiting on the random timer. Dev builds only.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === '.') {
      forceSimulatedState(!state.simulatedOnline);
    }
  });
}
