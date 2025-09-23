// src/pages/Casos.tsx
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { PAQUETES } from "../services/data/paquetes";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Casos() {
  const q = useQuery();
  const key = q.get("pkg") ?? "";
  const pkg = PAQUETES.find((p) => p.key === key) ?? PAQUETES[0];

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className={`h-28 rounded-3xl bg-gradient-to-r ${pkg.color} mb-6 relative`}>
          <div className="absolute -bottom-3 left-4 h-16 w-16 grid place-items-center rounded-2xl bg-white/95 shadow">
          </div>
        </div>

        <h1 className="text-2xl font-semibold mb-1">{pkg.title}</h1>
        <p className="text-slate-500 mb-6">
          {pkg.casos.length} {pkg.casos.length === 1 ? "caso de uso" : "casos de uso"}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {pkg.casos.map((c) =>
            c.to ? (
              <Link
                key={c.name}
                to={c.to}
                className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="font-medium text-slate-800">{c.name}</div>
                <div className="text-xs text-pink-600 mt-1">Ir →</div>
              </Link>
            ) : (
              <div
                key={c.name}
                className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm opacity-70"
                title="Próximamente"
              >
                <div className="font-medium text-slate-800">{c.name}</div>
                <div className="text-xs text-slate-400 mt-1">Próximamente</div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
