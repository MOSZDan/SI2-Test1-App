// src/pages/Reservas.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import {
  areasApi,
  reservasApi,
  AreaComunDTO,
  ReservaDTO,
  DisponibilidadDTO,
  ReservaForm,
} from "../services/api";

export default function ReservasPage() {
  const { token, user } = useAuth();

  // Estados principales
  const [areas, setAreas] = useState<AreaComunDTO[]>([]);
  const [selectedArea, setSelectedArea] = useState<AreaComunDTO | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadDTO | null>(null);
  const [misReservas, setMisReservas] = useState<ReservaDTO[]>([]);

  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [creandoReserva, setCreandoReserva] = useState(false);
  const [error, setError] = useState<string>("");

  // Cargar áreas comunes al montar (paso 1 del caso de uso)
  useEffect(() => {
    if (!token) return;
    cargarAreas();
  }, [token]);

  // Cargar mis reservas
  useEffect(() => {
    if (!token) return;
    cargarMisReservas();
  }, [token]);

  const cargarAreas = async () => {
    try {
      setLoading(true);
      const areasData = await areasApi.list(token!);
      // Filtrar solo áreas activas como indica el caso de uso
      const areasActivas = areasData.filter(area => area.estado === 'activo');
      setAreas(areasActivas);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error cargando áreas";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cargarMisReservas = async () => {
    try {
      const reservasData = await reservasApi.list(token!);
      // Filtrar solo las reservas del usuario actual
      const misReservasData = reservasData.filter(r => r.codigo_usuario === user?.codigo);
      setMisReservas(misReservasData);
    } catch (error) {
      console.error("Error cargando mis reservas:", error);
    }
  };

  // Paso 2 y 4 del caso de uso: Mostrar calendario y horarios disponibles
  const consultarDisponibilidad = async () => {
    if (!selectedArea || !selectedDate) {
      setError("Selecciona un área y una fecha");
      return;
    }

    try {
      setLoadingDisponibilidad(true);
      setError("");
      const dispData = await reservasApi.obtenerDisponibilidad(token!, selectedArea.id, selectedDate);
      setDisponibilidad(dispData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error consultando disponibilidad";
      setError(errorMessage);
      setDisponibilidad(null);
    } finally {
      setLoadingDisponibilidad(false);
    }
  };

  // Ejecutar consulta cuando cambia área o fecha
  useEffect(() => {
    if (selectedArea && selectedDate) {
      consultarDisponibilidad();
    }
  }, [selectedArea, selectedDate]);

  // Pasos 5, 6, 7, 8, 9, 10 del caso de uso: Confirmar reserva
  const confirmarReserva = async (horaIni: string, horaFin: string) => {
    if (!selectedArea || !selectedDate || !user) {
      setError("Datos incompletos para realizar la reserva");
      return;
    }

    const confirmacion = confirm(
      `¿Confirmar reserva?\n` +
      `Área: ${selectedArea.descripcion}\n` +
      `Fecha: ${selectedDate}\n` +
      `Horario: ${horaIni} - ${horaFin}\n` +
      `Costo: $${selectedArea.costo}`
    );

    if (!confirmacion) return;

    try {
      setCreandoReserva(true);
      setError("");

      const reservaPayload: ReservaForm = {
        codigo_usuario: user.codigo,
        id_area_c: selectedArea.id,
        fecha: selectedDate,
        hora_ini: horaIni,
        hora_fin: horaFin
      };

      // Paso 7: Validar disponibilidad en tiempo real
      const validacion = await reservasApi.validarDisponibilidad(token!, reservaPayload);

      if (!validacion.disponible) {
        setError(validacion.mensaje || "El horario ya no está disponible");
        return;
      }

      // Paso 8: Registrar la reserva
      const nuevaReserva = await reservasApi.create(token!, reservaPayload);

      // Paso 9: Comprobante digital (simulado con mensaje)
      alert(
        `¡Reserva confirmada!\n` +
        `Comprobante #${nuevaReserva.id}\n` +
        `Área: ${selectedArea.descripcion}\n` +
        `Fecha: ${selectedDate}\n` +
        `Horario: ${horaIni} - ${horaFin}\n` +
        `Estado: Confirmada`
      );

      // Paso 10: Actualizar vistas (simula notificación)
      await Promise.all([
        consultarDisponibilidad(), // Refrescar disponibilidad
        cargarMisReservas() // Refrescar mis reservas
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al confirmar reserva";
      setError(errorMessage);
    } finally {
      setCreandoReserva(false);
    }
  };

  // Paso 11 y 12 del caso de uso: Cancelar reserva
  const cancelarReserva = async (reserva: ReservaDTO) => {
    const confirmacion = confirm(
      `¿Cancelar reserva #${reserva.id}?\n` +
      `Área: ${reserva.area?.descripcion}\n` +
      `Fecha: ${reserva.fecha}\n` +
      `Esta acción es permanente.`
    );

    if (!confirmacion) return;

    try {
      // Paso 12: Actualizar estado a Cancelada y liberar horario
      await reservasApi.cancelar(token!, reserva.id);

      alert("Reserva cancelada exitosamente");

      // Refrescar datos
      await Promise.all([
        consultarDisponibilidad(),
        cargarMisReservas()
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cancelar reserva";
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando áreas comunes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestión de Reservas - Áreas Comunes</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LADO IZQUIERDO: Disponibilidad y Reservar */}
          <div className="space-y-6">
            {/* Paso 3: Seleccionar área común */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Seleccionar Área Común</h2>
              <div className="space-y-4">
                {areas.map((area) => (
                  <div
                    key={area.id}
                    onClick={() => setSelectedArea(area)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedArea?.id === area.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-medium text-lg">{area.descripcion}</h3>
                    <div className="flex justify-between mt-2 text-sm text-gray-600">
                      <span>Capacidad: {area.capacidad_max} personas</span>
                      <span>Costo: ${area.costo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paso 5: Seleccionar fecha */}
            {selectedArea && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Seleccionar Fecha</h2>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Paso 2 y 4: Mostrar horarios disponibles */}
            {selectedArea && selectedDate && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Horarios Disponibles</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedArea.descripcion} - {selectedDate}
                </p>

                {loadingDisponibilidad ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Consultando disponibilidad...</p>
                  </div>
                ) : disponibilidad ? (
                  <div className="space-y-4">
                    {disponibilidad.horarios_disponibles.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No hay horarios disponibles para esta fecha
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {disponibilidad.horarios_disponibles.map((horario, index) => (
                          <button
                            key={index}
                            onClick={() => confirmarReserva(horario.hora_ini, horario.hora_fin)}
                            disabled={!horario.disponible || creandoReserva}
                            className={`p-3 rounded-lg text-left transition-all ${
                              horario.disponible
                                ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                                : 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {horario.hora_ini} - {horario.hora_fin}
                              </span>
                              <span className="text-sm">
                                {horario.disponible ? 'Disponible' : 'Ocupado'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Mostrar reservas existentes */}
                    {disponibilidad.reservas_existentes.length > 0 && (
                      <div className="mt-6 pt-4 border-t">
                        <h3 className="font-medium text-gray-700 mb-2">Reservas del día:</h3>
                        <div className="space-y-2">
                          {disponibilidad.reservas_existentes.map((reserva) => (
                            <div key={reserva.id} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                              <span className="text-red-700">
                                Ocupado por {reserva.usuario?.nombre} - Estado: {reserva.estado}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Selecciona un área y fecha para ver disponibilidad
                  </p>
                )}
              </div>
            )}
          </div>

          {/* LADO DERECHO: Mis Reservas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Mis Reservas</h2>
              <button
                onClick={cargarMisReservas}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Actualizar
              </button>
            </div>

            {misReservas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No tienes reservas registradas
              </p>
            ) : (
              <div className="space-y-4">
                {misReservas
                  .sort((a, b) => new Date(b.fecha || '').getTime() - new Date(a.fecha || '').getTime())
                  .map((reserva) => (
                    <div
                      key={reserva.id}
                      className={`p-4 border rounded-lg ${
                        reserva.estado === 'confirmada' ? 'border-green-200 bg-green-50' :
                        reserva.estado === 'cancelada' ? 'border-red-200 bg-red-50' :
                        'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{reserva.area?.descripcion}</h3>
                          <p className="text-sm text-gray-600">
                            Fecha: {reserva.fecha}
                          </p>
                          <p className="text-sm text-gray-600">
                            Reserva #{reserva.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            reserva.estado === 'confirmada' ? 'bg-green-100 text-green-800' :
                            reserva.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {reserva.estado || 'pendiente'}
                          </span>
                          {reserva.estado === 'confirmada' && (
                            <button
                              onClick={() => cancelarReserva(reserva)}
                              className="block mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
