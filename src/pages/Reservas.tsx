// src/pages/Reservas.tsx
import { useEffect, useMemo, useState } from "react";
import {
  areasApi,
  reservasApi,
  AreaComunDTO,
  ReservaDTO,
} from "../services/api";

// Utilidad sencilla para leer el token
function useToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);
  return token;
}

export default function ReservasPage() {
  const token = useToken();

  // Estados
  const [areas, setAreas] = useState<AreaComunDTO[]>([]);
  const [reservas, setReservas] = useState<ReservaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Cargar áreas al montar
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await areasApi.list(token);
        setAreas(res);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [token]);

  // Cargar reservas
  const cargarReservas = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await reservasApi.list(token);
      setReservas(res);
    } catch (e) {
      setError("Error cargando reservas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, [token]);

  // Filtrado
  const reservasFiltradas = useMemo(() => {
    return reservas
      .filter((r: ReservaDTO) => !search ||
        r.usuario?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        r.area?.descripcion?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a: ReservaDTO, b: ReservaDTO) => {
        const fechaA = new Date(a.fecha || "").getTime();
        const fechaB = new Date(b.fecha || "").getTime();
        return fechaB - fechaA; // más reciente primero
      });
  }, [reservas, search]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">Reservas</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por usuario o área..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando reservas...</div>
      ) : (
        <div className="grid gap-4">
          {reservasFiltradas.map((reserva: ReservaDTO) => (
            <div key={reserva.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {reserva.area?.descripcion || 'Área no especificada'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Usuario: {reserva.usuario?.nombre || 'No especificado'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Fecha: {reserva.fecha}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    reserva.estado === 'activa' ? 'bg-green-100 text-green-800' :
                    reserva.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {reserva.estado || 'pendiente'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {reservasFiltradas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron reservas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
