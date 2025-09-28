// src/services/roles.ts
import { http, API_PREFIX } from "./api";

export type Rol = {
  id: number;
  descripcion: string;
  tipo: string;
  estado: any;
};

export async function listRoles(token: string): Promise<Rol[]> {
  const data = await http<any>(`${API_PREFIX}/roles/`, { token });
  return Array.isArray(data) ? data : data.results || [];
}

export function getRol({ token, id }: { token: string; id: number }) {
  return http<Rol>(`${API_PREFIX}/roles/${id}/`, { token });
}

export function createRol({ token, payload }: { token: string; payload: Omit<Rol, 'id'> }) {
  return http<Rol>(`${API_PREFIX}/roles/`, { method: "POST", token, body: JSON.stringify(payload) });
}

export function patchRol({ token, id, payload }: { token: string; id: number; payload: Partial<Rol> }) {
  return http<Rol>(`${API_PREFIX}/roles/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
}

export function deleteRol({ token, id }: { token: string; id: number }) {
  return http<void>(`${API_PREFIX}/roles/${id}/`, { method: "DELETE", token });
}
