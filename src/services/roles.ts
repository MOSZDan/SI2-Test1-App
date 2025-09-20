// src/services/roles.ts
import { http, API_PREFIX } from "./api";

export type Rol = {
  id: number;
  descripcion: string | null;
  tipo: string | null;
  estado: string | null;
};

type Paginated<T> = { results: T[]; next?: string | null; previous?: string | null; count?: number };

export async function listRoles(token: string): Promise<Rol[]> {
  const data = await http<Rol[] | Paginated<Rol>>(`${API_PREFIX}/roles/`, { token });
  // Soporta ambos formatos (array plano o paginado DRF)
  return Array.isArray(data) ? data : (data.results ?? []);
}
