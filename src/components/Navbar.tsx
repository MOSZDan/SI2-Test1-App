// src/components/Navbar.tsx
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const isLogged = !!user;

  // Saca iniciales para el chip del usuario
  const initials = (() => {
    const n = [user?.nombre, user?.apellido]
      .filter(Boolean)
      .map((s) => String(s).trim()[0]?.toUpperCase())
      .join("");
    return n || (user?.correo ? user.correo[0].toUpperCase() : "");
  })();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          to={isLogged ? "/dashboard" : "/login"}
          className="text-slate-800 font-semibold"
        >
          SmartCondominium
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {isLogged ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cx(
                    "rounded-md px-3 py-1.5",
                    isActive
                      ? "text-cyan-700 bg-cyan-50"
                      : "text-slate-600 hover:text-cyan-700"
                  )
                }
              >
                Inicio
              </NavLink>

              {/* Chip con iniciales / nombre */}
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 sm:flex">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-600 text-white text-xs font-semibold">
                  {initials || "U"}
                </span>
                <span className="truncate max-w-[12ch]">
                  {user?.nombre ?? user?.correo}
                </span>
              </div>

              <NavLink
                to="/logout"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Salir
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  cx(
                    "rounded-md px-3 py-1.5",
                    isActive
                      ? "text-cyan-700 bg-cyan-50"
                      : "text-slate-600 hover:text-cyan-700"
                  )
                }
              >
                Iniciar sesión
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  cx(
                    "rounded-md px-3 py-1.5",
                    isActive
                      ? "text-white bg-cyan-600"
                      : "text-white bg-cyan-500 hover:bg-cyan-600"
                  )
                }
              >
                Registrarse
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
