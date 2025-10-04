import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile, login, logout } from "../services/authService";
import * as authService from "../services/authService";

type User = {
  id: number; 
  name: string;
} | null;

type AuthContextType = {
  user: User;
  loginUser: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => void;
  logoutUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await getProfile();

        if (res) {
          const data = await res;
          setUser(data); 
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  async function loginUser(username: string, password: string) {
    //await login(username, password);
    //const profile = await getProfile();
    setUser({id: 1, name: 'teste'});
  }

  async function logoutUser() {
    await logout();
    setUser(null);
  }

  const register = async (username: string, password: string) => {
    await authService.register(username, password);
  }
  
  return (
    <AuthContext.Provider value={{ user, loginUser, register, logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
