// Configuración central de la API
export const API_BASE = import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD
    ? "https://si2-test1-appbackend.onrender.com"
    : "http://127.0.0.1:8000");
export const API_PREFIX = `${API_BASE}/api`;

// Configuración del microservicio de IA
export const AI_SERVICE_BASE = import.meta.env.VITE_AI_SERVICE_BASE || "http://0.0.0.0:8001";
export const AI_API_PREFIX = `${AI_SERVICE_BASE}/api`;

// Tipos para las respuestas de la API
export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// Función HTTP central con mejor manejo de errores y reconexión
export async function http<T>(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: string;
    headers?: Record<string, string>;
    retries?: number;
  } = {}
): Promise<T> {
  const { method = "GET", token, body, headers = {}, retries = 2 } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    // Configuración específica para Transaction Pooler
    keepalive: false, // No mantener conexiones vivas
  };

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Token ${token}`,
    };
  }

  if (body && method !== "GET") {
    config.body = body;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config);

      // Manejar errores de autenticación
      if (response.status === 401 || response.status === 403) {
        // Token inválido o expirado - limpiar localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Recargar la página para forzar re-autenticación
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.errors) {
            const firstError = Object.values(errorData.errors)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = firstError[0];
            }
          }
        } catch {
          // Si no se puede parsear el JSON de error, usar el mensaje por defecto
        }

        // Para errores 500, intentar reintento si no es el último intento
        if (response.status >= 500 && attempt < retries) {
          console.warn(`Error 500 en intento ${attempt + 1}, reintentando...`);
          // Esperar un poco antes del reintento (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        throw new Error(errorMessage);
      }

      // Manejar respuestas vacías (204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      // Si es el último intento o un error que no es de red, lanzar el error
      if (attempt === retries || (error instanceof Error && error.message.includes("Sesión expirada"))) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Error de conexión con el servidor");
      }

      // Para otros errores de red, intentar reintento
      console.warn(`Error de conexión en intento ${attempt + 1}, reintentando...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw new Error("Error de conexión con el servidor después de varios intentos");
}

// ========= TIPOS PRINCIPALES =========

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
  rol?: {
    descripcion: string;
    tipo: string;
  };
};

export type UsersListResult = {
  items: Usuario[];
  next: string | null;
  previous: string | null;
  count?: number;
};

export type Rol = {
  id: number;
  descripcion: string;
  tipo: string;
  estado: any;
};

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

export type Pago = {
  id: number;
  tipo: string;
  descripcion: string;
  monto: number;
  estado?: string;
};

export type PagoForm = {
  tipo: string;
  descripcion: string;
  monto: number;
  estado?: string;
};

export type Multa = {
  id: number;
  descripcion: string;
  monto: number;
  estado?: string;
};

export type MultaForm = {
  descripcion: string;
  monto: number;
  estado?: string;
};

// ========= TIPOS DE ÁREAS COMUNES =========

export type AreaComunDTO = {
  id: number;
  descripcion: string;
  costo: number;
  capacidad_max: number;
  estado: "activo" | "inactivo" | "mantenimiento";
  fecha_creacion?: string;
  fecha_modificacion?: string;
};

export type AreaComunForm = {
  descripcion: string;
  costo: number;
  capacidad_max: number;
  estado: "activo" | "inactivo" | "mantenimiento";
};

// ========= TIPOS DE HORARIOS =========

export type HorarioDTO = {
  id: number;
  hora_ini: string;
  hora_fin: string;
  id_area_c: number;
};

export type HorarioForm = {
  id_area_c: number;
  hora_ini: string;
  hora_fin: string;
};

// ========= TIPOS DE COMUNICADOS =========

export type ComunicadoDTO = {
  id: number;
  tipo: string;
  fecha: string;
  hora: string;
  titulo: string;
  contenido: string;
  url?: string;
  estado: string;
  codigo_usuario: number;
  usuario?: {
    codigo: number;
    nombre: string;
    apellido: string;
  };
};

