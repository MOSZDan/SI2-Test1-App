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
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      setError(errorMessage);
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
    <div className="main-container">
      <Navbar />

      {/* Header limpio y profesional */}
      <div className="page-header">
        <div className="content-wrapper">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center icon-subtle">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Estado de Cuenta</h1>
                <p className="text-sm text-slate-600">
                  {data?.propiedades?.length ? `${data.propiedades.join(", ")}` : "Cargando..."}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <DatePicker
                  selected={pickerDate}
                  onChange={onPickMonth}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  showFullMonthYearPicker
                  showFourColumnMonthYearPicker
                  onChangeRaw={(e) => e && e.preventDefault()}
                  onKeyDown={(e) => e.preventDefault()}
                  maxDate={new Date()}
                  className="form-input pl-10 pr-4 py-2.5 text-sm font-medium w-40"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <button
                onClick={cargar}
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Actualizando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Actualizar</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="content-wrapper space-natural">
        {/* Mensajes de estado limpios */}
        {error && (
          <div className="message-error flex items-start space-x-3">
            <div className="w-5 h-5 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Error al cargar datos</h3>
              <p className="text-red-800 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {data?.mensaje && !loading && (
          <div className="message-success flex items-start space-x-3">
            <div className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-emerald-900 font-semibold">{data.mensaje}</p>
            </div>
          </div>
        )}

        {/* Cards de resumen limpios y profesionales */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="summary-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium mb-2">Cargos del mes</p>
                  <p className="text-2xl font-bold text-slate-900">Bs. {data.totales.cargos}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center icon-subtle">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium mb-2">Pagos del mes</p>
                  <p className="text-2xl font-bold text-slate-900">Bs. {data.totales.pagos}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center icon-subtle">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium mb-2">Saldo</p>
                  <p className={`text-2xl font-bold ${Number(data.totales.saldo) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Bs. {data.totales.saldo}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center icon-subtle ${Number(data.totales.saldo) >= 0 ? 'bg-gradient-to-br from-green-100 to-green-200' : 'bg-gradient-to-br from-red-100 to-red-200'}`}>
                  <svg className={`w-6 h-6 ${Number(data.totales.saldo) >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de cargos limpia */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="table-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2>Cargos (Expensas/Servicios y Multas)</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Monto (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargosOrdenados.map((c, i) => (
                  <tr key={i} className="table-row hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${
                        c.origen === "multa" 
                          ? "status-rejected" 
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {c.origen === "multa" ? "Multa" : c.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{c.descripcion}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      {Number(c.monto).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {!cargosOrdenados.length && (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-500" colSpan={4}>
                      <div className="flex flex-col items-center space-y-3">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-medium text-base">No hay cargos para este mes</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de pagos limpia */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="table-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2>Pagos y Comprobantes</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Concepto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Monto (Bs.)</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.pagos?.map((p) => (
                  <tr key={p.id} className="table-row hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {new Date(p.fecha).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.hora}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{p.concepto}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                        {p.tipo_pago}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      {Number(p.monto).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${
                        p.estado.toLowerCase() === 'aprobado' || p.estado.toLowerCase() === 'completado'
                          ? "status-approved"
                          : p.estado.toLowerCase() === 'pendiente'
                          ? "status-pending"
                          : "bg-gray-100 text-gray-800 border border-gray-200"
                      }`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => descargarComprobante(p.id)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 focus:ring-2 focus:ring-emerald-200 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Descargar</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.pagos?.length && (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-500" colSpan={7}>
                      <div className="flex flex-col items-center space-y-3">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="font-medium text-base">No hay pagos registrados para este mes</p>
                      </div>
                    </td>
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
