import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";
import type { JSX } from "react";
import Spinner from "../components/Spinner/Spinner";

export default function PrivateRoute({ children }: { children: JSX.Element }) {

  const { user, loading } = useAuth();
  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}