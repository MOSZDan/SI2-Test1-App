// src/App.tsx
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";           // 👈 nueva
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./context/AuthContext";   // 👈 para Logout

// Ruta que cierra sesión y redirige
function Logout() {
  const { logout } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    logout();
    nav("/login", { replace: true });
  }, [logout, nav]);
  return (
    <div className="min-h-dvh grid place-items-center text-slate-600">
      Cerrando sesión…
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />   {/* 👈 nueva */}
      <Route path="/logout" element={<Logout />} />       {/* 👈 nueva */}

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
