// src/pages/AreasComunesConfig.tsx
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { areasApi, AreaComunDTO, AreaComunForm, HorarioDTO, HorarioForm } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface AreaWithHorarios extends AreaComunDTO {
  horarios?: HorarioDTO[];
}

export default function AreasComunesConfig() {
  const { token, user } = useAuth();

  // Estados principales
  const [areas, setAreas] = useState<AreaWithHorarios[]>([]);
  const [selectedArea, setSelectedArea] = useState<AreaWithHorarios | null>(null);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaWithHorarios | null>(null);
  const [editingHorario, setEditingHorario] = useState<HorarioDTO | null>(null);

  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Estados de formularios
  const [areaForm, setAreaForm] = useState<AreaComunForm>({
    descripcion: "",
    costo: 0,
    capacidad_max: 1,
    estado: "activo"
  });

  const [horarioForm, setHorarioForm] = useState<HorarioForm>({
    id_area_c: 0,
    hora_ini: "",
    hora_fin: ""
  });

  // Verificar que es administrador
  useEffect(() => {
    if (user && user.idrol !== 3) {
      setError("Solo los administradores pueden acceder a esta sección");
      return;
    }

    if (!token) return;
    cargarAreas();
  }, [token, user]);

  // Paso 2: Sistema lista áreas existentes con costo, capacidad y estado
  const cargarAreas = async () => {
    try {
      setLoading(true);
      const areasData = await areasApi.list(token!);

      // Cargar horarios para cada área
      const areasConHorarios = await Promise.all(
        areasData.map(async (area) => {
          try {
            const horariosResponse = await areasApi.horarios.list(token!, area.id);
            return {
              ...area,
              horarios: horariosResponse.results
            };
          } catch (error) {
            return {
              ...area,
              horarios: []
            };
          }
        })
      );

      setAreas(areasConHorarios);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error cargando áreas";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Administrador elige Nueva Área o Editar
  const abrirModalArea = (area?: AreaWithHorarios) => {
    setEditingArea(area || null);
    if (area) {
      // Paso 3a-3d: Cargar datos existentes para editar
      setAreaForm({
        descripcion: area.descripcion,
        costo: area.costo,
        capacidad_max: area.capacidad_max,
        estado: area.estado
      });
    } else {
      // Nueva área con valores por defecto
      setAreaForm({
        descripcion: "",
        costo: 0,
        capacidad_max: 1,
        estado: "activo"
      });
    }
    setError("");
    setShowAreaModal(true);
  };

  // Pasos 4 y 5: Validar campos obligatorios y guardar
  const guardarArea = async (e: React.FormEvent) => {
    e.preventDefault();

    // Paso 4: Validar campos obligatorios, formatos y que Costo ≥ 0
    if (!areaForm.descripcion.trim()) {
      setError("La descripción es obligatoria");
      return;
    }

    if (areaForm.costo < 0) {
      setError("El costo debe ser mayor o igual a 0");
      return;
    }

    if (areaForm.capacidad_max <= 0) {
      setError("La capacidad máxima debe ser mayor a 0");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // Paso 5: Guardar el registro en AreasComunes y confirmar
      if (editingArea) {
        await areasApi.update(token!, editingArea.id, areaForm);
        alert("Área actualizada exitosamente");
      } else {
        await areasApi.create(token!, areaForm);
        alert("Área creada exitosamente");
      }

      setShowAreaModal(false);
      await cargarAreas();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error guardando área";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Paso 6: Administrador abre pestaña Horarios del área
  const seleccionarArea = (area: AreaWithHorarios) => {
    setSelectedArea(area);
  };

  // Paso 6a: Agregar intervalos HoraIni–HoraFin
  const abrirModalHorario = (horario?: HorarioDTO) => {
    if (!selectedArea) return;

    setEditingHorario(horario || null);
    if (horario) {
      setHorarioForm({
        id_area_c: horario.id_area_c,
        hora_ini: horario.hora_ini,
        hora_fin: horario.hora_fin
      });
    } else {
      setHorarioForm({
        id_area_c: selectedArea.id,
        hora_ini: "",
        hora_fin: ""
      });
    }
    setError("");
    setShowHorarioModal(true);
  };

  // Paso 6b: Sistema asocia cada franja al área mediante IdAreaC y guarda en Horarios
  const guardarHorario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!horarioForm.hora_ini || !horarioForm.hora_fin) {
      setError("Hora de inicio y fin son obligatorias");
      return;
    }

    if (horarioForm.hora_ini >= horarioForm.hora_fin) {
      setError("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingHorario) {
        await areasApi.horarios.update(token!, editingHorario.id, horarioForm);
        alert("Horario actualizado exitosamente");
      } else {
        await areasApi.horarios.create(token!, horarioForm);
        alert("Horario agregado exitosamente");
      }

      setShowHorarioModal(false);
      await cargarAreas();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error guardando horario";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const eliminarHorario = async (horarioId: number) => {
    if (!confirm("¿Confirma que desea eliminar este horario?")) return;

    try {
      await areasApi.horarios.remove(token!, horarioId);
      await cargarAreas();
      alert("Horario eliminado exitosamente");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error eliminando horario";
      setError(errorMessage);
    }
  };

  // Paso 7: Marcar área como deshabilitada por mantenimiento
  const cambiarEstadoArea = async (area: AreaWithHorarios, nuevoEstado: "activo" | "inactivo" | "mantenimiento") => {
    const mensaje = nuevoEstado === "mantenimiento"
      ? "¿Marcar área en mantenimiento? El sistema impedirá nuevas reservas mientras dure."
      : `¿Cambiar estado del área a "${nuevoEstado}"?`;

    if (!confirm(mensaje)) return;

    try {
      await areasApi.update(token!, area.id, { estado: nuevoEstado });
      await cargarAreas();
      alert(`Estado del área cambiado a "${nuevoEstado}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error cambiando estado";
      setError(errorMessage);
    }
  };

  const eliminarArea = async (area: AreaWithHorarios) => {
    if (!confirm(`¿Confirma que desea eliminar el área "${area.descripcion}"? Esta acción no se puede deshacer.`)) return;

    try {
      await areasApi.remove(token!, area.id);
      await cargarAreas();
      if (selectedArea?.id === area.id) {
        setSelectedArea(null);
      }
      alert("Área eliminada exitosamente");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error eliminando área";
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando configuración de áreas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user && user.idrol !== 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Acceso Restringido</h2>
            <p className="text-red-700">Solo los administradores pueden acceder a esta sección.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Paso 1: Administrador accede a Áreas Comunes → Configuración */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Configuración de Áreas Comunes y Reglas</h1>
          <button
            onClick={() => abrirModalArea()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Nueva Área
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LADO IZQUIERDO: Lista de Áreas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Catálogo de Áreas Comunes</h2>

            {areas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay áreas configuradas. Crea la primera área.
              </p>
            ) : (
              <div className="space-y-4">
                {areas.map((area) => (
                  <div
                    key={area.id}
                    className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                      selectedArea?.id === area.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => seleccionarArea(area)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-lg">{area.descripcion}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        area.estado === 'activo' ? 'bg-green-100 text-green-800' :
                        area.estado === 'mantenimiento' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {area.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <span>Costo por uso: ${area.costo}</span>
                      <span>Aforo: {area.capacidad_max} personas</span>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      Horarios configurados: {area.horarios?.length || 0}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalArea(area);
                        }}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                      >
                        Editar
                      </button>

                      {area.estado === 'activo' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cambiarEstadoArea(area, 'mantenimiento');
                          }}
                          className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                        >
                          Mantenimiento
                        </button>
                      )}

                      {area.estado === 'mantenimiento' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cambiarEstadoArea(area, 'activo');
                          }}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                        >
                          Activar
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarArea(area);
                        }}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LADO DERECHO: Horarios del Área Seleccionada */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {selectedArea ? `Horarios - ${selectedArea.descripcion}` : 'Selecciona un área'}
              </h2>
              {selectedArea && (
                <button
                  onClick={() => abrirModalHorario()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Agregar Horario
                </button>
              )}
            </div>

            {!selectedArea ? (
              <p className="text-gray-500 text-center py-8">
                Haz clic en un área para gestionar sus horarios disponibles
              </p>
            ) : !selectedArea.horarios || selectedArea.horarios.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay horarios configurados. Agrega intervalos de tiempo para habilitar reservas.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedArea.horarios
                  .sort((a, b) => a.hora_ini.localeCompare(b.hora_ini))
                  .map((horario) => (
                    <div
                      key={horario.id}
                      className="flex justify-between items-center p-3 border border-gray-200 rounded-lg"
                    >
                      <span className="font-medium">
                        {horario.hora_ini} - {horario.hora_fin}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModalHorario(horario)}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarHorario(horario.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  <strong>Información:</strong> Estos horarios estarán disponibles para reservas.
                  El catálogo alimenta el módulo de reservas y reportes de uso.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal para Área - Pasos 3a, 3b, 3c, 3d */}
        {showAreaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                {editingArea ? 'Editar Área Común' : 'Nueva Área Común'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={guardarArea} className="space-y-4">
                {/* Paso 3a: Ingresa/actualiza Descripción */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descripción *
                  </label>
                  <input
                    type="text"
                    value={areaForm.descripcion}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Ej: Salón de eventos, Piscina, Gimnasio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>

                {/* Paso 3b: Define Costo por uso */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Costo por uso *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={areaForm.costo}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, costo: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Debe ser mayor o igual a 0</p>
                </div>

                {/* Paso 3c: Define CapacidadMax (aforo) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Capacidad Máxima (aforo) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={areaForm.capacidad_max}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, capacidad_max: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>

                {/* Paso 3d: Define Estado (activo / inactivo) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Estado *
                  </label>
                  <select
                    value={areaForm.estado}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, estado: e.target.value as "activo" | "inactivo" | "mantenimiento" }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAreaModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : (editingArea ? 'Actualizar' : 'Crear')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para Horarios - Paso 6a y 6b */}
        {showHorarioModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                {editingHorario ? 'Editar Horario' : 'Agregar Intervalo de Horario'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={guardarHorario} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Hora de Inicio *
                  </label>
                  <input
                    type="time"
                    value={horarioForm.hora_ini}
                    onChange={(e) => setHorarioForm(prev => ({ ...prev, hora_ini: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Hora de Fin *
                  </label>
                  <input
                    type="time"
                    value={horarioForm.hora_fin}
                    onChange={(e) => setHorarioForm(prev => ({ ...prev, hora_fin: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                  <strong>Recomendación:</strong> Crea franjas de 1-2 horas para mayor flexibilidad.
                  Estos intervalos alimentarán el módulo de reservas.
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowHorarioModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : (editingHorario ? 'Actualizar' : 'Agregar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
