import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactElement } from "react";

export default function PrivateRoute({ children }: { children: ReactElement }) {
  const { token, loading, isAuthenticated } = useAuth();

  // Mostrar loading mientras se valida el token
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Validando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay token o no está autenticado, redirigir al login
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
