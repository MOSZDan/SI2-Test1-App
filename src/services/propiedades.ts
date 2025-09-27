// services/propiedades.ts
import { http, API_PREFIX } from "./api";

export type Propiedad = {
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

function buildQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return q.toString();
}

export async function listPropiedades(opts: {
  token: string;
  include_residents?: boolean;
  search?: string;
  piso?: number;
  page?: number;
}): Promise<Propiedad[]> {
  const { token, ...query } = opts;
  const qs = buildQuery(query);
  const url = `${API_PREFIX}/propiedades/${qs ? `?${qs}` : ""}`;
  const data = await http<any>(url, { token });
  return Array.isArray(data) ? data : data.results || [];
}

export function getPropiedad({ token, codigo }: { token: string; codigo: number }) {
  return http<Propiedad>(`${API_PREFIX}/propiedades/${codigo}/`, { token });
}

export function createPropiedad({ token, payload }: {
  token: string;
  payload: { nro_casa: number; piso: number; tamano_m2: number; descripcion: string }
}) {
  return http<Propiedad>(`${API_PREFIX}/propiedades/`, { method: "POST", token, body: JSON.stringify(payload) });
}

export function patchPropiedad({ token, codigo, payload }: {
  token: string;
  codigo: number;
  payload: Partial<{ nro_casa: number; piso: number; tamano_m2: number; descripcion: string }>
}) {
  return http<Propiedad>(`${API_PREFIX}/propiedades/${codigo}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
}

export function deletePropiedad({ token, codigo }: { token: string; codigo: number }) {
  return http<void>(`${API_PREFIX}/propiedades/${codigo}/`, { method: "DELETE", token });
}

export function vincularResidente({ token, payload }: {
  token: string;
  payload: {
    codigo_usuario: number;
    codigo_propiedad: number;
    fecha_ini: string;
    fecha_fin?: string | null;
  }
}) {
  return http<any>(`${API_PREFIX}/pertenece/`, { method: "POST", token, body: JSON.stringify(payload) });
}
