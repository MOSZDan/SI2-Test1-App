// src/pages/ComunicadosList.tsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { api, Paged, ComunicadoDTO } from "../services/api";

type Filtros = {
  search?: string;
  prioridad?: string;      // mapea a ?tipo=
  estado?: string;         // ej. 'publicado' si lo usas
  ordering?: "-fecha" | "fecha";
  page?: number;
  page_size?: number;
  // si tu backend acepta django-filter con lookups, podrás usar:
  fecha_from?: string;     // YYYY-MM-DD -> enviaremos como fecha__gte
  fecha_to?: string;       // YYYY-MM-DD -> enviaremos como fecha__lte
};

export default function ComunicadosList() {
  const token = localStorage.getItem("token") || "";

  const [items, setItems] = useState<ComunicadoDTO[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<Filtros>({
    search: "",
    prioridad: "",
    estado: "",         // pon "publicado" si lo manejas así
    ordering: "-fecha", // recientes primero
    page: 1,
    page_size: 10,
    fecha_from: "",
    fecha_to: "",
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / (filtros.page_size || 10))),
    [count, filtros.page_size]
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // armamos params para el backend
        const params: Record<string, any> = {
          search: filtros.search || undefined,
          tipo: filtros.prioridad || undefined,   // prioridad -> tipo
          estado: filtros.estado || undefined,
          ordering: filtros.ordering || undefined,
          page: filtros.page,
          page_size: filtros.page_size,
        };

        // Si tu backend acepta lookups de django-filter:
        if (filtros.fecha_from) params["fecha__gte"] = filtros.fecha_from;
        if (filtros.fecha_to) params["fecha__lte"] = filtros.fecha_to;

        const data = await api.comunicados(token, params);
        if (cancel) return;

        const paged = data as Paged<ComunicadoDTO>;
        setItems(paged.results || []);
        setCount(paged.count || 0);
      } catch (e: any) {
        if (!cancel) setErrorMsg(e?.message || "Error cargando comunicados.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [token, filtros]);

  const changePage = (p: number) => {
    setFiltros((f) => ({ ...f, page: Math.min(Math.max(1, p), totalPages) }));
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Comunicados</h1>

        {/* Filtros */}
        <div className="rounded-2xl bg-white p-4 shadow mb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              className="lg:col-span-2 border rounded px-3 py-2"
              placeholder="Buscar por texto…"
              value={filtros.search}
              onChange={(e) => setFiltros((f) => ({ ...f, search: e.target.value, page: 1 }))}
            />

            <select
              className="border rounded px-3 py-2"
              value={filtros.prioridad}
              onChange={(e) => setFiltros((f) => ({ ...f, prioridad: e.target.value, page: 1 }))}
            >
              <option value="">Todas las prioridades</option>
              <option value="normal">normal</option>
              <option value="importante">importante</option>
              <option value="urgente">urgente</option>
            </select>

            <select
              className="border rounded px-3 py-2"
              value={filtros.ordering}
              onChange={(e) => setFiltros((f) => ({ ...f, ordering: e.target.value as "-fecha" | "fecha", page: 1 }))}
            >
              <option value="-fecha">Más recientes</option>
              <option value="fecha">Más antiguos</option>
            </select>

            {/* Rango de fechas (funciona si tu backend acepta fecha__gte/lte) */}
            <input
              type="date"
              className="border rounded px-3 py-2"
              value={filtros.fecha_from}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_from: e.target.value, page: 1 }))}
              title="Desde"
            />
            <input
              type="date"
              className="border rounded px-3 py-2"
              value={filtros.fecha_to}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_to: e.target.value, page: 1 }))}
              title="Hasta"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl bg-white p-6 shadow text-slate-500">Cargando…</div>
          ) : errorMsg ? (
            <div className="rounded-2xl bg-white p-6 shadow text-red-600">{errorMsg}</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow text-slate-500">
              No hay avisos para mostrar. Prueba limpiando los filtros.
            </div>
          ) : (
            items.map((c) => (
              <article key={c.id} className="rounded-2xl bg-white p-4 shadow border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{c.titulo}</h2>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      c.tipo === "urgente"
                        ? "bg-red-100 text-red-700"
                        : c.tipo === "importante"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {c.tipo || "normal"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{c.contenido}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {c.fecha && <span>Fecha: {c.fecha}</span>}
                  {c.hora && <span>Hora: {c.hora}</span>}
                  {c.codigo_usuario && <span>Autor #{c.codigo_usuario}</span>}
                  {c.url && (
                    <a className="underline" href={c.url} target="_blank" rel="noreferrer">
                      Ver enlace
                    </a>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {/* Paginación */}
        {items.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <div>
              Página {filtros.page} de {totalPages} — {count} resultado(s)
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded border disabled:opacity-50"
                onClick={() => changePage((filtros.page || 1) - 1)}
                disabled={(filtros.page || 1) <= 1}
              >
                Anterior
              </button>
              <button
                className="px-3 py-1 rounded border disabled:opacity-50"
                onClick={() => changePage((filtros.page || 1) + 1)}
                disabled={(filtros.page || 1) >= totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
