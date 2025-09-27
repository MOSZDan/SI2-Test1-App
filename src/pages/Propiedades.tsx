// pages/Propiedades.tsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

// ---- Helper UI ----
function InlineError({ text }: { text: string }) {
  return (
    <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
      <strong>Error:</strong> {text}
    </div>
  );
}

// Tipos
type Propiedad = {
  codigo: number;
  tamano_m2: number;
  nro_casa: number;
  piso: number;
  descripcion: string;
  propietario_actual?: {
    codigo: number;
    nombre: string;
    apellido: string;
    correo: string;
    tipo_rol: string;
    fecha_ini: string;
    fecha_fin?: string;
  };
};

type Usuario = {
  codigo: number;
  nombre: string;
  apellido: string;
  correo: string;
  idrol: number;
  rol?: {
    descripcion: string;
    tipo: string;
  };
};

type PropiedadForm = {
  nro_casa: number | "";
  piso: number | "";
  tamano_m2: number | "";
  descripcion: string;
};

type VinculacionForm = {
  codigo_usuario: number | "";
  fecha_ini: string;
  fecha_fin: string;
};

// Componente principal
export default function Propiedades() {
  const { token } = useAuth();

  // Estados principales (página)
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);      // errores generales de la página
  const [message, setMessage] = useState<string | null>(null);

  // Estados de error específicos (modales)
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [vincError, setVincError] = useState<string | null>(null);

  // Estados para filtros y búsqueda
  const [search, setSearch] = useState("");
  const [filterPiso, setFilterPiso] = useState<number | "">("");

  // Estados para formularios
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showVinculacionForm, setShowVinculacionForm] = useState(false);
  const [selectedPropiedad, setSelectedPropiedad] = useState<Propiedad | null>(null);

  // Estados de formularios
  const [propiedadForm, setPropiedadForm] = useState<PropiedadForm>({
    nro_casa: "",
    piso: "",
    tamano_m2: "",
    descripcion: ""
  });

  const [vinculacionForm, setVinculacionForm] = useState<VinculacionForm>({
    codigo_usuario: "",
    fecha_ini: new Date().toISOString().split("T")[0],
    fecha_fin: ""
  });

  const [saving, setSaving] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    if (token) {
      loadPropiedades();
      loadUsuarios();
    }
  }, [token]);

  // Funciones de carga de datos
  const loadPropiedades = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
      const response = await fetch(`${API_BASE}/api/propiedades/?include_residents=true`, {
        headers: { Authorization: `Token ${token}` }
      });

      if (!response.ok) throw new Error("Error cargando propiedades");

      const data = await response.json();
      setPropiedades(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const loadUsuarios = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
      const response = await fetch(`${API_BASE}/api/usuarios/?ordering=nombre`, {
        headers: { Authorization: `Token ${token}` }
      });

      if (!response.ok) throw new Error("Error cargando usuarios");

      const data = await response.json();
      const allUsers = Array.isArray(data) ? data : data.results || [];

      // Filtrar solo copropietarios e inquilinos
      const residentes = allUsers.filter((user: Usuario) => user.idrol === 1 || user.idrol === 2);
      setUsuarios(residentes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      console.error("Error cargando usuarios:", errorMessage);
    }
  };

  // Filtrado de propiedades
  const filteredPropiedades = useMemo(() => {
    return propiedades.filter((prop) => {
      const matchesSearch =
        !search ||
        prop.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        prop.nro_casa.toString().includes(search) ||
        prop.propietario_actual?.nombre.toLowerCase().includes(search.toLowerCase()) ||
        prop.propietario_actual?.apellido.toLowerCase().includes(search.toLowerCase());

      const matchesPiso = filterPiso === "" || prop.piso === filterPiso;

      return matchesSearch && matchesPiso;
    });
  }, [propiedades, search, filterPiso]);

  // ---------- Validaciones (devuelven mensaje o null) ----------
  const validatePropiedadForm = (): string | null => {
    if (!propiedadForm.nro_casa || !propiedadForm.descripcion || propiedadForm.tamano_m2 === "") {
      return "Número de casa, descripción y tamaño son obligatorios";
    }
    if (Number(propiedadForm.tamano_m2) <= 0) {
      return "El tamaño debe ser mayor a 0";
    }
    return null;
  };

  const validateVinculacionForm = (): string | null => {
    if (!vinculacionForm.codigo_usuario || !vinculacionForm.fecha_ini) {
      return "Usuario y fecha de inicio son obligatorios";
    }
    if (vinculacionForm.fecha_fin && vinculacionForm.fecha_fin <= vinculacionForm.fecha_ini) {
      return "La fecha de fin debe ser posterior a la fecha de inicio";
    }
    return null;
  };

  // ---------- Handlers ----------
  const handleCreatePropiedad = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validatePropiedadForm();
    if (v) {
      setCreateError(v);
      return;
    }

    setSaving(true);
    setCreateError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
      const response = await fetch(`${API_BASE}/api/propiedades/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nro_casa: Number(propiedadForm.nro_casa),
          piso: Number(propiedadForm.piso),
          tamano_m2: Number(propiedadForm.tamano_m2),
          descripcion: propiedadForm.descripcion
        })
      });

      if (!response.ok) {
        let msg = "Error creando propiedad";
        try {
          const errorData = await response.json();
          msg = errorData.detail || msg;
        } catch {}
        throw new Error(msg);
      }

      setMessage("Unidad habitacional creada exitosamente");
      resetPropiedadForm();
      setShowCreateForm(false);
      loadPropiedades();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const handleEditPropiedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropiedad) return;
    const v = validatePropiedadForm();
    if (v) {
      setEditError(v);
      return;
    }

    setSaving(true);
    setEditError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
      const response = await fetch(`${API_BASE}/api/propiedades/${selectedPropiedad.codigo}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nro_casa: Number(propiedadForm.nro_casa),
          piso: Number(propiedadForm.piso),
          tamano_m2: Number(propiedadForm.tamano_m2),
          descripcion: propiedadForm.descripcion
        })
      });

      if (!response.ok) {
        let msg = "Error actualizando propiedad";
        try {
          const errorData = await response.json();
          msg = errorData.detail || msg;
        } catch {}
        throw new Error(msg);
      }

      setMessage("Unidad habitacional actualizada exitosamente");
      resetPropiedadForm();
      setShowEditForm(false);
      setSelectedPropiedad(null);
      loadPropiedades();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const handleVincularResidente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropiedad) return;
    const v = validateVinculacionForm();
    if (v) {
      setVincError(v);
      return;
    }

    setSaving(true);
    setVincError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
      const response = await fetch(`${API_BASE}/api/pertenece/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          codigo_usuario: Number(vinculacionForm.codigo_usuario),
          codigo_propiedad: selectedPropiedad.codigo,
          fecha_ini: vinculacionForm.fecha_ini,
          fecha_fin: vinculacionForm.fecha_fin || null
        })
      });

      if (!response.ok) {
        let msg = "Error vinculando residente";
        try {
          const errorData = await response.json();
          msg = errorData.detail || msg;
        } catch {}
        throw new Error(msg);
      }

      setMessage("Residente vinculado exitosamente");
      resetVinculacionForm();
      setShowVinculacionForm(false);
      setSelectedPropiedad(null);
      loadPropiedades();
    } catch (err) {
      setVincError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  // Funciones de utilidad
  const resetPropiedadForm = () => {
    setPropiedadForm({
      nro_casa: "",
      piso: "",
      tamano_m2: "",
      descripcion: ""
    });
  };

  const resetVinculacionForm = () => {
    setVinculacionForm({
      codigo_usuario: "",
      fecha_ini: new Date().toISOString().split("T")[0],
      fecha_fin: ""
    });
  };

  const openEditForm = (propiedad: Propiedad) => {
    setEditError(null);
    setSelectedPropiedad(propiedad);
    setPropiedadForm({
      nro_casa: propiedad.nro_casa,
      piso: propiedad.piso,
      tamano_m2: propiedad.tamano_m2,
      descripcion: propiedad.descripcion
    });
    setShowEditForm(true);
  };

  const openVinculacionForm = (propiedad: Propiedad) => {
    setVincError(null);
    setSelectedPropiedad(propiedad);
    resetVinculacionForm();
    setShowVinculacionForm(true);
  };

  const clearMessages = () => {
    setError(null);
    setMessage(null);
  };

  const getPisosUnicos = () => {
    const pisos = [...new Set(propiedades.map((p) => p.piso))].sort((a, b) => a - b);
    return pisos;
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold">Configurar Unidades Habitacionales</h1>

          <button
            onClick={() => {
              clearMessages();
              setCreateError(null);
              setShowCreateForm(true);
            }}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium"
          >
            Nueva Unidad
          </button>
        </div>

        {/* Mensajes de página */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex justify-between items-start">
            <div className="flex-1">
              <strong>Error:</strong> {error}
            </div>
            <button onClick={clearMessages} className="ml-2 text-red-600 hover:text-red-800 font-bold">
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex justify-between items-start">
            <div className="flex-1">
              <strong>Éxito:</strong> {message}
            </div>
            <button onClick={clearMessages} className="ml-2 text-green-600 hover:text-green-800 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar por descripción, número o residente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />

          <select
            value={filterPiso}
            onChange={(e) => setFilterPiso(e.target.value === "" ? "" : Number(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="">Todos los pisos</option>
            {getPisosUnicos().map((piso) => (
              <option key={piso} value={piso}>
                {piso === 0 ? "Planta baja / Casa" : `Piso ${piso}`}
              </option>
            ))}
          </select>

          <div className="flex items-center text-sm text-slate-600">Total: {filteredPropiedades.length} unidades</div>
        </div>

        {/* Lista de propiedades */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500">Cargando unidades...</p>
            </div>
          ) : filteredPropiedades.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">No hay unidades</h3>
              <p className="text-slate-500 mb-4">
                {search || filterPiso !== "" ? "No se encontraron unidades con los filtros aplicados" : "Aún no hay unidades registradas"}
              </p>
              {!search && filterPiso === "" && (
                <button onClick={() => setShowCreateForm(true)} className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  Crear primera unidad
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Número</th>
                    <th className="px-4 py-3 text-left font-medium">Piso</th>
                    <th className="px-4 py-3 text-left font-medium">Tamaño (m²)</th>
                    <th className="px-4 py-3 text-left font-medium">Descripción</th>
                    <th className="px-4 py-3 text-left font-medium">Residente Actual</th>
                    <th className="px-4 py-3 text-left font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPropiedades.map((propiedad) => (
                    <tr key={propiedad.codigo} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{propiedad.nro_casa}</td>
                      <td className="px-4 py-3 text-slate-600">{propiedad.piso === 0 ? "PB" : propiedad.piso}</td>
                      <td className="px-4 py-3 text-slate-600">{propiedad.tamano_m2.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-600">{propiedad.descripcion}</td>
                      <td className="px-4 py-3">
                        {propiedad.propietario_actual ? (
                          <div className="text-sm">
                            <div className="font-medium text-slate-800">
                              {propiedad.propietario_actual.nombre} {propiedad.propietario_actual.apellido}
                            </div>
                            <div className="text-slate-500">
                              {propiedad.propietario_actual.tipo_rol} • Desde{" "}
                              {new Date(propiedad.propietario_actual.fecha_ini).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin residente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditForm(propiedad)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openVinculacionForm(propiedad)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                          >
                            Vincular
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Crear Propiedad */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Nueva Unidad Habitacional</h2>

              {createError && <InlineError text={createError} />}

              <form onSubmit={handleCreatePropiedad} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Casa/Unidad *</label>
                  <input
                    type="number"
                    required
                    value={propiedadForm.nro_casa}
                    onChange={(e) =>
                      setPropiedadForm((prev) => ({ ...prev, nro_casa: Number(e.target.value) || "" }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Piso (0 para casas/planta baja)</label>
                  <input
                    type="number"
                    min="0"
                    value={propiedadForm.piso}
                    onChange={(e) =>
                      setPropiedadForm((prev) => ({ ...prev, piso: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tamaño (m²) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={propiedadForm.tamano_m2}
                    onChange={(e) =>
                      setPropiedadForm((prev) => ({ ...prev, tamano_m2: Number(e.target.value) || "" }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción *</label>
                  <input
                    type="text"
                    required
                    value={propiedadForm.descripcion}
                    onChange={(e) => setPropiedadForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Ej: Casa 104 - Calle E"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetPropiedadForm();
                      setCreateError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Crear Unidad"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Propiedad */}
        {showEditForm && selectedPropiedad && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Editar Unidad Habitacional</h2>

              {editError && <InlineError text={editError} />}

              <form onSubmit={handleEditPropiedad} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Casa/Unidad *</label>
                  <input
                    type="number"
                    required
                    value={propiedadForm.nro_casa}
                    onChange={(e) =>
                      setPropiedadForm((prev) => ({ ...prev, nro_casa: Number(e.target.value) || "" }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Piso (0 para casas/planta baja)</label>
                  <input
                    type="number"
                    min="0"
                    value={propiedadForm.piso}
                    onChange={(e) =>
                      setPropiedadForm((prev) => ({ ...prev, piso: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tamaño (m²) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={propiedadForm.tamano_m2}
                    onChange={(e) =>
                      setPropiedadForm((prev) => ({ ...prev, tamano_m2: Number(e.target.value) || "" }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción *</label>
                  <input
                    type="text"
                    required
                    value={propiedadForm.descripcion}
                    onChange={(e) => setPropiedadForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setSelectedPropiedad(null);
                      resetPropiedadForm();
                      setEditError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Actualizar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Vincular Residente */}
        {showVinculacionForm && selectedPropiedad && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">
                Vincular Residente - {selectedPropiedad.descripcion}
              </h2>

              {vincError && <InlineError text={vincError} />}

              <form onSubmit={handleVincularResidente} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Residente *</label>
                  <select
                    required
                    value={vinculacionForm.codigo_usuario}
                    onChange={(e) =>
                      setVinculacionForm((prev) => ({ ...prev, codigo_usuario: Number(e.target.value) || "" }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Seleccionar residente...</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.codigo} value={usuario.codigo}>
                        {usuario.nombre} {usuario.apellido} - {usuario.rol?.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={vinculacionForm.fecha_ini}
                    onChange={(e) => setVinculacionForm((prev) => ({ ...prev, fecha_ini: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Fin (opcional)</label>
                  <input
                    type="date"
                    value={vinculacionForm.fecha_fin}
                    onChange={(e) => setVinculacionForm((prev) => ({ ...prev, fecha_fin: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Dejar vacío para vinculación permanente</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVinculacionForm(false);
                      setSelectedPropiedad(null);
                      resetVinculacionForm();
                      setVincError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? "Vinculando..." : "Vincular"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-3">Resumen del Sistema</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total de unidades:</span>
                <span className="font-medium">{propiedades.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Unidades ocupadas:</span>
                <span className="font-medium">{propiedades.filter((p) => p.propietario_actual).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Unidades disponibles:</span>
                <span className="font-medium">{propiedades.filter((p) => !p.propietario_actual).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Superficie total:</span>
                <span className="font-medium">
                  {propiedades.reduce((sum, p) => sum + p.tamano_m2, 0).toFixed(2)} m²
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-3">Distribución por Piso</h3>
            <div className="space-y-2 text-sm">
              {getPisosUnicos().map((piso) => {
                const unidadesPiso = propiedades.filter((p) => p.piso === piso);
                return (
                  <div key={piso} className="flex justify-between">
                    <span className="text-slate-600">
                      {piso === 0 ? "Planta baja / Casas:" : `Piso ${piso}:`}
                    </span>
                    <span className="font-medium">{unidadesPiso.length} unidades</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ayuda e información */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3">Información del Sistema</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">Gestión de Unidades:</h4>
              <ul className="space-y-1">
                <li>• Cada unidad debe tener un número único por piso</li>
                <li>• El piso 0 se usa para casas o planta baja</li>
                <li>• La descripción ayuda a identificar la ubicación</li>
                <li>• El tamaño se registra en metros cuadrados</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Vinculación de Residentes:</h4>
              <ul className="space-y-1">
                <li>• Solo copropietarios e inquilinos pueden vincularse</li>
                <li>• Una persona puede estar en una sola unidad a la vez</li>
                <li>• Las fechas de vinculación pueden ser temporales</li>
                <li>• Todas las operaciones se registran en bitácora</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
