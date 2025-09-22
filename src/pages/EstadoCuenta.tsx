import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../services/api";

import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

type Cargo = {
  tipo: string;
  descripcion: string;
  monto: number;
  origen: "pago" | "multa";
  fecha?: string | null;
};

type Pago = {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
  hora: string;
  tipo_pago: string;
  estado: string;
};

type EstadoCuenta = {
  mes: string;
  propiedades: string[];
  cargos: Cargo[];
  pagos: Pago[];
  totales: { cargos: string; pagos: string; saldo: string };
  mensaje: string;
};

export default function EstadoCuenta() {
  const { token } = useAuth();

  // mes en formato YYYY-MM para el backend
  const [mes, setMes] = useState<string>(new Date().toISOString().slice(0, 7));
  // fecha auxiliar para el picker (usamos el día 1 del mes)
  const [pickerDate, setPickerDate] = useState<Date>(
    parse(mes + "-01", "yyyy-MM-dd", new Date())
  );

  const [data, setData] = useState<EstadoCuenta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/estado-cuenta/?mes=${mes}`, {
        headers: { Authorization: `Token ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.detail || "No se pudo obtener el estado.");
      setData(j);
    } catch (e: any) {
      setError(e?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar(); // eslint-disable-next-line
  }, [mes, token]);

  const cargosOrdenados = useMemo(() => {
    return (data?.cargos || []).slice().sort((a, b) => {
      const da = a.fecha || "";
      const db = b.fecha || "";
      return db.localeCompare(da);
    });
  }, [data]);

  async function descargarComprobante(id: number) {
    const token = localStorage.getItem("token");
    const resp = await fetch(`${API_BASE}/api/comprobante/${id}/`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!resp.ok) throw new Error("No se pudo descargar");
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprobante_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // cuando el usuario elige otro mes/año
  function onPickMonth(d: Date | null) {
    if (!d) return;
    setPickerDate(d);
    setMes(format(d, "yyyy-MM")); // lo que consume el endpoint
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Estado de Cuenta</h1>
            <p className="text-slate-600 text-sm">
              {data?.propiedades?.length ? `Mis unidades: ${data.propiedades.join(", ")}` : "—"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Mes</label>
              <DatePicker
                selected={pickerDate}
                onChange={onPickMonth}
                dateFormat="yyyy-MM"
                showMonthYearPicker
                showFullMonthYearPicker
                showFourColumnMonthYearPicker
                onChangeRaw={(e) => e.preventDefault()}
                onKeyDown={(e) => e.preventDefault()}
                // Opcionales:
                maxDate={new Date()} // para no permitir meses futuros
                // minDate={parse("2024-01-01", "yyyy-MM-dd", new Date())}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <button
              onClick={cargar}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}
        {loading && (
          <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl">
            Cargando…
          </div>
        )}
        {data?.mensaje && !loading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
            {data.mensaje}
          </div>
        )}

        {data && (
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="text-slate-500 text-sm">Cargos del mes</div>
              <div className="text-2xl font-semibold">Bs. {data.totales.cargos}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="text-slate-500 text-sm">Pagos del mes</div>
              <div className="text-2xl font-semibold">Bs. {data.totales.pagos}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="text-slate-500 text-sm">Saldo</div>
              <div className="text-2xl font-semibold">Bs. {data.totales.saldo}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
          <div className="px-4 py-3 border-b bg-slate-50 font-medium">Cargos (Expensas/Servicios y Multas)</div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Monto (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cargosOrdenados.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{c.fecha ? new Date(c.fecha).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">{c.origen === "multa" ? "Multa" : c.tipo}</td>
                    <td className="px-4 py-3">{c.descripcion}</td>
                    <td className="px-4 py-3 text-right">{Number(c.monto).toFixed(2)}</td>
                  </tr>
                ))}
                {!cargosOrdenados.length && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>Sin cargos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 font-medium">Pagos y Comprobantes</div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Monto (Bs.)</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data?.pagos?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{new Date(p.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{p.hora}</td>
                    <td className="px-4 py-3">{p.concepto}</td>
                    <td className="px-4 py-3">{p.tipo_pago}</td>
                    <td className="px-4 py-3 text-right">{Number(p.monto).toFixed(2)}</td>
                    <td className="px-4 py-3">{p.estado}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => descargarComprobante(p.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
                      >
                        Descargar comprobante
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.pagos?.length && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={7}>Sin pagos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
