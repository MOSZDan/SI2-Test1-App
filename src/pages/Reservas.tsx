// src/pages/Reservas.tsx
import { useEffect, useMemo, useState } from "react";
import {
  areasApi,
  reservasApi,
  AreaComunDTO,
  DisponibilidadResp,
  ReservaDTO,
} from "../services/api";

// Utilidad sencilla para leer el token (ajústalo si ya tienes un AuthContext)
function useToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);
  return token;
}

/** "HH:MM:SS" | "HH:MM" | null/undefined -> "HH:MM" (seguro) */
function hhmmSafe(ss?: string | null) {
  if (!ss || typeof ss !== "string") return "--:--";
  const parts = ss.split(":");
  if (parts.length < 2) return "--:--";
  const [h, m] = parts;
  return `${h?.padStart(2, "0") ?? "--"}:${m?.padStart(2, "0") ?? "--"}`;
}

function fmtHoraRango(ini?: string | null, fin?: string | null) {
  return `${hhmmSafe(ini)} - ${hhmmSafe(fin)}`;
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={
        "px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 " +
        className
      }
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={
        "px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:opacity-60 " +
        className
      }
    />
  );
}

export default function ReservasPage() {
  const token = useToken();

  // Filtros izquierda
  const [areas, setAreas] = useState<AreaComunDTO[]>([]);
  const [areaId, setAreaId] = useState<number | "">("");
  const [fecha, setFecha] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  // Datos de disponibilidad
  const [disp, setDisp] = useState<DisponibilidadResp | null>(null);
  const [loadingDisp, setLoadingDisp] = useState(false);

  // Mis reservas
  const [misReservas, setMisReservas] = useState<ReservaDTO[]>([]);
  const [loadingMis, setLoadingMis] = useState(false);

  // UI estado
  const [creating, setCreating] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFecha, setEditFecha] = useState<string>("");
  const [editIni, setEditIni] = useState<string>("");
  const [editFin, setEditFin] = useState<string>("");

  // Cargar áreas al montar
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await areasApi.list(token, {
          estado: "activo",
          page_size: 500,
          ordering: "descripcion",
        });
        setAreas((res as any).results ?? (res as any)); // por si el backend no pagina
      } catch (e) {
        console.error(e);
      }
    })();
  }, [token]);

  // Buscar disponibilidad
  async function fetchDisponibilidad() {
    if (!token || !areaId || !fecha) return;
    setLoadingDisp(true);
    try {
      const r = await reservasApi.disponibilidad(token, Number(areaId), fecha);
      setDisp(r);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoadingDisp(false);
    }
  }

  // Cargar mis reservas
  async function fetchMisReservas() {
    if (!token) return;
    setLoadingMis(true);
    try {
      const r = await reservasApi.mis(token);
      const data = (Array.isArray(r) ? r : r.results) ?? [];
      // ordenar descendente por fecha + hora
      data.sort((a, b) =>
        a.fecha < b.fecha
          ? 1
          : a.fecha > b.fecha
          ? -1
          : (a.horaini || "") < (b.horaini || "")
          ? 1
          : -1
      );
      setMisReservas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMis(false);
    }
  }

  useEffect(() => {
    fetchMisReservas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const libres = disp?.libres ?? [];
  const ocupadas = disp?.ocupadas ?? [];

  // Crear reserva haciendo click en una franja libre
  async function reservarSlot(hora_ini_ss: string, hora_fin_ss: string) {
    if (!token || !areaId || !fecha) return;
    const txt = `¿Confirmar reserva?\nÁrea: ${
      areas.find((a) => a.id === areaId)?.descripcion
    }\nFecha: ${fecha}\nHorario: ${fmtHoraRango(hora_ini_ss, hora_fin_ss)}`;
    if (!confirm(txt)) return;

    setCreating(true);
    try {
      await reservasApi.crear(token, {
        idareac: Number(areaId),
        fecha,
        hora_ini: hhmmSafe(hora_ini_ss),
        hora_fin: hhmmSafe(hora_fin_ss),
      });
      await fetchDisponibilidad();
      await fetchMisReservas();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  // Cancelar
  async function cancelar(id: number) {
    if (!token) return;
    if (!confirm("¿Cancelar esta reserva?")) return;
    setCancelingId(id);
    try {
      await reservasApi.cancelar(token, id);
      await fetchDisponibilidad();
      await fetchMisReservas();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancelingId(null);
    }
  }

  // Iniciar reprogramación (prefill con valores actuales)
  function startEdit(r: ReservaDTO) {
    setEditingId(r.id);
    setEditFecha(r.fecha);
    setEditIni(hhmmSafe(r.horaini));
    setEditFin(hhmmSafe(r.horafin));
  }

  // Guardar reprogramación
  async function saveEdit(id: number) {
    if (!token) return;
    try {
      await reservasApi.reprogramar(token, id, {
        fecha: editFecha,
        hora_ini: editIni,
        hora_fin: editFin,
      });
      setEditingId(null);
      await fetchDisponibilidad();
      await fetchMisReservas();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const areaOptions = useMemo(
    () =>
      areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.descripcion}
        </option>
      )),
    [areas]
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">Reservas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Izquierda: Disponibilidad */}
        <div className="rounded-2xl border border-gray-200 p-4">
          <h2 className="text-lg font-medium mb-4">Disponibilidad</h2>

          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <select
              className="border rounded-lg px-3 py-2 w-full md:w-1/2"
              value={areaId}
              onChange={(e) =>
                setAreaId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Selecciona un área</option>
              {areaOptions}
            </select>

            <input
              type="date"
              className="border rounded-lg px-3 py-2 w-full md:w-1/2"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mb-4">
            <Button
              onClick={fetchDisponibilidad}
              disabled={!areaId || !fecha || loadingDisp}
            >
              {loadingDisp ? "Buscando..." : "Buscar"}
            </Button>
            <SecondaryButton onClick={() => setDisp(null)} disabled={loadingDisp}>
              Limpiar
            </SecondaryButton>
          </div>

          {/* Resultado */}
          {disp ? (
            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-600">
                  Área: <b>{disp.area.descripcion}</b> · Fecha: <b>{disp.fecha}</b>
                </div>
              </div>

              <section>
                <h3 className="font-medium mb-2">Franjas libres</h3>
                {libres.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No hay disponibilidad para ese día.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {libres.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => reservarSlot(f.hora_ini, f.hora_fin)}
                        disabled={creating}
                        className="px-3 py-1 rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm"
                        title="Reservar esta franja"
                      >
                        {fmtHoraRango(f.hora_ini, f.hora_fin)}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="font-medium mb-2">Reservas ocupadas</h3>
                {ocupadas.length === 0 ? (
                  <div className="text-sm text-gray-500">No hay reservas ese día.</div>
                ) : (
                  <ul className="space-y-2">
                    {ocupadas.map((r) => (
                      <li
                        key={r.id}
                        className="text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between"
                      >
                        <span>{fmtHoraRango(r.horaini, r.horafin)}</span>
                        <span className="text-gray-500">
                          {r.estado || "confirmada"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Selecciona un área y una fecha para ver disponibilidad.
            </div>
          )}
        </div>

        {/* Derecha: Mis reservas */}
        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Mis reservas</h2>
            <SecondaryButton onClick={fetchMisReservas} disabled={loadingMis}>
              {loadingMis ? "Actualizando..." : "Actualizar"}
            </SecondaryButton>
          </div>

          {misReservas.length === 0 ? (
            <div className="text-sm text-gray-500">Aún no tienes reservas.</div>
          ) : (
            <ul className="space-y-3">
              {misReservas.map((r) => {
                const enEdicion = editingId === r.id;
                const estadoNorm = (r?.estado || "").toLowerCase();
                const esCancelada = estadoNorm === "cancelada";
                const esFinalizada =
                  estadoNorm === "finalizada" || estadoNorm === "finalizado";
                const botonesVisibles = !enEdicion && !esCancelada && !esFinalizada;
                const canceling = cancelingId === r.id;

                return (
                  <li key={r.id} className="border rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          #{r.id} · {r.fecha} · {fmtHoraRango(r?.horaini, r?.horafin)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Estado: {r?.estado || "confirmada"}
                        </div>
                      </div>

                      {botonesVisibles ? (
                        <div className="flex gap-2">
                          <SecondaryButton
                            onClick={() => startEdit(r)}
                            title="Reprogramar"
                          >
                            Reprogramar
                          </SecondaryButton>
                          <Button
                            disabled={canceling}
                            onClick={() => cancelar(r.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {canceling ? "Cancelando..." : "Cancelar"}
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {/* Form de reprogramación inline */}
                    {enEdicion && (
                      <div className="mt-3 border-t pt-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Fecha</label>
                            <input
                              type="date"
                              value={editFecha}
                              onChange={(e) => setEditFecha(e.target.value)}
                              className="border rounded-lg px-3 py-2"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">
                              Hora inicio
                            </label>
                            <input
                              type="time"
                              value={editIni}
                              onChange={(e) => setEditIni(e.target.value)}
                              className="border rounded-lg px-3 py-2"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">Hora fin</label>
                            <input
                              type="time"
                              value={editFin}
                              onChange={(e) => setEditFin(e.target.value)}
                              className="border rounded-lg px-3 py-2"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button onClick={() => saveEdit(r.id)}>Guardar</Button>
                          <SecondaryButton onClick={() => setEditingId(null)}>
                            Cancelar
                          </SecondaryButton>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
