// pages/CuotasMultas.tsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { pagosAPI, multasAPI, Pago, Multa, PagoForm, MultaForm } from "../services/cobros";

function InlineError({ text }: { text: string }) {
  return (
    <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
      <strong>Error:</strong> {text}
    </div>
  );
}

export default function CuotasMultas() {
  const { token } = useAuth();

  // pestaña
  const [tab, setTab] = useState<"pagos" | "multas">("pagos");

  // data
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [multas, setMultas] = useState<Multa[]>([]);
  const [loading, setLoading] = useState(false);

  // búsqueda
  const [searchPagos, setSearchPagos] = useState("");
  const [searchMultas, setSearchMultas] = useState("");

  // feedback global
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // modales
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showMultaModal, setShowMultaModal] = useState(false);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [editingMulta, setEditingMulta] = useState<Multa | null>(null);

  // forms + errores inline
  const [pagoForm, setPagoForm] = useState<PagoForm>({ tipo: "", descripcion: "", monto: 0 });
  const [multaForm, setMultaForm] = useState<MultaForm>({ descripcion: "", monto: 0 });
  const [pagoError, setPagoError] = useState<string | null>(null);
  const [multaError, setMultaError] = useState<string | null>(null);

  // cargar
  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rp, rm] = await Promise.all([pagosAPI.list(token!), multasAPI.list(token!)]);
      const pagosData = Array.isArray(rp) ? rp : rp.results || [];
      const multasData = Array.isArray(rm) ? rm : rm.results || [];
      setPagos(pagosData);
      setMultas(multasData);
    } catch (e) {
      setError("No se pudieron cargar los catálogos.");
    } finally {
      setLoading(false);
    }
  };

  // filtros locales
  const pagosFiltrados = useMemo(() => {
    const t = searchPagos.trim().toLowerCase();
    return pagos.filter(
      (p) =>
        !t ||
        p.tipo.toLowerCase().includes(t) ||
        p.descripcion.toLowerCase().includes(t) ||
        String(p.monto).includes(t)
    );
  }, [pagos, searchPagos]);

  const multasFiltradas = useMemo(() => {
    const t = searchMultas.trim().toLowerCase();
    return multas.filter(
      (m) => !t || m.descripcion.toLowerCase().includes(t) || String(m.monto).includes(t)
    );
  }, [multas, searchMultas]);

  // validaciones
  const validatePago = (f: PagoForm): string | null => {
    if (!f.tipo.trim()) return "El tipo es obligatorio.";
    if (!f.descripcion.trim()) return "La descripción es obligatoria.";
    if (f.monto === null || Number(f.monto) <= 0) return "El monto debe ser mayor a 0.";
    return null;
  };

  const validateMulta = (f: MultaForm): string | null => {
    if (!f.descripcion.trim()) return "La descripción es obligatoria.";
    if (f.monto === null || Number(f.monto) <= 0) return "El monto debe ser mayor a 0.";
    return null;
  };

  // abrir modales
  const openNewPago = () => {
    setEditingPago(null);
    setPagoForm({ tipo: "", descripcion: "", monto: 0 });
    setPagoError(null);
    setShowPagoModal(true);
  };

  const openEditPago = (p: Pago) => {
    setEditingPago(p);
    setPagoForm({ tipo: p.tipo, descripcion: p.descripcion, monto: p.monto, estado: p.estado });
    setPagoError(null);
    setShowPagoModal(true);
  };

  const openNewMulta = () => {
    setEditingMulta(null);
    setMultaForm({ descripcion: "", monto: 0 });
    setMultaError(null);
    setShowMultaModal(true);
  };

  const openEditMulta = (m: Multa) => {
    setEditingMulta(m);
    setMultaForm({ descripcion: m.descripcion, monto: m.monto, estado: m.estado });
    setMultaError(null);
    setShowMultaModal(true);
  };

  // submit pago
  const submitPago = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validatePago(pagoForm);
    if (v) {
      setPagoError(v);
      return;
    }
    try {
      setLoading(true);
      setPagoError(null);
      if (editingPago) {
        await pagosAPI.update(token!, editingPago.id, pagoForm);
        setMessage("Pago actualizado.");
      } else {
        await pagosAPI.create(token!, pagoForm);
        setMessage("Pago creado.");
      }
      setShowPagoModal(false);
      await loadData();
    } catch (err: any) {
      setPagoError(err?.detail || err?.message || "No se pudo guardar el pago.");
    } finally {
      setLoading(false);
    }
  };

  // submit multa
  const submitMulta = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateMulta(multaForm);
    if (v) {
      setMultaError(v);
      return;
    }
    try {
      setLoading(true);
      setMultaError(null);
      if (editingMulta) {
        await multasAPI.update(token!, editingMulta.id, multaForm);
        setMessage("Multa actualizada.");
      } else {
        await multasAPI.create(token!, multaForm);
        setMessage("Multa creada.");
      }
      setShowMultaModal(false);
      await loadData();
    } catch (err: any) {
      setMultaError(err?.detail || err?.message || "No se pudo guardar la multa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold">Cuotas y Multas</h1>
          {message && (
            <div className="ml-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              {message}
              <button onClick={() => setMessage(null)} className="ml-2 font-bold">×</button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("pagos")}
            className={`px-4 py-2 rounded-lg border ${tab === "pagos" ? "bg-white shadow" : "bg-slate-100 hover:bg-white"}`}
          >
            Cuotas (Pagos)
          </button>
          <button
            onClick={() => setTab("multas")}
            className={`px-4 py-2 rounded-lg border ${tab === "multas" ? "bg-white shadow" : "bg-slate-100 hover:bg-white"}`}
          >
            Multas
          </button>
        </div>

        {/* Pagos */}
        {tab === "pagos" && (
          <section className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
              <input
                value={searchPagos}
                onChange={(e) => setSearchPagos(e.target.value)}
                placeholder="Buscar por tipo, descripción o monto..."
                className="w-full sm:w-96 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
              <button
                onClick={openNewPago}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Nuevo pago
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium">Descripción</th>
                      <th className="px-4 py-3 text-left font-medium">Monto</th>
                      {"estado" in (pagos[0] || {}) && (
                        <th className="px-4 py-3 text-left font-medium">Estado</th>
                      )}
                      <th className="px-4 py-3 text-left font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pagosFiltrados.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{p.tipo}</td>
                        <td className="px-4 py-3">{p.descripcion}</td>
                        <td className="px-4 py-3">{Number(p.monto).toFixed(2)}</td>
                        {"estado" in p && <td className="px-4 py-3">{p.estado}</td>}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEditPago(p)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pagosFiltrados.length === 0 && (
                      <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>Sin resultados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Multas */}
        {tab === "multas" && (
          <section className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
              <input
                value={searchMultas}
                onChange={(e) => setSearchMultas(e.target.value)}
                placeholder="Buscar por descripción o monto..."
                className="w-full sm:w-96 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
              <button
                onClick={openNewMulta}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Nueva multa
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Descripción</th>
                      <th className="px-4 py-3 text-left font-medium">Monto</th>
                      {"estado" in (multas[0] || {}) && (
                        <th className="px-4 py-3 text-left font-medium">Estado</th>
                      )}
                      <th className="px-4 py-3 text-left font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {multasFiltradas.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{m.descripcion}</td>
                        <td className="px-4 py-3">{Number(m.monto).toFixed(2)}</td>
                        {"estado" in m && <td className="px-4 py-3">{m.estado}</td>}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEditMulta(m)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {multasFiltradas.length === 0 && (
                      <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>Sin resultados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Modal Pago */}
        {showPagoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">{editingPago ? "Editar pago" : "Nuevo pago"}</h2>

              {pagoError && <InlineError text={pagoError} />}

              <form onSubmit={submitPago} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <input
                    value={pagoForm.tipo}
                    onChange={(e) => setPagoForm((p) => ({ ...p, tipo: e.target.value }))}
                    placeholder="Cuota ordinaria / extraordinaria / Otros..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción *</label>
                  <input
                    value={pagoForm.descripcion}
                    onChange={(e) => setPagoForm((p) => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Mensualidad condominio, Fondo imprevistos..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm((p) => ({ ...p, monto: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>

                {"estado" in pagoForm && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Estado</label>
                    <select
                      value={pagoForm.estado}
                      onChange={(e) => setPagoForm((p) => ({ ...p, estado: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="activo">activo</option>
                      <option value="inactivo">inactivo</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPagoModal(false);
                      setPagoError(null);
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                  >
                    {editingPago ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Multa */}
        {showMultaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">{editingMulta ? "Editar multa" : "Nueva multa"}</h2>

              {multaError && <InlineError text={multaError} />}

              <form onSubmit={submitMulta} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción *</label>
                  <input
                    value={multaForm.descripcion}
                    onChange={(e) => setMultaForm((m) => ({ ...m, descripcion: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={multaForm.monto}
                    onChange={(e) => setMultaForm((m) => ({ ...m, monto: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>

                {"estado" in multaForm && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Estado</label>
                    <select
                      value={multaForm.estado}
                      onChange={(e) => setMultaForm((m) => ({ ...m, estado: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="activo">activo</option>
                      <option value="inactivo">inactivo</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMultaModal(false);
                      setMultaError(null);
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                  >
                    {editingMulta ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
