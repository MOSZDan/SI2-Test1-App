import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      setMsg("¡Bienvenido! Redirigiendo…");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al iniciar sesión";
      setMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(120,119,198,0.10),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(34,211,238,0.10),_transparent_50%)]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/50 bg-white/70 p-8 md:p-10 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="currentColor" aria-hidden>
                <path d="M3 21h18v-2H3v2Zm2-3h2V6H5v12Zm4 0h2V3H9v15Zm4 0h2V8h-2v10Zm4 0h2V10h-2v8Z" />
              </svg>
            </div>
            <h2 className="mb-1 text-3xl font-bold text-gray-800">Smart Condominium</h2>
            <p className="text-gray-600">Ingresa a tu cuenta</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">Correo Electrónico</label>
              <div className="relative">
                <input
                  id="email" type="email" placeholder="residente@condominio.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-cyan-200 bg-white/80 px-4 py-3 pl-12 placeholder-gray-400 outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                  required disabled={loading}
                />
                <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  id="password" type={showPass ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => setPass(e.target.value)}
                  className="w-full rounded-xl border-2 border-cyan-200 bg-white/80 px-4 py-3 pl-12 pr-12 placeholder-gray-400 outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                  required disabled={loading}
                />
                <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button type="button" onClick={() => setShowPass(v=>!v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50"
                        tabIndex={-1}>
                  {showPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full transform rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-cyan-500 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.14 5.82 3 7.94l3-2.65z" />
                  </svg>
                  Iniciando sesión…
                </span>
              ) : "Iniciar Sesión"}
            </button>
          </form>

          {msg && (
            <div className={`mt-6 rounded-xl p-4 text-center font-medium ${
              msg.includes("Bienvenido") ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"
            }`}>{msg}</div>
          )}

          <div className="mt-8 space-y-3 text-center">
            <button type="button" className="text-sm font-medium text-cyan-600 hover:text-cyan-800"
                    onClick={() => navigate("/forgot-password")} disabled={loading}>
              ¿Olvidaste tu contraseña?
            </button>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>¿No tienes cuenta?</span>
              <button type="button" className="font-medium text-cyan-600 hover:text-cyan-800"
                      onClick={() => navigate("/register")} disabled={loading}>
                Regístrate aquí
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">SmartCondominium • v1.0</p>
        </div>
      </div>
    </div>
  );
}
