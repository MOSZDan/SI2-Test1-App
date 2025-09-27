// src/services/api.ts
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
export const API_BASE = RAW_BASE.replace(/\/+$/, "");
export const API_PREFIX = `${API_BASE}/api`;

const AUTH_SCHEME = "Token"; // DRF TokenAuthentication
type HttpOpts = RequestInit & { token?: string };

export async function http<T>(url: string, opts: HttpOpts = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (opts.token) headers.Authorization = `${AUTH_SCHEME} ${opts.token}`;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { ...opts, headers });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.detail ||
          (data && typeof data === "object" ? JSON.stringify(data) : "Error");
    throw new Error(msg);
  }
  return data as T;
}

/* ========= Tipos comunes ========= */
export type UserDTO = {
  codigo: number;
  nombre: string;
  apellido: string;
  correo: string;
  sexo: string | null;
  telefono: string | null;
  estado: any;
  idrol: number | null;
  rol?: { id: number; descripcion: string; tipo?: string; estado?: any } | null;
};

export type Paged<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/* ========= Auth ========= */
export type LoginResponse = { token: string; user: UserDTO };
export type RegisterPayload = {
  nombre: string; apellido: string; correo: string; contrasena: string; sexo: "M" | "F"; telefono?: string;
};
export type RegisterResponse =
  | { ok: true; user?: UserDTO; id?: number; detail?: string }
  | { ok: false; detail?: string; fields?: Record<string, string | string[]> };

/* ========= Comunicados ========= */
export type Prioridad = "normal" | "importante" | "urgente";
export type Destinatarios = "todos" | "copropietarios" | "inquilinos" | "personal" | "usuarios";

export type ComunicadoDTO = {
  id: number;
  tipo: Prioridad;           // en BD usas 'tipo' como prioridad
  fecha: string | null;      // YYYY-MM-DD
  hora: string | null;       // HH:MM:SS
  titulo: string;
  contenido: string;
  url: string | null;
  estado: string;            // 'publicado' | 'borrador' | etc.
  codigo_usuario: number | null; // autor
};

export type ComunicadoPayload = {
  titulo: string;
  contenido: string;
  prioridad: Prioridad;
  destinatarios: Destinatarios;
  usuario_ids?: number[];
  fecha_publicacion?: string; // YYYY-MM-DD (opcional)
  hora_publicacion?: string;  // HH:MM:SS (opcional)
};

export type ComunicadoPublishResponse = {
  comunicado: ComunicadoDTO;
  envio: { total: number; enviados: number; errores: number };
  mensaje: string;
};

/* ========= Áreas comunes / Horarios ========= */
export type AreaComunDTO = {
  id: number;
  descripcion: string;
  costo: number;           // decimal
  capacidad_max: number;   // smallint
  estado: string;          // 'activo' | 'inactivo' | 'mantenimiento' (texto)
};

export type AreaComunCreate = {
  descripcion: string;
  costo: number;
  capacidad_max: number;
  estado: "activo" | "inactivo" | "mantenimiento";
};
export type AreaComunUpdate = Partial<AreaComunCreate>;

export type HorarioDTO = {
  id: number;
  hora_ini: string;  // "HH:MM:SS"
  hora_fin: string;  // "HH:MM:SS"
  id_area_c: number; // FK
};
export type HorarioCreate = { id_area_c: number; hora_ini: string; hora_fin: string };
export type HorarioUpdate = Partial<HorarioCreate>;

