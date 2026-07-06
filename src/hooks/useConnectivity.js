// src/hooks/useConnectivity.js
import { useEffect, useState } from 'react';
import { subscribe, getIsOnline } from '../store/connectivityStore';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(getIsOnline());

  useEffect(() => {
    // subscribe() returns an unsubscribe function -- returning it directly
    // from useEffect means React guarantees it runs on unmount, so we never
    // leak a listener per mounted component.
    const unsubscribe = subscribe((snapshot) => setIsOnline(snapshot.isOnline));
    return unsubscribe;
  }, []);

  return isOnline;
}
