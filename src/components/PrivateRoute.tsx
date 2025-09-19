import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactElement } from "react";

export default function PrivateRoute({ children }: { children: ReactElement }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-6 text-center text-gray-500">Cargando…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