export type ComunicadoPayload = {
  tipo: string;
  fecha: string;
  hora: string;
  titulo: string;
  contenido: string;
  url?: string;
  destinatarios: Destinatarios;
  prioridad: Prioridad;
  usuario_ids?: number[];
  fecha_publicacion?: string;
  hora_publicacion?: string;
};

export type Destinatarios = "todos" | "copropietarios" | "inquilinos" | "administradores" | "usuarios" | number[];

export type Prioridad = "baja" | "media" | "alta" | "urgente" | "normal" | "importante";

export type Paged<T> = {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

// ========= TIPOS DE RESERVAS - ACTUALIZADOS SEGÚN CASO DE USO =========

export type ReservaDTO = {
  id: number;
  codigo_usuario: number | null;
  id_area_c: number | null;
  fecha: string | null;
  estado: "confirmada" | "cancelada" | "finalizada" | null;
  usuario?: {
    codigo: number;
    nombre: string;
    apellido: string;
  };
  area?: {
    id: number;
    descripcion: string;
  };
};

export type DisponibilidadDTO = {
  fecha: string;
  area_id: number;
  area_descripcion: string;
  horarios_disponibles: {
    hora_ini: string;
    hora_fin: string;
    disponible: boolean;
  }[];
  reservas_existentes: ReservaDTO[];
};

export type ReservaForm = {
  codigo_usuario: number;
  id_area_c: number;
  fecha: string;
  hora_ini?: string;
  hora_fin?: string;
};

// ========= FUNCIONES DE UTILIDAD =========

function buildQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return q.toString();
}

