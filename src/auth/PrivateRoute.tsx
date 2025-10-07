import { type JSX, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { startConnection, stopConnection } from "../api/signalR";
import Spinner from "../components/Spinner/Spinner";
import { useAuth } from "./authContext";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      startConnection(user.id.toString()).catch(err =>
        console.error("Erro ao conectar SignalR", err)
      );
    }

    return () => {
      // Não para a conexão completamente, apenas faz cleanup se necessário
      // stopConnection(); // Remova esta linha se quiser manter a conexão ativa
    };
  }, [user, loading]);

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    stopConnection();
    return <Navigate to="/login" replace />;
  }

  return children;
}