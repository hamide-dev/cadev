import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, getToken, setToken, setUnauthorizedHandler, type AuthResponse, type User } from './api';
import { disconnectSocket } from './socket';

interface Session {
  user: User | null;
  ready: boolean;
  signIn: (auth: AuthResponse) => void;
  setUser: (user: User) => void;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);
const USER_KEY = 'hw.user';

function getStoredUser(): User | null {
  try {
    const value = localStorage.getItem(USER_KEY);
    if (!value) return null;
    return JSON.parse(value) as User;
  } catch {
    return null;
  }
}

function setStoredUser(user: User | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Le token reste la source d'authentification si le stockage est indisponible.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getStoredUser());
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    disconnectSocket();
    setUserState(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) {
      setStoredUser(null);
      setUserState(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    const restore = async () => {
      try {
        const currentUser = await api.me();
        if (!cancelled) {
          setUserState(currentUser);
          setStoredUser(currentUser);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setToken(null);
          setStoredUser(null);
          setUserState(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  const value = useMemo<Session>(
    () => ({
      user,
      ready,
      signIn: (auth) => {
        setToken(auth.accessToken);
        setStoredUser(auth.user);
        setUserState(auth.user);
      },
      setUser: (nextUser) => {
        setStoredUser(nextUser);
        setUserState(nextUser);
      },
      signOut,
    }),
    [user, ready, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession doit être utilisé sous <SessionProvider>');
  return session;
}

// Raccourci pour les écrans protégés, rendus uniquement quand l'utilisateur est connecté.
export function useMe(): User {
  const { user } = useSession();
  if (!user) throw new Error('Écran protégé rendu sans session');
  return user;
}
