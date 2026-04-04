import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { API_BASE } from "./constants";

interface User {
  userId: string;
  username: string;
  email?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "gl_auth_token";
const USER_KEY = "gl_auth_user";

const originalFetch = window.fetch.bind(window);
let fetchPatched = false;
let onUnauthorized: (() => void) | null = null;

function installFetchInterceptor() {
  if (fetchPatched) return;
  fetchPatched = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const headers = new Headers(init?.headers);
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const response = await originalFetch(input, { ...init, headers });
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (response.status === 401 && !url.includes("/api/auth/login") && !url.includes("/api/auth/me")) {
        onUnauthorized?.();
      }
      return response;
    }
    return originalFetch(input, init);
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutCalledRef = useRef(false);

  const clearAuth = useCallback(() => {
    if (logoutCalledRef.current) return;
    logoutCalledRef.current = true;
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setTimeout(() => { logoutCalledRef.current = false; }, 1000);
  }, []);

  useEffect(() => {
    installFetchInterceptor();
    onUnauthorized = clearAuth;
    return () => { onUnauthorized = null; };
  }, [clearAuth]);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    let parsedUser: User | null = null;
    if (savedUser) {
      try {
        parsedUser = JSON.parse(savedUser);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    if (savedToken) {
      originalFetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            return res.json().then((data: any) => {
              setToken(savedToken);
              setUser(data.user || parsedUser);
              setIsLoading(false);
            });
          } else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (parsedUser) {
            setToken(savedToken);
            setUser(parsedUser);
          }
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      const res = await originalFetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }
      logoutCalledRef.current = false;
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  }, []);

  const loginWithToken = useCallback((newToken: string, newUser: User) => {
    logoutCalledRef.current = false;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await originalFetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    } catch {}
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
