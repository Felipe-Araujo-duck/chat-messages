import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";
import type { JSX } from "react";
import Spinner from "../components/Spinner/Spinner";
import { startConnection, stopConnection } from "../api/signalR";

export default function PrivateRoute({ children }: { children: JSX.Element }) {

  const { user, loading } = useAuth();
  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    stopConnection();
    return <Navigate to="/login" replace />;
  }

  startConnection(user.id.toString()).catch(err =>
    console.error("Erro ao conectar SignalR", err)
  );

  return children;
}