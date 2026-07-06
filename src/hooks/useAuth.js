// src/hooks/useAuth.js
import { useEffect, useState } from 'react';
import { watchAuthState } from '../firebase/firebase';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = "still checking"

  useEffect(() => {
    const unsubscribe = watchAuthState(setUser);
    return unsubscribe; // detach the Firebase listener on unmount
  }, []);

  return {
    user: user ?? null,
    isLoading: user === undefined,
    isAuthenticated: Boolean(user),
  };
}
