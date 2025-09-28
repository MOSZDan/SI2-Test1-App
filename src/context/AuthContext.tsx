import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api, type LoginResponse } from "../services/api";

type User = LoginResponse["user"] | null;

type Ctx = {
  token: string | null;
  user: User;
  loading: boolean;
  isAuthenticated: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  validateToken(): Promise<boolean>;
};

const AuthCtx = createContext<Ctx>({} as any);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User>(() => {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [loading, setLoading] = useState(true); // Cambiado a true para validar token al inicio
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Validar token al cargar la app
  useEffect(() => {
    const validateInitialToken = async () => {
      if (token) {
        const isValid = await validateToken();
        if (!isValid) {
          logout(); // Limpiar token inválido
        }
      }
      setLoading(false);
    };

    validateInitialToken();
  }, []);

  const validateToken = async (): Promise<boolean> => {
    if (!token) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      // Intentar hacer una petición simple para validar el token
      await api.getCurrentUser(token);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.warn("Token inválido o expirado:", error);
      setIsAuthenticated(false);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      setIsAuthenticated(true);
    } catch (error) {
      // Si falla el login, asegurarse de limpiar cualquier estado previo
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    validateToken
  }), [token, user, loading, isAuthenticated]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
