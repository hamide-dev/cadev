import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler, type AuthResponse, type User } from './api';
import { disconnectSocket } from './socket';

interface Session {
  user: User | null;
  ready: boolean;
  signIn: (auth: AuthResponse) => void;
  setUser: (user: User) => void;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    setToken(null);
    disconnectSocket();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, [signOut]);

  const value = useMemo<Session>(
    () => ({
      user,
      ready,
      signIn: (auth) => {
        setToken(auth.accessToken);
        setUser(auth.user);
      },
      setUser,
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
