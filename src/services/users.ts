import { http, API_PREFIX } from "./api";

export type Usuario = {
  codigo: number;
  nombre?: string | null;
  apellido?: string | null;
  correo?: string | null;
  contrasena?: string | null;
  sexo?: string | null;
  telefono?: number | null;
  estado?: string | null;
  idrol?: number | null;
};

export type UsersListResult = {
  items: Usuario[];
  next: string | null;
  previous: string | null;
  count?: number;
};

function buildQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return q.toString();
}

export async function listUsers(opts: {
  token: string;
  search?: string;
  estado?: string;
  idrol?: string | number;
  ordering?: string;
  page?: number;
}): Promise<UsersListResult> {
  const { token, ...query } = opts;
  const qs = buildQuery(query);
  const url = `${API_PREFIX}/usuarios/${qs ? `?${qs}` : ""}`;
  const data = await http<any>(url, { token });
  if (Array.isArray(data)) return { items: data as Usuario[], next: null, previous: null, count: data.length };
  return { items: (data.results ?? []) as Usuario[], next: data.next ?? null, previous: data.previous ?? null, count: data.count };
}

export function getUser({ token, codigo }: { token: string; codigo: number }) {
  return http<Usuario>(`${API_PREFIX}/usuarios/${codigo}/`, { token });
}
export function patchUser({ token, codigo, payload }: { token: string; codigo: number; payload: Partial<Usuario> }) {
  return http<Usuario>(`${API_PREFIX}/usuarios/${codigo}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
}
export function putUser({ token, codigo, payload }: { token: string; codigo: number; payload: Usuario }) {
  return http<Usuario>(`${API_PREFIX}/usuarios/${codigo}/`, { method: "PUT", token, body: JSON.stringify(payload) });
}
export function createUser({ token, payload }: { token: string; payload: Partial<Usuario> }) {
  return http<Usuario>(`${API_PREFIX}/usuarios/`, { method: "POST", token, body: JSON.stringify(payload) });
}
export function deleteUser({ token, codigo }: { token: string; codigo: number }) {
  return http<void>(`${API_PREFIX}/usuarios/${codigo}/`, { method: "DELETE", token });
}
