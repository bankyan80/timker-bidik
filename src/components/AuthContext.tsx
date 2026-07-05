import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'staff_kecamatan' | 'operator_sekolah';
  schoolNpsn?: string;
  schoolName?: string;
  schoolLevel?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

const TOKEN_KEY = 'timker_bidik_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        return err.error || 'Login gagal';
      }
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return null;
    } catch {
      return 'Tidak dapat terhubung ke server';
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isRole = useCallback((...roles: string[]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
