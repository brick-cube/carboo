
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import api from "../lib/api";

export interface AdminUser {
  id: string;
  name?: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getResponseData(response: any) {
  return response?.data?.data ?? response?.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = sessionStorage.getItem("carboo_access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");
      const data = getResponseData(response);
      const admin = data?.user ?? data;

      if (admin?.role !== "ADMIN") {
        sessionStorage.removeItem("carboo_access_token");
        setUser(null);
        return;
      }

      setUser(admin);
    } catch {
      sessionStorage.removeItem("carboo_access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/admin/login", {
      email,
      password,
    });

    const data = getResponseData(response);
    const accessToken = data?.accessToken;
    const admin = data?.user;

    if (!accessToken) {
      throw new Error("The login response did not contain an access token.");
    }

    if (!admin || admin.role !== "ADMIN") {
      throw new Error("This account does not have administrator access.");
    }

    sessionStorage.setItem("carboo_access_token", accessToken);
    setUser(admin);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      sessionStorage.removeItem("carboo_access_token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}