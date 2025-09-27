// src/App.tsx
import {Routes, Route, Navigate, useNavigate} from "react-router-dom";
import {useEffect} from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Roles from "./pages/Roles";
import PrivateRoute from "./components/PrivateRoute";
import {useAuth} from "./context/AuthContext";
import AIDetection from "./pages/AIDetection";
import Propiedades from "./pages/Propiedades";
import CuotasMultas from "./pages/CuotasMultas";
import EstadoCuenta from "./pages/EstadoCuenta";
import Casos from "./pages/Casos";
import ComunicadosList from "./pages/ComunicadosList";
import ComunicadosPublicar from "./pages/ComunicadosPublicar";

// Ruta que cierra sesión y redirige
function Logout() {
    const {logout} = useAuth();
    const nav = useNavigate();
    useEffect(() => {
        logout();
        nav("/login", {replace: true});
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
            <Route path="/login" element={<Login/>}/>
            <Route path="/register" element={<Register/>}/>
            <Route path="/logout" element={<Logout/>}/>

            <Route
                path="/dashboard"
                element={
                    <PrivateRoute>
                        <Dashboard/>
                    </PrivateRoute>
                }
            />

            <Route
                path="/usuarios"
                element={
                    <PrivateRoute>
                        <Usuarios/>
                    </PrivateRoute>
                }
            />

            <Route
                path="/cobros/cuotas-multas/"
                element={
                    <PrivateRoute>
                        <CuotasMultas/>
                    </PrivateRoute>
                }
            />

            <Route
                path="/roles"
                element={
                    <PrivateRoute>
                        <Roles/>
                    </PrivateRoute>
                }
            />

            <Route
                path="/propiedades"
                element={
                    <PrivateRoute>
                        <Propiedades/>
                    </PrivateRoute>
                }
            />

            <Route
                path="/finanzas/estado"
                element={
                    <PrivateRoute>
                        <EstadoCuenta/>
                    </PrivateRoute>
                }
            />

            <Route
                path="/comunicados"
                element={
                    <PrivateRoute>
                        <ComunicadosList/>
                    </PrivateRoute>
                }
            />
            <Route
                path="/comunicados/publicar"
                element={
                    <PrivateRoute>
                        <ComunicadosPublicar/>
                    </PrivateRoute>
                }
            />

            <Route
                path="/ai-detection"
                element={
                    <PrivateRoute>
                        <AIDetection/>
                    </PrivateRoute>
                }
            />

            {/* página que lista los casos de un paquete */}
            <Route
                path="/casos"
                element={
                    <PrivateRoute>
                        <Casos/>
                    </PrivateRoute>
                }
            />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
    );
}
