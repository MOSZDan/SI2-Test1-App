import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { PAQUETES } from "../services/data/paquetes";

function PackageCard({
  title,
  color,
  count,
  to,
  chips,
}: {
  title: string;
  color: string;
  count: number;
  to: string;
  chips: string[];
}) {
  return (
    <Link
      to={to}
      className="group overflow-hidden rounded-3xl bg-white border border-slate-200 p-0 text-left
                 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
      aria-label={`Abrir ${title}`}
    >
      {/* franja superior tipo PedidosYa */}
      <div className={`relative h-28 md:h-32 bg-gradient-to-r ${color}`}>
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-20 blur-2xl rounded-full bg-white" />
        <div className="absolute -bottom-3 left-4 h-16 w-16 md:h-20 md:w-20 grid place-items-center rounded-2xl bg-white/95 shadow">
        </div>
      </div>

      {/* contenido */}
      <div className="p-5 md:p-6">
        <h3 className="text-slate-800 font-semibold text-lg md:text-xl">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {count} {count === 1 ? "caso de uso" : "casos de uso"}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {chips.slice(0, 3).map((txt) => (
            <span
              key={txt}
              className="rounded-full border text-xs px-3 py-1 text-slate-600 border-slate-200 group-hover:border-slate-300"
            >
              {txt}
            </span>
          ))}
        </div>

      </div>
    </Link>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Smart Condominium</h1>

        {/* Grid de paquetes estilo PedidosYa */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PAQUETES.map((p) => (
            <PackageCard
              key={p.key}
              title={p.title}
              color={p.color}
              count={p.casos.length}
              chips={p.casos.map((c) => c.name)}
              to={`/casos?pkg=${p.key}`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
