import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile, login, logout } from "../services/authService";
import * as authService from "../services/authService";
import { startConnection, stopConnection } from "../api/signalR";

export type User = {
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
        const res = getProfile();

        if (res) {
          const data = res;
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
    const profile = await login(username, password);    

    if (!profile) {
      throw new Error("useAuth deve ser usado dentro de AuthProvider");
    }
    
    startConnection(profile.id.toString()).catch(err =>
      console.error("Erro ao conectar SignalR", err)
    );
    
    setUser(profile);
  }

  async function logoutUser() {
    stopConnection();
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
