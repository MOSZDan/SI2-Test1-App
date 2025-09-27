// src/pages/Register.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";

type Sexo = "M" | "F";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    contrasena: "",
    sexo: "M" as Sexo, // M/F en BD, etiquetas largas en UI
    telefono: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    if (!form.nombre.trim()) return "El nombre es obligatorio";
    if (!form.apellido.trim()) return "El apellido es obligatorio";
    if (!/^\S+@\S+\.\S+$/.test(form.correo)) return "Correo inválido";
    if (form.contrasena.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    if (!["M", "F"].includes(form.sexo)) return "Sexo inválido";
    if (form.telefono && !/^[0-9+\-()\s]{6,}$/.test(form.telefono)) return "Teléfono inválido";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const err = validate();
    if (err) {
      setMsg(err);
      return;
    }
    setLoading(true);
    try {
      await api.register({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
        sexo: form.sexo, // "M" | "F"
        telefono: form.telefono.trim() || undefined,
      });

      // ✅ SIN AUTOLOGIN: mostrar mensaje y redirigir a /login
      setMsg("Registro exitoso. Ahora puedes iniciar sesión.");
      // pequeña pausa opcional para que se vea el mensaje; comenta si no te gusta
      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (e) {
      let text = "No se pudo registrar";
      if (e instanceof Error) {
        text = e.message;
        try {
          const maybeJson = JSON.parse(e.message);
          if (maybeJson?.fields?.correo) {
            const c = maybeJson.fields.correo;
            text = Array.isArray(c) ? c.join(", ") : String(c);
          } else if (typeof maybeJson?.detail === "string" && /correo|email/i.test(maybeJson.detail)) {
            text = maybeJson.detail;
          }
        } catch {
          // e.message no era JSON; si menciona correo, lo dejamos
        }
      }
      if (/existe|registrad|duplicate|uniq/i.test(text)) text = "El correo ya está registrado";
      setMsg(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh relative flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(120,119,198,0.10),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(34,211,238,0.10),_transparent_50%)]" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="rounded-3xl border border-white/50 bg-white/80 p-8 md:p-10 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="currentColor" aria-hidden>
                <path d="M3 21h18v-2H3v2Zm2-3h2V6H5v12Zm4 0h2V3H9v15Zm4 0h2V8h-2v10Zm4 0h2V10h-2v8Z" />
              </svg>
            </div>
            <h2 className="mb-1 text-3xl font-bold text-slate-800">Crear cuenta</h2>
            <p className="text-slate-600">Regístrate para usar Smart Condominium</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="nombre" className="mb-2 block text-sm font-semibold text-slate-700">Nombre</label>
              <input
                id="nombre" name="nombre" type="text" value={form.nombre} onChange={onChange}
                className="w-full rounded-xl border-2 border-cyan-200 bg-white px-4 py-3 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                required disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="apellido" className="mb-2 block text-sm font-semibold text-slate-700">Apellido</label>
              <input
                id="apellido" name="apellido" type="text" value={form.apellido} onChange={onChange}
                className="w-full rounded-xl border-2 border-cyan-200 bg-white px-4 py-3 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                required disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="correo" className="mb-2 block text-sm font-semibold text-slate-700">Correo</label>
              <input
                id="correo" name="correo" type="email" value={form.correo} onChange={onChange} placeholder="usuario@correo.com"
                className="w-full rounded-xl border-2 border-cyan-200 bg-white px-4 py-3 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                required disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="contrasena" className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</label>
              <div className="relative">
                <input
                  id="contrasena" name="contrasena" type={showPass ? "text" : "password"} value={form.contrasena} onChange={onChange} placeholder="••••••••"
                  className="w-full rounded-xl border-2 border-cyan-200 bg-white px-4 py-3 pr-12 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                  required disabled={loading}
                />
                <button
                  type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50"
                  tabIndex={-1}
                >
                  {showPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="sexo" className="mb-2 block text-sm font-semibold text-slate-700">Sexo</label>
              <select
                id="sexo" name="sexo" value={form.sexo} onChange={onChange}
                className="w-full rounded-xl border-2 border-cyan-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                disabled={loading}
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div>
              <label htmlFor="telefono" className="mb-2 block text-sm font-semibold text-slate-700">Teléfono</label>
              <input
                id="telefono" name="telefono" type="tel" value={form.telefono} onChange={onChange} placeholder="+591 70000000"
                className="w-full rounded-xl border-2 border-cyan-200 bg-white px-4 py-3 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit" disabled={loading}
                className="w-full transform rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-cyan-500 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creando cuenta…" : "Crear cuenta"}
              </button>
            </div>
          </form>

          {msg && (
            <div
              className={`mt-6 rounded-xl p-4 text-center font-medium ${
                /exitos|bienvenido|inicia/i.test(msg)
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {msg}
            </div>
          )}

          <div className="mt-6 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-cyan-700 hover:text-cyan-900">
              Inicia sesión
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          SmartCondominium • v1.0
        </div>
      </div>
    </div>
  );
}
