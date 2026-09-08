import { UniSphereApi } from '@unisphere/api-client';
import type { AuthSession, CampusUser } from '@unisphere/types';
import type { LoginInput, RegisterInput } from '@unisphere/validation';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '@/services/session-storage';
import { usePreferencesStore } from '@/stores/preferences-store';

type AuthContextValue = {
  api: UniSphereApi;
  isLoading: boolean;
  user: CampusUser | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000/api/v1';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CampusUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const selectedCollegeId = usePreferencesStore((state) => state.selectedCollegeId);

  const acceptSession = useCallback(async (session: AuthSession) => {
    setAccessToken(session.tokens.accessToken);
    setUser(session.user);
    await setRefreshToken(session.tokens.refreshToken);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
      const publicApi = new UniSphereApi({ baseUrl: apiUrl });
      const session = await publicApi.refresh(refreshToken);
      await acceptSession(session);
      return session.tokens.accessToken;
    } catch {
      setAccessToken(null);
      setUser(null);
      await clearRefreshToken();
      return null;
    }
  }, [acceptSession]);

  const getAccessToken = useCallback(async () => accessToken, [accessToken]);

  const api = useMemo(
    () =>
      new UniSphereApi({
        baseUrl: apiUrl,
        getAccessToken,
        getActiveCollegeId: () => selectedCollegeId,
        onUnauthorized: refreshAccessToken,
      }),
    [getAccessToken, refreshAccessToken, selectedCollegeId],
  );

  useEffect(() => {
    let cancelled = false;
    const refreshTimer = setTimeout(() => {
      refreshAccessToken().finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
    };
  }, [refreshAccessToken]);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await api.login(input);
      await acceptSession(session);
    },
    [acceptSession, api],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await api.register(input);
      await acceptSession(session);
    },
    [acceptSession, api],
  );

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      await api
        .logout(refreshToken)
        .catch(() => undefined);
    }
    setAccessToken(null);
    setUser(null);
    await clearRefreshToken();
  }, [api]);

  const value = useMemo(
    () => ({ api, isLoading, user, login, register, logout }),
    [api, isLoading, login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
