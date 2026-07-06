// src/store/connectivityStore.js
//
// Single source of truth for real browser connectivity (navigator.onLine +
// the 'online'/'offline' window events). One listener for the whole app,
// no matter how many components care - components subscribe via the
// useConnectivity() hook (see hooks/useConnectivity.js), which avoids the
// classic mistake of registering a window listener per component.

const listeners = new Set();
const reconnectListeners = new Set();

const state = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

function emit() {
  listeners.forEach((cb) => cb({ isOnline: state.online }));
}

export function onReconnect(cb) {
  reconnectListeners.add(cb);
  return () => reconnectListeners.delete(cb);
}

export function subscribe(cb) {
  listeners.add(cb);
  // Fire immediately with current state so late subscribers don't wait.
  cb({ isOnline: state.online });
  return () => listeners.delete(cb);
}

export function getIsOnline() {
  return state.online;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    state.online = true;
    emit();
    reconnectListeners.forEach((cb) => cb());
  });
  window.addEventListener('offline', () => {
    state.online = false;
    emit();
  });
}