// ========= API DE AUTENTICACIÓN =========

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await http<{ token: string; user: any }>(`${API_PREFIX}/auth/login/`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return response;
  },

  async register(userData: {
    nombre: string;
    apellido: string;
    correo: string;
    contrasena: string;
    sexo: "M" | "F";
    telefono?: string;
  }): Promise<{ message: string }> {
    const response = await http<{ message: string }>(`${API_PREFIX}/auth/register/`, {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return response;
  },

  async getCurrentUser(token: string): Promise<UserDTO> {
    return http<UserDTO>(`${API_PREFIX}/auth/user/`, { token });
  },

  async getProfile(token: string): Promise<any> {
    return http<any>(`${API_PREFIX}/auth/user/`, { token });
  },

  async logout(token: string): Promise<void> {
    return http<void>(`${API_PREFIX}/auth/logout/`, {
      method: "POST",
      token
    });
  },

  // ========= FUNCIONES PARA COMUNICADOS =========
  async listRolesActivos(token: string): Promise<Rol[]> {
    const data = await http<any>(`${API_PREFIX}/roles/?estado=activo`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async usuariosActivos(token: string): Promise<Usuario[]> {
    const data = await http<any>(`${API_PREFIX}/usuarios/?estado=activo`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async usuariosPorRol(token: string, rolId: number): Promise<Usuario[]> {
    const data = await http<any>(`${API_PREFIX}/usuarios/?idrol=${rolId}&estado=activo`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async usuariosPorRoles(token: string, roleIds: number[]): Promise<Usuario[]> {
    const roleQuery = roleIds.map(id => `idrol=${id}`).join('&');
    const data = await http<any>(`${API_PREFIX}/usuarios/?${roleQuery}&estado=activo`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async publicarComunicado(token: string, payload: ComunicadoPayload): Promise<any> {
    return http<any>(`${API_PREFIX}/comunicados/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },

  // API de comunicados completa
  comunicados: {
    async list(token: string): Promise<ComunicadoDTO[]> {
      const data = await http<any>(`${API_PREFIX}/comunicados/`, { token });
      return Array.isArray(data) ? data : data.results || [];
    },

    async get(token: string, id: number): Promise<ComunicadoDTO> {
      return http<ComunicadoDTO>(`${API_PREFIX}/comunicados/${id}/`, { token });
    },

    async create(token: string, payload: ComunicadoPayload): Promise<ComunicadoDTO> {
      return http<ComunicadoDTO>(`${API_PREFIX}/comunicados/`, {
        method: "POST",
        token,
        body: JSON.stringify(payload)
      });
    },

    async update(token: string, id: number, payload: Partial<ComunicadoPayload>): Promise<ComunicadoDTO> {
      return http<ComunicadoDTO>(`${API_PREFIX}/comunicados/${id}/`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload)
      });
    },

    async delete(token: string, id: number): Promise<void> {
      return http<void>(`${API_PREFIX}/comunicados/${id}/`, { method: "DELETE", token });
    }
  }
};

// ========= API DE USUARIOS =========

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

export function createUser({ token, payload }: { token: string; payload: Omit<Usuario, 'codigo'> }) {
  return http<Usuario>(`${API_PREFIX}/usuarios/`, { method: "POST", token, body: JSON.stringify(payload) });
}

export function deleteUser({ token, codigo }: { token: string; codigo: number }) {
  return http<void>(`${API_PREFIX}/usuarios/${codigo}/`, { method: "DELETE", token });
}

// ========= API DE ROLES =========

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

// ========= API DE PROPIEDADES =========

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

// ========= API DE PAGOS =========

export const pagosAPI = {
  async list(token: string): Promise<Pago[]> {
    const data = await http<any>(`${API_PREFIX}/pagos/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number): Promise<Pago> {
    return http<Pago>(`${API_PREFIX}/pagos/${id}/`, { token });
  },

  async create(token: string, payload: PagoForm): Promise<Pago> {
    return http<Pago>(`${API_PREFIX}/pagos/`, { method: "POST", token, body: JSON.stringify(payload) });
  },

  async update(token: string, id: number, payload: Partial<PagoForm>): Promise<Pago> {
    return http<Pago>(`${API_PREFIX}/pagos/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/pagos/${id}/`, { method: "DELETE", token });
  }
};

// ========= API DE MULTAS =========

export const multasAPI = {
  async list(token: string): Promise<Multa[]> {
    const data = await http<any>(`${API_PREFIX}/multas/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number): Promise<Multa> {
    return http<Multa>(`${API_PREFIX}/multas/${id}/`, { token });
  },

  async create(token: string, payload: MultaForm): Promise<Multa> {
    return http<Multa>(`${API_PREFIX}/multas/`, { method: "POST", token, body: JSON.stringify(payload) });
  },

  async update(token: string, id: number, payload: Partial<MultaForm>): Promise<Multa> {
    return http<Multa>(`${API_PREFIX}/multas/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/multas/${id}/`, { method: "DELETE", token });
  }
};

// ========= API DE ÁREAS COMUNES =========

export const areasApi = {
  async list(token: string): Promise<AreaComunDTO[]> {
    const data = await http<any>(`${API_PREFIX}/areascomunes/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number): Promise<AreaComunDTO> {
    return http<AreaComunDTO>(`${API_PREFIX}/areascomunes/${id}/`, { token });
  },

  async create(token: string, payload: AreaComunForm): Promise<AreaComunDTO> {
    return http<AreaComunDTO>(`${API_PREFIX}/areascomunes/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },

  async update(token: string, id: number, payload: Partial<AreaComunForm>): Promise<AreaComunDTO> {
    return http<AreaComunDTO>(`${API_PREFIX}/areascomunes/${id}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload)
    });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/areascomunes/${id}/`, { method: "DELETE", token });
  },

  async remove(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/areascomunes/${id}/`, { method: "DELETE", token });
  },

  // ========= SUB-API DE HORARIOS =========
  horarios: {
    async list(token: string, areaId: number): Promise<{ results: HorarioDTO[] }> {
      const data = await http<any>(`${API_PREFIX}/horarios/?id_area_c=${areaId}`, { token });
      return Array.isArray(data) ? { results: data } : { results: data.results || [] };
    },

    async get(token: string, id: number): Promise<HorarioDTO> {
      return http<HorarioDTO>(`${API_PREFIX}/horarios/${id}/`, { token });
    },

    async create(token: string, payload: HorarioForm): Promise<HorarioDTO> {
      return http<HorarioDTO>(`${API_PREFIX}/horarios/`, {
        method: "POST",
        token,
        body: JSON.stringify(payload)
      });
    },

    async update(token: string, id: number, payload: Partial<HorarioForm>): Promise<HorarioDTO> {
      return http<HorarioDTO>(`${API_PREFIX}/horarios/${id}/`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload)
      });
    },

    async remove(token: string, id: number): Promise<void> {
      return http<void>(`${API_PREFIX}/horarios/${id}/`, { method: "DELETE", token });
    }
  }
};

// ========= API DE ESTADO DE CUENTA =========

export async function getEstadoCuenta(token: string, mes: string) {
  return http<any>(`${API_PREFIX}/estado-cuenta/?mes=${mes}`, { token });
}

export async function descargarComprobante(token: string, id: number) {
  const response = await fetch(`${API_PREFIX}/comprobante/${id}/`, {
    headers: { Authorization: `Token ${token}` },
  });

  if (!response.ok) {
    throw new Error("No se pudo descargar el comprobante");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante_${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========= API DE CASOS/INCIDENTES =========

export async function listCasos(token: string) {
  const data = await http<any>(`${API_PREFIX}/casos/`, { token });
  return Array.isArray(data) ? data : data.results || [];
}

export function createCaso({ token, payload }: {
  token: string;
  payload: { titulo: string; descripcion: string; tipo: string; prioridad?: string }
}) {
  return http<any>(`${API_PREFIX}/casos/`, { method: "POST", token, body: JSON.stringify(payload) });
}

export function updateCaso({ token, id, payload }: {
  token: string;
  id: number;
  payload: Partial<{ titulo: string; descripcion: string; tipo: string; prioridad: string; estado: string }>
}) {
  return http<any>(`${API_PREFIX}/casos/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
}

// ========= API DE DETECCIÓN AI - CORREGIDA PARA TU BACKEND =========

// API de Reconocimiento Facial
export const reconocimientoFacialAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/reconocimientofacial/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/reconocimientofacial/${id}/`, { token });
  },

  async create(token: string, file: File, ubicacion_camara = "Web App") {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ubicacion_camara', ubicacion_camara);

    const response = await fetch(`${API_PREFIX}/reconocimientofacial/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error en reconocimiento facial');
    }

    return response.json();
  }
};

// API de Perfil Facial
export const perfilFacialAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/perfilfacial/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/perfilfacial/${id}/`, { token });
  },

  async create(token: string, file: File, codigo_usuario: number) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('codigo_usuario', codigo_usuario.toString());

    const response = await fetch(`${API_PREFIX}/perfilfacial/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error registrando perfil facial');
    }

    return response.json();
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/perfilfacial/${id}/`, { method: "DELETE", token });
  }
};

// API de Detección de Placa
export const deteccionPlacaAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/deteccionplaca/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/deteccionplaca/${id}/`, { token });
  },

  async create(token: string, file: File, ubicacion_camara = "Web App") {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ubicacion_camara', ubicacion_camara);

    const response = await fetch(`${API_PREFIX}/deteccionplaca/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error en detección de placa');
    }

    return response.json();
  }
};

// API de Reportes de Seguridad
export const reporteSeguridadAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/reporteseguridad/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/reporteseguridad/${id}/`, { token });
  },

  async create(token: string, payload: any) {
    return http<any>(`${API_PREFIX}/reporteseguridad/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  }
};

// ========= API DE RESERVAS =========

export const reservasApi = {
  async list(token: string): Promise<ReservaDTO[]> {
    const data = await http<any>(`${API_PREFIX}/reserva/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number): Promise<ReservaDTO> {
    return http<ReservaDTO>(`${API_PREFIX}/reserva/${id}/`, { token });
  },

  async create(token: string, payload: ReservaForm): Promise<ReservaDTO> {
    return http<ReservaDTO>(`${API_PREFIX}/reserva/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  },

  async update(token: string, id: number, payload: Partial<ReservaForm>): Promise<ReservaDTO> {
    return http<ReservaDTO>(`${API_PREFIX}/reserva/${id}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload)
    });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/reserva/${id}/`, { method: "DELETE", token });
  },

  // Función para cancelar reserva (paso 11 del caso de uso)
  async cancelar(token: string, id: number): Promise<ReservaDTO> {
    return http<ReservaDTO>(`${API_PREFIX}/reserva/${id}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ estado: "cancelada" })
    });
  },

  // Función para obtener disponibilidad (paso 4 del caso de uso)
  async obtenerDisponibilidad(token: string, areaId: number, fecha: string): Promise<DisponibilidadDTO> {
    return http<DisponibilidadDTO>(`${API_PREFIX}/reserva/disponibilidad/?area_id=${areaId}&fecha=${fecha}`, { token });
  },

  // Función para validar disponibilidad en tiempo real (paso 7 del caso de uso)
  async validarDisponibilidad(token: string, payload: ReservaForm): Promise<{ disponible: boolean; mensaje?: string }> {
    return http<{ disponible: boolean; mensaje?: string }>(`${API_PREFIX}/reserva/validar-disponibilidad/`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    });
  }
};

// ========= APIS ADICIONALES COMPLETAS =========

// API de Vehículos
export const vehiculosAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/vehiculos/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/vehiculos/${id}/`, { token });
  },

  async create(token: string, payload: any) {
    return http<any>(`${API_PREFIX}/vehiculos/`, { method: "POST", token, body: JSON.stringify(payload) });
  },

  async update(token: string, id: number, payload: any) {
    return http<any>(`${API_PREFIX}/vehiculos/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/vehiculos/${id}/`, { method: "DELETE", token });
  }
};

// API de Notificaciones
export const notificacionesAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/notificaciones/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/notificaciones/${id}/`, { token });
  },

  async create(token: string, payload: any) {
    return http<any>(`${API_PREFIX}/notificaciones/`, { method: "POST", token, body: JSON.stringify(payload) });
  },

  async update(token: string, id: number, payload: any) {
    return http<any>(`${API_PREFIX}/notificaciones/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/notificaciones/${id}/`, { method: "DELETE", token });
  }
};

// API de Tareas
export const tareasAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/tareas/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/tareas/${id}/`, { token });
  },

  async create(token: string, payload: any) {
    return http<any>(`${API_PREFIX}/tareas/`, { method: "POST", token, body: JSON.stringify(payload) });
  },

  async update(token: string, id: number, payload: any) {
    return http<any>(`${API_PREFIX}/tareas/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/tareas/${id}/`, { method: "DELETE", token });
  }
};

// API de Bitácora
export const bitacoraAPI = {
  async list(token: string) {
    const data = await http<any>(`${API_PREFIX}/bitacora/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number) {
    return http<any>(`${API_PREFIX}/bitacora/${id}/`, { token });
  }
};

// ========= EXPORTACIONES ADICIONALES =========

export default api;

// Tipos legacy para compatibilidad
export type LoginResponse = { token: string; user: UserDTO };
export type RegisterPayload = {
  nombre: string; apellido: string; correo: string; contrasena: string; sexo: "M" | "F"; telefono?: string;
};
export type RegisterResponse =
  | { ok: true; user?: UserDTO; id?: number; detail?: string }
  | { ok: false; detail?: string; fields?: Record<string, string | string[]> };
