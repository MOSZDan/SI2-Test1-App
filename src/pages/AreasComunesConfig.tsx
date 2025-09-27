// src/pages/AreasComunesConfig.tsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { areasApi, AreaComunDTO } from "../services/api";
import { useAuth } from "../context/AuthContext";

type FormArea = {
  descripcion: string;
  costo: string;         // strings en inputs; se convierten al enviar
  capacidad_max: string;
  estado: "activo" | "inactivo" | "mantenimiento";
};

type HorarioLite = { id: number; hora_ini: string; hora_fin: string };

export default function AreasComunesConfig() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<AreaComunDTO[]>([]);
  const [selected, setSelected] = useState<AreaComunDTO | null>(null);

  // form área (crear/editar)
  const [editing, setEditing] = useState<AreaComunDTO | null>(null);
  const [form, setForm] = useState<FormArea>({
    descripcion: "",
    costo: "",
    capacidad_max: "",
    estado: "activo",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // horarios
  const [horarios, setHorarios] = useState<HorarioLite[]>([]);
  const [hIni, setHIni] = useState("");
  const [hFin, setHFin] = useState("");
  const [hLoading, setHLoading] = useState(false);
  const [hSaving, setHSaving] = useState(false);

  // cargar áreas
  const loadAreas = async () => {
    setLoading(true);
    try {
      const data = await areasApi.list(token!);
      setAreas(data);
      // refrescar selección si existía
      if (selected) {
        const upd = data.find((a: AreaComunDTO) => a.id === selected.id) || null;
        setSelected(upd);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error cargando áreas.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cargar horarios del área seleccionada
  const loadHorarios = async (area: AreaComunDTO | null) => {
    if (!area) {
      setHorarios([]);
      return;
    }
    setHLoading(true);
    try {
      const data = await areasApi.horarios.list(token!, area.id);
      setHorarios(
        data.results.map((h) => ({ id: h.id, hora_ini: h.hora_ini, hora_fin: h.hora_fin }))
      );
    } catch (e: any) {
      setError(e?.message ?? "Error cargando horarios.");
    } finally {
      setHLoading(false);
    }
  };

  useEffect(() => {
    loadHorarios(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // helpers
  const resetForm = () => {
    setForm({ descripcion: "", costo: "", capacidad_max: "", estado: "activo" });
    setEditing(null);
  };
  const startEdit = (a: AreaComunDTO) => {
    setEditing(a);
    setForm({
      descripcion: a.descripcion ?? "",
      costo: String(a.costo ?? ""),
      capacidad_max: String(a.capacidad_max ?? ""),
      estado: (a.estado as any) ?? "activo",
    });
  };

  const canSaveArea = useMemo(() => {
    if (!form.descripcion.trim()) return false;
    const costo = Number(form.costo);
    const cap = Number(form.capacidad_max);
    if (Number.isNaN(costo) || costo < 0) return false;
    if (!cap || Number.isNaN(cap) || cap <= 0) return false;
    return true;
  }, [form]);

  const saveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveArea) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        descripcion: form.descripcion.trim(),
        costo: Number(form.costo),
        capacidad_max: Number(form.capacidad_max),
        estado: form.estado,
      };
      if (editing) {
        await areasApi.update(token!, editing.id, payload);
      } else {
        await areasApi.create(token!, payload);
      }
      await loadAreas();
      resetForm();
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar el área.");
    } finally {
      setSaving(false);
    }
  };

  const deleteArea = async (a: AreaComunDTO) => {
    if (!confirm(`¿Eliminar área "${a.descripcion}"? Esta acción es permanente.`)) return;
    try {
      await areasApi.remove(token!, a.id);
      if (selected?.id === a.id) setSelected(null);
      await loadAreas();
    } catch (e: any) {
      alert(e?.message ?? "No se pudo eliminar el área.");
    }
  };

  const addHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!hIni || !hFin) return alert("Completa Hora inicio y Hora fin.");
    setHSaving(true);
    setError(null);
    try {
      await areasApi.horarios.create(token!, {
        id_area_c: selected.id,
        hora_ini: `${hIni}:00`,
        hora_fin: `${hFin}:00`,
      });
      setHIni("");
      setHFin("");
      await loadHorarios(selected);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo agregar el horario (¿solape o rango inválido?).");
    } finally {
      setHSaving(false);
    }
  };

  const removeHorario = async (h: HorarioLite) => {
    if (!confirm(`¿Eliminar franja ${h.hora_ini} – ${h.hora_fin}?`)) return;
    try {
      await areasApi.horarios.remove(token!, h.id);
      await loadHorarios(selected);
    } catch (e: any) {
      alert(e?.message ?? "No se pudo eliminar el horario.");
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Configuración de áreas comunes</h1>

        {/* Contenido principal: listado + formulario */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LISTA DE ÁREAS */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between p-4">
                <h2 className="font-medium">Áreas registradas</h2>
                <button
                  onClick={() => {
                    resetForm();
                  }}
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
                >
                  Nueva área
                </button>
              </div>

              {loading ? (
                <div className="p-4 text-sm text-slate-500">Cargando…</div>
              ) : areas.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No hay áreas registradas.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2">Descripción</th>
                        <th className="text-left px-3 py-2">Costo</th>
                        <th className="text-left px-3 py-2">Aforo</th>
                        <th className="text-left px-3 py-2">Estado</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {areas.map((a) => (
                        <tr key={a.id} className={selected?.id === a.id ? "bg-blue-50/60" : ""}>
                          <td className="px-3 py-2">{a.descripcion}</td>
                          <td className="px-3 py-2">{Number(a.costo).toFixed(2)}</td>
                          <td className="px-3 py-2">{a.capacidad_max}</td>
                          <td className="px-3 py-2 capitalize">{a.estado}</td>
                          <td className="px-3 py-2 space-x-2 text-right">
                            <button
                              onClick={() => setSelected(a)}
                              className="px-2 py-1 rounded border text-xs"
                            >
                              Horarios
                            </button>
                            <button
                              onClick={() => startEdit(a)}
                              className="px-2 py-1 rounded border text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteArea(a)}
                              className="px-2 py-1 rounded border border-red-200 text-red-600 text-xs"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* GESTIÓN DE HORARIOS */}
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-medium">
                  Horarios {selected ? `— ${selected.descripcion}` : ""}
                </h2>
              </div>

              {!selected ? (
                <div className="p-4 text-sm text-slate-500">
                  Selecciona un área para gestionar sus horarios.
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <form onSubmit={addHorario} className="flex flex-col sm:flex-row gap-3">
                    <div>
                      <label className="block text-xs text-slate-500">Hora inicio</label>
                      <input
                        type="time"
                        value={hIni}
                        onChange={(e) => setHIni(e.target.value)}
                        className="border rounded px-2 py-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500">Hora fin</label>
                      <input
                        type="time"
                        value={hFin}
                        onChange={(e) => setHFin(e.target.value)}
                        className="border rounded px-2 py-1"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        disabled={hSaving}
                        className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                      >
                        {hSaving ? "Agregando…" : "Agregar franja"}
                      </button>
                    </div>
                  </form>

                  {hLoading ? (
                    <div className="text-sm text-slate-500">Cargando horarios…</div>
                  ) : horarios.length === 0 ? (
                    <div className="text-sm text-slate-500">No hay horarios para esta área.</div>
                  ) : (
                    <ul className="divide-y border rounded">
                      {horarios.map((h) => (
                        <li
                          key={h.id}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <span>
                            {h.hora_ini} — {h.hora_fin}
                          </span>
                          <button
                            onClick={() => removeHorario(h)}
                            className="px-2 py-1 rounded border border-red-200 text-red-600 text-xs"
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* FORM ÁREA */}
          <section className="lg:col-span-1">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <h2 className="font-medium mb-3">{editing ? "Editar área" : "Nueva área"}</h2>

              {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

              <form onSubmit={saveArea} className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Descripción *</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Costo *</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="w-full border rounded px-3 py-2"
                    value={form.costo}
                    onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Aforo (capacidad) *</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border rounded px-3 py-2"
                    value={form.capacidad_max}
                    onChange={(e) => setForm((f) => ({ ...f, capacidad_max: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Estado</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={form.estado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estado: e.target.value as FormArea["estado"] }))
                    }
                  >
                    <option value="activo">activo</option>
                    <option value="inactivo">inactivo</option>
                    <option value="mantenimiento">mantenimiento</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={!canSaveArea || saving}
                    className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                  >
                    {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear área"}
                  </button>
                  <button type="button" onClick={resetForm} className="px-4 py-2 rounded border">
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