/* ========= Helpers ========= */
function buildQuery(params?: Record<string, any>) {
  const q = new URLSearchParams();
  if (!params) return "";
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* ========= API ========= */
export const api = {
  // --- Auth ---
  login(email: string, password: string) {
    return http<LoginResponse>(`${API_PREFIX}/auth/login/`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register(payload: RegisterPayload) {
    return http<RegisterResponse>(`${API_PREFIX}/auth/register/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logout(token: string) {
    return http<{ detail?: string }>(`${API_PREFIX}/auth/logout/`, {
      method: "POST",
      token,
    });
  },

  // --- Usuarios (listado general; resp paginado de DRF) ---
  usuarios(
    token: string,
    params?: { search?: string; page?: number; page_size?: number; estado?: string; idrol?: number }
  ) {
    const q = buildQuery(params);
    const url = `${API_PREFIX}/usuarios/${q}`;
    return http<Paged<UserDTO> | UserDTO[]>(url, { token });
  },

  // --- Usuarios activos (atajo) ---
  usuariosActivos(token: string, params?: { search?: string; page?: number; page_size?: number; idrol?: number }) {
    const q = buildQuery({ estado: "activo", ...(params || {}) });
    return http<Paged<UserDTO>>(`${API_PREFIX}/usuarios/${q}`, { token });
  },

  // --- Roles activos (para selects de rol/tipo) ---
  listRolesActivos(token: string) {
    const q = buildQuery({ estado: "activo", ordering: "id" });
    return http<Paged<{ id: number; descripcion: string; tipo?: string; estado?: string }>>(
      `${API_PREFIX}/roles/${q}`,
      { token }
    );
  },

  // --- Usuarios por un rol específico ---
  usuariosPorRol(token: string, idrol: number, page_size = 300) {
    const q = buildQuery({ estado: "activo", idrol, page_size });
    return http<Paged<UserDTO>>(`${API_PREFIX}/usuarios/${q}`, { token });
  },

  // --- Usuarios por varios roles (combina en cliente) ---
  async usuariosPorRoles(token: string, idroles: number[], page_size = 300) {
    const chunks = await Promise.all(
      idroles.map((id) => this.usuariosPorRol(token, id, page_size))
    );
    const map = new Map<number, UserDTO>();
    chunks.forEach((res) => (res.results || []).forEach((u) => map.set(u.codigo, u)));
    return Array.from(map.values());
  },

  // --- Comunicados: publicar ---
  publicarComunicado(token: string, payload: ComunicadoPayload) {
    return http<ComunicadoPublishResponse>(`${API_PREFIX}/comunicados/publicar/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },

  // --- Comunicados: listar (paginado DRF) ---
  comunicados(
    token: string,
    params?: { estado?: string; ordering?: string; page?: number; page_size?: number; search?: string }
  ) {
    const q = buildQuery(params);
    return http<Paged<ComunicadoDTO>>(`${API_PREFIX}/comunicados/${q}`, { token });
  },

  // --- Áreas comunes ---
  areasList(
    token: string,
    params?: { search?: string; page?: number; page_size?: number; estado?: string; ordering?: string }
  ) {
    const q = buildQuery(params);
    return http<Paged<AreaComunDTO>>(`${API_PREFIX}/areas-comunes/${q}`, { token });
  },
  areaCreate(token: string, payload: AreaComunCreate) {
    return http<AreaComunDTO>(`${API_PREFIX}/areas-comunes/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  areaUpdate(token: string, id: number, payload: AreaComunUpdate) {
    return http<AreaComunDTO>(`${API_PREFIX}/areas-comunes/${id}/`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    });
  },
  areaDelete(token: string, id: number) {
    return http<void>(`${API_PREFIX}/areas-comunes/${id}/`, {
      method: "DELETE",
      token,
    });
  },

  // --- Horarios ---
  horariosList(token: string, idAreaC?: number, params?: { page?: number; page_size?: number; ordering?: string }) {
    const q = buildQuery({ ...(params || {}), ...(idAreaC ? { id_area_c: idAreaC } : {}) });
    return http<Paged<HorarioDTO>>(`${API_PREFIX}/horarios/${q}`, { token });
  },
  horarioCreate(token: string, payload: HorarioCreate) {
    return http<HorarioDTO>(`${API_PREFIX}/horarios/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },
  horarioUpdate(token: string, id: number, payload: HorarioUpdate) {
    return http<HorarioDTO>(`${API_PREFIX}/horarios/${id}/`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    });
  },
  horarioDelete(token: string, id: number) {
    return http<void>(`${API_PREFIX}/horarios/${id}/`, {
      method: "DELETE",
      token,
    });
  },
};

/* ========= Facade para páginas de Áreas (con namespace horarios) ========= */
export const areasApi = {
  list: (token: string, params?: { search?: string; page?: number; page_size?: number; estado?: string; ordering?: string }) =>
    api.areasList(token, params),
  create: (token: string, payload: AreaComunCreate) =>
    api.areaCreate(token, payload),
  update: (token: string, id: number, payload: AreaComunUpdate) =>
    api.areaUpdate(token, id, payload),
  remove: (token: string, id: number) =>
    api.areaDelete(token, id),

  horarios: {
    list: (token: string, idAreaC?: number, params?: { page?: number; page_size?: number; ordering?: string }) =>
      api.horariosList(token, idAreaC, params),
    create: (token: string, payload: HorarioCreate) =>
      api.horarioCreate(token, payload),
    update: (token: string, id: number, payload: HorarioUpdate) =>
      api.horarioUpdate(token, id, payload),
    remove: (token: string, id: number) =>
      api.horarioDelete(token, id),
  },
};
